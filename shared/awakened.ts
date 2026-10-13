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
  | "vineyard";

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
  overheat: { id: "overheat", name: "Overheat", mode: "timer", every: 35, params: { duration: 10, baseSpeed: 2, jam: 2 } },
  ultra_focused: { id: "ultra_focused", name: "Ultra Focused", mode: "passive", every: 0, params: { crit: 0.65, critMult: 2.5 } },
  mushroom_puff: { id: "mushroom_puff", name: "Mushroom Puff", mode: "field", every: 0, params: { max: 5, sprout: 2, grow: 3, life: 20, touch: 45, radius: 90, slow: 0.9, slowTime: 6 } },
  rag_doll: { id: "rag_doll", name: "Rag Doll", mode: "timer", every: 45, params: { dolls: 4, duration: 15, radius: 50, slow: 0.6, dps: 1 } },
  mjolnir: { id: "mjolnir", name: "Grace of Mjolnir", mode: "passive", every: 0, params: { jumps: 5, damage: 0.6 } },
  vineyard: { id: "vineyard", name: "Vineyard", mode: "field", every: 0, params: { patches: 3, length: 140, dps: 1 } },
};

/** Ultimates an Echo Spirit can't repeat (a second copy would change nothing or stack oddly). */
export const NO_ECHO: ReadonlySet<UltId> = new Set<UltId>(["primal_roar", "scorched_earth", "overheat", "rag_doll"]);

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
  sand_monk: { damage: 1, speed: 5, ult: "ultra_focused" },
  spore_sage: { damage: 3, speed: 3, ult: "mushroom_puff" },
  storm_totem: { damage: 3, speed: 3, ult: "rag_doll" },
  thunder_dwarf: { damage: 3, speed: 3, ult: "mjolnir" },
  // Vine Druid never attacks (see shared/reworks.ts): the multipliers scale her vines.
  vine_druid: { damage: 3, speed: 1, ult: "vineyard" },
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
      return `Passive: ${p.patches} stretches of the path are overgrown for good. Monsters in them take her hit every second. No blocking.`;
  }
}

/** One line for card backs: "×3 dmg · ×3 speed". */
export const awakenBoostText = (id: string) => `${x(awakenDamageMult(id))} dmg · ${x(awakenSpeedMult(id))} speed`;
