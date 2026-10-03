import type { Next } from "hono";
import { one, run } from "./db.ts";
import { clientIp, fail, type Ctx } from "./http.ts";

const SESSION_DAYS = { player: 365, admin: 7 };

// ---------------------------------------------------------------- passwords

/**
 * PBKDF2-SHA256 (Web Crypto). The iteration count is stored in each hash, so it can be
 * raised later: logins with an older count get re-hashed (see `needsRehash`). 50k keeps a
 * sign-in inside the Workers Free plan's CPU budget; on the Paid plan raise it to 100k (the
 * most Workers allows).
 */
const ITERATIONS = 50_000;

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, iter, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !salt || !hash) return false;
  const expected = unb64(hash);
  const actual = await derive(password, unb64(salt), Number(iter));
  // Constant time compare.
  let diff = expected.length ^ actual.length;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
  return diff === 0;
}

export const needsRehash = (stored: string) => Number(stored.split("$")[1]) !== ITERATIONS;

// ---------------------------------------------------------------- sessions

export async function createSession(db: D1Database, kind: "player" | "admin", subjectId: number) {
  const token = b64(randomBytes(32)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const now = Date.now();
  await run(
    db,
    "INSERT INTO sessions (token, kind, subject_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    token,
    kind,
    subjectId,
    now,
    now + SESSION_DAYS[kind] * 86400_000,
  );
  return token;
}

export const deleteSession = (db: D1Database, token: string) => run(db, "DELETE FROM sessions WHERE token = ?", token);

export const deleteSessionsFor = (db: D1Database, kind: "player" | "admin", subjectId: number) =>
  run(db, "DELETE FROM sessions WHERE kind = ? AND subject_id = ?", kind, subjectId);

export function bearer(c: Ctx) {
  const h = c.req.header("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

/** The signed-in player or admin id for the request's token, if it's valid. */
export async function sessionFor(c: Ctx, kind: "player" | "admin") {
  const token = bearer(c);
  if (!token) return null;
  const row = await one<{ subject_id: number; expires_at: number }>(
    c.env.DB,
    "SELECT subject_id, expires_at FROM sessions WHERE token = ? AND kind = ?",
    token,
    kind,
  );
  if (!row || row.expires_at < Date.now()) return null;
  return { token, id: row.subject_id };
}

export async function requirePlayer(c: Ctx, next: Next) {
  const s = await sessionFor(c, "player");
  if (!s) fail(401, "Not signed in");
  c.set("playerId", s.id);
  c.set("token", s.token);
  await next();
}

export async function requireAdmin(c: Ctx, next: Next) {
  const s = await sessionFor(c, "admin");
  if (!s) fail(401, "Admin sign-in required");
  c.set("adminId", s.id);
  c.set("token", s.token);
  await next();
}

/** Sign-in endpoints: a few attempts per IP per minute (Workers rate limiting binding). */
export const rateLimit = (which: "AUTH_LIMIT" | "ADMIN_LIMIT") => async (c: Ctx, next: Next) => {
  const { success } = await c.env[which].limit({ key: clientIp(c) });
  if (!success) fail(429, "Too many attempts, try again in a minute");
  await next();
};
