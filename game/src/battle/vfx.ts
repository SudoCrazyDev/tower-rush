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
  const img = scene.add.image(x, y, fxKey(key)).setDepth(o.depth ?? 2100);
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
  const n = o.n ?? 5;
  const spread = o.spread ?? 50;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = spread * (0.4 + Math.random() * 0.6);
    const img = scene.add.image(x, y, fxKey(key)).setDepth(o.depth ?? 2110);
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
};
const PROJ_IMPACT: Record<string, string> = { holy: "impact_holy", shadow: "impact_shadow" };
/** Ground decal an element's hit leaves behind. */
const GROUND: Record<Element, string | null> = {
  fire: "ground_scorch",
  ice: "ground_frost",
  lightning: null,
  nature: null,
  poison: "ground_poison",
  arcane: null,
};
/** Particle puffed by an element's hit (also the weapon trail). */
const PARTICLE: Record<Element, string> = {
  fire: "pt_ember",
  ice: "pt_snowflake",
  lightning: "pt_star",
  nature: "pt_leaf",
  poison: "pt_bubble",
  arcane: "pt_rune",
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
  const def = defOf(scene, e.uid);
  const size = Math.max(60, e.size);
  let replaced = false;
  if (e.kind === "main" || e.kind === "bane") {
    const proj = def && PROJ_IMPACT[def.proj];
    const key = e.kind === "bane" ? "impact_lightning" : def?.weapon && !proj ? "impact_physical" : proj ?? IMPACT[e.element];
    // A weapon hit reads as a physical blow tinted by the unit's element.
    const s = fxSprite(scene, key, e.x, e.y, { size: size * 1.2, life: 380, rotate: (Math.random() - 0.5) * 0.8, tint: def?.weapon && key === "impact_physical" ? ELEMENT_COLOR[e.element] : undefined });
    replaced = !!s;
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
 *  encore            ground_holy ring, pt_star
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
      else {
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
    case "encore":
      fxSprite(scene, "ground_holy", e.x, e.y + 20, { size: e.radius * 2, life: 1200, flat: true, depth: 60 });
      fxBurst(scene, "pt_star", e.x, e.y, { n: 6, size: 20, spread: e.radius });
      break;
    case "heal_pulse":
      fxSprite(scene, "ground_holy", e.x, e.y + 20, { size: 150, life: 900, flat: true, depth: 60 });
      fxBurst(scene, "pt_heart", e.x, e.y - 20, { n: 3, size: 20, spread: 30, gravity: -40 });
      break;
    case "hero":
      heroFx(scene, e.power);
      break;
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
export class ShotView {
  readonly img: Phaser.GameObjects.Image;
  private readonly motion: "spin" | "straight" | "strike" | null = null;
  private readonly color: number;
  private readonly element: Element;
  private spin = Math.random() * 6;
  private trailAt = 0;

  constructor(private scene: Phaser.Scene, readonly def: UnitDef, x: number, y: number) {
    this.element = def.element;
    this.color = ELEMENT_COLOR[def.element];
    const wk = def.weapon && scene.textures.exists(`weapon:${def.weapon}`) ? def.weapon : null;
    if (wk) {
      this.motion = WEAPON_MOTION[wk] ?? "spin";
      this.img = scene.add.image(x, y, `weapon:${wk}`).setDepth(2000);
      this.img.setScale((wk.startsWith("sig_") ? 76 : 64) / Math.max(1, this.img.width));
      if (this.motion === "strike") this.img.setVisible(false);
      else this.img.preFX?.addGlow(this.color, 3, 0, false, 0.1, 8);
    } else {
      const tex = def.proj === "spark" ? "vfx:hit_spark" : `vfx:proj_${def.proj}`;
      this.img = scene.add.image(x, y, tex).setDepth(2000);
      this.img.setScale((def.proj === "spark" ? 40 : 56) / Math.max(1, this.img.width));
    }
  }

  /** Where the shot is now and which way it is heading (radians). */
  move(x: number, y: number, angle: number) {
    this.img.setPosition(x, y);
    if (this.motion === "spin") {
      this.spin += 0.35;
      this.img.rotation = this.spin;
    } else this.img.rotation = angle;
    if (this.motion && this.motion !== "strike") {
      const t = this.scene.time.now;
      if (t - this.trailAt > 45) {
        this.trailAt = t;
        this.trail(x, y);
      }
    }
  }

  private trail(x: number, y: number) {
    const key = PARTICLE[this.element];
    const dot = hasFx(this.scene, key)
      ? this.scene.add.image(x, y, fxKey(key)).setScale(16 / Math.max(1, this.scene.textures.get(fxKey(key)).getSourceImage().width))
      : this.scene.add.circle(x, y, 5, this.color, 0.7);
    dot.setDepth(1990);
    this.scene.tweens.add({ targets: dot, alpha: 0, scale: 0.2, duration: 260, onComplete: () => dot.destroy() });
  }

  /** The shot arrived (or its target is gone): strike weapons pop where it lands. */
  destroy(at?: { x: number; y: number }) {
    if (this.motion === "strike" && at) {
      const pop = this.scene.add.image(at.x, at.y, this.img.texture.key).setDepth(2000);
      const end = 96 / Math.max(1, pop.width);
      pop.setScale(end * 0.5).setRotation((Math.random() - 0.5) * 0.6);
      pop.preFX?.addGlow(this.color, 3, 0, false, 0.1, 8);
      this.scene.tweens.add({ targets: pop, scale: end, alpha: 0, duration: 320, ease: "Back.Out", onComplete: () => pop.destroy() });
    }
    this.img.destroy();
  }
}
