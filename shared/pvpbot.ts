/**
 * A PvP bot: plays a PvpBoard through the same actions a player has. It summons when it
 * can, merges pairs, buys power-ups once summoning gets expensive, and spends spare mana on
 * sends. `skill` (0-1) sets how quickly it reacts and how much it sends.
 */
import { rng } from "./sim.ts";
import { maxRank, maxPowerUp, powerUpCost } from "./units.ts";
import { canBecome } from "./support.ts";
import { PVP } from "./pvp.ts";
import type { PvpAction, PvpBoard } from "./pvpsim.ts";

/** Bot skill for a player's trophies: easy at the start, close to a decent player later. */
export const botSkill = (trophies: number) => Math.max(0.2, Math.min(0.9, 0.3 + trophies / 5000));

export class PvpBot {
  readonly board: PvpBoard;
  readonly skill: number;
  /** Called for each send the bot makes, so the match can deliver it to the other board. */
  private readonly onSend: (id: string) => void;
  private readonly r: () => number;
  private next = 1;

  constructor(board: PvpBoard, skill: number, seed: number, onSend: (id: string) => void = () => {}) {
    this.board = board;
    this.skill = skill;
    this.onSend = onSend;
    this.r = rng(seed);
  }

  /** Call once per tick. */
  think() {
    const b = this.board;
    if (b.over || b.now < this.next) return;
    this.next = b.now + 0.35 + (1 - this.skill) * 0.9 + this.r() * 0.4;
    // A few moves per look, like a player tapping through their options.
    for (let i = 0; i < 2 + Math.round(this.skill * 4); i++) if (!(this.merge() || this.copy() || this.powerUp() || this.send() || this.summon())) break;
  }

  private act(a: PvpAction) {
    return this.board.apply(a);
  }

  private pairs() {
    const out: [number, number, number][] = [];
    const units = this.board.units;
    for (let i = 0; i < 15; i++) {
      const u = units[i];
      if (!u || u.rank >= maxRank()) continue;
      for (let j = i + 1; j < 15; j++) {
        const v = units[j];
        if (v && v.def.id === u.def.id && v.rank === u.rank) out.push([i, j, u.rank]);
      }
    }
    return out.sort((a, b) => a[2] - b[2]);
  }

  private merge() {
    const b = this.board;
    const full = !b.units.includes(null);
    const pairs = this.pairs();
    if (!pairs.length) return false;
    // Merge low ranks freely; higher ones when the board is full (a merge rerolls the unit).
    if (!full && pairs[0][2] > 2 && this.r() > 0.3 + this.skill * 0.3) return false;
    const [from, to] = pairs[0];
    return this.act({ t: "merge", from, to });
  }

  /** A ready Mime copies the highest-damage unit it can: that always makes a pair to merge. */
  private copy() {
    const units = this.board.units;
    for (let i = 0; i < 15; i++) {
      const m = units[i];
      if (!m || !this.board.mimeReady(i)) continue;
      let best = -1;
      for (let j = 0; j < 15; j++) {
        const v = units[j];
        if (v && j !== i && canBecome(m, v) && (best < 0 || v.stats.damage > units[best]!.stats.damage)) best = j;
      }
      if (best >= 0) return this.act({ t: "copy", from: i, to: best });
    }
    return false;
  }

  private powerUp() {
    const b = this.board;
    if (b.summonCost < 60 && b.units.includes(null)) return false;
    // The deck card with the most units on the board.
    const counts: Record<string, number> = {};
    for (const u of b.units) if (u) counts[u.def.id] = (counts[u.def.id] ?? 0) + u.rank;
    const best = Object.keys(counts).sort((x, y) => counts[y] - counts[x])[0];
    if (!best) return false;
    const lvl = b.powerUps[best];
    if (lvl >= maxPowerUp() || b.mana < powerUpCost(lvl) * 1.1) return false;
    return this.act({ t: "power", id: best });
  }

  private send() {
    const b = this.board;
    if (b.wave < 2 || this.r() > 0.2 + this.skill * 0.4) return false;
    // Keep enough for the next summon while the board has room.
    const keep = b.units.includes(null) ? b.summonCost : 0;
    const ready = PVP.sends.filter((s) => s.enabled && !b.sendProblem(s.id) && b.mana - s.cost >= keep);
    if (!ready.length) return false;
    // Early on, income; later, the biggest attack it can afford.
    const early = b.wave < 12;
    ready.sort((x, y) => (early ? y.income / y.cost - x.income / x.cost : y.cost - x.cost));
    const s = ready[0];
    if (!this.act({ t: "send", id: s.id })) return false;
    this.onSend(s.id);
    return true;
  }

  private summon() {
    return this.act({ t: "summon" });
  }
}
