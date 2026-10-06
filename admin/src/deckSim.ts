/**
 * Deck simulation for the Playground's Deck tab: whole matches played by PvpBots on
 * PvpBoards (shared/pvpsim.ts), so the board is built the way a player builds it (summon,
 * merge, power-ups, hero), from five cards. Either deck A against deck B, or deck A alone
 * against the PvP waves with nobody sending.
 */
import { PvpBoard } from "../../shared/pvpsim.ts";
import { PvpBot } from "../../shared/pvpbot.ts";
import { PVP, pvpArena, type Loadout } from "../../shared/pvp.ts";

export interface DeckSide {
  cards: string[];
  hero: string | null;
  level: number;
}

export interface DeckRunOptions {
  a: DeckSide;
  /** Null plays deck A alone against the waves. */
  b: DeckSide | null;
  /** Null picks the arena from each match seed, like PvP does. */
  arena: string | null;
  skill: number;
  runs: number;
  awakens?: (id: string) => boolean;
}

export interface SideStats {
  /** Damage per card, averaged over the runs. */
  damage: Record<string, number>;
  heroDamage: number;
  /** Highest rank each card reached, averaged over the runs. */
  topRank: Record<string, number>;
  /** Average HP at the start of each wave (index 0 is wave 1); a lost board counts as 0. */
  hpByWave: number[];
  hpLeft: number;
  summons: number;
  merges: number;
  sends: number;
}

export interface DeckResult {
  runs: number;
  /** Wins for A, B and draws (solo: survived to the last wave, lost, unused). */
  wins: [number, number, number];
  /** Matches that ended with a board on 0 HP rather than at the last wave. */
  byHp: number;
  avgTime: number;
  /** Last wave reached, per run. */
  waves: number[];
  a: SideStats;
  b: SideStats | null;
}

const SEED = 7000;

function loadout(side: DeckSide, name: string): Loadout {
  return { name, trophies: 0, deck: side.cards, levels: Object.fromEntries(side.cards.map((id) => [id, side.level])), hero: side.hero, bot: true };
}

/** Running totals for one side, turned into averages by `finish`. */
class Tally {
  damage: Record<string, number> = {};
  topRank: Record<string, number> = {};
  heroDamage = 0;
  hp: number[] = new Array(PVP.rules.maxWave).fill(0);
  hpLeft = 0;
  summons = 0;
  merges = 0;
  sends = 0;

  constructor(cards: string[]) {
    for (const id of cards) this.damage[id] = this.topRank[id] = 0;
  }

  finish(runs: number): SideStats {
    const avg = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / runs]));
    return {
      damage: avg(this.damage),
      heroDamage: this.heroDamage / runs,
      topRank: avg(this.topRank),
      hpByWave: this.hp.map((v) => v / runs),
      hpLeft: this.hpLeft / runs,
      summons: this.summons / runs,
      merges: this.merges / runs,
      sends: this.sends / runs,
    };
  }
}

/** One board through a match: credits tile damage to the card standing there and notes HP per wave. */
class Watch {
  readonly board: PvpBoard;
  private readonly tally: Tally;
  private prev = new Array(15).fill(0);
  private top: Record<string, number> = {};
  private hp: number[] = [];

  constructor(board: PvpBoard, tally: Tally) {
    this.board = board;
    this.tally = tally;
  }

  afterTick() {
    const b = this.board;
    for (let s = 0; s < 15; s++) {
      const u = b.units[s];
      const d = b.damageBySlot[s] - this.prev[s];
      this.prev[s] = b.damageBySlot[s];
      if (!u) continue;
      const id = u.def.id;
      if (d > 0) this.tally.damage[id] = (this.tally.damage[id] ?? 0) + d;
      if (u.rank > (this.top[id] ?? 0)) this.top[id] = u.rank;
    }
    while (this.hp.length < b.wave) this.hp.push(b.hp);
  }

  done() {
    const b = this.board;
    const t = this.tally;
    // Waves never reached: 0 for a lost board, otherwise it kept what it had.
    const rest = b.outcome === "lost" ? 0 : b.hp;
    for (let w = 0; w < t.hp.length; w++) t.hp[w] += this.hp[w] ?? rest;
    for (const [id, r] of Object.entries(this.top)) t.topRank[id] = (t.topRank[id] ?? 0) + r;
    t.heroDamage += b.heroDamage;
    t.hpLeft += b.hp;
    t.summons += b.counts.summons;
    t.merges += b.counts.merges;
    t.sends += b.counts.sends;
  }
}

export function deckProblem(cards: string[], deckable: (id: string) => boolean) {
  if (cards.length !== 5 || cards.some((id) => !id)) return "Pick 5 cards";
  if (new Set(cards).size !== 5) return "Each card can only be in the deck once";
  if (!cards.every(deckable)) return "A card is turned off or story-only";
  return null;
}

export function runDecks(o: DeckRunOptions): DeckResult {
  const ta = new Tally(o.a.cards);
  const tb = o.b ? new Tally(o.b.cards) : null;
  const wins: [number, number, number] = [0, 0, 0];
  const waves: number[] = [];
  let byHp = 0;
  let time = 0;
  for (let i = 0; i < o.runs; i++) {
    const seed = SEED + i;
    const arena = o.arena ?? pvpArena(seed);
    const sides = o.b ? [o.a, o.b] : [o.a];
    const boards = sides.map((d, side) => new PvpBoard({ seed, side: side as 0 | 1, arena, loadout: loadout(d, side ? "B" : "A"), awakens: o.awakens }));
    // Alone, the bot still sends (it raises income) but nobody receives.
    const bots = boards.map((b, side) => new PvpBot(b, o.skill, seed + side, (id) => boards[1 - side]?.apply({ t: "recv", id })));
    const watches = boards.map((b, side) => new Watch(b, side ? tb! : ta));
    while (!boards.some((b) => b.over)) {
      for (const bot of bots) bot.think();
      for (const b of boards) b.tick();
      for (const w of watches) w.afterTick();
    }
    for (const w of watches) w.done();
    const [a, b] = boards;
    if (b) {
      const lost = [a.outcome === "lost", b.outcome === "lost"];
      wins[lost[0] && lost[1] ? 2 : lost[0] ? 1 : lost[1] ? 0 : a.hp === b.hp ? 2 : a.hp > b.hp ? 0 : 1]++;
      if (lost[0] || lost[1]) byHp++;
    } else {
      wins[a.outcome === "lost" ? 1 : 0]++;
      if (a.outcome === "lost") byHp++;
    }
    time += a.now;
    waves.push(Math.max(...boards.map((x) => x.wave)));
  }
  return { runs: o.runs, wins, byHp, avgTime: time / o.runs, waves, a: ta.finish(o.runs), b: tb?.finish(o.runs) ?? null };
}
