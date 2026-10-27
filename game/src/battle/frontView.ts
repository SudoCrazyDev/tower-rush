/**
 * v3.0 "The Dark War" battle visuals: the war meter and the front shift. When the front shifts, the
 * transition video (<from>__<to>) plays over the arena once, then the new front's art and ambient loop
 * take over for good. A view only: the rules are in shared/sim.ts and shared/front.ts.
 */
import Phaser from "phaser";
import type { Sim, SimEvent } from "../../../shared/sim.ts";
import { frontVideo, type FrontRules } from "../../../shared/front.ts";
import { BASE, assetIndex } from "../assets";
import { ambientVideo, clipImage } from "../backdrop";
import { ARENA_H, ARENA_W, NAVY, txt } from "../ui";
import { banner, hudAnchor } from "./tideView";

const LEGION = 0xff8a3d;
const NATION = 0xe0304a;
/** Depths under every board object (above the wide layout's blurred backdrop at -10): the art, its loop, then the transition. */
const ART_DEPTH = -9;
const LOOP_DEPTH = -8;
const SHIFT_DEPTH = -7;

/** Texture key of a front's arena art. */
const artKey = (art: string) => `loc:${art}`;

export class FrontView {
  private loop: Phaser.GameObjects.Video | null;
  private meter: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private shown = -1;

  /** Queue the art of every front (the first is the chapter's own art, already loaded). */
  static preload(scene: Phaser.Scene, rules: FrontRules) {
    for (const f of rules.fronts) {
      if (!scene.textures.exists(artKey(f.art)) && assetIndex().locations.includes(f.art)) scene.load.image(artKey(f.art), `${BASE}locations/${f.art}.webp`);
    }
  }

  constructor(
    private scene: Phaser.Scene,
    private rules: FrontRules,
    private bg: Phaser.GameObjects.Image,
    loop: Phaser.GameObjects.Video | null,
  ) {
    this.loop = loop;
    bg.setDepth(ART_DEPTH);
    loop?.setDepth(LOOP_DEPTH);
    const a = hudAnchor(0);
    this.meter = scene.add.graphics().setDepth(2500).setScrollFactor(0);
    this.label = txt(scene, a.x, a.y - 30, "", 22, "#ffffff").setDepth(2501).setScrollFactor(0).setScale(a.scale);
  }

  /** The war meter: kills toward the next shift (full and gold on the last front). */
  update(sim: Sim) {
    const a = hudAnchor(0);
    const need = sim.frontNeed();
    const share = need ? Math.min(1, sim.frontKills / need) : 1;
    const w = 360 * a.scale;
    const h = 18 * a.scale;
    const x = a.x - w / 2;
    const y = a.y - 8 * a.scale;
    const g = this.meter.clear();
    g.fillStyle(NAVY, 0.85).fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 10);
    g.fillStyle(0x2a2a36, 1).fillRoundedRect(x, y, w, h, 8);
    if (share > 0) g.fillStyle(need ? (sim.frontIndex % 2 ? NATION : LEGION) : 0xffd93b, 1).fillRoundedRect(x, y, Math.max(h, w * share), h, 8);
    if (this.shown !== sim.frontIndex) {
      this.shown = sim.frontIndex;
      const f = this.rules.fronts[sim.frontIndex];
      this.label.setText(need ? `${f.name} · next front ${sim.frontIndex + 2}/${this.rules.fronts.length}` : `${f.name} · final front`);
    }
  }

  handle(e: SimEvent) {
    if (e.type !== "front") return;
    const scene = this.scene;
    banner(scene, e.name.toUpperCase(), "#ffd93b", 52, 470);
    scene.time.delayedCall(700, () => banner(scene, e.text, "#ffffff", 30, 540));
    scene.cameras.main.shake(500, 0.006);
    const swap = () => {
      if (!this.bg.active) return;
      if (scene.textures.exists(artKey(e.to))) {
        this.bg.setTexture(artKey(e.to)).setDisplaySize(ARENA_W, ARENA_H);
        // The wide layout's blurred backdrop is the same art: it follows.
        for (const o of scene.children.list) if (o !== this.bg && o instanceof Phaser.GameObjects.Image && o.texture.key === artKey(e.from)) o.setTexture(artKey(e.to));
      }
      this.loop?.destroy();
      this.loop = ambientVideo(scene, e.to, (v) => v.setOrigin(0).setDisplaySize(ARENA_W, ARENA_H).setDepth(LOOP_DEPTH));
      this.loop?.setDepth(LOOP_DEPTH);
    };
    let done = false;
    let shift: Phaser.GameObjects.Image | null = null;
    const finish = () => {
      if (done) return;
      done = true;
      swap();
      if (shift) scene.tweens.add({ targets: shift, alpha: 0, duration: 600, onComplete: () => shift?.destroy() });
    };
    shift = clipImage(scene, frontVideo(e.from, e.to), (v) => v.setOrigin(0).setDisplaySize(ARENA_W, ARENA_H), finish);
    if (!shift) {
      // No video (off or missing): a flash and a cut.
      const flash = scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0xffffff, 0).setDepth(SHIFT_DEPTH);
      scene.tweens.add({ targets: flash, alpha: 0.8, duration: 250, yoyo: true, onYoyo: () => ((done = true), swap()), onComplete: () => flash.destroy() });
      return;
    }
    shift.setDepth(SHIFT_DEPTH);
    // A stalled or blocked video must not leave the old front up.
    scene.time.delayedCall(7000, finish);
  }

  destroy() {
    this.meter.destroy();
    this.label.destroy();
  }
}
