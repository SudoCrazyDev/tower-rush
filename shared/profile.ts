/** Player progress, stored by the server and mirrored by the game client. */
import { ECONOMY, CHESTS, type ChestDef } from "./economy.ts";
import { HEROES, HERO_BY_ID } from "./heroes.ts";
import { freshDaily, utcDay, type DailyState, type LoginState, type Reward } from "./daily.ts";
import { RARITY_ORDER, RARITY_STATS, UNITS, UNIT_BY_ID, upgradeCost, maxCardLevel, type Rarity } from "./units.ts";

export interface CardState {
  level: number;
  copies: number;
}

export interface Profile {
  coins: number;
  gems: number;
  trophies: number;
  bestWave: number;
  cards: Record<string, CardState>;
  deck: string[];
  arena: string | null;
  lastGift: number;
  /** Heroes bought with gems (free heroes are owned by everyone and not listed). */
  heroes: string[];
  /** Hero taken into battle; null for none. */
  hero: string | null;
  /** Today's quests (refreshed by the server when the UTC day changes). */
  daily: DailyState;
  login: LoginState;
}

export function newProfile(): Profile {
  const cards: Record<string, CardState> = {};
  for (const id of ECONOMY.starterCards) cards[id] = { level: 1, copies: 0 };
  return {
    coins: ECONOMY.startingCoins,
    gems: ECONOMY.startingGems,
    trophies: 0,
    bestWave: 0,
    cards,
    deck: [...ECONOMY.starterDeck],
    arena: null,
    lastGift: 0,
    heroes: [],
    hero: HEROES.find((h) => h.enabled && h.price === 0)?.id ?? null,
    daily: { day: "", quests: [], bonusClaimed: false },
    login: { claims: 0, lastDay: "" },
  };
}

/** Roll a new set of quests when the UTC day has changed. Returns true if it did. */
export function refreshDaily(p: Profile, day = utcDay(), rand?: () => number) {
  if (p.daily.day === day) return false;
  p.daily = freshDaily(day, ECONOMY.questsPerDay, rand);
  return true;
}

/** Give a reward; returns the chest's contents if it included one. */
export function grantReward(p: Profile, r: Reward, rand?: () => number): ChestLoot | null {
  p.coins += r.coins;
  p.gems += r.gems;
  const chest = r.chest ? chestById(r.chest) : undefined;
  return chest ? rollChest(p, chest, rand) : null;
}

export function ownsHero(p: Profile, id: string) {
  const h = HERO_BY_ID[id];
  return !!h && (h.price === 0 || p.heroes.includes(id));
}

/** Why a hero can't be bought right now, or null if it can. */
export function heroBuyProblem(p: Profile, id: string) {
  const h = HERO_BY_ID[id];
  if (!h || !h.enabled) return "That hero isn't available";
  if (ownsHero(p, id)) return "You already have this hero";
  if (p.trophies < h.trophies) return `Unlocks at ${h.trophies} trophies`;
  if (p.gems < h.price) return "Not enough gems";
  return null;
}

export function canUpgrade(p: Profile, id: string) {
  const c = p.cards[id];
  const def = UNIT_BY_ID[id];
  if (!c || !def || c.level >= maxCardLevel()) return false;
  const cost = upgradeCost(c.level, def.rarity);
  return c.copies >= cost.copies && p.coins >= cost.coins;
}

export function giftReadyAt(p: Profile) {
  return p.lastGift + ECONOMY.giftCooldownHours * 3600_000;
}

export interface ChestLoot {
  coins: number;
  cards: { id: string; copies: number; isNew: boolean }[];
}

function rollRarity(min: Rarity, rand: () => number): Rarity {
  const pool = RARITY_ORDER.filter((r) => RARITY_ORDER.indexOf(r) >= RARITY_ORDER.indexOf(min));
  const total = pool.reduce((s, r) => s + RARITY_STATS[r].dropWeight, 0);
  let x = rand() * total;
  for (const r of pool) {
    x -= RARITY_STATS[r].dropWeight;
    if (x <= 0) return r;
  }
  return pool[0];
}

/** Roll a chest's contents and add them to the profile. */
export function rollChest(p: Profile, chest: ChestDef, rand: () => number = Math.random): ChestLoot {
  const counts = new Map<string, number>();
  for (let i = 0; i < chest.rolls; i++) {
    let rarity = rollRarity(i === 0 ? chest.guarantee : "common", rand);
    let options = UNITS.filter((u) => u.enabled && u.rarity === rarity);
    // If an admin disabled every unit of this rarity, fall back to the nearest one below.
    while (!options.length && RARITY_ORDER.indexOf(rarity) > 0) {
      rarity = RARITY_ORDER[RARITY_ORDER.indexOf(rarity) - 1];
      options = UNITS.filter((u) => u.enabled && u.rarity === rarity);
    }
    if (!options.length) continue;
    const u = options[Math.floor(rand() * options.length)];
    // Common cards come in bigger stacks.
    const copies = Math.max(1, Math.round((5 - RARITY_ORDER.indexOf(rarity)) * (0.5 + rand())));
    counts.set(u.id, (counts.get(u.id) ?? 0) + copies);
  }
  const coins = Math.round(chest.coinsMin + rand() * (chest.coinsMax - chest.coinsMin));
  const cards = [...counts].map(([id, copies]) => ({ id, copies, isNew: !p.cards[id] }));
  cards.sort((a, b) => RARITY_ORDER.indexOf(UNIT_BY_ID[b.id].rarity) - RARITY_ORDER.indexOf(UNIT_BY_ID[a.id].rarity));
  for (const c of cards) {
    const have = p.cards[c.id];
    if (have) have.copies += c.copies;
    else p.cards[c.id] = { level: 1, copies: Math.max(0, c.copies - 1) };
  }
  p.coins += coins;
  return { coins, cards };
}

/** Open `count` of the same chest and combine the loot into one reveal. */
export function rollChests(p: Profile, chest: ChestDef, count: number, rand: () => number = Math.random): ChestLoot {
  const before = new Set(Object.keys(p.cards));
  const counts = new Map<string, number>();
  let coins = 0;
  for (let i = 0; i < count; i++) {
    const loot = rollChest(p, chest, rand);
    coins += loot.coins;
    for (const c of loot.cards) counts.set(c.id, (counts.get(c.id) ?? 0) + c.copies);
  }
  const cards = [...counts].map(([id, copies]) => ({ id, copies, isNew: !before.has(id) }));
  cards.sort((a, b) => RARITY_ORDER.indexOf(UNIT_BY_ID[b.id].rarity) - RARITY_ORDER.indexOf(UNIT_BY_ID[a.id].rarity) || b.copies - a.copies);
  return { coins, cards };
}

export const chestById = (id: string) => CHESTS.find((c) => c.id === id);
