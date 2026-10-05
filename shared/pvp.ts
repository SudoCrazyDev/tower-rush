/**
 * PvP rules: timed waves, HP, sends (Bloons TD Battles style "eco"), the three modes and
 * matchmaking numbers. Part of the game config (`pvp`), edited on the admin PvP page.
 * See PVP.md.
 */
import { UNITS } from "./units.ts";
import { HEROES } from "./heroes.ts";
import { ARENAS } from "./arenas.ts";
import { MONSTER_BY_ID } from "./monsters.ts";

export type PvpMode = "ranked" | "mirror" | "casual";
export const PVP_MODES: PvpMode[] = ["ranked", "mirror", "casual"];

export const PVP_MODE_INFO: Record<PvpMode, { name: string; text: string }> = {
  ranked: { name: "Ranked", text: "Your deck at your card levels. Climb the ranked ladder and win trophies." },
  mirror: { name: "Mirror", text: "Both players get the same random deck and hero, same levels." },
  casual: { name: "Casual", text: "Your deck with every card at level 1. No trophies." },
};

export interface SendDef {
  id: string;
  name: string;
  /** A monster id, or "boss" for a boss from the arena's list. */
  monster: string;
  count: number;
  /** Health as a multiple of that monster's normal health on the current wave (a boss: of its boss-wave health). */
  hpMult: number;
  cost: number;
  /** Added to the sender's income for the rest of the match. */
  income: number;
  /** First wave it can be sent on. */
  unlockWave: number;
  /** Seconds for a used charge to come back; 0 = no limit, only mana (and the unlock wave) gate it. */
  cooldown: number;
  /** Charges held at once (ignored when cooldown is 0). */
  stock: number;
  /** HP the receiver loses per monster of this send that gets through. */
  leakDamage: number;
  enabled: boolean;
}

export interface PvpRules {
  hp: number;
  leakDamage: number;
  tankLeakDamage: number;
  bossLeakDamage: number;
  /** Seconds per normal wave and per boss wave (fixed clock, same for both players). */
  waveSeconds: number;
  bossWaveSeconds: number;
  /** Seconds before wave 1. */
  firstWaveDelay: number;
  /** Wave health compared with solo (PvP waves don't wait for the last one to be cleared). */
  waveHpScale: number;
  suddenDeathWave: number;
  suddenDeathGrowth: number;
  /** At this wave the match ends: more HP wins, equal HP is a draw. */
  maxWave: number;
  baseIncome: number;
  incomeEvery: number;
  /** Seconds between buying a send and it reaching the other board. */
  sendDelay: number;
  /** Share of a monster's normal mana a sent one pays when killed. */
  sentManaShare: number;
  /** Card level everyone plays at in Mirror. */
  mirrorLevel: number;
  // rewards
  trophyWin: number;
  trophyLoss: number;
  /** Trophies moved per 100 trophies of difference between the players (capped at half the base). */
  trophyGapStep: number;
  winCoins: number;
  lossCoins: number;
  drawCoins: number;
  // ranked rating (Elo, separate from trophies; see PVP.md)
  /** Rating every player starts at. */
  ratingStart: number;
  /** Most rating one match can move (Elo K) once placed. */
  ratingK: number;
  /** K for a player's first `ratingPlacementGames` ranked matches, so new players find their level fast. */
  ratingPlacementK: number;
  ratingPlacementGames: number;
  // matchmaking
  botAfterSeconds: number;
  /** Minutes a friend challenge code stays open. */
  challengeMinutes: number;
  /** Ranked: how far apart in rating two players can be paired at first, and how much that widens per second of waiting. */
  matchBand: number;
  matchBandGrowth: number;
}

/** A ranked tier: a name for a band of ranked rating, from `rating` up to the next tier. */
export interface RankTier {
  id: string;
  name: string;
  /** Rating needed to be in this tier. */
  rating: number;
  /** Badge colour ("#rrggbb"). */
  color: string;
}

export interface PvpConfig {
  rules: PvpRules;
  sends: SendDef[];
  /** Ranked tiers, any order (one must start at 0). */
  tiers: RankTier[];
}

const S = (id: string, name: string, monster: string, count: number, hpMult: number, cost: number, income: number, unlockWave: number, cooldown: number, stock: number, leakDamage = 1): SendDef => ({
  id,
  name,
  monster,
  count,
  hpMult,
  cost,
  income,
  unlockWave,
  cooldown,
  stock,
  leakDamage,
  enabled: true,
});

export const DEFAULT_PVP: PvpConfig = {
  rules: {
    hp: 20,
    leakDamage: 1,
    tankLeakDamage: 2,
    bossLeakDamage: 8,
    waveSeconds: 20,
    bossWaveSeconds: 32,
    firstWaveDelay: 4,
    waveHpScale: 0.5,
    suddenDeathWave: 20,
    suddenDeathGrowth: 1.32,
    maxWave: 40,
    baseIncome: 6,
    incomeEvery: 6,
    sendDelay: 3,
    sentManaShare: 0.25,
    mirrorLevel: 5,
    trophyWin: 30,
    trophyLoss: 22,
    trophyGapStep: 3,
    winCoins: 60,
    lossCoins: 20,
    drawCoins: 35,
    ratingStart: 1000,
    ratingK: 32,
    ratingPlacementK: 64,
    ratingPlacementGames: 10,
    botAfterSeconds: 10,
    challengeMinutes: 5,
    matchBand: 100,
    matchBandGrowth: 25,
  },
  sends: [
    // No cooldowns: mana is the only limit, Bloons TD Battles style spam.
    S("rabble", "Rabble", "zombie_peasant", 6, 1, 40, 4, 1, 0, 3),
    S("swarm", "Swarm", "goblin_runner", 10, 1, 80, 6, 3, 0, 2),
    S("bats", "Bats", "vampire_bat", 6, 1, 110, 7, 5, 0, 2),
    S("brute", "Brute", "orc_brute", 1, 2.5, 140, 7, 6, 0, 2, 3),
    S("healers", "Healers", "troll_healer", 3, 1.2, 200, 8, 8, 0, 2, 2),
    S("splitters", "Splitters", "gelatinous_cube", 4, 1.2, 260, 8, 10, 0, 1, 2),
    S("champion", "Champion", "boss", 1, 0.4, 600, 0, 15, 0, 1, 6),
  ],
  tiers: [
    { id: "rookie", name: "Rookie", rating: 0, color: "#a9b4c8" },
    { id: "contender", name: "Contender", rating: 1100, color: "#6fd68a" },
    { id: "veteran", name: "Veteran", rating: 1250, color: "#5cb4ff" },
    { id: "elite", name: "Elite", rating: 1400, color: "#c48bff" },
    { id: "legend", name: "Legend", rating: 1600, color: "#ffb340" },
  ],
};

export const PVP: PvpConfig = structuredClone(DEFAULT_PVP);

export const sendById = (id: string) => PVP.sends.find((s) => s.id === id && s.enabled);

/** Rules a friend challenge can use: the three modes, minus trophies. */
export const CHALLENGE_RULES: Record<PvpMode, string> = {
  ranked: "Your decks at your real card levels",
  casual: "Your decks, every card at level 1",
  mirror: "Same random deck and hero for both",
};

/** Name of a match's mode for the screen (a friendly game with real levels isn't "Ranked"). */
export const matchModeName = (setup: { mode: PvpMode; friendly?: boolean; practice?: boolean }) =>
  setup.practice
    ? `Practice ${PVP_MODE_INFO[setup.mode].name}`
    : setup.friendly ? `Friendly ${setup.mode === "ranked" ? "" : PVP_MODE_INFO[setup.mode].name}`.trim() : PVP_MODE_INFO[setup.mode].name;

/** Challenge codes: 6 characters, without ones that are easy to mix up (0/O, 1/I/L). */
export const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

/** A player's side of a match: everything their board needs. */
export interface Loadout {
  name: string;
  trophies: number;
  /** Ranked rating at the start of the match (missing on matches from before ratings). */
  rating?: number;
  deck: string[];
  /** Card level per deck unit. */
  levels: Record<string, number>;
  hero: string | null;
  bot?: boolean;
}

/** Everything both clients need to start the same match. */
export interface MatchSetup {
  id: string;
  mode: PvpMode;
  seed: number;
  arena: string;
  /** Server clock (ms) when wave time 0 starts. */
  startAt: number;
  /** A friend challenge (by code): no trophies either way. */
  friendly?: boolean;
  /** Practice against a bot (picked from the menu, no queue): no gold or trophies. */
  practice?: boolean;
  players: [Loadout, Loadout];
}

// ---------------------------------------------------------------- send charges (shared by client, bot and server)

/** Charges per send, refilled one at a time after its cooldown. A send with no cooldown has no limit. */
export class SendStock {
  /** Times (match seconds) when used charges come back. */
  private back: Record<string, number[]> = {};

  charges(s: SendDef, now: number) {
    if (s.cooldown <= 0) return Infinity;
    const b = (this.back[s.id] ??= []).filter((t) => t > now);
    this.back[s.id] = b;
    return Math.max(0, s.stock - b.length);
  }

  /** Seconds until the next charge comes back (0 when one is ready). */
  wait(s: SendDef, now: number) {
    if (this.charges(s, now) > 0) return 0;
    return Math.min(...this.back[s.id]) - now;
  }

  use(s: SendDef, now: number) {
    if (s.cooldown <= 0) return;
    // Charges refill one after another, not all at once.
    const b = (this.back[s.id] ??= []);
    const last = b.length ? Math.max(...b) : now;
    b.push(Math.max(now, last) + s.cooldown);
  }
}

/** Wave number at match time `t` seconds (0 before wave 1). */
export function waveAt(t: number, bossEvery: number) {
  const r = PVP.rules;
  let at = r.firstWaveDelay;
  let n = 0;
  while (t >= at && n < 1000) {
    n++;
    at += n % bossEvery === 0 ? r.bossWaveSeconds : r.waveSeconds;
  }
  return n;
}

/** Match time when wave `n` starts. */
export function waveStart(n: number, bossEvery: number) {
  const r = PVP.rules;
  let at = r.firstWaveDelay;
  for (let i = 1; i < n; i++) at += i % bossEvery === 0 ? r.bossWaveSeconds : r.waveSeconds;
  return at;
}

/** Why a send can't be made right now, or null. */
export function sendProblem(s: SendDef | undefined, wave: number, stock: SendStock, now: number, mana: number) {
  if (!s) return "Unknown send";
  if (wave < s.unlockWave) return `Unlocks at wave ${s.unlockWave}`;
  if (stock.charges(s, now) <= 0) return "Recharging";
  if (mana < s.cost) return "Not enough mana";
  return null;
}

// ---------------------------------------------------------------- loadouts

/** Small seeded PRNG (mulberry32), same as the sim's. */
function rand(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Arena for a match: picked from the seed among all arenas. */
export function pvpArena(seed: number) {
  const r = rand(seed ^ 0x9e3779b9);
  return ARENAS[Math.floor(r() * ARENAS.length)].id;
}

/** Mirror mode: one random deck and hero from the seed, everyone at the same level. */
export function mirrorLoadout(seed: number) {
  const r = rand(seed ^ 0x51ed270b);
  const pool = UNITS.filter((u) => u.enabled).map((u) => u.id);
  const deck: string[] = [];
  while (deck.length < 5 && pool.length) deck.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  const heroes = HEROES.filter((h) => h.enabled);
  const hero = heroes.length ? heroes[Math.floor(r() * heroes.length)].id : null;
  const levels = Object.fromEntries(deck.map((id) => [id, PVP.rules.mirrorLevel]));
  return { deck, hero, levels };
}

/** The loadout a player brings to a mode (the server builds it from the stored profile). */
export function loadoutFor(
  mode: PvpMode,
  p: { deck: string[]; cards: Record<string, { level: number }>; hero: string | null; trophies: number; ranked?: { rating: number } },
  name: string,
  seed: number,
): Loadout {
  const rating = p.ranked?.rating ?? PVP.rules.ratingStart;
  if (mode === "mirror") return { name, trophies: p.trophies, rating, ...mirrorLoadout(seed) };
  const levels = Object.fromEntries(p.deck.map((id) => [id, mode === "ranked" ? (p.cards[id]?.level ?? 1) : 1]));
  return { name, trophies: p.trophies, rating, deck: [...p.deck], levels, hero: p.hero };
}

const BOT_NAMES = ["Grizzle", "Moxie", "Tarn", "Pip", "Bramble", "Kestrel", "Odo", "Vex", "Juniper", "Rook", "Sable", "Wren", "Hob", "Marlo", "Quill", "Fennick"];

/** A bot opponent for `player` in `mode`: similar levels and deck strength for its trophies. */
export function botLoadout(mode: PvpMode, player: Loadout, seed: number): Loadout {
  const r = rand(seed ^ 0x2545f491);
  const name = BOT_NAMES[Math.floor(r() * BOT_NAMES.length)] + Math.floor(10 + r() * 90);
  const trophies = Math.max(0, player.trophies + Math.round((r() - 0.5) * 120));
  const rating = Math.max(0, (player.rating ?? PVP.rules.ratingStart) + Math.round((r() - 0.5) * 80));
  if (mode === "mirror") return { ...player, name, trophies, rating, bot: true };
  const pool = UNITS.filter((u) => u.enabled && u.arch !== "mana");
  const deck: string[] = [];
  // Rarer cards as trophies climb, like a real player's collection.
  const rarest = player.trophies < 400 ? 1 : player.trophies < 1500 ? 2 : player.trophies < 3000 ? 3 : 4;
  const ok = pool.filter((u) => ["common", "rare", "epic", "legendary", "mythic"].indexOf(u.rarity) <= rarest);
  while (deck.length < 5 && ok.length) deck.push(ok.splice(Math.floor(r() * ok.length), 1)[0].id);
  const avg = Object.values(player.levels).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(player.levels).length);
  const levels = Object.fromEntries(deck.map((id) => [id, mode === "casual" ? 1 : Math.max(1, Math.round(avg + (r() - 0.6) * 2))]));
  const heroes = HEROES.filter((h) => h.enabled && h.trophies <= player.trophies);
  const hero = heroes.length ? heroes[Math.floor(r() * heroes.length)].id : null;
  return { name, trophies, rating, deck, levels, hero, bot: true };
}

// ---------------------------------------------------------------- rewards

/** Trophy change for a ranked result, scaled by the gap (beating a stronger player pays more). */
export function trophyChange(won: boolean | null, mine: number, theirs: number) {
  if (won === null) return 0;
  const r = PVP.rules;
  const gap = Math.max(-1, Math.min(1, ((theirs - mine) / 100) * (r.trophyGapStep / Math.max(1, r.trophyWin))));
  return won ? Math.round(r.trophyWin * (1 + gap * 0.5)) : -Math.round(r.trophyLoss * (1 - gap * 0.5));
}

/**
 * Ranked rating change (Elo): K × (score − expected score), where the expected score comes
 * from the rating gap. Beating a higher-rated player pays more; a win always moves at least
 * +1 and a loss at least −1. `played` is how many ranked matches the player had finished before.
 */
export function ratingChange(won: boolean | null, mine: number, theirs: number, played: number) {
  const r = PVP.rules;
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400));
  const score = won === null ? 0.5 : won ? 1 : 0;
  const k = played < r.ratingPlacementGames ? r.ratingPlacementK : r.ratingK;
  const d = Math.round(k * (score - expected));
  return won === true ? Math.max(1, d) : won === false ? Math.min(-1, d) : d;
}

/** Tiers from lowest to highest rating. */
export const tiersByRating = (list = PVP.tiers) => [...list].sort((a, b) => a.rating - b.rating);

/** The tier a rating is in (the lowest tier if it's below every gate). */
export function tierFor(rating: number, list = PVP.tiers): RankTier {
  const sorted = tiersByRating(list);
  let best = sorted[0];
  for (const t of sorted) if (t.rating <= rating) best = t;
  return best;
}

/** The next tier up, or null at the top. */
export const nextTier = (rating: number, list = PVP.tiers) => tiersByRating(list).find((t) => t.rating > rating) ?? null;

// ---------------------------------------------------------------- network messages

/** Compact board state sent ~4x a second so the opponent can draw your board. */
export interface BoardSnap {
  t: number;
  hp: number;
  wave: number;
  mana: number;
  income: number;
  /** Per slot: [unit id, rank] or 0 for empty. */
  units: ([string, number] | 0)[];
  /** [uid, monster or boss id, path index, dist, hp 0-1]. */
  monsters: [number, string, number, number, number][];
}

/** Client to match room. */
export type ClientMsg =
  | { t: "send"; id: string; at: number }
  | { t: "snap"; s: BoardSnap }
  | { t: "dead"; at: number }
  /** Reached the end of the last wave alive, with this HP. */
  | { t: "end"; hp: number }
  | { t: "log"; log: unknown }
  | { t: "emote"; n: number }
  | { t: "leave" };

/** Match room to client. */
export type ServerMsg =
  | { t: "setup"; setup: MatchSetup; you: 0 | 1; now: number }
  | { t: "incoming"; id: string; at: number }
  | { t: "snap"; s: BoardSnap }
  | { t: "rejected"; id: string; reason: string }
  | { t: "opponent"; connected: boolean }
  | { t: "emote"; n: number }
  | { t: "over"; result: MatchResult; promotions?: unknown[] };

export interface MatchResult {
  /** 0 or 1, or null for a draw. */
  winner: 0 | 1 | null;
  reason: "hp" | "maxWave" | "left" | "disconnect";
  /** Per player. */
  trophies: [number, number];
  coins: [number, number];
  /** Ranked rating change per player (0 outside ranked; missing from older servers). */
  ratings?: [number, number];
}

// ---------------------------------------------------------------- validation

export function pvpProblems(cfg: PvpConfig | undefined): string[] {
  const errs: string[] = [];
  if (!cfg || typeof cfg !== "object") return ["pvp is missing"];
  const r = cfg.rules;
  if (!r) return ["pvp.rules is missing"];
  for (const [k, v] of Object.entries(r)) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) errs.push(`pvp.${k} must be a number ≥ 0`);
  }
  if (r.hp < 1) errs.push("pvp.hp must be at least 1");
  if (r.waveSeconds < 5 || r.bossWaveSeconds < 5) errs.push("pvp wave lengths must be at least 5 seconds");
  if (r.incomeEvery < 1) errs.push("pvp.incomeEvery must be at least 1 second");
  if (r.maxWave < 2) errs.push("pvp.maxWave must be at least 2");
  if (r.sentManaShare > 1) errs.push("pvp.sentManaShare must be at most 1");
  if (r.mirrorLevel < 1) errs.push("pvp.mirrorLevel must be at least 1");
  if (!Array.isArray(cfg.sends)) return [...errs, "pvp.sends must be a list"];
  const seen = new Set<string>();
  for (const s of cfg.sends) {
    const w = `Send ${s.id}`;
    if (!/^[a-z0-9_]+$/.test(s.id ?? "")) errs.push(`${w}: id must be lowercase letters, digits or _`);
    if (seen.has(s.id)) errs.push(`Duplicate send id "${s.id}"`);
    seen.add(s.id);
    if (!s.name) errs.push(`${w}: name is required`);
    if (s.monster !== "boss" && !MONSTER_BY_ID[s.monster]) errs.push(`${w}: unknown monster "${s.monster}"`);
    for (const k of ["count", "hpMult", "cost", "income", "unlockWave", "cooldown", "stock", "leakDamage"] as const) {
      if (typeof s[k] !== "number" || !Number.isFinite(s[k]) || s[k] < 0) errs.push(`${w}: ${k} must be a number ≥ 0`);
    }
    if (s.count < 1 || s.stock < 1) errs.push(`${w}: count and stock must be at least 1`);
  }
  if (!cfg.sends.some((s) => s.enabled)) errs.push("At least one send must be enabled");
  if (r.ratingK < 1 || r.ratingPlacementK < 1) errs.push("pvp rating K values must be at least 1");
  if (!Array.isArray(cfg.tiers) || !cfg.tiers.length) return [...errs, "pvp.tiers must list at least one tier"];
  const tierIds = new Set<string>();
  for (const t of cfg.tiers) {
    const w = `Tier ${t.id}`;
    if (!/^[a-z0-9_]+$/.test(t.id ?? "")) errs.push(`${w}: id must be lowercase letters, digits or _`);
    if (tierIds.has(t.id)) errs.push(`Duplicate tier id "${t.id}"`);
    tierIds.add(t.id);
    if (!t.name) errs.push(`${w}: name is required`);
    if (typeof t.rating !== "number" || !Number.isFinite(t.rating) || t.rating < 0) errs.push(`${w}: rating must be a number ≥ 0`);
    if (!/^#[0-9a-fA-F]{6}$/.test(t.color ?? "")) errs.push(`${w}: color must be #rrggbb`);
  }
  if (!cfg.tiers.some((t) => t.rating === 0)) errs.push("One ranked tier must start at rating 0");
  return errs;
}

/** What a send is made of, for the admin page. */
export const sendMonsterName = (s: SendDef) => (s.monster === "boss" ? "Arena boss" : (MONSTER_BY_ID[s.monster]?.name ?? s.monster));
