/**
 * v2.2 Story 3 ("The Throne of Dust") rules helpers: the pure parts of the Faceless, cage,
 * Purify, mimic and equal-ground mechanics. The Sim (shared/sim.ts) owns the state and the events;
 * see docs/features/v2.2-sand-and-sea/README.md section 4.
 *
 * Masks: a masked monster (SimMonster.masked) is untargetable AND immune to all damage, so a
 * player never wastes shots; it only stops being a wall of nothing once a lit brazier unmasks it.
 */
import { MONSTERS, type MonsterDef } from "./monsters.ts";
import type { Path, Pt } from "./path.ts";

/** A brazier unmasks a Faceless within (its slot's distance to the nearest path) + this many px. Covers ~400-600 px of path. */
export const BRAZIER_MARGIN = 130;
/** An unmasked civilian runs for the exit this much faster. */
export const CIVILIAN_FLEE = 1.6;
/** Seconds between `cage` events while the lock takes damage. */
export const CAGE_PULSE = 0.5;
/** A mimic's HP, as a share of a normal monster of the wave. */
export const MIMIC_HP = 0.8;
/** Burrow: monsters within this many px of the boss can be swallowed. */
export const BURROW_RANGE = 320;
/** Burrowed monsters never come up past this share of the path (no free leaks). */
export const BURROW_MAX = 0.97;

/** Unmask radius of a brazier at `pos`: it reaches the path, then BRAZIER_MARGIN further. */
export function brazierRadius(paths: Path[], pos: Pt) {
  let best = Infinity;
  for (const p of paths) {
    for (let d = 0; d < p.length; d += 10) {
      const q = p.at(d);
      best = Math.min(best, Math.hypot(q.x - pos.x, q.y - pos.y));
    }
  }
  return best + BRAZIER_MARGIN;
}

/** The monster def a mimic uses: the first Faceless soldier in the roster (null when none exists). */
export function mimicDef(): MonsterDef | null {
  return MONSTERS.find((m) => m.faceless === "soldier") ?? null;
}
