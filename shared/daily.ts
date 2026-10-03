/**
 * Daily login rewards and daily quests. Days are UTC calendar days ("2026-10-03"), so
 * everyone's day rolls over at the same moment. The server owns all of this; the game only
 * reads the profile and calls the claim endpoints.
 */

/** Something a player is given: gold and/or gems, plus optionally a chest (by chest id). */
export interface Reward {
  coins: number;
  gems: number;
  chest: string | null;
}

/** What a quest counts. Battle goals come from finished runs; the others from shop/deck actions. */
export type QuestGoal = "battles" | "wave" | "merges" | "summons" | "kills" | "bosses" | "heroCasts" | "awakens" | "upgrades" | "chests";

export const QUEST_GOALS: Record<QuestGoal, { text: string; label: string; best?: boolean }> = {
  battles: { text: "Play {n} battles", label: "Battles finished" },
  wave: { text: "Reach wave {n}", label: "Highest wave in one battle", best: true },
  merges: { text: "Merge {n} times", label: "Merges" },
  summons: { text: "Summon {n} units", label: "Summons" },
  kills: { text: "Defeat {n} monsters", label: "Monsters defeated" },
  bosses: { text: "Defeat {n} bosses", label: "Bosses defeated" },
  heroCasts: { text: "Use your hero {n} times", label: "Hero abilities used" },
  awakens: { text: "Awaken {n} units", label: "Units awakened (max rank)" },
  upgrades: { text: "Upgrade {n} cards", label: "Card upgrades" },
  chests: { text: "Open {n} chests", label: "Chests bought" },
};
export const QUEST_GOAL_IDS = Object.keys(QUEST_GOALS) as QuestGoal[];

export interface QuestDef {
  id: string;
  goal: QuestGoal;
  target: number;
  reward: Reward;
  /** Relative chance of being one of the day's quests. */
  weight: number;
  enabled: boolean;
}

/** Per-battle numbers a finished run reports (the server clamps them first). */
export type BattleStats = Record<Exclude<QuestGoal, "battles" | "upgrades" | "chests">, number>;

export interface DailyState {
  /** UTC day these quests belong to. */
  day: string;
  quests: { id: string; progress: number; claimed: boolean }[];
  /** Bonus for claiming every quest of the day. */
  bonusClaimed: boolean;
}

export interface LoginState {
  /** Rewards claimed so far; the next one is loginRewards[claims % length]. */
  claims: number;
  /** UTC day of the last claim. */
  lastDay: string;
}

const R = (coins: number, gems = 0, chest: string | null = null): Reward => ({ coins, gems, chest });

/** The login calendar: one per day claimed, then it starts over. Missing a day doesn't reset it. */
export const DEFAULT_LOGIN_REWARDS: Reward[] = [R(100), R(0, 10), R(200), R(0, 0, "wooden"), R(300, 15), R(500), R(0, 30, "silver")];

const Q = (id: string, goal: QuestGoal, target: number, reward: Reward, weight = 1): QuestDef => ({ id, goal, target, reward, weight, enabled: true });

export const DEFAULT_QUESTS: QuestDef[] = [
  Q("play_3", "battles", 3, R(120)),
  Q("wave_10", "wave", 10, R(0, 10)),
  Q("wave_20", "wave", 20, R(0, 20), 0.5),
  Q("merge_20", "merges", 20, R(120)),
  Q("merge_60", "merges", 60, R(250), 0.5),
  Q("summon_40", "summons", 40, R(100)),
  Q("kill_200", "kills", 200, R(150)),
  Q("boss_2", "bosses", 2, R(0, 10)),
  Q("hero_5", "heroCasts", 5, R(100)),
  Q("awaken_1", "awakens", 1, R(0, 15), 0.6),
  Q("upgrade_1", "upgrades", 1, R(100)),
  Q("chest_1", "chests", 1, R(80), 0.6),
];

/** Live tables: replaced in place when a config is applied (see config.ts). */
export const LOGIN_REWARDS: Reward[] = structuredClone(DEFAULT_LOGIN_REWARDS);
export const QUESTS: QuestDef[] = structuredClone(DEFAULT_QUESTS);

export const questById = (id: string) => QUESTS.find((q) => q.id === id);

export const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

/** Milliseconds until the next UTC midnight (when quests and the login reward refresh). */
export const msToNextDay = (t = Date.now()) => 86400_000 - (t % 86400_000);

export function questText(q: QuestDef) {
  return QUEST_GOALS[q.goal]?.text.replace("{n}", String(q.target)) ?? q.id;
}

export function rewardText(r: Reward, chestName?: (id: string) => string) {
  const parts: string[] = [];
  if (r.coins) parts.push(`${r.coins} gold`);
  if (r.gems) parts.push(`${r.gems} gems`);
  if (r.chest) parts.push(chestName?.(r.chest) ?? r.chest);
  return parts.join(" + ") || "nothing";
}

/** Pick `n` different enabled quests, weighted. */
export function pickQuests(n: number, rand: () => number = Math.random) {
  const pool = QUESTS.filter((q) => q.enabled && q.weight > 0);
  const out: QuestDef[] = [];
  while (out.length < n && pool.length) {
    let x = rand() * pool.reduce((s, q) => s + q.weight, 0);
    let i = 0;
    while (i < pool.length - 1 && (x -= pool[i].weight) > 0) i++;
    out.push(...pool.splice(i, 1));
  }
  return out;
}

export function freshDaily(day: string, n: number, rand?: () => number): DailyState {
  return { day, quests: pickQuests(n, rand).map((q) => ({ id: q.id, progress: 0, claimed: false })), bonusClaimed: false };
}

/** Add progress toward today's quests. `stats` maps goals to amounts (wave goals keep the best). */
export function addQuestProgress(daily: DailyState, stats: Partial<Record<QuestGoal, number>>) {
  for (const s of daily.quests) {
    const q = questById(s.id);
    const v = q ? stats[q.goal] : undefined;
    if (!q || !v || s.claimed) continue;
    s.progress = Math.min(q.target, QUEST_GOALS[q.goal].best ? Math.max(s.progress, v) : s.progress + v);
  }
}

export const questDone = (s: { id: string; progress: number }) => {
  const q = questById(s.id);
  return !!q && s.progress >= q.target;
};

export const loginReady = (login: LoginState, day = utcDay()) => login.lastDay !== day && LOGIN_REWARDS.length > 0;
export const nextLoginReward = (login: LoginState) => LOGIN_REWARDS[login.claims % Math.max(1, LOGIN_REWARDS.length)];
