/** Player progress, stored by the server and mirrored by the game client. */
import { ECONOMY, CHESTS, type ChestDef } from "./economy.ts";
import { HEROES, HERO_BY_ID } from "./heroes.ts";
import { freshDaily, utcDay, type DailyState, type LoginState, type Reward } from "./daily.ts";
import { LEAGUES, societyInvite, unpaidLeagues } from "./leagues.ts";
import type { OfferDef } from "./offers.ts";
import { PVP } from "./pvp.ts";
import { CHEST_RARITIES, RARITY_ORDER, RARITY_STATS, UNITS, UNIT_BY_ID, canDrop, rarityIndex, upgradeCost, maxCardLevel, type ChestRarity, type Rarity } from "./units.ts";
import { BOOK, REPLAY_CARDS_PER_DAY, findChapter, newStoryProgress, storyFinished, type StoryProgress } from "./stories.ts";

export interface CardState {
  level: number;
  copies: number;
}

/** Ranked PvP standing: a rating of its own, separate from trophies (see PVP.md). */
export interface RankedStats {
  rating: number;
  /** Highest rating reached. */
  peak: number;
  /** Ranked matches finished (fewer than ratingPlacementGames = still placing). */
  played: number;
  wins: number;
  losses: number;
}

export interface Profile {
  coins: number;
  gems: number;
  trophies: number;
  ranked: RankedStats;
  /** Best wave in any arena (the wave leaderboard). */
  bestWave: number;
  /** Best wave reached in each arena, by arena id. */
  arenaBest: Record<string, number>;
  cards: Record<string, CardState>;
  deck: string[];
  arena: string | null;
  lastGift: number;
  /** Heroes bought with gems (free heroes are owned by everyone and not listed). */
  heroes: string[];
  /** Hero taken into battle; null for none. */
  hero: string | null;
  /** Chosen player avatar (an id from ui/avatars, "avatar_1"); null for the default look. */
  avatar: string | null;
  /** Today's quests (refreshed by the server when the UTC day changes). */
  daily: DailyState;
  login: LoginState;
  /** Leagues whose one-time promotion reward has been paid. */
  leagues: string[];
  /** Membership of an invite-only society league (v2.9); missing or null for everyone else. */
  society?: SocietyMembership | null;
  /** Shop offers bought so far, by offer id (for per-player limits). */
  offers: Record<string, number>;
  /** Tutorial parts finished or skipped ("battle", "deck"); each one runs once per account. */
  tutorial: string[];
  /** Releases whose launch gift this account has had ("1.1.0"). */
  releases: string[];
  /** Story mode progress (v1.2). */
  story: StoryProgress;
}

/** What other players can see of an account (GET /api/players/:id, the v2.9 profile view). */
export interface PublicProfile {
  id: number;
  name: string;
  avatar: string | null;
  hero: string | null;
  trophies: number;
  bestWave: number;
  ranked: RankedStats;
  /** Society league joined, or null. */
  society: string | null;
  /** League ids reached (promotions paid, plus the league the player is in now). */
  leagues: string[];
  /** Story badge ids (BADGES in stories.ts). */
  badges: string[];
  /** Arena they last picked (the profile stage's backdrop), or null. */
  arena: string | null;
  /** The 5 deck cards with their levels. */
  deck: { id: string; level: number }[];
  /** Account creation time (ms). */
  joined: number;
}

/** Cards every player gets once when a feature release goes live (docs/features). */
export const RELEASE_GIFTS: { version: string; cards: string[] }[] = [{ version: "1.1.0", cards: ["portal_imp", "gnome_brewer"] }];

/** Hand out any release gifts not given yet: a new card, or a copy if it's owned. Returns the card ids given. */
export function grantReleaseGifts(p: Profile) {
  const given: string[] = [];
  for (const r of RELEASE_GIFTS) {
    if (p.releases.includes(r.version)) continue;
    p.releases.push(r.version);
    for (const id of r.cards) {
      if (!UNIT_BY_ID[id]?.enabled) continue;
      if (p.cards[id]) p.cards[id].copies++;
      else p.cards[id] = { level: 1, copies: 0 };
      given.push(id);
    }
  }
  return given;
}

/** Shape of a player avatar id (files in ui/avatars; the list of real ones is the asset index). */
export const AVATAR_RE = /^avatar_\d{1,3}$/;

export const TUTORIAL_PARTS = ["battle", "deck"] as const;
export type TutorialPart = (typeof TUTORIAL_PARTS)[number];

export function newProfile(): Profile {
  const cards: Record<string, CardState> = {};
  for (const id of ECONOMY.starterCards) cards[id] = { level: 1, copies: 0 };
  return {
    coins: ECONOMY.startingCoins,
    gems: ECONOMY.startingGems,
    trophies: 0,
    ranked: { rating: PVP.rules.ratingStart, peak: PVP.rules.ratingStart, played: 0, wins: 0, losses: 0 },
    bestWave: 0,
    arenaBest: {},
    cards,
    deck: [...ECONOMY.starterDeck],
    arena: null,
    lastGift: 0,
    heroes: [],
    hero: HEROES.find((h) => h.enabled && h.price === 0)?.id ?? null,
    avatar: null,
    daily: { day: "", quests: [], bonusClaimed: false },
    login: { claims: 0, lastDay: "" },
    leagues: [],
    offers: {},
    tutorial: [],
    releases: [],
    story: newStoryProgress(),
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

export interface Promotion {
  league: string;
  reward: Reward;
  loot: ChestLoot | null;
}

/** Pay the promotion reward of every league the player has reached for the first time. */
export function payPromotions(p: Profile, rand?: () => number): Promotion[] {
  return unpaidLeagues(p.trophies, p.leagues, p.society?.league ?? null).map((l) => {
    p.leagues.push(l.id);
    return { league: l.id, reward: l.reward, loot: grantReward(p, l.reward, rand) };
  });
}

/** A player's place in an invite-only society league (v2.9). */
export interface SocietyMembership {
  league: string;
  joined: number;
  /** Dues are paid up to this time (ms); the next dues are taken when it passes. */
  paidUntil: number;
}

const DAY_MS = 86_400_000;

/** Why a membership ended: trophies fell below the gate, the dues couldn't be paid, or the league was removed. */
export type SocietyLapse = "trophies" | "dues" | "gone";

/**
 * Take any society dues that have come due, and end the membership if the player has fallen
 * below the league's trophy gate or can't pay. Returns how many dues were taken and why it ended.
 */
export function settleSociety(p: Profile, now = Date.now()): { dues: number; lapsed: SocietyLapse | null } {
  const m = p.society;
  let dues = 0;
  if (!m) return { dues, lapsed: null };
  const end = (why: SocietyLapse) => {
    p.society = null;
    return { dues, lapsed: why };
  };
  const league = LEAGUES.find((l) => l.id === m.league);
  const s = league?.society;
  if (!league || !s) return end("gone");
  if (p.trophies < league.trophies) return end("trophies");
  while (m.paidUntil <= now) {
    if (p.coins < s.duesCoins || p.gems < s.duesGems) return end("dues");
    p.coins -= s.duesCoins;
    p.gems -= s.duesGems;
    m.paidUntil += Math.max(1, s.duesDays) * DAY_MS;
    dues++;
  }
  return { dues, lapsed: null };
}

/** Accept a society invitation: pay the entry fee and join. Returns the league joined, or a problem. */
export function joinSociety(p: Profile, now = Date.now()) {
  const l = societyInvite(p);
  if (!l?.society) return { problem: "You haven't been invited" } as const;
  p.coins -= l.society.entryCoins;
  p.gems -= l.society.entryGems;
  p.society = { league: l.id, joined: now, paidUntil: now + Math.max(1, l.society.duesDays) * DAY_MS };
  return { league: l };
}

/** Pay for a shop offer and hand over its bundle. Check offerBuyProblem() first. */
export function buyOffer(p: Profile, o: OfferDef, rand?: () => number): ChestLoot | null {
  p[o.currency] -= o.price;
  p.offers[o.id] = (p.offers[o.id] ?? 0) + 1;
  p.coins += o.reward.coins;
  p.gems += o.reward.gems;
  const chest = o.reward.chest ? chestById(o.reward.chest) : undefined;
  return chest ? rollChests(p, chest, Math.max(1, o.chests), rand) : null;
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

function rollRarity(min: ChestRarity, rand: () => number): ChestRarity {
  const pool = CHEST_RARITIES.filter((r) => CHEST_RARITIES.indexOf(r) >= CHEST_RARITIES.indexOf(min));
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
    // Story units never drop; story rewards only once the player has earned one.
    const drops = (r: Rarity) => UNITS.filter((u) => u.rarity === r && canDrop(u, (id) => !!p.cards[id]));
    let options = drops(rarity);
    // If an admin disabled every unit of this rarity, fall back to the nearest one below.
    while (!options.length && CHEST_RARITIES.indexOf(rarity) > 0) {
      rarity = CHEST_RARITIES[CHEST_RARITIES.indexOf(rarity) - 1];
      options = drops(rarity);
    }
    if (!options.length) continue;
    const u = options[Math.floor(rand() * options.length)];
    // Common cards come in bigger stacks.
    const copies = Math.max(1, Math.round((5 - rarityIndex(rarity)) * (0.5 + rand())));
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

/** Give one copy of a card: a new card at level 1, or a copy toward the next level. */
export function giveCard(p: Profile, id: string, copies = 1) {
  if (!UNIT_BY_ID[id]) return;
  if (p.cards[id]) p.cards[id].copies += copies;
  else p.cards[id] = { level: 1, copies: copies - 1 };
}

/** What a story chapter win paid (the profile already has it). */
export interface StoryWin {
  firstClear: boolean;
  stars: number;
  /** Best stars before this win (0 = never won). */
  bestBefore: number;
  coins: number;
  gems: number;
  chest: string | null;
  loot: ChestLoot | null;
  /** Cards given: the first-clear unit reward, or Event copies from a replay. */
  cards: { id: string; copies: number; isNew: boolean }[];
  badge: string | null;
  /** The story is finished with this win (its ending panels play). */
  storyDone: boolean;
}

/**
 * Pay a chapter win: the first clear pays the chapter's reward (gold, gems, chest, cards, badge),
 * later wins the replay reward plus, for stories with replay cards (Princess Muse), 1-3 copies on
 * the first REPLAY_CARDS_PER_DAY replays of the UTC day (3 stars makes more copies likelier).
 */
export function grantStoryWin(p: Profile, chapterId: string, stars: number, day: string, rand: () => number = Math.random): StoryWin {
  const f = findChapter(chapterId)!;
  const prog = p.story;
  const before = prog.chapters[chapterId];
  const firstClear = !before;
  const wasDone = storyFinished(prog, f.story);
  prog.chapters[chapterId] = { stars: Math.max(stars, before?.stars ?? 0), clearedAt: before?.clearedAt ?? Date.now() };
  const r = firstClear ? f.chapter.reward : { ...f.chapter.replay, cards: [] as string[], badge: null };
  p.coins += r.coins;
  p.gems += r.gems;
  const chest = r.chest ? chestById(r.chest) : undefined;
  const loot = chest ? rollChest(p, chest, rand) : null;
  const cards: StoryWin["cards"] = [];
  for (const id of r.cards) {
    cards.push({ id, copies: 1, isNew: !p.cards[id] });
    giveCard(p, id);
  }
  if (!firstClear && f.story.replayCards.length) {
    if (prog.replays.day !== day) prog.replays = { day, n: 0 };
    if (prog.replays.n < REPLAY_CARDS_PER_DAY) {
      prog.replays.n++;
      for (const id of f.story.replayCards) {
        const x = rand();
        const copies = stars >= 3 ? (x < 0.2 ? 1 : x < 0.6 ? 2 : 3) : x < 0.6 ? 1 : x < 0.9 ? 2 : 3;
        cards.push({ id, copies, isNew: !p.cards[id] });
        giveCard(p, id, copies);
      }
    }
  }
  if (r.badge && !prog.badges.includes(r.badge)) prog.badges.push(r.badge);
  return {
    firstClear,
    stars,
    bestBefore: before?.stars ?? 0,
    coins: r.coins,
    gems: r.gems,
    chest: r.chest,
    loot,
    cards,
    badge: firstClear ? r.badge : null,
    storyDone: !wasDone && storyFinished(prog, f.story),
  };
}

/** Whether the book has any story the player hasn't started yet that they can start (lobby NEW dot). */
export const storyIsNew = (p: Profile) => BOOK.stories.length > 0 && !p.story.started.includes(BOOK.stories[0].id) && p.trophies >= BOOK.stories[0].trophies;
