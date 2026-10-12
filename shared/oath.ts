/**
 * v2.3 Story 4 ("The Iron Oath") rules numbers and pure helpers: evacuation, rune shields, the
 * Walking Forge's parts and the Colossus's growth. The Sim (shared/sim.ts) owns the state and the
 * events; see docs/features/v2.3-the-iron-oath/README.md section 4.
 */
import type { Element } from "./units.ts";

export const OATH = {
  /** Evacuation: a hunter dives on a family ahead of it on the road (one it is about to fly over) within this share of the path. */
  diveRange: 0.15,
  /** The unit role that breaks a rune of any element (the Runecaller card). */
  breakerRole: "Runecaller",
  /** Walking Forge: share of damage its core takes while another part stands, when the boss def has no `coreArmor`. */
  coreArmor: 0.3,
  /** Colossus absorb: after the first use (which takes every iron monster alive) it only reaches this far (px). */
  absorbReach: 320,
  /** Colossus absorb: each iron monster eaten also makes it this much faster (share). */
  absorbSpeed: 0.012,
  /** Colossus absorb: stacks stop adding at this many. */
  absorbMax: 24,
  /** Seconds between the Forge's mana payments (the fight is one long wave, so no wave income). */
  forgePay: 5,
};

/** Whether a unit of `element` (and `role`) breaks a rune of element `rune`. */
export const breaksRune = (element: Element, role: string | undefined, rune: Element) => element === rune || role === OATH.breakerRole;

/** One of the elements, picked with `roll` (0-1), or null when the board has none. */
export function pickRuneElement(elements: Element[], roll: number): Element | null {
  const list = [...new Set(elements)].sort();
  return list.length ? list[Math.min(list.length - 1, Math.floor(roll * list.length))] : null;
}

/** A part of a boss with parts, live (see BossPart). */
export interface PartState {
  id: string;
  name: string;
  hp: number;
  max: number;
  broken: boolean;
}
