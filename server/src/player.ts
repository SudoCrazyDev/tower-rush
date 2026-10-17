import { Hono } from "hono";
import { all, count, one, run } from "./db.ts";
import { createSession, deleteSession, deleteSessionsFor, hashPassword, needsRehash, rateLimit, requirePlayer, sessionFor, verifyPassword } from "./auth.ts";
import { currentConfig } from "./config-store.ts";
import { body, fail, numParam, param, type AppEnv, type Ctx } from "./http.ts";
import { CODE_MINUTES, newCode, normEmail, sendCode, useCode, validEmail, type CodePurpose } from "./email.ts";
import { requireHuman } from "./turnstile.ts";
import { claimInvite, findInvite, inviteOnly } from "./invites.ts";
import { announceSignup } from "./discord.ts";
import { createUser, getUser, getUserByEmail, getUserByName, ownUser, readProfile, touch, writeProfile, NAME_RE, USERNAME_RE, type UserRow } from "./users.ts";
import { boostRewards, discounted, eventBoosts, offerById, offerBuyProblem } from "../../shared/offers.ts";
import { chapterDeck, chapterLock, findChapter, objectiveMult, starsFor, type StoryChapter, type StoryObjectives } from "../../shared/stories.ts";
import { buyOffer, canUpgrade, chestById, giftReadyAt, grantReleaseGifts, grantReward, grantStoryWin, heroBuyProblem, ownsHero, joinSociety, payPromotions, refreshDaily, rollChests, settleSociety, AVATAR_RE, TUTORIAL_PARTS, type Profile, type PublicProfile, type SocietyLapse } from "../../shared/profile.ts";
import { addQuestProgress, loginReady, nextLoginReward, questById, questDone, utcDay } from "../../shared/daily.ts";
import { HERO_BY_ID } from "../../shared/heroes.ts";
import { UNIT_BY_ID, deckable, upgradeCost } from "../../shared/units.ts";
import { ARENAS, ARENA_BY_ID, trophyArena } from "../../shared/arenas.ts";
import { playerLeague, runTrophies } from "../../shared/leagues.ts";
import { ECONOMY, battleRewards } from "../../shared/economy.ts";
import { needsAttention } from "../../shared/mail.ts";
import { inbox, mark, message, unclaim } from "./mail.ts";
import { deviceOf, holdsPlay, releasePlay, setPlayBattle } from "./play.ts";

export const player = new Hono<AppEnv>();

player.get("/config", (c) => {
  const cfg = currentConfig();
  // `now` lets the game line its event and offer countdowns up with the server's clock.
  return c.json({
    version: cfg.id,
    config: cfg.config,
    now: Date.now(),
    minClient: c.env.MIN_CLIENT ?? null,
    turnstileSiteKey: c.env.TURNSTILE_SITEKEY || null,
    inviteOnly: inviteOnly(c.env),
  });
});

// ---------------------------------------------------------------- auth

const authLimit = rateLimit("AUTH_LIMIT");

player.post("/auth/guest", authLimit, async (c) => {
  if (inviteOnly(c.env)) fail(403, "Guest play is off here. Sign in, or ask for an invite");
  const u = await createUser(c.env.DB, `Player${Math.floor(1000 + Math.random() * 9000)}`);
  return c.json({ token: await createSession(c.env.DB, "player", u.id), user: ownUser(u) });
});

/** Sign in with a username or an email address. */
player.post("/auth/login", authLimit, async (c) => {
  const db = c.env.DB;
  const { username, password, turnstile } = await body(c);
  await requireHuman(c, turnstile, "login");
  const login = typeof username === "string" ? username.trim() : "";
  const u = !login ? null : login.includes("@") ? await getUserByEmail(db, normEmail(login)) : await getUserByName(db, login);
  if (!u || !(await verifyPassword(String(password ?? ""), u.password_hash))) fail(401, "Wrong username or password");
  if (u.banned) fail(403, "banned", { reason: u.ban_reason });
  if (needsRehash(u.password_hash!)) await run(db, "UPDATE users SET password_hash = ? WHERE id = ?", await hashPassword(String(password)), u.id);
  return c.json({ token: await createSession(db, "player", u.id), user: ownUser(u) });
});

/** The email an invite link was sent to, so the sign-up form can show it. */
player.get("/auth/invite", authLimit, async (c) => {
  const f = await findInvite(c.env.DB, c.req.query("token"));
  if (!f.ok) fail(410, f.error);
  return c.json({ email: f.invite.email });
});

/**
 * Register a new account, or claim the current guest account by giving it a username.
 * With an invite token the account takes the invite's email, already confirmed (the link
 * reached that inbox). With INVITE_ONLY set, the token is required.
 */
player.post("/auth/register", authLimit, async (c) => {
  const db = c.env.DB;
  const { username, password, email: rawEmail, marketing, turnstile, invite: inviteToken } = await body(c);
  let invite = null;
  if (inviteToken || inviteOnly(c.env)) {
    const f = await findInvite(db, inviteToken);
    if (!f.ok) fail(403, inviteToken ? f.error : "Sign-up here is by invitation only", { invite: true });
    invite = f.invite;
  }
  const email = invite ? normEmail(invite.email) : normEmail(rawEmail);
  if (typeof username !== "string" || !USERNAME_RE.test(username)) fail(400, "Username: 3-20 letters, digits, _ . -");
  if (!validEmail(email)) fail(400, "Enter a valid email address");
  if (typeof password !== "string" || password.length < 6) fail(400, "Password must be at least 6 characters");
  await requireHuman(c, turnstile, "register");
  if (await getUserByName(db, username)) fail(409, "That username is taken");
  if (await getUserByEmail(db, email)) fail(409, "That email is already used by another account");

  // Upgrade the caller's guest account if they're signed in as one.
  const s = await sessionFor(c, "player");
  let u = s ? await getUser(db, s.id) : null;
  if (!u || !u.is_guest) u = await createUser(db, username);
  await run(
    db,
    "UPDATE users SET username = ?, password_hash = ?, email = ?, email_verified_at = ?, marketing_opt_in = ?, is_guest = 0, display_name = ? WHERE id = ?",
    username,
    await hashPassword(password),
    email,
    invite ? Date.now() : null,
    marketing ? 1 : 0,
    u.is_guest ? username : u.display_name,
    u.id,
  );
  u = (await getUser(db, u.id))!;
  if (invite) await claimInvite(db, invite.id, u.id);
  else await mailCode(c, u, "verify");
  announceSignup(c, u);
  return c.json({ token: await createSession(db, "player", u.id), user: ownUser(u) });
});

player.post("/auth/logout", requirePlayer, async (c) => {
  await deleteSession(c.env.DB, c.get("token"));
  return c.json({ ok: true });
});

/** Mail a fresh code to the player's address (quietly skipped if one went out under a minute ago). */
async function mailCode(c: Ctx, u: UserRow, purpose: CodePurpose) {
  if (!u.email) return;
  const code = await newCode(c.env.DB, u.id, purpose, u.email);
  if (code) c.executionCtx.waitUntil(sendCode(c.env, u.email, u.display_name, purpose, code));
}

/**
 * Forgot password, step 1: mail a reset code to the account with this email. The answer
 * is the same whether or not the address has an account, so it can't be used to probe.
 */
player.post("/auth/forgot", authLimit, async (c) => {
  const { email: rawEmail, turnstile } = await body(c);
  const email = normEmail(rawEmail);
  if (!validEmail(email)) fail(400, "Enter a valid email address");
  await requireHuman(c, turnstile, "forgot");
  const u = await getUserByEmail(c.env.DB, email);
  if (u && !u.banned && u.username) await mailCode(c, u, "reset");
  return c.json({ ok: true, minutes: CODE_MINUTES });
});

/** Forgot password, step 2: the mailed code and a new password. Signs out everywhere else, then signs in here. */
player.post("/auth/reset", authLimit, async (c) => {
  const db = c.env.DB;
  const { email: rawEmail, code, password } = await body(c);
  if (typeof password !== "string" || password.length < 6) fail(400, "Password must be at least 6 characters");
  const u = await getUserByEmail(db, normEmail(rawEmail));
  const r = u ? await useCode(db, u.id, "reset", code) : ({ ok: false, reason: "wrong" } as const);
  if (!u || !r.ok) fail(400, !r.ok && r.reason === "expired" ? "That code has expired, ask for a new one" : "Wrong code");
  if (u.banned) fail(403, "banned", { reason: u.ban_reason });
  // The code reached this inbox, so the address is confirmed too.
  await run(db, "UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?", await hashPassword(password), Date.now(), u.id);
  await deleteSessionsFor(db, "player", u.id);
  return c.json({ token: await createSession(db, "player", u.id), user: ownUser((await getUser(db, u.id))!) });
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
  // A new UTC day brings new quests; a new release its launch gift.
  const fresh = refreshDaily(p);
  const gifts = grantReleaseGifts(p).length > 0;
  // v2.9: society dues come due every month; a member who can't pay (or dropped below the gate) is out.
  const society = settleSociety(p);
  const settled = society.dues > 0 || society.lapsed !== null;
  if ((fresh || gifts || settled) && (await writeProfile(db, u, p)) && settled) await societyMail(db, u.id, society.dues, society.lapsed);
  return { u, p };
}

/** A personal inbox note for society dues taken or a membership that ended. */
async function societyMail(db: D1Database, userId: number, dues: number, lapsed: SocietyLapse | null) {
  const why: Record<SocietyLapse, string> = {
    trophies: "You fell below the Society's trophy gate, so your membership has ended.",
    dues: "You couldn't pay this month's dues, so your membership has ended.",
    gone: "The Society you belonged to has been dissolved.",
  };
  const paid = dues > 0 ? `Monthly dues were paid${dues > 1 ? ` (${dues} months)` : ""}. ` : "";
  const title = lapsed ? "Secret Society: membership ended" : "Secret Society: dues paid";
  const text = `${paid}${lapsed ? `${why[lapsed]} Meet the requirements again and you'll be invited back.` : "Your place in the Society is secure for another month."}`;
  await run(db, "INSERT INTO mail (user_id, title, body, reward, new_players, admin_id, created_at, expires_at) VALUES (?, ?, ?, NULL, 0, NULL, ?, NULL)", userId, title, text, Date.now());
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
  return c.json({ user: ownUser(m.u), profile: m.p });
});

player.put("/me/deck", P, async (c) => {
  const deck = (await body(c)).deck;
  return c.json(
    await update(c, (p) => {
      if (!Array.isArray(deck) || deck.length !== 5 || new Set(deck).size !== 5) fail(400, "Deck needs 5 different cards");
      for (const id of deck) {
        if (!p.cards[id]) fail(400, `You don't own ${id}`);
        if (!deckable(UNIT_BY_ID[id])) fail(400, `${id} is not available`);
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

/** Pick the player avatar (an id from ui/avatars, or null for the default look). */
player.put("/me/avatar", P, async (c) => {
  const id = (await body(c)).avatar ?? null;
  if (id !== null && (typeof id !== "string" || !AVATAR_RE.test(id))) fail(400, "Unknown avatar");
  return c.json(
    await update(c, (p) => {
      p.avatar = id;
    }),
  );
});

/** Mark tutorial parts as done (finished or skipped) so they never run again. */
player.post("/me/tutorial", P, async (c) => {
  const parts = (await body(c)).parts;
  if (!Array.isArray(parts) || !parts.length || !parts.every((x) => (TUTORIAL_PARTS as readonly unknown[]).includes(x))) fail(400, "Unknown tutorial part");
  return c.json(
    await update(c, (p) => {
      p.tutorial = [...new Set([...(p.tutorial ?? []), ...(parts as string[])])];
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
  return c.json({ user: ownUser((await getUser(db, m.u.id))!) });
});

/** Add or change the account's email (needs the current password), then mail a code to confirm it. */
player.put("/me/email", P, authLimit, async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  const { email: rawEmail, password } = await body(c);
  const email = normEmail(rawEmail);
  if (m.u.is_guest) fail(400, "Create an account first");
  if (!validEmail(email)) fail(400, "Enter a valid email address");
  if (!(await verifyPassword(String(password ?? ""), m.u.password_hash))) fail(401, "Wrong password");
  if (email !== m.u.email) {
    if (await one(db, "SELECT id FROM users WHERE email = ? AND id != ?", email, m.u.id)) fail(409, "That email is already used by another account");
    await run(db, "UPDATE users SET email = ?, email_verified_at = NULL WHERE id = ?", email, m.u.id);
    await run(db, "DELETE FROM email_codes WHERE user_id = ?", m.u.id);
  }
  const u = (await getUser(db, m.u.id))!;
  if (!u.email_verified_at) await mailCode(c, u, "verify");
  return c.json({ user: ownUser(u) });
});

/** Mail another confirmation code (at most one a minute). */
player.post("/me/email/resend", P, authLimit, async (c) => {
  const m = await me(c);
  if (!m.u.email) fail(400, "Add an email first");
  if (m.u.email_verified_at) fail(400, "Your email is already confirmed");
  await mailCode(c, m.u, "verify");
  return c.json({ ok: true, minutes: CODE_MINUTES });
});

/** Confirm the account's email with the mailed code. */
player.post("/me/email/verify", P, authLimit, async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  const r = await useCode(db, m.u.id, "verify", (await body(c)).code);
  if (!r.ok) fail(400, r.reason === "expired" ? "That code has expired, ask for a new one" : "Wrong code");
  if (r.email !== m.u.email) fail(400, "Your email changed since that code was sent; ask for a new one");
  await run(db, "UPDATE users SET email_verified_at = ? WHERE id = ?", Date.now(), m.u.id);
  return c.json({ user: ownUser((await getUser(db, m.u.id))!) });
});

/** Newsletter consent, on or off. */
player.put("/me/marketing", P, async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  await run(db, "UPDATE users SET marketing_opt_in = ? WHERE id = ?", (await body(c)).optIn ? 1 : 0, m.u.id);
  return c.json({ user: ownUser((await getUser(db, m.u.id))!) });
});

/** Change the password; signs out every other device. */
player.post("/me/password", P, authLimit, async (c) => {
  const db = c.env.DB;
  const m = await me(c);
  const { current, password } = await body(c);
  if (m.u.is_guest) fail(400, "Create an account first");
  if (typeof password !== "string" || password.length < 6) fail(400, "Password must be at least 6 characters");
  if (!(await verifyPassword(String(current ?? ""), m.u.password_hash))) fail(401, "Wrong current password");
  await run(db, "UPDATE users SET password_hash = ? WHERE id = ?", await hashPassword(password), m.u.id);
  await run(db, "DELETE FROM sessions WHERE kind = 'player' AND subject_id = ? AND token != ?", m.u.id, c.get("token"));
  return c.json({ ok: true });
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
  // The game claims the play slot first (see play.ts); without it, another device is playing.
  const device = deviceOf(c);
  if (!(await holdsPlay(c.env.DB, m.u.id, device))) fail(409, "playing elsewhere");
  await settleAbandoned(c);
  const r = await run(
    c.env.DB,
    "INSERT INTO battles (user_id, arena, deck, hero, started_at) VALUES (?, ?, ?, ?, ?)",
    m.u.id,
    a.id,
    JSON.stringify(m.p.deck),
    m.p.hero,
    Date.now(),
  );
  await setPlayBattle(c.env.DB, m.u.id, device!, r.meta.last_row_id);
  return c.json({ battleId: r.meta.last_row_id });
});

/**
 * v2.9: a solo run that was started but never finished (the game closed mid-run, or another
 * device took over) counts as a wave-0 loss under the player's league, so quitting can't
 * dodge a trophy loss.
 */
async function settleAbandoned(c: Ctx) {
  const db = c.env.DB;
  const playerId = c.get("playerId");
  const open = await all<{ id: number; arena: string }>(
    db,
    "SELECT id, arena FROM battles WHERE user_id = ? AND finished_at IS NULL AND arena NOT LIKE 'story:%'",
    playerId,
  );
  for (const b of open) {
    const claimed = await run(db, "UPDATE battles SET finished_at = ?, wave = 0, trophies = 0 WHERE id = ? AND finished_at IS NULL", Date.now(), b.id);
    if (!claimed.meta.changes) continue;
    const r = await update(c, (p) => {
      const loss = trophyArena(b.arena, p.trophies) ? runTrophies(0, playerLeague(p)) : 0;
      p.trophies = Math.max(0, p.trophies + loss);
      return { loss };
    });
    if (r.loss) await run(db, "UPDATE battles SET trophies = ? WHERE id = ?", r.loss, b.id);
  }
}

/**
 * The battle runs in the browser, so the client reports how far it got. The server
 * clamps that to what's physically possible in the elapsed time and computes rewards.
 */
player.post("/battles/:id/finish", P, async (c) => {
  const db = c.env.DB;
  const id = numParam(c, "id");
  const playerId = c.get("playerId");
  const b = await one<{ id: number; arena: string; started_at: number; finished_at: number | null; cutoff: number | null }>(
    db,
    "SELECT id, arena, started_at, finished_at, cutoff FROM battles WHERE id = ? AND user_id = ?",
    id,
    playerId,
  );
  if (!b) fail(404, "Unknown battle");
  // Mark it finished first: of two requests at once, only one gets past this.
  const now = Date.now();
  const claimed = await run(db, "UPDATE battles SET finished_at = ? WHERE id = ? AND finished_at IS NULL", now, b.id);
  if (b.finished_at || !claimed.meta.changes) fail(409, "Battle already finished");

  const req = await body(c);
  // Taken over by another device: only the play up to then counts.
  const elapsed = (Math.min(now, b.cutoff ?? now) - b.started_at) / 1000;
  const maxWave = Math.floor(elapsed / 3) + 1; // waves can't be cleared faster than ~3s even at 2x
  const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const wave = int(req.wave, maxWave);
  const bosses = int(req.bosses, Math.floor(wave / ECONOMY.bossEvery));
  const kills = int(req.kills, wave * 80);
  // Quest counters, capped to what the run could plausibly have done.
  const summons = int(req.summons, 15 + wave * 12);
  const merges = int(req.merges, summons);
  const awakens = int(req.awakens, Math.floor(merges / (2 ** (ECONOMY.maxRank - 1) - 1))); // a max-rank unit takes 2^(maxRank-1) - 1 merges
  const heroCasts = int(req.heroCasts, Math.floor(elapsed / 10) + 1);
  // Support units: a Mime copy and an Imp move each need a recharge; brewing is capped by time.
  const copies = int(req.copies, Math.floor(elapsed / 4) + 1);
  const swaps = int(req.swaps, Math.floor(elapsed / 4) + 1);
  const brewed = int(req.brewed, Math.floor(elapsed * 60));

  const arenaIndex = Math.max(0, ARENAS.findIndex((a) => a.id === b.arena));
  // Running events boost the gold and gems (judged at the end of the battle).
  const boosts = eventBoosts();
  let rewards = boostRewards(battleRewards(wave, bosses, arenaIndex, null));
  let r;
  try {
    r = await update(c, (p) => {
      // v2.9: trophies follow the league the player was in, and only count in their two highest arenas.
      const counts = trophyArena(b.arena, p.trophies);
      const league = playerLeague(p);
      rewards = { ...rewards, trophies: counts ? runTrophies(wave, league) : 0 };
      // Records are kept per arena; bestWave stays the overall best for the leaderboard.
      const before = p.arenaBest[b.arena] ?? 0;
      const newBest = wave > before;
      p.arenaBest[b.arena] = Math.max(before, wave);
      p.coins += rewards.coins;
      p.gems += rewards.gems;
      p.trophies = Math.max(0, p.trophies + rewards.trophies);
      p.bestWave = Math.max(p.bestWave, wave);
      // First time in a league pays its promotion reward.
      const promotions = payPromotions(p);
      addQuestProgress(p.daily, { battles: 1, wave, kills, bosses, summons, merges, awakens, heroCasts, copies, swaps, brewed });
      return { newBest, promotions, trophyRules: { league: league.id, minWave: league.minWave, counts } };
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
  await releasePlay(db, playerId, deviceOf(c));
  return c.json({ rewards, boosts: { coinMult: boosts.coinMult, gemMult: boosts.gemMult }, wave, ...r });
});

// ---------------------------------------------------------------- secret society (v2.9)

/** Accept the Secret Society's invitation: pays the entry fee, then dues every month (see settleSociety). */
player.post("/society/join", P, async (c) => {
  return c.json(
    await update(c, (p) => {
      const r = joinSociety(p);
      if (!r.league) fail(400, r.problem ?? "You haven't been invited");
      return { league: r.league.id, promotions: payPromotions(p) };
    }),
  );
});

// ---------------------------------------------------------------- stories (v1.2)

/** The objectives a client sent with a story win: shape checked, numbers clamped to what the chapter allows. */
function cleanObjectives(chapter: StoryChapter, v: unknown): StoryObjectives | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const n = (x: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(x) || 0)));
  return {
    poolsLeft: n(o.poolsLeft, chapter.mechanics?.tidePools?.at.length ?? 0),
    civiliansSaved: n(o.civiliansSaved, 100),
    civiliansHit: n(o.civiliansHit, 1000),
    cageOpen: o.cageOpen === true,
  };
}

/**
 * Start a story chapter. The server checks it's unlocked and builds the deck and card levels
 * itself: the Event deck pick (Story 2) or the equipped deck checked against the chapter's
 * rules, with required units raised to the level floor (Story 3).
 */
player.post("/story/start", P, async (c) => {
  const req = await body(c);
  const f = findChapter(String(req.chapter ?? ""));
  if (!f) fail(404, "Unknown chapter");
  // The game claims the play slot first (see play.ts); without it, another device is playing.
  const device = deviceOf(c);
  if (!(await holdsPlay(c.env.DB, c.get("playerId"), device))) fail(409, "playing elsewhere");
  let started: { deck: string[]; levels: Record<string, number> } | null = null;
  const r = await update(c, (p) => {
    const lock = chapterLock(p.story, p.trophies, f.chapter.id);
    if (lock) fail(400, lock);
    const pick = Array.isArray(req.pick) ? req.pick.map(String) : undefined;
    const d = chapterDeck(f.chapter, { deck: p.deck, level: (id) => p.cards[id]?.level ?? 1 }, pick);
    if ("problem" in d) fail(400, d.problem);
    started = d;
    if (!p.story.started.includes(f.story.id)) p.story.started.push(f.story.id);
  });
  const { deck, levels } = started!;
  const row = await run(
    c.env.DB,
    "INSERT INTO battles (user_id, arena, deck, hero, started_at) VALUES (?, ?, ?, ?, ?)",
    c.get("playerId"),
    `story:${f.chapter.id}`,
    JSON.stringify(deck),
    r.profile.hero,
    Date.now(),
  );
  await setPlayBattle(c.env.DB, c.get("playerId"), device!, row.meta.last_row_id);
  return c.json({ battleId: row.meta.last_row_id, deck, levels, profile: r.profile });
});

/**
 * A story chapter is over. Like a solo run, the client reports how far it got and the server
 * caps that by the time elapsed; a win needs the last wave cleared with lives left. No trophies.
 */
player.post("/story/:id/finish", P, async (c) => {
  const db = c.env.DB;
  const id = numParam(c, "id");
  const playerId = c.get("playerId");
  const b = await one<{ id: number; arena: string; started_at: number; finished_at: number | null; cutoff: number | null }>(
    db,
    "SELECT id, arena, started_at, finished_at, cutoff FROM battles WHERE id = ? AND user_id = ?",
    id,
    playerId,
  );
  if (!b || !b.arena.startsWith("story:")) fail(404, "Unknown story battle");
  const f = findChapter(b.arena.slice("story:".length));
  if (!f) fail(404, "That chapter no longer exists");
  const now = Date.now();
  const claimed = await run(db, "UPDATE battles SET finished_at = ? WHERE id = ? AND finished_at IS NULL", now, b.id);
  if (b.finished_at || !claimed.meta.changes) fail(409, "Battle already finished");

  const req = await body(c);
  const elapsed = (Math.min(now, b.cutoff ?? now) - b.started_at) / 1000;
  const waves = f.chapter.waves.length;
  const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const duel = f.chapter.duel;
  const wave = duel ? waves : int(req.wave, Math.min(waves, Math.floor(elapsed / 3) + 1));
  const lives = int(req.lives, ECONOMY.lives);
  // Taken over by another device: it can't count as a win.
  // An arena duel is a best-of PvP match against the bot: it can't be over in under 20 seconds.
  const won = req.won === true && !b.cutoff && (duel ? elapsed >= 20 : wave >= waves && lives > 0);
  const bossWaves = f.chapter.waves.slice(0, wave).filter((w) => w.boss).length;
  const bosses = int(req.bosses, bossWaves);
  const kills = int(req.kills, wave * 80);
  const summons = int(req.summons, 15 + wave * 12);
  const merges = int(req.merges, summons);
  const awakens = int(req.awakens, Math.floor(merges / (2 ** (ECONOMY.maxRank - 1) - 1)));
  const heroCasts = int(req.heroCasts, Math.floor(elapsed / 10) + 1);
  // Duel stars: 3 with no round lost, 2 with one, 1 with more.
  const roundsLost = int(req.roundsLost, Math.max(0, (duel?.rounds ?? 1) - 1));
  const stars = won ? (duel ? (roundsLost <= 0 ? 3 : roundsLost === 1 ? 2 : 1) : starsFor(lives, ECONOMY.lives)) : 0;
  const objectives = f.chapter.mechanics && !duel ? cleanObjectives(f.chapter, req.objectives) : null;
  let r;
  try {
    r = await update(c, (p) => {
      addQuestProgress(p.daily, { wave, kills, bosses, summons, merges, awakens, heroCasts, stories: won ? 1 : 0 });
      const win = won ? grantStoryWin(p, f.chapter.id, stars, utcDay(now)) : null;
      // v2.2: objectives scale the first-clear gold and gems (replays pay their fixed reward).
      if (win?.firstClear && objectives) {
        const m = objectiveMult(f.chapter, objectives);
        const coins = Math.round(win.coins * m);
        const gems = Math.round(win.gems * m);
        p.coins += coins - win.coins;
        p.gems += gems - win.gems;
        win.coins = coins;
        win.gems = gems;
      }
      return { win };
    });
  } catch (e) {
    await run(db, "UPDATE battles SET finished_at = NULL WHERE id = ?", b.id);
    throw e;
  }
  await run(db, "UPDATE battles SET wave = ?, kills = ?, bosses = ?, coins = ?, gems = ?, trophies = 0 WHERE id = ?", wave, kills, bosses, r.win?.coins ?? 0, r.win?.gems ?? 0, b.id);
  await releasePlay(db, playerId, deviceOf(c));
  return c.json({ won, wave, ...r });
});

// ---------------------------------------------------------------- leaderboard

/**
 * Ranked by trophies, best wave or ranked PvP rating. Players with 0 (or, on the rating board,
 * no ranked matches yet) aren't ranked; ties share a rank.
 */
const BOARDS = {
  trophies: { v: "json_extract(profile, '$.trophies')", on: "json_extract(profile, '$.trophies') > 0" },
  wave: { v: "json_extract(profile, '$.bestWave')", on: "json_extract(profile, '$.bestWave') > 0" },
  rating: { v: "json_extract(profile, '$.ranked.rating')", on: "json_extract(profile, '$.ranked.played') > 0" },
} as const;
type BoardId = keyof typeof BOARDS;
const LEADERBOARD_SIZE = 100;

player.get("/leaderboard", P, async (c) => {
  const db = c.env.DB;
  const q = c.req.query("by") as BoardId;
  const by: BoardId = q in BOARDS ? q : "trophies";
  const { v, on } = BOARDS[by];
  const [rows, total, mine] = await Promise.all([
    all(
      db,
      `SELECT id, display_name AS name, json_extract(profile, '$.trophies') AS trophies,
              json_extract(profile, '$.bestWave') AS bestWave, json_extract(profile, '$.hero') AS hero, json_extract(profile, '$.avatar') AS avatar,
              json_extract(profile, '$.ranked.rating') AS rating, json_extract(profile, '$.society.league') AS society,
              RANK() OVER (ORDER BY ${v} DESC) AS rank
       FROM users WHERE banned = 0 AND ${on}
       ORDER BY rank, id LIMIT ?`,
      LEADERBOARD_SIZE,
    ),
    count(db, `SELECT COUNT(*) AS n FROM users WHERE banned = 0 AND ${on}`),
    // The caller's own place, even when they're outside the list.
    one<{ value: number; ok: number; banned: number }>(db, `SELECT ${v} AS value, ${on} AS ok, banned FROM users WHERE id = ?`, c.get("playerId")),
  ]);
  const rank = mine && mine.ok && !mine.banned ? (await count(db, `SELECT COUNT(*) + 1 AS n FROM users WHERE banned = 0 AND ${on} AND ${v} > ?`, mine.value)) : null;
  return c.json({ by, rows, total, me: { id: c.get("playerId"), rank } });
});

/** Another player's public profile: league badges, story badges and current deck (v2.9 profile view). */
player.get("/players/:id", P, async (c) => {
  const id = numParam(c, "id");
  const u = Number.isInteger(id) && id > 0 ? await getUser(c.env.DB, id) : null;
  if (!u || u.banned) fail(404, "Player not found");
  const p = readProfile(u);
  const now = playerLeague(p);
  const out: PublicProfile = {
    id: u.id,
    name: u.display_name,
    avatar: p.avatar,
    hero: p.hero,
    trophies: p.trophies,
    bestWave: p.bestWave,
    ranked: p.ranked,
    society: p.society?.league ?? null,
    leagues: [...new Set([...p.leagues, now.id])],
    badges: p.story.badges,
    deck: p.deck.map((d) => ({ id: d, level: p.cards[d]?.level ?? 1 })),
    joined: u.created_at,
  };
  return c.json(out);
});

/** Longest waves survived in one arena (profile.arenaBest), for the arena info dialog. */
const ARENA_TOP_SIZE = 20;

player.get("/arenas/:id/top", P, async (c) => {
  const db = c.env.DB;
  const a = ARENA_BY_ID[param(c, "id")];
  if (!a) fail(404, "Unknown arena");
  // Arena ids are plain identifiers from the config, but the path goes in as a bound value anyway.
  const v = "json_extract(profile, '$.arenaBest.' || ?1)";
  const rows = await all(
    db,
    `SELECT id, display_name AS name, ${v} AS wave, json_extract(profile, '$.trophies') AS trophies,
            json_extract(profile, '$.hero') AS hero, json_extract(profile, '$.avatar') AS avatar, RANK() OVER (ORDER BY ${v} DESC) AS rank
     FROM users WHERE banned = 0 AND ${v} > 0
     ORDER BY rank, id LIMIT ?2`,
    a.id,
    ARENA_TOP_SIZE,
  );
  const mine = await one<{ wave: number | null }>(db, `SELECT ${v} AS wave FROM users WHERE id = ?2`, a.id, c.get("playerId"));
  const wave = mine?.wave ?? 0;
  const rank = wave > 0 ? await count(db, `SELECT COUNT(*) + 1 AS n FROM users WHERE banned = 0 AND ${v} > ?2`, a.id, wave) : null;
  return c.json({ arena: a.id, rows, me: { id: c.get("playerId"), wave, rank } });
});
