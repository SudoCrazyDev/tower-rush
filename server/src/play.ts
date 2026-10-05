/**
 * One battle at a time per player. Before a solo battle or PvP (queue, challenge, match) the
 * game claims the player's play slot for its device; while playing it sends a heartbeat.
 * Another device asking while the slot is fresh gets `409 busy`, and the game asks whether
 * to play there instead (`takeover`). The old device learns from its next heartbeat and
 * ends its battle: a solo run is saved up to the takeover, a PvP match is surrendered.
 */
import { Hono } from "hono";
import { one, run } from "./db.ts";
import { requirePlayer } from "./auth.ts";
import { body, fail, type AppEnv, type Ctx } from "./http.ts";

export type PlayKind = "battle" | "pvp";
const KINDS: readonly PlayKind[] = ["battle", "pvp"];

/** A slot whose device hasn't checked in for this long is free (tab closed, phone asleep). */
const STALE_MS = 30_000;

interface PlayRow {
  device: string;
  kind: PlayKind;
  battle_id: number | null;
  started_at: number;
  seen_at: number;
}

const DEVICE_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** The calling device's id (an `X-Device` header, or `?device=` on a WebSocket). */
export function deviceOf(c: Ctx) {
  const d = c.req.header("x-device") ?? c.req.query("device") ?? "";
  return DEVICE_RE.test(d) ? d : null;
}

const slot = (db: D1Database, userId: number) =>
  one<PlayRow>(db, "SELECT device, kind, battle_id, started_at, seen_at FROM active_play WHERE user_id = ?", userId);

/** Whether `device` holds the player's slot (a request without a device id never does). */
export async function holdsPlay(db: D1Database, userId: number, device: string | null) {
  const s = await slot(db, userId);
  return !!device && !!s && s.device === device && s.seen_at >= Date.now() - STALE_MS;
}

/** Remember which solo battle the slot is for, so a takeover can close it. */
export const setPlayBattle = (db: D1Database, userId: number, device: string, battleId: number) =>
  run(db, "UPDATE active_play SET battle_id = ? WHERE user_id = ? AND device = ?", battleId, userId, device);

/** Free the slot if `device` holds it. */
export const releasePlay = (db: D1Database, userId: number, device: string | null) =>
  device ? run(db, "DELETE FROM active_play WHERE user_id = ? AND device = ?", userId, device) : null;

export const play = new Hono<AppEnv>();
play.use(requirePlayer);

play.post("/claim", async (c) => {
  const db = c.env.DB;
  const userId = c.get("playerId");
  const device = deviceOf(c);
  if (!device) fail(400, "Missing device id");
  const req = await body(c);
  const kind = req.kind as PlayKind;
  if (!KINDS.includes(kind)) fail(400, "Unknown kind");
  const now = Date.now();
  const old = await slot(db, userId);
  // Taken only if it's free, stale, already this device's, or the player chose to play here.
  const r = await run(
    db,
    `INSERT INTO active_play (user_id, device, kind, battle_id, started_at, seen_at) VALUES (?, ?, ?, NULL, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET device = excluded.device, kind = excluded.kind, battle_id = NULL,
       started_at = excluded.started_at, seen_at = excluded.seen_at
     WHERE active_play.device = excluded.device OR active_play.seen_at < ? OR ?`,
    userId,
    device,
    kind,
    now,
    now,
    now - STALE_MS,
    req.takeover === true ? 1 : 0,
  );
  if (!r.meta.changes) fail(409, "busy", { kind: old?.kind ?? kind, since: old?.started_at ?? now });
  // The battle that slot was for stops counting now (the device that played it saves what it had).
  if (old?.battle_id) await run(db, "UPDATE battles SET cutoff = ? WHERE id = ? AND finished_at IS NULL AND cutoff IS NULL", now, old.battle_id);
  return c.json({ ok: true });
});

/** Heartbeat. `held: false` means another device has taken over (or the slot lapsed to one). */
play.post("/beat", async (c) => {
  const device = deviceOf(c);
  const r = device ? await run(c.env.DB, "UPDATE active_play SET seen_at = ? WHERE user_id = ? AND device = ?", Date.now(), c.get("playerId"), device) : null;
  return c.json({ held: !!r?.meta.changes });
});

play.post("/release", async (c) => {
  await releasePlay(c.env.DB, c.get("playerId"), deviceOf(c));
  return c.json({ ok: true });
});
