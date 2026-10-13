/**
 * v2.7 unit revamp: per-unit awakenings, defined in code (not in the saved D1 config).
 *
 * A unit awakens at max rank when the game has its awakened art (see Sim.awakensAt). An awakened
 * unit with an entry here gets its own permanent damage and attack speed multipliers and its own
 * ultimate (shared/ultimates.ts runs them). Units without an entry keep the generic awakening:
 * ECONOMY.awakenDamageMult / awakenSpeedMult and the radius strike every ECONOMY.ultimateCooldown.
 *
 * Ultimates are "timer" (cast every `every` seconds of charge; Hourglass Owls charge them faster,
 * Echo Spirits repeat most of them), "passive" (change every attack; no charge, no echo) or "field"
 * (always on: hives, mushrooms, vines the unit keeps on the board; no charge, no echo).
 */
import { ECONOMY } from "./economy.ts";

export type UltId =
  | "multi_shot"
  | "burning_spear"
  | "bomberman"
  | "wisp"
  | "tesla_coil"
  | "primal_roar"
  | "broadside"
  | "judgment_slam"
  | "scorched_earth"
  | "winter_storm"
  | "bee_hives"
  | "iceborn"
  | "overheat"
  | "ultra_focused"
  | "mushroom_puff"
  | "rag_doll"
  | "mjolnir"
  | "vineyard"
  | "crystal_throw"
  | "blade_dance"
  | "moonshine"
  | "reborn"
  | "black_plague"
  | "shadow_clones"
  | "hunting_storm"
  | "forest_grasp"
  | "raise_dead"
  | "tidal_wave";

export interface UltDef {
  id: UltId;
  name: string;
  mode: "passive" | "timer" | "field";
  /** Seconds of charge between casts (timer ultimates only). */
  every: number;
  /** Tuning numbers, read by shared/ultimates.ts. Damage values are multiples of the unit's hit. */
  params: Record<string, number>;
}

export const ULTIMATES: Record<UltId, UltDef> = {
  multi_shot: { id: "multi_shot", name: "Multi-Shot", mode: "passive", every: 0, params: { arrows: 3, damage: 1 } },
  burning_spear: { id: "burning_spear", name: "Burning Spear", mode: "timer", every: 5, params: { targets: 5, damage: 3, burnDps: 0.5, burnTime: 3 } },
  bomberman: { id: "bomberman", name: "Bomberman Mode", mode: "timer", every: 6, params: { bombs: 4, damage: 2, radius: 90, spread: 90 } },
  wisp: { id: "wisp", name: "Fire-o'-Wisp", mode: "timer", every: 3, params: { targets: 3, burnDps: 0.6, burnTime: 4 } },
  tesla_coil: { id: "tesla_coil", name: "Tesla Coil", mode: "passive", every: 0, params: { jumps: 2, damage: 0.5 } },
  primal_roar: { id: "primal_roar", name: "Primal Roar", mode: "timer", every: 10, params: { stun: 2, bossStun: 1, immune: 4 } },
  broadside: { id: "broadside", name: "Broadside", mode: "timer", every: 8, params: { balls: 5, damage: 2, radius: 90, spacing: 70, plunder: 2 } },
  judgment_slam: { id: "judgment_slam", name: "Judgment Slam", mode: "timer", every: 8, params: { damage: 8, radius: 170, curse: 0.25, curseTime: 5 } },
  // rare
  scorched_earth: { id: "scorched_earth", name: "Scorched Earth", mode: "timer", every: 45, params: { duration: 25, burnDps: 0.5 } },
  winter_storm: { id: "winter_storm", name: "Winter Storm", mode: "timer", every: 10, params: { slow: 0.5, slowTime: 4, freezes: 5, freeze: 3, bossFreeze: 1 } },
  bee_hives: { id: "bee_hives", name: "Bee Hives", mode: "field", every: 0, params: { hives: 2, damage: 45, speed: 1.8 } },
  iceborn: { id: "iceborn", name: "Iceborn Warmother", mode: "passive", every: 0, params: { boss: 1.5 } },
  overheat: { id: "overheat", name: "Overheat", mode: "timer", every: 25, params: { duration: 10, baseSpeed: 2, jam: 2 } },
  ultra_focused: { id: "ultra_focused", name: "Ultra Focused", mode: "passive", every: 0, params: { crit: 0.65, critMult: 2.5 } },
  mushroom_puff: { id: "mushroom_puff", name: "Mushroom Puff", mode: "field", every: 0, params: { max: 5, sprout: 2, grow: 3, touch: 45, radius: 90, slow: 0.9, slowTime: 6 } },
  rag_doll: { id: "rag_doll", name: "Rag Doll", mode: "timer", every: 35, params: { dolls: 4, duration: 15, radius: 50, slow: 0.6, dps: 1 } },
  mjolnir: { id: "mjolnir", name: "Grace of Mjolnir", mode: "passive", every: 0, params: { jumps: 5, damage: 0.6 } },
  vineyard: { id: "vineyard", name: "Vineyard", mode: "field", every: 0, params: { length: 140, dps: 1 } },
  // epic
  crystal_throw: { id: "crystal_throw", name: "Crystal Throw", mode: "timer", every: 10, params: { damage: 2, radius: 180 } },
  blade_dance: { id: "blade_dance", name: "Blade Dance", mode: "passive", every: 0, params: { crit: 0.7, critMult: 3.5, bossCrit: 1 } },
  // Luna's Blessing: each blessing on a unit adds `damage` and `speed` (they stack) and `mana` per attack.
  moonshine: { id: "moonshine", name: "Moonshine", mode: "timer", every: 15, params: { targets: 4, duration: 10, damage: 0.5, speed: 0.5, mana: 5 } },
  // Reborn waits, fully charged, until a monster is `at` of the way down the path.
  reborn: { id: "reborn", name: "Reborn", mode: "timer", every: 30, params: { at: 0.85, egg: 5, burnDps: 0.65, stun: 10, bossStun: 5 } },
  // One puddle per throw, plus one per `per` kills (up to `max`).
  black_plague: { id: "black_plague", name: "Black Plague", mode: "passive", every: 0, params: { radius: 90, duration: 10, slow: 0.75, dps: 1, per: 25, max: 4 } },
  shadow_clones: { id: "shadow_clones", name: "Shadow Clones", mode: "timer", every: 12, params: { clones: 2, duration: 8, damage: 0.5, gap: 48 } },
  hunting_storm: { id: "hunting_storm", name: "Hunting Storm", mode: "timer", every: 8, params: { bolts: 6, damage: 3, shock: 0.3, shockTime: 4 } },
  forest_grasp: { id: "forest_grasp", name: "Forest Grasp", mode: "timer", every: 10, params: { targets: 5, hold: 3, bossHold: 1, damage: 2 } },
  raise_dead: { id: "raise_dead", name: "Raise Dead", mode: "passive", every: 0, params: { max: 5, damage: 3, radius: 100, speed: 110, life: 20, touch: 45 } },
  tidal_wave: { id: "tidal_wave", name: "Tidal Wave", mode: "timer", every: 12, params: { push: 120, bossPush: 40, damage: 1.5, slow: 0.4, slowTime: 3 } },
};

/** Ultimates an Echo Spirit can't repeat (a second copy would change nothing or stack oddly). */
export const NO_ECHO: ReadonlySet<UltId> = new Set<UltId>(["primal_roar", "scorched_earth", "overheat", "rag_doll", "moonshine", "reborn", "shadow_clones", "tidal_wave"]);

/** Units that never awaken (even with awakened art). */
export const NO_AWAKEN: ReadonlySet<string> = new Set(["imp_hunter", "frog_alchemist", "witch_doctor", "pumpkin_scarecrow", "ogre_chef", "emberhold_gunner", "runecaller"]);

export interface Awakening {
  /** Permanent multipliers on the awakened unit's damage and attack speed. */
  damage: number;
  speed: number;
  ult: UltId;
}

export const AWAKENINGS: Record<string, Awakening> = {
  // common
  hooded_archer: { damage: 3, speed: 3, ult: "multi_shot" },
  fox_spearman: { damage: 3, speed: 3, ult: "burning_spear" },
  goblin_bomber: { damage: 5, speed: 1, ult: "bomberman" },
  flame_adept: { damage: 3, speed: 3, ult: "wisp" },
  clockwork_turret: { damage: 2, speed: 4, ult: "tesla_coil" },
  wolf_hunter: { damage: 3, speed: 3, ult: "primal_roar" },
  pirate_gunner: { damage: 3, speed: 2, ult: "broadside" },
  shield_knight: { damage: 4, speed: 2, ult: "judgment_slam" },
  // rare
  ember_witch: { damage: 3, speed: 3, ult: "scorched_earth" },
  frost_sorceress: { damage: 3, speed: 3, ult: "winter_storm" },
  // Bee Keeper stops attacking: her hives do the work.
  bee_keeper: { damage: 0, speed: 0, ult: "bee_hives" },
  bear_rider: { damage: 3, speed: 3, ult: "iceborn" },
  gear_engineer: { damage: 2, speed: 4, ult: "overheat" },
  sand_monk: { damage: 1.5, speed: 5, ult: "ultra_focused" },
  spore_sage: { damage: 3, speed: 3, ult: "mushroom_puff" },
  storm_totem: { damage: 3, speed: 3, ult: "rag_doll" },
  thunder_dwarf: { damage: 3, speed: 3, ult: "mjolnir" },
  // Vine Druid never attacks (see shared/reworks.ts): the multipliers scale her vines.
  vine_druid: { damage: 3, speed: 1, ult: "vineyard" },
  // epic
  crystal_golem: { damage: 6, speed: 0.2, ult: "crystal_throw" },
  fox_samurai: { damage: 3, speed: 3, ult: "blade_dance" },
  moon_oracle: { damage: 3, speed: 2, ult: "moonshine" },
  phoenix_chick: { damage: 3, speed: 4, ult: "reborn" },
  plague_alchemist: { damage: 1, speed: 1, ult: "black_plague" },
  shadow_ninja: { damage: 3, speed: 4, ult: "shadow_clones" },
  storm_whelp: { damage: 2, speed: 4, ult: "hunting_storm" },
  treant_guardian: { damage: 2, speed: 3, ult: "forest_grasp" },
  bone_necromancer: { damage: 4, speed: 2, ult: "raise_dead" },
  tide_mermaid: { damage: 3, speed: 3, ult: "tidal_wave" },
};

/** Awakened damage and speed multipliers for a unit id (its own, or the generic ones). */
export const awakenDamageMult = (id: string) => AWAKENINGS[id]?.damage ?? ECONOMY.awakenDamageMult;
export const awakenSpeedMult = (id: string) => AWAKENINGS[id]?.speed ?? ECONOMY.awakenSpeedMult;
/** Whether a unit id may awaken at all (the game also needs its awakened art). */
export const mayAwaken = (id: string) => !NO_AWAKEN.has(id);
/** The unit's own ultimate, or null for the generic one. */
export const ultOf = (id: string): UltDef | null => (AWAKENINGS[id] ? ULTIMATES[AWAKENINGS[id].ult] : null);
/** Seconds of charge between ultimates; 0 for a passive one. */
export const ultEvery = (id: string) => {
  const u = ultOf(id);
  return u ? (u.mode === "timer" ? u.every : 0) : ECONOMY.ultimateCooldown;
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const x = (v: number) => `×${+v.toFixed(2)}`;

/** Player-facing name of a unit's ultimate ("Ultimate" for the generic one). */
export const ultName = (id: string) => ultOf(id)?.name ?? "Ultimate";

/** Player-facing description of a unit's ultimate, numbers included. */
export function ultText(id: string): string {
  const u = ultOf(id);
  if (!u) return `Every ${ECONOMY.ultimateCooldown}s: strikes all monsters around its target for ${x(ECONOMY.ultimateDamageMult)} damage.`;
  const p = u.params;
  switch (u.id) {
    case "multi_shot":
      return `Passive: every attack fires ${p.arrows} arrows at ${p.arrows} different monsters, each at full damage.`;
    case "burning_spear":
      return `Every ${u.every}s: a spear pierces the ${p.targets} leading monsters for ${x(p.damage)} damage and sets them burning (${pct(p.burnDps)} of a hit per second, ${p.burnTime}s).`;
    case "bomberman":
      return `Every ${u.every}s: throws ${p.bombs} bombs onto the path, each blasting ${x(p.damage)} damage around it.`;
    case "wisp":
      return `Every ${u.every}s: a wisp sets ${p.targets} random monsters burning (${pct(p.burnDps)} of a hit per second, ${p.burnTime}s).`;
    case "tesla_coil":
      return `Passive: every attack also zaps a random monster, chaining to ${p.jumps} more, for ${pct(p.damage)} of a hit.`;
    case "primal_roar":
      return `Every ${u.every}s: stuns every monster for ${p.stun}s (bosses ${p.bossStun}s). Stunned monsters ignore the next roar for ${p.immune}s.`;
    case "broadside":
      return `Every ${u.every}s: ${p.balls} cannonballs pound the path from the front, each blasting ${x(p.damage)} damage. Kills pay ${x(p.plunder)} plunder.`;
    case "judgment_slam":
      return `Every ${u.every}s: slams the strongest monster for ${x(p.damage)} damage and curses everything nearby: +${pct(p.curse)} damage taken for ${p.curseTime}s.`;
    case "scorched_earth":
      return `Every ${u.every}s: scorches the whole path for ${p.duration}s. Every monster on it burns (${pct(p.burnDps)} of a hit per second), new waves too.`;
    case "winter_storm":
      return `Every ${u.every}s: a storm slows every monster by ${pct(p.slow)} for ${p.slowTime}s and freezes ${p.freezes} random monsters for ${p.freeze}s (bosses ${p.bossFreeze}s).`;
    case "bee_hives":
      return `Passive: stops attacking and puts ${p.hives} beehives on the path. Their swarms fly at any monster on the map (${p.damage} damage, ${p.speed} attacks/s, raised by card level and power-ups).`;
    case "iceborn":
      return `Passive: +${pct(p.boss)} damage to bosses.`;
    case "overheat":
      return `Every ${u.every}s: overheats for ${p.duration}s. Base attack speed rises to ${p.baseSpeed}/s and shots lose their splash. Then cools down for ${p.jam}s without attacking.`;
    case "ultra_focused":
      return `Passive: stun is replaced by a ${pct(p.crit)} chance to crit for ${x(p.critMult)}. Adds Giant Slayer (+40% to tanks and bosses) on top of True Strike.`;
    case "mushroom_puff":
      return `Passive: a mushroom sprouts on the path every ${p.sprout}s (up to ${p.max}) and grows for ${p.grow}s. The first monster to touch it bursts it: everything within ${p.radius}px is slowed ${pct(p.slow)} for ${p.slowTime}s and poisoned.`;
    case "rag_doll":
      return `Every ${u.every}s: ${p.dolls} rag dolls stand along the path for ${p.duration}s. Monsters near one are slowed ${pct(p.slow)} and zapped (${x(p.dps)} hit per second).`;
    case "mjolnir":
      return `Passive: every attack also chains lightning to up to ${p.jumps} more monsters for ${pct(p.damage)} of the hit.`;
    case "vineyard":
      return `Passive: the whole path is overgrown for good. Monsters on it take her hit every second. No blocking.`;
    case "crystal_throw":
      return `Every ${u.every}s: hurls a giant crystal into the thickest crowd. It shatters for ${x(p.damage)} damage to everything within ${p.radius}px.`;
    case "blade_dance":
      return `Passive: ${pct(p.crit)} chance to crit for ${x(p.critMult)}. While a boss is on the board, every hit crits. Adds True Strike and Giant Slayer.`;
    case "moonshine":
      return `Every ${u.every}s: Luna's Blessing falls on ${p.targets} random units for ${p.duration}s: +${pct(p.damage)} damage, +${pct(p.speed)} attack speed and +${p.mana} mana per attack. Blessings stack.`;
    case "reborn":
      return `When a monster is ${pct(p.at)} of the way down the path (every ${u.every}s at most): turns into an egg for ${p.egg}s while every monster burns (${pct(p.burnDps)} of a hit per second). Then hatches and stuns every monster for ${p.stun}s (bosses ${p.bossStun}s).`;
    case "black_plague":
      return `Passive: every throw lands a black puddle on a random spot of the path where monsters walk (${p.radius}px, ${p.duration}s). Monsters in it are slowed ${pct(p.slow)} (bosses half) and take a hit every second; puddles stack. One more puddle per throw for every ${p.per} kills (up to ${p.max}).`;
    case "shadow_clones":
      return `Every ${u.every}s: ${p.clones} shadow clones join him for ${p.duration}s, copying every attack at ${pct(p.damage)} damage (crits included).`;
    case "hunting_storm":
      return `Every ${u.every}s: lightning hunts the ${p.bolts} fastest monsters for ${x(p.damage)} damage. Shocked monsters take +${pct(p.shock)} damage for ${p.shockTime}s.`;
    case "forest_grasp":
      return `Every ${u.every}s: roots grab the ${p.targets} strongest monsters for ${x(p.damage)} damage and hold them ${p.hold}s (bosses ${p.bossHold}s).`;
    case "raise_dead":
      return `Passive: monsters that die under his curse rise as skeletons (up to ${p.max}) and walk back up the path. The first monster they meet sets them off for ${x(p.damage)} damage within ${p.radius}px.`;
    case "tidal_wave":
      return `Every ${u.every}s: a wave washes every monster ${p.push}px back up the path (bosses ${p.bossPush}px) for ${x(p.damage)} damage and slows them ${pct(p.slow)} for ${p.slowTime}s.`;
  }
}

/** One line for card backs: "×3 dmg · ×3 speed". */
export const awakenBoostText = (id: string) => `${x(awakenDamageMult(id))} dmg · ${x(awakenSpeedMult(id))} speed`;
