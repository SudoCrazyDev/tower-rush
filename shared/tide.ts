/**
 * v2.2 Story 2 ("The Drowned Coast") board rules: tide cycle, tide pools, rolling isle, anchor hook,
 * siren song, lantern beam, reveal stun. Rules only: the scene draws them from SimEvents.
 * Everything is inert for a chapter without the matching mechanics or boss skills, and nothing here
 * calls the Sim's random numbers unless a rule actually fires.
 */
import type { BossSkill } from "./monsters.ts";
import type { Pt } from "./path.ts";
import type { ChapterMechanics, StoryChapter, StoryObjectives } from "./stories.ts";
import type { SimEvent, SimMonster, SimUnit } from "./sim.ts";

/** What the rules need from the Sim (kept narrow so sim.ts stays in charge of its own state). */
export interface RulesHost {
  now(): number;
  units(): (SimUnit | null)[];
  monsters(): SimMonster[];
  boss(): SimMonster | null;
  wave(): number;
  rand(): number;
  emit(e: SimEvent): void;
  slotPos(slot: number): Pt;
  /** Awake, draggable units in random order (the Sim's someUnits). */
  someUnits(n: number): SimUnit[];
  /** Aegis Knight next to the unit: immune to debuffs. */
  shielded(u: SimUnit): boolean;
  /** Move `u` to the empty slot `to`, keeping its uid. */
  relocate(u: SimUnit, to: number): void;
}

/** Numbers chosen for the rules (README section 4). */
export const TIDE_RULES = {
  /** siren_song default asleep time when the skill has no `dur`. */
  sleepDur: 8,
  /** lantern_beam defaults: sweep time, glimmer damage multiplier, glimmer hold, beam width (px). */
  beamDur: 6,
  beamAmount: 0.6,
  beamHold: 4,
  beamWidth: 110,
  /** The beam sweeps +-this many radians around the lighthouse's facing. */
  beamSweep: 0.9,
  /** thrash default time when the skill has no `dur`. */
  isleDur: 6,
};

interface Beam {
  x: number;
  y: number;
  a0: number;
  a1: number;
  t0: number;
  dur: number;
  width: number;
  hold: number;
  amount: number;
}

export class BoardRules {
  private readonly h: RulesHost;
  private readonly mech: ChapterMechanics | undefined;
  private readonly story: StoryChapter | null;
  /** Objectives block the Sim hands out in its result (null for chapters without mechanics). */
  readonly obj: StoryObjectives | null;

  private tideStarted = false;
  high = false;
  /** Time of the next tide flip (Infinity without a tide). */
  next = Infinity;
  private drained: boolean[] = [];
  /** Monsters that already sipped from each pool (by uid). */
  private sipped: Set<number>[] = [];
  private sleepers = new Set<number>();
  private beams: Beam[] = [];
  private isleUntil = 0;
  private revealed = new Set<number>();
  /** The last speed multiplier handed to monsters (1 = none). */
  private lastMult = 1;

  constructor(story: StoryChapter | null, host: RulesHost) {
    this.story = story;
    this.mech = story?.mechanics;
    this.h = host;
    this.obj = this.mech ? { poolsLeft: this.mech.tidePools?.at.length ?? 0, civiliansSaved: 0, civiliansHit: 0, cageOpen: false } : null;
    this.drained = (this.mech?.tidePools?.at ?? []).map(() => false);
    this.sipped = (this.mech?.tidePools?.at ?? []).map(() => new Set<number>());
  }

  get isleOn() {
    return this.h.now() < this.isleUntil;
  }

  /** Called once per sim step, before monsters move. */
  tick() {
    const now = this.h.now();
    const tide = this.mech?.tide;
    if (tide) this.tickTide(now, tide);
    const pools = this.mech?.tidePools;
    if (pools) this.tickPools(now, pools.at, pools.sips ?? 1);
    if (this.isleUntil && now >= this.isleUntil) {
      this.isleUntil = 0;
      this.h.emit({ type: "isle", t: now, on: false, dur: 0 });
    }
    this.tickSpeed(now, tide);
    if (this.sleepers.size) this.tickSleep(now);
    if (this.beams.length) this.tickBeams(now);
    if (this.story) this.tickReveal(now);
  }

  // ------------------------------------------------------------------ tide

  private tickTide(now: number, tide: NonNullable<ChapterMechanics["tide"]>) {
    const half = tide.cycle / 2;
    if (!this.tideStarted) {
      this.tideStarted = true;
      this.high = false;
      this.next = now + half;
      this.h.emit({ type: "tide", t: now, high: false, slots: tide.lowSlots, next: this.next });
    } else if (now >= this.next) {
      this.high = !this.high;
      this.next += half;
      this.h.emit({ type: "tide", t: now, high: this.high, slots: tide.lowSlots, next: this.next });
    }
    // Submerged = a board rule: set while high on a low slot, cleared when low or the unit moved off.
    for (const u of this.h.units()) {
      if (!u) continue;
      const under = this.high && tide.lowSlots.includes(u.slot);
      if (under) u.status.submergedUntil = 1e9;
      else if (u.status.submergedUntil) u.status.submergedUntil = 0;
    }
  }

  private tickSpeed(now: number, tide: ChapterMechanics["tide"]) {
    let mult = 1;
    if (tide) mult *= this.high ? tide.highSpeed : tide.lowSpeed;
    if (now < this.isleUntil) mult *= this.isleAmount;
    if (mult === 1 && this.lastMult === 1) return;
    this.lastMult = mult;
    for (const m of this.h.monsters()) if (m.envMult !== mult) m.envMult = mult;
  }

  // ----------------------------------------------------------------- pools

  private tickPools(now: number, at: number[], sips: number) {
    for (let i = 0; i < at.length; i++) {
      if (this.drained[i]) continue;
      for (const m of this.h.monsters()) {
        if (m.gone || m.dead || m.progress < at[i] || this.sipped[i].has(m.uid)) continue;
        this.sipped[i].add(m.uid);
        if (!m.boss && this.sipped[i].size < sips) continue;
        this.drained[i] = true;
        this.obj!.poolsLeft--;
        const p = m.path.at(m.path.length * at[i]);
        this.h.emit({ type: "pool", t: now, index: i, uid: m.uid, x: p.x, y: p.y });
        break;
      }
    }
  }

  // ----------------------------------------------------------- boss skills

  /** anchor_hook: `n` random units jump to random free slots (uid kept, like a swap). */
  hook(n: number) {
    const now = this.h.now();
    for (const u of this.h.someUnits(n)) {
      const units = this.h.units();
      const free: number[] = [];
      for (let j = 0; j < units.length; j++) if (!units[j]) free.push(j);
      if (!free.length) break;
      const to = free[Math.floor(this.h.rand() * free.length)];
      const from = u.slot;
      this.h.relocate(u, to);
      this.h.emit({ type: "hooked", t: now, uid: u.uid, from, to, x: u.x, y: u.y });
    }
  }

  /** siren_song: `n` random awake units sleep until tapped (`wake`) or `dur` seconds. */
  siren(n: number, dur: number) {
    const now = this.h.now();
    let left = n;
    for (const u of this.h.someUnits(99)) {
      if (left <= 0) break;
      if (now < u.status.asleepUntil || this.h.shielded(u)) continue;
      left--;
      u.status.asleepUntil = now + dur;
      this.sleepers.add(u.uid);
      this.h.emit({ type: "sleep", t: now, uid: u.uid, slot: u.slot, asleep: true, tapped: false });
    }
  }

  /** The player tapped a sleeping unit. */
  wake(slot: number) {
    const now = this.h.now();
    const u = this.h.units()[slot];
    if (!u || now >= u.status.asleepUntil) return false;
    u.status.asleepUntil = 0;
    this.sleepers.delete(u.uid);
    this.h.emit({ type: "sleep", t: now, uid: u.uid, slot: u.slot, asleep: false, tapped: true });
    return true;
  }

  private tickSleep(now: number) {
    const units = this.h.units();
    for (const uid of [...this.sleepers]) {
      const u = units.find((v) => v?.uid === uid);
      if (u && now < u.status.asleepUntil) continue;
      this.sleepers.delete(uid);
      // Timer ran out, an Aegis cleared it, or the unit is gone: the scene drops the sleep mark.
      this.h.emit({ type: "sleep", t: now, uid, slot: u?.slot ?? -1, asleep: false, tapped: false });
    }
  }

  /**
   * lantern_beam: a lighthouse stands just outside the board edge (left or right, at random) at
   * mid height, not on the boss. The beam sweeps +-beamSweep rad across the board over `dur` s.
   */
  beam(m: SimMonster, k: BossSkill) {
    const now = this.h.now();
    const R = TIDE_RULES;
    const slots = Array.from({ length: 15 }, (_, i) => this.h.slotPos(i));
    const minX = Math.min(...slots.map((p) => p.x));
    const maxX = Math.max(...slots.map((p) => p.x));
    const cy = (Math.min(...slots.map((p) => p.y)) + Math.max(...slots.map((p) => p.y))) / 2;
    const left = this.h.rand() < 0.5;
    const x = left ? minX - 90 : maxX + 90;
    const face = left ? 0 : Math.PI;
    const dur = k.dur ?? R.beamDur;
    const b: Beam = {
      x,
      y: cy,
      a0: face - R.beamSweep,
      a1: face + R.beamSweep,
      t0: now,
      dur,
      width: R.beamWidth,
      hold: k.hold ?? R.beamHold,
      amount: k.amount ?? R.beamAmount,
    };
    this.beams.push(b);
    this.h.emit({ type: "beam", t: now, uid: m.uid, x: b.x, y: b.y, a0: b.a0, a1: b.a1, dur, width: b.width });
  }

  private tickBeams(now: number) {
    const units = this.h.units();
    for (const b of this.beams) {
      const a = b.a0 + (b.a1 - b.a0) * Math.min(1, (now - b.t0) / b.dur);
      const c = Math.cos(a);
      const s = Math.sin(a);
      for (const u of units) {
        if (!u || u.dragging) continue;
        const dx = u.x - b.x;
        const dy = u.y - b.y;
        if (dx * c + dy * s <= 0 || Math.abs(dx * s - dy * c) > b.width / 2) continue;
        if (this.h.shielded(u)) continue;
        u.status.glimmeredUntil = now + b.hold;
        u.status.glimmer = b.amount;
      }
    }
    this.beams = this.beams.filter((b) => now < b.t0 + b.dur);
  }

  // ----------------------------------------------------------------- isle

  private isleAmount = 1;

  /** thrash: monsters move at x `amount` for `dur` seconds; the scene shifts the path. */
  thrash(dur: number, amount: number) {
    const now = this.h.now();
    this.isleUntil = Math.max(this.isleUntil, now + dur);
    this.isleAmount = amount;
    this.h.emit({ type: "isle", t: now, on: true, dur });
  }

  // --------------------------------------------------------------- reveal

  private tickReveal(now: number) {
    const w = this.h.wave();
    const r = this.story!.waves[w - 1]?.reveal;
    if (!r || this.revealed.has(w)) return;
    const b = this.h.boss();
    if (!b || b.gone || b.dead || b.hp / b.maxHp > r.at) return;
    this.revealed.add(w);
    b.stunUntil = Math.max(b.stunUntil, now + r.stun);
    this.h.emit({ type: "reveal", t: now, uid: b.uid, stun: r.stun });
  }
}
