import type { Ctx } from "./http.ts";
import type { UserRow } from "./users.ts";

/**
 * Announce a new registered account in the Discord #new-recruits channel (DISCORD_SIGNUP_WEBHOOK).
 * Runs after the response, so a slow or failing Discord never holds up or breaks a sign-up.
 * No email or other private details go out: the channel is public.
 */
export function announceSignup(c: Ctx, u: UserRow) {
  const url = c.env.DISCORD_SIGNUP_WEBHOOK;
  if (!url) return;
  const name = (u.username ?? u.display_name).replace(/[\\*_~`|>@]/g, "\\$&");
  const post = fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `⚔️ A new recruit has joined the keep: **${name}**! Welcome to Crown & Keep 👑`,
      allowed_mentions: { parse: [] },
    }),
  })
    .then((r) => {
      if (!r.ok) console.warn(`discord signup webhook: ${r.status}`);
    })
    .catch((e) => console.warn("discord signup webhook failed", e));
  c.executionCtx.waitUntil(post);
}
