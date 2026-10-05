import Phaser from "phaser";
import { BASE, loadImages, setAssetIndex, type AssetIndex } from "../assets";
import { W, H, txt, NAVY } from "../ui";
import { ApiError, getToken, setToken } from "../api";
import { loadConfig, loadMe } from "../save";
import { showAuth, showBlocker } from "../authOverlay";
import { unlockAudio } from "../audio";
import { ambientVideo, coverFit } from "../backdrop";
import { ELEMENTS } from "../data/units";

/** Loads the index, then every image the menus need (battle sheets load per battle). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Always fetch a fresh index: a cached one from before an art upload hides the new art.
    this.load.json("index", `${BASE}index.json?cors&t=${Date.now()}`);
    this.load.image("loc:loading_keyart", `${BASE}locations/loading_keyart.webp`);
    this.load.image("ui:logo", `${BASE}ui/logo.webp`);
  }

  create() {
    const index = this.cache.json.get("index") as AssetIndex;
    setAssetIndex(index);

    const bg = this.add.image(W / 2, H / 2, "loc:loading_keyart");
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    // The trailer animates the key art, then fades back to the still (its first frame).
    const trailer = ambientVideo(this, "trailer", coverFit(W, H), false);
    trailer?.once(Phaser.GameObjects.Events.VIDEO_COMPLETE, () => this.tweens.add({ targets: trailer, alpha: 0, duration: 900 }));
    this.add.image(W / 2, 330, "ui:logo").setScale(0.95);
    const barW = 520;
    const bar = this.add.graphics();
    const label = txt(this, W / 2, H - 200, "Loading...", 34);
    const draw = (p: number) => {
      bar.clear();
      bar.fillStyle(NAVY, 0.85).fillRoundedRect(W / 2 - barW / 2 - 6, H - 156, barW + 12, 44, 22);
      bar.fillStyle(0x59d64a, 1).fillRoundedRect(W / 2 - barW / 2, H - 150, Math.max(32, barW * p), 32, 16);
    };
    draw(0);
    this.load.on("progress", draw);
    // Download art while connecting/signing in; play once both are done.
    const loaded = new Promise<void>((r) => this.load.once("complete", () => r()));
    this.queueAssets(index);
    Promise.all([this.connect(), loaded]).then(() => {
      label.setText("Tap to play");
      this.tweens.add({ targets: label, scale: 1.08, yoyo: true, repeat: -1, duration: 600 });
      this.input.once("pointerdown", () => {
        // First tap doubles as the user gesture browsers require before playing audio.
        unlockAudio();
        this.scene.start("Lobby");
      });
    });
  }

  /** Fetch the live game config and make sure the player is signed in. */
  private async connect() {
    for (;;) {
      try {
        await loadConfig();
        if (getToken()) {
          try {
            await loadMe();
            return;
          } catch (e) {
            if (!(e instanceof ApiError && e.status === 401)) throw e;
            setToken(null);
          }
        }
        await showAuth();
        return;
      } catch (e) {
        // Banned accounts get their own screen (see main.ts) and stop here.
        if (e instanceof ApiError && e.data.error === "banned") return new Promise<never>(() => {});
        await new Promise<void>((retry) =>
          showBlocker("Can't reach the server", "Check your connection and try again.", { label: "RETRY", onClick: retry }),
        );
      }
    }
  }

  private queueAssets(index: AssetIndex) {
    loadImages(this, "ui", "ui", index.ui);
    loadImages(this, "item", "items", index.items);
    loadImages(this, "card", "cards", index.cards);
    loadImages(this, "portrait", "portraits", index.portraits);
    loadImages(this, "unit", "units", index.units);
    loadImages(this, "hero_portrait", "portraits_heroes", index.portraits_heroes);
    loadImages(this, "portrait_awakened", "portraits_awakened", index.portraits_awakened);
    loadImages(this, "stat", "stats", index.stats);
    loadImages(this, "vfx", "vfx", index.vfx);
    loadImages(this, "loc", "locations", ["lobby_portrait", "lobby_landscape", "shop_background", "deck_room_background", "chest_vault_background", "world_map"]);
    for (let i = 0; i < index.atlas.buttons; i++) this.load.image(`button:${i}`, `${BASE}ui/button_${i}.webp`);
    for (let i = 0; i < index.atlas.icons; i++) this.load.image(`icon:${i}`, `${BASE}ui/icon_${i}.webp`);
    for (let i = 0; i < (index.atlas.leagues ?? 0); i++) this.load.image(`league:${i}`, `${BASE}ui/league_${i}.webp`);
    for (const e of ELEMENTS) this.load.image(`element:${e}`, `${BASE}ui/element_${e}.webp`);

    this.load.start();
  }
}
