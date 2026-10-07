/**
 * One player's board in a PvP match: the seeded Sim (which owns summon, merge, power-ups and
 * the hero on demand) plus the PvP rules from PVP.md (waves on a fixed clock shared by both
 * boards, HP, income, sends).
 *
 * Every action goes through apply() and is logged with the tick it happened on, so a
 * board can be replayed exactly from its seed and log (replayBoard).
 */
import { Sim, SIM_DT, rng, type SimMonster } from "./sim.ts";
import { ECONOMY } from "./economy.ts";
import { BOSS_BY_ID, MONSTER_BY_ID, type BossDef, type MonsterDef } from "./monsters.ts";
import { PVP, SendStock, sendProblem, type BoardSnap, type Loadout, type SendDef } from "./pvp.ts";
import { EFFECTS } from "./effects.ts";

export { SIM_DT };

export type PvpAction =
  | { t: "summon" }
  | { t: "merge"; from: number; to: number }
  /** Mime `from` becomes a copy of the same-rank unit on `to`. */
  | { t: "copy"; from: number; to: number }
  /** Portal Imp `from` trades places with the same-rank unit on `to`. */
  | { t: "swap"; from: number; to: number }
  /** Portal Imp `from` jumps to the empty tile `to`. */
  | { t: "hop"; from: number; to: number }
  | { t: "power"; id: string }
  | { t: "hero" }
  | { t: "autohero"; on: boolean }
  | { t: "send"; id: string }
  /** A send from the opponent arrived (lands after the warning delay). */
  | { t: "recv"; id: string };

export interface LoggedAction {
  /** Tick it was applied before. */
  k: number;
  a: PvpAction;
}

export interface BoardOptions {
  /** The match seed: both boards get the same waves from it. */
  seed: number;
  side: 0 | 1;
  arena: string;
  loadout: Loadout;
  /** Whether a unit awakens at max rank (the game knows from its art; elsewhere none do). */
  awakens?: (id: string) => boolean;
}

interface Pending {
  def?: MonsterDef;
  boss?: BossDef;
  path: number;
  hpMult: number;
  /** Sent by the opponent: pays less mana, and its own leak damage. */
  sent?: SendDef;
}

export class PvpBoard extends Sim {
  readonly opts: BoardOptions;
  readonly stock = new SendStock();
  hp: number;
  income: number;
  ticks = 0;
  /** Sends on their way to this board. */
  incoming: { at: number; send: SendDef }[] = [];
  actions: LoggedAction[] = [];
  /** Time the next wave starts. */
  nextWaveAt: number;

  private pending: Pending[] = [];
  private sentQueue: Pending[] = [];
  private spawnGap = 1;
  private spawnIn = 0;
  private sentIn = 0;
  private incomeIn: number;
  private leakDamage = new Map<number, number>();
  /** Counts sends landed, so each one picks its paths from its own roll. */
  private landed = 0;

  constructor(o: BoardOptions) {
    super(
      {
        arena: o.arena,
        board: new Array(15).fill(null),
        cardLevel: 1,
        powerUp: 0,
        hero: o.loadout.hero,
        scenario: { kind: "run", from: 1, to: PVP.rules.maxWave },
        // Each board has its own combat rolls; the waves come from the match seed (startWave).
        seed: (o.seed ^ (o.side ? 0x68e31da4 : 0x1b873593)) >>> 0,
        maxTime: 7200,
      },
      { mode: "pvp", deck: o.loadout.deck, levels: o.loadout.levels, awakens: o.awakens, startMana: ECONOMY.startMana },
    );
    this.opts = o;
    this.hp = PVP.rules.hp;
    this.income = PVP.rules.baseIncome;
    this.nextWaveAt = PVP.rules.firstWaveDelay;
    this.incomeIn = PVP.rules.incomeEvery;
  }

  protected brewMult() {
    return EFFECTS.brewer.pvpMult;
  }

  /** Wave health ignores the arena (every PvP arena is equally hard) and climbs faster in sudden death. */
  baseHp(n: number) {
    const e = ECONOMY;
    const r = PVP.rules;
    const normal = Math.max(0, Math.min(n, r.suddenDeathWave) - 1);
    const extra = Math.max(0, n - r.suddenDeathWave);
    return r.waveHpScale * e.waveHpBase * Math.pow(e.waveHpGrowth, normal) * Math.pow(r.suddenDeathGrowth, extra);
  }

  /** Sent by the opponent (drawn differently, pays less). */
  isSent(m: SimMonster) {
    return this.leakDamage.has(m.uid);
  }

  get suddenDeath() {
    return this.wave >= PVP.rules.suddenDeathWave;
  }

  // ---------------------------------------------------------------- clock

  /** Advance one fixed step. */
  tick() {
    this.step(SIM_DT);
    this.ticks++;
  }

  protected flow(dt: number) {
    const r = PVP.rules;
    if (this.now >= this.nextWaveAt) {
      if (this.wave >= r.maxWave) return this.finish("done");
      this.startTimedWave();
    }
    if (this.pending.length) {
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        this.spawnPending(this.pending.shift()!);
        this.spawnIn = this.spawnGap;
      }
    }
    for (const inc of this.incoming) {
      if (inc.at > this.now) continue;
      const s = inc.send;
      const wr = rng((this.opts.seed + ++this.landed * 7919) >>> 0);
      for (let i = 0; i < s.count; i++) {
        const q = this.sendMonster(s);
        if (q) this.sentQueue.push({ ...q, path: wr() < 0.5 ? 0 : 1, hpMult: s.hpMult, sent: s });
      }
    }
    this.incoming = this.incoming.filter((inc) => inc.at > this.now);
    if (this.sentQueue.length) {
      this.sentIn -= dt;
      if (this.sentIn <= 0) {
        this.spawnPending(this.sentQueue.shift()!);
        this.sentIn = 0.3;
      }
    }
    this.incomeIn -= dt;
    if (this.incomeIn <= 0) {
      this.incomeIn += r.incomeEvery;
      this.gainMana(this.income, null, null, "income");
    }
  }

  private sendMonster(s: SendDef): { def?: MonsterDef; boss?: BossDef } | null {
    if (s.monster !== "boss") return MONSTER_BY_ID[s.monster] ? { def: MONSTER_BY_ID[s.monster] } : null;
    const bosses = this.arena.bosses;
    const i = Math.max(0, Math.ceil(Math.max(1, this.wave) / ECONOMY.bossEvery) - 1) % bosses.length;
    return BOSS_BY_ID[bosses[i]] ? { boss: BOSS_BY_ID[bosses[i]] } : null;
  }

  /** Same as a solo wave, but from the match seed (so both boards match) and added to anything left over. */
  private startTimedWave() {
    const r = PVP.rules;
    const e = ECONOMY;
    this.wave++;
    const n = this.wave;
    const wr = rng((this.opts.seed + n * 0x9e3779b1) >>> 0);
    const isBoss = n % e.bossEvery === 0;
    this.nextWaveAt += isBoss ? r.bossWaveSeconds : r.waveSeconds;
    if (n > 1) {
      this.gainMana(Math.round(e.waveManaBase + n * e.waveManaPerWave), null, null, "wave");
      this.harvest(n - 1);
    }
    const pool = this.arena.monsters.map((id) => MONSTER_BY_ID[id]).filter(Boolean);
    const pick = () => {
      const weights = pool.map((m) => (m.traits.includes("tank") ? Math.min(1, n / 12) : 1));
      let x = wr() * weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < pool.length; i++) if ((x -= weights[i]) <= 0) return pool[i];
      return pool[0];
    };
    const path = () => (wr() < 0.5 ? 0 : 1);
    if (isBoss) {
      const bosses = this.arena.bosses;
      const boss = BOSS_BY_ID[bosses[(n / e.bossEvery - 1) % bosses.length]];
      if (boss) this.pending.push({ boss, path: path(), hpMult: 1 });
      for (let i = 0; i < 4 + Math.floor(n / e.bossEvery); i++) this.pending.push({ def: pick(), path: path(), hpMult: 1 });
      this.log(`Wave ${n}: boss ${boss?.name}`, "wave");
      if (boss) this.announce(n, boss, this.pending.length);
    } else {
      const count = Math.min(e.waveSizeMax, Math.round(e.waveSizeBase + n * e.waveSizePerWave));
      for (let i = 0; i < count; i++) this.pending.push({ def: pick(), path: path(), hpMult: 1 });
      this.log(`Wave ${n}: ${count} monsters`, "wave");
      this.announce(n, null, count);
    }
    this.spawnGap = Math.max(e.spawnIntervalMin, e.spawnIntervalStart - n * e.spawnIntervalStep);
    this.spawnIn = isBoss ? 1.6 : 0.5;
  }

  private spawnPending(q: Pending) {
    const path = this.paths[q.path % this.paths.length];
    const m = this.spawn(q.boss ? { boss: q.boss } : { def: q.def }, { path, dist: 0 }, 1, q.boss ? 1 : q.hpMult);
    if (q.boss && q.hpMult !== 1) m.hp = m.maxHp = m.maxHp * q.hpMult;
    if (q.sent) {
      m.mana = Math.round(m.mana * PVP.rules.sentManaShare);
      this.leakDamage.set(m.uid, q.sent.leakDamage);
    }
  }

  protected leak(m: SimMonster) {
    m.dead = m.gone = m.leaked = true;
    this.leaks++;
    const r = PVP.rules;
    const dmg = this.leakDamage.get(m.uid) ?? (m.boss ? r.bossLeakDamage : m.has("tank") ? r.tankLeakDamage : r.leakDamage);
    this.leakDamage.delete(m.uid);
    this.hp = Math.max(0, this.hp - dmg);
    this.livesLost += dmg;
    this.emitLeak(m, dmg);
    if (this.hp <= 0) this.finish("lost");
  }

  // ---------------------------------------------------------------- actions

  /** Apply a player action now (between ticks). Returns false when it isn't allowed. */
  apply(a: PvpAction) {
    if (this.over) return false;
    const ok = this.act(a);
    if (ok) this.actions.push({ k: this.ticks, a });
    return ok;
  }

  /** Why an action can't happen right now (for the HUD), or null. */
  sendProblem(id: string) {
    return sendProblem(PVP.sends.find((s) => s.id === id && s.enabled), this.wave, this.stock, this.now, this.mana);
  }

  private act(a: PvpAction): boolean {
    switch (a.t) {
      case "summon":
        return this.summon();
      case "merge":
        return this.merge(a.from, a.to);
      case "copy":
        return this.copy(a.from, a.to);
      case "swap":
        return this.swap(a.from, a.to);
      case "hop":
        return this.hop(a.from, a.to);
      case "power":
        return this.powerUp(a.id);
      case "hero":
        return this.useHero();
      case "autohero":
        return this.setAutoHero(a.on);
      case "send": {
        const s = PVP.sends.find((x) => x.id === a.id && x.enabled);
        if (!s || sendProblem(s, this.wave, this.stock, this.now, this.mana)) return false;
        this.mana -= s.cost;
        this.income += s.income;
        this.stock.use(s, this.now);
        this.counts.sends++;
        return true;
      }
      case "recv": {
        const s = PVP.sends.find((x) => x.id === a.id);
        if (!s) return false;
        this.incoming.push({ at: this.now + PVP.rules.sendDelay, send: s });
        return true;
      }
    }
  }

  // ---------------------------------------------------------------- for the other player's screen

  snap(): BoardSnap {
    const alive = this.monsters.filter((m) => !m.gone).slice(0, 60);
    return {
      t: Math.round(this.now * 10) / 10,
      hp: this.hp,
      wave: this.wave,
      mana: Math.floor(this.mana),
      income: this.income,
      units: this.units.map((u) => (u ? [u.def.id, u.rank] : 0)),
      monsters: alive.map((m) => [m.uid, m.id, Math.max(0, this.paths.indexOf(m.path)), Math.round(m.dist), Math.round((100 * Math.max(0, m.hp)) / m.maxHp) / 100]),
    };
  }
}

/** Rebuild a board from its seed and action log, up to `ticks` steps (for checking a reported result). */
export function replayBoard(o: BoardOptions, actions: LoggedAction[], ticks: number) {
  const b = new PvpBoard(o);
  let i = 0;
  while (!b.over && b.ticks < ticks) {
    while (i < actions.length && actions[i].k <= b.ticks) b.apply(actions[i++].a);
    b.tick();
  }
  return b;
}
