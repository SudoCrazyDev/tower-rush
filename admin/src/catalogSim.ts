/**
 * Small simulations the catalog workbench runs for one entry (shared/sim.ts): a unit against
 * training dummies or a wave, a monster against a reference board, a boss fight. They read
 * the live tables, so run them inside `withConfig` to measure the saved config or the draft.
 */
import { boardUnitStats, simulate, simulateMany, type SimSetup } from "../../shared/sim.ts";
import { maxRank, UNIT_BY_ID, UNITS, deckable } from "../../shared/units.ts";
import { noAttack } from "../../shared/support.ts";
import { primaryArch } from "./kitEditor";
import { makeSetup, starterDeck } from "./playground";

export const DUMMY_TIME = 20;
export const PACK = 5;

export interface Level {
  arena: string;
  wave: number;
  rank: number;
  cardLevel: number;
  powerUp: number;
}

const awake = (id: string, rank: number, canAwaken: Set<string>) => rank >= maxRank() && canAwaken.has(id);

/** On-paper numbers for a unit: damage per hit, attacks per second and their product. */
export function paper(id: string, l: Pick<Level, "rank" | "cardLevel" | "powerUp">, canAwaken: Set<string>) {
  const def = UNIT_BY_ID[id];
  if (!def) return null;
  const s = boardUnitStats({ id, rank: l.rank, awakened: awake(id, l.rank, canAwaken) }, l.cardLevel, l.powerUp);
  const attacks = !noAttack(primaryArch(def));
  return { damage: attacks ? s.damage : 0, speed: attacks ? s.speed : 0, dps: attacks ? s.damage * s.speed : 0, attacks };
}

/** Damage per second and kills a minute of one unit in the middle tile against `count` dummies. */
export function measureUnit(id: string, count: number, runs: number, l: Level, canAwaken: Set<string>, monster?: string) {
  if (!UNIT_BY_ID[id]) return null;
  let dmg = 0;
  let kills = 0;
  for (let i = 0; i < runs; i++) {
    const board: SimSetup["board"] = Array(15).fill(null);
    board[7] = { id, rank: l.rank, awakened: awake(id, l.rank, canAwaken) };
    const r = simulate(makeSetup({ arena: l.arena, board, cardLevel: l.cardLevel, powerUp: l.powerUp, seed: 1 + i, scenario: { kind: "dummies", count, wave: l.wave, duration: DUMMY_TIME, monster } }));
    dmg += r.totalDamage;
    kills += r.kills;
  }
  return { dps: dmg / runs / DUMMY_TIME, kpm: ((kills / runs) * 60) / DUMMY_TIME };
}

/** A full board of one unit (all 15 tiles) against the real wave. */
export function unitBoardSetup(id: string, l: Level, canAwaken: Set<string>): SimSetup {
  const board = Array.from({ length: 15 }, () => ({ id, rank: l.rank, awakened: awake(id, l.rank, canAwaken) }));
  return makeSetup({ arena: l.arena, board, cardLevel: l.cardLevel, powerUp: l.powerUp, scenario: { kind: "wave", wave: l.wave } });
}

/** The reference board monsters and bosses are tested against: the starter deck at one rank. */
export function referenceBoard(rank: number, canAwaken: Set<string>, deck = starterDeck()) {
  const ids = deck.filter((id) => UNIT_BY_ID[id]);
  const pool = ids.length ? ids : UNITS.filter(deckable).slice(0, 5).map((u) => u.id);
  return Array.from({ length: 15 }, (_, i) => {
    const id = pool[i % pool.length];
    return { id, rank, awakened: awake(id, rank, canAwaken) };
  });
}

export function runMany(setup: SimSetup, runs: number) {
  return simulateMany(setup, runs);
}
