import Phaser from "phaser";
import { getLeaderboard, type Leaderboard } from "../save";
import { HERO_BY_ID } from "../data/heroes";
import { leagueFor } from "../../../shared/leagues.ts";
import { leagueBadge } from "./leagues";
import { RES } from "../display";
import { W, H, WIDE, txt, button, iconButton, NAVY, fmt } from "../ui";
import { cover, topBar } from "./LobbyScene";
import { music } from "../audio";

type Board = Leaderboard["by"];

const ROW_H = 92;
const TOP = 300;
const MEDAL = [0xffd93b, 0xd7dde8, 0xe0954a];

/** Top players by trophies or best wave, with the player's own place pinned at the bottom. */
export class LeaderboardScene extends Phaser.Scene {
  private by: Board = "trophies";

  constructor() {
    super("Leaderboard");
  }

  init(data: { by?: Board }) {
    this.by = data.by ?? "trophies";
  }

  create() {
    music("lobby");
    cover(this, WIDE ? "loc:lobby_landscape" : "loc:lobby_portrait", 0.55);
    topBar(this);
    iconButton(this, 50, 130, "back", 76, () => this.scene.start("Lobby"));
    txt(this, W / 2, 130, "LEADERBOARD", 48, "#fff4c2");

    const tabs: [Board, string][] = [
      ["trophies", "TROPHIES"],
      ["wave", "BEST WAVE"],
    ];
    tabs.forEach(([by, label], i) =>
      button(this, W / 2 + (i - 0.5) * 290, 220, 270, 84, label, by === this.by ? "yellow" : "grey", () => by !== this.by && this.scene.restart({ by }), 32),
    );

    const status = txt(this, W / 2, H / 2, "Loading...", 34, "#c9d2ff");
    getLeaderboard(this.by).then(
      (board) => {
        if (!this.sys.isActive()) return;
        status.destroy();
        this.show(board);
      },
      () => {
        if (!this.sys.isActive()) return;
        status.setText("Couldn't load the leaderboard").setColor("#ff8080");
        button(this, W / 2, H / 2 + 100, 280, 90, "RETRY", "blue", () => this.scene.restart({ by: this.by }), 34);
      },
    );
  }

  /** Draw the board (also used by tests with made-up rows). */
  show(board: Leaderboard) {
    const panelW = WIDE ? 940 : W - 40;
    const left = (W - panelW) / 2;
    const bottom = H - 170;
    const g = this.add.graphics();
    g.fillStyle(NAVY, 0.8).fillRoundedRect(left, TOP - 20, panelW, bottom - TOP + 20, 28);

    if (!board.rows.length) {
      txt(this, W / 2, TOP + 160, "Nobody is ranked yet.\nPlay a battle to be the first!", 32, "#c9d2ff");
    }
    const list = this.add.container(0, TOP);
    board.rows.forEach((r, i) => list.add(this.row(r, i * ROW_H + ROW_H / 2, left, panelW, r.id === board.me.id)));

    // Scroll by dragging or mouse wheel, clipped to the panel.
    const viewH = bottom - TOP - 10;
    const minY = Math.min(TOP, TOP - (board.rows.length * ROW_H - viewH));
    const mask = this.make.graphics({}, false).fillRect(left, TOP - 10, panelW, viewH + 10);
    list.setMask(mask.createGeometryMask());
    let startY = NaN;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => (startY = p.worldY > TOP - 10 && p.worldY < bottom ? list.y : NaN));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown || Number.isNaN(startY)) return;
      list.y = Phaser.Math.Clamp(startY + (p.y - p.downY) / RES, minY, TOP);
    });
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      list.y = Phaser.Math.Clamp(list.y - dy, minY, TOP);
    });

    // The player's own place.
    const fy = H - 90;
    const f = this.add.graphics();
    f.fillStyle(0x2a2f6a, 0.95).fillRoundedRect(left, fy - 50, panelW, 100, 24);
    f.lineStyle(4, 0xffd93b, 1).strokeRoundedRect(left, fy - 50, panelW, 100, 24);
    const value = board.by === "wave" ? "best wave" : "trophies";
    const rank = board.me.rank;
    txt(this, W / 2, fy - 14, rank ? `Your rank: #${fmt(rank)} of ${fmt(board.total)}` : "You're not ranked yet", 32, "#fff4c2");
    txt(this, W / 2, fy + 24, rank ? `Ranked by ${value}` : `Play a battle to get ranked by ${value}`, 22, "#c9d2ff");
    // Jump to your row if it's in the list.
    const mineAt = board.rows.findIndex((r) => r.id === board.me.id);
    if (mineAt > 3) list.y = Phaser.Math.Clamp(TOP - (mineAt * ROW_H - viewH / 2), minY, TOP);
  }

  private row(r: Leaderboard["rows"][number], y: number, left: number, w: number, isMe: boolean) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics();
    g.fillStyle(isMe ? 0x3b3f8a : 0x1d2250, 0.95).fillRoundedRect(left + 12, y - ROW_H / 2 + 5, w - 24, ROW_H - 10, 18);
    if (isMe) g.lineStyle(4, 0xffd93b, 1).strokeRoundedRect(left + 12, y - ROW_H / 2 + 5, w - 24, ROW_H - 10, 18);
    parts.push(g);

    // Rank: a medal for the top 3.
    const rx = left + 62;
    if (r.rank <= 3) {
      const m = this.add.graphics();
      m.fillStyle(MEDAL[r.rank - 1], 1).fillCircle(rx, y, 30);
      m.lineStyle(4, NAVY, 1).strokeCircle(rx, y, 30);
      parts.push(m, txt(this, rx, y, String(r.rank), 30, "#14183a").setStroke("#ffffff", 0).setShadow(0, 0));
    } else {
      parts.push(txt(this, rx, y, `#${r.rank}`, r.rank >= 1000 ? 22 : 28, "#c9d2ff"));
    }

    // Avatar: the player's hero inside the gold ring.
    const ax = left + 140;
    const hero = r.hero && HERO_BY_ID[r.hero] ? `hero_portrait:${r.hero}` : null;
    if (hero && this.textures.exists(hero)) parts.push(this.add.image(ax, y, hero).setDisplaySize(46, 46));
    parts.push(this.add.image(ax, y, "ui:avatar_frame").setDisplaySize(74, 74));
    // League badge on the avatar's corner.
    parts.push(leagueBadge(this, ax + 28, y + 22, 36, leagueFor(r.trophies)));

    const name = r.name.length > 18 ? `${r.name.slice(0, 17)}…` : r.name;
    parts.push(txt(this, ax + 52, y, isMe ? `${name} (you)` : name, WIDE ? 32 : 28, isMe ? "#fff4c2" : "#ffffff", [0, 0.5]));

    // The ranked value, with the other one small underneath.
    const vx = left + w - 40;
    const [main, icon, sub] =
      this.by === "wave" ? [`Wave ${fmt(r.bestWave)}`, "ui:wave_horn", `${fmt(r.trophies)} trophies`] : [fmt(r.trophies), "item:trophy", `best wave ${fmt(r.bestWave)}`];
    const mainT = txt(this, vx, y - 12, main, 32, "#ffd93b", [1, 0.5]);
    parts.push(mainT, this.add.image(vx - mainT.width - 26, y - 12, icon).setDisplaySize(40, 40));
    parts.push(txt(this, vx, y + 22, sub, 18, "#8f9ad0", [1, 0.5]));
    return parts;
  }
}
