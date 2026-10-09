/**
 * The whole editable game balance as one JSON document. The server stores versions of
 * it, the admin panel edits it, and the game applies it at boot with applyConfig().
 */
import { DEFAULT_UNITS, UNITS, indexUnits, RARITY_STATS, RARITIES, CHEST_RARITIES, ELEMENTS, PROJECTILES, STYLE_IDS, WEAPON_KEYS, withAdded, withAddedUnits, withStyles, type UnitDef, type Rarity } from "./units.ts";
import { DEFAULT_MONSTERS, DEFAULT_BOSSES, MONSTERS, BOSSES, indexMonsters, TRAITS, BOSS_POWERS, BOSS_SKILLS, MINION_POWERS, ADDED_MONSTERS, ADDED_BOSSES, type MonsterDef, type BossDef } from "./monsters.ts";
import { DEFAULT_BOOK, DEFAULT_BOOK2, booksOf, booksProblems, setBooks, type BookDef } from "./stories.ts";
import { DEFAULT_ARENAS, ARENAS, indexArenas, type ArenaDef } from "./arenas.ts";
import { DEFAULT_ECONOMY, ECONOMY, DEFAULT_CHESTS, CHESTS, type Economy, type ChestDef } from "./economy.ts";
import { DEFAULT_HEROES, HEROES, indexHeroes, HERO_POWER_IDS, type HeroDef } from "./heroes.ts";
import { DEFAULT_LOGIN_REWARDS, DEFAULT_QUESTS, LOGIN_REWARDS, QUESTS, QUEST_GOAL_IDS, type QuestDef, type Reward } from "./daily.ts";
import { DEFAULT_LEAGUES, LEAGUES, type LeagueDef } from "./leagues.ts";
import { DEFAULT_EFFECTS, EFFECTS, effectProblems, withEffectDefaults, type Effects } from "./effects.ts";
import { DEFAULT_PERK_VALUES, PERK_VALUES, kitProblems, perkValueProblems, withKits, withPerkDefaults, type PerkValues } from "./kit.ts";
import { RACE_IDS, withRaces } from "./races.ts";
import { DEFAULT_EVENTS, DEFAULT_OFFERS, EVENTS, OFFERS, offerProblems, type EventDef, type OfferDef } from "./offers.ts";
import { DEFAULT_PVP, PVP, pvpProblems, type PvpConfig } from "./pvp.ts";

export interface GameConfig {
  units: UnitDef[];
  monsters: MonsterDef[];
  bosses: BossDef[];
  arenas: ArenaDef[];
  chests: ChestDef[];
  heroes: HeroDef[];
  /** Daily login calendar, one reward per day claimed. */
  loginRewards: Reward[];
  /** Pool the daily quests are drawn from. */
  quests: QuestDef[];
  /** Trophy leagues and their one-time promotion rewards. */
  leagues: LeagueDef[];
  /** Limited-time events (battle reward boosts, chest discounts). */
  events: EventDef[];
  /** Bundles sold in the shop. */
  offers: OfferDef[];
  economy: Economy;
  /** Archetype effect numbers (slow %, crit chance, chain jumps...). */
  effects: Effects;
  /** v2: default perk values (each unit's perks can override them). Filled from defaults if missing. */
  perks?: PerkValues;
  /** PvP rules, sends and matchmaking (see PVP.md). */
  pvp: PvpConfig;
  /** Story mode: the books of the saga, their stories, chapters and wave scripts. */
  books: BookDef[];
  /** Legacy (before multi-book): a saved config with only `book` becomes [book, Book 2]. */
  book?: BookDef;
  dropWeights: Record<Rarity, number>;
  /** Balance hotfixes already applied to this config (see HOTFIXES). */
  hotfixes?: string[];
}

/**
 * Balance hotfixes that change numbers a saved config already holds. A saved config keeps its
 * own values over the defaults, so on load each hotfix it hasn't had copies the listed fields
 * from the defaults once (withHotfixes), and is recorded so later admin edits stick.
 */
const HOTFIXES: Record<string, { units: Record<string, (keyof UnitDef)[]>; effects: Record<string, string[]> }> = {
  "1.2.1": {
    units: { rogue_knight: ["speed"], hired_blade: ["damage", "speed"], lantern_knight: ["kit"] },
    effects: { rally: ["time"], oath: ["perKnight"] },
  },
  // The Lucky Cat never attacks, so its neighbours' merges always keep their unit.
  "1.3.1": { units: {}, effects: { lucky: ["chance", "perRank", "max"] } },
};

export function withHotfixes(cfg: GameConfig): GameConfig {
  const done = new Set(cfg.hotfixes ?? []);
  const units = cfg.units.map((u) => ({ ...u }));
  const effects = structuredClone(cfg.effects) as unknown as Record<string, Record<string, unknown>>;
  const defEffects = DEFAULT_EFFECTS as unknown as Record<string, Record<string, unknown>>;
  for (const [id, fix] of Object.entries(HOTFIXES)) {
    if (done.has(id)) continue;
    done.add(id);
    for (const [unitId, fields] of Object.entries(fix.units)) {
      const u = units.find((x) => x.id === unitId) as Record<string, unknown> | undefined;
      const d = DEFAULT_UNITS.find((x) => x.id === unitId) as Record<string, unknown> | undefined;
      if (u && d) for (const f of fields) u[f] = d[f];
    }
    for (const [block, fields] of Object.entries(fix.effects)) for (const f of fields) if (effects[block]) effects[block][f] = defEffects[block][f];
  }
  return { ...cfg, units, effects: effects as unknown as Effects, hotfixes: [...done] };
}

export function defaultConfig(): GameConfig {
  return structuredClone({
    units: DEFAULT_UNITS,
    monsters: DEFAULT_MONSTERS,
    bosses: DEFAULT_BOSSES,
    arenas: DEFAULT_ARENAS,
    chests: DEFAULT_CHESTS,
    heroes: DEFAULT_HEROES,
    loginRewards: DEFAULT_LOGIN_REWARDS,
    quests: DEFAULT_QUESTS,
    leagues: DEFAULT_LEAGUES,
    events: DEFAULT_EVENTS,
    offers: DEFAULT_OFFERS,
    economy: DEFAULT_ECONOMY,
    effects: DEFAULT_EFFECTS,
    perks: DEFAULT_PERK_VALUES,
    pvp: DEFAULT_PVP,
    books: [DEFAULT_BOOK, DEFAULT_BOOK2],
    hotfixes: Object.keys(HOTFIXES),
    dropWeights: { common: 60, rare: 26, epic: 10, legendary: 3.5, mythic: 0.5, event: 0 },
  });
}

/** Configs saved before PvP existed (or before a newer rule) get the defaults filled in. */
export function withPvpDefaults(p: Partial<PvpConfig> | undefined): PvpConfig {
  return structuredClone({ rules: { ...DEFAULT_PVP.rules, ...p?.rules }, sends: p?.sends ?? DEFAULT_PVP.sends, tiers: p?.tiers ?? DEFAULT_PVP.tiers });
}

function replace<T>(target: T[], items: T[]) {
  target.length = 0;
  target.push(...structuredClone(items));
}

/** Swap the live tables for the ones in `cfg` (in place, so existing imports see them). */
export function applyConfig(cfg: GameConfig) {
  // v2: every unit gets its kit (a v1 unit derives it from its legacy fields, then loses them: see kit.ts).
  replace(UNITS, withKits(withAddedUnits(withStyles(withRaces(cfg.units, DEFAULT_UNITS), DEFAULT_UNITS), DEFAULT_UNITS), withEffectDefaults(cfg.effects)));
  replace(MONSTERS, withAdded(withRaces(cfg.monsters, DEFAULT_MONSTERS), DEFAULT_MONSTERS, ADDED_MONSTERS));
  replace(BOSSES, withAdded(withRaces(cfg.bosses, DEFAULT_BOSSES), DEFAULT_BOSSES, ADDED_BOSSES));
  replace(ARENAS, cfg.arenas);
  replace(CHESTS, cfg.chests);
  replace(HEROES, withRaces(cfg.heroes, DEFAULT_HEROES));
  replace(LOGIN_REWARDS, cfg.loginRewards);
  replace(QUESTS, cfg.quests);
  replace(LEAGUES, cfg.leagues);
  replace(EVENTS, cfg.events);
  replace(OFFERS, cfg.offers);
  Object.assign(ECONOMY, structuredClone(cfg.economy));
  Object.assign(EFFECTS, structuredClone(cfg.effects));
  Object.assign(PERK_VALUES, withPerkDefaults(cfg.perks));
  const pvp = withPvpDefaults(cfg.pvp);
  PVP.rules = pvp.rules;
  PVP.sends = pvp.sends;
  PVP.tiers = pvp.tiers;
  setBooks(booksOf(cfg));
  // Event cards never drop, whatever a config says.
  for (const r of RARITIES) RARITY_STATS[r].dropWeight = r === "event" ? 0 : (cfg.dropWeights[r] ?? 0);
  indexUnits();
  indexMonsters();
  indexArenas();
  indexHeroes();
}

/** Returns a list of human-readable problems; empty means the config is usable. */
export function validateConfig(cfg: GameConfig): string[] {
  const errs: string[] = [];
  const num = (v: unknown, where: string, min = 0) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min) errs.push(`${where} must be a number ≥ ${min}`);
  };
  const oneOf = (v: unknown, opts: readonly string[], where: string) => {
    if (!opts.includes(v as string)) errs.push(`${where} must be one of ${opts.join(", ")}`);
  };
  const ids = (list: { id: string }[], what: string) => {
    const seen = new Set<string>();
    for (const x of list) {
      if (!/^[a-z0-9_]+$/.test(x.id ?? "")) errs.push(`${what} id "${x.id}" must be lowercase letters, digits or _`);
      if (seen.has(x.id)) errs.push(`Duplicate ${what} id "${x.id}"`);
      seen.add(x.id);
    }
    return seen;
  };
  if (!cfg || typeof cfg !== "object") return ["Config must be an object"];
  for (const k of ["units", "monsters", "bosses", "arenas", "chests", "heroes", "loginRewards", "quests", "leagues", "events", "offers"] as const) {
    if (!Array.isArray(cfg[k])) errs.push(`${k} must be a list`);
  }
  if (errs.length) return errs;

  const unitIds = ids(cfg.units, "unit");
  for (const u of cfg.units) {
    const w = `Unit ${u.id}`;
    if (!u.name) errs.push(`${w}: name is required`);
    oneOf(u.rarity, RARITIES, `${w} rarity`);
    oneOf(u.element, ELEMENTS, `${w} element`);
    oneOf(u.race, RACE_IDS, `${w} race`);
    oneOf(u.proj, PROJECTILES, `${w} projectile`);
    oneOf(u.style, STYLE_IDS, `${w} style`);
    num(u.damage, `${w} damage`);
    num(u.speed, `${w} speed`);
    if (u.weapon !== undefined) oneOf(u.weapon, WEAPON_KEYS, `${w} weapon`);
    errs.push(...kitProblems(u, w));
  }
  const monsterIds = ids(cfg.monsters, "monster");
  for (const m of cfg.monsters) {
    const w = `Monster ${m.id}`;
    oneOf(m.race, RACE_IDS, `${w} race`);
    num(m.hp, `${w} hp`, 0.01);
    num(m.speed, `${w} speed`);
    num(m.mana, `${w} mana`);
    num(m.size, `${w} size`, 20);
    for (const t of m.traits ?? []) oneOf(t, TRAITS, `${w} trait`);
  }
  const bossIds = ids(cfg.bosses, "boss");
  for (const b of cfg.bosses) {
    const w = `Boss ${b.id}`;
    oneOf(b.race, RACE_IDS, `${w} race`);
    num(b.hp, `${w} hp`, 0.01);
    num(b.speed, `${w} speed`);
    oneOf(b.power, BOSS_POWERS, `${w} power`);
    if (b.rage !== undefined) oneOf(b.rage, BOSS_POWERS, `${w} rage power`);
    if ([b.power, b.rage].some((p) => p && MINION_POWERS.includes(p)) && !monsterIds.has(b.minion ?? "")) errs.push(`${w}: ${b.power} power needs a valid minion`);
    if (b.targets !== undefined) num(b.targets, `${w} targets`, 1);
    for (const t of b.traits ?? []) oneOf(t, TRAITS, `${w} trait`);
    for (const k of b.skills ?? []) {
      oneOf(k.kind, BOSS_SKILLS, `${w} skill`);
      num(k.every, `${w} ${k.kind} every`, 0.5);
      const ns = Array.isArray(k.n) ? k.n : [k.n];
      if (!(ns.length >= 1 && ns.length <= 2 && ns.every((v) => Number.isInteger(v) && v >= 1) && (ns.length < 2 || ns[0] <= ns[1]))) errs.push(`${w}: ${k.kind} n must be a whole number ≥ 1 or [min, max]`);
      if (k.kind === "sapling_trail" && !monsterIds.has(b.minion ?? "")) errs.push(`${w}: sapling_trail needs a valid minion`);
    }
    for (const [k, v] of [["block", b.block], ["evade", b.evade]] as const) if (v !== undefined && !(v >= 0 && v < 1)) errs.push(`${w}: ${k} must be 0-1`);
  }
  ids(cfg.arenas, "arena");
  for (const a of cfg.arenas) {
    const w = `Arena ${a.id}`;
    num(a.trophies, `${w} trophies`);
    if (!a.monsters?.length) errs.push(`${w}: needs at least one monster`);
    if (!a.bosses?.length) errs.push(`${w}: needs at least one boss`);
    for (const m of a.monsters ?? []) if (!monsterIds.has(m)) errs.push(`${w}: unknown monster "${m}"`);
    for (const b of a.bosses ?? []) if (!bossIds.has(b)) errs.push(`${w}: unknown boss "${b}"`);
  }
  if (!cfg.arenas.some((a) => a.trophies === 0)) errs.push("At least one arena must be unlocked at 0 trophies");
  ids(cfg.chests, "chest");
  for (const c of cfg.chests) {
    const w = `Chest ${c.id}`;
    num(c.price, `${w} price`);
    num(c.rolls, `${w} rolls`, 1);
    num(c.coinsMin, `${w} min coins`);
    num(c.coinsMax, `${w} max coins`, c.coinsMin ?? 0);
    oneOf(c.currency, ["coins", "gems"], `${w} currency`);
    oneOf(c.guarantee, CHEST_RARITIES, `${w} guarantee`);
  }
  ids(cfg.heroes, "hero");
  for (const h of cfg.heroes) {
    const w = `Hero ${h.id}`;
    if (!h.name) errs.push(`${w}: name is required`);
    oneOf(h.race, RACE_IDS, `${w} race`);
    oneOf(h.power, HERO_POWER_IDS, `${w} power`);
    num(h.cooldown, `${w} cooldown`, 1);
    num(h.amount, `${w} amount`);
    num(h.duration, `${w} duration`);
    num(h.price, `${w} price`);
    num(h.trophies, `${w} trophies`);
    if (h.power === "slow" && h.amount > 0.9) errs.push(`${w}: slow amount must be at most 0.9`);
  }
  if (!cfg.heroes.some((h) => h.enabled && h.price === 0)) errs.push("At least one enabled hero must be free (price 0)");

  const chestIds = new Set(cfg.chests.map((c) => c.id));
  errs.push(...booksProblems(booksOf(cfg), { units: unitIds, monsters: monsterIds, bosses: bossIds, arenas: new Set(cfg.arenas.map((a) => a.id)), chests: chestIds }));
  const reward = (r: Reward, where: string) => {
    num(r?.coins, `${where} gold`);
    num(r?.gems, `${where} gems`);
    if (r?.chest != null && !chestIds.has(r.chest)) errs.push(`${where}: unknown chest "${r.chest}"`);
  };
  if (!cfg.loginRewards.length) errs.push("The login calendar needs at least one day");
  cfg.loginRewards.forEach((r, i) => reward(r, `Login day ${i + 1}`));
  ids(cfg.quests, "quest");
  for (const q of cfg.quests) {
    const w = `Quest ${q.id}`;
    oneOf(q.goal, QUEST_GOAL_IDS, `${w} goal`);
    num(q.target, `${w} target`, 1);
    num(q.weight, `${w} weight`);
    reward(q.reward, `${w} reward`);
  }
  ids(cfg.leagues, "league");
  const gates = new Set<number>();
  for (const l of cfg.leagues) {
    const w = `League ${l.id}`;
    if (!l.name) errs.push(`${w}: name is required`);
    num(l.trophies, `${w} trophies`);
    if (gates.has(l.trophies)) errs.push(`${w}: another league already starts at ${l.trophies} trophies`);
    gates.add(l.trophies);
    if (!/^#[0-9a-f]{6}$/i.test(l.color ?? "")) errs.push(`${w}: colour must look like #ffd93b`);
    if (!Number.isInteger(l.icon) || l.icon < 0) errs.push(`${w}: icon must be a whole number ≥ 0`);
    reward(l.reward, `${w} reward`);
  }
  if (!cfg.leagues.some((l) => l.trophies === 0)) errs.push("At least one league must start at 0 trophies");
  errs.push(...offerProblems(cfg.events, cfg.offers, chestIds));

  const e = cfg.economy;
  if (!e) return [...errs, "economy is missing"];
  for (const [k, v] of Object.entries(e)) {
    if (Array.isArray(v)) {
      if (k === "starterDeck" || k === "starterCards") continue;
      v.forEach((x, i) => num(x, `economy.${k}[${i}]`));
    } else num(v, `economy.${k}`);
  }
  if (e.waveHpGrowth < 1) errs.push("economy.waveHpGrowth must be ≥ 1");
  if (e.bossEvery < 1) errs.push("economy.bossEvery must be ≥ 1");
  if (e.lives < 1) errs.push("economy.lives must be ≥ 1");
  if (!Number.isInteger(e.maxRank) || e.maxRank < 2 || e.maxRank > 10) errs.push("economy.maxRank must be a whole number from 2 to 10");
  if (!Number.isInteger(e.chestBulkMax) || e.chestBulkMax < 1) errs.push("economy.chestBulkMax must be a whole number ≥ 1");
  if (e.upgradeCopies.length !== e.upgradeCoins.length) errs.push("economy.upgradeCopies and upgradeCoins must be the same length");
  if (e.starterDeck.length !== 5) errs.push("economy.starterDeck must have exactly 5 units");
  for (const id of [...e.starterDeck, ...e.starterCards]) if (!unitIds.has(id)) errs.push(`economy starter unit "${id}" doesn't exist`);
  for (const id of e.starterDeck) if (!e.starterCards.includes(id)) errs.push(`starter deck unit "${id}" must also be in starterCards`);

  errs.push(...effectProblems(cfg.effects));
  if (cfg.perks !== undefined) errs.push(...perkValueProblems(cfg.perks));
  errs.push(...pvpProblems(withPvpDefaults(cfg.pvp)));
  for (const r of CHEST_RARITIES) num(cfg.dropWeights?.[r], `dropWeights.${r}`);
  return errs;
}
