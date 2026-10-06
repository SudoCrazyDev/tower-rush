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
  auraBonus,
  wagesFor,
  buffBonus,
  chainJumps,
  critChance,
  critMult,
  curseStep,
  executeChance,
  freezeChance,
  growthMult,
  manaPerPulse,
  lanternMana,
  pierceTargets,
  slowAmount,
  splashRadius,
  stunChance,
} from "./effects.ts";
import { HERO_BY_ID, type HeroDef } from "./heroes.ts";
import { BOSS_BY_ID, MONSTER_BY_ID, SPLITS_INTO, SPLIT_COUNT, type BossDef, type BossPower, type MonsterDef } from "./monsters.ts";
import { UNIT_BY_ID, boostMult, rarityIndex, unitStats, type Element, type UnitDef } from "./units.ts";
import { clearDebuffs, isKnight, isMercenary, newStatus, square3 } from "./statuses.ts";
import { arenaPaths, slotPos, type Path, type Pt } from "./path.ts";
import { PERK, chills, perkMult, withPerk, type Perk } from "./perks.ts";
import {
  brewMana,
  canBecome,
  echoStrength,
  harvestMana,
  heraldBonus,
  isSupport,
  mirrorInterval,
  neighbours,
  noAttack,
  owlCharge,
  owlSpeed,
} from "./support.ts";

/** Simulation step in seconds. */
export const SIM_DT = 1 / 30;
/** Seconds a boss spends on its intro clip before walking (BattleScene plays ~1.4s). */
const BOSS_INTRO = 1.4;

export interface BoardUnit {
  id: string;
  rank: number;
  /** Max rank with awakened art. The game decides this from the art; here it's a switch. */
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
  /** Slot and position change when a Portal Imp swaps or hops. */
  slot: number;
  readonly awakened: boolean;
  x: number;
  y: number;
  readonly stats: { damage: number; speed: number };
  cooldown: number;
  alive: number;
  haste = 0;
  /** Its own perk plus those from neighbouring buff units. */
  perks: Perk[] = [];
  frozenUntil = 0;
  pulse = 0;
  ult = 0;
  /** Extra ultimate charge rate from neighbouring Hourglass Owls (0.5 = +50%). */
  charge = 0;
  /** Support timer: Mime prep and Mirror Slime progress count up, Portal Imp recharge counts down. */
  timer = 0;
  /** Portal rush: attacks faster until then. */
  rushUntil = 0;
  /** v1.2 statuses (Rally, Irritation, Fatigue, Shellshock) and Muse's aura. */
  status = newStatus();
  auraSpeed = 0;
  auraDamage = 0;
  /** Hired Blade not paid this wave: no attacks. */
  sulking = false;
  effectTimer = 0;
  // Viewer: when it last attacked.
  firedAt = -1;

  constructor(b: BoardUnit, slot: number, pos: Pt, cardLevel: number, powerUp: number, cooldown: number, alive: number) {
    this.def = UNIT_BY_ID[b.id];
    this.rank = b.rank;
    this.slot = slot;
    this.awakened = !!b.awakened && !isSupport(this.def.arch);
    this.x = pos.x;
    this.y = pos.y;
    this.stats = boardUnitStats(b, cardLevel, powerUp);
    withPerk(this.perks, this.def.perk);
    this.cooldown = cooldown;
    this.alive = alive;
  }

  moveTo(slot: number, pos: Pt) {
    this.slot = slot;
    this.x = pos.x;
    this.y = pos.y;
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

  /** HP stages passed by split, layers and portal bosses; the Bear's roar; a shed layer's speed-up. */
  stage = 0;
  roared = false;
  speedMult = 1;

  has(trait: string) {
    return (this.def?.traits ?? this.boss?.traits ?? []).includes(trait as never);
  }

  speed(now: number) {
    if (now < this.frozenUntil || now < this.stunUntil) return 0;
    let s = this.baseSpeed * this.speedMult;
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
  /** A big hit (crit, execute): the slot of the unit that landed it, and the label to pop over it. */
  slot?: number;
  callout?: string;
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
  protected readonly rand: () => number;

  now = 0;
  wave = 0;
  lives: number;
  mana = 0;
  monsters: SimMonster[] = [];
  shots: SimShot[] = [];
  fx: SimFx[] = [];
  boss: SimMonster | null = null;
  over = false;
  /** Cast the hero by itself whenever it is ready (PvP lets the player switch this off). */
  autoHero = true;
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
  protected heroReadyAt = 0;
  private rageUntil = 0;
  private hasteUntil = 0;
  private stormUntil = 0;
  private stormTimer = 0;
  private trackedBoss: SimMonster | null = null;
  /** Banner Herald: damage multiplier for every attacking unit. */
  heraldMult = 1;
  /** Banner Herald war cry: everyone attacks faster until then. */
  shoutUntil = 0;
  /** Echo Spirit encores waiting to go off. */
  private echoes: { at: number; unit: SimUnit; x: number; y: number; damage: number; mana: number }[] = [];

  // Results.
  kills = 0;
  leaks = 0;
  livesLost = 0;
  spawned = 0;
  wavesCleared = 0;
  heroCasts = 0;
  heroDamage = 0;
  manaGained = 0;
  /** Mana from Gnome Brewers (brews and harvests). */
  brewed = 0;
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

  /** Card level of a unit on this board (the Playground uses one level for every card). */
  protected levelOf(_id: string) {
    return this.setup.cardLevel;
  }

  /** In-battle power-ups bought for a unit. */
  protected powerOf(_id: string) {
    return this.setup.powerUp;
  }

  /** Card level × power-up multiplier of a unit's effect (support units never awaken). */
  protected supportMult(u: SimUnit) {
    return boostMult(this.levelOf(u.def.id), this.powerOf(u.def.id));
  }

  /** Mana multiplier for the Gnome Brewer (PvP pays less). */
  protected brewMult() {
    return 1;
  }

  /** Buff units, Hourglass Owls and the Banner Herald: recomputed whenever the board changes. */
  protected recomputeBuffs() {
    for (const u of this.units) {
      if (!u) continue;
      u.haste = 0;
      u.charge = 0;
      u.auraSpeed = 0;
      u.auraDamage = 0;
      u.perks = [];
      withPerk(u.perks, u.def.perk);
    }
    // Princess Muse's Last Call (the 3×3 square, best one counts) and the Aegis Knight's cleanse.
    this.units.forEach((u, i) => {
      if (u?.def.arch === "aegis") for (const j of neighbours(i)) if (this.units[j]) clearDebuffs(this.units[j]!.status);
      if (u?.def.arch !== "aura") return;
      const b = auraBonus(u.rank, this.supportMult(u));
      for (const j of square3(i)) {
        const v = this.units[j];
        if (!v || noAttack(v.def.arch)) continue;
        v.auraSpeed = Math.max(v.auraSpeed, b.speed);
        v.auraDamage = Math.max(v.auraDamage, b.damage);
      }
    });
    let herald: SimUnit | null = null;
    this.units.forEach((u, i) => {
      if (!u) return;
      if (u.def.arch === "herald" && (!herald || u.rank > herald.rank)) herald = u;
      if (u.def.arch === "hourglass") {
        const mult = this.supportMult(u);
        for (const j of neighbours(i)) {
          const v = this.units[j];
          if (!v || v.def.arch === "buff" || isSupport(v.def.arch)) continue;
          if (v.awakened) v.charge += owlCharge(u.rank, mult);
          else v.haste += owlSpeed(u.rank, mult);
        }
        return;
      }
      if (u.def.arch !== "buff") return;
      const mult = boostMult(this.levelOf(u.def.id), this.powerOf(u.def.id)) * (u.awakened ? ECONOMY.awakenDamageMult : 1);
      const bonus = buffBonus(u.rank, rarityIndex(u.def.rarity), mult);
      for (const j of neighbours(i)) {
        const v = this.units[j];
        if (v && v.def.arch !== "buff") {
          // Support units get the haste (it shortens their timers) but not the perk: they never hit.
          v.haste += bonus;
          if (!isSupport(v.def.arch)) withPerk(v.perks, u.def.perk);
        }
      }
    });
    const h = herald as SimUnit | null;
    const awake = this.units.filter((u) => u?.awakened).length;
    this.heraldMult = h ? 1 + heraldBonus(h.rank, awake, this.supportMult(h)) : 1;
  }

  /** A unit awakened: the Banner Herald's war cry. */
  protected onAwaken() {
    if (this.units.some((u) => u?.def.arch === "herald")) {
      this.shoutUntil = this.now + EFFECTS.herald.shoutTime;
      this.log("Banner Herald: war cry", "unit");
    }
  }

  /** Swap a unit onto another tile (a Mime copy, a Mirror Slime turning): same slot, new unit. */
  protected become(u: SimUnit, id: string, rank: number) {
    const v = new SimUnit({ id, rank }, u.slot, { x: u.x, y: u.y }, this.levelOf(id), this.powerOf(id), 0.3 + this.rand() * 0.4, 0);
    this.units[u.slot] = v;
    this.recomputeBuffs();
    return v;
  }

  /** Gnome Brewers pay their harvest when wave `ended` is over. */
  protected harvest(ended: number) {
    for (const u of this.units) {
      if (u?.def.arch !== "brewer") continue;
      const m = harvestMana(u.rank, ended, this.supportMult(u) * this.brewMult());
      this.gainMana(m);
      this.brewed += m;
      this.mark("text", u.x, u.y - 60, "#7fd8ff", { text: `+${m}` });
    }
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
    if (n > 1 && this.setup.scenario.kind === "run") {
      this.gainMana(Math.round(e.waveManaBase + n * e.waveManaPerWave));
      this.harvest(n - 1);
    }
    // Hired Blades take their wages; one that can't be paid sulks for the wave.
    for (const u of this.units) {
      if (u?.def.effect !== "wages") continue;
      const cost = wagesFor(u.rank);
      u.sulking = this.mana < cost;
      if (!u.sulking) this.mana -= cost;
    }
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

  protected spawn(q: { def?: MonsterDef; boss?: BossDef }, at?: { path: Path; dist: number }, scale = 1, hpMult = 1) {
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

  protected flow(dt: number) {
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
        this.bossStages(m);
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
    if (this.echoes.length) this.updateEchoes();
    this.updateStorm(dt);
    this.updateShots(dt);
    if (this.hero && this.autoHero && now >= this.heroReadyAt) this.castHero();

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

  protected finish(outcome: SimResult["outcome"]) {
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

  protected log(text: string, kind: SimEvent["kind"]) {
    if (this.events.length < 400) this.events.push({ t: this.now, text, kind });
  }

  protected mark(kind: SimFx["kind"], x: number, y: number, color: string, extra: Partial<SimFx> = {}) {
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
      const child = MONSTER_BY_ID[SPLITS_INTO[m.def.id]] ?? m.def;
      if (child) {
        for (const off of SPLIT_COUNT[m.def.id] === 3 ? [-24, 0, 24] : [-18, 18]) {
          const c = this.spawn({ def: child }, { path: m.path, dist: Math.max(0, m.dist + off) }, 0.7, 0.35);
          c.mana = 3;
        }
      }
    }
  }

  protected leak(m: SimMonster) {
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

  /** Units a boss power may hit (shuffled with the run's random numbers), at most `n`. */
  private someUnits(n: number) {
    const units = this.units.filter((u): u is SimUnit => !!u);
    for (let i = units.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [units[i], units[j]] = [units[j], units[i]];
    }
    return units.slice(0, n);
  }

  /** An Aegis Knight next to `u` makes it immune to debuffs. */
  private shielded(u: SimUnit) {
    return neighbours(u.slot).some((j) => this.units[j]?.def.arch === "aegis");
  }

  /** Put a debuff on a unit; false when an Aegis Knight protects it. */
  private afflict(u: SimUnit, kind: "irritation" | "fatigue" | "shellshock", time: number, miss = EFFECTS.irritate.miss) {
    if (this.shielded(u)) return false;
    const s = u.status;
    const until = this.now + time;
    if (kind === "irritation") {
      s.irritatedUntil = Math.max(s.irritatedUntil, until);
      s.miss = miss;
    } else if (kind === "fatigue") s.fatiguedUntil = Math.max(s.fatiguedUntil, until);
    else s.shockedUntil = Math.max(s.shockedUntil, until);
    return true;
  }

  private minions(m: SimMonster, count: number, at = m.dist, spread = 35) {
    const def = MONSTER_BY_ID[m.boss?.minion ?? ""];
    if (!def) return;
    for (let i = 0; i < count; i++) this.spawn({ def }, { path: m.path, dist: Math.max(0, at - 20 - i * spread) }, 0.9, 0.8);
  }

  /** HP stages of split, layers and portal bosses (each quarter, or third, of HP lost). */
  private bossStages(m: SimMonster) {
    const b = m.boss!;
    if (b.power !== "split" && b.power !== "layers" && b.power !== "portal") return;
    const parts = b.power === "portal" ? 3 : 4;
    const stage = Math.min(parts - 1, Math.floor((1 - Math.max(0, m.hp) / m.maxHp) * parts));
    while (m.stage < stage && !m.dead) {
      m.stage++;
      if (b.power === "split") this.minions(m, 3, m.dist + 40);
      else if (b.power === "portal") m.dist = Math.min(m.path.length * 0.85, m.dist + 220);
      else {
        m.speedMult *= 1.15;
        for (const u of this.someUnits(b.targets ?? 3)) this.afflict(u, "shellshock", 1.5);
        this.minions(m, 4, m.dist + 60, 30);
      }
      this.log(`${b.name}: stage ${m.stage}`, "boss");
    }
  }

  private bossPower(m: SimMonster) {
    const b = m.boss!;
    const p = m.pos;
    const power: BossPower = b.rage && m.hp < m.maxHp / 2 ? b.rage : b.power;
    const targets = b.targets ?? 3;
    switch (power) {
      case "charm":
        for (const u of this.someUnits(targets)) this.afflict(u, "irritation", EFFECTS.irritate.time * 1.5);
        this.log(`${b.name} charms ${targets} units`, "boss");
        this.mark("text", p.x, p.y - 60, "#ff9ae6", { text: "CHARM" });
        break;
      case "roar":
        if (m.hp >= m.maxHp / 2) break;
        if (!m.roared) {
          m.roared = true;
          for (const u of this.someUnits(targets)) this.afflict(u, "shellshock", 2);
          this.log(`${b.name} roars`, "boss");
          this.mark("text", p.x, p.y - 60, "#ff8a3b", { text: "ROAR" });
        } else m.hasteUntil = this.now + 3;
        break;
      case "layers":
        if (m.stage >= 3) {
          for (const u of this.units) if (u) this.afflict(u, "irritation", EFFECTS.irritate.time * 1.5);
        } else this.minions(m, 2);
        break;
      case "portal":
        this.minions(m, 3, Math.min(m.path.length * 0.85, m.dist + 180 + this.rand() * 220) + 40, 30);
        this.log(`${b.name} opens a portal`, "boss");
        break;
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
        const units = this.someUnits(targets);
        for (const u of units) u.frozenUntil = this.now + 3;
        this.log(`${b.name} freezes ${units.length} units (3s)`, "boss");
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

  /** Same rules as the game's auto-cast. Returns whether it fired. */
  protected castHero() {
    const h = this.hero!;
    const targets = this.monsters.filter((m) => !m.gone && m.intro <= 0);
    if (h.power !== "mana" && !targets.length) return false;
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
    return true;
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
    if (now < u.frozenUntil || now < u.status.shockedUntil) return;
    u.alive += dt;
    if (u.def.effect === "irritate") {
      u.effectTimer += dt;
      if (u.effectTimer >= EFFECTS.irritate.every) {
        u.effectTimer = 0;
        for (const j of neighbours(u.slot)) if (this.units[j]) this.afflict(this.units[j]!, "irritation", EFFECTS.irritate.time);
      }
    }
    if (u.def.effect === "lantern") {
      u.effectTimer += dt;
      if (u.effectTimer >= EFFECTS.lantern.every) {
        u.effectTimer = 0;
        this.gainMana(lanternMana(this.units.filter((v) => v && isKnight(v.def)).length));
      }
    }
    if (u.def.arch === "buff" || u.def.arch === "aura" || u.def.arch === "aegis") return;
    if (isSupport(u.def.arch)) return this.updateSupport(u, dt);
    if (u.def.arch === "mana") {
      u.pulse += dt;
      if (u.pulse >= EFFECTS.mana.every) {
        u.pulse = 0;
        this.gainMana(manaPerPulse(u.rank));
      }
    }
    if (u.awakened) {
      u.ult += dt * (1 + u.charge);
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
    const rate = u.stats.speed * (1 + this.hasteOf(u)) * (now < u.status.fatiguedUntil ? 1 - EFFECTS.fatigue.slow : 1);
    u.cooldown -= dt;
    if (u.cooldown > 0 || u.sulking) return;
    const target = this.pickTarget(u.def.arch === "sniper" ? "strongest" : "first");
    if (!target) return;
    u.cooldown = 1 / rate;
    u.firedAt = now;
    this.fire(u, target);
  }

  /** Every attack-speed bonus on a unit right now: buffs and owls, hero, portal rush, war cry. */
  hasteOf(u: SimUnit) {
    const now = this.now;
    return (
      u.haste +
      u.auraSpeed +
      this.heroHaste +
      (now < u.rushUntil ? EFFECTS.portal.rush : 0) +
      (now < this.shoutUntil ? EFFECTS.herald.shout : 0) +
      (now < u.status.rallyUntil ? EFFECTS.rally.speed : 0) +
      (u.def.effect === "oath" ? EFFECTS.oath.speedPerKnight * this.adjacentKnights(u) : 0)
    );
  }

  private adjacentKnights(u: SimUnit) {
    return neighbours(u.slot).filter((j) => this.units[j] && isKnight(this.units[j]!.def)).length;
  }

  /** Support timers run faster with haste (buff units, the hero, a war cry). */
  private updateSupport(u: SimUnit, dt: number) {
    const t = dt * (1 + this.hasteOf(u));
    const mult = this.supportMult(u);
    switch (u.def.arch) {
      case "mime":
        u.timer += t;
        break;
      case "portal":
        u.timer = Math.max(0, u.timer - t);
        break;
      case "mirror": {
        const every = mirrorInterval(u.rank, mult);
        u.timer = Math.min(every, u.timer + t);
        if (u.timer < every) break;
        const options = neighbours(u.slot)
          .map((j) => this.units[j])
          .filter((v): v is SimUnit => !!v && canBecome(u, v));
        if (!options.length) break;
        const v = options[Math.floor(this.rand() * options.length)];
        this.log(`Mirror Slime turned into ${v.def.name}`, "unit");
        this.mark("text", u.x, u.y - 60, "#d9b3ff", { text: "MIRROR" });
        this.become(u, v.def.id, u.rank);
        break;
      }
      case "brewer":
        u.pulse += t;
        if (u.pulse >= EFFECTS.brewer.every) {
          u.pulse = 0;
          u.firedAt = this.now;
          const m = brewMana(u.rank, mult * this.brewMult());
          this.gainMana(m);
          this.brewed += m;
          this.mark("text", u.x, u.y - 60, "#7fd8ff", { text: `+${m}` });
        }
        break;
    }
  }

  /** Echo Spirits next to a unit that just fired its ultimate repeat it (the strongest one only). */
  private queueEcho(u: SimUnit, x: number, y: number, damage: number, mana: number) {
    let best = 0;
    for (const j of neighbours(u.slot)) {
      const v = this.units[j];
      if (v?.def.arch === "echo") best = Math.max(best, echoStrength(v.rank, this.supportMult(v)));
    }
    if (best > 0) this.echoes.push({ at: this.now + EFFECTS.echo.delay, unit: u, x, y, damage: damage * best, mana: Math.round(mana * best) });
  }

  private updateEchoes() {
    const due = this.echoes.filter((e) => e.at <= this.now);
    if (!due.length) return;
    this.echoes = this.echoes.filter((e) => e.at > this.now);
    for (const e of due) {
      this.mark("text", e.x, e.y - 70, "#9ff0ff", { text: "ENCORE" });
      if (e.mana) this.gainMana(e.mana);
      if (!e.damage) continue;
      this.mark("ring", e.x, e.y, "#9ff0ff", { x2: ECONOMY.ultimateRadius });
      for (const m of this.nearby({ x: e.x, y: e.y }, ECONOMY.ultimateRadius)) this.applyHit(e.unit, e.damage, m);
    }
  }

  private ultimate(u: SimUnit, target: SimMonster | null) {
    if (u.def.arch === "mana" || !target) {
      const mana = Math.round(EFFECTS.mana.ultimateBase + EFFECTS.mana.ultimatePerWave * this.wave);
      this.gainMana(mana);
      this.queueEcho(u, u.x, u.y, 0, mana);
      return;
    }
    const center = target.pos;
    const damage = u.stats.damage * this.heroDamageMult * this.heraldMult * ECONOMY.ultimateDamageMult;
    this.queueEcho(u, center.x, center.y, damage, 0);
    this.mark("ring", center.x, center.y, "#ffd93b", { x2: ECONOMY.ultimateRadius });
    this.mark("text", center.x, center.y - 70, "#ffd93b", { text: "ULTIMATE" });
    for (const m of this.nearby(center, ECONOMY.ultimateRadius)) this.applyHit(u, damage, m);
  }

  private fire(u: SimUnit, target: SimMonster) {
    const now = this.now;
    // Irritation: the attack may miss.
    if (now < u.status.irritatedUntil && this.rand() < u.status.miss) return;
    if (u.def.effect === "rally" || u.def.effect === "fatigue") {
      for (const j of neighbours(u.slot)) {
        const v = this.units[j];
        if (!v) continue;
        if (u.def.effect === "fatigue") this.afflict(v, "fatigue", EFFECTS.fatigue.linger);
        else if (!noAttack(v.def.arch)) v.status.rallyUntil = now + EFFECTS.rally.time;
      }
    }
    let damage = u.stats.damage * this.heroDamageMult * this.heraldMult * (1 + u.auraDamage);
    if (u.def.effect === "oath") damage *= 1 + EFFECTS.oath.perKnight * this.adjacentKnights(u);
    if (u.def.effect === "fatigue") damage *= 1 + EFFECTS.fatigue.perMercenary * this.units.filter((v) => v && isMercenary(v.def)).length;
    if (u.def.arch === "growth") damage *= growthMult(u.alive);
    const from = { x: u.x, y: u.y - 30 };
    if (u.def.arch === "chain") return this.chainLightning(u, target, damage, from);
    this.shots.push({ unit: u, damage, target, x: from.x, y: from.y, aim: target.pos, speed: u.def.arch === "sniper" ? EFFECTS.sniper.shotSpeed : 1100 });
  }

  private chainLightning(u: SimUnit, first: SimMonster, damage: number, from: Pt) {
    const jumps = chainJumps(u.rank, rarityIndex(u.def.rarity));
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

  /** Up to `jumps` more monsters, each the nearest within chain range of the last, skipping `skip`. */
  private chainOn(first: SimMonster, skip: SimMonster[], jumps: number) {
    const out: SimMonster[] = [];
    let cur = first;
    while (out.length < jumps) {
      let next: SimMonster | null = null;
      let bestD = EFFECTS.chain.range;
      for (const m of this.monsters) {
        if (m.gone || skip.includes(m) || out.includes(m)) continue;
        const d = Math.hypot(m.pos.x - cur.pos.x, m.pos.y - cur.pos.y);
        if (d < bestD) {
          bestD = d;
          next = m;
        }
      }
      if (!next) break;
      out.push(next);
      cur = next;
    }
    return out;
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

  private applyHit(u: SimUnit, baseDamage: number, m: SimMonster) {
    const def = u.def;
    const rank = u.rank;
    const src = u.slot;
    const e = EFFECTS;
    const now = this.now;
    const rarityIdx = rarityIndex(def.rarity);
    const bane = (o: SimMonster) => (def.effect === "bane" && o.boss?.corrupted ? baseDamage * (1 + e.bane.bossBonus) : baseDamage);
    // Rogue Knight: nearly every blow crits.
    const damage = bane(m) * (def.effect === "irritate" && this.rand() < e.irritate.critChance ? e.irritate.critMult : 1);
    if (def.effect === "shellshock" && this.rand() < e.shellshock.chance) {
      const near = neighbours(u.slot).map((j) => this.units[j]).filter((v): v is SimUnit => !!v);
      const v = near[Math.floor(this.rand() * near.length)];
      if (v) this.afflict(v, "shellshock", e.shellshock.time);
    }
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
        // Lance Knight: the hit also chains on to more monsters.
        if (def.effect === "bane") this.chainOn(m, [m, ...behind], e.bane.chain).forEach((o, i) => this.hurt(o, bane(o) * Math.pow(e.chain.falloff, i + 1), src, { ...P, sure: true }));
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
        if (crit) this.mark("text", pos.x, pos.y - 30, "#ffd93b", { text: "CRIT", slot: src, callout: `CRIT ×${+critMult(rank).toFixed(1)}` });
        break;
      }
      case "curse":
        this.hurt(m, damage, src, P);
        m.curse = Math.min(e.curse.max, m.curse + curseStep(rank, rarityIdx));
        break;
      case "execute":
        if (this.rand() < executeChance(rank, rarityIdx)) {
          if (isBoss) {
            this.mark("text", pos.x, pos.y - 30, "#ff7ad9", { text: `×${e.execute.bossMult}`, slot: src, callout: `×${e.execute.bossMult}` });
            this.hurt(m, damage * e.execute.bossMult, src, P);
          } else {
            this.mark("text", pos.x, pos.y - 30, "#ff7ad9", { text: "EXECUTE", slot: src, callout: "EXECUTE" });
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
