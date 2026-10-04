/**
 * PvP on Durable Objects (see PVP.md).
 *
 * - `Matchmaker` (one instance) holds the queue sockets, pairs players per mode, and after
 *   a while hands out a bot match instead.
 * - `MatchRoom` (one per match) relays sends, board snapshots and emotes between the two
 *   players, checks each send against the shared clock, and settles the result in D1.
 *
 * Each client simulates its own board; the room never runs the simulation.
 * WebSockets authenticate with the session token as a subprotocol (browsers can't set
 * headers on a WebSocket): `new WebSocket(url, ["tower-rush", token])`.
 */
import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import { one, run } from "./db.ts";
import { ensureConfig } from "./config-store.ts";
import { body, fail, param, type AppEnv, type Bindings, type Ctx } from "./http.ts";
import { requirePlayer } from "./auth.ts";
import { getUser, readProfile, writeProfile } from "./users.ts";
import { payPromotions, refreshDaily, type Promotion } from "../../shared/profile.ts";
import { addQuestProgress } from "../../shared/daily.ts";
import { ECONOMY } from "../../shared/economy.ts";
import {
  PVP,
  PVP_MODES,
  CODE_CHARS,
  SendStock,
  botLoadout,
  loadoutFor,
  normalizeCode,
  pvpArena,
  trophyChange,
  waveAt,
  waveStart,
  type ClientMsg,
  type MatchResult,
  type MatchSetup,
  type PvpMode,
  type ServerMsg,
} from "../../shared/pvp.ts";

const PROTOCOL = "tower-rush";
/** Seconds between the match being made and wave time 0 (the versus screen). */
const VERSUS_SECONDS = 6;
/** A player who drops out has this long to come back. */
const RECONNECT_MS = 60_000;

// ---------------------------------------------------------------- settling

interface Stats {
  kills?: number;
  bosses?: number;
  summons?: number;
  merges?: number;
  awakens?: number;
  heroCasts?: number;
}

/** Pay one player's side of a result: gold, trophies (ranked) and any league promotions. */
async function pay(db: D1Database, userId: number, coins: number, trophies: number): Promise<Promotion[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const u = await getUser(db, userId);
    if (!u) return [];
    const p = readProfile(u);
    refreshDaily(p);
    p.coins += coins;
    p.trophies = Math.max(0, p.trophies + trophies);
    const promotions = payPromotions(p);
    if (await writeProfile(db, u, p)) return promotions;
  }
  return [];
}

/** Daily quest progress from a finished match, capped to what a match of this length could do. */
async function questProgress(db: D1Database, userId: number, stats: Stats, seconds: number) {
  const wave = Math.max(1, waveAt(seconds, ECONOMY.bossEvery));
  const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const summons = int(stats.summons, 15 + wave * 12);
  const progress = {
    battles: 1,
    kills: int(stats.kills, wave * 80),
    bosses: int(stats.bosses, Math.floor(wave / ECONOMY.bossEvery) + 4),
    summons,
    merges: int(stats.merges, summons),
    awakens: int(stats.awakens, Math.floor(summons / 63)),
    heroCasts: int(stats.heroCasts, Math.floor(seconds / 10) + 1),
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const u = await getUser(db, userId);
    if (!u) return;
    const p = readProfile(u);
    refreshDaily(p);
    addQuestProgress(p.daily, progress);
    if (await writeProfile(db, u, p)) return;
  }
}

/** Gold and trophies for each side of a result. */
function rewards(setup: MatchSetup, winner: 0 | 1 | null) {
  const r = PVP.rules;
  const [a, b] = setup.players;
  const coin = (i: 0 | 1) => (setup.practice ? 0 : winner === null ? r.drawCoins : winner === i ? r.winCoins : r.lossCoins);
  const trophies: [number, number] =
    setup.mode === "ranked" && !setup.friendly && !setup.practice
      ? [trophyChange(winner === null ? null : winner === 0, a.trophies, b.trophies), trophyChange(winner === null ? null : winner === 1, b.trophies, a.trophies)]
      : [0, 0];
  return { trophies, coins: [coin(0), coin(1)] as [number, number] };
}

/** Write a finished match and pay both players (a bot is player 1 with no account). */
async function settle(db: D1Database, setup: MatchSetup, users: [number, number | null], winner: 0 | 1 | null, reason: MatchResult["reason"]) {
  const now = Date.now();
  // Mark it finished first: of two settles at once, only one gets past this.
  const claimed = await run(db, "UPDATE pvp_matches SET finished_at = ? WHERE id = ? AND finished_at IS NULL", now, setup.id);
  if (!claimed.meta.changes) return null;
  const { trophies, coins } = rewards(setup, winner);
  const promotions: [Promotion[], Promotion[]] = [[], []];
  for (const i of [0, 1] as const) {
    const id = users[i];
    if (id !== null) promotions[i] = await pay(db, id, coins[i], trophies[i]);
  }
  await run(
    db,
    "UPDATE pvp_matches SET winner = ?, reason = ?, trophies1 = ?, trophies2 = ?, coins1 = ?, coins2 = ? WHERE id = ?",
    winner,
    reason,
    trophies[0],
    trophies[1],
    coins[0],
    coins[1],
    setup.id,
  );
  const result: MatchResult = { winner, reason, trophies, coins };
  return { result, promotions };
}

/** Logs are kept for replays; cap their size so one bad client can't fill the database. */
const logJson = (log: unknown) => {
  const s = JSON.stringify(log ?? null);
  return s.length <= 200_000 ? s : null;
};

async function newMatch(db: D1Database, setup: MatchSetup, p1: number, p2: number | null) {
  await run(
    db,
    "INSERT INTO pvp_matches (id, mode, p1, p2, setup, started_at) VALUES (?, ?, ?, ?, ?, ?)",
    setup.id,
    setup.mode,
    p1,
    p2,
    JSON.stringify(setup),
    Date.now(),
  );
}

/**
 * A ranked bot match the player walked away from counts as a loss when they queue again
 * (otherwise quitting a losing match would dodge the trophy loss).
 */
async function settleAbandoned(db: D1Database, userId: number) {
  const row = await one<{ setup: string }>(
    db,
    "SELECT setup FROM pvp_matches WHERE p1 = ? AND p2 IS NULL AND finished_at IS NULL AND mode = 'ranked' AND json_extract(setup, '$.practice') IS NULL ORDER BY started_at DESC LIMIT 1",
    userId,
  );
  if (row) await settle(db, JSON.parse(row.setup), [userId, null], 1, "left");
}

// ---------------------------------------------------------------- routes

export const pvp = new Hono<AppEnv>();

/** The player id for a WebSocket request's token (sent as the second subprotocol). */
async function socketPlayer(c: Ctx) {
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") fail(426, "Expected a WebSocket");
  const protocols = (c.req.header("sec-websocket-protocol") ?? "").split(",").map((s) => s.trim());
  const token = protocols[0] === PROTOCOL ? protocols[1] : null;
  if (!token) fail(401, "Not signed in");
  const row = await one<{ subject_id: number; expires_at: number }>(
    c.env.DB,
    "SELECT subject_id, expires_at FROM sessions WHERE token = ? AND kind = 'player'",
    token,
  );
  if (!row || row.expires_at < Date.now()) fail(401, "Not signed in");
  const u = await getUser(c.env.DB, row.subject_id);
  if (!u) fail(401, "Account no longer exists");
  if (u.banned) fail(403, "banned", { reason: u.ban_reason });
  return u.id;
}

/** Forward an upgrade request to a Durable Object, telling it who is connecting. */
function forward(c: Ctx, stub: DurableObjectStub, userId: number, extra: Record<string, string> = {}) {
  const headers = new Headers(c.req.raw.headers);
  headers.set("x-player-id", String(userId));
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return stub.fetch(new Request(c.req.raw.url, { headers }));
}

/**
 * The matchmaking socket. `?mode=` joins that mode's queue; `?mode=&bot=1` starts a practice
 * match against a bot right away; `?mode=&challenge=host` opens a
 * friend challenge and answers with its code; `?join=CODE` accepts one.
 */
pvp.get("/queue", async (c) => {
  const userId = await socketPlayer(c);
  const join = normalizeCode(c.req.query("join") ?? "");
  const host = c.req.query("challenge") === "host";
  const mode = (c.req.query("mode") ?? "") as PvpMode;
  if (!join && !PVP_MODES.includes(mode)) fail(400, "Unknown mode");
  const bot = c.req.query("bot") === "1";
  if (!join && !host && !bot) await settleAbandoned(c.env.DB, userId);
  const extra: Record<string, string> = join ? { "x-join": join } : { "x-mode": mode, ...(host ? { "x-host": "1" } : {}), ...(bot ? { "x-bot": "1" } : {}) };
  return forward(c, c.env.MATCHMAKER.get(c.env.MATCHMAKER.idFromName("main")), userId, extra);
});

pvp.get("/match/:id", async (c) => {
  const userId = await socketPlayer(c);
  const id = param(c, "id");
  const m = await one<{ p1: number; p2: number | null }>(c.env.DB, "SELECT p1, p2 FROM pvp_matches WHERE id = ?", id);
  if (!m || m.p2 === null || (m.p1 !== userId && m.p2 !== userId)) fail(404, "Unknown match");
  return forward(c, c.env.MATCH.get(c.env.MATCH.idFromName(id)), userId);
});

/** Result of a bot match (played entirely in the browser). */
pvp.post("/matches/:id/finish", requirePlayer, async (c) => {
  const db = c.env.DB;
  const userId = c.get("playerId");
  const m = await one<{ setup: string; started_at: number; finished_at: number | null }>(
    db,
    "SELECT setup, started_at, finished_at FROM pvp_matches WHERE id = ? AND p1 = ? AND p2 IS NULL",
    param(c, "id"),
    userId,
  );
  if (!m) fail(404, "Unknown match");
  if (m.finished_at) fail(409, "Match already finished");
  const req = await body(c);
  const setup = JSON.parse(m.setup) as MatchSetup;
  // The client can't claim a longer match than has passed, and a bot can't be beaten in under a minute.
  const elapsed = (Date.now() - setup.startAt) / 1000;
  const seconds = Math.max(0, Math.min(elapsed + 5, Number(req.seconds) || 0));
  let winner: 0 | 1 | null = req.result === "win" ? 0 : req.result === "draw" ? null : 1;
  if (winner === 0 && seconds < 60) winner = 1;
  const r = await settle(db, setup, [userId, null], winner, req.result === "draw" ? "maxWave" : req.result === "left" ? "left" : "hp");
  if (!r) fail(409, "Match already finished");
  await run(db, "UPDATE pvp_matches SET log1 = ? WHERE id = ?", logJson(req.log), setup.id);
  if (!setup.practice) await questProgress(db, userId, req.stats ?? {}, seconds);
  const u = await getUser(db, userId);
  return c.json({ result: r.result, promotions: r.promotions[0], profile: u ? readProfile(u) : null });
});

/**
 * Most mana a player can have spent on sends by match time `t`. The client simulates its own
 * board, so the room can't see its mana; this caps a cheating client instead. Strong bot
 * boards (level 15, mana units) earned at most ~18t + 0.06t² (see PVP.md); this
 * allows twice that, which honest play can't reach.
 */
const sendBudget = (t: number) => ECONOMY.startMana + 2 * (20 * Math.max(0, t) + 0.06 * Math.max(0, t) ** 2);

/** Finish a socket's close handshake (or close it), ignoring one that is already gone. */
function closeQuietly(ws: WebSocket, reason = "") {
  try {
    ws.close(1000, reason);
  } catch {
    // Already closed.
  }
}

// ---------------------------------------------------------------- matchmaker

interface Waiting {
  ws: WebSocket;
  userId: number;
  mode: PvpMode;
  trophies: number;
  since: number;
  /** Friend challenges: when the code stops working. */
  expires?: number;
}

/** A fresh challenge code nobody is using. */
function newCode(taken: Map<string, unknown>) {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const code = [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
    if (!taken.has(code)) return code;
  }
}

export class Matchmaker extends DurableObject<Bindings> {
  private queue: Waiting[] = [];
  /** Open friend challenges by code. */
  private hosts = new Map<string, Waiting>();

  async fetch(req: Request) {
    await ensureConfig(this.env.DB);
    const userId = Number(req.headers.get("x-player-id"));
    const join = req.headers.get("x-join");
    const u = await getUser(this.env.DB, userId);
    if (!u) return new Response("Unknown player", { status: 401 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const response = new Response(null, { status: 101, webSocket: client, headers: { "Sec-WebSocket-Protocol": PROTOCOL } });
    const trophies = readProfile(u).trophies;
    // Accepting a challenge: pair with whoever holds the code (once the socket is open).
    if (join) {
      const host = this.hosts.get(join);
      const w: Waiting = { ws: server, userId, mode: host?.mode ?? "casual", trophies, since: Date.now() };
      const problem = !host || host.expires! < Date.now() ? "No open challenge with that code" : host.userId === userId ? "That's your own challenge" : null;
      setTimeout(() => {
        if (problem || !host) return this.drop(w, problem ?? "");
        this.hosts.delete(join);
        this.pair(host, w, true).catch((e) => {
          console.error("challenge pair failed", e);
          this.drop(host, "Couldn't start the match");
          this.drop(w, "Couldn't start the match");
        });
      }, 50);
      return response;
    }
    const mode = req.headers.get("x-mode") as PvpMode;
    // Practice: a bot straight away (once the socket is open).
    if (req.headers.get("x-bot") === "1") {
      const w: Waiting = { ws: server, userId, mode, trophies, since: Date.now() };
      setTimeout(() => {
        this.bot(w, true).catch((e) => {
          console.error("practice match failed", e);
          this.drop(w, "Couldn't start the match");
        });
      }, 50);
      return response;
    }
    if (req.headers.get("x-host") === "1") {
      // One open challenge per player.
      for (const h of this.hosts.values()) if (h.userId === userId) this.drop(h, "Replaced by a new challenge");
      const expires = Date.now() + PVP.rules.challengeMinutes * 60_000;
      const w: Waiting = { ws: server, userId, mode, trophies, since: Date.now(), expires };
      const code = newCode(this.hosts);
      this.hosts.set(code, w);
      server.addEventListener("close", () => {
        if (this.hosts.get(code) === w) this.hosts.delete(code);
        closeQuietly(server);
      });
      server.addEventListener("message", (e) => {
        if (e.data === "leave") this.drop(w, "Challenge cancelled");
      });
      this.send(w, { t: "code", code, mode, expiresAt: expires });
      await this.ctx.storage.setAlarm(Math.min(expires, Date.now() + 1000));
      return response;
    }
    // One queue spot per player: a second tab replaces the first.
    for (const w of this.queue.filter((w) => w.userId === userId)) this.drop(w, "Queued from somewhere else");
    const w: Waiting = { ws: server, userId, mode, trophies, since: Date.now() };
    this.queue.push(w);
    server.addEventListener("close", () => {
      this.queue = this.queue.filter((x) => x !== w);
      closeQuietly(server);
    });
    server.addEventListener("message", (e) => {
      if (e.data === "leave") this.drop(w, "Left the queue");
    });
    this.send(w, { t: "queued", mode, players: this.queue.filter((x) => x.mode === mode).length });
    await this.ctx.storage.setAlarm(Date.now() + 500);
    return response;
  }

  private send(w: Waiting, msg: unknown) {
    try {
      w.ws.send(JSON.stringify(msg));
    } catch {
      // Gone; the close handler removes it.
    }
  }

  private drop(w: Waiting, reason: string) {
    this.queue = this.queue.filter((x) => x !== w);
    for (const [code, h] of this.hosts) if (h === w) this.hosts.delete(code);
    closeQuietly(w.ws, reason);
  }

  async alarm() {
    await ensureConfig(this.env.DB);
    const r = PVP.rules;
    const now = Date.now();
    const band = (w: Waiting) => r.matchBand + r.matchBandGrowth * ((now - w.since) / 1000);
    // Pair the longest-waiting players first.
    const waiting = [...this.queue].sort((a, b) => a.since - b.since);
    const used = new Set<Waiting>();
    for (const a of waiting) {
      if (used.has(a)) continue;
      let best: Waiting | null = null;
      for (const b of waiting) {
        if (b === a || used.has(b) || b.mode !== a.mode || b.userId === a.userId) continue;
        const gap = Math.abs(a.trophies - b.trophies);
        if (a.mode === "ranked" && (gap > band(a) || gap > band(b))) continue;
        if (!best || gap < Math.abs(a.trophies - best.trophies)) best = b;
      }
      if (best) {
        used.add(a).add(best);
        await this.pair(a, best).catch((e) => console.error("pair failed", e));
      } else if (now - a.since >= r.botAfterSeconds * 1000) {
        used.add(a);
        await this.bot(a).catch((e) => console.error("bot match failed", e));
      }
    }
    for (const h of this.hosts.values()) if (h.expires! <= now) this.drop(h, "Challenge expired");
    if (this.queue.length || this.hosts.size) await this.ctx.storage.setAlarm(Date.now() + 1000);
  }

  private async loadout(w: Waiting, mode: PvpMode, seed: number) {
    const u = await getUser(this.env.DB, w.userId);
    if (!u) throw new Error("player gone");
    return loadoutFor(mode, readProfile(u), u.display_name, seed);
  }

  private setup(mode: PvpMode, seed: number): Omit<MatchSetup, "players"> {
    return { id: crypto.randomUUID(), mode, seed, arena: pvpArena(seed), startAt: Date.now() + VERSUS_SECONDS * 1000 };
  }

  private async pair(a: Waiting, b: Waiting, friendly = false) {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const base = this.setup(a.mode, seed);
    const setup: MatchSetup = { ...base, ...(friendly ? { friendly } : {}), players: [await this.loadout(a, a.mode, seed), await this.loadout(b, a.mode, seed)] };
    await newMatch(this.env.DB, setup, a.userId, b.userId);
    const room = this.env.MATCH.get(this.env.MATCH.idFromName(setup.id));
    await room.init(setup, [a.userId, b.userId]);
    for (const [w, you] of [[a, 0], [b, 1]] as const) {
      this.send(w, { t: "matched", matchId: setup.id, you });
      this.drop(w, "Matched");
    }
  }

  private async bot(w: Waiting, practice = false) {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const base = this.setup(w.mode, seed);
    const me = await this.loadout(w, w.mode, seed);
    const setup: MatchSetup = { ...base, ...(practice ? { practice } : {}), players: [me, botLoadout(w.mode, me, seed)] };
    await newMatch(this.env.DB, setup, w.userId, null);
    this.send(w, { t: "bot", setup, now: Date.now() });
    this.drop(w, "Matched");
  }
}

// ---------------------------------------------------------------- match room

interface RoomState {
  setup: MatchSetup;
  users: [number, number];
  result: MatchResult | null;
  /** When each player last dropped out (null while connected). */
  away: [number | null, number | null];
}

export class MatchRoom extends DurableObject<Bindings> {
  private state: RoomState | null = null;
  private sockets: [WebSocket | null, WebSocket | null] = [null, null];
  private stocks: [SendStock, SendStock] = [new SendStock(), new SendStock()];
  /** Mana each player has spent on sends, checked against what a board could have earned. */
  private spent: [number, number] = [0, 0];
  /** Last HP each board reported, for deciding a match at max wave. */
  private hp: [number, number] = [0, 0];
  private logged: [boolean, boolean] = [false, false];
  /** HP each board finished the last wave with (null until it gets there). */
  private ended: [number | null, number | null] = [null, null];

  private async load() {
    this.state ??= (await this.ctx.storage.get<RoomState>("state")) ?? null;
    return this.state;
  }

  private async save() {
    if (this.state) await this.ctx.storage.put("state", this.state);
  }

  /** Called by the matchmaker when the match is made. */
  async init(setup: MatchSetup, users: [number, number]) {
    await ensureConfig(this.env.DB);
    this.state = { setup, users, result: null, away: [null, null] };
    this.hp = [PVP.rules.hp, PVP.rules.hp];
    await this.save();
    // Nobody showed up / max match length: check back then.
    await this.ctx.storage.setAlarm(setup.startAt + RECONNECT_MS);
  }

  /** Match time (seconds since wave time 0). */
  private time() {
    return (Date.now() - this.state!.setup.startAt) / 1000;
  }

  /** When the match must be over: the end of the last wave, plus a little slack. */
  private endAt() {
    return this.state!.setup.startAt + (waveStart(PVP.rules.maxWave + 1, ECONOMY.bossEvery) + 30) * 1000;
  }

  async fetch(req: Request) {
    await ensureConfig(this.env.DB);
    const s = await this.load();
    const userId = Number(req.headers.get("x-player-id"));
    const idx = s ? s.users.indexOf(userId) : -1;
    if (!s || idx < 0) return new Response("Unknown match", { status: 404 });
    const you = idx as 0 | 1;
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    if (this.sockets[you]) closeQuietly(this.sockets[you]!, "Connected from somewhere else");
    this.sockets[you] = server;
    s.away[you] = null;
    await this.save();
    server.addEventListener("message", (e) => this.onMessage(you, server, e.data).catch((err) => console.error(err)));
    server.addEventListener("close", () => {
      closeQuietly(server);
      this.onClose(you, server).catch((err) => console.error(err));
    });
    this.emit(server, { t: "setup", setup: s.setup, you, now: Date.now() });
    if (s.result) this.emit(server, { t: "over", result: s.result });
    else this.to(1 - you, { t: "opponent", connected: true });
    return new Response(null, { status: 101, webSocket: client, headers: { "Sec-WebSocket-Protocol": PROTOCOL } });
  }

  private emit(ws: WebSocket | null, msg: ServerMsg | Record<string, unknown>) {
    try {
      ws?.send(JSON.stringify(msg));
    } catch {
      // Closed; onClose handles it.
    }
  }

  private to(i: number, msg: ServerMsg) {
    this.emit(this.sockets[i], msg);
  }

  private async onMessage(you: 0 | 1, ws: WebSocket, data: unknown) {
    if (this.sockets[you] !== ws || typeof data !== "string" || data.length > 300_000) return;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    const s = this.state!;
    const other = (1 - you) as 0 | 1;
    switch (msg.t) {
      case "snap":
        if (typeof msg.s?.hp === "number") this.hp[you] = msg.s.hp;
        if (!s.result) this.to(other, { t: "snap", s: msg.s });
        break;
      case "send": {
        if (s.result) return;
        // Checked against the room's own clock (a second of slack for latency).
        const now = this.time();
        const send = PVP.sends.find((x) => x.id === msg.id && x.enabled);
        const wave = waveAt(now + 1, ECONOMY.bossEvery);
        const problem = !send
          ? "Unknown send"
          : wave < send.unlockWave
            ? "Locked"
            : this.stocks[you].charges(send, now + 1) <= 0
              ? "Recharging"
              : this.spent[you] + send.cost > sendBudget(now + 1)
                ? "Not enough mana"
                : null;
        if (problem || !send) return this.to(you, { t: "rejected", id: String(msg.id), reason: problem ?? "" });
        this.stocks[you].use(send, now);
        this.spent[you] += send.cost;
        this.to(other, { t: "incoming", id: send.id, at: now });
        break;
      }
      case "emote":
        if (Number.isInteger(msg.n) && msg.n >= 0 && msg.n < 12) this.to(other, { t: "emote", n: msg.n });
        break;
      case "dead":
        await this.finish(other, "hp");
        break;
      case "end": {
        this.ended[you] = Math.max(0, Number(msg.hp) || 0);
        this.hp[you] = this.ended[you]!;
        const [a, b] = this.ended;
        if (a !== null && b !== null) await this.finish(a === b ? null : a > b ? 0 : 1, "maxWave");
        break;
      }
      case "leave":
        await this.finish(other, "left");
        break;
      case "log":
        // Once per player: their board's action log (for replays) and quest counts.
        if (this.logged[you]) return;
        this.logged[you] = true;
        await run(this.env.DB, `UPDATE pvp_matches SET log${you + 1} = ? WHERE id = ?`, logJson(msg.log), s.setup.id);
        await questProgress(this.env.DB, s.users[you], ((msg.log as { stats?: Stats })?.stats ?? {}) as Stats, Math.max(0, this.time()));
        break;
    }
  }

  private async onClose(you: 0 | 1, ws: WebSocket) {
    if (this.sockets[you] !== ws) return;
    this.sockets[you] = null;
    const s = this.state!;
    if (s.result) return;
    s.away[you] = Date.now();
    await this.save();
    this.to(1 - you, { t: "opponent", connected: false });
    await this.ctx.storage.setAlarm(Date.now() + RECONNECT_MS);
  }

  async alarm() {
    await ensureConfig(this.env.DB);
    const s = await this.load();
    if (!s || s.result) return;
    const now = Date.now();
    const gone = ([0, 1] as const).filter((i) => (s.away[i] !== null && now - s.away[i]! >= RECONNECT_MS) || (!this.sockets[i] && now - s.setup.startAt >= RECONNECT_MS));
    if (gone.length === 2) return this.finish(null, "disconnect");
    if (gone.length === 1) return this.finish((1 - gone[0]) as 0 | 1, "disconnect");
    if (now >= this.endAt()) {
      const [a, b] = this.hp;
      return this.finish(a === b ? null : a > b ? 0 : 1, "maxWave");
    }
    // Check again at the next disconnect deadline or the end of the match.
    const deadlines = s.away.filter((t): t is number => t !== null).map((t) => t + RECONNECT_MS);
    await this.ctx.storage.setAlarm(Math.min(this.endAt(), ...deadlines, now + 60_000));
  }

  private async finish(winner: 0 | 1 | null, reason: MatchResult["reason"]) {
    const s = this.state!;
    if (s.result) return;
    const r = await settle(this.env.DB, s.setup, s.users, winner, reason);
    if (!r) return;
    s.result = r.result;
    await this.save();
    for (const i of [0, 1] as const) this.emit(this.sockets[i], { t: "over", result: r.result, promotions: r.promotions[i] });
  }
}
