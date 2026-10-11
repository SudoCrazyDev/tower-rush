/**
 * v1.2 Stories: unit statuses and the board areas they use. The numbers are in effects.ts
 * (aura, rally, irritate, fatigue, shellshock, wages, oath, bane); the rules shared by the solo
 * battle (BattleScene) and the headless Sim (Playground and PvP) are here.
 *
 * Statuses are short timers on a unit, like the existing frozen timer:
 * - Rally (positive): attacks much faster
 * - Irritation: each attack may miss
 * - Fatigue: attacks slower
 * - Shellshock: stunned (no attacks)
 * - Entangled (v2.1): roots hold it, no attacks until the wave ends
 * - Submerged (v2.2): on a flooded slot at high tide, no attacks (a board rule, not a debuff)
 * - Asleep (v2.2): a siren's song, no attacks until tapped awake or the timer runs out
 * - Glimmered (v2.2): caught in a lantern beam, attacks deal less damage
 * An Aegis Knight next to a unit makes it immune to the three debuffs and clears them.
 */
import type { UnitDef } from "./units.ts";

/** The tiles of the 3×3 square around tile `i` on the 5×3 board, `i` itself left out. */
export function square3(i: number) {
  const col = i % 5;
  const row = Math.floor(i / 5);
  const out: number[] = [];
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r < 0 || r > 2 || c < 0 || c > 4 || (r === row && c === col)) continue;
      out.push(r * 5 + c);
    }
  }
  return out;
}

export const isKnight = (def: UnitDef) => def.role === "Knight";
export const isMercenary = (def: UnitDef) => def.role === "Mercenary";

/** The timers a unit carries. */
export interface UnitStatus {
  rallyUntil: number;
  irritatedUntil: number;
  /** Miss chance while irritated. */
  miss: number;
  fatiguedUntil: number;
  shockedUntil: number;
  /** Entangled by roots (v2.1): no attacks until this time (Infinity = until the wave ends). */
  entangledUntil: number;
  /** v2.2: under water at high tide (flooded slots only): no attacks. Not a debuff: the Aegis Knight can't clear it. */
  submergedUntil: number;
  /** v2.2: sung asleep by a siren: no attacks until tapped awake (Sim.wake) or this time. */
  asleepUntil: number;
  /** v2.2: in a lantern beam: attack damage is multiplied by `glimmer` until this time. */
  glimmeredUntil: number;
  glimmer: number;
}

export const newStatus = (): UnitStatus => ({ rallyUntil: 0, irritatedUntil: 0, miss: 0, fatiguedUntil: 0, shockedUntil: 0, entangledUntil: 0, submergedUntil: 0, asleepUntil: 0, glimmeredUntil: 0, glimmer: 1 });

/** Remove every debuff (an Aegis Knight's touch). */
export function clearDebuffs(s: UnitStatus) {
  s.irritatedUntil = s.fatiguedUntil = s.shockedUntil = s.entangledUntil = s.asleepUntil = s.glimmeredUntil = 0;
}
