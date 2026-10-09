/**
 * Headless battle simulation for the admin Playground.
 *
 * Mirrors the combat rules of game/src/scenes/BattleScene.ts, Unit.ts and Monster.ts
 * (targeting, archetype effects, awakened ultimates, boss powers, hero abilities, wave
 * spawning) without Phaser, using a seeded random source so a run can be repeated.
 * Since v2 P1b it is the whole battle engine: it also runs the player's actions (summon,
 * merge, copy, swap, hop, power-up, hero cast), story chapters, brew bubbles and drags, and
 * publishes a structured event stream (SimEvent, drainEvents) for a renderer. The Playground
 * still runs it with a fixed board and no actions. Keep BattleScene in step until it is a view.
 *
 * Reads the live tables (UNITS, EFFECTS, ECONOMY...), so call applyConfig() first to
 * simulate a particular config.
 */
import { ARENAS, ARENA_BY_ID, type ArenaDef } from "./arenas.ts";
import { ECONOMY } from "./economy.ts";
import {
  EFFECTS,
  type Effects,
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
import { BOSS_BY_ID, MONSTER_BY_ID, SPLITS_INTO, SPLIT_COUNT, type BossDef, type BossPower, type BossSkill, type BossSkillKind, type MonsterDef } from "./monsters.ts";
import { UNIT_BY_ID, boostMult, maxPowerUp, maxRank, powerUpCost, rarityIndex, unitStats, type Arch, type Element, type UnitDef } from "./units.ts";
import { raceLabel } from "./races.ts";
import { starsFor, type StoryChapter, type StoryLine } from "./stories.ts";
import { clearDebuffs, isKnight, isMercenary, newStatus, square3 } from "./statuses.ts";
import { arenaPaths, slotPos, type Path, type Pt } from "./path.ts";
import { addPerk, armorMult, chills, dodgeChance, perkMult, plunderMana, type ActivePerk } from "./perks.ts";
import { kitHas, kitPrimary, perkValue, unitEffects } from "./kit.ts";
import {
  brewMana,
  canBecome,
  echoStrength,
  harvestMana,
  heraldBonus,
  isSupport,
  luckyChance,
  mimePrep,
  mirrorInterval,
  neighbours,
  noAttack,
  owlCharge,
  owlSpeed,
  portalCooldown,
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

/** One line of the text log (Playground event list). The structured stream is SimEvent. */
export interface SimLogEntry {
  t: number;
  text: string;
  kind: "boss" | "hero" | "leak" | "kill" | "wave" | "unit";
}

export type ManaSource = "kill" | "wave" | "harvest" | "brew" | "pulse" | "lantern" | "ultimate" | "echo" | "plunder" | "hero" | "income" | "other";
export type CalloutKind = "miss" | "block" | "dodge" | "rally" | "rush" | "lucky" | "copy" | "mirror" | "tsk" | "shellshock" | "unpaid" | "crit" | "execute" | "herald";

/**
 * Structured events for a renderer, drained with drainEvents(). Unit uids are stable per
 * physical unit: summon, merge and become (Mime copy, Mirror Slime) each create a NEW uid
 * (the old sprite is gone); swap and hop keep the uid and only change slot and position.
 * Monster uids are the SimMonster uids.
 */
export type SimEvent =
  | { type: "summon"; t: number; uid: number; id: string; rank: number; slot: number; x: number; y: number; awakened: boolean }
  /** `gone` are the two merged units; `uid` is the new one on the target slot. `lucky`: a Lucky Cat kept the unit. */
  | { type: "merge"; t: number; uid: number; gone: [number, number]; id: string; rank: number; slot: number; x: number; y: number; awakened: boolean; lucky: boolean }
  /** `gone` was replaced by `uid` (a Mime copy or a Mirror Slime turning). */
  | { type: "become"; t: number; uid: number; gone: number; why: "copy" | "mirror"; id: string; rank: number; slot: number; x: number; y: number; awakened: boolean }
  /** Portal Imp: `other` is the unit it traded with (null for a hop to an empty tile). */
  | { type: "swap"; t: number; uid: number; other: number | null; from: number; to: number }
  | { type: "awaken"; t: number; uid: number; id: string; slot: number; x: number; y: number }
  | { type: "powerup"; t: number; id: string; level: number }
  | { type: "wave"; t: number; wave: number; total: number | null; boss: string | null; banner: string; sub: string | null; final: boolean; monsters: number }
  | { type: "spawn"; t: number; uid: number; id: string; boss: boolean; x: number; y: number; hp: number; path: number }
  | { type: "kill"; t: number; uid: number; id: string; boss: boolean; x: number; y: number; mana: number; slot: number | "hero" }
  | { type: "leak"; t: number; uid: number; id: string; boss: boolean; x: number; y: number; livesLost: number; lives: number }
  /** An HP stage of a split, portal or layers boss (stage 1.., text e.g. SPLIT, BLINK, LAYER BROKEN, THE CORE). */
  | { type: "boss_stage"; t: number; uid: number; id: string; power: BossPower; stage: number; text: string; x: number; y: number }
  | { type: "boss_power"; t: number; uid: number; id: string; power: BossPower; text: string; x: number; y: number }
  /** v2.1: a boss skill fired (see BossSkill). */
  | { type: "boss_skill"; t: number; uid: number; id: string; skill: BossSkillKind; text: string; x: number; y: number }
  /**
   * v2.1: the story charge. Allies pushed the boss from `from` back to the path start (`to`) and it lost
   * `damage` HP; it is faster now and uses no more powers. The solo scene plays the cutscene here.
   */
  | { type: "rally"; t: number; uid: number; id: string; from: Pt; to: Pt; damage: number }
  /** Minions released around a boss or a splitter breaking up (`kind`). */
  | { type: "split"; t: number; uid: number; kind: "splitter" | "boss"; children: number[]; x: number; y: number }
  /** A boss portal opens at (x, y); its minions step out `delay` seconds later. */
  | { type: "portal"; t: number; uid: number; x: number; y: number; delay: number }
  | { type: "bark"; t: number; who: string; text: string }
  | { type: "mana"; t: number; amount: number; x: number | null; y: number | null; source: ManaSource }
  | { type: "wages"; t: number; uid: number; slot: number; cost: number; paid: boolean; x: number; y: number }
  | { type: "callout"; t: number; kind: CalloutKind; text: string; color: string; uid: number | null; x: number; y: number }
  /** A debuff landed on a unit (shellshock and boss powers only; the rest is in the status). */
  | { type: "afflict"; t: number; uid: number; kind: "irritation" | "fatigue" | "shellshock" | "entangle"; x: number; y: number }
  | { type: "hero"; t: number; power: HeroDef["power"]; ability: string; auto: boolean }
  | { type: "ultimate"; t: number; uid: number; kind: "strike" | "mana"; x: number; y: number; radius: number }
  | { type: "encore"; t: number; x: number; y: number; radius: number; strike: boolean }
  | { type: "herald_cry"; t: number; uid: number | null }
  /** A shot arrived but its target was already gone (play an impact). */
  | { type: "shot_lost"; t: number; uid: number; x: number; y: number }
  | { type: "brew"; t: number; bubble: number; uid: number; slot: number; amount: number; x: number; y: number }
  | { type: "brew_collect"; t: number; bubble: number; uid: number; tapped: boolean; amount: number; x: number; y: number }
  | { type: "end"; t: number; outcome: SimResult["outcome"]; why: string | null; stars: number | null }
  // View-only events, emitted only with the `view` option (the solo scene): they never change a rule.
  /** A hit landed on `target`: main hit of a shot or ultimate, a pierce or chain extra, or a Lance Knight's bane chain. */
  | { type: "hit"; t: number; uid: number; target: number; kind: "main" | "pierce" | "chain" | "bane"; element: Element; x: number; y: number; size: number }
  /** A big damage number over a monster (crit, boss execute, sniper, hero meteor). */
  | { type: "bighit"; t: number; target: number; x: number; y: number; dmg: number; color: string }
  /** A proc on a monster: frozen, stunned, executed. */
  | { type: "proc"; t: number; kind: "frozen" | "stun" | "execute"; x: number; y: number }
  /** A lightning bolt segment: chain n (0 first), a Lance Knight's bane chain, or a hero storm bolt. */
  | { type: "zap"; t: number; kind: "chain" | "bane" | "storm"; n: number; x: number; y: number; x2: number; y2: number; color: string }
  /** A healer monster's pulse. */
  | { type: "heal_pulse"; t: number; x: number; y: number };

export type SimMode = "solo" | "pvp";

export interface SimOptions {
  /** "solo" (default) or "pvp". PvP brewers always pay instantly (no bubbles). */
  mode?: SimMode;
  /** Card level per unit id (falls back to setup.cardLevel). */
  levels?: Record<string, number>;
  /** The deck summons and merges draw from (also gives every id a power-up level of 0). */
  deck?: string[];
  /** Whether a unit awakens at max rank (the game knows from its art; elsewhere none do). */
  awakens?: (id: string) => boolean;
  /** Whether a boss has an intro clip (then it stands still 1.4 s). Default: every boss does. */
  bossIntro?: (id: string) => boolean;
  /** Cast the hero by itself when ready. Default true. */
  autoHero?: boolean;
  /** Hold the first wave's intro timer (tutorial). */
  tutorialHold?: boolean;
  /** Monster HP multiplier replacing the arena's own (a story chapter's hpScale; PvP overrides baseHp). */
  hpScale?: number;
  /** A story chapter: scripted waves, per-wave hp, boss first, last wave cleared = "won", stars from lives. */
  story?: StoryChapter;
  /** Starting mana (default 0). */
  startMana?: number;
  /** Brewer mana waits in a bubble to be tapped (+tapBonus) or pops by itself (solo only). Default false: instant. */
  bubbles?: boolean;
  /** Most timeline samples kept; past it the timeline is thinned (default 20000). */
  timelineCap?: number;
  /** Collect the structured event stream (default true). */
  events?: boolean;
  /** Also emit the view-only events (hit, bighit, proc, zap, heal_pulse). Default false: tests and PvP never see them. */
  view?: boolean;
}

export interface SimCounts {
  summons: number;
  merges: number;
  awakens: number;
  heroCasts: number;
  copies: number;
  swaps: number;
  /** Mana brewed by Gnome Brewers (brews, taps and harvests). */
  brewed: number;
  bossesKilled: number;
  lucky: number;
  /** PvP only. */
  sends: number;
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
  outcome: "cleared" | "lost" | "timeout" | "done" | "won";
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
  events: SimLogEntry[];
  timeline: SimSample[];
  counts: SimCounts;
  /** Story chapters: 1-3 stars from the lives left on a win, else 0; null outside stories. */
  stars: number | null;
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

/** A unit id's primary archetype ("shot" for an unknown id). */
const unitPrimary = (id: string): Arch => (UNIT_BY_ID[id] ? kitPrimary(UNIT_BY_ID[id]) : "shot");

const DUMMY: MonsterDef = { id: "dummy", name: "Training dummy", race: "construct", hp: 1, speed: 0, traits: [], mana: 0, size: 84 };

// ---------------------------------------------------------------- actors

export class SimUnit {
  readonly def: UnitDef;
  readonly rank: number;
  /** Slot and position change when a Portal Imp swaps or hops. */
  slot: number;
  /** Stable id of this physical unit (see SimEvent): assigned by the Sim, 0 until then. */
  uid = 0;
  /** Being dragged by the player: it skips its update and neighbour effects (see Sim.setDragging). */
  dragging = false;
  readonly awakened: boolean;
  x: number;
  y: number;
  readonly stats: { damage: number; speed: number };
  cooldown: number;
  alive: number;
  haste = 0;
  /** What it does: kit[0] (attack or solo archetype). */
  readonly primary: Arch;
  /** The unit's own effect numbers: the global blocks with its kit's tune overrides applied. */
  readonly fx: Effects;
  /** Its own perks, values resolved. */
  readonly ownPerks: ActivePerk[];
  /** Its own perks plus those from neighbouring buff units (the higher value wins). */
  perks: ActivePerk[] = [];
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
    this.primary = kitPrimary(this.def);
    this.fx = unitEffects(this.def);
    this.ownPerks = this.def.perks.map((s) => ({ perk: s.perk, ...perkValue(s) }));
    this.rank = b.rank;
    this.slot = slot;
    this.awakened = !!b.awakened && !isSupport(this.primary);
    this.x = pos.x;
    this.y = pos.y;
    this.stats = boardUnitStats(b, cardLevel, powerUp);
    for (const p of this.ownPerks) addPerk(this.perks, p);
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
  /** v2.1: when each boss skill fires next, and how often each was used. */
  skillAt: number[] = [];
  skillUsed: number[] = [];
  /** v2.1: the story charge happened (no more powers or skills). */
  rallied = false;

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
  /** The constructor options (mode, story, levels...). */
  readonly o: SimOptions;
  readonly mode: SimMode;
  readonly story: StoryChapter | null;
  readonly deck: string[];
  /** In-battle power-up level per deck unit id. */
  readonly powerUps: Record<string, number>;

  now = 0;
  wave = 0;
  lives: number;
  mana = 0;
  /** Cost of the next summon: grows with every summon. */
  summonCost: number = ECONOMY.summonCostStart;
  monsters: SimMonster[] = [];
  shots: SimShot[] = [];
  fx: SimFx[] = [];
  boss: SimMonster | null = null;
  over = false;
  /** Cast the hero by itself whenever it is ready (PvP lets the player switch this off). */
  autoHero = true;
  outcome: SimResult["outcome"] | null = null;
  /** Why the battle was ended from outside (end(why)), else null. */
  endWhy: string | null = null;
  /** Story stars (1-3) once a chapter is won, else null. */
  stars: number | null = null;
  /** Hold the first wave's intro timer (tutorial). */
  tutorialHold = false;
  /** The next summon is forced onto this unit and tile (tutorial); used once if the tile is still empty. */
  tutorialPick: { id: string; slot: number } | null = null;
  /** HP multiplier of the current story wave. */
  waveHp = 1;
  /** Chaos Taffy tethers this step: the taffy and the unit it holds (for drawing the chain). */
  tethers: { monster: SimMonster; unit: SimUnit }[] = [];
  /** Open brew bubbles (solo with the `bubbles` option). */
  bubbles: { id: number; unit: SimUnit; amount: number; at: number; expires: number; x: number; y: number }[] = [];
  /** Structured events not yet drained. */
  feed: SimEvent[] = [];

  private uid = 0;
  private unitUid = 0;
  private bubbleId = 0;
  private hpScale: number | undefined;
  /** Story barks and portal minions waiting for their moment. */
  private barks: { at: number; line: StoryLine }[] = [];
  private portals: { at: number; boss: SimMonster; dist: number }[] = [];
  private timelineEvery = 0.25;
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
  heroDamage = 0;
  manaGained = 0;
  counts: SimCounts = { summons: 0, merges: 0, awakens: 0, heroCasts: 0, copies: 0, swaps: 0, brewed: 0, bossesKilled: 0, lucky: 0, sends: 0 };
  blocked = 0;
  dodged = 0;
  bossHpLeft: number | null = null;
  bossKilled: boolean | null = null;
  bossTime: number | null = null;
  damageBySlot = new Array(15).fill(0);
  killsBySlot = new Array(15).fill(0);
  /** The text log (kept for the Playground; the structured stream is `feed`). */
  events: SimLogEntry[] = [];
  timeline: SimSample[] = [];

  get heroCasts() {
    return this.counts.heroCasts;
  }

  /** Mana from Gnome Brewers (brews, taps and harvests). */
  get brewed() {
    return this.counts.brewed;
  }

  constructor(setup: SimSetup, opts: SimOptions = {}) {
    this.setup = setup;
    this.o = opts;
    this.mode = opts.mode ?? "solo";
    this.story = opts.story ?? null;
    this.arena = (this.story && ARENA_BY_ID[this.story.layout]) || ARENA_BY_ID[setup.arena] || ARENAS[0];
    this.rand = rng(setup.seed);
    const geo = arenaGeometry(this.arena);
    this.paths = geo.paths;
    this.targetFrom = geo.targetFrom;
    this.lives = ECONOMY.lives;
    this.deck = [...(opts.deck ?? [])];
    this.powerUps = Object.fromEntries(this.deck.map((id) => [id, 0]));
    this.hpScale = opts.hpScale ?? this.story?.hpScale;
    this.mana = opts.startMana ?? 0;
    if (opts.autoHero !== undefined) this.autoHero = opts.autoHero;
    this.tutorialHold = !!opts.tutorialHold;
    const h = setup.hero ? HERO_BY_ID[setup.hero] : undefined;
    this.hero = h?.enabled ? h : null;
    this.heroReadyAt = this.hero && !setup.heroCharged ? this.hero.cooldown * 0.4 : 0;

    this.units = setup.board.slice(0, 15).map((b, slot) =>
      b && UNIT_BY_ID[b.id]
        ? this.adopt(new SimUnit(b, slot, slotPos(this.arena, slot), setup.cardLevel, setup.powerUp, 0.3 + this.rand() * 0.4, setup.growthStart ?? 0))
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

  /** Card level of a unit on this board: the per-id map, else the setup's one level for every card. */
  protected levelOf(id: string) {
    return this.o.levels?.[id] ?? this.setup.cardLevel;
  }

  /** In-battle power-ups bought for a unit (the setup's flat level for ids outside the deck). */
  protected powerOf(id: string) {
    return this.powerUps[id] ?? this.setup.powerUp;
  }

  /** Give a new unit its stable uid. */
  private adopt(u: SimUnit) {
    u.uid = ++this.unitUid;
    return u;
  }

  /** Structured event for a renderer (see drainEvents). */
  protected emit(e: SimEvent) {
    if (this.o.events !== false && this.feed.length < 20000) this.feed.push(e);
  }

  /** A view-only event (see SimOptions.view). */
  protected view(e: SimEvent) {
    if (this.o.view) this.emit(e);
  }

  /** Take every event since the last call. */
  drainEvents(): SimEvent[] {
    const out = this.feed;
    this.feed = [];
    return out;
  }

  private callout(kind: CalloutKind, text: string, color: string, x: number, y: number, uid: number | null = null) {
    this.emit({ type: "callout", t: this.now, kind, text, color, uid, x, y });
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
      for (const p of u.ownPerks) addPerk(u.perks, p);
    }
    // Princess Muse's Last Call (the 3×3 square, best one counts) and the Aegis Knight's cleanse.
    this.units.forEach((u, i) => {
      if (u?.primary === "aegis") for (const j of neighbours(i)) if (this.units[j]) clearDebuffs(this.units[j]!.status);
      if (u?.primary !== "aura") return;
      const b = auraBonus(u.rank, this.supportMult(u), u.fx);
      for (const j of square3(i)) {
        const v = this.units[j];
        if (!v || noAttack(v.primary)) continue;
        v.auraSpeed = Math.max(v.auraSpeed, b.speed);
        v.auraDamage = Math.max(v.auraDamage, b.damage);
      }
    });
    let herald: SimUnit | null = null;
    this.units.forEach((u, i) => {
      if (!u) return;
      if (u.primary === "herald" && (!herald || u.rank > herald.rank)) herald = u;
      if (u.primary === "hourglass") {
        const mult = this.supportMult(u);
        for (const j of neighbours(i)) {
          const v = this.units[j];
          if (!v || noAttack(v.primary)) continue;
          if (v.awakened) v.charge += owlCharge(u.rank, mult, u.fx);
          else v.haste += owlSpeed(u.rank, mult, u.fx);
        }
        return;
      }
      if (u.primary !== "buff") return;
      const mult = boostMult(this.levelOf(u.def.id), this.powerOf(u.def.id)) * (u.awakened ? ECONOMY.awakenDamageMult : 1);
      const bonus = buffBonus(u.rank, rarityIndex(u.def.rarity), mult, u.fx);
      for (const j of neighbours(i)) {
        const v = this.units[j];
        if (v && v.primary !== "buff") {
          // Support units get the haste (it shortens their timers) but not the perk: they never hit.
          v.haste += bonus;
          if (!isSupport(v.primary)) for (const p of u.ownPerks) addPerk(v.perks, p);
        }
      }
    });
    const h = herald as SimUnit | null;
    const awake = this.units.filter((u) => u?.awakened).length;
    const before = this.heraldMult;
    this.heraldMult = h ? 1 + heraldBonus(h.rank, awake, this.supportMult(h), h.fx) : 1;
    if (h && this.heraldMult > before) this.callout("herald", `+${Math.round((this.heraldMult - 1) * 100)}% DMG`, "#ff8a3b", h.x, h.y - 60, h.uid);
  }

  /** A unit awakened: the Banner Herald's war cry. */
  protected onAwaken() {
    const herald = this.units.find((u) => u?.primary === "herald");
    if (herald) {
      this.shoutUntil = this.now + herald.fx.herald.shoutTime;
      this.log("Banner Herald: war cry", "unit");
      this.emit({ type: "herald_cry", t: this.now, uid: herald.uid });
    }
  }

  /** Whether a unit of this id and rank awakens (max rank, not a support, and the game has the art). */
  private awakensAt(id: string, rank: number) {
    return rank >= maxRank() && !isSupport(unitPrimary(id)) && !!this.o.awakens?.(id);
  }

  /** Put a new unit on a tile (summon, merge, become): fresh uid, buffs, awaken events. */
  private place(id: string, rank: number, slot: number, pos: Pt = slotPos(this.arena, slot)) {
    const awakened = this.awakensAt(id, rank);
    const u = this.adopt(new SimUnit({ id, rank, awakened }, slot, pos, this.levelOf(id), this.powerOf(id), 0.3 + this.rand() * 0.4, 0));
    this.units[slot] = u;
    this.recomputeBuffs();
    if (awakened) {
      this.onAwaken();
      this.emit({ type: "awaken", t: this.now, uid: u.uid, id, slot, x: u.x, y: u.y });
    }
    return u;
  }

  /** Swap a unit onto another tile (a Mime copy, a Mirror Slime turning): same slot, new unit, new uid. */
  protected become(u: SimUnit, id: string, rank: number, why: "copy" | "mirror" = "copy") {
    const v = this.place(id, rank, u.slot, { x: u.x, y: u.y });
    this.emit({ type: "become", t: this.now, uid: v.uid, gone: u.uid, why, id, rank, slot: v.slot, x: v.x, y: v.y, awakened: v.awakened });
    return v;
  }

  /** Gnome Brewers pay their harvest when wave `ended` is over. */
  protected harvest(ended: number) {
    for (const u of this.units) {
      if (u?.primary !== "brewer") continue;
      const m = harvestMana(u.rank, ended, this.supportMult(u) * this.brewMult(), u.fx);
      this.gainMana(m, u.x, u.y - 60, "harvest");
      this.counts.brewed += m;
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
    // A story chapter (or an explicit hpScale) replaces the arena's own place-in-the-list scale.
    if (this.hpScale !== undefined) return ECONOMY.waveHpBase * Math.pow(ECONOMY.waveHpGrowth, n - 1) * this.hpScale;
    return waveBaseHp(this.arena, n);
  }

  /** Hired Blades take their wages as a wave starts; one that can't be paid sulks for the wave. */
  private payWages() {
    for (const u of this.units) {
      if (!u || !kitHas(u.def, "wages")) continue;
      const cost = wagesFor(u.rank, u.fx);
      u.sulking = this.mana < cost;
      if (u.sulking) this.callout("unpaid", "UNPAID!", "#ff8080", u.x, u.y - 60, u.uid);
      else this.mana -= cost;
      this.emit({ type: "wages", t: this.now, uid: u.uid, slot: u.slot, cost, paid: !u.sulking, x: u.x, y: u.y - 60 });
    }
  }

  private startWave(forceBoss?: BossDef, escort = true) {
    this.wave++;
    const n = this.wave;
    const e = ECONOMY;
    const scripted = this.story?.waves[n - 1];
    const isBoss = !!forceBoss || (scripted ? !!scripted.boss : n % e.bossEvery === 0);
    if (n > 1 && this.setup.scenario.kind === "run") {
      this.gainMana(Math.round(e.waveManaBase + n * e.waveManaPerWave), null, null, "wave");
      this.harvest(n - 1);
    }
    this.payWages();
    if (scripted) return this.startScriptedWave(scripted, n);
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
      this.announce(n, boss, this.queue.length);
    } else {
      const count = Math.min(e.waveSizeMax, Math.round(e.waveSizeBase + n * e.waveSizePerWave));
      for (let i = 0; i < count; i++) this.queue.push({ def: pick() });
      this.log(`Wave ${n}: ${count} monsters`, "wave");
      this.announce(n, null, count);
    }
    this.spawnInterval = Math.max(e.spawnIntervalMin, e.spawnIntervalStart - n * e.spawnIntervalStep);
    this.spawnTimer = isBoss ? 1.6 : 0.5;
    this.waveTimer = 0;
    this.waveState = "spawning";
  }

  /** A story wave: exactly the monsters its script lists (shuffled), the boss first. */
  private startScriptedWave(w: StoryChapter["waves"][number], n: number) {
    const e = ECONOMY;
    this.waveHp = w.hp;
    const list: { def?: MonsterDef; boss?: BossDef }[] = w.spawns.flatMap((s) => (MONSTER_BY_ID[s.id] ? Array.from({ length: s.n }, () => ({ def: MONSTER_BY_ID[s.id] })) : []));
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    this.queue = [];
    // Roots hold until the wave ends.
    for (const u of this.units) if (u) u.status.entangledUntil = 0;
    const boss = w.boss ? BOSS_BY_ID[w.boss] : undefined;
    if (boss) this.queue.push({ boss });
    this.queue.push(...list);
    this.log(boss ? `Wave ${n}: boss ${boss.name}` : `Wave ${n}: ${list.length} monsters`, "wave");
    this.announce(n, boss ?? null, this.queue.length);
    if (w.bark) this.barks.push({ at: this.now + (boss ? 1.9 : 0.9), line: w.bark });
    this.spawnInterval = Math.max(e.spawnIntervalMin, e.spawnIntervalStart - n * e.spawnIntervalStep);
    this.spawnTimer = boss ? 1.6 : 0.5;
    this.waveTimer = 0;
    this.waveState = "spawning";
  }

  /** The wave event: banner text like the solo scene shows it. */
  protected announce(n: number, boss: BossDef | null, monsters: number) {
    const total = this.story?.waves.length ?? null;
    const final = total !== null && n === total;
    const banner = boss ? `${final ? "FINAL BOSS" : "BOSS"}: ${boss.name}` : total !== null ? (final ? "FINAL WAVE" : `WAVE ${n} / ${total}`) : `WAVE ${n}`;
    this.emit({ type: "wave", t: this.now, wave: n, total, boss: boss?.id ?? null, banner, sub: boss ? raceLabel(boss.race).toUpperCase() : null, final, monsters });
  }

  protected spawn(q: { def?: MonsterDef; boss?: BossDef }, at?: { path: Path; dist: number }, scale = 1, hpMult = 1) {
    const path = at?.path ?? this.paths[this.rand() < 0.5 ? 0 : 1];
    const n = this.wave;
    this.spawned++;
    let m: SimMonster;
    if (q.boss) {
      const hp = this.baseHp(n) * ECONOMY.bossHpMult * q.boss.hp * this.waveHp;
      m = new SimMonster(++this.uid, { boss: q.boss }, path, hp, { mana: 150 + n * 15 });
      m.powerTimer = 5;
      m.skillAt = (q.boss.skills ?? []).map((k) => k.first ?? k.every);
      m.skillUsed = (q.boss.skills ?? []).map(() => 0);
      m.intro = this.o.bossIntro && !this.o.bossIntro(q.boss.id) ? 0 : BOSS_INTRO;
      this.boss = this.trackedBoss = m;
    } else {
      const def = q.def!;
      const hp = this.baseHp(n) * def.hp * hpMult * this.waveHp;
      m = new SimMonster(++this.uid, { def }, path, hp, { dist: at?.dist, scale, mana: def.mana + Math.floor(n / 2) });
    }
    this.monsters.push(m);
    const f = m.foot;
    this.emit({ type: "spawn", t: this.now, uid: m.uid, id: m.id, boss: !!q.boss, x: f.x, y: f.y, hp: m.maxHp, path: Math.max(0, this.paths.indexOf(path)) });
    return m;
  }

  protected flow(dt: number) {
    const kind = this.setup.scenario.kind;
    if (kind === "dummies") return;
    if (this.waveState === "intro") {
      if (!this.tutorialHold) this.introTimer -= dt;
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
      if (this.story && this.wave >= this.story.waves.length) {
        // The last story wave: cleared with lives left wins the chapter.
        if (!bossAlive && !alive) {
          this.wavesCleared = this.wave;
          this.finish("won");
        }
      } else if (!bossAlive && (!alive || this.waveTimer > 20)) {
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
    if (this.barks.length) this.updateBarks();
    if (this.portals.length) this.updatePortals();

    this.healTimer -= dt;
    const healPulse = this.healTimer <= 0;
    if (healPulse) this.healTimer = 3;
    for (const m of this.monsters) {
      if (m.gone) continue;
      this.updateMonster(m, dt);
      if (m.gone) continue;
      if (m.boss && m.intro <= 0) {
        this.bossStages(m);
        if (m.boss.rally && !m.rallied && m.progress >= m.boss.rally.at) this.rally(m);
        if (!m.rallied) {
          m.powerTimer -= dt;
          if (m.powerTimer <= 0) {
            m.powerTimer = 6;
            this.bossPower(m);
          }
          if (m.skillAt.length) this.bossSkills(m, dt);
        }
      }
      if (healPulse && m.has("healer")) {
        for (const o of this.nearby(m.pos, 130)) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.08);
        this.mark("ring", m.pos.x, m.pos.y, "#7dff7a", { x2: 130 });
        this.view({ type: "heal_pulse", t: now, x: m.pos.x, y: m.pos.y });
      }
      if (m.dist >= m.path.length) {
        this.leak(m);
        if (this.over) return;
      }
    }
    this.monsters = this.monsters.filter((m) => !m.gone);
    if (this.boss?.gone) this.boss = null;

    this.updateTethers();
    for (const u of this.units) if (u) this.updateUnit(u, dt);
    if (this.echoes.length) this.updateEchoes();
    this.updateStorm(dt);
    this.updateShots(dt);
    if (this.bubbles.length) this.updateBubbles();
    if (this.hero && this.autoHero && now >= this.heroReadyAt) this.castHero(true);

    this.sampleTimer -= dt;
    if (this.sampleTimer <= 0) {
      this.sampleTimer = this.timelineEvery;
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
    if (outcome === "won") this.stars = starsFor(this.lives, ECONOMY.lives);
    else if (this.story) this.stars = 0;
    this.sample();
    this.emit({ type: "end", t: this.now, outcome, why: this.endWhy, stars: this.stars });
  }

  /**
   * End the battle from outside: "done" (the match ended elsewhere), or any other text as the
   * reason of a forced loss (surrender, "Continued on another device"); "lost" is a plain loss.
   */
  end(why: "lost" | "done" | (string & {}) = "lost") {
    if (this.over) return;
    if (why === "done") return this.finish("done");
    if (why !== "lost") this.endWhy = why;
    this.finish("lost");
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
      counts: { ...this.counts },
      stars: this.stars,
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
    // Endless runs: thin the timeline (keep every other sample, sample half as often) instead of growing forever.
    if (this.timeline.length > (this.o.timelineCap ?? 20000)) {
      this.timeline = this.timeline.filter((_, i) => i % 2 === 0);
      this.timelineEvery *= 2;
    }
  }

  protected log(text: string, kind: SimLogEntry["kind"]) {
    if (this.events.length < 400) this.events.push({ t: this.now, text, kind });
  }

  protected mark(kind: SimFx["kind"], x: number, y: number, color: string, extra: Partial<SimFx> = {}) {
    if (this.fx.length < 300) this.fx.push({ t: this.now, kind, x, y, color, ...extra });
  }

  /** Add mana. `x`, `y` and `source` only label the "mana" event (where to float the number, why). */
  gainMana(amount: number, x: number | null = null, y: number | null = null, source: ManaSource = "other") {
    this.mana += amount;
    this.manaGained += amount;
    this.emit({ type: "mana", t: this.now, amount, x, y, source });
  }

  // ---------------------------------------------------------------- monsters

  private updateMonster(m: SimMonster, dt: number) {
    const now = this.now;
    if (m.intro > 0) m.intro -= dt;
    else if (m.pinned !== null) m.dist = m.pinned;
    else m.dist += m.speed(now) * dt;

    m.poison = m.poison.filter((p) => p.until > now);
    for (const p of m.poison) if (!m.dead) this.hurt(m, p.dps * dt, p.src, { sure: true, quiet: true });
    if (m.burn.until > now && !m.dead) this.hurt(m, m.burn.dps * dt, m.burn.src, { sure: true, quiet: true });
  }

  /** Apply damage; returns true if it killed. */
  private hurt(m: SimMonster, amount: number, src: Source, opts: { sure?: boolean; quiet?: boolean; perks?: readonly ActivePerk[]; crit?: boolean; color?: string } = {}) {
    if (m.dead) return false;
    if (this.now < m.shieldUntil) {
      this.blocked += amount;
      if (!opts.quiet) this.callout("block", "BLOCK", "#9fb4ff", m.pos.x, m.pos.y - 20);
      return false;
    }
    if (!opts.sure && m.boss?.block && this.rand() < m.boss.block) {
      this.blocked += amount;
      if (!opts.quiet) this.callout("block", "BLOCK", "#9fb4ff", m.pos.x, m.pos.y - 20);
      return false;
    }
    if (!opts.sure && m.boss?.evade && this.rand() < m.boss.evade) {
      this.dodged++;
      if (!opts.quiet) this.callout("dodge", "MISS", "#dddddd", m.pos.x, m.pos.y - 20);
      return false;
    }
    const perks = opts.perks ?? [];
    if (!opts.sure && m.has("dodge") && dodgeChance(perks) > 0 && this.rand() < dodgeChance(perks)) {
      this.dodged++;
      this.callout("dodge", "MISS", "#dddddd", m.pos.x, m.pos.y - 20);
      return false;
    }
    let dmg = amount * (1 + m.curse) * perkMult(perks, m);
    if (m.has("armored")) dmg *= armorMult(perks);
    if (opts.crit && !opts.quiet) this.view({ type: "bighit", t: this.now, target: m.uid, x: m.pos.x, y: m.pos.y - 24, dmg, color: opts.color ?? "#ffd93b" });
    const dealt = Math.min(Math.max(0, m.hp), dmg);
    if (src === "hero") this.heroDamage += dealt;
    else this.damageBySlot[src] += dealt;
    m.hp -= dmg;
    if (m.hp <= 0) {
      this.kill(m, src);
      if (plunderMana(perks) > 0) this.gainMana(plunderMana(perks), m.pos.x, m.pos.y - 40, "plunder");
      return true;
    }
    return false;
  }

  private kill(m: SimMonster, src: Source) {
    if (m.dead) return;
    m.dead = m.gone = true;
    this.kills++;
    if (src !== "hero") this.killsBySlot[src]++;
    this.gainMana(m.mana, null, null, "kill");
    const p = m.pos;
    this.emit({ type: "kill", t: this.now, uid: m.uid, id: m.id, boss: !!m.boss, x: p.x, y: p.y, mana: m.mana, slot: src });
    if (m.boss) {
      this.counts.bossesKilled++;
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
        const children: number[] = [];
        for (const off of SPLIT_COUNT[m.def.id] === 3 ? [-24, 0, 24] : [-18, 18]) {
          const c = this.spawn({ def: child }, { path: m.path, dist: Math.max(0, m.dist + off) }, 0.7, 0.35);
          c.mana = 3;
          children.push(c.uid);
        }
        this.emit({ type: "split", t: this.now, uid: m.uid, kind: "splitter", children, x: p.x, y: p.y });
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
    this.emitLeak(m, lost);
    if (this.lives <= 0) this.finish("lost");
  }

  /** The leak event (`lost` is lives in solo, HP in PvP). */
  protected emitLeak(m: SimMonster, lost: number) {
    const f = m.foot;
    this.emit({ type: "leak", t: this.now, uid: m.uid, id: m.id, boss: !!m.boss, x: f.x, y: f.y, livesLost: lost, lives: this.lives });
  }

  /** Units a boss power may hit (shuffled with the run's random numbers), at most `n`. */
  private someUnits(n: number) {
    const units = this.units.filter((u): u is SimUnit => !!u && !u.dragging);
    for (let i = units.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [units[i], units[j]] = [units[j], units[i]];
    }
    return units.slice(0, n);
  }

  /** An Aegis Knight next to `u` makes it immune to debuffs. */
  private shielded(u: SimUnit) {
    return neighbours(u.slot).some((j) => this.units[j]?.primary === "aegis");
  }

  /** Put a debuff on a unit; false when an Aegis Knight protects it. */
  private afflict(u: SimUnit, kind: "irritation" | "fatigue" | "shellshock" | "entangle", time: number, miss = EFFECTS.irritate.miss, loud = false) {
    if (this.shielded(u)) return false;
    const s = u.status;
    const until = this.now + time;
    // Shellshock shows a flash on a unit that wasn't shocked yet; boss powers show every landing.
    if (loud || (kind === "shellshock" && this.now >= s.shockedUntil)) this.emit({ type: "afflict", t: this.now, uid: u.uid, kind, x: u.x, y: u.y - 40 });
    if (kind === "irritation") {
      s.irritatedUntil = Math.max(s.irritatedUntil, until);
      s.miss = miss;
    } else if (kind === "fatigue") s.fatiguedUntil = Math.max(s.fatiguedUntil, until);
    else if (kind === "entangle") s.entangledUntil = Math.max(s.entangledUntil, until);
    else s.shockedUntil = Math.max(s.shockedUntil, until);
    return true;
  }

  /** Chaos Taffy: tethers the nearest unit, which has Fatigue until the taffy dies. */
  private updateTethers() {
    this.tethers.length = 0;
    for (const m of this.monsters) {
      if (m.gone || !m.has("tether") || m.intro > 0 || m.dist < this.targetFrom) continue;
      const mp = m.pos;
      let best: SimUnit | null = null;
      let bestD = Infinity;
      for (const u of this.units) {
        if (!u || u.dragging) continue;
        const d = Math.hypot(u.x - mp.x, u.y - mp.y);
        if (d < bestD) [best, bestD] = [u, d];
      }
      const u = best as SimUnit | null;
      if (!u || !this.afflict(u, "fatigue", 0.25)) continue;
      this.tethers.push({ monster: m, unit: u });
    }
  }

  private minions(m: SimMonster, count: number, at = m.dist, spread = 35) {
    const def = MONSTER_BY_ID[m.boss?.minion ?? ""];
    if (!def) return;
    const children: number[] = [];
    for (let i = 0; i < count; i++) children.push(this.spawn({ def }, { path: m.path, dist: Math.max(0, at - 20 - i * spread) }, 0.9, 0.8).uid);
    const p = m.pos;
    this.emit({ type: "split", t: this.now, uid: m.uid, kind: "boss", children, x: p.x, y: p.y });
  }

  /** HP stages of split, layers and portal bosses (each quarter, or third, of HP lost). */
  private bossStages(m: SimMonster) {
    const b = m.boss!;
    if (b.power !== "split" && b.power !== "layers" && b.power !== "portal") return;
    const parts = b.power === "portal" ? 3 : 4;
    const stage = Math.min(parts - 1, Math.floor((1 - Math.max(0, m.hp) / m.maxHp) * parts));
    while (m.stage < stage && !m.dead) {
      m.stage++;
      const text = b.power === "split" ? "SPLIT!" : b.power === "portal" ? "BLINK!" : m.stage >= 3 ? "THE CORE!" : "LAYER BROKEN!";
      const from = m.pos;
      if (b.power === "split") this.minions(m, 3, m.dist + 40);
      else if (b.power === "portal") m.dist = Math.min(m.path.length * 0.85, m.dist + 220);
      else {
        m.speedMult *= 1.15;
        for (const u of this.someUnits(b.targets ?? 3)) this.afflict(u, "shellshock", 1.5);
        this.minions(m, 4, m.dist + 60, 30);
      }
      this.emit({ type: "boss_stage", t: this.now, uid: m.uid, id: m.id, power: b.power, stage: m.stage, text, x: from.x, y: from.y });
      this.log(`${b.name}: stage ${m.stage}`, "boss");
    }
  }

  /** A `[min, max]` count picked with the run's random numbers. */
  private count(n: BossSkill["n"]) {
    return Array.isArray(n) ? n[0] + Math.floor(this.rand() * (n[1] - n[0] + 1)) : n;
  }

  /** v2.1 boss skills, each on its own timer (see BossSkill). */
  private bossSkills(m: SimMonster, dt: number) {
    const b = m.boss!;
    const skills = b.skills ?? [];
    for (let i = 0; i < skills.length; i++) {
      const k = skills[i];
      if (k.uses !== undefined && m.skillUsed[i] >= k.uses) continue;
      m.skillAt[i] -= dt;
      if (m.skillAt[i] > 0) continue;
      m.skillAt[i] = k.every;
      if (k.kind === "sapling_trail" && m.speed(this.now) <= 0) continue;
      m.skillUsed[i]++;
      const p = m.pos;
      const n = this.count(k.n);
      const say = (text: string) => this.emit({ type: "boss_skill", t: this.now, uid: m.uid, id: m.id, skill: k.kind, text, x: p.x, y: p.y });
      switch (k.kind) {
        case "sapling_trail":
          this.minions(m, n, m.dist, 30);
          break;
        case "entangle": {
          const free = this.someUnits(99).filter((u) => this.now >= u.status.entangledUntil).slice(0, n);
          say(b.rally ? "BLIGHT ROOT" : "ENTANGLE");
          // Until the wave ends (cleared when the next wave starts, or by the charge).
          for (const u of free) this.afflict(u, "entangle", 1e6, 0, true);
          this.log(`${b.name} entangles ${free.length} units`, "boss");
          break;
        }
        case "impale":
          say("IMPALE");
          for (const u of this.someUnits(n)) this.afflict(u, "shellshock", k.dur ?? 5, 0, true);
          this.log(`${b.name} impales ${n} unit(s) (${k.dur ?? 5}s)`, "boss");
          break;
        case "volley": {
          say("VOLLEY");
          let hits = 0;
          for (const u of this.someUnits(n)) {
            if (this.rand() < (k.miss ?? 0.5)) this.callout("miss", "MISS", "#dddddd", u.x, u.y - 40);
            else if (this.afflict(u, "shellshock", k.dur ?? 2, 0, true)) hits++;
          }
          this.log(`${b.name} looses a volley (${hits}/${n} hit)`, "boss");
          break;
        }
      }
    }
  }

  /** v2.1 story charge (see BossRally): pushed back to the start, hurt, faster, no more powers. */
  private rally(m: SimMonster) {
    const r = m.boss!.rally!;
    m.rallied = true;
    const from = m.foot;
    m.dist = 0;
    m.hasteUntil = m.shieldUntil = 0;
    const damage = Math.max(0, m.hp) * r.damage;
    m.hp -= damage;
    m.speedMult *= r.speed;
    for (const u of this.units) if (u) u.status.entangledUntil = 0;
    this.emit({ type: "rally", t: this.now, uid: m.uid, id: m.id, from, to: m.foot, damage });
    this.log(`Allies charge ${m.boss!.name} back to the start (-${Math.round(r.damage * 100)}% health)`, "boss");
  }

  private bossPower(m: SimMonster) {
    const b = m.boss!;
    const p = m.pos;
    const power: BossPower = b.rage && m.hp < m.maxHp / 2 ? b.rage : b.power;
    const targets = b.targets ?? 3;
    const say = (text: string) => this.emit({ type: "boss_power", t: this.now, uid: m.uid, id: m.id, power, text, x: p.x, y: p.y });
    switch (power) {
      case "charm":
        say("CHARM");
        for (const u of this.someUnits(targets)) this.afflict(u, "irritation", EFFECTS.irritate.time * 1.5, EFFECTS.irritate.miss, true);
        this.log(`${b.name} charms ${targets} units`, "boss");
        this.mark("text", p.x, p.y - 60, "#ff9ae6", { text: "CHARM" });
        break;
      case "roar":
        if (m.hp >= m.maxHp / 2) break;
        if (!m.roared) {
          m.roared = true;
          say("ROAR!");
          for (const u of this.someUnits(targets)) this.afflict(u, "shellshock", 2);
          this.log(`${b.name} roars`, "boss");
          this.mark("text", p.x, p.y - 60, "#ff8a3b", { text: "ROAR" });
        } else {
          say("RAGE");
          m.hasteUntil = this.now + 3;
        }
        break;
      case "layers":
        if (m.stage >= 3) {
          say("CHAOS PULSE");
          for (const u of this.units) if (u && !u.dragging) this.afflict(u, "irritation", EFFECTS.irritate.time * 1.5);
        } else this.minions(m, 2);
        break;
      case "portal": {
        // A portal opens further along the path; its minions step out 0.6 s later (if the boss still lives).
        const at = Math.min(m.path.length * 0.85, m.dist + 180 + this.rand() * 220);
        const spot = m.path.at(at);
        this.portals.push({ at: this.now + 0.6, boss: m, dist: at + 40 });
        say("PORTAL");
        this.emit({ type: "portal", t: this.now, uid: m.uid, x: spot.x, y: spot.y - 20, delay: 0.6 });
        this.log(`${b.name} opens a portal`, "boss");
        break;
      }
      case "summon": {
        const def = b.minion ? MONSTER_BY_ID[b.minion] : undefined;
        if (!def) break;
        say("SUMMON");
        const children: number[] = [];
        for (let i = 0; i < 3; i++) children.push(this.spawn({ def }, { path: m.path, dist: Math.max(0, m.dist - 30 - i * 35) }, 0.9, 0.8).uid);
        this.emit({ type: "split", t: this.now, uid: m.uid, kind: "boss", children, x: p.x, y: p.y });
        this.log(`${b.name} summons 3 ${def.name}`, "boss");
        break;
      }
      case "heal": {
        say("HEAL");
        const before = m.hp;
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.08);
        this.log(`${b.name} heals ${Math.round(((m.hp - before) / m.maxHp) * 100)}%`, "boss");
        this.mark("text", p.x, p.y - 60, "#7dff7a", { text: "HEAL" });
        break;
      }
      case "haste":
        say("RAGE");
        m.hasteUntil = this.now + 3;
        this.log(`${b.name} rages (×1.8 speed for 3s)`, "boss");
        this.mark("text", p.x, p.y - 60, "#ff8a3b", { text: "RAGE" });
        break;
      case "shield":
        say("SHIELD");
        m.shieldUntil = this.now + 2.5;
        this.log(`${b.name} shields (2.5s)`, "boss");
        this.mark("text", p.x, p.y - 60, "#9fb4ff", { text: "SHIELD" });
        break;
      case "teleport":
        say("TELEPORT");
        m.dist = Math.min(m.path.length * 0.92, m.dist + 160);
        this.log(`${b.name} teleports ahead`, "boss");
        this.mark("text", m.pos.x, m.pos.y - 60, "#c58bff", { text: "TELEPORT" });
        break;
      case "freeze_units": {
        say("FREEZE");
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

  /** Seconds until the hero is ready (0 when ready or without a hero). */
  get heroLeft() {
    return this.hero ? Math.max(0, this.heroReadyAt - this.now) : 0;
  }

  /** The hero's power is ready (it may still hold fire with nothing to hit). */
  get heroReady() {
    return !!this.hero && this.now >= this.heroReadyAt;
  }

  /** Player cast: refused while recharging; haste and rage need no monsters, the rest do. */
  useHero() {
    return this.castHero(false);
  }

  /**
   * Cast the hero. `auto` is the auto-cast: it also holds haste and rage until there is something to
   * fight. Returns whether it fired.
   */
  protected castHero(auto = false) {
    const h = this.hero;
    if (!h || this.over || this.now < this.heroReadyAt) return false;
    const targets = this.monsters.filter((m) => !m.gone && m.intro <= 0);
    const needsTargets = h.power !== "mana" && (auto || (h.power !== "haste" && h.power !== "rage"));
    if (needsTargets && !targets.length) return false;
    this.heroReadyAt = this.now + h.cooldown;
    this.counts.heroCasts++;
    const now = this.now;
    const hpUnit = this.baseHp(Math.max(1, this.wave));
    switch (h.power) {
      case "meteor":
        for (const m of targets) this.hurt(m, h.amount * hpUnit, "hero", { sure: true, crit: true, color: "#c58bff" });
        break;
      case "storm":
        this.stormUntil = now + h.duration;
        this.stormTimer = 0;
        break;
      case "freeze":
        for (const m of targets) {
          m.frozenUntil = Math.max(m.frozenUntil, now + (m.boss ? h.duration / 3 : h.duration));
          if (h.amount > 0) this.hurt(m, h.amount * hpUnit, "hero", { sure: true, quiet: true });
        }
        break;
      case "slow":
        for (const m of targets) {
          m.slowPct = Math.max(m.slowUntil > now ? m.slowPct : 0, h.amount * (m.boss ? 0.5 : 1));
          m.slowUntil = now + h.duration;
        }
        break;
      case "mana":
        this.gainMana(Math.round(h.amount * (1 + 0.1 * this.wave)), 375, 640, "hero");
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
    this.emit({ type: "hero", t: this.now, power: h.power, ability: h.ability, auto });
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
    this.view({ type: "zap", t: this.now, kind: "storm", n: 0, x: m.pos.x, y: m.pos.y - 320, x2: m.pos.x, y2: m.pos.y, color: "#d9a3ff" });
    this.hurt(m, this.hero.amount * this.baseHp(Math.max(1, this.wave)), "hero", { sure: true });
  }

  // ---------------------------------------------------------------- player actions
  //
  // Every action returns false (and changes nothing) when it isn't allowed right now. They are
  // public so a scene or a PvP board can call them between steps; none of them logs by itself.

  /** Switch the hero's auto-cast on or off. */
  setAutoHero(on: boolean) {
    this.autoHero = on;
    return true;
  }

  /** Mark a unit as being dragged (it freezes and is skipped by neighbour effects and boss powers). */
  setDragging(slot: number, on: boolean) {
    const u = this.units[slot];
    if (!u) return false;
    u.dragging = on;
    return true;
  }

  /** Whether a summon would work now (mana and an empty tile). */
  get canSummon() {
    return this.mana >= this.summonCost && this.units.some((u) => !u) && this.deck.length > 0;
  }

  /**
   * Summon a deck unit onto an empty tile. `forced` picks the unit and/or tile (tutorial); with
   * none given, a pending `tutorialPick` is used once. Costs `summonCost`, which then grows.
   */
  summon(forced?: { id?: string; slot?: number }) {
    if (this.over) return false;
    const empty = this.units.map((u, i) => (u ? -1 : i)).filter((i) => i >= 0);
    if (!empty.length || this.mana < this.summonCost) return false;
    const tp = this.tutorialPick && !this.units[this.tutorialPick.slot] ? this.tutorialPick : null;
    const f = forced ?? tp;
    if ((f?.id && !UNIT_BY_ID[f.id]) || (!f?.id && !this.deck.length)) return false;
    this.tutorialPick = null;
    this.mana -= this.summonCost;
    this.summonCost += ECONOMY.summonCostStep;
    this.counts.summons++;
    const slot = f?.slot !== undefined && !this.units[f.slot] ? f.slot : empty[Math.floor(this.rand() * empty.length)];
    const id = f?.id ?? this.deck[Math.floor(this.rand() * this.deck.length)];
    const u = this.place(id, 1, slot);
    this.emit({ type: "summon", t: this.now, uid: u.uid, id, rank: 1, slot, x: u.x, y: u.y, awakened: u.awakened });
    return true;
  }

  /** Merge two same-id, same-rank units: one rank up on `to`, a random deck unit (or the same, with luck). */
  merge(from: number, to: number) {
    const x = this.units[from];
    const y = this.units[to];
    if (this.over || !x || !y || from === to || x.def.id !== y.def.id || x.rank !== y.rank || x.rank >= maxRank() || !this.deck.length) return false;
    this.units[from] = null;
    this.units[to] = null;
    // A Lucky Cat next to the merge may keep the unit (its own merges roll as usual).
    const luck = x.primary === "lucky" ? 0 : this.luckAt(to);
    const keep = luck > 0 && this.rand() < luck;
    if (keep) this.counts.lucky++;
    const u = this.place(keep ? x.def.id : this.deck[Math.floor(this.rand() * this.deck.length)], x.rank + 1, to);
    this.counts.merges++;
    if (u.awakened) this.counts.awakens++;
    this.emit({ type: "merge", t: this.now, uid: u.uid, gone: [x.uid, y.uid], id: u.def.id, rank: u.rank, slot: to, x: u.x, y: u.y, awakened: u.awakened, lucky: keep });
    if (keep) this.callout("lucky", "LUCKY!", "#ffd93b", u.x, u.y - 60, u.uid);
    return true;
  }

  /** Mime `from` becomes a copy of the same-rank unit on `to`. */
  copy(from: number, to: number) {
    const x = this.units[from];
    const y = this.units[to];
    if (this.over || !x || !y || from === to || !this.mimeReady(from) || !canBecome(x, y)) return false;
    const v = this.become(x, y.def.id, x.rank, "copy");
    this.counts.copies++;
    this.callout("copy", "COPY!", "#ff9ae6", v.x, v.y - 60, v.uid);
    return true;
  }

  /** Portal Imp `from` trades places with the same-rank, different-id unit on `to`. */
  swap(from: number, to: number) {
    const x = this.units[from];
    const y = this.units[to];
    if (this.over || !x || !y || from === to || !this.portalReady(from) || y.rank !== x.rank || y.def.id === x.def.id) return false;
    x.moveTo(to, slotPos(this.arena, to));
    y.moveTo(from, slotPos(this.arena, from));
    x.dragging = y.dragging = false;
    this.units[to] = x;
    this.units[from] = y;
    x.timer = portalCooldown(x.rank, this.supportMult(x), x.fx);
    y.rushUntil = this.now + x.fx.portal.rushTime;
    this.counts.swaps++;
    this.recomputeBuffs();
    this.emit({ type: "swap", t: this.now, uid: x.uid, other: y.uid, from, to });
    this.callout("rush", "RUSH!", "#ff8a3b", y.x, y.y - 60, y.uid);
    return true;
  }

  /** Portal Imp `from` jumps to the empty tile `to`. */
  hop(from: number, to: number) {
    const x = this.units[from];
    if (this.over || !x || to < 0 || to >= 15 || this.units[to] || !this.portalReady(from)) return false;
    x.moveTo(to, slotPos(this.arena, to));
    x.dragging = false;
    this.units[to] = x;
    this.units[from] = null;
    x.timer = portalCooldown(x.rank, this.supportMult(x));
    this.counts.swaps++;
    this.recomputeBuffs();
    this.emit({ type: "swap", t: this.now, uid: x.uid, other: null, from, to });
    return true;
  }

  /** Buy the next power-up level of a deck unit (every unit of that id on the board gets stronger). */
  powerUp(id: string) {
    const lvl = this.powerUps[id];
    if (this.over || lvl === undefined || lvl >= maxPowerUp() || this.mana < powerUpCost(lvl)) return false;
    this.mana -= powerUpCost(lvl);
    this.powerUps[id] = lvl + 1;
    for (const u of this.units) {
      if (u?.def.id === id) Object.assign(u.stats, boardUnitStats({ id: u.def.id, rank: u.rank, awakened: u.awakened }, this.levelOf(id), lvl + 1));
    }
    if (noAttack(unitPrimary(id))) this.recomputeBuffs();
    this.emit({ type: "powerup", t: this.now, id, level: lvl + 1 });
    return true;
  }

  /** Whether the Mime on `slot` has been on the board long enough to copy. */
  mimeReady(slot: number) {
    const u = this.units[slot];
    return !!u && u.primary === "mime" && u.timer >= mimePrep(this.supportMult(u), u.fx);
  }

  /** Whether the Portal Imp on `slot` has recharged. */
  portalReady(slot: number) {
    const u = this.units[slot];
    return !!u && u.primary === "portal" && u.timer <= 0;
  }

  /** How far a support unit's timer has run (1 = ready), or null for units without one (for the ring). */
  supportProgress(slot: number) {
    const u = this.units[slot];
    if (!u) return null;
    const m = this.supportMult(u);
    switch (u.primary) {
      case "mime":
        return Math.min(1, u.timer / mimePrep(m, u.fx));
      case "portal":
        return u.timer <= 0 ? 1 : 1 - u.timer / portalCooldown(u.rank, m, u.fx);
      case "mirror":
        return u.timer / mirrorInterval(u.rank, m, u.fx);
      default:
        return null;
    }
  }

  /** The best Lucky Cat chance next to tile `slot` (0 without one). */
  luckAt(slot: number) {
    let best = 0;
    for (const j of neighbours(slot)) {
      const c = this.units[j];
      if (c?.primary === "lucky") best = Math.max(best, luckyChance(c.rank, this.supportMult(c), c.fx));
    }
    return best;
  }

  /** Power-up level bought for a deck unit id (0 outside the deck). */
  powerLevel(id: string) {
    return this.powerUps[id] ?? 0;
  }

  // ---------------------------------------------------------------- scripted pieces

  /** Story barks (a speech line some seconds after a wave starts). */
  private updateBarks() {
    const due = this.barks.filter((b) => b.at <= this.now);
    if (!due.length) return;
    this.barks = this.barks.filter((b) => b.at > this.now);
    for (const b of due) this.emit({ type: "bark", t: this.now, who: b.line.who, text: b.line.text });
  }

  /** Portal boss minions step out 0.6 s after the portal opened, if the boss still lives. */
  private updatePortals() {
    const due = this.portals.filter((p) => p.at <= this.now);
    if (!due.length) return;
    this.portals = this.portals.filter((p) => p.at > this.now);
    for (const p of due) if (!p.boss.dead) this.minions(p.boss, 3, p.dist, 30);
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
    // A dragged unit does nothing at all (no timers, no pulses, no attacks).
    if (u.dragging) return;
    if (now < u.frozenUntil || now < u.status.shockedUntil || now < u.status.entangledUntil) return;
    u.alive += dt;
    if (kitHas(u.def, "irritate")) {
      u.effectTimer += dt;
      if (u.effectTimer >= u.fx.irritate.every) {
        u.effectTimer = 0;
        let any = false;
        for (const j of neighbours(u.slot)) {
          const v = this.units[j];
          if (v && !v.dragging && this.afflict(v, "irritation", u.fx.irritate.time, u.fx.irritate.miss)) any = true;
        }
        if (any) this.callout("tsk", "TSK!", "#ff6a6a", u.x, u.y - 60, u.uid);
      }
    }
    if (kitHas(u.def, "lantern")) {
      u.effectTimer += dt;
      if (u.effectTimer >= u.fx.lantern.every) {
        u.effectTimer = 0;
        this.gainMana(lanternMana(this.units.filter((v) => v && isKnight(v.def)).length, u.fx), u.x, u.y - 50, "lantern");
      }
    }
    if (u.primary === "buff" || u.primary === "aura" || u.primary === "aegis") return;
    if (isSupport(u.primary)) return this.updateSupport(u, dt);
    if (u.primary === "mana") {
      u.pulse += dt;
      if (u.pulse >= u.fx.mana.every) {
        u.pulse = 0;
        this.gainMana(manaPerPulse(u.rank, u.fx), u.x, u.y - 50, "pulse");
      }
    }
    if (u.awakened) {
      u.ult += dt * (1 + u.charge);
      if (u.ult >= ECONOMY.ultimateCooldown) {
        const target = u.primary === "mana" ? null : this.pickTarget(u.primary === "sniper" ? "strongest" : "first");
        if (target || u.primary === "mana") {
          u.ult = 0;
          this.ultimate(u, target);
          u.cooldown = Math.max(u.cooldown, 0.5);
          return;
        }
      }
    }
    const rate = u.stats.speed * (1 + this.hasteOf(u)) * (now < u.status.fatiguedUntil ? 1 - u.fx.fatigue.slow : 1);
    u.cooldown -= dt;
    if (u.cooldown > 0 || u.sulking) return;
    const target = this.pickTarget(u.primary === "sniper" ? "strongest" : "first");
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
      (kitHas(u.def, "oath") ? u.fx.oath.speedPerKnight * this.adjacentKnights(u) : 0)
    );
  }

  private adjacentKnights(u: SimUnit) {
    return neighbours(u.slot).filter((j) => this.units[j] && isKnight(this.units[j]!.def)).length;
  }

  /** Support timers run faster with haste (buff units, the hero, a war cry). */
  private updateSupport(u: SimUnit, dt: number) {
    const t = dt * (1 + this.hasteOf(u));
    const mult = this.supportMult(u);
    switch (u.primary) {
      case "mime":
        u.timer += t;
        break;
      case "portal":
        u.timer = Math.max(0, u.timer - t);
        break;
      case "mirror": {
        const every = mirrorInterval(u.rank, mult, u.fx);
        u.timer = Math.min(every, u.timer + t);
        if (u.timer < every) break;
        const options = neighbours(u.slot)
          .map((j) => this.units[j])
          .filter((v): v is SimUnit => !!v && !v.dragging && canBecome(u, v));
        if (!options.length) break;
        const v = options[Math.floor(this.rand() * options.length)];
        this.log(`Mirror Slime turned into ${v.def.name}`, "unit");
        this.mark("text", u.x, u.y - 60, "#d9b3ff", { text: "MIRROR" });
        const w = this.become(u, v.def.id, u.rank, "mirror");
        this.callout("mirror", "MIRROR!", "#d9b3ff", w.x, w.y - 60, w.uid);
        break;
      }
      case "brewer":
        u.pulse += t;
        if (u.pulse >= u.fx.brewer.every) {
          u.pulse = 0;
          u.firedAt = this.now;
          const m = brewMana(u.rank, mult * this.brewMult(), u.fx);
          if (this.o.bubbles && this.mode !== "pvp") {
            // Solo: the mana waits in a bubble. Tap it (collectBrew) for +tapBonus, or it pops by itself.
            const b = { id: ++this.bubbleId, unit: u, amount: m, at: this.now, expires: this.now + u.fx.brewer.tapWindow, x: u.x + 28, y: u.y - 64 };
            this.bubbles.push(b);
            this.emit({ type: "brew", t: this.now, bubble: b.id, uid: u.uid, slot: u.slot, amount: m, x: b.x, y: b.y });
            break;
          }
          this.gainMana(m, u.x, u.y - 60, "brew");
          this.counts.brewed += m;
          this.mark("text", u.x, u.y - 60, "#7fd8ff", { text: `+${m}` });
        }
        break;
    }
  }

  /** Tap a brew bubble: +tapBonus mana. False when it is gone (already popped or collected). */
  collectBrew(id: number) {
    return this.popBubble(id, true);
  }

  private popBubble(id: number, tapped: boolean) {
    const i = this.bubbles.findIndex((b) => b.id === id);
    if (i < 0 || this.over) return false;
    const b = this.bubbles[i];
    this.bubbles.splice(i, 1);
    const m = tapped ? Math.round(b.amount * (1 + b.unit.fx.brewer.tapBonus)) : b.amount;
    const x = b.x;
    const y = b.y;
    this.counts.brewed += m;
    this.gainMana(m, x, y, "brew");
    this.mark("text", b.unit.x, b.unit.y - 60, "#7fd8ff", { text: `+${m}` });
    this.emit({ type: "brew_collect", t: this.now, bubble: b.id, uid: b.unit.uid, tapped, amount: m, x, y });
    return true;
  }

  /** Bubbles that waited out the tap window pop by themselves. */
  private updateBubbles() {
    for (const b of [...this.bubbles]) if (this.now >= b.expires) this.popBubble(b.id, false);
  }

  /** Echo Spirits next to a unit that just fired its ultimate repeat it (the strongest one only). */
  private queueEcho(u: SimUnit, x: number, y: number, damage: number, mana: number) {
    let best = 0;
    for (const j of neighbours(u.slot)) {
      const v = this.units[j];
      if (v?.primary === "echo") best = Math.max(best, echoStrength(v.rank, this.supportMult(v), v.fx));
    }
    if (best > 0) this.echoes.push({ at: this.now + u.fx.echo.delay, unit: u, x, y, damage: damage * best, mana: Math.round(mana * best) });
  }

  private updateEchoes() {
    const due = this.echoes.filter((e) => e.at <= this.now);
    if (!due.length) return;
    this.echoes = this.echoes.filter((e) => e.at > this.now);
    for (const e of due) {
      this.mark("text", e.x, e.y - 70, "#9ff0ff", { text: "ENCORE" });
      this.emit({ type: "encore", t: this.now, x: e.x, y: e.y, radius: ECONOMY.ultimateRadius, strike: e.damage > 0 });
      if (e.mana) this.gainMana(e.mana, e.x, e.y - 30, "echo");
      // The caster is gone (merged away, copied over, turned): no encore strike.
      if (!e.damage || this.units[e.unit.slot] !== e.unit) continue;
      this.mark("ring", e.x, e.y, "#9ff0ff", { x2: ECONOMY.ultimateRadius });
      for (const m of this.nearby({ x: e.x, y: e.y }, ECONOMY.ultimateRadius)) this.applyHit(e.unit, e.damage, m);
    }
  }

  private ultimate(u: SimUnit, target: SimMonster | null) {
    if (u.primary === "mana" || !target) {
      const mana = Math.round(u.fx.mana.ultimateBase + u.fx.mana.ultimatePerWave * this.wave);
      this.gainMana(mana, u.x, u.y - 60, "ultimate");
      this.emit({ type: "ultimate", t: this.now, uid: u.uid, kind: "mana", x: u.x, y: u.y, radius: 0 });
      this.queueEcho(u, u.x, u.y, 0, mana);
      return;
    }
    const center = target.pos;
    this.emit({ type: "ultimate", t: this.now, uid: u.uid, kind: "strike", x: center.x, y: center.y, radius: ECONOMY.ultimateRadius });
    const damage = u.stats.damage * this.heroDamageMult * this.heraldMult * ECONOMY.ultimateDamageMult;
    this.queueEcho(u, center.x, center.y, damage, 0);
    this.mark("ring", center.x, center.y, "#ffd93b", { x2: ECONOMY.ultimateRadius });
    this.mark("text", center.x, center.y - 70, "#ffd93b", { text: "ULTIMATE" });
    for (const m of this.nearby(center, ECONOMY.ultimateRadius)) this.applyHit(u, damage, m);
  }

  private fire(u: SimUnit, target: SimMonster) {
    const now = this.now;
    // Irritation: the attack may miss.
    if (now < u.status.irritatedUntil && this.rand() < u.status.miss) {
      this.callout("miss", "MISS", "#ff9090", u.x, u.y - 70, u.uid);
      return;
    }
    if (kitHas(u.def, "rally") || kitHas(u.def, "fatigue")) {
      for (const j of neighbours(u.slot)) {
        const v = this.units[j];
        if (!v || v.dragging) continue;
        if (kitHas(u.def, "fatigue")) this.afflict(v, "fatigue", u.fx.fatigue.linger);
        else if (!noAttack(v.primary)) {
          if (now >= v.status.rallyUntil) this.callout("rally", "RALLY!", "#ffd93b", v.x, v.y - 60, v.uid);
          v.status.rallyUntil = now + u.fx.rally.time;
        }
      }
    }
    let damage = u.stats.damage * this.heroDamageMult * this.heraldMult * (1 + u.auraDamage);
    if (kitHas(u.def, "oath")) damage *= 1 + u.fx.oath.perKnight * this.adjacentKnights(u);
    if (kitHas(u.def, "fatigue")) damage *= 1 + u.fx.fatigue.perMercenary * this.units.filter((v) => v && isMercenary(v.def)).length;
    if (kitHas(u.def, "growth")) damage *= growthMult(u.alive, u.fx);
    const from = { x: u.x, y: u.y - 30 };
    if (u.primary === "chain") return this.chainLightning(u, target, damage, from);
    this.shots.push({ unit: u, damage, target, x: from.x, y: from.y, aim: target.pos, speed: u.primary === "sniper" ? u.fx.sniper.shotSpeed : 1100 });
  }

  private chainLightning(u: SimUnit, first: SimMonster, damage: number, from: Pt) {
    const e = u.fx;
    const jumps = chainJumps(u.rank, rarityIndex(u.def.rarity), e);
    const hit: SimMonster[] = [first];
    let cur = first;
    while (hit.length < jumps) {
      let next: SimMonster | null = null;
      let bestD = e.chain.range;
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
    const zapColor = u.def.element === "lightning" ? "#fff27a" : "#9ff0ff";
    hit.forEach((m, n) => {
      this.mark("zap", p.x, p.y, zapColor, { x2: m.pos.x, y2: m.pos.y });
      this.view({ type: "zap", t: this.now, kind: "chain", n, x: p.x, y: p.y, x2: m.pos.x, y2: m.pos.y, color: zapColor });
      p = m.pos;
    });
    // The bolt lands like any other attack: kit riders apply to every monster it hit.
    this.applyHit(u, damage, first, hit);
  }

  /** Up to `jumps` more monsters, each the nearest within chain range of the last, skipping `skip`. */
  private chainOn(first: SimMonster, skip: SimMonster[], jumps: number, range: number) {
    const out: SimMonster[] = [];
    let cur = first;
    while (out.length < jumps) {
      let next: SimMonster | null = null;
      let bestD = range;
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
        else this.emit({ type: "shot_lost", t: this.now, uid: s.unit.uid, x: s.aim.x, y: s.aim.y });
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

  /**
   * One attack landing on `m` (a shot arriving, an ultimate or echo strike, or `chain`: the monsters
   * a chain lightning hit, `m` first). Three steps, all read from the unit's kit:
   *  1. Pre-hit riders roll once for the whole attack: crit (multiplies all its damage) and execute
   *     (replaces the main target's hit).
   *  2. The attack archetype (kit[0]) decides who is hit: splash adds the monsters around the target,
   *     pierce the ones behind it (and a Lance Knight's chain), chain its lightning path; shot, sniper
   *     and mana hit the target only.
   *  3. The post-hit riders apply, in kit order, to every monster the attack hit (the main target
   *     first), each with its own rolls: slow, freeze, stun, poison, burn, curse. Poison and burn
   *     deal a share of the attack's damage whoever they land on.
   */
  private applyHit(u: SimUnit, baseDamage: number, m: SimMonster, chain?: SimMonster[]) {
    const def = u.def;
    const rank = u.rank;
    const src = u.slot;
    const e = u.fx;
    const now = this.now;
    const rarityIdx = rarityIndex(def.rarity);
    const chained = !!chain && u.primary === "chain";
    const bane = (o: SimMonster) => (kitHas(def, "bane") && o.boss?.corrupted ? baseDamage * (1 + e.bane.bossBonus) : baseDamage);
    // Rogue Knight: nearly every blow crits.
    const rogue = kitHas(def, "irritate") && this.rand() < e.irritate.critChance;
    let damage = bane(m) * (rogue ? e.irritate.critMult : 1);
    if (kitHas(def, "shellshock") && this.units[u.slot] === u && this.rand() < e.shellshock.chance) {
      const near = neighbours(u.slot).map((j) => this.units[j]).filter((v): v is SimUnit => !!v && !v.dragging);
      const v = near[Math.floor(this.rand() * near.length)];
      if (v && this.afflict(v, "shellshock", e.shellshock.time)) this.callout("shellshock", "SHELLSHOCK", "#c9b08a", v.x, v.y - 60, v.uid);
    }
    const pos = m.pos;
    const isBoss = !!m.boss;
    let vfxSize = 70;
    if (!chained) this.mark("hit", pos.x, pos.y, ELEMENT_CSS[def.element]);

    // 1. Pre-hit riders, in kit order.
    let cm = 1;
    let critHit = false;
    let exec = false;
    for (const s of def.kit) {
      if (s.arch === "crit" && this.rand() < critChance(rank, e)) {
        critHit = true;
        cm = critMult(rank, e);
        damage *= cm;
      } else if (s.arch === "execute") exec = this.rand() < executeChance(rank, rarityIdx, e);
    }

    // 2. The attack.
    const hits: SimMonster[] = [];
    const hit = (o: SimMonster, amount: number, opts: { sure?: boolean; quiet?: boolean; crit?: boolean; color?: string } = {}) => {
      hits.push(o);
      this.hurt(o, amount, src, { perks: u.perks, crit: rogue || critHit, ...opts });
    };
    const mainHit = () => {
      if (exec) {
        vfxSize = 130;
        if (isBoss) {
          this.mark("text", pos.x, pos.y - 30, "#ff7ad9", { text: `×${e.execute.bossMult}`, slot: src, callout: `×${e.execute.bossMult}` });
          this.callout("execute", `×${e.execute.bossMult}`, "#ff7ad9", u.x, u.y - 60, u.uid);
          hit(m, damage * e.execute.bossMult, { crit: true, color: "#ff7ad9" });
        } else {
          this.mark("text", pos.x, pos.y - 30, "#ff7ad9", { text: "EXECUTE", slot: src, callout: "EXECUTE" });
          this.callout("execute", "EXECUTE", "#ff7ad9", u.x, u.y - 60, u.uid);
          this.view({ type: "proc", t: now, kind: "execute", x: pos.x, y: pos.y - 30 });
          hit(m, m.hp / (1 + m.curse) / (m.has("armored") ? armorMult(u.perks) : 1) + 1, { sure: true });
        }
      } else if (u.primary === "sniper") {
        vfxSize = 120;
        hit(m, damage, { crit: true, color: "#ffffff" });
      } else hit(m, damage);
    };
    switch (u.primary) {
      case "splash": {
        const radius = splashRadius(rank, e);
        const around = this.nearby(pos, radius, m);
        mainHit();
        for (const o of around) hit(o, damage * e.splash.splash, { sure: true, quiet: true });
        this.mark("ring", pos.x, pos.y, ELEMENT_CSS[def.element], { x2: radius });
        vfxSize = Math.max(vfxSize, 130 + rank * 6);
        break;
      }
      case "pierce": {
        mainHit();
        const behind = this.nearby(pos, e.pierce.range, m)
          .sort((a, b) => Math.hypot(a.pos.x - pos.x, a.pos.y - pos.y) - Math.hypot(b.pos.x - pos.x, b.pos.y - pos.y))
          .slice(0, pierceTargets(rank, e));
        for (const o of behind) {
          this.view({ type: "hit", t: now, uid: u.uid, target: o.uid, kind: "pierce", element: def.element, x: o.pos.x, y: o.pos.y, size: 50 });
          hit(o, damage * e.pierce.damage, { sure: true });
        }
        // Lance Knight: the hit also chains on to more monsters.
        if (kitHas(def, "bane")) {
          let from = m.pos;
          this.chainOn(m, [m, ...behind], e.bane.chain, e.chain.range).forEach((o, i) => {
            this.view({ type: "zap", t: now, kind: "bane", n: i, x: from.x, y: from.y, x2: o.pos.x, y2: o.pos.y, color: "#fff27a" });
            from = o.pos;
            this.view({ type: "hit", t: now, uid: u.uid, target: o.uid, kind: "bane", element: def.element, x: o.pos.x, y: o.pos.y, size: 0 });
            hit(o, bane(o) * cm * Math.pow(e.chain.falloff, i + 1), { sure: true });
          });
        }
        break;
      }
      case "chain":
        if (chain) {
          chain.forEach((o, i) => {
            this.view({ type: "hit", t: now, uid: u.uid, target: o.uid, kind: "chain", element: def.element, x: o.pos.x, y: o.pos.y, size: 80 });
            if (i === 0) mainHit();
            else hit(o, damage * Math.pow(e.chain.falloff, i));
          });
          break;
        }
        mainHit();
        break;
      default:
        mainHit();
    }

    // 3. Post-hit riders, in kit order, on every monster the attack hit.
    for (const s of def.kit) {
      switch (s.arch) {
        case "slow":
          for (const o of hits) {
            if (!chills(u.perks, o) && def.element === "ice") continue;
            o.slowPct = Math.max(o.slowUntil > now ? o.slowPct : 0, slowAmount(rank, rarityIdx, !!o.boss, e));
            o.slowUntil = now + e.slow.duration;
          }
          break;
        case "freeze":
          for (const o of hits) {
            if (chills(u.perks, o) && this.rand() < freezeChance(rank, rarityIdx, e)) {
              o.frozenUntil = now + (o.boss ? e.freeze.bossDuration : e.freeze.duration);
              this.mark("text", o.pos.x, o.pos.y - 30, "#7fd8ff", { text: "FROZEN" });
              this.view({ type: "proc", t: now, kind: "frozen", x: o.pos.x, y: o.pos.y - 30 });
            }
          }
          break;
        case "stun":
          for (const o of hits) {
            if (this.rand() < stunChance(rank, rarityIdx, e)) {
              o.stunUntil = now + (o.boss ? e.stun.bossDuration : e.stun.duration);
              this.mark("text", o.pos.x, o.pos.y - 30, "#ffd93b", { text: "STUN" });
              this.view({ type: "proc", t: now, kind: "stun", x: o.pos.x, y: o.pos.y - 30 });
            }
          }
          break;
        case "poison":
          for (const o of hits) {
            o.poison.push({ dps: damage * e.poison.dps, until: now + e.poison.duration, src });
            while (o.poison.length > e.poison.maxStacks) o.poison.shift();
          }
          break;
        case "burn": {
          const burnDps = damage * e.burn.burnDps;
          for (const o of hits) {
            const keep = o.burn.until > now && o.burn.dps > burnDps;
            o.burn = keep ? { ...o.burn, until: now + e.burn.burnTime } : { dps: burnDps, until: now + e.burn.burnTime, src };
          }
          break;
        }
        case "curse":
          for (const o of hits) o.curse = Math.min(e.curse.max, o.curse + curseStep(rank, rarityIdx, e));
          break;
        case "crit":
          if (critHit) {
            vfxSize = 110;
            this.mark("text", pos.x, pos.y - 30, "#ffd93b", { text: "CRIT", slot: src, callout: `CRIT ×${+cm.toFixed(1)}` });
            this.callout("crit", `CRIT ×${+cm.toFixed(1)}`, "#ffd93b", u.x, u.y - 60, u.uid);
          }
          break;
      }
    }
    if (!chained) this.view({ type: "hit", t: now, uid: u.uid, target: m.uid, kind: "main", element: def.element, x: pos.x, y: pos.y, size: vfxSize });
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
