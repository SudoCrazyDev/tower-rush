/**
 * Cloudflare Turnstile (bot check) for sign-in, registration and password reset requests.
 * The game renders the widget with TURNSTILE_SITEKEY (sent in /config) and posts its token
 * as `turnstile`; here it's redeemed once at siteverify. Fails closed.
 */
import { clientIp, fail, type Ctx } from "./http.ts";

export type TurnstileAction = "login" | "register" | "forgot";

export async function requireHuman(c: Ctx, token: unknown, action: TurnstileAction) {
  const secret = c.env.TURNSTILE_SECRET;
  const hostnames = new Set(
    (c.env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
  );
  // Local dev uses Cloudflare's always-pass test keys, whose answers carry no real action or hostname.
  const dev = !!c.env.DEV;
  if (!secret || (!hostnames.size && !dev)) {
    console.error("turnstile not configured");
    fail(503, "Sign-in is briefly unavailable, try again soon");
  }
  if (typeof token !== "string" || !token || token.length > 2048) fail(403, "Please complete the security check", { turnstile: true });

  let result: { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(c) }),
    });
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    result = await r.json();
  } catch (e) {
    console.error("turnstile siteverify failed", (e as Error).message);
    fail(403, "Security check failed, please try again", { turnstile: true });
  }
  if (!result.success || (!dev && (result.action !== action || !hostnames.has(result.hostname ?? "")))) {
    fail(403, "Security check failed, please try again", { turnstile: true });
  }
}
