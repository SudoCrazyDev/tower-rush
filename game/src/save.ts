/**
 * Player progress lives on the server; this module mirrors it locally and wraps every
 * action that changes it. Scenes read `profile` synchronously and await the actions.
 */
import { get, post, put, del, setToken } from "./api";
import { applyConfig, type GameConfig } from "../../shared/config.ts";
import { newProfile, canUpgrade as canUpgradeShared, type Profile, type ChestLoot } from "../../shared/profile.ts";

export type { Profile, ChestLoot };
export { CHESTS, type ChestDef } from "../../shared/economy.ts";
export { giftReadyAt, ownsHero, heroBuyProblem } from "../../shared/profile.ts";
import type { Reward } from "../../shared/daily.ts";
import type { Promotion, StoryWin } from "../../shared/profile.ts";
import { needsAttention, type MailMessage } from "../../shared/mail.ts";

export type { MailMessage };

export interface Account {
  id: number;
  name: string;
  username: string | null;
  isGuest: boolean;
}

export const profile: Profile = newProfile();
export const account: Account = { id: 0, name: "", username: null, isGuest: true };

function setProfile(p: Profile) {
  Object.assign(profile, p);
}

let clockOffset = 0;
/** The server's clock (events and offers start and end by it). */
export const serverNow = () => Date.now() + clockOffset;

export async function loadConfig() {
  const sent = Date.now();
  const r = await get<{ version: number; config: GameConfig; now?: number }>("/config");
  applyConfig(r.config);
  // Server time at the middle of the round trip, so countdowns match what the server enforces.
  if (r.now) clockOffset = r.now - (sent + Date.now()) / 2;
  return r.version;
}

/** Fetch the signed-in player's account and progress. Throws ApiError(401) if signed out. */
export async function loadMe() {
  const r = await get<{ user: Account; profile: Profile }>("/me");
  Object.assign(account, r.user);
  setProfile(r.profile);
}

export async function playAsGuest() {
  const r = await post<{ token: string }>("/auth/guest");
  setToken(r.token);
  await loadMe();
}

export async function signIn(username: string, password: string) {
  const r = await post<{ token: string }>("/auth/login", { username, password });
  setToken(r.token);
  await loadMe();
}

/** Create an account; if currently a guest, the guest's progress is kept. */
export async function register(username: string, password: string) {
  const r = await post<{ token: string }>("/auth/register", { username, password });
  setToken(r.token);
  await loadMe();
}

export async function signOut() {
  try {
    await post("/auth/logout");
  } finally {
    setToken(null);
  }
}

export const cardLevel = (id: string) => profile.cards[id]?.level ?? 1;
export const canUpgrade = (id: string) => canUpgradeShared(profile, id);

export async function upgradeCard(id: string) {
  setProfile((await post<{ profile: Profile }>(`/cards/${id}/upgrade`)).profile);
}

export async function setDeck(deck: string[]) {
  setProfile((await put<{ profile: Profile }>("/me/deck", { deck })).profile);
}

export async function setArena(arena: string) {
  setProfile((await put<{ profile: Profile }>("/me/arena", { arena })).profile);
}

export async function setHero(hero: string | null) {
  setProfile((await put<{ profile: Profile }>("/me/hero", { hero })).profile);
}

/** Mark tutorial parts done. Applied locally first, so a lost connection never shows them twice in this session. */
export async function finishTutorial(parts: string[]) {
  profile.tutorial = [...new Set([...(profile.tutorial ?? []), ...parts])];
  setProfile((await post<{ profile: Profile }>("/me/tutorial", { parts })).profile);
}

export async function buyHero(id: string) {
  setProfile((await post<{ profile: Profile }>(`/heroes/${id}/buy`)).profile);
}

export async function buyChest(id: string, count = 1) {
  const r = await post<{ profile: Profile; loot: ChestLoot }>(`/shop/chests/${id}/buy`, { count });
  setProfile(r.profile);
  return r.loot;
}

/** Buy a shop offer; returns the cards from its chests (null if it had none). */
export async function buyOffer(id: string) {
  const r = await post<{ profile: Profile; loot: ChestLoot | null }>(`/shop/offers/${id}/buy`);
  setProfile(r.profile);
  return r.loot;
}

export async function claimGift() {
  setProfile((await post<{ profile: Profile }>("/shop/gift")).profile);
}

export interface Claimed {
  reward: Reward;
  loot: ChestLoot | null;
}

export async function claimLogin() {
  const r = await post<Claimed & { profile: Profile }>("/daily/login");
  setProfile(r.profile);
  return r as Claimed;
}

export async function claimQuest(id: string) {
  const r = await post<Claimed & { profile: Profile }>(`/daily/quests/${id}/claim`);
  setProfile(r.profile);
  return r as Claimed;
}

export async function claimQuestBonus() {
  const r = await post<Claimed & { profile: Profile }>("/daily/bonus");
  setProfile(r.profile);
  return r as Claimed;
}

/** The inbox as last fetched (the lobby refreshes it each time it opens). */
export const mail = { messages: [] as MailMessage[], unread: 0 };

const setMail = (messages: MailMessage[]) => Object.assign(mail, { messages, unread: messages.filter(needsAttention).length });

export async function loadInbox() {
  setMail((await get<{ messages: MailMessage[] }>("/inbox")).messages);
}

export async function readMail(id: number) {
  await post(`/inbox/${id}/read`);
  setMail(mail.messages.map((m) => (m.id === id ? { ...m, read: true } : m)));
}

export async function claimMail(id: number) {
  const r = await post<Claimed & { profile: Profile }>(`/inbox/${id}/claim`);
  setProfile(r.profile);
  setMail(mail.messages.map((m) => (m.id === id ? { ...m, read: true, claimed: true } : m)));
  return r as Claimed;
}

export async function deleteMail(id: number) {
  await del(`/inbox/${id}`);
  setMail(mail.messages.filter((m) => m.id !== id));
}

export interface Leaderboard {
  by: "trophies" | "wave" | "rating";
  /** `rating` is the ranked PvP rating (null for an account that predates it). */
  rows: { rank: number; id: number; name: string; trophies: number; bestWave: number; rating: number | null; hero: string | null }[];
  /** Ranked players on this board. */
  total: number;
  /** The signed-in player's place (null when they have 0 on this board). */
  me: { id: number; rank: number | null };
}

export const getLeaderboard = (by: Leaderboard["by"]) => get<Leaderboard>(`/leaderboard?by=${by}`);

/** Longest waves survived in one arena. */
export interface ArenaTop {
  arena: string;
  rows: { rank: number; id: number; name: string; wave: number; trophies: number; hero: string | null }[];
  /** The signed-in player's best wave there and place (null when they haven't played it). */
  me: { id: number; wave: number; rank: number | null };
}

export const getArenaTop = (arena: string) => get<ArenaTop>(`/arenas/${encodeURIComponent(arena)}/top`);

export async function startBattle(arena: string) {
  return (await post<{ battleId: number }>("/battles", { arena })).battleId;
}

export interface BattleResult {
  rewards: { coins: number; gems: number; trophies: number };
  newBest: boolean;
  wave: number;
  /** Leagues reached for the first time; their rewards are already in the profile. */
  promotions: Promotion[];
  /** Event multipliers already applied to the gold and gems (1 = no event). */
  boosts?: { coinMult: number; gemMult: number };
}

export interface BattleStats {
  wave: number;
  kills: number;
  bosses: number;
  summons: number;
  merges: number;
  awakens: number;
  heroCasts: number;
  copies: number;
  swaps: number;
  brewed: number;
}

export async function finishBattle(battleId: number, stats: BattleStats) {
  const r = await post<BattleResult & { profile: Profile }>(`/battles/${battleId}/finish`, stats);
  setProfile(r.profile);
  return r;
}

// ---------------------------------------------------------------- stories (v1.2)

export interface StoryStart {
  battleId: number;
  deck: string[];
  /** Card level of each deck unit in this chapter (Event deck level, or the level floor). */
  levels: Record<string, number>;
}

/** Start a story chapter; `pick` is the Event deck choice for chapters that hand one out. */
export async function startStory(chapter: string, pick?: string[]) {
  const r = await post<StoryStart & { profile: Profile }>("/story/start", { chapter, pick });
  setProfile(r.profile);
  return { battleId: r.battleId, deck: r.deck, levels: r.levels } as StoryStart;
}

export interface StoryResult {
  won: boolean;
  wave: number;
  win: StoryWin | null;
}

export async function finishStory(battleId: number, stats: Omit<BattleStats, "copies" | "swaps" | "brewed"> & { won: boolean; lives: number }) {
  const r = await post<StoryResult & { profile: Profile }>(`/story/${battleId}/finish`, stats);
  setProfile(r.profile);
  return r;
}
