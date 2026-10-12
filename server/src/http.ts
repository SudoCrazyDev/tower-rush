/** Hono app types and small request/response helpers shared by the routes. */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface Bindings {
  DB: D1Database;
  /** PvP queue (one instance) and one room per match; see pvp.ts. */
  MATCHMAKER: DurableObjectNamespace<import("./pvp.ts").Matchmaker>;
  MATCH: DurableObjectNamespace<import("./pvp.ts").MatchRoom>;
  AUTH_LIMIT: RateLimit;
  ADMIN_LIMIT: RateLimit;
  ADMIN_USERNAME: string;
  /** Comma list of browser origins allowed by CORS and WebSocket upgrades (gate.ts). */
  ALLOWED_ORIGINS?: string;
  /** Oldest game version still served; older clients get 426 (gate.ts). */
  MIN_CLIENT?: string;
  /** Where non-API requests are redirected. */
  GAME_URL?: string;
  /** Set only by the local dev script: allows WebSockets without an Origin. */
  DEV?: string;
  /** Cloudflare Email Service: verification and password reset codes (email.ts). */
  EMAIL: SendEmail;
  /** Turnstile widget: public sitekey (sent to the game in /config), and the frontend hostnames its tokens may come from. */
  TURNSTILE_SITEKEY?: string;
  TURNSTILE_HOSTNAMES?: string;
  /** "1": accounts only through admin invites, no guests (staging; invites.ts). */
  INVITE_ONLY?: string;
  /** Secret, set with `wrangler secret put`. Redeems Turnstile tokens (turnstile.ts). */
  TURNSTILE_SECRET?: string;
  /** Secret, set with `wrangler secret put`. Creates the first admin when there is none. */
  ADMIN_PASSWORD?: string;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: { playerId: number; adminId: number; token: string };
}

export type Ctx = Context<AppEnv>;

/** Thrown from anywhere in a handler; becomes `{ error, ...extra }` with that status. */
export class HttpError extends Error {
  status: ContentfulStatusCode;
  extra: Record<string, unknown>;
  constructor(status: ContentfulStatusCode, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function fail(status: ContentfulStatusCode, message: string, extra?: Record<string, unknown>): never {
  throw new HttpError(status, message, extra);
}

/** The JSON body, or {} when there isn't one. */
export async function body(c: Ctx): Promise<Record<string, any>> {
  const b = await c.req.json().catch(() => ({}));
  return b && typeof b === "object" ? b : {};
}

/** Route param as a number (NaN when missing). */
export const numParam = (c: Ctx, name: string) => Number(c.req.param(name));

/** The caller's IP (Cloudflare sets this header on every request). */
export const clientIp = (c: Ctx) => c.req.header("cf-connecting-ip") ?? "local";

/** Route param as a string. */
export const param = (c: Ctx, name: string) => c.req.param(name) ?? "";
