import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { DeckScene } from "./scenes/DeckScene";
import { ShopScene } from "./scenes/ShopScene";
import { HeroScene } from "./scenes/HeroScene";
import { LeaderboardScene } from "./scenes/LeaderboardScene";
import { BattleScene } from "./scenes/BattleScene";
import { PvpMenuScene } from "./scenes/PvpMenuScene";
import { PvpScene } from "./scenes/PvpScene";
import { StoryScene } from "./scenes/StoryScene";
import { LabScene } from "./scenes/LabScene";
import { W, H, WIDE, ARENA_W, setWidth } from "./ui";
import { RES } from "./display";
import { setOnBanned, setOnOutdated, setToken } from "./api";
import { showBlocker } from "./authOverlay";
import { BASE } from "./assets";
import { initPwa } from "./pwa";
import { fpsMeter, fpsMeterWanted } from "./fpsMeter";

initPwa();

// Art from the R2 bucket loads with CORS. A browser that once fetched the same URL without
// CORS (a plain <img>, or before the bucket always sent the header) keeps that copy for a
// day, and the CORS load of it fails as a green "missing" box. A query of our own gives
// these loads their own cache entries.
if (/^https?:/.test(BASE)) {
  const load = Phaser.Loader.File.prototype.load;
  Phaser.Loader.File.prototype.load = function (this: Phaser.Loader.File) {
    if (typeof this.url === "string" && this.url.startsWith(BASE) && !this.url.includes("?")) this.url += "?cors";
    return load.call(this);
  };
}

setOnBanned((reason) =>
  showBlocker("Account banned", reason ? `Reason: ${reason}` : "This account has been suspended.", {
    label: "SIGN OUT",
    onClick: () => {
      setToken(null);
      location.reload();
    },
  }),
);

/** Reload with a cache-busting query; at most once per 30 s so a stale cache can't loop. */
function updateNow() {
  const KEY = "tower-rush-update-at";
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    // Storage blocked: no guard possible beyond the player's own click.
  }
  if (Date.now() - last < 30_000) return outdated("Still loading the new version. Wait a few seconds, then try again.");
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // As above.
  }
  const url = new URL(location.href);
  url.searchParams.set("update", String(Date.now()));
  location.replace(url.toString());
}

function outdated(message = "Crown & Keep has been updated. Reload to get the latest version.") {
  showBlocker("New version available", message, { label: "UPDATE", onClick: updateNow });
}
setOnOutdated(() => outdated());

async function start() {
  // Make sure the display font is ready before any text is rasterised.
  try {
    await Promise.race([document.fonts.load("32px 'Lilita One'"), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    // Fall back to the system font.
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W * RES,
    height: H * RES,
    backgroundColor: "#0d1030",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    // Production art comes from another origin (the R2 bucket), which allows it with CORS.
    loader: { crossOrigin: "anonymous" },
    // 2.9.2: Phaser's Mobile Pipeline batches one texture at a time, so on phones every card
    // frame, portrait and label was its own draw call (~550 a frame on Deck vs ~56 batched).
    // `?mobilepipe` turns it back on for comparison.
    render: { antialias: true, roundPixels: false, autoMobilePipeline: new URLSearchParams(location.search).has("mobilepipe") },
    // ?timer drives the loop with setTimeout, for testing in background tabs. v2.8.1: limit 60, so
    // 90/120 Hz phones don't draw (and heat up) at twice the frame rate.
    // 2.9.2: limit 62, not 60. Phaser skips a frame whenever the smoothed rAF delta falls a hair
    // under 1000/limit, so at exactly 60 a 60 Hz phone dropped about every other frame
    // (30-40 fps with uneven pacing: laggy scrolling). 62 keeps 60 Hz at a steady 60 and still
    // halves 90/120 Hz screens to an even 45/60.
    fps: { target: 60, limit: 62, forceSetTimeOut: new URLSearchParams(location.search).has("timer") },
    scene: [BootScene, LobbyScene, DeckScene, ShopScene, HeroScene, LeaderboardScene, BattleScene, PvpMenuScene, PvpScene, StoryScene, LabScene],
  });
  if (!WIDE && W > ARENA_W) {
    // Phones wider than the 752 layout: menus fill the screen's width, while battles keep the
    // arena's own width (their HUD is laid out for it) and letterbox as before.
    const menuW = W;
    const fit = (s: Phaser.Scene) => {
      const w = s.scene.key === "Battle" || s.scene.key === "Pvp" ? ARENA_W : menuW;
      if (game.scale.width === w) return;
      setWidth(w);
      game.scale.setGameSize(w, H);
    };
    const watch = () => game.scene.scenes.forEach((s) => s.events.on(Phaser.Scenes.Events.START, () => fit(s)));
    if (game.scene.isBooted) watch();
    else game.events.once(Phaser.Core.Events.READY, watch);
  }
  if (RES !== 1) {
    // The canvas is RES times the game size: every scene's camera zooms from the top-left
    // corner, so scenes keep working in W x H game coordinates (HUD objects included).
    const hiRes = (s: Phaser.Scene) => s.cameras.main?.setOrigin(0).setZoom(RES);
    const install = () => {
      for (const s of game.scene.scenes) {
        s.events.on(Phaser.Scenes.Events.START, () => hiRes(s));
        hiRes(s); // scenes already starting (Boot is usually mid-preload by now)
      }
    };
    // The game may already be up (it boots synchronously once the page has loaded).
    if (game.scene.isBooted) install();
    else game.events.once(Phaser.Core.Events.READY, install);
  }
  // Handy for poking at state from the dev console.
  if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
  if (fpsMeterWanted()) fpsMeter(game);
}

start();
