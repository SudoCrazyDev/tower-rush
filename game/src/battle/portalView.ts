/**
 * v2.7.1 portal: when the board is locked (every tile taken, nothing left to merge) a portal
 * opens under the board. A unit dropped into it leaves the board and part of its worth comes
 * back as mana (Sim.banish). Used by solo battles and PvP.
 */
import Phaser from "phaser";
import { animKey, sheetScale } from "../assets";
import type { Sim } from "../../../shared/sim.ts";
import { slotPos } from "../../../shared/path.ts";
import type { ArenaDef } from "../../../shared/arenas.ts";
import { txt } from "../ui";

const SIZE = 130;
/** How close (world px) a dropped unit must be to the portal's centre. */
const REACH = 90;

export class BoardPortal {
  readonly x: number;
  readonly y: number;
  private root: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.Graphics;
  private open = false;
  private hot = false;

  constructor(private scene: Phaser.Scene, arena: ArenaDef) {
    // Under the middle of the bottom row, about one row further down (grass between the board and the path).
    const bottom = slotPos(arena, 12);
    const row = bottom.y - slotPos(arena, 7).y;
    this.x = bottom.x;
    this.y = bottom.y + row * 0.95;
    this.glow = scene.add.graphics();
    const parts: Phaser.GameObjects.GameObject[] = [this.glow];
    // The ring-of-stones art (ui/board_portal); the drawn rim stands in until it has loaded.
    this.art = scene.textures.exists("ui:board_portal");
    if (this.art) {
      const img = scene.add.image(0, 0, "ui:board_portal");
      img.setScale((SIZE * 1.2) / img.width);
      parts.push(img);
    }
    const key = animKey("vfx", "arcane_vortex");
    if (scene.anims.exists(key)) {
      const s = scene.add.sprite(0, 0, key).setScale(sheetScale("vfx", SIZE * (this.art ? 0.7 : 1))).setAlpha(this.art ? 0.6 : 1);
      s.play({ key, repeat: -1 });
      parts.push(s);
    }
    parts.push(txt(scene, 0, SIZE / 2 + 2, "PORTAL", 20, "#e3c8ff"));
    this.root = scene.add.container(this.x, this.y, parts).setDepth(90).setAlpha(0).setVisible(false);
    this.drawGlow();
    if (!this.art) scene.tweens.add({ targets: this.glow, angle: 360, duration: 4000, repeat: -1 });
  }

  private readonly art: boolean;

  /** Open or close with the board's lock (call every frame). */
  update(sim: Sim) {
    const open = sim.locked;
    if (open === this.open) return;
    this.open = open;
    this.scene.tweens.killTweensOf(this.root);
    if (open) {
      this.root.setVisible(true).setScale(0.3);
      this.scene.tweens.add({ targets: this.root, alpha: 1, scale: 1, duration: 350, ease: "Back.Out" });
    } else {
      this.scene.tweens.add({ targets: this.root, alpha: 0, scale: 0.3, duration: 250, onComplete: () => this.root.setVisible(false) });
    }
    if (!open) this.setHot(false);
  }

  get isOpen() {
    return this.open;
  }

  /** Whether a unit dropped at (x, y) lands in the open portal. */
  hit(x: number, y: number) {
    return this.open && Math.hypot(x - this.x, y - this.y) <= REACH;
  }

  /** Brighter while a unit is held (it can go in). */
  setHot(on: boolean) {
    if (on === this.hot) return;
    this.hot = on;
    this.drawGlow();
  }

  /** A unit went through: a quick pulse. */
  swallow() {
    this.scene.tweens.add({ targets: this.root, scale: { from: 1.25, to: 1 }, duration: 300, ease: "Quad.Out" });
  }

  private drawGlow() {
    const g = this.glow.clear();
    const r = SIZE / 2;
    // With the art: only a soft halo behind it while a unit can go in.
    if (this.art) {
      if (this.hot) g.fillStyle(0xc58bff, 0.45).fillEllipse(0, 0, SIZE * 1.45, SIZE * 1.3);
      return;
    }
    g.fillStyle(0x6a2bd8, this.hot ? 0.5 : 0.3).fillEllipse(0, 0, r * 2, r * 2);
    g.lineStyle(this.hot ? 6 : 4, this.hot ? 0xf0d8ff : 0xb987ff, 0.9).strokeCircle(0, 0, r - 6);
    // Dashes on the rim so the spin shows.
    g.lineStyle(4, 0xffffff, 0.6);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath().arc(0, 0, r - 14, a, a + 0.35).strokePath();
    }
  }
}
