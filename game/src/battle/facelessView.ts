/**
 * v2.2 Story 3 ("The Throne of Dust") battle visuals: braziers, the saved / hit counter, unmask and
 * civilian callouts, Purify chain breaks, the sphinx's cage and roar, burrow dust and equal ground.
 * (Masked and civilian monsters are dressed by Monster; chain pips by BattleScene.updateBossBar.)
 * A view only: the rules are in shared/sim.ts and shared/faceless.ts.
 */
import Phaser from "phaser";
import type { SimEvent } from "../../../shared/sim.ts";
import type { ChapterMechanics } from "../../../shared/stories.ts";
import { NAVY, txt } from "../ui";
import { banner, hudAnchor } from "./tideView";
import type { BattleScene } from "../scenes/BattleScene";

type Brazier = { root: Phaser.GameObjects.Container; flame: Phaser.GameObjects.Container; glow: Phaser.GameObjects.Graphics; lit: boolean };

export class FacelessView {
  private saved = 0;
  private hit = 0;
  private counter: Phaser.GameObjects.Text | null = null;
  private braziers: Brazier[] = [];
  private cage: { root: Phaser.GameObjects.Container; bars: Phaser.GameObjects.Graphics; lock: Phaser.GameObjects.Graphics; x: number; y: number } | null = null;

  constructor(private scene: BattleScene, mech: ChapterMechanics | undefined) {
    const f = mech?.faceless;
    if (f) {
      this.buildCounter(mech?.tide ? 1 : 0);
      f.braziers.forEach((slot) => this.braziers.push(this.buildBrazier(slot)));
    }
    if (mech?.cage) this.buildCage(mech.cage.slot, mech.cage.lockHp, mech.cage.lockHp);
  }

  // ------------------------------------------------------------------ build

  private buildCounter(row: number) {
    const a = hudAnchor(row);
    const bg = this.scene.add.graphics();
    bg.fillStyle(NAVY, 0.92).fillRoundedRect(-210, -26, 420, 52, 20).lineStyle(4, 0x7dff7a, 1).strokeRoundedRect(-210, -26, 420, 52, 20);
    this.counter = txt(this.scene, 0, 0, "", 28);
    this.scene.add.container(a.x, a.y, [bg, this.counter]).setDepth(3000).setScrollFactor(0).setScale(a.scale);
    this.drawCounter();
  }

  private drawCounter() {
    this.counter?.setText(`Saved ${this.saved}  ·  Hit ${this.hit}`);
  }

  /** A bowl on the corner of the brazier's tile: cold until a unit stands there, then a flame. */
  private buildBrazier(slot: number): Brazier {
    const s = this.scene;
    const p = s.slotPos(slot);
    const bowl = s.add.graphics();
    bowl.fillStyle(0x23263a, 1).fillEllipse(0, 8, 40, 18);
    bowl.fillStyle(0x4a506e, 1).fillEllipse(0, 0, 40, 12);
    bowl.fillStyle(0x15172a, 1).fillEllipse(0, 0, 30, 8);
    const glow = s.add.graphics();
    glow.fillStyle(0xffa43c, 0.22).fillCircle(0, -10, 40);
    const fire = s.add.graphics();
    fire.fillStyle(0xff7a1c, 1).fillTriangle(-12, 0, 12, 0, 0, -38);
    fire.fillStyle(0xffd23b, 1).fillTriangle(-7, 0, 7, 0, 0, -22);
    const flame = s.add.container(0, 0, [glow, fire]).setVisible(false);
    s.tweens.add({ targets: fire, scaleY: { from: 0.85, to: 1.12 }, scaleX: { from: 1.05, to: 0.9 }, yoyo: true, repeat: -1, duration: 260, ease: "Sine.InOut" });
    const root = s.add.container(p.x - 36, p.y + 36, [bowl, flame]).setDepth(160 + p.y);
    return { root, flame, glow, lit: false };
  }

  private buildCage(slot: number, hp: number, max: number) {
    const s = this.scene;
    const p = s.slotPos(slot);
    const bars = s.add.graphics();
    bars.lineStyle(6, 0xd8c27a, 0.9);
    for (let i = -3; i <= 3; i++) bars.lineBetween(i * 14, -64, i * 14, 40);
    bars.lineStyle(8, 0xd8c27a, 1).lineBetween(-46, -64, 46, -64).lineBetween(-46, 40, 46, 40);
    const lock = s.add.graphics();
    const root = s.add.container(p.x, p.y, [bars, lock]).setDepth(165 + p.y);
    this.cage = { root, bars, lock, x: p.x, y: p.y };
    this.drawLock(hp, max);
  }

  private drawLock(hp: number, max: number) {
    const c = this.cage;
    if (!c) return;
    c.lock.clear().fillStyle(NAVY, 0.95).fillRoundedRect(-48, 50, 96, 16, 8);
    c.lock.fillStyle(0xffb347, 1).fillRoundedRect(-45, 53, Math.max(6, 90 * Phaser.Math.Clamp(hp / Math.max(1, max), 0, 1)), 10, 5);
  }

  // ----------------------------------------------------------------- events

  handle(e: SimEvent) {
    const s = this.scene;
    switch (e.type) {
      case "brazier": {
        const f = s.story?.chapter.mechanics?.faceless;
        const i = f ? f.braziers.indexOf(e.slot) : -1;
        const b = this.braziers[i];
        if (!b) break;
        b.lit = e.lit;
        b.flame.setVisible(e.lit);
        const p = s.slotPos(e.slot);
        s.vfx(e.lit ? "fire_explosion" : "shadow_smoke", p.x - 36, p.y + 14, 90);
        break;
      }
      case "unmask":
        s.vfx("shadow_smoke", e.x, e.y - 20, 130);
        s.vfx("hit_impact", e.x, e.y - 20, 90);
        s.floater(e.x, e.y - 70, e.civilian ? "CIVILIAN!" : "FACELESS!", e.civilian ? "#7dff7a" : "#e0d6ff", 28);
        break;
      case "civilian":
        if (e.saved) {
          this.saved++;
          s.vfx("holy_heal", e.x, e.y - 20, 120);
          s.floater(e.x, e.y - 60, "+SAVED", "#7dff7a", 34);
        } else {
          this.hit++;
          s.vfx("hit_impact", e.x, e.y - 20, 110);
          s.floater(e.x, e.y - 60, "HIT!", "#ff6b6b", 38);
          s.floater(e.x, e.y - 20, "reward lost", "#ffb0b0", 20);
        }
        this.drawCounter();
        break;
      case "chain": {
        const m = s.getMonster(e.uid);
        const at = m?.pos ?? { x: ARENA_FALLBACK, y: ARENA_FALLBACK };
        if (e.broken) {
          s.cameras.main.shake(260, 0.012);
          s.vfx("hit_impact", at.x, at.y, 240);
          s.floater(at.x, at.y - 80, `CHAIN ${e.index + 1}/${e.total} BROKEN!`, "#ffd93b", 32);
          for (let i = 0; i < 6; i++) {
            const c = s.add.circle(at.x, at.y, 7, 0xffd93b, 1).setStrokeStyle(3, NAVY).setDepth(2100);
            const a = Math.random() * Math.PI * 2;
            s.tweens.add({ targets: c, x: at.x + Math.cos(a) * 90, y: at.y + Math.sin(a) * 60 + 50, alpha: 0, duration: 600, ease: "Cubic.Out", onComplete: () => c.destroy() });
          }
        } else s.floater(at.x, at.y - 80, `CHAIN ${e.index + 1}/${e.total}`, "#c9b8ff", 26);
        break;
      }
      case "cage": {
        const c = this.cage;
        if (!c) break;
        this.drawLock(e.hp, e.max);
        if (!e.open) {
          s.tweens.add({ targets: c.root, x: { from: c.x - 3, to: c.x }, duration: 160, ease: "Bounce.Out" });
          break;
        }
        s.vfx("holy_heal", c.x, c.y - 10, 260);
        s.vfx("hit_impact", c.x, c.y - 10, 200);
        s.cameras.main.shake(300, 0.01);
        banner(s, "THE CAGE OPENS!", "#ffd93b", 52, 480);
        s.tweens.add({ targets: c.root, alpha: 0, y: c.y - 50, scale: 1.3, duration: 600, ease: "Cubic.Out", onComplete: () => c.root.destroy() });
        this.cage = null;
        break;
      }
      case "roar":
        s.cameras.main.shake(600, 0.02);
        s.cameras.main.flash(250, 255, 220, 140);
        banner(s, "ROAR!", "#ffb347", 90, 540);
        for (const m of s.allMonsters()) {
          const p = m.pos;
          s.vfx("shadow_smoke", p.x, p.y, 120);
          s.floater(p.x, p.y - 50, "STUN", "#ffd93b", 22);
        }
        break;
      case "burrow": {
        const m = s.getMonster(e.uid);
        const path = m?.sim.path;
        if (!path) break;
        const a = path.at(e.from);
        const b = path.at(e.to);
        s.vfx("shadow_smoke", a.x, a.y, 150);
        s.vfx("ground_crater", a.x, a.y + 10, 130);
        s.vfx("shadow_smoke", b.x, b.y, 150);
        s.vfx("ground_crater", b.x, b.y + 10, 130);
        break;
      }
      case "equal":
        s.equalUntil = e.until;
        banner(s, "EQUAL GROUND", "#a8ffe8", 54, 500);
        banner(s, `Every unit fights at rank ${e.rank}`, "#e6fff8", 28, 560);
        break;
    }
  }
}

/** Where a chain pop lands when its boss sprite is already gone. */
const ARENA_FALLBACK = 400;
