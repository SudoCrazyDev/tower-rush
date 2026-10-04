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
import { W, H } from "./ui";
import { RES } from "./display";
import { setOnBanned, setToken } from "./api";
import { showBlocker } from "./authOverlay";
import { BASE } from "./assets";

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
    render: { antialias: true, roundPixels: false },
    // ?timer drives the loop with setTimeout, for testing in background tabs.
    fps: { target: 60, forceSetTimeOut: new URLSearchParams(location.search).has("timer") },
    scene: [BootScene, LobbyScene, DeckScene, ShopScene, HeroScene, LeaderboardScene, BattleScene, PvpMenuScene, PvpScene],
  });
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
}

start();
