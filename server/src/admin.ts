import { Router } from "express";
import { db, audit } from "./db.ts";
import { analytics } from "./analytics.ts";
import { createSession, deleteSession, deleteSessionsFor, hashPassword, rateLimit, requireAdmin, verifyPassword } from "./auth.ts";
import { currentConfig, getVersion, listVersions, saveConfig } from "./config-store.ts";
import { getUser, publicUser, readProfile, writeProfile, NAME_RE, USERNAME_RE } from "./users.ts";
import { defaultConfig, type GameConfig } from "../../shared/config.ts";
import { newProfile, ownsHero } from "../../shared/profile.ts";
import { HERO_BY_ID } from "../../shared/heroes.ts";
import { leaguesByTrophies } from "../../shared/leagues.ts";
import { UNIT_BY_ID, maxCardLevel } from "../../shared/units.ts";
import { emptyReward, mailProblems } from "../../shared/mail.ts";
import type { Reward } from "../../shared/daily.ts";

export const admin = Router();

admin.post("/login", rateLimit(10, 5 * 60_000), (req, res) => {
  const { username, password } = req.body ?? {};
  const a = db.prepare("SELECT * FROM admins WHERE username = ?").get(String(username ?? "")) as
    | { id: number; username: string; password_hash: string }
    | undefined;
  if (!a || !verifyPassword(String(password ?? ""), a.password_hash)) return void res.status(401).json({ error: "Wrong username or password" });
  audit(a.id, "admin.login", a.username);
  res.json({ token: createSession("admin", a.id), admin: { id: a.id, username: a.username } });
});

admin.use(requireAdmin);

admin.post("/logout", (req, res) => {
  deleteSession(req.token!);
  res.json({ ok: true });
});

admin.get("/me", (req, res) => {
  res.json(db.prepare("SELECT id, username FROM admins WHERE id = ?").get(req.adminId!));
});

// ---------------------------------------------------------------- dashboard

admin.get("/stats", (_req, res) => {
  const one = (sql: string, ...args: (string | number)[]) => (db.prepare(sql).get(...args) as { n: number }).n;
  const day = Date.now() - 86400_000;
  res.json({
    users: one("SELECT COUNT(*) n FROM users"),
    registered: one("SELECT COUNT(*) n FROM users WHERE is_guest = 0"),
    banned: one("SELECT COUNT(*) n FROM users WHERE banned = 1"),
    activeToday: one("SELECT COUNT(*) n FROM users WHERE last_seen_at > ?", day),
    newToday: one("SELECT COUNT(*) n FROM users WHERE created_at > ?", day),
    battles: one("SELECT COUNT(*) n FROM battles WHERE finished_at IS NOT NULL"),
    battlesToday: one("SELECT COUNT(*) n FROM battles WHERE finished_at > ?", day),
    configVersion: currentConfig().id,
    // Players (not banned) in each league, lowest first.
    leagues: leaguesByTrophies().map((l, i, all) => ({
      league: l.id,
      players: one(
        "SELECT COUNT(*) n FROM users WHERE banned = 0 AND json_extract(profile, '$.trophies') >= ? AND json_extract(profile, '$.trophies') < ?",
        l.trophies,
        all[i + 1]?.trophies ?? Number.MAX_SAFE_INTEGER,
      ),
    })),
    topPlayers: db
      .prepare(
        `SELECT id, display_name AS name, json_extract(profile, '$.trophies') AS trophies, json_extract(profile, '$.bestWave') AS bestWave
         FROM users WHERE banned = 0 ORDER BY trophies DESC LIMIT 10`,
      )
      .all(),
    arenaPopularity: db
      .prepare(
        `SELECT arena, COUNT(*) AS battles, ROUND(AVG(wave), 1) AS avgWave, MAX(wave) AS maxWave
         FROM battles WHERE finished_at IS NOT NULL GROUP BY arena ORDER BY battles DESC`,
      )
      .all(),
    unitPopularity: db
      .prepare(
        `SELECT value AS unit, COUNT(*) AS decks FROM users, json_each(json_extract(users.profile, '$.deck'))
         GROUP BY value ORDER BY decks DESC LIMIT 15`,
      )
      .all(),
  });
});

/** Daily players and battles, retention and per-arena waves over the last `days` days. */
admin.get("/analytics", (req, res) => {
  const days = Math.max(7, Math.min(365, Math.floor(Number(req.query.days) || 30)));
  res.json(analytics(days));
});

// ---------------------------------------------------------------- game config

admin.get("/config", (_req, res) => {
  const c = currentConfig();
  res.json({ version: c.id, createdAt: c.createdAt, config: c.config, defaults: defaultConfig() });
});

admin.put("/config", (req, res) => {
  const config = req.body?.config as GameConfig;
  const note = String(req.body?.note ?? "").slice(0, 200) || "Edited in admin";
  const r = saveConfig(config, req.adminId!, note);
  if ("errors" in r) return void res.status(400).json({ error: "Config has problems", errors: r.errors });
  res.json({ version: r.id });
});

admin.get("/config/versions", (_req, res) => {
  res.json(listVersions());
});

admin.get("/config/versions/:id", (req, res) => {
  const cfg = getVersion(Number(req.params.id));
  if (!cfg) return void res.status(404).json({ error: "No such version" });
  res.json(cfg);
});

admin.post("/config/versions/:id/restore", (req, res) => {
  const cfg = getVersion(Number(req.params.id));
  if (!cfg) return void res.status(404).json({ error: "No such version" });
  const r = saveConfig(cfg, req.adminId!, `Restored v${req.params.id}`);
  if ("errors" in r) return void res.status(400).json({ error: "That version is no longer valid", errors: r.errors });
  res.json({ version: r.id });
});

admin.post("/config/reset", (req, res) => {
  const r = saveConfig(defaultConfig(), req.adminId!, "Reset to defaults");
  if ("errors" in r) return void res.status(500).json({ error: "Defaults are invalid", errors: r.errors });
  res.json({ version: r.id });
});

/** Sales per shop offer (all time and last 24h), for the Offers & events page. */
admin.get("/offers/sales", (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT offer, currency, COUNT(*) AS sold, COUNT(DISTINCT user_id) AS buyers, SUM(price) AS spent,
                SUM(created_at > ?) AS soldToday, MAX(created_at) AS lastAt
         FROM purchases GROUP BY offer, currency ORDER BY sold DESC`,
      )
      .all(Date.now() - 86400_000),
  );
});

// ---------------------------------------------------------------- users

admin.get("/users", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const filter = String(req.query.filter ?? "all");
  const sort = ({ trophies: "trophies", created: "created_at", seen: "last_seen_at", name: "display_name" } as Record<string, string>)[
    String(req.query.sort ?? "seen")
  ] ?? "last_seen_at";
  const page = Math.max(0, Number(req.query.page) || 0);
  const size = 50;
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (q) {
    where.push("(display_name LIKE ? OR username LIKE ? OR CAST(id AS TEXT) = ?)");
    args.push(`%${q}%`, `%${q}%`, q);
  }
  if (filter === "banned") where.push("banned = 1");
  if (filter === "guests") where.push("is_guest = 1");
  if (filter === "registered") where.push("is_guest = 0");
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) n FROM users ${w}`).get(...args) as { n: number }).n;
  const order = sort === "display_name" ? "display_name COLLATE NOCASE ASC" : sort === "trophies" ? "json_extract(profile, '$.trophies') DESC" : `${sort} DESC`;
  const rows = db
    .prepare(
      `SELECT id, username, display_name AS name, is_guest AS isGuest, banned, created_at AS createdAt, last_seen_at AS lastSeenAt,
              json_extract(profile, '$.coins') AS coins, json_extract(profile, '$.gems') AS gems,
              json_extract(profile, '$.trophies') AS trophies, json_extract(profile, '$.bestWave') AS bestWave
       FROM users ${w} ORDER BY ${order} LIMIT ? OFFSET ?`,
    )
    .all(...args, size, page * size);
  res.json({ total, page, pageSize: size, users: rows });
});

admin.get("/users/:id", (req, res) => {
  const u = getUser(Number(req.params.id));
  if (!u) return void res.status(404).json({ error: "No such user" });
  const battles = db
    .prepare("SELECT id, arena, deck, hero, started_at AS startedAt, finished_at AS finishedAt, wave, kills, bosses, coins, gems, trophies FROM battles WHERE user_id = ? ORDER BY id DESC LIMIT 50")
    .all(u.id);
  res.json({
    user: { ...publicUser(u), banned: !!u.banned, banReason: u.ban_reason, createdAt: u.created_at, lastSeenAt: u.last_seen_at, hasPassword: !!u.password_hash },
    profile: readProfile(u),
    battles,
  });
});

/** Edit currencies, trophies, name, deck... any subset of fields. */
admin.patch("/users/:id", (req, res) => {
  const u = getUser(Number(req.params.id));
  if (!u) return void res.status(404).json({ error: "No such user" });
  const p = readProfile(u);
  const body = req.body ?? {};
  for (const k of ["coins", "gems", "trophies", "bestWave"] as const) {
    if (body[k] === undefined) continue;
    const v = Number(body[k]);
    if (!Number.isInteger(v) || v < 0) return void res.status(400).json({ error: `${k} must be a whole number ≥ 0` });
    p[k] = v;
  }
  if (body.deck !== undefined) {
    if (!Array.isArray(body.deck) || body.deck.length !== 5 || new Set(body.deck).size !== 5 || body.deck.some((id: string) => !p.cards[id]))
      return void res.status(400).json({ error: "Deck needs 5 different cards the player owns" });
    p.deck = body.deck;
  }
  if (body.heroes !== undefined) {
    if (!Array.isArray(body.heroes) || body.heroes.some((id: unknown) => typeof id !== "string" || !HERO_BY_ID[id]))
      return void res.status(400).json({ error: "Unknown hero" });
    p.heroes = [...new Set(body.heroes as string[])];
  }
  if (body.hero !== undefined) {
    if (body.hero !== null && !ownsHero(p, String(body.hero))) return void res.status(400).json({ error: "The player doesn't own that hero" });
    p.hero = body.hero;
  }
  if (body.name !== undefined) {
    if (!NAME_RE.test(String(body.name))) return void res.status(400).json({ error: "Name: 3-20 characters" });
    db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(String(body.name), u.id);
  }
  if (body.username !== undefined) {
    const name = String(body.username);
    if (!USERNAME_RE.test(name)) return void res.status(400).json({ error: "Username: 3-20 letters, digits, _ . -" });
    const taken = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(name, u.id);
    if (taken) return void res.status(409).json({ error: "That username is taken" });
    db.prepare("UPDATE users SET username = ? WHERE id = ?").run(name, u.id);
  }
  writeProfile(u.id, p);
  audit(req.adminId!, "user.edit", `user:${u.id}`, body);
  res.json({ ok: true });
});

admin.put("/users/:id/cards/:card", (req, res) => {
  const u = getUser(Number(req.params.id));
  const card = String(req.params.card);
  if (!u) return void res.status(404).json({ error: "No such user" });
  if (!UNIT_BY_ID[card]) return void res.status(400).json({ error: "Unknown unit" });
  const level = Number(req.body?.level);
  const copies = Number(req.body?.copies);
  if (!Number.isInteger(level) || level < 1 || level > maxCardLevel()) return void res.status(400).json({ error: `Level must be 1-${maxCardLevel()}` });
  if (!Number.isInteger(copies) || copies < 0) return void res.status(400).json({ error: "Copies must be ≥ 0" });
  const p = readProfile(u);
  p.cards[card] = { level, copies };
  writeProfile(u.id, p);
  audit(req.adminId!, "user.card", `user:${u.id}`, { card, level, copies });
  res.json({ ok: true });
});

admin.delete("/users/:id/cards/:card", (req, res) => {
  const u = getUser(Number(req.params.id));
  const card = String(req.params.card);
  if (!u) return void res.status(404).json({ error: "No such user" });
  const p = readProfile(u);
  if (p.deck.includes(card)) return void res.status(400).json({ error: "Card is in the player's deck; change the deck first" });
  delete p.cards[card];
  writeProfile(u.id, p);
  audit(req.adminId!, "user.card.remove", `user:${u.id}`, { card });
  res.json({ ok: true });
});

admin.post("/users/:id/ban", (req, res) => {
  const u = getUser(Number(req.params.id));
  if (!u) return void res.status(404).json({ error: "No such user" });
  const reason = String(req.body?.reason ?? "").slice(0, 200) || null;
  // Sessions are kept: every request re-checks the ban, and unbanning restores access
  // (a guest whose session was deleted could never get back into their account).
  db.prepare("UPDATE users SET banned = 1, ban_reason = ? WHERE id = ?").run(reason, u.id);
  audit(req.adminId!, "user.ban", `user:${u.id}`, { reason });
  res.json({ ok: true });
});

admin.post("/users/:id/unban", (req, res) => {
  const u = getUser(Number(req.params.id));
  if (!u) return void res.status(404).json({ error: "No such user" });
  db.prepare("UPDATE users SET banned = 0, ban_reason = NULL WHERE id = ?").run(u.id);
  audit(req.adminId!, "user.unban", `user:${u.id}`);
  res.json({ ok: true });
});

admin.post("/users/:id/reset", (req, res) => {
  const u = getUser(Number(req.params.id));
  if (!u) return void res.status(404).json({ error: "No such user" });
  writeProfile(u.id, newProfile());
  audit(req.adminId!, "user.reset", `user:${u.id}`);
  res.json({ ok: true });
});

admin.post("/users/:id/password", (req, res) => {
  const u = getUser(Number(req.params.id));
  if (!u) return void res.status(404).json({ error: "No such user" });
  const pw = String(req.body?.password ?? "");
  if (pw.length < 6) return void res.status(400).json({ error: "Password must be at least 6 characters" });
  if (!u.username) return void res.status(400).json({ error: "Guest accounts need a username first" });
  db.prepare("UPDATE users SET password_hash = ?, is_guest = 0 WHERE id = ?").run(hashPassword(pw), u.id);
  deleteSessionsFor("player", u.id);
  audit(req.adminId!, "user.password", `user:${u.id}`);
  res.json({ ok: true });
});

admin.post("/users/:id/logout", (req, res) => {
  deleteSessionsFor("player", Number(req.params.id));
  audit(req.adminId!, "user.logout", `user:${req.params.id}`);
  res.json({ ok: true });
});

admin.delete("/users/:id", (req, res) => {
  const u = getUser(Number(req.params.id));
  if (!u) return void res.status(404).json({ error: "No such user" });
  deleteSessionsFor("player", u.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(u.id);
  audit(req.adminId!, "user.delete", `user:${u.id}`, { name: u.display_name, username: u.username });
  res.json({ ok: true });
});

// ---------------------------------------------------------------- inbox

/** Sent messages, newest first, with how many players got, read and claimed each. */
admin.get("/mail", (req, res) => {
  const page = Math.max(0, Number(req.query.page) || 0);
  const to = Number(req.query.to) || null;
  const rows = db
    .prepare(
      `SELECT m.id, m.user_id AS userId, u.display_name AS userName, m.title, m.body, m.reward, m.new_players AS newPlayers,
              m.created_at AS createdAt, m.expires_at AS expiresAt, a.username AS admin,
              CASE WHEN m.user_id IS NOT NULL THEN 1
                   WHEN m.new_players = 1 THEN (SELECT COUNT(*) FROM users)
                   ELSE (SELECT COUNT(*) FROM users WHERE created_at <= m.created_at) END AS recipients,
              (SELECT COUNT(*) FROM mail_state s WHERE s.mail_id = m.id AND s.read_at IS NOT NULL) AS reads,
              (SELECT COUNT(*) FROM mail_state s WHERE s.mail_id = m.id AND s.claimed_at IS NOT NULL) AS claims
       FROM mail m LEFT JOIN users u ON u.id = m.user_id LEFT JOIN admins a ON a.id = m.admin_id
       ${to ? "WHERE m.user_id = ?" : ""} ORDER BY m.id DESC LIMIT 50 OFFSET ?`,
    )
    .all(...(to ? [to] : []), page * 50) as { reward: string | null }[];
  res.json(rows.map((r) => ({ ...r, reward: r.reward ? JSON.parse(r.reward) : null })));
});

/** Send a message to one player (`to`: their id) or everyone (`to`: "all"). */
admin.post("/mail", (req, res) => {
  const b = req.body ?? {};
  const title = String(b.title ?? "").trim();
  const body = String(b.body ?? "").trim();
  const r = b.reward;
  let reward: Reward | null = r ? { coins: Number(r.coins) || 0, gems: Number(r.gems) || 0, chest: r.chest ? String(r.chest) : null } : null;
  if (reward && emptyReward(reward)) reward = null;
  const errors = mailProblems(title, body, reward);
  let userId: number | null = null;
  if (b.to !== "all") {
    userId = Number(b.to);
    if (!Number.isInteger(userId) || !getUser(userId)) errors.push("No such player");
  }
  const days = b.expiresInDays == null || b.expiresInDays === "" ? null : Number(b.expiresInDays);
  if (days !== null && !(days > 0 && days <= 365)) errors.push("Expiry must be 1-365 days, or empty for never");
  if (errors.length) return void res.status(400).json({ error: errors[0], errors });
  const now = Date.now();
  const id = db
    .prepare("INSERT INTO mail (user_id, title, body, reward, new_players, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(userId, title, body, reward && JSON.stringify(reward), userId === null && b.newPlayers ? 1 : 0, req.adminId!, now, days && now + days * 86400_000)
    .lastInsertRowid;
  audit(req.adminId!, "mail.send", userId === null ? "all players" : `user:${userId}`, { id: Number(id), title, reward });
  res.json({ id: Number(id) });
});

/** Take a message back: players who haven't claimed its gift no longer can. */
admin.delete("/mail/:id", (req, res) => {
  const m = db.prepare("SELECT id, title FROM mail WHERE id = ?").get(Number(req.params.id)) as { id: number; title: string } | undefined;
  if (!m) return void res.status(404).json({ error: "No such message" });
  db.prepare("DELETE FROM mail WHERE id = ?").run(m.id);
  audit(req.adminId!, "mail.recall", `mail:${m.id}`, { title: m.title });
  res.json({ ok: true });
});

// ---------------------------------------------------------------- admins & audit

admin.get("/admins", (_req, res) => {
  res.json(db.prepare("SELECT id, username, created_at AS createdAt FROM admins ORDER BY id").all());
});

admin.post("/admins", (req, res) => {
  const { username, password } = req.body ?? {};
  if (!USERNAME_RE.test(String(username ?? ""))) return void res.status(400).json({ error: "Username: 3-20 letters, digits, _ . -" });
  if (String(password ?? "").length < 8) return void res.status(400).json({ error: "Admin passwords need at least 8 characters" });
  if (db.prepare("SELECT id FROM admins WHERE username = ?").get(username)) return void res.status(409).json({ error: "That admin already exists" });
  db.prepare("INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)").run(username, hashPassword(password), Date.now());
  audit(req.adminId!, "admin.create", username);
  res.json({ ok: true });
});

admin.delete("/admins/:id", (req, res) => {
  const id = Number(req.params.id);
  if (id === req.adminId) return void res.status(400).json({ error: "You can't delete yourself" });
  deleteSessionsFor("admin", id);
  db.prepare("DELETE FROM admins WHERE id = ?").run(id);
  audit(req.adminId!, "admin.delete", `admin:${id}`);
  res.json({ ok: true });
});

admin.post("/me/password", (req, res) => {
  const a = db.prepare("SELECT password_hash FROM admins WHERE id = ?").get(req.adminId!) as { password_hash: string };
  if (!verifyPassword(String(req.body?.current ?? ""), a.password_hash)) return void res.status(400).json({ error: "Current password is wrong" });
  const pw = String(req.body?.password ?? "");
  if (pw.length < 8) return void res.status(400).json({ error: "Admin passwords need at least 8 characters" });
  db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(hashPassword(pw), req.adminId!);
  audit(req.adminId!, "admin.password", `admin:${req.adminId}`);
  res.json({ ok: true });
});

admin.get("/audit", (req, res) => {
  const page = Math.max(0, Number(req.query.page) || 0);
  res.json(
    db
      .prepare(
        `SELECT l.id, l.action, l.target, l.details, l.created_at AS createdAt, a.username AS admin
         FROM audit l LEFT JOIN admins a ON a.id = l.admin_id ORDER BY l.id DESC LIMIT 100 OFFSET ?`,
      )
      .all(page * 100),
  );
});

export function ensureAdmin(write: (msg: string) => void) {
  const n = (db.prepare("SELECT COUNT(*) n FROM admins").get() as { n: number }).n;
  if (n > 0) return null;
  const username = process.env.ADMIN_USERNAME || "admin";
  let password = process.env.ADMIN_PASSWORD || "";
  const generated = !password;
  if (generated) password = Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString("base64url");
  db.prepare("INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)").run(username, hashPassword(password), Date.now());
  if (generated) write(`username: ${username}\npassword: ${password}\n\nChange it in the admin panel (Admins page), then delete this file.\n`);
  return { username, generated };
}
