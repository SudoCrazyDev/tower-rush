import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { db } from "./db.ts";

const SESSION_DAYS = { player: 365, admin: 7 };

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = scryptSync(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(expected, actual);
}

export function createSession(kind: "player" | "admin", subjectId: number) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  db.prepare("INSERT INTO sessions (token, kind, subject_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").run(
    token,
    kind,
    subjectId,
    now,
    now + SESSION_DAYS[kind] * 86400_000,
  );
  return token;
}

export function deleteSession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function deleteSessionsFor(kind: "player" | "admin", subjectId: number) {
  db.prepare("DELETE FROM sessions WHERE kind = ? AND subject_id = ?").run(kind, subjectId);
}

function bearer(req: Request) {
  const h = req.headers.authorization ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

function lookup(req: Request, kind: "player" | "admin") {
  const token = bearer(req);
  if (!token) return null;
  const row = db.prepare("SELECT subject_id, expires_at FROM sessions WHERE token = ? AND kind = ?").get(token, kind) as
    | { subject_id: number; expires_at: number }
    | undefined;
  if (!row || row.expires_at < Date.now()) return null;
  return { token, id: row.subject_id };
}

declare module "express-serve-static-core" {
  interface Request {
    playerId?: number;
    adminId?: number;
    token?: string;
  }
}

export function requirePlayer(req: Request, res: Response, next: NextFunction) {
  const s = lookup(req, "player");
  if (!s) return void res.status(401).json({ error: "Not signed in" });
  req.playerId = s.id;
  req.token = s.token;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const s = lookup(req, "admin");
  if (!s) return void res.status(401).json({ error: "Admin sign-in required" });
  req.adminId = s.id;
  req.token = s.token;
  next();
}

/** Very small in-memory limiter for sign-in endpoints: `max` attempts per window per IP. */
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "?";
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) hits.set(key, { n: 1, reset: now + windowMs });
    else if (++h.n > max) return void res.status(429).json({ error: "Too many attempts, try again in a few minutes" });
    next();
  };
}
