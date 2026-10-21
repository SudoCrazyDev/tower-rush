/**
 * v2 static VFX layer. The art (vfx/<key>.webp, loaded as `vfx:<key>`) arrives piece by piece,
 * so EVERY helper here checks the texture and quietly does nothing when it is missing: the
 * battle then looks exactly as it did before the art existed.
 *
 *  - fxSprite / fxBurst: one-shot sprites and particle bursts.
 *  - StatusFx: looping status overlays that follow a sprite while its status lasts.
 *  - fxEvent: the table that turns Sim events into VFX keys (see the comments on each case).
 *  - fxHit: impact on a `hit` event (returns true when it replaced the animated impact).
 *  - ShotView: a projectile, or a melee weapon thrown by a unit with `def.weapon`.
 */
import Phaser from "phaser";
import { ELEMENT_COLOR, UNIT_BY_ID, WEAPON_MOTION, rarityIndex, type Element, type UnitDef } from "../../../shared/units.ts";
import type { Sim, SimEvent, SimMonster } from "../../../shared/sim.ts";

type FxScene = Phaser.Scene & { sim: Sim };

export const fxKey = (key: string) => `vfx:${key}`;
/** Whether the art for a static VFX key has been built and loaded. */
export const hasFx = (scene: Phaser.Scene, key: string) => scene.textures.exists(fxKey(key));

/**
 * v2.8.1 VFX budget. Late waves with fast attackers (Headhunter at x3.2 speed, many Grunts) spawned
 * hundreds of short-lived sprites and tweens a second and heated phones. Every one-shot effect
 * counts itself here; past the cap, new hit effects, bursts and trails are skipped (the fight
 * itself is unchanged: this is the view only).
 */
let fxLive = 0;
const FX_CAP = 90;
/** Too many effects alive: skip optional ones. */
export const fxBusy = () => fxLive >= FX_CAP;
/** Count an effect object until it is destroyed. */
export function fxTrack<T extends Phaser.GameObjects.GameObject>(obj: T): T {
  fxLive++;
  obj.once(Phaser.GameObjects.Events.DESTROY, () => fxLive--);
  return obj;
}

export interface FxOpts {
  /** Displayed width in px (default 100). */
  size?: number;
  /** Milliseconds on screen (default 500). */
  life?: number;
  /** Fade out over the life (default true). */
  fade?: boolean;
  /** Radians turned over the life. */
  rotate?: number;
  tint?: number;
  /** Scale at the start, relative to the end (default 0.6 pops outward; 1 stays). */
  from?: number;
  /** Pixels it drifts up over the life. */
  rise?: number;
  /** Squash to a ground ellipse (3/4 view decals). */
  flat?: boolean;
  depth?: number;
  add?: boolean;
  alpha?: number;
  /** Glued to this object's position (plus the x, y offset) for the life. */
  follow?: { x: number; y: number };
}

/** A one-shot static VFX sprite. Returns null when the art is missing. */
export function fxSprite(scene: Phaser.Scene, key: string, x: number, y: number, o: FxOpts = {}) {
  if (!hasFx(scene, key)) return null;
  const img = fxTrack(scene.add.image(x, y, fxKey(key)).setDepth(o.depth ?? 2100));
  const end = (o.size ?? 100) / Math.max(1, img.width);
  const sy = o.flat ? 0.5 : 1;
  const from = o.from ?? 0.6;
  img.setScale(end * from, end * from * sy).setAlpha(o.alpha ?? 1);
  if (o.tint !== undefined) img.setTint(o.tint);
  if (o.add) img.setBlendMode(Phaser.BlendModes.ADD);
  const life = o.life ?? 500;
  const ox = o.follow ? x - o.follow.x : 0;
  const oy = o.follow ? y - o.follow.y : 0;
  const props: Record<string, number> = { scaleX: end, scaleY: end * sy };
  if (o.fade !== false) props.alpha = 0;
  if (o.rotate) props.rotation = o.rotate;
  if (o.rise && !o.follow) props.y = y - o.rise;
  const tw = scene.tweens.add({
    targets: img,
    ...props,
    duration: life,
    ease: "Cubic.Out",
    onUpdate: () => {
      if (o.follow) img.setPosition(o.follow.x + ox, o.follow.y + oy - (o.rise ?? 0) * tw.progress);
    },
    onComplete: () => img.destroy(),
  });
  return img;
}

export interface BurstOpts {
  n?: number;
  size?: number;
  spread?: number;
  life?: number;
  /** Pixels the pieces fall (positive) or float up (negative) while they fly. */
  gravity?: number;
  tint?: number;
  depth?: number;
}

/** A small burst of particle sprites (pt_*). False when the art is missing. */
export function fxBurst(scene: Phaser.Scene, key: string, x: number, y: number, o: BurstOpts = {}) {
  if (!hasFx(scene, key)) return false;
  // Over budget: report it handled, draw nothing.
  if (fxBusy()) return true;
  const n = o.n ?? 5;
  const spread = o.spread ?? 50;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = spread * (0.4 + Math.random() * 0.6);
    const img = fxTrack(scene.add.image(x, y, fxKey(key)).setDepth(o.depth ?? 2110));
    const s = ((o.size ?? 22) * (0.7 + Math.random() * 0.6)) / Math.max(1, img.width);
    img.setScale(s * 0.5).setRotation(Math.random() * 6);
    if (o.tint !== undefined) img.setTint(o.tint);
    scene.tweens.add({
      targets: img,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d * 0.7 + (o.gravity ?? 0),
      scale: s,
      alpha: 0,
      rotation: img.rotation + (Math.random() - 0.5) * 4,
      duration: (o.life ?? 600) * (0.8 + Math.random() * 0.4),
      ease: "Cubic.Out",
      onComplete: () => img.destroy(),
    });
  }
  return true;
}

// ------------------------------------------------------------------ status overlays

/** Where an overlay sits on its owner: "head" above, "body" centered, "foot" on the ground. */
interface Overlay {
  key: string;
  at: "head" | "body" | "foot";
  /** Width as a fraction of the owner's size. */
  size: number;
  add?: boolean;
}

const OVERLAYS: Record<string, Overlay> = {
  burn: { key: "status_burn", at: "body", size: 0.9 },
  poisoned: { key: "status_poisoned", at: "body", size: 0.9 },
  shocked: { key: "status_shocked", at: "body", size: 0.9 },
  slowed: { key: "status_slowed", at: "foot", size: 0.7 },
  frozen: { key: "status_frozen", at: "body", size: 1 },
  stunned: { key: "status_stunned", at: "head", size: 0.8 },
  rooted: { key: "status_rooted", at: "foot", size: 0.9 },
  shield: { key: "status_shield", at: "body", size: 1.15 },
  haste: { key: "status_haste", at: "body", size: 1 },
  rage: { key: "status_rage", at: "head", size: 0.6 },
  cursed: { key: "status_cursed", at: "head", size: 0.6 },
  weakened: { key: "status_weakened", at: "head", size: 0.5 },
  regen: { key: "status_regen", at: "body", size: 0.9 },
  invulnerable: { key: "status_invulnerable", at: "body", size: 1.2 },
  sleep: { key: "status_sleep", at: "head", size: 0.6 },
};

/** Status names currently on a monster, read from the SimMonster timers. */
export function monsterStatuses(m: SimMonster, now: number): string[] {
  const out: string[] = [];
  if (now < m.frozenUntil) out.push("frozen");
  if (now < m.stunUntil) out.push("stunned");
  if (now < m.rootedUntil) out.push("rooted");
  if (m.burn.until > now) out.push("burn");
  if (m.poison.length) out.push("poisoned");
  if (now < m.slowUntil && now >= m.frozenUntil) out.push("slowed");
  if (now < m.shieldUntil) out.push("shield");
  if (now < m.hasteUntil) out.push("haste");
  if (m.curse > 0) out.push("cursed");
  return out;
}

/** Looping overlays on one owner; `sync` adds and removes them to match the active statuses. */
export class StatusFx {
  private imgs = new Map<string, Phaser.GameObjects.Image>();
  constructor(private scene: Phaser.Scene) {}

  /** `foot` is the owner's feet, `size` its height in px. */
  sync(foot: { x: number; y: number }, size: number, depth: number, active: string[]) {
    for (const [name, img] of this.imgs) {
      if (active.includes(name)) continue;
      img.destroy();
      this.imgs.delete(name);
    }
    const t = this.scene.time.now;
    for (const name of active) {
      const o = OVERLAYS[name];
      if (!o || !hasFx(this.scene, o.key)) continue;
      let img = this.imgs.get(name);
      if (!img) {
        img = this.scene.add.image(foot.x, foot.y, fxKey(o.key));
        if (o.add) img.setBlendMode(Phaser.BlendModes.ADD);
        this.imgs.set(name, img);
      }
      const w = (size * o.size) / Math.max(1, img.width);
      const pulse = 1 + Math.sin(t / 220 + name.length) * 0.05;
      const dy = o.at === "head" ? -size * 0.95 : o.at === "body" ? -size * 0.4 : 0;
      img.setScale(w * pulse, w * pulse * (o.at === "foot" ? 0.6 : 1));
      img.setPosition(foot.x, foot.y + dy + (o.at === "head" ? Math.sin(t / 300) * 3 : 0));
      img.setDepth(depth + (o.at === "foot" ? -1 : 1));
      img.setAlpha(0.9);
    }
  }

  destroy() {
    for (const img of this.imgs.values()) img.destroy();
    this.imgs.clear();
  }
}

// ------------------------------------------------------------------ element tables

/** Impact sprite per element; holy and shadow projectiles use their own. */
const IMPACT: Record<Element, string> = {
  fire: "impact_fire",
  ice: "impact_ice",
  lightning: "impact_lightning",
  nature: "impact_nature",
  poison: "impact_poison",
  arcane: "impact_arcane",
  normal: "impact_physical",
};
const PROJ_IMPACT: Record<string, string> = {
  holy: "impact_holy",
  shadow: "impact_shadow",
  // v2.8 Mythic projectiles (each falls back to the element's impact until its art is built).
  void_rift: "impact_void_rift",
  dragon_flame: "impact_dragon_flame",
  chrono_gear: "impact_chrono_gear",
  slash: "impact_slash",
  cero: "impact_lanza",
};
/** v2.8 projectiles whose art may not be built yet: drawn with an existing projectile until then. */
const PROJ_FALLBACK: Record<string, string> = { lantern: "arcane_orb", void_rift: "arcane_orb", dragon_flame: "fireball", chrono_gear: "arcane_orb", slash: "arcane_orb", cero: "arcane_orb" };
/** Projectiles drawn larger than the usual 56px (the slash wave is wide). */
const PROJ_SIZE: Record<string, number> = { slash: 96, cero: 60 };
/** Projectiles that turn in flight instead of pointing along it. */
const SPIN_PROJ = new Set(["chrono_gear"]);
/** v2.8: units with their own impact on top of the usual one (Monkey King's staff). */
const UNIT_IMPACT: Record<string, string> = { monkey_king: "monkey_impact" };
/** v2.8: units whose weapon leaves its own trail (Monkey King's golden cloud). */
const UNIT_TRAIL: Record<string, string> = { monkey_king: "monkey_cloud" };
/** Ground decal an element's hit leaves behind. */
const GROUND: Record<Element, string | null> = {
  fire: "ground_scorch",
  ice: "ground_frost",
  lightning: null,
  nature: null,
  poison: "ground_poison",
  arcane: null,
  normal: null,
};
/** Particle puffed by an element's hit (also the weapon trail). */
const PARTICLE: Record<Element, string> = {
  fire: "pt_ember",
  ice: "pt_snowflake",
  lightning: "pt_star",
  nature: "pt_leaf",
  poison: "pt_bubble",
  arcane: "pt_rune",
  normal: "pt_smoke",
};
/** Blades get a slash arc on top of the impact; claws their marks. */
const SLASH = new Set(["sword", "katana", "greatsword", "dagger", "twin_daggers", "sabre", "scimitar", "rapier", "cutlass", "cleaver", "sig_fox_samurai", "sig_rogue_knight", "sig_berserker_sellsword"]);

const lastDecal = { x: -999, y: -999, t: -9 };
/** A ground decal; skipped when another landed on the same spot a moment ago. */
function decal(scene: FxScene, key: string | null, x: number, y: number, size: number, life = 1400) {
  if (!key || !hasFx(scene, key)) return;
  const now = scene.sim.now;
  if (Math.hypot(lastDecal.x - x, lastDecal.y - y) < 50 && now - lastDecal.t < 1) return;
  lastDecal.x = x;
  lastDecal.y = y;
  lastDecal.t = now;
  fxSprite(scene, key, x, y, { size, life, flat: true, from: 0.7, alpha: 0.85, depth: 60, fade: true });
}

const defOf = (scene: FxScene, uid: number): UnitDef | undefined => scene.sim.units.find((u) => u?.uid === uid)?.def;

/**
 * Impact for a `hit` event. Returns true when static art replaced the animated impact
 * (so the caller skips it). Extras (slash, ground, particles) are drawn either way.
 */
export function fxHit(scene: FxScene, e: Extract<SimEvent, { type: "hit" }>): boolean {
  // Over budget: the hit is shown as handled with nothing drawn (the monster still flashes).
  if (fxBusy()) return true;
  const def = defOf(scene, e.uid);
  const size = Math.max(60, e.size);
  let replaced = false;
  if (e.kind === "main" || e.kind === "bane") {
    const proj = def && PROJ_IMPACT[def.proj];
    const key = e.kind === "bane" ? "impact_lightning" : def?.weapon && !proj ? "impact_physical" : proj ?? IMPACT[e.element];
    // A weapon hit reads as a physical blow tinted by the unit's element.
    const s =
      fxSprite(scene, key, e.x, e.y, { size: size * 1.2, life: 380, rotate: (Math.random() - 0.5) * 0.8, tint: def?.weapon && key === "impact_physical" ? ELEMENT_COLOR[e.element] : undefined }) ??
      // A v2.8 impact whose art isn't built yet: the element's own.
      (key !== IMPACT[e.element] ? fxSprite(scene, IMPACT[e.element], e.x, e.y, { size: size * 1.2, life: 380, rotate: (Math.random() - 0.5) * 0.8 }) : null);
    replaced = !!s;
    const own = def && UNIT_IMPACT[def.id];
    if (own) fxSprite(scene, own, e.x, e.y, { size: size * 1.3, life: 420, from: 0.5 });
    if (def?.weapon) {
      if (def.weapon === "claw_swipe") fxSprite(scene, "claw_marks", e.x, e.y, { size: size * 1.1, life: 400, from: 0.9 });
      else if (SLASH.has(def.weapon)) fxSprite(scene, "slash_arc", e.x, e.y, { size: size * 1.4, life: 300, from: 0.8, rotate: 0.5, tint: ELEMENT_COLOR[e.element] });
    }
    fxBurst(scene, PARTICLE[e.element], e.x, e.y, { n: 3, size: 18, spread: 36, life: 450 });
    if (def?.proj === "cannonball" || def?.proj === "rock" || def?.proj === "bomb") decal(scene, "ground_crater", e.x, e.y + e.size * 0.3, size * 1.1);
    else decal(scene, GROUND[e.element], e.x, e.y + e.size * 0.3, size * 1.1);
  } else if (e.kind === "pierce") replaced = !!fxSprite(scene, "impact_physical", e.x, e.y, { size, life: 320 });
  else if (e.kind === "chain") replaced = !!fxSprite(scene, "impact_lightning", e.x, e.y, { size, life: 320 });
  return replaced;
}

/**
 * Sim event -> static VFX. Everything is additive to the existing animated clips, except
 * `hit` which goes through fxHit. Keys used per event:
 *
 *  bighit            crit_burst, pt_star
 *  proc frozen       status_frozen pop, pt_snowflake
 *  proc stun         status_stunned pop
 *  proc execute      crit_burst, soul_wisp
 *  kill              death_puff, pt_smoke, pt_coin (mana); boss: explosion_big, star_burst, pt_gem
 *  leak              impact_physical at the gate
 *  afflict           status_shocked / status_rage / status_sleep pop on the unit
 *  wave (boss)       boss_warning ring at the gate side is not positioned, see portal
 *  portal            boss_warning ring, ground_shadow
 *  boss_stage        explosion_big (split/layers), ground_shadow (portal/teleport)
 *  boss_power        ground_shadow (charm, teleport), status_rage (roar, haste), status_shield, status_regen (heal)
 *  split             death_puff
 *  summon            rarity_glow_<rare|epic|legendary>, merge_flash for awakened
 *  merge             merge_flash, pt_star, rarity glow
 *  awaken            light_rays, star_burst, ground_holy
 *  powerup           level_up_arrow
 *  mana (hero)       star_burst, pt_coin
 *  mana (other)      pt_coin
 *  ultimate          explosion_big + ground decal of the unit's element (strike), pt_coin (mana)
 *  heal_pulse        ground_holy, pt_heart
 *  brew_collect      pt_coin
 *  hero              meteor: explosion_big + ground_scorch; freeze: ground_frost + impact_ice;
 *                    slow: status_slowed; haste: status_haste on units; rage: status_rage on units
 *  end (won)         pt_confetti, light_rays, chest_glow
 */
export function fxEvent(scene: FxScene, e: SimEvent) {
  const sim = scene.sim;
  switch (e.type) {
    case "bighit":
      fxSprite(scene, "crit_burst", e.x, e.y, { size: 130, life: 420, rotate: 0.3 });
      fxBurst(scene, "pt_star", e.x, e.y, { n: 4, size: 20, spread: 50 });
      break;
    case "proc":
      if (e.kind === "frozen") {
        fxSprite(scene, "status_frozen", e.x, e.y, { size: 90, life: 500, from: 0.8 });
        fxBurst(scene, "pt_snowflake", e.x, e.y, { n: 5, size: 20, spread: 45 });
      } else if (e.kind === "stun") fxSprite(scene, "status_stunned", e.x, e.y - 40, { size: 80, life: 500, from: 0.9, rotate: 1 });
      else if (e.kind === "root") {
        // v2.9.4 Windrunner: roots burst from the ground (rooted again and again, so only within budget).
        if (!fxBusy()) fxSprite(scene, "root_grasp", e.x, e.y + 10, { size: 90, life: 600, from: 0.6 });
      } else {
        fxSprite(scene, "crit_burst", e.x, e.y, { size: 150, life: 450 });
        fxSprite(scene, "soul_wisp", e.x, e.y - 20, { size: 60, life: 900, rise: 60, from: 1 });
      }
      break;
    case "kill":
      if (e.boss) {
        fxSprite(scene, "explosion_big", e.x, e.y, { size: 260, life: 600 });
        fxSprite(scene, "star_burst", e.x, e.y, { size: 240, life: 800 });
        fxBurst(scene, "pt_gem", e.x, e.y, { n: 6, size: 26, spread: 90, gravity: 40 });
      } else {
        fxSprite(scene, "death_puff", e.x, e.y, { size: 90, life: 450 });
        fxSprite(scene, "soul_wisp", e.x, e.y - 10, { size: 40, life: 900, rise: 55, from: 1, alpha: 0.9 });
      }
      fxBurst(scene, "pt_smoke", e.x, e.y, { n: 3, size: 26, spread: 30, gravity: -20 });
      if (e.mana > 0) fxBurst(scene, "pt_coin", e.x, e.y - 10, { n: Math.min(4, 1 + Math.ceil(e.mana / 15)), size: 20, spread: 40, gravity: 30 });
      break;
    case "leak":
      fxSprite(scene, "impact_physical", e.x, e.y, { size: 110, life: 350, tint: 0xff6060 });
      break;
    case "afflict": {
      const key = e.kind === "shellshock" ? "status_shocked" : e.kind === "irritation" ? "status_rage" : "status_sleep";
      fxSprite(scene, key, e.x, e.y - 40, { size: 80, life: 700, from: 0.9, rise: 12 });
      break;
    }
    case "portal":
      fxSprite(scene, "boss_warning", e.x, e.y + 20, { size: 220, life: Math.max(600, e.delay * 1000), flat: true, from: 1.2, depth: 60, alpha: 0.9 });
      fxSprite(scene, "ground_shadow", e.x, e.y + 20, { size: 190, life: Math.max(600, e.delay * 1000), flat: true, depth: 59 });
      break;
    case "boss_stage":
      if (e.power === "portal") fxSprite(scene, "ground_shadow", e.x, e.y + 30, { size: 240, life: 1200, flat: true, depth: 59 });
      else fxSprite(scene, "explosion_big", e.x, e.y, { size: 220, life: 550 });
      break;
    case "boss_power":
      switch (e.power) {
        case "charm":
        case "teleport":
          fxSprite(scene, "ground_shadow", e.x, e.y + 30, { size: 220, life: 1100, flat: true, depth: 59 });
          break;
        case "roar":
        case "haste":
          fxSprite(scene, "status_rage", e.x, e.y - 50, { size: 130, life: 800, from: 0.8 });
          break;
        case "shield":
        case "layers":
          fxSprite(scene, "status_shield", e.x, e.y, { size: 230, life: 800, from: 0.8 });
          break;
        case "heal":
          fxSprite(scene, "status_regen", e.x, e.y, { size: 200, life: 900, from: 0.8, rise: 25 });
          break;
      }
      break;
    case "split":
      fxSprite(scene, "death_puff", e.x, e.y, { size: e.kind === "boss" ? 200 : 100, life: 450 });
      break;
    case "summon":
    case "merge": {
      const def = UNIT_BY_ID[e.id];
      const r = def ? rarityIndex(def.rarity) : 0;
      const glow = r >= 4 ? "rarity_glow_legendary" : r === 3 ? "rarity_glow_legendary" : r === 2 ? "rarity_glow_epic" : r === 1 ? "rarity_glow_rare" : null;
      if (glow) fxSprite(scene, glow, e.x, e.y + 10, { size: e.type === "merge" ? 190 : 150, life: 700, from: 0.5 });
      if (e.type === "merge") {
        fxSprite(scene, "merge_flash", e.x, e.y - 10, { size: 160, life: 450, from: 0.4 });
        fxBurst(scene, "pt_star", e.x, e.y - 10, { n: 5, size: 20, spread: 60 });
      }
      break;
    }
    case "awaken":
      fxSprite(scene, "light_rays", e.x, e.y - 10, { size: 300, life: 1000, rotate: 0.8, from: 0.5, add: true });
      fxSprite(scene, "star_burst", e.x, e.y - 20, { size: 220, life: 800 });
      fxSprite(scene, "ground_holy", e.x, e.y + 30, { size: 170, life: 1400, flat: true, depth: 60 });
      break;
    case "powerup":
      for (const u of sim.units) if (u?.def.id === e.id) fxSprite(scene, "level_up_arrow", u.x, u.y - 50, { size: 70, life: 900, rise: 50, from: 0.8 });
      break;
    case "mana":
      if (e.x === null || e.y === null) break;
      if (e.source === "hero") {
        fxSprite(scene, "star_burst", e.x, e.y + 40, { size: 240, life: 700 });
        fxBurst(scene, "pt_coin", e.x, e.y + 40, { n: 8, size: 24, spread: 100, gravity: 40 });
      } else fxBurst(scene, "pt_coin", e.x, e.y, { n: 2, size: 18, spread: 26, gravity: -20 });
      break;
    case "brew_collect":
      fxBurst(scene, "pt_coin", e.x, e.y, { n: 3, size: 18, spread: 30, gravity: -20 });
      break;
    case "ultimate": {
      const u = sim.units.find((s) => s?.uid === e.uid);
      if (e.kind === "strike") {
        fxSprite(scene, "explosion_big", e.x, e.y, { size: e.radius * 1.5, life: 550 });
        if (u) decal(scene, GROUND[u.def.element] ?? "ground_crater", e.x, e.y + 20, e.radius * 1.7, 2000);
      }
      break;
    }
    case "heal_pulse":
      fxSprite(scene, "ground_holy", e.x, e.y + 20, { size: 150, life: 900, flat: true, depth: 60 });
      fxBurst(scene, "pt_heart", e.x, e.y - 20, { n: 3, size: 20, spread: 30, gravity: -40 });
      break;
    case "hero":
      heroFx(scene, e.power);
      break;
    // v2.8 Orcs.
    case "berserk": {
      // A red flash on the Grunt at every new multiplier, bigger with each step. Rare, so it ignores the budget.
      const big = 1 + Math.min(4, e.step ?? 1) * 0.18;
      if (!fxSprite(scene, "merge_flash", e.x, e.y - 20, { size: 200 * big, life: 550, from: 0.4, tint: 0xff3020 })) {
        const c = scene.add.circle(e.x, e.y - 20, 70 * big, 0xff3020, 0.55).setDepth(2100);
        scene.tweens.add({ targets: c, alpha: 0, scale: 1.6, duration: 450, onComplete: () => c.destroy() });
      }
      // A shock ring on the ground, and embers that rise.
      const ring = scene.add.ellipse(e.x, e.y + 20, 60, 24).setStrokeStyle(6, 0xff3a2a, 0.95).setDepth(90 + e.y);
      scene.tweens.add({ targets: ring, scaleX: 3 * big, scaleY: 3 * big, alpha: 0, duration: 600, ease: "Cubic.Out", onComplete: () => ring.destroy() });
      fxBurst(scene, "pt_ember", e.x, e.y - 20, { n: 6 + Math.min(6, e.step ?? 1), size: 24, spread: 70 * big, gravity: -40 });
      break;
    }
    case "pillage":
      if (fxBusy()) break;
      if (!fxSprite(scene, "pillage_coins", e.x, e.y, { size: 110, life: 700, rise: 40, from: 0.6 })) fxBurst(scene, "pt_coin", e.x, e.y, { n: 6, size: 22, spread: 50, gravity: 40 });
      break;
    case "spirit_push": {
      // v2.8.1: one wisp where the spirit struck (not one per pushed monster), and only within budget.
      if (fxBusy()) break;
      const key = hasFx(scene, "spirit_wisp") ? "spirit_wisp" : "soul_wisp";
      fxSprite(scene, key, e.x + 20, e.y, { size: 80, life: 600, from: 0.8, alpha: 0.9, tint: key === "soul_wisp" ? 0x9ff0d0 : undefined });
      break;
    }
    case "end":
      if (e.outcome === "won") {
        fxSprite(scene, "light_rays", 360, 640, { size: 900, life: 1800, rotate: 0.6, from: 0.5, add: true, alpha: 0.7 });
        fxBurst(scene, "pt_confetti", 360, 400, { n: 14, size: 40, spread: 300, gravity: 140, life: 1600 });
      }
      break;
  }
}

function heroFx(scene: FxScene, power: string) {
  const sim = scene.sim;
  const live = sim.monsters.filter((m) => !m.dead && !m.gone && m.intro <= 0);
  switch (power) {
    case "meteor":
      for (const m of live) {
        const p = m.pos;
        fxSprite(scene, "explosion_big", p.x, p.y, { size: 150, life: 500 });
        decal(scene, "ground_scorch", p.x, p.y + m.size * 0.3, 130);
      }
      break;
    case "freeze":
      for (const m of live) {
        const p = m.pos;
        fxSprite(scene, "impact_ice", p.x, p.y, { size: 130, life: 450 });
        decal(scene, "ground_frost", p.x, p.y + m.size * 0.3, 130);
      }
      break;
    case "slow":
      for (const m of live) fxSprite(scene, "status_slowed", m.pos.x, m.pos.y, { size: 100, life: 700 });
      break;
    case "haste":
    case "rage":
      for (const u of sim.units) if (u) fxSprite(scene, power === "haste" ? "status_haste" : "status_rage", u.x, u.y - 30, { size: 90, life: 800, from: 0.8 });
      break;
  }
}

// ------------------------------------------------------------------ projectiles and weapons

/**
 * A shot on screen: the unit's projectile sprite, or its melee weapon when `def.weapon` is set
 * and `weapon:<key>` is loaded. spin = turns in flight, straight = points along its flight,
 * strike = no flight, pops at the target on impact. Weapon art is element-neutral, so it gets
 * the element's glow and a short particle trail.
 */
/**
 * The weapon sprite a shot uses, or null for the projectile. A Grunt's axe follows its Berserker
 * tier (grunt_axe_<tier>, else the best lower tier built, else the generic axe).
 */
export function shotWeapon(scene: Phaser.Scene, def: UnitDef, tier = 0): string | null {
  const has = (k: string) => scene.textures.exists(`weapon:${k}`);
  if (def.id === "grunt") {
    for (let t = Math.max(0, Math.min(4, tier)); t >= 0; t--) if (has(`grunt_axe_${t}`)) return `grunt_axe_${t}`;
    return has("axe") ? "axe" : null;
  }
  return def.weapon && has(def.weapon) ? def.weapon : null;
}

export class ShotView {
  readonly img: Phaser.GameObjects.Image;
  private readonly motion: "spin" | "straight" | "strike" | null = null;
  private readonly color: number;
  private readonly element: Element;
  private readonly projSpin: boolean = false;
  private spin = Math.random() * 6;
  private trailAt = 0;

  /** `tier`: a Grunt's Berserker tier (0..4), which picks its axe. `focus`: a Headhunter focus shot (x5.2). */
  constructor(private scene: Phaser.Scene, readonly def: UnitDef, x: number, y: number, tier = 0, readonly focus = false) {
    this.element = def.element;
    this.color = ELEMENT_COLOR[def.element];
    const wk = shotWeapon(scene, def, tier);
    if (wk) {
      this.motion = WEAPON_MOTION[wk] ?? "spin";
      this.img = scene.add.image(x, y, `weapon:${wk}`).setDepth(2000);
      this.img.setScale((wk.startsWith("sig_") ? 76 : wk.startsWith("grunt_axe_") ? 60 + tier * 6 : 64) / Math.max(1, this.img.width));
      // v2.8.1: no per-shot glow shader (a preFX pass per flying weapon was the late-wave lag).
      // The top Grunt axes get a red tint instead.
      if (this.motion === "strike") this.img.setVisible(false);
      else if (tier >= 3) this.img.setTint(0xffb0a0);
      // Focus spear: blood red and bigger.
      if (focus) this.img.setTint(0xff5040).setScale(this.img.scaleX * 1.35);
    } else {
      const proj = !hasFx(scene, `proj_${def.proj}`) && PROJ_FALLBACK[def.proj] ? PROJ_FALLBACK[def.proj] : def.proj;
      const tex = proj === "spark" ? "vfx:hit_spark" : `vfx:proj_${proj}`;
      this.img = scene.add.image(x, y, tex).setDepth(2000);
      this.img.setScale((proj === "spark" ? 40 : (PROJ_SIZE[proj] ?? 56)) / Math.max(1, this.img.width));
      this.projSpin = SPIN_PROJ.has(def.proj);
    }
  }

  /** Where the shot is now and which way it is heading (radians). */
  move(x: number, y: number, angle: number) {
    this.img.setPosition(x, y);
    if (this.projSpin) {
      this.spin += 0.25;
      this.img.rotation = this.spin;
    } else if (this.motion === "spin") {
      this.spin += 0.35;
      this.img.rotation = this.spin;
    } else this.img.rotation = angle;
    if (this.motion && this.motion !== "strike") {
      const t = this.scene.time.now;
      // v2.8.1: a trail puff every 90 ms (was 45), none while the effect budget is spent.
      if (t - this.trailAt > 90 && !fxBusy()) {
        this.trailAt = t;
        this.trail(x, y);
      }
    }
  }

  private trail(x: number, y: number) {
    const own = UNIT_TRAIL[this.def.id];
    if (own && hasFx(this.scene, own)) {
      const puff = fxTrack(this.scene.add.image(x, y, fxKey(own)).setDepth(1990));
      puff.setScale(34 / Math.max(1, puff.width)).setRotation(Math.random() * 6);
      this.scene.tweens.add({ targets: puff, alpha: 0, scale: puff.scale * 1.6, duration: 380, onComplete: () => puff.destroy() });
      return;
    }
    const key = PARTICLE[this.element];
    const dot = hasFx(this.scene, key)
      ? this.scene.add.image(x, y, fxKey(key)).setScale(16 / Math.max(1, this.scene.textures.get(fxKey(key)).getSourceImage().width))
      : this.scene.add.circle(x, y, 5, this.color, 0.7);
    fxTrack(dot).setDepth(1990);
    this.scene.tweens.add({ targets: dot, alpha: 0, scale: 0.2, duration: 260, onComplete: () => dot.destroy() });
  }

  /** The shot arrived (or its target is gone): strike weapons pop where it lands. */
  destroy(at?: { x: number; y: number }) {
    // v2.8.2 Headhunter focus: a red reticle snaps shut on the target.
    if (this.focus && at && !fxBusy()) {
      const g = fxTrack(this.scene.add.graphics().setPosition(at.x, at.y - 20).setDepth(2105));
      g.lineStyle(4, 0xff3a2a, 1).strokeCircle(0, 0, 26);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.lineBetween(dx * 16, dy * 16, dx * 36, dy * 36);
      g.setScale(1.8).setAlpha(0.2);
      this.scene.tweens.add({ targets: g, scale: 0.9, alpha: 1, duration: 120, ease: "Cubic.Out", yoyo: true, hold: 120, onComplete: () => g.destroy() });
    }
    if (this.motion === "strike" && at) {
      const pop = fxTrack(this.scene.add.image(at.x, at.y, this.img.texture.key).setDepth(2000));
      const end = 96 / Math.max(1, pop.width);
      pop.setScale(end * 0.5).setRotation((Math.random() - 0.5) * 0.6);
      this.scene.tweens.add({ targets: pop, scale: end, alpha: 0, duration: 320, ease: "Back.Out", onComplete: () => pop.destroy() });
    }
    this.img.destroy();
  }
}
