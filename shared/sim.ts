/**
 * Headless battle simulation for the admin Playground.
 *
 * Mirrors the combat rules of game/src/scenes/BattleScene.ts, Unit.ts and Monster.ts
 * (targeting, archetype effects, awakened ultimates, boss powers, hero abilities, wave
 * spawning) without Phaser, using a seeded random source so a run can be repeated.
 * The board is fixed for the whole run: no summoning, merging or buying power-ups.
 * Keep it in step with BattleScene when combat rules change.
 *
 * Reads the live tables (UNITS, EFFECTS, ECONOMY...), so call applyConfig() first to
 * simulate a particular config.
 */
import { ARENAS, ARENA_BY_ID, type ArenaDef } from "./arenas.ts";
import { ECONOMY } from "./economy.ts";
import {
  EFFECTS,
  buffBonus,
  chainJumps,
  critChance,
  critMult,
  curseStep,
  executeChance,
  freezeChance,
  growthMult,
  manaPerPulse,
  pierceTargets,
  slowAmount,
  splashRadius,
  stunChance,
} from "./effects.ts";
import { HERO_BY_ID, type HeroDef } from "./heroes.ts";
import { BOSS_BY_ID, MONSTER_BY_ID, type BossDef, type MonsterDef } from "./monsters.ts";
import { RARITY_ORDER, UNIT_BY_ID, unitStats, type Element, type UnitDef } from "./units.ts";
import { arenaPaths, slotPos, type Path, type Pt } from "./path.ts";
import { PERK, chills, perkMult, withPerk, type Perk } from "./perks.ts";

/** Simulation step in seconds. */
export const SIM_DT = 1 / 30;
/** Seconds a boss spends on its intro clip before walking (BattleScene plays ~1.4s). */
const BOSS_INTRO = 1.4;

export interface BoardUnit {
  id: string;
  rank: number;
  /** Rank 7 with awakened art. The game decides this from the art; here it's a switch. */
  awakened?: boolean;
}

export type Scenario =
  /** Wave `wave` exactly as the game spawns it (boss waves include their boss). */
  | { kind: "wave"; wave: number }
  /** A chosen boss with the HP it would have on `wave`, with or without its escort. */
  | { kind: "boss"; boss: string; wave: number; escort: boolean }
  /** Monsters that stand still on the ring and respawn when killed: pure damage test. */
  | { kind: "dummies"; count: number; wave: number; duration: number; monster?: string }
  /** Waves `from`..`to` back to back, like a real battle with a fixed board. */
  | { kind: "run"; from: number; to: number };

export interface SimSetup {
  arena: string;
  /** 15 tiles, row by row (5 per row). */
  board: (BoardUnit | null)[];
  cardLevel: number;
  powerUp: number;
  hero: string | null;
  /** Hero ready at the start (otherwise ready after 40% of its recharge, as in battle). */
  heroCharged?: boolean;
  /** Seconds the units have already been on the board (growth units). */
  growthStart?: number;
  scenario: Scenario;
  seed: number;
  /** Stop after this many seconds. */
  maxTime?: number;
}

/** Damage source: a board slot (0-14) or the hero. */
export type Source = number | "hero";

export interface SimEvent {
  t: number;
  text: string;
  kind: "boss" | "hero" | "leak" | "kill" | "wave" | "unit";
}

export interface SimSample {
  t: number;
  /** Boss health 0-1, or null with no boss on the field. */
  boss: number | null;
  alive: number;
  /** Total health of every monster on the field. */
  fieldHp: number;
}

export interface SimResult {
  outcome: "cleared" | "lost" | "timeout" | "done";
  time: number;
  /** Highest wave started (run scenario), else the scenario's wave. */
  wave: number;
  wavesCleared: number;
  kills: number;
  leaks: number;
  livesLost: number;
  spawned: number;
  /** null when the scenario had no boss. */
  bossKilled: boolean | null;
  /** Boss health 0-1 when it died or got through; null without a boss. */
  bossHpLeft: number | null;
  bossTime: number | null;
  heroCasts: number;
  heroDamage: number;
  manaGained: number;
  damageBySlot: number[];
  killsBySlot: number[];
  totalDamage: number;
  /** Damage soaked by boss shields (blocked hits). */
  blocked: number;
  dodged: number;
  events: SimEvent[];
  timeline: SimSample[];
}

// ---------------------------------------------------------------- helpers

/** Small fast seeded PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Health of a normal (1x) monster on wave `n` in this arena. */
export function waveBaseHp(arena: ArenaDef, n: number) {
  const e = ECONOMY;
  const idx = Math.max(0, ARENAS.findIndex((a) => a.id === arena.id));
  return e.waveHpBase * Math.pow(e.waveHpGrowth, n - 1) * (1 + idx * e.arenaHpStep);
}

/** Every wave a boss first shows up on: [{arena, wave}] per arena that has it. */
export function bossAppearances(bossId: string) {
  const out: { arena: ArenaDef; wave: number }[] = [];
  for (const a of ARENAS) {
    const i = a.bosses.indexOf(bossId);
    if (i >= 0) out.push({ arena: a, wave: ECONOMY.bossEvery * (i + 1) });
  }
  return out;
}

/** Path length in pixels and where units may start shooting (as in BattleScene). */
export function arenaGeometry(arena: ArenaDef) {
  const paths = arenaPaths(arena);
  return { paths, length: paths[0].length, targetFrom: Math.max(0, arena.ring.top - arena.entryY - 40) };
}

/** Stats of one board unit with the run's card level and power-ups. */
export function boardUnitStats(b: BoardUnit, cardLevel: number, powerUp: number) {
  const def = UNIT_BY_ID[b.id];
  const s = unitStats(def, b.rank, cardLevel, powerUp);
  if (b.awakened) {
    s.damage *= ECONOMY.awakenDamageMult;
    s.speed *= ECONOMY.awakenSpeedMult;
  }
  return s;
}

const DUMMY: MonsterDef = { id: "dummy", name: "Training dummy", race: "construct", hp: 1, speed: 0, traits: [], mana: 0, size: 84 };

// ---------------------------------------------------------------- actors

export class SimUnit {
  readonly def: UnitDef;
  readonly rank: number;
  readonly slot: number;
  readonly awakened: boolean;
  readonly x: number;
  readonly y: number;
  readonly stats: { damage: number; speed: number };
  cooldown: number;
  alive: number;
  haste = 0;
  /** Its own perk plus those from neighbouring buff units. */
  perks: Perk[] = [];
  frozenUntil = 0;
  pulse = 0;
  ult = 0;
  // Viewer: when it last attacked.
  firedAt = -1;

  constructor(b: BoardUnit, slot: number, pos: Pt, cardLevel: number, powerUp: number, cooldown: number, alive: number) {
    this.def = UNIT_BY_ID[b.id];
    this.rank = b.rank;
    this.slot = slot;
    this.awakened = !!b.awakened;
    this.x = pos.x;
    this.y = pos.y;
    this.stats = boardUnitStats(b, cardLevel, powerUp);
    withPerk(this.perks, this.def.perk);
    this.cooldown = cooldown;
    this.alive = alive;
  }
}

export class SimMonster {
  readonly uid: number;
  readonly def: MonsterDef | null;
  readonly boss: BossDef | null;
  readonly id: string;
  readonly path: Path;
  dist: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  size: number;
  mana: number;
  dead = false;
  gone = false;
  leaked = false;
  /** Training dummies stay put. */
  pinned: number | null = null;
  slowPct = 0;
  slowUntil = 0;
  frozenUntil = 0;
  stunUntil = 0;
  hasteUntil = 0;
  shieldUntil = 0;
  curse = 0;
  poison: { dps: number; until: number; src: Source }[] = [];
  burn: { dps: number; until: number; src: Source } = { dps: 0, until: 0, src: 0 };
  powerTimer = 0;
  intro = 0;

  constructor(uid: number, kind: { def?: MonsterDef; boss?: BossDef }, path: Path, hp: number, opts: { dist?: number; scale?: number; mana: number }) {
    this.uid = uid;
    this.def = kind.def ?? null;
    this.boss = kind.boss ?? null;
    this.id = (this.boss ?? this.def)!.id;
    this.path = path;
    this.dist = opts.dist ?? 0;
    this.hp = this.maxHp = hp;
    this.baseSpeed = this.boss ? this.boss.speed : this.def!.speed;
    this.size = (this.boss ? 190 : this.def!.size) * (opts.scale ?? 1);
    this.mana = opts.mana;
  }

  get progress() {
    return this.dist / this.path.length;
  }

  get pos(): Pt {
    const p = this.path.at(this.dist);
    return { x: p.x, y: p.y - this.size * 0.35 };
  }

  /** Where the sprite stands (feet). */
  get foot(): Pt {
    return this.path.at(this.dist);
  }

  has(trait: string) {
    return this.def?.traits.includes(trait as never) ?? false;
  }

  speed(now: number) {
    if (now < this.frozenUntil || now < this.stunUntil) return 0;
    let s = this.baseSpeed;
    if (now < this.slowUntil) s *= 1 - this.slowPct;
    if (now < this.hasteUntil) s *= 1.8;
    return s;
  }
}

export interface SimShot {
  unit: SimUnit;
  damage: number;
  target: SimMonster;
  x: number;
  y: number;
  aim: Pt;
  speed: number;
}

/** Short-lived marks for the Playground's arena view. */
export interface SimFx {
  t: number;
  kind: "hit" | "text" | "zap" | "ring";
  x: number;
  y: number;
  /** zap: other end; ring: radius in x2. */
  x2?: number;
  y2?: number;
  text?: string;
  color: string;
}

const ELEMENT_CSS: Record<Element, string> = {
  fire: "#ff6a2b",
  ice: "#5fd4ff",
  lightning: "#ffd93b",
  nature: "#6bd34a",
  poison: "#b05cff",
  arcane: "#ff7ad9",
};

// ---------------------------------------------------------------- the simulation

export class Sim {
  readonly setup: SimSetup;
  readonly arena: ArenaDef;
  readonly paths: Path[];
  readonly targetFrom: number;
  readonly units: (SimUnit | null)[];
  readonly hero: HeroDef | null;
  readonly maxTime: number;
  private readonly rand: () => number;

  now = 0;
  wave = 0;
  lives: number;
  mana = 0;
  monsters: SimMonster[] = [];
  shots: SimShot[] = [];
  fx: SimFx[] = [];
  boss: SimMonster | null = null;
  over = false;
  outcome: SimResult["outcome"] | null = null;

  private uid = 0;
  private queue: { def?: MonsterDef; boss?: BossDef }[] = [];
  private spawnTimer = 0;
  private spawnInterval = 1;
  private waveTimer = 0;
  private waveState: "intro" | "spawning" | "clearing" = "intro";
  private introTimer = 1.5;
  private healTimer = 0;
  private sampleTimer = 0;
  private heroReadyAt = 0;
  private rageUntil = 0;
  private hasteUntil = 0;
  private stormUntil = 0;
  private stormTimer = 0;
  private trackedBoss: SimMonster | null = null;

  // Results.
  kills = 0;
  leaks = 0;
  livesLost = 0;
  spawned = 0;
  wavesCleared = 0;
  heroCasts = 0;
  heroDamage = 0;
  manaGained = 0;
  blocked = 0;
  dodged = 0;
  bossHpLeft: number | null = null;
  bossKilled: boolean | null = null;
  bossTime: number | null = null;
  damageBySlot = new Array(15).fill(0);
  killsBySlot = new Array(15).fill(0);
  events: SimEvent[] = [];
  timeline: SimSample[] = [];

  constructor(setup: SimSetup) {
    this.setup = setup;
    this.arena = ARENA_BY_ID[setup.arena] ?? ARENAS[0];
    this.rand = rng(setup.seed);
    const geo = arenaGeometry(this.arena);
    this.paths = geo.paths;
    this.targetFrom = geo.targetFrom;
    this.lives = ECONOMY.lives;
    const h = setup.hero ? HERO_BY_ID[setup.hero] : undefined;
    this.hero = h ?? null;
    this.heroReadyAt = this.hero && !setup.heroCharged ? this.hero.cooldown * 0.4 : 0;

    this.units = setup.board.slice(0, 15).map((b, slot) =>
      b && UNIT_BY_ID[b.id]
        ? new SimUnit(b, slot, slotPos(this.arena, slot), setup.cardLevel, setup.powerUp, 0.3 + this.rand() * 0.4, setup.growthStart ?? 0)
        : null,
    );
    while (this.units.length < 15) this.units.push(null);
    this.recomputeBuffs();

    const sc = setup.scenario;
    switch (sc.kind) {
      case "wave":
        this.wave = sc.wave - 1;
        this.startWave();
        this.maxTime = setup.maxTime ?? 300;
        break;
      case "boss":
        this.wave = sc.wave - 1;
        this.startWave(BOSS_BY_ID[sc.boss], sc.escort);
        this.maxTime = setup.maxTime ?? 300;
        break;
      case "dummies":
        this.wave = sc.wave;
        this.waveState = "clearing";
        for (let i = 0; i < sc.count; i++) this.spawnDummy(i);
        this.maxTime = sc.duration;
        break;
      case "run":
        this.wave = sc.from - 1;
        this.introTimer = 1.5;
        this.maxTime = setup.maxTime ?? 3600;
        break;
    }
    this.sample();
  }

  // ---------------------------------------------------------------- setup helpers

  private recomputeBuffs() {
    for (const u of this.units) {
      if (!u) continue;
      u.haste = 0;
      u.perks = [];
      withPerk(u.perks, u.def.perk);
    }
    this.units.forEach((u, i) => {
      if (!u || u.def.arch !== "buff") return;
      const bonus = buffBonus(u.rank, RARITY_ORDER.indexOf(u.def.rarity)) * (u.awakened ? ECONOMY.awakenDamageMult : 1);
      const col = i % 5;
      for (const j of [i - 5, i + 5, col > 0 ? i - 1 : -1, col < 4 ? i + 1 : -1]) {
        const v = this.units[j];
        if (v && v.def.arch !== "buff") {
          v.haste += bonus;
          withPerk(v.perks, u.def.perk);
        }
      }
    });
  }

  private spawnDummy(i: number) {
    const sc = this.setup.scenario as Extract<Scenario, { kind: "dummies" }>;
    const def = (sc.monster && MONSTER_BY_ID[sc.monster]) || DUMMY;
    const path = this.paths[0];
    const dist = path.length * 0.42 + i * 30;
    const m = new SimMonster(++this.uid, { def }, path, waveBaseHp(this.arena, sc.wave) * def.hp, { dist, mana: 0 });
    m.pinned = dist;
    m.baseSpeed = 0;
    this.monsters.push(m);
    this.spawned++;
    return m;
  }

  // ---------------------------------------------------------------- waves

  baseHp(n: number) {
    return waveBaseHp(this.arena, n);
  }

  private startWave(forceBoss?: BossDef, escort = true) {
    this.wave++;
    const n = this.wave;
    const e = ECONOMY;
    const isBoss = !!forceBoss || n % e.bossEvery === 0;
    if (n > 1 && this.setup.scenario.kind === "run") this.gainMana(Math.round(e.waveManaBase + n * e.waveManaPerWave));
    const pool = this.arena.monsters.map((id) => MONSTER_BY_ID[id]).filter(Boolean);
    const pick = () => {
      const weights = pool.map((m) => (m.traits.includes("tank") ? Math.min(1, n / 12) : 1));
      let x = this.rand() * weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < pool.length; i++) if ((x -= weights[i]) <= 0) return pool[i];
      return pool[0];
    };
    this.queue = [];
    if (isBoss) {
      const bosses = this.arena.bosses;
      const boss = forceBoss ?? BOSS_BY_ID[bosses[(n / e.bossEvery - 1) % bosses.length]];
      this.queue.push({ boss });
      if (escort) for (let i = 0; i < 4 + Math.floor(n / e.bossEvery); i++) this.queue.push({ def: pick() });
      this.log(`Wave ${n}: boss ${boss.name}`, "wave");
    } else {
      const count = Math.min(e.waveSizeMax, Math.round(e.waveSizeBase + n * e.waveSizePerWave));
      for (let i = 0; i < count; i++) this.queue.push({ def: pick() });
      this.log(`Wave ${n}: ${count} monsters`, "wave");
    }
    this.spawnInterval = Math.max(e.spawnIntervalMin, e.spawnIntervalStart - n * e.spawnIntervalStep);
    this.spawnTimer = isBoss ? 1.6 : 0.5;
    this.waveTimer = 0;
    this.waveState = "spawning";
  }

  private spawn(q: { def?: MonsterDef; boss?: BossDef }, at?: { path: Path; dist: number }, scale = 1, hpMult = 1) {
    const path = at?.path ?? this.paths[this.rand() < 0.5 ? 0 : 1];
    const n = this.wave;
    this.spawned++;
    if (q.boss) {
      const hp = this.baseHp(n) * ECONOMY.bossHpMult * q.boss.hp;
      const m = new SimMonster(++this.uid, { boss: q.boss }, path, hp, { mana: 150 + n * 15 });
      m.powerTimer = 5;
      m.intro = BOSS_INTRO;
      this.boss = this.trackedBoss = m;
      this.monsters.push(m);
      return m;
    }
    const def = q.def!;
    const hp = this.baseHp(n) * def.hp * hpMult;
    const m = new SimMonster(++this.uid, { def }, path, hp, { dist: at?.dist, scale, mana: def.mana + Math.floor(n / 2) });
    this.monsters.push(m);
    return m;
  }

  private flow(dt: number) {
    const kind = this.setup.scenario.kind;
    if (kind === "dummies") return;
    if (this.waveState === "intro") {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        if (kind === "run" && this.wave >= (this.setup.scenario as Extract<Scenario, { kind: "run" }>).to) return this.finish("cleared");
        this.startWave();
      }
    } else if (this.waveState === "spawning") {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.queue.length) {
        this.spawn(this.queue.shift()!);
        this.spawnTimer = this.spawnInterval;
      }
      if (!this.queue.length) this.waveState = "clearing";
      this.waveTimer += dt;
    } else {
      this.waveTimer += dt;
      const bossAlive = this.boss && !this.boss.gone;
      const alive = this.monsters.some((m) => !m.gone);
      if (kind !== "run") {
        if (!alive) this.finish("cleared");
        return;
      }
      if (!bossAlive && (!alive || this.waveTimer > 20)) {
        if (!alive) this.wavesCleared = this.wave;
        this.waveState = "intro";
        this.introTimer = alive ? 0.5 : 1.5;
      }
    }
  }

  // ---------------------------------------------------------------- loop

  step(dt = SIM_DT) {
    if (this.over) return;
    this.now += dt;
    const now = this.now;
    this.flow(dt);
    if (this.over) return;

    this.healTimer -= dt;
    const healPulse = this.healTimer <= 0;
    if (healPulse) this.healTimer = 3;
    for (const m of this.monsters) {
      if (m.gone) continue;
      this.updateMonster(m, dt);
      if (m.gone) continue;
      if (m.boss && m.intro <= 0) {
        m.powerTimer -= dt;
        if (m.powerTimer <= 0) {
          m.powerTimer = 6;
          this.bossPower(m);
        }
      }
      if (healPulse && m.has("healer")) {
        for (const o of this.nearby(m.pos, 130)) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.08);
        this.mark("ring", m.pos.x, m.pos.y, "#7dff7a", { x2: 130 });
      }
      if (m.dist >= m.path.length) {
        this.leak(m);
        if (this.over) return;
      }
    }
    this.monsters = this.monsters.filter((m) => !m.gone);
    if (this.boss?.gone) this.boss = null;

    for (const u of this.units) if (u) this.updateUnit(u, dt);
    this.updateStorm(dt);
    this.updateShots(dt);
    if (this.hero && now >= this.heroReadyAt) this.castHero();

    this.sampleTimer -= dt;
    if (this.sampleTimer <= 0) {
      this.sampleTimer = 0.25;
      this.sample();
    }
    if (this.fx.length) this.fx = this.fx.filter((f) => now - f.t < 0.8);
    if (now >= this.maxTime) this.finish(this.setup.scenario.kind === "dummies" ? "done" : "timeout");
  }

  /** Run to the end and return the result. */
  run(): SimResult {
    let guard = 0;
    while (!this.over && guard++ < 1e6) this.step();
    return this.result();
  }

  private finish(outcome: SimResult["outcome"]) {
    if (this.over) return;
    this.over = true;
    this.outcome = outcome;
    const b = this.trackedBoss;
    if (b && this.bossKilled === null) {
      this.bossKilled = false;
      this.bossHpLeft = Math.max(0, b.hp / b.maxHp);
    }
    if (outcome === "cleared" && this.setup.scenario.kind !== "run") this.wavesCleared = this.wave;
    this.sample();
  }

  result(): SimResult {
    return {
      outcome: this.outcome ?? "timeout",
      time: this.now,
      wave: this.wave,
      wavesCleared: this.wavesCleared,
      kills: this.kills,
      leaks: this.leaks,
      livesLost: this.livesLost,
      spawned: this.spawned,
      bossKilled: this.bossKilled,
      bossHpLeft: this.bossHpLeft,
      bossTime: this.bossTime,
      heroCasts: this.heroCasts,
      heroDamage: this.heroDamage,
      manaGained: this.manaGained,
      damageBySlot: this.damageBySlot,
      killsBySlot: this.killsBySlot,
      totalDamage: this.damageBySlot.reduce((a, b) => a + b, 0) + this.heroDamage,
      blocked: this.blocked,
      dodged: this.dodged,
      events: this.events,
      timeline: this.timeline,
    };
  }

  private sample() {
    const alive = this.monsters.filter((m) => !m.gone);
    const b = this.trackedBoss;
    this.timeline.push({
      t: this.now,
      boss: b && !b.gone ? Math.max(0, b.hp / b.maxHp) : null,
      alive: alive.length,
      fieldHp: alive.reduce((s, m) => s + Math.max(0, m.hp), 0),
    });
  }

  private log(text: string, kind: SimEvent["kind"]) {
    if (this.events.length < 400) this.events.push({ t: this.now, text, kind });
  }

  private mark(kind: SimFx["kind"], x: number, y: number, color: string, extra: Partial<SimFx> = {}) {
    if (this.fx.length < 300) this.fx.push({ t: this.now, kind, x, y, color, ...extra });
  }

  gainMana(amount: number) {
    this.mana += amount;
    this.manaGained += amount;
  }

  // ---------------------------------------------------------------- monsters

  private updateMonster(m: SimMonster, dt: number) {
    const now = this.now;
    if (m.intro > 0) m.intro -= dt;
    else if (m.pinned !== null) m.dist = m.pinned;
    else m.dist += m.speed(now) * dt;

    m.poison = m.poison.filter((p) => p.until > now);
    for (const p of m.poison) if (!m.dead) this.hurt(m, p.dps * dt, p.src, { sure: true });
    if (m.burn.until > now && !m.dead) this.hurt(m, m.burn.dps * dt, m.burn.src, { sure: true });
  }

  /** Apply damage; returns true if it killed. */
  private hurt(m: SimMonster, amount: number, src: Source, opts: { sure?: boolean; perks?: readonly Perk[] } = {}) {
    if (m.dead) return false;
    if (this.now < m.shieldUntil) {
      this.blocked += amount;
      return false;
    }
    const perks = opts.perks ?? [];
    if (!opts.sure && m.has("dodge") && !perks.includes("true_strike") && this.rand() < 0.15) {
      this.dodged++;
      return false;
    }
    let dmg = amount * (1 + m.curse) * perkMult(perks, m);
    if (m.has("armored") && !perks.includes("armor_breaker")) dmg *= 0.7;
    const dealt = Math.min(Math.max(0, m.hp), dmg);
    if (src === "hero") this.heroDamage += dealt;
    else this.damageBySlot[src] += dealt;
    m.hp -= dmg;
    if (m.hp <= 0) {
      this.kill(m, src);
      if (perks.includes("plunder")) this.gainMana(PERK.plunder);
      return true;
    }
    return false;
  }

  private kill(m: SimMonster, src: Source) {
    if (m.dead) return;
    m.dead = m.gone = true;
    this.kills++;
    if (src !== "hero") this.killsBySlot[src]++;
    this.gainMana(m.mana);
    const p = m.pos;
    if (m.boss) {
      if (m === this.trackedBoss) {
        this.bossKilled = true;
        this.bossHpLeft = 0;
        this.bossTime = this.now;
      }
      this.log(`${m.boss.name} defeated`, "kill");
      this.mark("text", p.x, p.y - 40, "#ffd93b", { text: "BOSS DEFEATED" });
    }
    if (m.pinned !== null) {
      // Training dummies come straight back.
      const sc = this.setup.scenario as Extract<Scenario, { kind: "dummies" }>;
      const i = Math.round((m.pinned - this.paths[0].length * 0.42) / 30);
      if (i >= 0 && i < sc.count) this.spawnDummy(i);
      return;
    }
    if (m.def?.traits.includes("splitter") && m.size > 60) {
      const child = m.def.id === "gelatinous_cube" ? MONSTER_BY_ID.slime_blob : m.def;
      if (child) {
        for (const off of [-18, 18]) {
          const c = this.spawn({ def: child }, { path: m.path, dist: Math.max(0, m.dist + off) }, 0.7, 0.35);
          c.mana = 3;
        }
      }
    }
  }

  private leak(m: SimMonster) {
    m.dead = m.gone = m.leaked = true;
    this.leaks++;
    const lost = Math.min(this.lives, m.boss ? ECONOMY.lives : 1);
    this.lives -= lost;
    this.livesLost += lost;
    if (m.boss && m === this.trackedBoss) {
      this.bossKilled = false;
      this.bossHpLeft = Math.max(0, m.hp / m.maxHp);
      this.bossTime = this.now;
    }
    this.log(`${(m.boss ?? m.def)!.name} got through (${Math.round((100 * m.hp) / m.maxHp)}% health left)`, "leak");
    if (this.lives <= 0) this.finish("lost");
  }

  private bossPower(m: SimMonster) {
    const b = m.boss!;
    const p = m.pos;
    switch (b.power) {
      case "summon": {
        const def = b.minion ? MONSTER_BY_ID[b.minion] : undefined;
        if (!def) break;
        for (let i = 0; i < 3; i++) this.spawn({ def }, { path: m.path, dist: Math.max(0, m.dist - 30 - i * 35) }, 0.9, 0.8);
        this.log(`${b.name} summons 3 ${def.name}`, "boss");
        break;
      }
      case "heal": {
        const before = m.hp;
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.08);
        this.log(`${b.name} heals ${Math.round(((m.hp - before) / m.maxHp) * 100)}%`, "boss");
        this.mark("text", p.x, p.y - 60, "#7dff7a", { text: "HEAL" });
        break;
      }
      case "haste":
        m.hasteUntil = this.now + 3;
        this.log(`${b.name} rages (×1.8 speed for 3s)`, "boss");
        this.mark("text", p.x, p.y - 60, "#ff8a3b", { text: "RAGE" });
        break;
      case "shield":
        m.shieldUntil = this.now + 2.5;
        this.log(`${b.name} shields (2.5s)`, "boss");
        this.mark("text", p.x, p.y - 60, "#9fb4ff", { text: "SHIELD" });
        break;
      case "teleport":
        m.dist = Math.min(m.path.length * 0.92, m.dist + 160);
        this.log(`${b.name} teleports ahead`, "boss");
        this.mark("text", m.pos.x, m.pos.y - 60, "#c58bff", { text: "TELEPORT" });
        break;
      case "freeze_units": {
        const units = this.units.filter((u): u is SimUnit => !!u);
        for (let i = units.length - 1; i > 0; i--) {
          const j = Math.floor(this.rand() * (i + 1));
          [units[i], units[j]] = [units[j], units[i]];
        }
        for (const u of units.slice(0, 3)) u.frozenUntil = this.now + 3;
        this.log(`${b.name} freezes ${Math.min(3, units.length)} units (3s)`, "boss");
        break;
      }
    }
  }

  // ---------------------------------------------------------------- hero

  get heroHaste() {
    return this.hero?.power === "haste" && this.now < this.hasteUntil ? this.hero.amount : 0;
  }

  get heroDamageMult() {
    return this.hero?.power === "rage" && this.now < this.rageUntil ? 1 + this.hero.amount : 1;
  }

  /** Same rules as the game's auto-cast. */
  private castHero() {
    const h = this.hero!;
    const targets = this.monsters.filter((m) => !m.gone && m.intro <= 0);
    if (h.power !== "mana" && !targets.length) return;
    this.heroReadyAt = this.now + h.cooldown;
    this.heroCasts++;
    const now = this.now;
    const hpUnit = this.baseHp(Math.max(1, this.wave));
    switch (h.power) {
      case "meteor":
        for (const m of targets) this.hurt(m, h.amount * hpUnit, "hero", { sure: true });
        break;
      case "storm":
        this.stormUntil = now + h.duration;
        this.stormTimer = 0;
        break;
      case "freeze":
        for (const m of targets) {
          m.frozenUntil = Math.max(m.frozenUntil, now + (m.boss ? h.duration / 3 : h.duration));
          if (h.amount > 0) this.hurt(m, h.amount * hpUnit, "hero", { sure: true });
        }
        break;
      case "slow":
        for (const m of targets) {
          m.slowPct = Math.max(m.slowUntil > now ? m.slowPct : 0, h.amount * (m.boss ? 0.5 : 1));
          m.slowUntil = now + h.duration;
        }
        break;
      case "mana":
        this.gainMana(Math.round(h.amount * (1 + 0.1 * this.wave)));
        break;
      case "haste":
        this.hasteUntil = now + h.duration;
        break;
      case "rage":
        this.rageUntil = now + h.duration;
        break;
      case "knockback":
        for (const m of targets) {
          if (m.pinned === null) m.dist = Math.max(0, m.dist - (m.boss ? h.amount / 3 : h.amount));
          m.stunUntil = Math.max(m.stunUntil, now + h.duration);
        }
        break;
    }
    this.log(`Hero: ${h.ability}`, "hero");
    this.mark("text", 375, 640, "#ffd93b", { text: h.ability.toUpperCase() });
  }

  private updateStorm(dt: number) {
    if (this.hero?.power !== "storm" || this.now >= this.stormUntil) return;
    this.stormTimer -= dt;
    if (this.stormTimer > 0) return;
    this.stormTimer += 0.25;
    const targets = this.monsters.filter((m) => !m.gone && m.intro <= 0);
    if (!targets.length) return;
    const m = targets[Math.floor(this.rand() * targets.length)];
    this.mark("zap", m.pos.x, m.pos.y - 320, "#d9a3ff", { x2: m.pos.x, y2: m.pos.y });
    this.hurt(m, this.hero.amount * this.baseHp(Math.max(1, this.wave)), "hero", { sure: true });
  }

  // ---------------------------------------------------------------- units

  pickTarget(mode: "first" | "strongest"): SimMonster | null {
    let best: SimMonster | null = null;
    for (const m of this.monsters) {
      if (m.gone || m.intro > 0 || m.dist < this.targetFrom) continue;
      if (!best) best = m;
      else if (mode === "first" ? m.progress > best.progress : m.hp > best.hp) best = m;
    }
    return best;
  }

  private updateUnit(u: SimUnit, dt: number) {
    const now = this.now;
    if (now < u.frozenUntil) return;
    u.alive += dt;
    if (u.def.arch === "buff") return;
    if (u.def.arch === "mana") {
      u.pulse += dt;
      if (u.pulse >= EFFECTS.mana.every) {
        u.pulse = 0;
        this.gainMana(manaPerPulse(u.rank));
      }
    }
    if (u.awakened) {
      u.ult += dt;
      if (u.ult >= ECONOMY.ultimateCooldown) {
        const target = u.def.arch === "mana" ? null : this.pickTarget(u.def.arch === "sniper" ? "strongest" : "first");
        if (target || u.def.arch === "mana") {
          u.ult = 0;
          this.ultimate(u, target);
          u.cooldown = Math.max(u.cooldown, 0.5);
          return;
        }
      }
    }
    const rate = u.stats.speed * (1 + u.haste + this.heroHaste);
    u.cooldown -= dt;
    if (u.cooldown > 0) return;
    const target = this.pickTarget(u.def.arch === "sniper" ? "strongest" : "first");
    if (!target) return;
    u.cooldown = 1 / rate;
    u.firedAt = now;
    this.fire(u, target);
  }

  private ultimate(u: SimUnit, target: SimMonster | null) {
    if (u.def.arch === "mana" || !target) {
      this.gainMana(Math.round(EFFECTS.mana.ultimateBase + EFFECTS.mana.ultimatePerWave * this.wave));
      return;
    }
    const center = target.pos;
    const damage = u.stats.damage * this.heroDamageMult * ECONOMY.ultimateDamageMult;
    this.mark("ring", center.x, center.y, "#ffd93b", { x2: ECONOMY.ultimateRadius });
    this.mark("text", center.x, center.y - 70, "#ffd93b", { text: "ULTIMATE" });
    for (const m of this.nearby(center, ECONOMY.ultimateRadius)) this.applyHit(u, damage, m);
  }

  private fire(u: SimUnit, target: SimMonster) {
    let damage = u.stats.damage * this.heroDamageMult;
    if (u.def.arch === "growth") damage *= growthMult(u.alive);
    const from = { x: u.x, y: u.y - 30 };
    if (u.def.arch === "chain") return this.chainLightning(u, target, damage, from);
    this.shots.push({ unit: u, damage, target, x: from.x, y: from.y, aim: target.pos, speed: u.def.arch === "sniper" ? EFFECTS.sniper.shotSpeed : 1100 });
  }

  private chainLightning(u: SimUnit, first: SimMonster, damage: number, from: Pt) {
    const jumps = chainJumps(u.rank, RARITY_ORDER.indexOf(u.def.rarity));
    const hit: SimMonster[] = [first];
    let cur = first;
    while (hit.length < jumps) {
      let next: SimMonster | null = null;
      let bestD = EFFECTS.chain.range;
      for (const m of this.monsters) {
        if (m.gone || hit.includes(m)) continue;
        const d = Math.hypot(m.pos.x - cur.pos.x, m.pos.y - cur.pos.y);
        if (d < bestD) {
          bestD = d;
          next = m;
        }
      }
      if (!next) break;
      hit.push(next);
      cur = next;
    }
    let p = from;
    for (const m of hit) {
      this.mark("zap", p.x, p.y, u.def.element === "lightning" ? "#fff27a" : "#9ff0ff", { x2: m.pos.x, y2: m.pos.y });
      p = m.pos;
    }
    hit.forEach((m, i) => this.hurt(m, damage * Math.pow(EFFECTS.chain.falloff, i), u.slot, { perks: u.perks }));
  }

  private updateShots(dt: number) {
    for (const s of this.shots) {
      if (!s.target.gone) s.aim = s.target.pos;
      const dx = s.aim.x - s.x;
      const dy = s.aim.y - s.y;
      const d = Math.hypot(dx, dy);
      const step = s.speed * dt;
      if (d <= step + 4) {
        s.speed = -1;
        if (!s.target.gone) this.applyHit(s.unit, s.damage, s.target);
      } else {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
      }
    }
    this.shots = this.shots.filter((s) => s.speed >= 0);
  }

  private nearby(center: Pt, radius: number, except?: SimMonster) {
    return this.monsters.filter((m) => !m.gone && m !== except && Math.hypot(m.pos.x - center.x, m.pos.y - center.y) <= radius);
  }

  private applyHit(u: SimUnit, damage: number, m: SimMonster) {
    const def = u.def;
    const rank = u.rank;
    const src = u.slot;
    const e = EFFECTS;
    const now = this.now;
    const rarityIdx = RARITY_ORDER.indexOf(def.rarity);
    const pos = m.pos;
    const isBoss = !!m.boss;
    const P = { perks: u.perks };
    const chilled = chills(u.perks, m);
    this.mark("hit", pos.x, pos.y, ELEMENT_CSS[def.element]);

    switch (def.arch) {
      case "splash":
      case "burn": {
        const splash = this.nearby(pos, splashRadius(def.arch, rank), m);
        const burnDps = def.arch === "burn" ? damage * e.burn.burnDps : 0;
        this.hurt(m, damage, src, P);
        for (const o of splash) this.hurt(o, damage * e[def.arch].splash, src, { ...P, sure: true });
        if (burnDps) {
          for (const o of [m, ...splash]) {
            const keep = o.burn.until > now && o.burn.dps > burnDps;
            o.burn = keep ? { ...o.burn, until: now + e.burn.burnTime } : { dps: burnDps, until: now + e.burn.burnTime, src };
          }
        }
        this.mark("ring", pos.x, pos.y, ELEMENT_CSS[def.element], { x2: splashRadius(def.arch, rank) });
        break;
      }
      case "pierce": {
        this.hurt(m, damage, src, P);
        const behind = this.nearby(pos, e.pierce.range, m)
          .sort((a, b) => Math.hypot(a.pos.x - pos.x, a.pos.y - pos.y) - Math.hypot(b.pos.x - pos.x, b.pos.y - pos.y))
          .slice(0, pierceTargets(rank));
        for (const o of behind) this.hurt(o, damage * e.pierce.damage, src, { ...P, sure: true });
        break;
      }
      case "slow":
        this.hurt(m, damage, src, P);
        if (chilled || def.element !== "ice") {
          m.slowPct = Math.max(m.slowUntil > now ? m.slowPct : 0, slowAmount(rank, rarityIdx, isBoss));
          m.slowUntil = now + e.slow.duration;
        }
        break;
      case "freeze":
        this.hurt(m, damage, src, P);
        if (chilled && this.rand() < freezeChance(rank, rarityIdx)) {
          m.frozenUntil = now + (isBoss ? e.freeze.bossDuration : e.freeze.duration);
          this.mark("text", pos.x, pos.y - 30, "#7fd8ff", { text: "FROZEN" });
        }
        break;
      case "stun":
        this.hurt(m, damage, src, P);
        if (this.rand() < stunChance(rank, rarityIdx)) {
          m.stunUntil = now + (isBoss ? e.stun.bossDuration : e.stun.duration);
          this.mark("text", pos.x, pos.y - 30, "#ffd93b", { text: "STUN" });
        }
        break;
      case "poison":
        this.hurt(m, damage, src, P);
        m.poison.push({ dps: damage * e.poison.dps, until: now + e.poison.duration, src });
        while (m.poison.length > e.poison.maxStacks) m.poison.shift();
        break;
      case "crit": {
        const crit = this.rand() < critChance(rank);
        this.hurt(m, crit ? damage * critMult(rank) : damage, src, P);
        if (crit) this.mark("text", pos.x, pos.y - 30, "#ffd93b", { text: "CRIT" });
        break;
      }
      case "curse":
        this.hurt(m, damage, src, P);
        m.curse = Math.min(e.curse.max, m.curse + curseStep(rank, rarityIdx));
        break;
      case "execute":
        if (this.rand() < executeChance(rank, rarityIdx)) {
          if (isBoss) this.hurt(m, damage * e.execute.bossMult, src, P);
          else {
            this.mark("text", pos.x, pos.y - 30, "#ff7ad9", { text: "EXECUTE" });
            this.hurt(m, m.hp / (1 + m.curse) / (m.has("armored") ? 0.7 : 1) + 1, src, { ...P, sure: true });
          }
        } else this.hurt(m, damage, src, P);
        break;
      default:
        this.hurt(m, damage, src, P);
    }
  }
}

/** Run one setup to the end. */
export function simulate(setup: SimSetup): SimResult {
  return new Sim(setup).run();
}

export interface SimSummary {
  runs: number;
  /** Share of runs that cleared without running out of lives. */
  clearRate: number;
  /** Share of runs with no leaks at all. */
  perfectRate: number;
  avgTime: number;
  avgLeaks: number;
  avgLivesLost: number;
  avgKills: number;
  avgWave: number;
  avgWavesCleared: number;
  /** null without a boss. */
  bossKillRate: number | null;
  avgBossTime: number | null;
  avgBossHpLeft: number | null;
  avgHeroDamage: number;
  avgHeroCasts: number;
  avgMana: number;
  avgDamage: number;
  avgBlocked: number;
  damageBySlot: number[];
  killsBySlot: number[];
  results: SimResult[];
}

/** Run a setup with seeds seed, seed+1, ... and average the results. */
export function simulateMany(setup: SimSetup, runs: number): SimSummary {
  const results: SimResult[] = [];
  for (let i = 0; i < runs; i++) results.push(simulate({ ...setup, seed: setup.seed + i }));
  const avg = (f: (r: SimResult) => number) => results.reduce((s, r) => s + f(r), 0) / Math.max(1, results.length);
  const withBoss = results.filter((r) => r.bossKilled !== null);
  const bossKills = withBoss.filter((r) => r.bossKilled);
  return {
    runs,
    clearRate: avg((r) => (r.outcome === "cleared" || r.outcome === "done" ? 1 : 0)),
    perfectRate: avg((r) => (r.leaks === 0 && r.outcome !== "lost" && r.outcome !== "timeout" ? 1 : 0)),
    avgTime: avg((r) => r.time),
    avgLeaks: avg((r) => r.leaks),
    avgLivesLost: avg((r) => r.livesLost),
    avgKills: avg((r) => r.kills),
    avgWave: avg((r) => r.wave),
    avgWavesCleared: avg((r) => r.wavesCleared),
    bossKillRate: withBoss.length ? bossKills.length / withBoss.length : null,
    avgBossTime: bossKills.length ? bossKills.reduce((s, r) => s + (r.bossTime ?? 0), 0) / bossKills.length : null,
    avgBossHpLeft: withBoss.length ? withBoss.reduce((s, r) => s + (r.bossHpLeft ?? 0), 0) / withBoss.length : null,
    avgHeroDamage: avg((r) => r.heroDamage),
    avgHeroCasts: avg((r) => r.heroCasts),
    avgMana: avg((r) => r.manaGained),
    avgDamage: avg((r) => r.totalDamage),
    avgBlocked: avg((r) => r.blocked),
    damageBySlot: Array.from({ length: 15 }, (_, i) => avg((r) => r.damageBySlot[i])),
    killsBySlot: Array.from({ length: 15 }, (_, i) => avg((r) => r.killsBySlot[i])),
    results,
  };
}
