import { Hono } from "hono";
import { all, audit, count, one, run } from "./db.ts";
import { analytics } from "./analytics.ts";
import { createSession, deleteSession, deleteSessionsFor, hashPassword, needsRehash, rateLimit, requireAdmin, verifyPassword } from "./auth.ts";
import { currentConfig, getVersion, listVersions, saveConfig } from "./config-store.ts";
import { body, fail, numParam, param, type AppEnv, type Bindings, type Ctx } from "./http.ts";
import { getUser, publicUser, readProfile, writeProfile, NAME_RE, USERNAME_RE } from "./users.ts";
import { defaultConfig, type GameConfig } from "../../shared/config.ts";
import { newProfile, ownsHero, type Profile } from "../../shared/profile.ts";
import { HERO_BY_ID } from "../../shared/heroes.ts";
import { leaguesByTrophies } from "../../shared/leagues.ts";
import { UNIT_BY_ID, maxCardLevel } from "../../shared/units.ts";
import { emptyReward, mailProblems } from "../../shared/mail.ts";
import type { Reward } from "../../shared/daily.ts";

export const admin = new Hono<AppEnv>();

interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
}

admin.post("/login", rateLimit("ADMIN_LIMIT"), async (c) => {
  const db = c.env.DB;
  await ensureAdmin(db, c.env);
  const { username, password } = await body(c);
  const a = await one<AdminRow>(db, "SELECT * FROM admins WHERE username = ?", String(username ?? ""));
  if (!a || !(await verifyPassword(String(password ?? ""), a.password_hash))) fail(401, "Wrong username or password");
  if (needsRehash(a.password_hash)) await run(db, "UPDATE admins SET password_hash = ? WHERE id = ?", await hashPassword(String(password)), a.id);
  await audit(db, a.id, "admin.login", a.username);
  return c.json({ token: await createSession(db, "admin", a.id), admin: { id: a.id, username: a.username } });
});

admin.use(requireAdmin);

admin.post("/logout", async (c) => {
  await deleteSession(c.env.DB, c.get("token"));
  return c.json({ ok: true });
});

admin.get("/me", async (c) => c.json(await one(c.env.DB, "SELECT id, username FROM admins WHERE id = ?", c.get("adminId"))));

// ---------------------------------------------------------------- dashboard

admin.get("/stats", async (c) => {
  const db = c.env.DB;
  const day = Date.now() - 86400_000;
  const trophies = "json_extract(profile, '$.trophies')";
  const leagues = leaguesByTrophies();
  const [users, registered, banned, activeToday, newToday, battles, battlesToday, perLeague, topPlayers, arenaPopularity, unitPopularity] =
    await Promise.all([
      count(db, "SELECT COUNT(*) n FROM users"),
      count(db, "SELECT COUNT(*) n FROM users WHERE is_guest = 0"),
      count(db, "SELECT COUNT(*) n FROM users WHERE banned = 1"),
      count(db, "SELECT COUNT(*) n FROM users WHERE last_seen_at > ?", day),
      count(db, "SELECT COUNT(*) n FROM users WHERE created_at > ?", day),
      count(db, "SELECT COUNT(*) n FROM battles WHERE finished_at IS NOT NULL"),
      count(db, "SELECT COUNT(*) n FROM battles WHERE finished_at > ?", day),
      // Players (not banned) in each league, lowest first.
      Promise.all(
        leagues.map((l, i) =>
          count(db, `SELECT COUNT(*) n FROM users WHERE banned = 0 AND ${trophies} >= ? AND ${trophies} < ?`, l.trophies, leagues[i + 1]?.trophies ?? Number.MAX_SAFE_INTEGER),
        ),
      ),
      all(
        db,
        `SELECT id, display_name AS name, ${trophies} AS trophies, json_extract(profile, '$.bestWave') AS bestWave
         FROM users WHERE banned = 0 ORDER BY trophies DESC LIMIT 10`,
      ),
      all(
        db,
        `SELECT arena, COUNT(*) AS battles, ROUND(AVG(wave), 1) AS avgWave, MAX(wave) AS maxWave
         FROM battles WHERE finished_at IS NOT NULL GROUP BY arena ORDER BY battles DESC`,
      ),
      all(
        db,
        `SELECT value AS unit, COUNT(*) AS decks FROM users, json_each(json_extract(users.profile, '$.deck'))
         GROUP BY value ORDER BY decks DESC LIMIT 15`,
      ),
    ]);
  return c.json({
    users,
    registered,
    banned,
    activeToday,
    newToday,
    battles,
    battlesToday,
    configVersion: currentConfig().id,
    leagues: leagues.map((l, i) => ({ league: l.id, players: perLeague[i] })),
    topPlayers,
    arenaPopularity,
    unitPopularity,
  });
});

/** Daily players and battles, retention and per-arena waves over the last `days` days. */
admin.get("/analytics", async (c) => {
  const days = Math.max(7, Math.min(365, Math.floor(Number(c.req.query("days")) || 30)));
  return c.json(await analytics(c.env.DB, days));
});

// ---------------------------------------------------------------- game config

admin.get("/config", (c) => {
  const cfg = currentConfig();
  return c.json({ version: cfg.id, createdAt: cfg.createdAt, config: cfg.config, defaults: defaultConfig() });
});

admin.put("/config", async (c) => {
  const b = await body(c);
  const note = String(b.note ?? "").slice(0, 200) || "Edited in admin";
  const r = await saveConfig(c.env.DB, b.config as GameConfig, c.get("adminId"), note);
  if ("errors" in r) fail(400, "Config has problems", { errors: r.errors });
  return c.json({ version: r.id });
});

admin.get("/config/versions", async (c) => c.json(await listVersions(c.env.DB)));

admin.get("/config/versions/:id", async (c) => {
  const cfg = await getVersion(c.env.DB, numParam(c, "id"));
  if (!cfg) fail(404, "No such version");
  return c.json(cfg);
});

admin.post("/config/versions/:id/restore", async (c) => {
  const id = numParam(c, "id");
  const cfg = await getVersion(c.env.DB, id);
  if (!cfg) fail(404, "No such version");
  const r = await saveConfig(c.env.DB, cfg, c.get("adminId"), `Restored v${id}`);
  if ("errors" in r) fail(400, "That version is no longer valid", { errors: r.errors });
  return c.json({ version: r.id });
});

admin.post("/config/reset", async (c) => {
  const r = await saveConfig(c.env.DB, defaultConfig(), c.get("adminId"), "Reset to defaults");
  if ("errors" in r) fail(500, "Defaults are invalid", { errors: r.errors });
  return c.json({ version: r.id });
});

/** Sales per shop offer (all time and last 24h), for the Offers & events page. */
admin.get("/offers/sales", async (c) =>
  c.json(
    await all(
      c.env.DB,
      `SELECT offer, currency, COUNT(*) AS sold, COUNT(DISTINCT user_id) AS buyers, SUM(price) AS spent,
              SUM(created_at > ?) AS soldToday, MAX(created_at) AS lastAt
       FROM purchases GROUP BY offer, currency ORDER BY sold DESC`,
      Date.now() - 86400_000,
    ),
  ),
);

// ---------------------------------------------------------------- pvp

/** Recent PvP matches, plus counts for the last day. */
admin.get("/pvp/matches", async (c) => {
  const db = c.env.DB;
  const day = Date.now() - 86400_000;
  const [rows, summary] = await Promise.all([
    all(
      db,
      `SELECT m.id, m.mode, json_extract(m.setup, '$.friendly') AS friendly, m.p1, m.p2, a.display_name AS name1, b.display_name AS name2,
              json_extract(m.setup, '$.players[1].name') AS botName, json_extract(m.setup, '$.arena') AS arena,
              m.started_at AS startedAt, m.finished_at AS finishedAt, m.winner, m.reason,
              m.trophies1, m.trophies2, m.log1 IS NOT NULL AS hasLog1, m.log2 IS NOT NULL AS hasLog2
       FROM pvp_matches m LEFT JOIN users a ON a.id = m.p1 LEFT JOIN users b ON b.id = m.p2
       ORDER BY m.started_at DESC LIMIT 50`,
    ),
    one(
      db,
      `SELECT COUNT(*) AS matches, SUM(p2 IS NULL) AS botMatches, SUM(finished_at IS NULL) AS unfinished,
              AVG(CASE WHEN finished_at IS NOT NULL THEN finished_at - started_at END) AS avgMs
       FROM pvp_matches WHERE started_at > ?`,
      day,
    ),
  ]);
  return c.json({ rows, summary });
});

// ---------------------------------------------------------------- users

admin.get("/users", async (c) => {
  const db = c.env.DB;
  const q = String(c.req.query("q") ?? "").trim();
  const filter = String(c.req.query("filter") ?? "all");
  const sort =
    ({ trophies: "trophies", created: "created_at", seen: "last_seen_at", name: "display_name" } as Record<string, string>)[String(c.req.query("sort") ?? "seen")] ??
    "last_seen_at";
  const page = Math.max(0, Number(c.req.query("page")) || 0);
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
  const order = sort === "display_name" ? "display_name COLLATE NOCASE ASC" : sort === "trophies" ? "json_extract(profile, '$.trophies') DESC" : `${sort} DESC`;
  const [total, users] = await Promise.all([
    count(db, `SELECT COUNT(*) n FROM users ${w}`, ...args),
    all(
      db,
      `SELECT id, username, display_name AS name, is_guest AS isGuest, banned, created_at AS createdAt, last_seen_at AS lastSeenAt,
              json_extract(profile, '$.coins') AS coins, json_extract(profile, '$.gems') AS gems,
              json_extract(profile, '$.trophies') AS trophies, json_extract(profile, '$.bestWave') AS bestWave
       FROM users ${w} ORDER BY ${order} LIMIT ? OFFSET ?`,
      ...args,
      size,
      page * size,
    ),
  ]);
  return c.json({ total, page, pageSize: size, users });
});

async function userOr404(c: Ctx) {
  const u = await getUser(c.env.DB, numParam(c, "id"));
  if (!u) fail(404, "No such user");
  return u;
}

admin.get("/users/:id", async (c) => {
  const u = await userOr404(c);
  const battles = await all(
    c.env.DB,
    "SELECT id, arena, deck, hero, started_at AS startedAt, finished_at AS finishedAt, wave, kills, bosses, coins, gems, trophies FROM battles WHERE user_id = ? ORDER BY id DESC LIMIT 50",
    u.id,
  );
  return c.json({
    user: { ...publicUser(u), banned: !!u.banned, banReason: u.ban_reason, createdAt: u.created_at, lastSeenAt: u.last_seen_at, hasPassword: !!u.password_hash },
    profile: readProfile(u),
    battles,
  });
});

/** Change a player's profile; refuses (409) if the player saved it at the same moment. */
async function editProfile(c: Ctx, change: (p: Profile) => void) {
  const u = await userOr404(c);
  const p = readProfile(u);
  change(p);
  if (!(await writeProfile(c.env.DB, u, p))) fail(409, "The player's progress just changed; try again");
  return u;
}

/** Edit currencies, trophies, name, deck... any subset of fields. */
admin.patch("/users/:id", async (c) => {
  const db = c.env.DB;
  const b = await body(c);
  const id = numParam(c, "id");
  if (b.name !== undefined && !NAME_RE.test(String(b.name))) fail(400, "Name: 3-20 characters");
  if (b.username !== undefined) {
    if (!USERNAME_RE.test(String(b.username))) fail(400, "Username: 3-20 letters, digits, _ . -");
    if (await one(db, "SELECT id FROM users WHERE username = ? AND id != ?", String(b.username), id)) fail(409, "That username is taken");
  }
  await editProfile(c, (p) => {
    for (const k of ["coins", "gems", "trophies", "bestWave"] as const) {
      if (b[k] === undefined) continue;
      const v = Number(b[k]);
      if (!Number.isInteger(v) || v < 0) fail(400, `${k} must be a whole number ≥ 0`);
      p[k] = v;
    }
    if (b.deck !== undefined) {
      if (!Array.isArray(b.deck) || b.deck.length !== 5 || new Set(b.deck).size !== 5 || b.deck.some((d: string) => !p.cards[d]))
        fail(400, "Deck needs 5 different cards the player owns");
      p.deck = b.deck;
    }
    if (b.heroes !== undefined) {
      if (!Array.isArray(b.heroes) || b.heroes.some((h: unknown) => typeof h !== "string" || !HERO_BY_ID[h])) fail(400, "Unknown hero");
      p.heroes = [...new Set(b.heroes as string[])];
    }
    if (b.hero !== undefined) {
      if (b.hero !== null && !ownsHero(p, String(b.hero))) fail(400, "The player doesn't own that hero");
      p.hero = b.hero;
    }
  });
  if (b.name !== undefined) await run(db, "UPDATE users SET display_name = ? WHERE id = ?", String(b.name), id);
  if (b.username !== undefined) await run(db, "UPDATE users SET username = ? WHERE id = ?", String(b.username), id);
  await audit(db, c.get("adminId"), "user.edit", `user:${id}`, b);
  return c.json({ ok: true });
});

admin.put("/users/:id/cards/:card", async (c) => {
  const card = param(c, "card");
  if (!UNIT_BY_ID[card]) fail(400, "Unknown unit");
  const b = await body(c);
  const level = Number(b.level);
  const copies = Number(b.copies);
  if (!Number.isInteger(level) || level < 1 || level > maxCardLevel()) fail(400, `Level must be 1-${maxCardLevel()}`);
  if (!Number.isInteger(copies) || copies < 0) fail(400, "Copies must be ≥ 0");
  const u = await editProfile(c, (p) => {
    p.cards[card] = { level, copies };
  });
  await audit(c.env.DB, c.get("adminId"), "user.card", `user:${u.id}`, { card, level, copies });
  return c.json({ ok: true });
});

admin.delete("/users/:id/cards/:card", async (c) => {
  const card = param(c, "card");
  const u = await editProfile(c, (p) => {
    if (p.deck.includes(card)) fail(400, "Card is in the player's deck; change the deck first");
    delete p.cards[card];
  });
  await audit(c.env.DB, c.get("adminId"), "user.card.remove", `user:${u.id}`, { card });
  return c.json({ ok: true });
});

admin.post("/users/:id/ban", async (c) => {
  const u = await userOr404(c);
  const reason = String((await body(c)).reason ?? "").slice(0, 200) || null;
  // Sessions are kept: every request re-checks the ban, and unbanning restores access
  // (a guest whose session was deleted could never get back into their account).
  await run(c.env.DB, "UPDATE users SET banned = 1, ban_reason = ? WHERE id = ?", reason, u.id);
  await audit(c.env.DB, c.get("adminId"), "user.ban", `user:${u.id}`, { reason });
  return c.json({ ok: true });
});

admin.post("/users/:id/unban", async (c) => {
  const u = await userOr404(c);
  await run(c.env.DB, "UPDATE users SET banned = 0, ban_reason = NULL WHERE id = ?", u.id);
  await audit(c.env.DB, c.get("adminId"), "user.unban", `user:${u.id}`);
  return c.json({ ok: true });
});

admin.post("/users/:id/reset", async (c) => {
  const u = await userOr404(c);
  await run(c.env.DB, "UPDATE users SET profile = ?, rev = rev + 1 WHERE id = ?", JSON.stringify(newProfile()), u.id);
  await audit(c.env.DB, c.get("adminId"), "user.reset", `user:${u.id}`);
  return c.json({ ok: true });
});

admin.post("/users/:id/password", async (c) => {
  const db = c.env.DB;
  const u = await userOr404(c);
  const pw = String((await body(c)).password ?? "");
  if (pw.length < 6) fail(400, "Password must be at least 6 characters");
  if (!u.username) fail(400, "Guest accounts need a username first");
  await run(db, "UPDATE users SET password_hash = ?, is_guest = 0 WHERE id = ?", await hashPassword(pw), u.id);
  await deleteSessionsFor(db, "player", u.id);
  await audit(db, c.get("adminId"), "user.password", `user:${u.id}`);
  return c.json({ ok: true });
});

admin.post("/users/:id/logout", async (c) => {
  const id = numParam(c, "id");
  await deleteSessionsFor(c.env.DB, "player", id);
  await audit(c.env.DB, c.get("adminId"), "user.logout", `user:${id}`);
  return c.json({ ok: true });
});

admin.delete("/users/:id", async (c) => {
  const db = c.env.DB;
  const u = await userOr404(c);
  await deleteSessionsFor(db, "player", u.id);
  await run(db, "DELETE FROM users WHERE id = ?", u.id);
  await audit(db, c.get("adminId"), "user.delete", `user:${u.id}`, { name: u.display_name, username: u.username });
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- inbox

/** Sent messages, newest first, with how many players got, read and claimed each. */
admin.get("/mail", async (c) => {
  const page = Math.max(0, Number(c.req.query("page")) || 0);
  const to = Number(c.req.query("to")) || null;
  const rows = await all<{ reward: string | null }>(
    c.env.DB,
    `SELECT m.id, m.user_id AS userId, u.display_name AS userName, m.title, m.body, m.reward, m.new_players AS newPlayers,
            m.created_at AS createdAt, m.expires_at AS expiresAt, a.username AS admin,
            CASE WHEN m.user_id IS NOT NULL THEN 1
                 WHEN m.new_players = 1 THEN (SELECT COUNT(*) FROM users)
                 ELSE (SELECT COUNT(*) FROM users WHERE created_at <= m.created_at) END AS recipients,
            (SELECT COUNT(*) FROM mail_state s WHERE s.mail_id = m.id AND s.read_at IS NOT NULL) AS reads,
            (SELECT COUNT(*) FROM mail_state s WHERE s.mail_id = m.id AND s.claimed_at IS NOT NULL) AS claims
     FROM mail m LEFT JOIN users u ON u.id = m.user_id LEFT JOIN admins a ON a.id = m.admin_id
     ${to ? "WHERE m.user_id = ?" : ""} ORDER BY m.id DESC LIMIT 50 OFFSET ?`,
    ...(to ? [to] : []),
    page * 50,
  );
  return c.json(rows.map((r) => ({ ...r, reward: r.reward ? JSON.parse(r.reward) : null })));
});

/** Send a message to one player (`to`: their id) or everyone (`to`: "all"). */
admin.post("/mail", async (c) => {
  const db = c.env.DB;
  const b = await body(c);
  const title = String(b.title ?? "").trim();
  const text = String(b.body ?? "").trim();
  const r = b.reward;
  let reward: Reward | null = r ? { coins: Number(r.coins) || 0, gems: Number(r.gems) || 0, chest: r.chest ? String(r.chest) : null } : null;
  if (reward && emptyReward(reward)) reward = null;
  const errors = mailProblems(title, text, reward);
  let userId: number | null = null;
  if (b.to !== "all") {
    userId = Number(b.to);
    if (!Number.isInteger(userId) || !(await getUser(db, userId))) errors.push("No such player");
  }
  const days = b.expiresInDays == null || b.expiresInDays === "" ? null : Number(b.expiresInDays);
  if (days !== null && !(days > 0 && days <= 365)) errors.push("Expiry must be 1-365 days, or empty for never");
  if (errors.length) fail(400, errors[0], { errors });
  const now = Date.now();
  const res = await run(
    db,
    "INSERT INTO mail (user_id, title, body, reward, new_players, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    userId,
    title,
    text,
    reward && JSON.stringify(reward),
    userId === null && b.newPlayers ? 1 : 0,
    c.get("adminId"),
    now,
    days ? now + days * 86400_000 : null,
  );
  const id = res.meta.last_row_id;
  await audit(db, c.get("adminId"), "mail.send", userId === null ? "all players" : `user:${userId}`, { id, title, reward });
  return c.json({ id });
});

/** Take a message back: players who haven't claimed its gift no longer can. */
admin.delete("/mail/:id", async (c) => {
  const db = c.env.DB;
  const m = await one<{ id: number; title: string }>(db, "SELECT id, title FROM mail WHERE id = ?", numParam(c, "id"));
  if (!m) fail(404, "No such message");
  await run(db, "DELETE FROM mail WHERE id = ?", m.id);
  await audit(db, c.get("adminId"), "mail.recall", `mail:${m.id}`, { title: m.title });
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- admins & audit

admin.get("/admins", async (c) => c.json(await all(c.env.DB, "SELECT id, username, created_at AS createdAt FROM admins ORDER BY id")));

admin.post("/admins", async (c) => {
  const db = c.env.DB;
  const { username, password } = await body(c);
  if (!USERNAME_RE.test(String(username ?? ""))) fail(400, "Username: 3-20 letters, digits, _ . -");
  if (String(password ?? "").length < 8) fail(400, "Admin passwords need at least 8 characters");
  if (await one(db, "SELECT id FROM admins WHERE username = ?", username)) fail(409, "That admin already exists");
  await run(db, "INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)", username, await hashPassword(password), Date.now());
  await audit(db, c.get("adminId"), "admin.create", username);
  return c.json({ ok: true });
});

admin.delete("/admins/:id", async (c) => {
  const db = c.env.DB;
  const id = numParam(c, "id");
  if (id === c.get("adminId")) fail(400, "You can't delete yourself");
  await deleteSessionsFor(db, "admin", id);
  await run(db, "DELETE FROM admins WHERE id = ?", id);
  await audit(db, c.get("adminId"), "admin.delete", `admin:${id}`);
  return c.json({ ok: true });
});

admin.post("/me/password", async (c) => {
  const db = c.env.DB;
  const b = await body(c);
  const a = (await one<AdminRow>(db, "SELECT password_hash FROM admins WHERE id = ?", c.get("adminId")))!;
  if (!(await verifyPassword(String(b.current ?? ""), a.password_hash))) fail(400, "Current password is wrong");
  const pw = String(b.password ?? "");
  if (pw.length < 8) fail(400, "Admin passwords need at least 8 characters");
  await run(db, "UPDATE admins SET password_hash = ? WHERE id = ?", await hashPassword(pw), c.get("adminId"));
  await audit(db, c.get("adminId"), "admin.password", `admin:${c.get("adminId")}`);
  return c.json({ ok: true });
});

admin.get("/audit", async (c) => {
  const page = Math.max(0, Number(c.req.query("page")) || 0);
  return c.json(
    await all(
      c.env.DB,
      `SELECT l.id, l.action, l.target, l.details, l.created_at AS createdAt, a.username AS admin
       FROM audit l LEFT JOIN admins a ON a.id = l.admin_id ORDER BY l.id DESC LIMIT 100 OFFSET ?`,
      page * 100,
    ),
  );
});

/**
 * With no admin yet, create the first one from the ADMIN_USERNAME / ADMIN_PASSWORD settings
 * (the password is a secret: `npx wrangler secret put ADMIN_PASSWORD`). Until it's set,
 * nobody can sign in to the admin panel.
 */
async function ensureAdmin(db: D1Database, env: Bindings) {
  if (!env.ADMIN_PASSWORD || (await count(db, "SELECT COUNT(*) n FROM admins"))) return;
  const username = env.ADMIN_USERNAME || "admin";
  await run(db, "INSERT OR IGNORE INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)", username, await hashPassword(env.ADMIN_PASSWORD), Date.now());
}
