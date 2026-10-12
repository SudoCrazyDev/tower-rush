/**
 * Invitations: the admin panel mails a link with a one-time token. With INVITE_ONLY set
 * (staging), an invite is the only way to create an account. Only the token's hash is stored.
 */
import { one, run } from "./db.ts";
import type { Bindings } from "./http.ts";

/** How long an invite link works. */
export const INVITE_DAYS = 7;

export interface InviteRow {
  id: number;
  email: string;
  expires_at: number;
  used_at: number | null;
  revoked_at: number | null;
}

export const inviteOnly = (env: Bindings) => env.INVITE_ONLY === "1";

async function sha256(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A new random token (sent in the link) and its hash (stored). */
export async function newInviteToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { token, hash: await sha256(token) };
}

export const inviteUrl = (env: Bindings, token: string) => {
  const u = new URL(env.GAME_URL || "https://game.crownnkeep.com/");
  u.searchParams.set("invite", token);
  return u.toString();
};

/** The pending invite for this token, or why it can't be used. */
export async function findInvite(db: D1Database, token: unknown) {
  if (typeof token !== "string" || !token || token.length > 100) return { ok: false as const, error: "That invite link isn't valid" };
  const row = await one<InviteRow>(db, "SELECT id, email, expires_at, used_at, revoked_at FROM invites WHERE token_hash = ?", await sha256(token));
  if (!row || row.revoked_at) return { ok: false as const, error: "That invite link isn't valid" };
  if (row.used_at) return { ok: false as const, error: "That invite was already used. Sign in instead" };
  if (row.expires_at < Date.now()) return { ok: false as const, error: "That invite has expired. Ask for a new one" };
  return { ok: true as const, invite: row };
}

/** Mark an invite used by this player. False if someone else claimed it first. */
export async function claimInvite(db: D1Database, id: number, userId: number) {
  const r = await run(
    db,
    "UPDATE invites SET used_at = ?, user_id = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL",
    Date.now(),
    userId,
    id,
  );
  return r.meta.changes > 0;
}
