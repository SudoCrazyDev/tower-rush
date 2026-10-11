/**
 * Browser access rules for the API now that the game and admin panel live on other
 * origins: CORS, the WebSocket Origin check, and the client version gate (RELEASING.md).
 */
import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";
import { fail, type AppEnv, type Ctx } from "./http.ts";

const allowedOrigins = (env: { ALLOWED_ORIGINS?: string }) =>
  (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** CORS for /api/*. Preflights are answered here, before the version gate. */
export const corsMiddleware: MiddlewareHandler<AppEnv> = (c, next) =>
  cors({
    origin: (origin) => (allowedOrigins(c.env).includes(origin) ? origin : null),
    allowHeaders: ["Authorization", "X-Device", "X-Client-Version", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })(c, next);

/**
 * Browsers skip CORS for WebSockets, so the upgrade checks Origin itself. A missing Origin
 * (not a browser) is only allowed in local dev (DEV var, set by `npm run dev`).
 */
export function checkOrigin(c: Ctx) {
  const origin = c.req.header("origin");
  if (!origin) {
    if (c.env.DEV) return;
    fail(403, "Origin not allowed");
  }
  if (!allowedOrigins(c.env).includes(origin)) fail(403, "Origin not allowed");
}

/** "2.3.0" -> [2, 3, 0]; null when it isn't a plain dotted version. */
function parse(v: string | undefined): number[] | null {
  if (!v || !/^\d+(\.\d+){0,2}$/.test(v)) return null;
  const p = v.split(".").map(Number);
  while (p.length < 3) p.push(0);
  return p;
}

/** True when `version` is missing, unreadable, or below `min`. */
export function outdated(version: string | undefined, min: string) {
  const v = parse(version);
  const m = parse(min);
  if (!m) return false;
  if (!v) return true;
  for (let i = 0; i < 3; i++) if (v[i] !== m[i]) return v[i] < m[i];
  return false;
}

/**
 * Game requests must send X-Client-Version (WebSockets: `v=` in the query) at or above
 * MIN_CLIENT, else 426. A missing header counts as outdated, so old clients are forced to
 * update. Exempt: /api/admin (the admin panel has its own version) and CORS preflights.
 */
export const versionGate: MiddlewareHandler<AppEnv> = async (c, next) => {
  const path = c.req.path;
  if (c.req.method === "OPTIONS" || path.startsWith("/api/admin")) return next();
  const min = c.env.MIN_CLIENT;
  if (min && outdated(c.req.header("x-client-version") ?? c.req.query("v"), min)) {
    return c.json({ error: "Update required", minClient: min }, 426);
  }
  return next();
};
