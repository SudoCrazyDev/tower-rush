/**
 * Player progress lives on the server; this module mirrors it locally and wraps every
 * action that changes it. Scenes read `profile` synchronously and await the actions.
 */
import { get, post, put, setToken } from "./api";
import { applyConfig, type GameConfig } from "../../shared/config.ts";
import { newProfile, canUpgrade as canUpgradeShared, type Profile, type ChestLoot } from "../../shared/profile.ts";

export type { Profile, ChestLoot };
export { CHESTS, type ChestDef } from "../../shared/economy.ts";
export { giftReadyAt, ownsHero, heroBuyProblem } from "../../shared/profile.ts";
import type { Reward } from "../../shared/daily.ts";
import type { Promotion } from "../../shared/profile.ts";

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

export async function loadConfig() {
  const r = await get<{ version: number; config: GameConfig }>("/config");
  applyConfig(r.config);
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

export async function buyHero(id: string) {
  setProfile((await post<{ profile: Profile }>(`/heroes/${id}/buy`)).profile);
}

export async function buyChest(id: string, count = 1) {
  const r = await post<{ profile: Profile; loot: ChestLoot }>(`/shop/chests/${id}/buy`, { count });
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

export interface Leaderboard {
  by: "trophies" | "wave";
  rows: { rank: number; id: number; name: string; trophies: number; bestWave: number; hero: string | null }[];
  /** Ranked players on this board. */
  total: number;
  /** The signed-in player's place (null when they have 0 on this board). */
  me: { id: number; rank: number | null };
}

export const getLeaderboard = (by: Leaderboard["by"]) => get<Leaderboard>(`/leaderboard?by=${by}`);

export async function startBattle(arena: string) {
  return (await post<{ battleId: number }>("/battles", { arena })).battleId;
}

export interface BattleResult {
  rewards: { coins: number; gems: number; trophies: number };
  newBest: boolean;
  wave: number;
  /** Leagues reached for the first time; their rewards are already in the profile. */
  promotions: Promotion[];
}

export interface BattleStats {
  wave: number;
  kills: number;
  bosses: number;
  summons: number;
  merges: number;
  awakens: number;
  heroCasts: number;
}

export async function finishBattle(battleId: number, stats: BattleStats) {
  const r = await post<BattleResult & { profile: Profile }>(`/battles/${battleId}/finish`, stats);
  setProfile(r.profile);
  return r;
}
