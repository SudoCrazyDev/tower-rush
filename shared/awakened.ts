/**
 * v2.7 unit revamp: per-unit awakenings, defined in code (not in the saved D1 config).
 *
 * A unit awakens at max rank when the game has its awakened art (see Sim.awakensAt). An awakened
 * unit with an entry here gets its own permanent damage and attack speed multipliers and its own
 * ultimate (shared/ultimates.ts runs them). Units without an entry keep the generic awakening:
 * ECONOMY.awakenDamageMult / awakenSpeedMult and the radius strike every ECONOMY.ultimateCooldown.
 *
 * Ultimates are either "timer" (cast every `every` seconds of charge; Hourglass Owls charge them
 * faster, Echo Spirits repeat them) or "passive" (change every attack; no charge, no echo).
 */
import { ECONOMY } from "./economy.ts";

export type UltId = "multi_shot" | "burning_spear" | "bomberman" | "wisp" | "tesla_coil" | "primal_roar" | "broadside" | "judgment_slam";

export interface UltDef {
  id: UltId;
  name: string;
  mode: "passive" | "timer";
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
};

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
};

/** Awakened damage and speed multipliers for a unit id (its own, or the generic ones). */
export const awakenDamageMult = (id: string) => AWAKENINGS[id]?.damage ?? ECONOMY.awakenDamageMult;
export const awakenSpeedMult = (id: string) => AWAKENINGS[id]?.speed ?? ECONOMY.awakenSpeedMult;
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
  }
}

/** One line for card backs: "×3 dmg · ×3 speed". */
export const awakenBoostText = (id: string) => `${x(awakenDamageMult(id))} dmg · ${x(awakenSpeedMult(id))} speed`;
