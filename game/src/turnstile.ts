/**
 * Cloudflare Turnstile bot check for the sign-in forms. The widget stays invisible unless
 * Cloudflare wants the player to click it; its token is sent with the request and the
 * server redeems it. Tokens are single-use, so call reset() after every attempt.
 */
import { turnstileSiteKey } from "./save";

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let script: Promise<TurnstileApi> | null = null;
function load() {
  script ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Security check failed to load")));
    s.onerror = () => {
      script = null;
      reject(new Error("Security check failed to load, check your connection"));
    };
    document.head.appendChild(s);
  });
  return script;
}

export interface HumanCheck {
  /** The current token, waiting for the check to finish if needed. */
  token(): Promise<string>;
  reset(): void;
}

/** `hint` shows (or, with "", clears) a line asking the player to tick the box when Cloudflare wants a click. */
export function mountTurnstile(el: HTMLElement, action: "login" | "register" | "forgot", hint: (msg: string) => void = () => {}): HumanCheck {
  const sitekey = turnstileSiteKey;
  // No sitekey: the server isn't checking either (it would refuse with a clear error if it were).
  if (!sitekey) return { token: async () => "", reset() {} };
  let token = "";
  let failed: string | null = null;
  let needsClick = false;
  let waiters: { ok: (t: string) => void; fail: (e: Error) => void }[] = [];
  let id: string | undefined;
  let api: TurnstileApi | undefined;
  const settle = () => {
    for (const w of waiters.splice(0)) failed ? w.fail(new Error(failed)) : w.ok(token);
  };
  const ready = load().then((t) => {
    api = t;
    id = t.render(el, {
      sitekey,
      action,
      theme: "dark",
      appearance: "interaction-only",
      callback: (t: string) => {
        token = t;
        failed = null;
        if (needsClick) hint("");
        settle();
      },
      "before-interactive-callback": () => {
        needsClick = true;
        hint("Tick the box above to continue.");
      },
      "expired-callback": () => (token = ""),
      "error-callback": () => {
        failed = "Security check failed, please try again";
        settle();
        return true;
      },
    });
  });
  return {
    async token() {
      await ready;
      if (token) return token;
      if (failed) throw new Error(failed);
      if (needsClick) hint("Tick the box above to continue.");
      // Waits for the player's tick as long as it takes; an invisible check that hangs gives up after 30 s.
      return new Promise<string>((ok, fail) => {
        waiters.push({ ok, fail });
        setTimeout(() => {
          if (needsClick || !waiters.some((w) => w.ok === ok)) return;
          waiters = waiters.filter((w) => w.ok !== ok);
          fail(new Error("Security check is taking too long, please try again"));
        }, 30_000);
      });
    },
    reset() {
      token = "";
      failed = null;
      if (api && id !== undefined) api.reset(id);
    },
  };
}
