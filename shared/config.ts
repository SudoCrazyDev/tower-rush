/**
 * The whole editable game balance as one JSON document. The server stores versions of
 * it, the admin panel edits it, and the game applies it at boot with applyConfig().
 */
import { DEFAULT_UNITS, UNITS, indexUnits, RARITY_STATS, RARITIES, ELEMENTS, ARCHS, PROJECTILES, type UnitDef, type Rarity } from "./units.ts";
import { DEFAULT_MONSTERS, DEFAULT_BOSSES, MONSTERS, BOSSES, indexMonsters, TRAITS, BOSS_POWERS, type MonsterDef, type BossDef } from "./monsters.ts";
import { DEFAULT_ARENAS, ARENAS, indexArenas, type ArenaDef } from "./arenas.ts";
import { DEFAULT_ECONOMY, ECONOMY, DEFAULT_CHESTS, CHESTS, type Economy, type ChestDef } from "./economy.ts";
import { DEFAULT_HEROES, HEROES, indexHeroes, HERO_POWER_IDS, type HeroDef } from "./heroes.ts";
import { DEFAULT_LOGIN_REWARDS, DEFAULT_QUESTS, LOGIN_REWARDS, QUESTS, QUEST_GOAL_IDS, type QuestDef, type Reward } from "./daily.ts";
import { DEFAULT_LEAGUES, LEAGUES, type LeagueDef } from "./leagues.ts";
import { DEFAULT_EFFECTS, EFFECTS, effectProblems, type Effects } from "./effects.ts";
import { RACE_IDS, withRaces } from "./races.ts";
import { DEFAULT_EVENTS, DEFAULT_OFFERS, EVENTS, OFFERS, offerProblems, type EventDef, type OfferDef } from "./offers.ts";

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
  dropWeights: Record<Rarity, number>;
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
    dropWeights: { common: 60, rare: 26, epic: 10, legendary: 3.5, mythic: 0.5 },
  });
}

function replace<T>(target: T[], items: T[]) {
  target.length = 0;
  target.push(...structuredClone(items));
}

/** Swap the live tables for the ones in `cfg` (in place, so existing imports see them). */
export function applyConfig(cfg: GameConfig) {
  replace(UNITS, withRaces(cfg.units, DEFAULT_UNITS));
  replace(MONSTERS, withRaces(cfg.monsters, DEFAULT_MONSTERS));
  replace(BOSSES, withRaces(cfg.bosses, DEFAULT_BOSSES));
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
  for (const r of RARITIES) RARITY_STATS[r].dropWeight = cfg.dropWeights[r];
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
    oneOf(u.arch, ARCHS, `${w} archetype`);
    oneOf(u.proj, PROJECTILES, `${w} projectile`);
    num(u.damage, `${w} damage`);
    num(u.speed, `${w} speed`);
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
    if (b.power === "summon" && !monsterIds.has(b.minion ?? "")) errs.push(`${w}: summon power needs a valid minion`);
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
    oneOf(c.guarantee, RARITIES, `${w} guarantee`);
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
  if (!Number.isInteger(e.chestBulkMax) || e.chestBulkMax < 1) errs.push("economy.chestBulkMax must be a whole number ≥ 1");
  if (e.upgradeCopies.length !== e.upgradeCoins.length) errs.push("economy.upgradeCopies and upgradeCoins must be the same length");
  if (e.starterDeck.length !== 5) errs.push("economy.starterDeck must have exactly 5 units");
  for (const id of [...e.starterDeck, ...e.starterCards]) if (!unitIds.has(id)) errs.push(`economy starter unit "${id}" doesn't exist`);
  for (const id of e.starterDeck) if (!e.starterCards.includes(id)) errs.push(`starter deck unit "${id}" must also be in starterCards`);

  errs.push(...effectProblems(cfg.effects));
  for (const r of RARITIES) num(cfg.dropWeights?.[r], `dropWeights.${r}`);
  return errs;
}
