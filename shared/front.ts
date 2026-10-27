/**
 * v3.0 "The Dark War" (docs/features/v3.0-the-dark-war): the Shifting Front.
 *
 * A chapter fights over 2-3 fronts in turn. A war meter fills with kills; when it is full (or at the
 * latest when wave `by` starts) the front shifts: the arena's art changes for good (a transition video
 * plays; the path and tiles stay the same) and the new front's field rule takes over.
 */
import type { Element } from "./units.ts";
import type { Race } from "./races.ts";

/** One front of the war: its arena art and its field rule. Every number is optional (off). */
export interface FrontRule {
  /** Background art (locations/<art>.webp); the transition video from the previous front is <prev>__<art> without "arena_". */
  art: string;
  /** Shown on the shift banner. */
  name: string;
  text: string;
  /** Units of this element (or race) deal x `dmg`. */
  element?: Element;
  race?: Race;
  dmg?: number;
  /** Every unit attacks this much faster (0.2 = +20%). */
  haste?: number;
  /** Monsters that walk in on this front: speed and HP multipliers. */
  monsterSpeed?: number;
  monsterHp?: number;
  /** Extra mana per kill. */
  killMana?: number;
  /** A bolt strikes a random monster every `every` s: stuns it `stun` s and deals `dmg` x a normal monster's HP. */
  bolt?: { every: number; stun: number; dmg: number };
  /** A burst of fire on a random monster every `every` s: `dmg` x a normal monster's HP to every monster within `radius`. */
  burst?: { every: number; dmg: number; radius: number };
}

export interface FrontRules {
  fronts: FrontRule[];
  /** Kills that fill the meter on each front but the last (fronts.length - 1 entries). */
  kills: number[];
  /** The shift happens when this wave starts at the latest (fronts.length - 1 entries). */
  by: number[];
}

/** The transition video between two fronts' arts: "arena_dw_a" + "arena_dw_b" → "dw_a__dw_b"... named by the art without "arena_". */
export const frontVideo = (from: string, to: string) => `${from.replace(/^arena_/, "")}__${to.replace(/^arena_dw_/, "")}`;

/** Damage multiplier of a front for a unit. */
export function frontDamage(f: FrontRule | null, element: Element, race: Race) {
  if (!f?.dmg) return 1;
  if (f.element && f.element !== element) return 1;
  if (f.race && f.race !== race) return 1;
  if (!f.element && !f.race) return 1;
  return f.dmg;
}

/** What's wrong with a chapter's front rules (for the story validator). */
export function frontProblems(r: FrontRules): string[] {
  const out: string[] = [];
  if (r.fronts.length < 2) out.push("front: needs at least 2 fronts");
  if (r.kills.length !== r.fronts.length - 1) out.push("front: kills needs one entry per shift");
  if (r.by.length !== r.fronts.length - 1) out.push("front: by needs one entry per shift");
  return out;
}
