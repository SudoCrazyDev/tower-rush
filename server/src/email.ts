/**
 * Player email: 6-digit codes (verify an address, reset a password) and the branded
 * messages that carry them, sent with Cloudflare Email Service (the EMAIL binding).
 * `wrangler dev` only simulates sending: the message is printed in the dev console.
 */
import { one, run } from "./db.ts";
import type { Bindings } from "./http.ts";

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
export const normEmail = (s: unknown) => String(s ?? "").trim().toLowerCase();
export const validEmail = (s: string) => s.length <= 254 && EMAIL_RE.test(s);

export type CodePurpose = "verify" | "reset";

/** How long a code works, how often one can be re-sent, and how many wrong tries it takes. */
export const CODE_MINUTES = 15;
const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const FROM = { email: "noreply@crownnkeep.com", name: "Crown & Keep" };
const ASSETS = "https://assets.crownnkeep.com";
const GAME = "https://game.crownnkeep.com";

async function sha256(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

const hashCode = (userId: number, purpose: CodePurpose, code: string) => sha256(`${userId}:${purpose}:${code}`);

/** A fresh code for this player and purpose, replacing any earlier one. Null if one was sent under a minute ago. */
export async function newCode(db: D1Database, userId: number, purpose: CodePurpose, email: string) {
  const now = Date.now();
  const prev = await one<{ created_at: number }>(db, "SELECT created_at FROM email_codes WHERE user_id = ? AND purpose = ?", userId, purpose);
  if (prev && now - prev.created_at < RESEND_SECONDS * 1000) return null;
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  await run(
    db,
    "INSERT OR REPLACE INTO email_codes (user_id, purpose, code_hash, email, attempts, created_at, expires_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
    userId,
    purpose,
    await hashCode(userId, purpose, code),
    email,
    now,
    now + CODE_MINUTES * 60_000,
  );
  return code;
}

/**
 * Check a typed code. A right code is used up and returns the address it was sent to;
 * a wrong one counts an attempt, and the code dies after MAX_ATTEMPTS or when it expires.
 */
export async function useCode(db: D1Database, userId: number, purpose: CodePurpose, code: unknown) {
  const row = await one<{ code_hash: string; email: string; attempts: number; expires_at: number }>(
    db,
    "SELECT code_hash, email, attempts, expires_at FROM email_codes WHERE user_id = ? AND purpose = ?",
    userId,
    purpose,
  );
  if (!row || row.expires_at < Date.now() || row.attempts >= MAX_ATTEMPTS) return { ok: false as const, reason: "expired" as const };
  const typed = String(code ?? "").replace(/\D/g, "");
  if (typed.length !== 6 || (await hashCode(userId, purpose, typed)) !== row.code_hash) {
    await run(db, "UPDATE email_codes SET attempts = attempts + 1 WHERE user_id = ? AND purpose = ?", userId, purpose);
    return { ok: false as const, reason: row.attempts + 1 >= MAX_ATTEMPTS ? ("expired" as const) : ("wrong" as const) };
  }
  await run(db, "DELETE FROM email_codes WHERE user_id = ? AND purpose = ?", userId, purpose);
  return { ok: true as const, email: row.email };
}

// ---------------------------------------------------------------- messages

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * The shared email layout: logo on the night-blue backdrop, a gold-framed card like the
 * game's panels, the code in big digits, and a short footer. Tables and inline styles only,
 * so it renders the same in Gmail, Outlook and phone mail apps.
 */
function layout(o: { preheader: string; title: string; intro: string; code: string; outro: string }) {
  const digits = o.code
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 3px"><div style="width:44px;height:58px;line-height:58px;background:#ffffff;border:3px solid #14183a;border-radius:10px;font:bold 32px 'Arial Black',Arial,sans-serif;color:#14183a;text-align:center">${d}</div></td>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#0b0f2e">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f2e;background-image:linear-gradient(#141a4a,#0b0f2e)">
<tr><td align="center" style="padding:28px 12px 36px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    <tr><td align="center" style="padding:0 0 18px">
      <a href="${GAME}"><img src="${ASSETS}/email/logo.png" width="240" alt="Crown &amp; Keep" style="display:block;width:240px;max-width:70%;height:auto;border:0"></a>
    </td></tr>
    <tr><td style="background:#1b2257;border:5px solid #f2b630;border-radius:22px;padding:28px 26px 26px;text-align:center">
      <h1 style="margin:0 0 10px;font:normal 28px 'Arial Black',Arial,sans-serif;color:#fff4c2;text-shadow:0 3px 0 #14183a">${esc(o.title)}</h1>
      <p style="margin:0 0 22px;font:16px/1.5 Arial,Helvetica,sans-serif;color:#c9d2ff">${esc(o.intro)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 22px"><tr>${digits}</tr></table>
      <p style="margin:0 0 6px;font:14px/1.5 Arial,Helvetica,sans-serif;color:#ffd27a">This code expires in ${CODE_MINUTES} minutes.</p>
      <p style="margin:0;font:14px/1.5 Arial,Helvetica,sans-serif;color:#9aa3d8">${esc(o.outro)}</p>
    </td></tr>
    <tr><td align="center" style="padding:20px 10px 0;font:12px/1.6 Arial,Helvetica,sans-serif;color:#6f78b0">
      You got this email because of your Crown &amp; Keep account.<br>
      <a href="${GAME}" style="color:#9fd0ff">Play Crown &amp; Keep</a> &nbsp;·&nbsp; <a href="https://crownnkeep.com" style="color:#9fd0ff">crownnkeep.com</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const text = (o: { title: string; intro: string; code: string; outro: string }) =>
  `${o.title}\n\n${o.intro}\n\n    ${o.code}\n\nThis code expires in ${CODE_MINUTES} minutes.\n${o.outro}\n\nCrown & Keep - ${GAME}\n`;

const MESSAGES: Record<CodePurpose, (name: string) => { subject: string; title: string; intro: string; outro: string }> = {
  verify: (name) => ({
    subject: "Confirm your Crown & Keep email",
    title: "Confirm your email",
    intro: `Hi ${name}! Enter this code in the game to confirm this email address for your account.`,
    outro: "Didn't create a Crown & Keep account? You can ignore this email.",
  }),
  reset: (name) => ({
    subject: "Your Crown & Keep password reset code",
    title: "Reset your password",
    intro: `Hi ${name}! Enter this code in the game to choose a new password.`,
    outro: "Didn't ask for this? Ignore this email; your password stays the same.",
  }),
};

/** Mail a code. Failures are logged, not thrown: the caller's response never depends on delivery. */
export async function sendCode(env: Bindings, to: string, name: string, purpose: CodePurpose, code: string) {
  const m = MESSAGES[purpose](name);
  const parts = { ...m, code, preheader: `Your code is ${code}` };
  try {
    await env.EMAIL.send({ from: FROM, to, subject: m.subject, html: layout(parts), text: text(parts) });
  } catch (e) {
    const err = e as Error & { code?: string };
    console.error("email send failed", purpose, err.code, err.message);
  }
}
