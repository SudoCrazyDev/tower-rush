import { Hono } from "hono";
import { all, count, one, run } from "./db.ts";
import { createSession, deleteSession, hashPassword, needsRehash, rateLimit, requirePlayer, sessionFor, verifyPassword } from "./auth.ts";
import { currentConfig } from "./config-store.ts";
import { body, fail, numParam, param, type AppEnv, type Ctx } from "./http.ts";
import { createUser, getUser, getUserByName, publicUser, readProfile, touch, writeProfile, NAME_RE, USERNAME_RE, type UserRow } from "./users.ts";
import { boostRewards, discounted, eventBoosts, offerById, offerBuyProblem } from "../../shared/offers.ts";
import { buyOffer, canUpgrade, chestById, giftReadyAt, grantReward, heroBuyProblem, ownsHero, payPromotions, refreshDaily, rollChests, type Profile } from "../../shared/profile.ts";
import { addQuestProgress, loginReady, nextLoginReward, questById, questDone, utcDay } from "../../shared/daily.ts";
import { HERO_BY_ID } from "../../shared/heroes.ts";
import { UNIT_BY_ID, upgradeCost } from "../../shared/units.ts";
import { ARENAS, ARENA_BY_ID } from "../../shared/arenas.ts";
import { ECONOMY, battleRewards } from "../../shared/economy.ts";
import { needsAttention } from "../../shared/mail.ts";
import { inbox, mark, message, unclaim } from "./mail.ts";

export const player = new Hono<AppEnv>();

player.get("/config", (c) => {
  const cfg = currentConfig();
  // `now` lets the game line its event and offer countdowns up with the server's clock.
  return c.json({ version: cfg.id, config: cfg.config, now: Date.now() });
});

// ---------------------------------------------------------------- auth

const authLimit = rateLimit("AUTH_LIMIT");

player.post("/auth/guest", authLimit, async (c) => {
  const u = await createUser(c.env.DB, `Player${Math.floor(1000 + Math.random() * 9000)}`);
  return c.json({ token: await createSession(c.env.DB, "player", u.id), user: publicUser(u) });
});

player.post("/auth/login", authLimit, async (c) => {
  const db = c.env.DB;
  const { username, password } = await body(c);
  const u = typeof username === "string" ? await getUserByName(db, username) : null;
  if (!u || !(await verifyPassword(String(password ?? ""), u.password_hash))) fail(401, "Wrong username or password");
  if (u.banned) fail(403, "banned", { reason: u.ban_reason });
  if (needsRehash(u.password_hash!)) await run(db, "UPDATE users SET password_hash = ? WHERE id = ?", await hashPassword(String(password)), u.id);
  return c.json({ token: await createSession(db, "player", u.id), user: publicUser(u) });
});

/** Register a new account, or claim the current guest account by giving it a username. */
player.post("/auth/register", authLimit, async (c) => {
  const db = c.env.DB;
  const { username, password } = await body(c);
  if (typeof username !== "string" || !USERNAME_RE.test(username)) fail(400, "Username: 3-20 letters, digits, _ . -");
  if (typeof password !== "string" || password.length < 6) fail(400, "Password must be at least 6 characters");
  if (await getUserByName(db, username)) fail(409, "That username is taken");

  // Upgrade the caller's guest account if they're signed in as one.
  const s = await sessionFor(c, "player");
  let u = s ? await getUser(db, s.id) : null;
  if (!u || !u.is_guest) u = await createUser(db, username);
  await run(
    db,
    "UPDATE users SET username = ?, password_hash = ?, is_guest = 0, display_name = ? WHERE id = ?",
    username,
    await hashPassword(password),
    u.is_guest ? username : u.display_name,
    u.id,
  );
  u = (await getUser(db, u.id))!;
  return c.json({ token: await createSession(db, "player", u.id), user: publicUser(u) });
});

player.post("/auth/logout", requirePlayer, async (c) => {
  await deleteSession(c.env.DB, c.get("token"));
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- profile

/** Load the signed-in user, rejecting banned accounts. */
async function me(c: Ctx): Promise<{ u: UserRow; p: Profile }> {
  const db = c.env.DB;
  const u = await getUser(db, c.get("playerId"));
  if (!u) fail(401, "Account no longer exists");
  if (u.banned) fail(403, "banned", { reason: u.ban_reason });
  await touch(db, u);
  const p = readProfile(u);
  // A new UTC day brings new quests.
  if (refreshDaily(p)) await writeProfile(db, u, p);
  return { u, p };
}

/**
 * Change the signed-in player's profile with `change` and save it, answering with the
 * profile plus whatever `change` returns. If another request saved the profile in between
 * (two taps at once), it starts over from the fresh profile, so nothing is lost or doubled.
 * `change` must only touch the profile (it can run more than once) and throws to refuse.
 */
async function update<T extends object | void>(c: Ctx, change: (p: Profile, u: UserRow) => T) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { u, p } = await me(c);
    const extra = change(p, u);
    if (await writeProfile(c.env.DB, u, p)) return { ...(extra || {}), profile: p } as (T extends object ? T : {}) & { profile: Profile };
  }
  fail(409, "Busy, try again");
}

const P = requirePlayer;

player.get("/me", P, async (c) => {
  const m = await me(c);
  return c.json({ user: publicUser(m.u), profile: m.p });
});

player.put("/me/deck", P, async (c) => {
  const deck = (await body(c)).deck;
  return c.json(
    await update(c, (p) => {
      if (!Array.isArray(deck) || deck.length !== 5 || new Set(deck).size !== 5) fail(400, "Deck needs 5 different cards");
      for (const id of deck) {
        if (!p.cards[id]) fail(400, `You don't own ${id}`);
        if (!UNIT_BY_ID[id]?.enabled) fail(400, `${id} is not available`);
      }
      p.deck = deck;
    }),
  );
});

player.put("/me/arena", P, async (c) => {
  const a = ARENA_BY_ID[(await body(c)).arena];
  return c.json(
    await update(c, (p) => {
      if (!a || a.trophies > p.trophies) fail(400, "Arena is locked");
      p.arena = a.id;
    }),
  );
});

/** Pick the hero taken into battle (null for none). */
player.put("/me/hero", P, async (c) => {
  const id = (await body(c)).hero ?? null;
  return c.json(
    await update(c, (p) => {
      if (id !== null) {
        if (typeof id !== "string" || !ownsHero(p, id)) fail(400, "You don't have that hero");
        if (!HERO_BY_ID[id].enabled) fail(400, "That hero isn't available");
      }
      p.hero = id;
    }),
  );
});

player.post("/heroes/:id/buy", P, async (c) => {
  const id = param(c, "id");
  return c.json(
    await update(c, (p) => {
      const problem = heroBuyProblem(p, id);
      if (problem) fail(400, problem);
      p.gems -= HERO_BY_ID[id].price;
      p.heroes.push(id);
      p.hero = id;
    }),
  );
});

player.put("/me/name", P, async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  const name = String((await body(c)).name ?? "").trim();
  if (!NAME_RE.test(name)) fail(400, "Name: 3-20 characters");
  await run(db, "UPDATE users SET display_name = ? WHERE id = ?", name, m.u.id);
  return c.json({ user: publicUser((await getUser(db, m.u.id))!) });
});

player.post("/cards/:id/upgrade", P, async (c) => {
  const id = param(c, "id");
  return c.json(
    await update(c, (p) => {
      if (!canUpgrade(p, id)) fail(400, "Not enough cards or gold");
      const card = p.cards[id];
      const cost = upgradeCost(card.level, UNIT_BY_ID[id].rarity);
      card.copies -= cost.copies;
      p.coins -= cost.coins;
      card.level++;
      addQuestProgress(p.daily, { upgrades: 1 });
    }),
  );
});

player.post("/shop/chests/:id/buy", P, async (c) => {
  const chest = chestById(param(c, "id"));
  if (!chest || !chest.enabled) fail(404, "That chest isn't for sale");
  const count = Number((await body(c)).count ?? 1);
  const most = ECONOMY.chestBulkMax;
  if (!Number.isInteger(count) || count < 1 || count > most) fail(400, `You can buy 1 to ${most} at a time`);
  const cost = discounted(chest.price) * count;
  return c.json(
    await update(c, (p) => {
      if (p[chest.currency] < cost) fail(400, `Not enough ${chest.currency === "coins" ? "gold" : "gems"}`);
      p[chest.currency] -= cost;
      const loot = rollChests(p, chest, count);
      addQuestProgress(p.daily, { chests: count });
      return { loot };
    }),
  );
});

player.post("/shop/offers/:id/buy", P, async (c) => {
  const o = offerById(param(c, "id"));
  const r = await update(c, (p) => {
    const problem = offerBuyProblem(o, p);
    if (problem || !o) fail(400, problem ?? "That offer isn't for sale");
    const loot = buyOffer(p, o);
    if (loot) addQuestProgress(p.daily, { chests: Math.max(1, o.chests) });
    return { loot };
  });
  await run(c.env.DB, "INSERT INTO purchases (user_id, offer, price, currency, created_at) VALUES (?, ?, ?, ?, ?)", c.get("playerId"), o!.id, o!.price, o!.currency, Date.now());
  return c.json(r);
});

player.post("/shop/gift", P, async (c) => {
  return c.json(
    await update(c, (p) => {
      if (Date.now() < giftReadyAt(p)) fail(400, "Gift isn't ready yet");
      p.lastGift = Date.now();
      p.coins += ECONOMY.giftCoins;
      p.gems += ECONOMY.giftGems;
    }),
  );
});

// ---------------------------------------------------------------- daily login + quests

/** Today's login reward (once per UTC day; the calendar advances one step per claim). */
player.post("/daily/login", P, async (c) => {
  return c.json(
    await update(c, (p) => {
      const day = utcDay();
      if (!loginReady(p.login, day)) fail(400, "Come back tomorrow for the next reward");
      const reward = nextLoginReward(p.login);
      const loot = grantReward(p, reward);
      p.login = { claims: p.login.claims + 1, lastDay: day };
      return { reward, loot };
    }),
  );
});

player.post("/daily/quests/:id/claim", P, async (c) => {
  const id = param(c, "id");
  return c.json(
    await update(c, (p) => {
      const s = p.daily.quests.find((q) => q.id === id);
      const q = questById(id);
      if (!s || !q) fail(404, "That quest isn't one of today's");
      if (s.claimed) fail(400, "Already claimed");
      if (!questDone(s)) fail(400, "Quest isn't finished yet");
      s.claimed = true;
      const loot = grantReward(p, q.reward);
      return { reward: q.reward, loot };
    }),
  );
});

/** Bonus for claiming every one of today's quests. */
player.post("/daily/bonus", P, async (c) => {
  return c.json(
    await update(c, (p) => {
      const d = p.daily;
      if (d.bonusClaimed) fail(400, "Already claimed");
      if (!d.quests.length || d.quests.some((q) => !q.claimed)) fail(400, "Claim every quest first");
      d.bonusClaimed = true;
      const reward = { coins: ECONOMY.questBonusCoins, gems: ECONOMY.questBonusGems, chest: null };
      grantReward(p, reward);
      return { reward, loot: null };
    }),
  );
});

// ---------------------------------------------------------------- inbox

player.get("/inbox", P, async (c) => {
  const m = await me(c);
  const messages = await inbox(c.env.DB, m.u);
  return c.json({ messages, unread: messages.filter(needsAttention).length });
});

/** A message the signed-in player can see, or 404. */
async function myMessage(c: Ctx) {
  const m = await me(c);
  const msg = await message(c.env.DB, m.u, numParam(c, "id"));
  if (!msg) fail(404, "That message is gone");
  return { m, msg };
}

player.post("/inbox/:id/read", P, async (c) => {
  const { m, msg } = await myMessage(c);
  await mark(c.env.DB, m.u.id, msg.id, "read_at");
  return c.json({ ok: true });
});

/** Take the gift attached to a message (once). */
player.post("/inbox/:id/claim", P, async (c) => {
  const db = c.env.DB;
  const { m, msg } = await myMessage(c);
  const reward = msg.reward;
  if (!reward) fail(400, "There's no gift in this message");
  // Claim first: of two requests at once, only one gets past this.
  if (msg.claimed || !(await mark(db, m.u.id, msg.id, "claimed_at"))) fail(400, "Already claimed");
  try {
    const r = await update(c, (p) => ({ loot: grantReward(p, reward) }));
    await mark(db, m.u.id, msg.id, "read_at");
    return c.json({ reward, ...r });
  } catch (e) {
    await unclaim(db, m.u.id, msg.id);
    throw e;
  }
});

player.delete("/inbox/:id", P, async (c) => {
  const { m, msg } = await myMessage(c);
  if (msg.reward && !msg.claimed) fail(400, "Claim the gift first");
  await mark(c.env.DB, m.u.id, msg.id, "deleted_at");
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- battles

player.post("/battles", P, async (c) => {
  const m = await me(c);
  const a = ARENA_BY_ID[(await body(c)).arena];
  if (!a || a.trophies > m.p.trophies) fail(400, "Arena is locked");
  const r = await run(
    c.env.DB,
    "INSERT INTO battles (user_id, arena, deck, hero, started_at) VALUES (?, ?, ?, ?, ?)",
    m.u.id,
    a.id,
    JSON.stringify(m.p.deck),
    m.p.hero,
    Date.now(),
  );
  return c.json({ battleId: r.meta.last_row_id });
});

/**
 * The battle runs in the browser, so the client reports how far it got. The server
 * clamps that to what's physically possible in the elapsed time and computes rewards.
 */
player.post("/battles/:id/finish", P, async (c) => {
  const db = c.env.DB;
  const id = numParam(c, "id");
  const playerId = c.get("playerId");
  const b = await one<{ id: number; arena: string; started_at: number; finished_at: number | null }>(
    db,
    "SELECT id, arena, started_at, finished_at FROM battles WHERE id = ? AND user_id = ?",
    id,
    playerId,
  );
  if (!b) fail(404, "Unknown battle");
  // Mark it finished first: of two requests at once, only one gets past this.
  const now = Date.now();
  const claimed = await run(db, "UPDATE battles SET finished_at = ? WHERE id = ? AND finished_at IS NULL", now, b.id);
  if (b.finished_at || !claimed.meta.changes) fail(409, "Battle already finished");

  const req = await body(c);
  const elapsed = (now - b.started_at) / 1000;
  const maxWave = Math.floor(elapsed / 3) + 1; // waves can't be cleared faster than ~3s even at 2x
  const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const wave = int(req.wave, maxWave);
  const bosses = int(req.bosses, Math.floor(wave / ECONOMY.bossEvery));
  const kills = int(req.kills, wave * 80);
  // Quest counters, capped to what the run could plausibly have done.
  const summons = int(req.summons, 15 + wave * 12);
  const merges = int(req.merges, summons);
  const awakens = int(req.awakens, Math.floor(merges / 63)); // a max-rank unit takes 63 merges
  const heroCasts = int(req.heroCasts, Math.floor(elapsed / 10) + 1);

  const arenaIndex = Math.max(0, ARENAS.findIndex((a) => a.id === b.arena));
  // Running events boost the gold and gems (judged at the end of the battle).
  const boosts = eventBoosts();
  const rewards = boostRewards(battleRewards(wave, bosses, arenaIndex));
  let r;
  try {
    r = await update(c, (p) => {
      const newBest = wave > p.bestWave;
      p.coins += rewards.coins;
      p.gems += rewards.gems;
      p.trophies = Math.max(0, p.trophies + rewards.trophies);
      p.bestWave = Math.max(p.bestWave, wave);
      // First time in a league pays its promotion reward.
      const promotions = payPromotions(p);
      addQuestProgress(p.daily, { battles: 1, wave, kills, bosses, summons, merges, awakens, heroCasts });
      return { newBest, promotions };
    });
  } catch (e) {
    await run(db, "UPDATE battles SET finished_at = NULL WHERE id = ?", b.id);
    throw e;
  }
  await run(
    db,
    "UPDATE battles SET wave = ?, kills = ?, bosses = ?, coins = ?, gems = ?, trophies = ? WHERE id = ?",
    wave,
    kills,
    bosses,
    rewards.coins,
    rewards.gems,
    rewards.trophies,
    b.id,
  );
  return c.json({ rewards, boosts: { coinMult: boosts.coinMult, gemMult: boosts.gemMult }, wave, ...r });
});

// ---------------------------------------------------------------- leaderboard

/** Ranked by trophies or by best wave. Players with 0 aren't ranked; ties share a rank. */
const BOARDS = {
  trophies: "json_extract(profile, '$.trophies')",
  wave: "json_extract(profile, '$.bestWave')",
} as const;
const LEADERBOARD_SIZE = 100;

player.get("/leaderboard", P, async (c) => {
  const db = c.env.DB;
  const by = c.req.query("by") === "wave" ? "wave" : "trophies";
  const v = BOARDS[by];
  const [rows, total, mine] = await Promise.all([
    all(
      db,
      `SELECT id, display_name AS name, json_extract(profile, '$.trophies') AS trophies,
              json_extract(profile, '$.bestWave') AS bestWave, json_extract(profile, '$.hero') AS hero,
              RANK() OVER (ORDER BY ${v} DESC) AS rank
       FROM users WHERE banned = 0 AND ${v} > 0
       ORDER BY rank, id LIMIT ?`,
      LEADERBOARD_SIZE,
    ),
    count(db, `SELECT COUNT(*) AS n FROM users WHERE banned = 0 AND ${v} > 0`),
    // The caller's own place, even when they're outside the list.
    one<{ value: number; banned: number }>(db, `SELECT ${v} AS value, banned FROM users WHERE id = ?`, c.get("playerId")),
  ]);
  const rank = mine && mine.value > 0 && !mine.banned ? (await count(db, `SELECT COUNT(*) + 1 AS n FROM users WHERE banned = 0 AND ${v} > ?`, mine.value)) : null;
  return c.json({ by, rows, total, me: { id: c.get("playerId"), rank } });
});
