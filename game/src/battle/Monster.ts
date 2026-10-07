import Phaser from "phaser";
import { animKey, hasAnim, sheetScale } from "../assets";
import { fmt, txt } from "../ui";
import { StatusFx, monsterStatuses } from "./vfx";
import type { SimMonster } from "../../../shared/sim.ts";
import type { BattleScene } from "../scenes/BattleScene";

/** White blended toward the corruption's violet by `k` (0-1). */
export function corruptTint(k: number) {
  const mix = (a: number, b: number) => Math.round(a + (b - a) * Math.min(1, k) * 0.75);
  return (mix(255, 0xb0) << 16) | (mix(255, 0x70) << 8) | mix(255, 0xff);
}

/** Tint of each Jawbreaker layer a boss has shed (by stage). */
const LAYER_TINTS = [null, 0xff9ad5, 0x9ad5ff, 0xb070ff];

/** A walking enemy (regular monster or boss): the sprite and HP label for a SimMonster. */
export class Monster {
  readonly scene: BattleScene;
  readonly sim: SimMonster;
  readonly folder: "monsters" | "bosses";
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly label: Phaser.GameObjects.Text;
  /** Killed or leaked: the Sim is done with it and only the exit animation remains. */
  dead = false;
  /** Sim time it died at (hero effects that go off in the same instant still see it). */
  diedAt = -1;
  /** The sprite is gone: the scene can forget this wrapper. */
  finished = false;
  /** v1.2 story corruption, 0-1: a violet tint drawn in code (the art is clean). */
  corruption = 0;
  private introPlaying = false;
  private bob = Math.random() * 10;
  private flashUntil = 0;
  private labelShown = "";
  private readonly statusFx: StatusFx;

  constructor(scene: BattleScene, sim: SimMonster, corruption: number) {
    this.scene = scene;
    this.sim = sim;
    this.corruption = corruption;
    this.statusFx = new StatusFx(scene);
    this.folder = sim.boss ? "bosses" : "monsters";
    const p = sim.path.at(sim.dist);
    this.sprite = scene.add.sprite(p.x, p.y, animKey(this.folder, `${this.id}_walk`));
    this.sprite.setScale(sheetScale(this.folder, sim.size)).setOrigin(0.5, 0.85);
    this.sprite.play({ key: animKey(this.folder, `${this.id}_walk`), startFrame: Math.floor(Math.random() * 16) });
    this.label = txt(scene, p.x, p.y, fmt(sim.hp), sim.boss ? 26 : 20);
    if (sim.boss && sim.intro > 0 && hasAnim("bosses", `${this.id}_intro`)) {
      this.introPlaying = true;
      this.sprite.play(animKey("bosses", `${this.id}_intro`));
    }
    this.update(0);
  }

  get id() {
    return this.sim.id;
  }

  get boss() {
    return this.sim.boss;
  }

  get pos() {
    return { x: this.sprite.x, y: this.sprite.y - this.sim.size * 0.35 };
  }

  /** The boss plays a clip, then goes back to walking. */
  playBoss(key: string) {
    if (this.dead || !this.scene.anims.exists(key)) return;
    this.introPlaying = false;
    if (this.sprite.anims.currentAnim?.key === key && this.sprite.anims.isPlaying) return;
    this.sprite.play(key);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => !this.dead && this.sprite.play(animKey("bosses", `${this.id}_walk`)));
  }

  flash() {
    this.flashUntil = this.scene.now + 0.06;
  }

  /** Every frame: stand where the Sim has it (`ahead` seconds of walking past the last step) and show its state. */
  update(ahead: number) {
    if (this.dead) return;
    const m = this.sim;
    const now = this.scene.sim.now;
    if (this.introPlaying && m.intro <= 0) {
      this.introPlaying = false;
      this.sprite.play(animKey("bosses", `${this.id}_walk`));
    }
    const moving = m.intro <= 0 && m.pinned === null && ahead > 0;
    const dist = moving ? Math.min(m.path.length, m.dist + m.speed(now) * ahead) : m.dist;
    const p = m.path.at(dist);
    this.bob += 0.15;
    this.sprite.setPosition(p.x, p.y + Math.sin(this.bob) * 1.5);
    this.sprite.setDepth(100 + p.y);
    this.label.setPosition(p.x, p.y - m.size * 0.82).setDepth(1500 + p.y);
    const text = fmt(Math.max(0, m.hp));
    if (text !== this.labelShown) {
      this.labelShown = text;
      this.label.setText(text);
    }
    this.statusFx.sync(p, m.size, 1200 + p.y, monsterStatuses(m, now));
    this.sprite.anims.timeScale = now < m.frozenUntil || now < m.stunUntil ? 0 : 1;

    let tint: number | null = null;
    if (now < m.frozenUntil) tint = 0x7fd8ff;
    else if (now < m.shieldUntil) tint = 0x9fb4ff;
    else if (m.poison.length) tint = 0xc89bff;
    else if (now < m.slowUntil) tint = 0xb8e8ff;
    else if (m.burn.until > now) tint = 0xffb38a;
    else if (m.boss?.power === "layers" && m.stage > 0) tint = LAYER_TINTS[m.stage] ?? 0xb070ff;
    else if (this.corruption > 0) tint = corruptTint(this.corruption);
    if (this.scene.now < this.flashUntil) this.sprite.setTintFill(0xffffff);
    else if (tint !== null) this.sprite.setTint(tint);
    else this.sprite.clearTint();
  }

  /** Killed: its death clip (or a fade) and out. */
  die() {
    if (this.dead) return;
    this.dead = true;
    this.diedAt = this.scene.sim.now;
    this.label.destroy();
    this.statusFx.destroy();
    const key = animKey(this.folder, `${this.id}_death`);
    if (this.scene.anims.exists(key)) {
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
      this.sprite.play(key);
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.finish());
    } else {
      this.scene.tweens.add({ targets: this.sprite, alpha: 0, scale: 0, duration: 250, onComplete: () => this.finish() });
    }
  }

  /** Remove without the death animation (leaked through the gate). */
  remove() {
    if (this.dead) return;
    this.dead = true;
    this.diedAt = this.scene.sim.now;
    this.label.destroy();
    this.statusFx.destroy();
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 200, onComplete: () => this.finish() });
  }

  private finish() {
    this.statusFx.destroy();
    this.sprite.destroy();
    this.finished = true;
  }
}
