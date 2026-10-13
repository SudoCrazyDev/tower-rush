/** Installable app: registers the service worker (production builds only) and keeps the browser's install prompt. */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** Calls `cb` when the browser offers to install the game later on; returns the unsubscribe. */
export function onInstallable(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

/** Opened from an "Install app" link (`?install`, e.g. on crownnkeep.com): offer the install once in. */
export const installAsked = () => new URLSearchParams(location.search).has("install");

/** Running as an installed app (home screen / app window) rather than in a browser tab. */
export const isInstalled = () =>
  matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** iPhone/iPad Safari has no install prompt; players add the game from the Share menu. */
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** The browser offered to install the game (Chrome, Edge, Samsung Internet). */
export const canInstall = () => deferred !== null;

/** Shows the browser's install dialog; true when the player accepted. */
export async function install() {
  const e = deferred;
  if (!e) return false;
  deferred = null; // a prompt event works once
  await e.prompt();
  return (await e.userChoice).outcome === "accepted";
}

export function initPwa() {
  addEventListener("beforeinstallprompt", (e) => {
    // Keep it for the Settings button instead of the browser's own banner over the game.
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((cb) => cb());
  });
  addEventListener("appinstalled", () => (deferred = null));
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
}
