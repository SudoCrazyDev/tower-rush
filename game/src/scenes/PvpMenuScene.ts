import Phaser from "phaser";
import { BASE } from "../assets";
import { music, sfx } from "../audio";
import { W, H, WIDE, txt, button, iconButton, modal, NAVY, toast, fmt, pressable } from "../ui";
import { profile } from "../save";
import { joinQueue, MatchConn, type Search } from "../pvpnet";
import { askCode } from "../codePrompt";
import { rankedModal, tierBadge } from "./ranked";
import { claimPlay, onPlayLost, releasePlay } from "../play";
import { CHALLENGE_RULES, PVP, PVP_MODES, PVP_MODE_INFO, tierFor, type PvpMode, type ServerMsg } from "../../../shared/pvp.ts";

const MODE_COLOR: Record<PvpMode, "yellow" | "blue" | "green"> = { ranked: "yellow", mirror: "blue", casual: "green" };

/**
 * PvP: pick Ranked, Mirror or Casual and search for an opponent (a bot after a few seconds),
 * or play a friend: open a challenge and share its code, or join one with a friend's code.
 * VS BOT starts a practice match against a bot straight away (no rewards).
 */
export class PvpMenuScene extends Phaser.Scene {
  private leave: (() => void) | null = null;
  /** Waiting to hear whether PvP can start here. */
  private claiming = false;

  constructor() {
    super("PvpMenu");
  }

  preload() {
    if (!this.textures.exists("loc:pvp_versus_background")) this.load.image("loc:pvp_versus_background", `${BASE}locations/pvp_versus_background.webp`);
  }

  create() {
    music("lobby");
    this.leave = null;
    this.claiming = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // Still searching (not heading into a match): give up the queue and the play slot.
      if (!this.leave) return;
      this.leave();
      onPlayLost(null);
      releasePlay();
    });
    const bg = this.add.image(W / 2, H / 2, "loc:pvp_versus_background");
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45);
    iconButton(this, 60, 60, "back", 80, () => this.scene.start("Lobby"));
    txt(this, W / 2, WIDE ? 110 : 150, "PVP", WIDE ? 96 : 84, "#ffd93b");
    txt(this, W / 2, WIDE ? 190 : 230, "Same waves for both. Spend mana to send monsters to your opponent.", WIDE ? 28 : 22, "#fff4c2").setWordWrapWidth(W - 80);
    this.modeCards();
  }

  private modeCards() {
    PVP_MODES.forEach((mode, i) => {
      const info = PVP_MODE_INFO[mode];
      const [x, y] = WIDE ? [W / 2 + (i - 1) * 520, H / 2 + 60] : [W / 2, 470 + i * 330];
      const [w, h] = WIDE ? [480, 600] : [640, 290];
      const g = this.add.graphics();
      g.fillStyle(NAVY, 0.88).fillRoundedRect(-w / 2, -h / 2, w, h, 32);
      g.lineStyle(6, 0xf2b630, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 32);
      const parts: Phaser.GameObjects.GameObject[] = [g];
      parts.push(txt(this, 0, -h / 2 + 56, info.name.toUpperCase(), WIDE ? 56 : 48, "#ffd27a"));
      parts.push(txt(this, 0, WIDE ? -60 : -30, info.text, WIDE ? 28 : 24, "#ffffff").setWordWrapWidth(w - 60));
      const tier = tierFor(profile.ranked.rating);
      const extra =
        mode === "ranked" ? `${tier.name}  ·  Rating ${fmt(profile.ranked.rating)}` : mode === "mirror" ? `All cards at level ${PVP.rules.mirrorLevel}` : "Practice without risk";
      parts.push(txt(this, 0, WIDE ? 40 : 30, extra, WIDE ? 24 : 22, mode === "ranked" ? tier.color : "#c9d2ff"));
      if (mode === "ranked") {
        // Tier badge: opens the ranked ladder.
        const badge = tierBadge(this, w / 2 - 56, -h / 2 + 56, 72, tier);
        pressable(badge, () => rankedModal(this));
        parts.push(badge);
      }
      parts.push(button(this, 0, h / 2 - (WIDE ? 90 : 62), WIDE ? 340 : 300, WIDE ? 110 : 86, "PLAY", MODE_COLOR[mode], () => this.search({ mode })));
      this.add.container(x, y, parts);
    });
    if (!WIDE) txt(this, W / 2, H - 60, `Trophies: ${fmt(profile.trophies)}  ·  Ranked rating: ${fmt(profile.ranked.rating)}`, 30, "#ffd93b");
    // Friends: no trophies either way. Practice: no rewards at all.
    const y = WIDE ? 1215 : 1335;
    const gap = WIDE ? 450 : 172;
    const bw = WIDE ? 400 : 330;
    const bh = WIDE ? 110 : 96;
    const fs = WIDE ? 34 : 28;
    button(this, W / 2 - gap, y, bw, bh, "CHALLENGE A FRIEND", "blue", () => this.pickChallenge(), fs);
    button(this, WIDE ? W / 2 : W / 2 + gap, y, bw, bh, "JOIN WITH CODE", "grey", async () => {
      const code = await askCode();
      if (code && this.sys.isActive()) this.search({ join: code });
    }, fs);
    button(this, WIDE ? W / 2 + gap : W / 2, WIDE ? y : 1455, bw, bh, "VS BOT", "green", () => this.pickBot(), fs);
  }

  /** Choose the rules for a friend challenge. */
  private pickChallenge() {
    const m = modal(this, 620, 720, "CHALLENGE A FRIEND", () => {});
    m.add(txt(this, m.cx, m.cy - 195, "Friendly match: no trophies won or lost.", 24, "#c9d2ff"));
    PVP_MODES.forEach((mode, i) => {
      const y = m.cy - 95 + i * 150;
      m.add(button(this, m.cx, y, 440, 96, mode === "ranked" ? "REAL LEVELS" : PVP_MODE_INFO[mode].name.toUpperCase(), MODE_COLOR[mode], () => {
        m.close();
        this.search({ challenge: mode });
      }, 36));
      m.add(txt(this, m.cx, y + 64, CHALLENGE_RULES[mode], 22, "#ffffff"));
    });
  }

  /** Choose the rules for a practice match against a bot. */
  private pickBot() {
    const m = modal(this, 620, 720, "VS BOT", () => {});
    m.add(txt(this, m.cx, m.cy - 195, "Practice: no gold, trophies or quests.", 24, "#c9d2ff"));
    PVP_MODES.forEach((mode, i) => {
      const y = m.cy - 95 + i * 150;
      m.add(button(this, m.cx, y, 440, 96, mode === "ranked" ? "REAL LEVELS" : PVP_MODE_INFO[mode].name.toUpperCase(), MODE_COLOR[mode], () => {
        m.close();
        this.search({ bot: mode });
      }, 36));
      m.add(txt(this, m.cx, y + 64, CHALLENGE_RULES[mode], 22, "#ffffff"));
    });
  }

  /** Search, unless another device is playing and the player keeps it there. */
  private async search(search: Search) {
    if (this.claiming || this.leave) return;
    this.claiming = true;
    const ok = await claimPlay("pvp");
    this.claiming = false;
    if (ok && this.sys.isActive()) this.searching(search);
    else if (ok) releasePlay();
  }

  /** Searching overlay; leaves the queue (or closes the challenge) when cancelled or when the scene changes. */
  private searching(search: Search) {
    const heading =
      "mode" in search
        ? PVP_MODE_INFO[search.mode].name.toUpperCase()
        : "bot" in search
          ? "VS BOT"
          : "challenge" in search
            ? "FRIEND CHALLENGE"
            : `JOINING ${search.join}`;
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88).setInteractive().setDepth(100);
    const title = txt(this, W / 2, H / 2 - 160, heading, 56, "#ffd27a").setDepth(101);
    const status = txt(this, W / 2, H / 2 - 60, "join" in search || "bot" in search ? "Connecting..." : "challenge" in search ? "Opening a challenge..." : "Searching for an opponent...", 34).setDepth(101);
    const timer = txt(this, W / 2, H / 2 + 10, "0:00", 44, "#c9d2ff").setDepth(101);
    const ring = this.add.graphics().setDepth(101).setPosition(W / 2, H / 2 + 130);
    ring.lineStyle(10, 0xffd93b, 1).beginPath().arc(0, 0, 44, 0, Math.PI * 1.4).strokePath();
    this.tweens.add({ targets: ring, angle: 360, repeat: -1, duration: 900 });
    const started = Date.now();
    /** A challenge counts down to its expiry instead of up. */
    let expiresAt = 0;
    const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const tick = this.time.addEvent({ delay: 250, loop: true, callback: () => {
      if (expiresAt) timer.setText(`Expires in ${clock(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))}`);
      else timer.setText(clock(Math.floor((Date.now() - started) / 1000)));
    } });
    const parts: Phaser.GameObjects.GameObject[] = [shade, title, status, timer, ring];
    const close = () => {
      tick.remove();
      parts.forEach((p) => p.destroy());
      onPlayLost(null);
      releasePlay();
    };
    const cancel = button(this, W / 2, H / 2 + 300, 320, 96, "CANCEL", "red", () => {
      this.leave?.();
      this.leave = null;
      close();
    }).setDepth(101);
    // Another device started playing: stop searching here.
    onPlayLost(() => {
      if (!this.leave || !this.sys.isActive()) return;
      this.leave();
      this.leave = null;
      close();
      toast(this, "Playing on another device");
    });
    parts.push(cancel);

    this.leave = joinQueue(search, (e) => {
      if (!this.sys.isActive()) return;
      switch (e.t) {
        case "code": {
          // Show the code big, with a copy button; the spinner moves under it.
          expiresAt = e.expiresAt;
          status.setText("Share this code with your friend:");
          timer.setY(H / 2 + 120).setFontSize(28);
          ring.setY(H / 2 + 300).setScale(0.6);
          const code = txt(this, W / 2, H / 2 + 30, e.code, 110, "#ffd93b").setDepth(101);
          const copy = button(this, W / 2, H / 2 + 210, 300, 84, "COPY CODE", "green", () => {
            navigator.clipboard?.writeText(e.code).then(() => toast(this, "Code copied", "#7dff7a"), () => toast(this, "Couldn't copy; type it instead"));
          }).setDepth(101);
          cancel.setY(H / 2 + 400);
          parts.push(code, copy);
          break;
        }
        case "queued":
          status.setText(e.players > 1 ? `Searching... (${e.players} in queue)` : "Searching for an opponent...");
          break;
        case "bot":
          this.leave = null;
          sfx("wave");
          this.scene.start("Pvp", { setup: e.setup, you: 0, offset: e.now - Date.now() });
          break;
        case "matched": {
          this.leave = null;
          status.setText("Opponent found!");
          sfx("wave");
          cancel.destroy();
          // The room answers with the match setup; anything after it is handed to the match scene.
          const conn = new MatchConn(e.matchId);
          const early: ServerMsg[] = [];
          conn.on = (msg) => {
            if (msg.t !== "setup") return void early.push(msg);
            this.scene.start("Pvp", { setup: msg.setup, you: msg.you, conn, early, offset: msg.now - Date.now() });
          };
          break;
        }
        case "closed":
          this.leave = null;
          close();
          toast(this, e.reason);
          break;
      }
    });
  }
}
