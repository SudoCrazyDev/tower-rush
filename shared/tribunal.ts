/**
 * v2.4 Story 5 ("The Silver Tribunal") rules numbers, types and pure helpers: pleas and laws, the
 * confiscated deck and its cells, chains, the Great Scale's pans, the collapsing city and the
 * sentence. The Sim (shared/sim.ts) owns the state and the events; see
 * docs/features/v2.4-the-silver-tribunal/README.md section 3.
 */

/** The laws the Prosecutor can declare. A unit that breaks one is jailed (disabled) until the count is over. */
export type LawId = "no_fire" | "only_four" | "no_merge" | "no_summon";

export const LAWS: Record<LawId, { name: string; text: string; icon: string }> = {
  no_fire: { name: "No fire", text: "No unit of the fire element may strike.", icon: "law_no_fire" },
  only_four: { name: "Only four may strike", text: "Only the four highest-ranked fighters may strike. The rest are jailed.", icon: "law_only_four" },
  no_merge: { name: "No merging", text: "A unit born of a merge after the bell is jailed.", icon: "law_no_merge" },
  no_summon: { name: "No summoning after the bell", text: "A unit summoned after the bell is jailed.", icon: "law_no_summon" },
};
export const LAW_IDS = Object.keys(LAWS) as LawId[];

export const TRIBUNAL = {
  /** The unit role whose neighbours (and itself) are never jailed, chained or condemned: Argent's mercy. */
  mercyRole: "Justiciar",
  /** Fighters that may strike under "Only four may strike". */
  onlyFour: 4,
  /** Share of a returned unit's worth (summon cost x rank) refunded as mana when it is condemned or its tile falls and no tile is free. */
  refund: 0.4,
  /** A tap on a chained unit breaks this many of the chain's links. */
  tapLinks: 1,
  /** Where the witness of a Guilty plea stands when the board is full: it takes the place of the weakest unit until the count ends. */
  witnessLends: true,
};

/** Which pan of the Great Scale a board column belongs to (the middle column is the pivot). */
export function panOf(slot: number): "left" | "center" | "right" {
  const col = slot % 5;
  return col < 2 ? "left" : col > 2 ? "right" : "center";
}

/** Chapter 1: the trial. A plea before each count (a wave with a `charge`). */
export interface TrialRules {
  /** Guilty: that count's monsters have this multiple of their HP. */
  guiltyHp: number;
  /** The witness who fights for you on a Guilty plea stands at this rank, and at the best card level on your deck's side (see chapterDeck). */
  witnessRank: number;
  witnessLevel: number;
  /** Seconds between the plea and the bell (build under the law, then the count starts). */
  prep: number;
}

/** A charge: one count of the trial, drawn from one land's monsters. */
export interface Charge {
  /** The land the charge comes from ("Elven Wilds"). */
  land: string;
  /** Short title of the charge ("Burning the Elderwood"). */
  title: string;
  /** What the Prosecutor reads out. */
  text: string;
  /** The land's witness: a unit id (a story card) who fights for you if you plead Guilty. */
  witness: string;
  /** The law the Prosecutor declares if you plead Not guilty. */
  law: LawId;
}

/** Chapter 2: your cards are locked in cells along the path; killing monsters next to a cell breaks it. */
export interface CellRules {
  /** Shares (0-1) of the path where cells stand (cell i uses path i % 2, share at[i % at.length]). */
  at: number[];
  /** Kills next to cell i it takes to break it (hp[i % hp.length]). */
  hp: number[];
  /** A kill within this many px of a cell counts. */
  reach: number;
}

/** Chapter 3: the Great Scale. The pan with more total unit ranks tilts down and its units are crushed. */
export interface ScaleRules {
  /** Seconds between crushing hits. */
  every: number;
  /** The heavy pan must have at least this many ranks more than the light one. */
  gap: number;
  /** A crushed unit is stunned for this long (seconds). */
  stun: number;
}

/** Chapter 4: the city falls away. At the start of wave `at[i]` the tiles `slots[i]` fall; `warn` seconds before, the floor trembles. */
export interface CollapseRules {
  at: number[];
  slots: number[][];
  warn: number;
}

/** A cell of chapter 2 (live). */
export interface CellState {
  card: string;
  x: number;
  y: number;
  hp: number;
  max: number;
  broken: boolean;
}
