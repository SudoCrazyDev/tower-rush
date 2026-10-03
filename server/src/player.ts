import { Router, type Request, type Response } from "express";
import { db } from "./db.ts";
import { createSession, deleteSession, hashPassword, rateLimit, requirePlayer, verifyPassword } from "./auth.ts";
import { currentConfig } from "./config-store.ts";
import { createUser, getUser, getUserByName, publicUser, readProfile, touch, writeProfile, NAME_RE, USERNAME_RE, type UserRow } from "./users.ts";
import { canUpgrade, chestById, giftReadyAt, grantReward, heroBuyProblem, ownsHero, refreshDaily, rollChests, type Profile } from "../../shared/profile.ts";
import { addQuestProgress, loginReady, nextLoginReward, questById, questDone, utcDay } from "../../shared/daily.ts";
import { HERO_BY_ID } from "../../shared/heroes.ts";
import { UNIT_BY_ID, upgradeCost } from "../../shared/units.ts";
import { ARENAS, ARENA_BY_ID } from "../../shared/arenas.ts";
import { ECONOMY, battleRewards } from "../../shared/economy.ts";

export const player = Router();

player.get("/config", (_req, res) => {
  const c = currentConfig();
  res.json({ version: c.id, config: c.config });
});

// ---------------------------------------------------------------- auth

const authLimit = rateLimit(20, 5 * 60_000);

player.post("/auth/guest", authLimit, (_req, res) => {
  const u = createUser(`Player${Math.floor(1000 + Math.random() * 9000)}`);
  res.json({ token: createSession("player", u.id), user: publicUser(u) });
});

player.post("/auth/login", authLimit, (req, res) => {
  const { username, password } = req.body ?? {};
  const u = typeof username === "string" ? getUserByName(username) : undefined;
  if (!u || !verifyPassword(String(password ?? ""), u.password_hash)) return void res.status(401).json({ error: "Wrong username or password" });
  if (u.banned) return void res.status(403).json({ error: "banned", reason: u.ban_reason });
  res.json({ token: createSession("player", u.id), user: publicUser(u) });
});

/** Register a new account, or claim the current guest account by giving it a username. */
player.post("/auth/register", authLimit, (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || !USERNAME_RE.test(username))
    return void res.status(400).json({ error: "Username: 3-20 letters, digits, _ . -" });
  if (typeof password !== "string" || password.length < 6) return void res.status(400).json({ error: "Password must be at least 6 characters" });
  if (getUserByName(username)) return void res.status(409).json({ error: "That username is taken" });

  // Upgrade the caller's guest account if they're signed in as one.
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  const s = token ? (db.prepare("SELECT subject_id FROM sessions WHERE token = ? AND kind = 'player'").get(token) as { subject_id: number } | undefined) : undefined;
  let u = s ? getUser(s.subject_id) : undefined;
  if (!u || !u.is_guest) u = createUser(username);
  db.prepare("UPDATE users SET username = ?, password_hash = ?, is_guest = 0, display_name = ? WHERE id = ?").run(
    username,
    hashPassword(password),
    u.is_guest ? username : u.display_name,
    u.id,
  );
  u = getUser(u.id)!;
  res.json({ token: createSession("player", u.id), user: publicUser(u) });
});

player.post("/auth/logout", requirePlayer, (req, res) => {
  deleteSession(req.token!);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- profile

/** Load the signed-in user, rejecting banned accounts. */
function me(req: Request, res: Response): { u: UserRow; p: Profile } | null {
  const u = getUser(req.playerId!);
  if (!u) {
    res.status(401).json({ error: "Account no longer exists" });
    return null;
  }
  if (u.banned) {
    res.status(403).json({ error: "banned", reason: u.ban_reason });
    return null;
  }
  touch(u.id);
  const p = readProfile(u);
  // A new UTC day brings new quests.
  if (refreshDaily(p)) writeProfile(u.id, p);
  return { u, p };
}

player.use(["/me", "/cards", "/heroes", "/shop", "/battles", "/daily"], requirePlayer);

player.get("/me", (req, res) => {
  const m = me(req, res);
  if (m) res.json({ user: publicUser(m.u), profile: m.p });
});

player.put("/me/deck", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const deck = req.body?.deck;
  if (!Array.isArray(deck) || deck.length !== 5 || new Set(deck).size !== 5) return void res.status(400).json({ error: "Deck needs 5 different cards" });
  for (const id of deck) {
    if (!m.p.cards[id]) return void res.status(400).json({ error: `You don't own ${id}` });
    if (!UNIT_BY_ID[id]?.enabled) return void res.status(400).json({ error: `${id} is not available` });
  }
  m.p.deck = deck;
  writeProfile(m.u.id, m.p);
  res.json({ profile: m.p });
});

player.put("/me/arena", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const a = ARENA_BY_ID[req.body?.arena];
  if (!a || a.trophies > m.p.trophies) return void res.status(400).json({ error: "Arena is locked" });
  m.p.arena = a.id;
  writeProfile(m.u.id, m.p);
  res.json({ profile: m.p });
});

/** Pick the hero taken into battle (null for none). */
player.put("/me/hero", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const id = req.body?.hero ?? null;
  if (id !== null) {
    if (typeof id !== "string" || !ownsHero(m.p, id)) return void res.status(400).json({ error: "You don't have that hero" });
    if (!HERO_BY_ID[id].enabled) return void res.status(400).json({ error: "That hero isn't available" });
  }
  m.p.hero = id;
  writeProfile(m.u.id, m.p);
  res.json({ profile: m.p });
});

player.post("/heroes/:id/buy", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const id = String(req.params.id);
  const problem = heroBuyProblem(m.p, id);
  if (problem) return void res.status(400).json({ error: problem });
  m.p.gems -= HERO_BY_ID[id].price;
  m.p.heroes.push(id);
  m.p.hero = id;
  writeProfile(m.u.id, m.p);
  res.json({ profile: m.p });
});

player.put("/me/name", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const name = String(req.body?.name ?? "").trim();
  if (!NAME_RE.test(name)) return void res.status(400).json({ error: "Name: 3-20 characters" });
  db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(name, m.u.id);
  res.json({ user: publicUser(getUser(m.u.id)!) });
});

player.post("/cards/:id/upgrade", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const id = String(req.params.id);
  if (!canUpgrade(m.p, id)) return void res.status(400).json({ error: "Not enough cards or gold" });
  const c = m.p.cards[id];
  const cost = upgradeCost(c.level, UNIT_BY_ID[id].rarity);
  c.copies -= cost.copies;
  m.p.coins -= cost.coins;
  c.level++;
  addQuestProgress(m.p.daily, { upgrades: 1 });
  writeProfile(m.u.id, m.p);
  res.json({ profile: m.p });
});

player.post("/shop/chests/:id/buy", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const chest = chestById(String(req.params.id));
  if (!chest || !chest.enabled) return void res.status(404).json({ error: "That chest isn't for sale" });
  const count = Number(req.body?.count ?? 1);
  const most = ECONOMY.chestBulkMax;
  if (!Number.isInteger(count) || count < 1 || count > most) return void res.status(400).json({ error: `You can buy 1 to ${most} at a time` });
  const cost = chest.price * count;
  if (m.p[chest.currency] < cost) return void res.status(400).json({ error: `Not enough ${chest.currency}` });
  m.p[chest.currency] -= cost;
  const loot = rollChests(m.p, chest, count);
  addQuestProgress(m.p.daily, { chests: count });
  writeProfile(m.u.id, m.p);
  res.json({ loot, profile: m.p });
});

player.post("/shop/gift", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  if (Date.now() < giftReadyAt(m.p)) return void res.status(400).json({ error: "Gift isn't ready yet" });
  m.p.lastGift = Date.now();
  m.p.coins += ECONOMY.giftCoins;
  m.p.gems += ECONOMY.giftGems;
  writeProfile(m.u.id, m.p);
  res.json({ profile: m.p });
});

// ---------------------------------------------------------------- daily login + quests

/** Today's login reward (once per UTC day; the calendar advances one step per claim). */
player.post("/daily/login", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const day = utcDay();
  if (!loginReady(m.p.login, day)) return void res.status(400).json({ error: "Come back tomorrow for the next reward" });
  const reward = nextLoginReward(m.p.login);
  const loot = grantReward(m.p, reward);
  m.p.login = { claims: m.p.login.claims + 1, lastDay: day };
  writeProfile(m.u.id, m.p);
  res.json({ reward, loot, profile: m.p });
});

player.post("/daily/quests/:id/claim", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const s = m.p.daily.quests.find((q) => q.id === req.params.id);
  const q = questById(String(req.params.id));
  if (!s || !q) return void res.status(404).json({ error: "That quest isn't one of today's" });
  if (s.claimed) return void res.status(400).json({ error: "Already claimed" });
  if (!questDone(s)) return void res.status(400).json({ error: "Quest isn't finished yet" });
  s.claimed = true;
  const loot = grantReward(m.p, q.reward);
  writeProfile(m.u.id, m.p);
  res.json({ reward: q.reward, loot, profile: m.p });
});

/** Bonus for claiming every one of today's quests. */
player.post("/daily/bonus", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const d = m.p.daily;
  if (d.bonusClaimed) return void res.status(400).json({ error: "Already claimed" });
  if (!d.quests.length || d.quests.some((q) => !q.claimed)) return void res.status(400).json({ error: "Claim every quest first" });
  d.bonusClaimed = true;
  const reward = { coins: ECONOMY.questBonusCoins, gems: ECONOMY.questBonusGems, chest: null };
  grantReward(m.p, reward);
  writeProfile(m.u.id, m.p);
  res.json({ reward, loot: null, profile: m.p });
});

// ---------------------------------------------------------------- battles

player.post("/battles", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const a = ARENA_BY_ID[req.body?.arena];
  if (!a || a.trophies > m.p.trophies) return void res.status(400).json({ error: "Arena is locked" });
  const r = db
    .prepare("INSERT INTO battles (user_id, arena, deck, hero, started_at) VALUES (?, ?, ?, ?, ?)")
    .run(m.u.id, a.id, JSON.stringify(m.p.deck), m.p.hero, Date.now());
  res.json({ battleId: Number(r.lastInsertRowid) });
});

/**
 * The battle runs in the browser, so the client reports how far it got. The server
 * clamps that to what's physically possible in the elapsed time and computes rewards.
 */
player.post("/battles/:id/finish", (req, res) => {
  const m = me(req, res);
  if (!m) return;
  const b = db.prepare("SELECT * FROM battles WHERE id = ? AND user_id = ?").get(Number(req.params.id), m.u.id) as
    | { id: number; arena: string; started_at: number; finished_at: number | null }
    | undefined;
  if (!b) return void res.status(404).json({ error: "Unknown battle" });
  if (b.finished_at) return void res.status(409).json({ error: "Battle already finished" });

  const elapsed = (Date.now() - b.started_at) / 1000;
  const maxWave = Math.floor(elapsed / 3) + 1; // waves can't be cleared faster than ~3s even at 2x
  const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const wave = int(req.body?.wave, maxWave);
  const bosses = int(req.body?.bosses, Math.floor(wave / ECONOMY.bossEvery));
  const kills = int(req.body?.kills, wave * 80);
  // Quest counters, capped to what the run could plausibly have done.
  const summons = int(req.body?.summons, 15 + wave * 12);
  const merges = int(req.body?.merges, summons);
  const awakens = int(req.body?.awakens, Math.floor(merges / 63)); // a max-rank unit takes 63 merges
  const heroCasts = int(req.body?.heroCasts, Math.floor(elapsed / 10) + 1);

  const arenaIndex = Math.max(0, ARENAS.findIndex((a) => a.id === b.arena));
  const rewards = battleRewards(wave, bosses, arenaIndex);
  const newBest = wave > m.p.bestWave;
  m.p.coins += rewards.coins;
  m.p.gems += rewards.gems;
  m.p.trophies = Math.max(0, m.p.trophies + rewards.trophies);
  m.p.bestWave = Math.max(m.p.bestWave, wave);
  addQuestProgress(m.p.daily, { battles: 1, wave, kills, bosses, summons, merges, awakens, heroCasts });
  writeProfile(m.u.id, m.p);
  db.prepare("UPDATE battles SET finished_at = ?, wave = ?, kills = ?, bosses = ?, coins = ?, gems = ?, trophies = ? WHERE id = ?").run(
    Date.now(),
    wave,
    kills,
    bosses,
    rewards.coins,
    rewards.gems,
    rewards.trophies,
    b.id,
  );
  res.json({ rewards, newBest, wave, profile: m.p });
});

// ---------------------------------------------------------------- leaderboard

/** Ranked by trophies or by best wave. Players with 0 aren't ranked; ties share a rank. */
const BOARDS = {
  trophies: "json_extract(profile, '$.trophies')",
  wave: "json_extract(profile, '$.bestWave')",
} as const;
const LEADERBOARD_SIZE = 100;

player.get("/leaderboard", requirePlayer, (req, res) => {
  const by = req.query.by === "wave" ? "wave" : "trophies";
  const v = BOARDS[by];
  const rows = db
    .prepare(
      `SELECT id, display_name AS name, json_extract(profile, '$.trophies') AS trophies,
              json_extract(profile, '$.bestWave') AS bestWave, json_extract(profile, '$.hero') AS hero,
              RANK() OVER (ORDER BY ${v} DESC) AS rank
       FROM users WHERE banned = 0 AND ${v} > 0
       ORDER BY rank, id LIMIT ?`,
    )
    .all(LEADERBOARD_SIZE);
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM users WHERE banned = 0 AND ${v} > 0`).get() as { n: number }).n;
  // The caller's own place, even when they're outside the list.
  const mine = db.prepare(`SELECT ${v} AS value, banned FROM users WHERE id = ?`).get(req.playerId!) as { value: number; banned: number } | undefined;
  const rank =
    mine && mine.value > 0 && !mine.banned
      ? (db.prepare(`SELECT COUNT(*) + 1 AS r FROM users WHERE banned = 0 AND ${v} > ?`).get(mine.value) as { r: number }).r
      : null;
  res.json({ by, rows, total, me: { id: req.playerId, rank } });
});
