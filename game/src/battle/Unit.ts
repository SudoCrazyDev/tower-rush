import Phaser from "phaser";
import { animKey, hasAnim, sheetScale } from "../assets";
import { ELEMENT_COLOR, maxRank, unitStats, type UnitDef } from "../data/units";
import { ECONOMY } from "../../../shared/economy.ts";
import { EFFECTS, manaPerPulse } from "../../../shared/effects.ts";
import { withPerk, type Perk } from "../../../shared/perks.ts";
import { NAVY, txt } from "../ui";
import type { BattleScene } from "../scenes/BattleScene";

export const UNIT_PX = 116;
/** Awakened units stand a little taller. */
export const AWAKENED_PX = 132;

/** Whether a unit has awakened art (and so awakens at max rank). */
export const canAwaken = (id: string) => hasAnim("units_awakened", `${id}_idle`);

/** A defender standing on one of the 15 board tiles. */
export class Unit {
  readonly scene: BattleScene;
  readonly def: UnitDef;
  readonly rank: number;
  slot: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly pips: Phaser.GameObjects.Graphics;
  cooldown: number;
  alive = 0;
  /** Attack speed bonus from neighbouring buff units (0.25 = +25%). */
  haste = 0;
  /** Its own perk plus those from neighbouring buff units. */
  perks: Perk[] = [];
  frozenUntil = 0;
  pulse = 0;
  dragging = false;
  /** Max rank with awakened art: stronger, and fires ultimates. */
  readonly awakened: boolean;
  /** Seconds charged toward the next ultimate. */
  ult = 0;
  private aura: Phaser.GameObjects.Graphics | null = null;
  /** Shown while a neighbouring buff unit speeds this one up: icon and the bonus. */
  private buffBadge: Phaser.GameObjects.Container | null = null;
  private buffRing: Phaser.GameObjects.Graphics | null = null;
  /** When the last callout went up, so rapid-fire units don't stack them. */
  private calloutAt = -1;

  constructor(scene: BattleScene, def: UnitDef, rank: number, slot: number) {
    this.scene = scene;
    this.def = def;
    this.rank = rank;
    this.slot = slot;
    this.awakened = rank >= maxRank() && canAwaken(def.id);
    withPerk(this.perks, def.perk);
    const p = scene.slotPos(slot);
    if (this.awakened) {
      this.aura = scene.add.graphics();
      this.aura.fillStyle(0xffd93b, 0.28).fillEllipse(0, 0, 112, 46);
      this.aura.fillStyle(0xffffff, 0.22).fillEllipse(0, 0, 70, 26);
      scene.tweens.add({ targets: this.aura, scale: { from: 0.85, to: 1.12 }, alpha: { from: 1, to: 0.6 }, yoyo: true, repeat: -1, duration: 700, ease: "Sine.InOut" });
    }
    this.sprite = scene.add.sprite(p.x, p.y, animKey(this.folder, `${def.id}_idle`));
    this.sprite.setScale(this.baseScale).setOrigin(0.5, 0.62);
    this.playIdle();
    this.pips = scene.add.graphics();
    this.cooldown = 0.3 + Math.random() * 0.4;
    this.place(slot);
    this.sprite.setInteractive({ draggable: true, useHandCursor: true });
    (this.sprite as Phaser.GameObjects.Sprite & { unit?: Unit }).unit = this;
  }

  get stats() {
    const s = unitStats(this.def, this.rank, this.scene.cardLevel(this.def.id), this.scene.powerUps[this.def.id] ?? 0);
    if (this.awakened) {
      s.damage *= ECONOMY.awakenDamageMult;
      s.speed *= ECONOMY.awakenSpeedMult;
    }
    return s;
  }

  /** Display height in pixels. */
  get px() {
    return this.awakened ? AWAKENED_PX : UNIT_PX;
  }

  /** Sprite scale for the current art (base and awakened sheets can differ in frame size). */
  get baseScale() {
    return sheetScale(this.folder, this.px);
  }

  /** Awakened art is loaded on demand; until it arrives the base art stands in. */
  get folder() {
    return this.awakened && this.scene.anims.exists(animKey("units_awakened", `${this.def.id}_idle`)) ? "units_awakened" : "units";
  }

  place(slot: number) {
    this.slot = slot;
    const p = this.scene.slotPos(slot);
    this.sprite.setPosition(p.x, p.y).setDepth(100 + p.y);
    this.aura?.setPosition(p.x, p.y + 30).setDepth(99 + p.y);
    this.buffRing?.setPosition(p.x, p.y + 32).setDepth(98 + p.y);
    this.buffBadge?.setPosition(p.x + 36, p.y - 44).setDepth(160 + p.y);
    this.drawPips(p.x, p.y);
  }

  /** Show (or clear) the buffed marker after the board's buffs change. */
  showBuff() {
    const scene = this.scene;
    if (this.haste <= 0) {
      this.buffBadge?.destroy();
      this.buffRing?.destroy();
      this.buffBadge = this.buffRing = null;
      return;
    }
    const label = `+${Math.round(this.haste * 100)}%`;
    if (!this.buffBadge) {
      this.buffRing = scene.add.graphics();
      this.buffRing.lineStyle(4, 0xffd93b, 0.85).strokeEllipse(0, 0, 96, 36);
      this.buffRing.fillStyle(0xffd93b, 0.12).fillEllipse(0, 0, 96, 36);
      scene.tweens.add({ targets: this.buffRing, alpha: { from: 1, to: 0.45 }, yoyo: true, repeat: -1, duration: 650, ease: "Sine.InOut" });
      const bg = scene.add.graphics();
      const icon = scene.add.image(-20, 0, "stat:attack_speed").setDisplaySize(26, 26);
      const text = txt(scene, 0, 0, label, 18, "#ffd93b", [0, 0.5]).setName("label");
      this.buffBadge = scene.add.container(0, 0, [bg, icon, text]);
    }
    const text = this.buffBadge.getByName("label") as Phaser.GameObjects.Text;
    const changed = text.text !== label;
    text.setText(label).setX(-6);
    const w = 26 + text.width + 10;
    const bg = this.buffBadge.list[0] as Phaser.GameObjects.Graphics;
    bg.clear().fillStyle(NAVY, 0.92).fillRoundedRect(-36, -16, w, 32, 16).lineStyle(2, 0xffd93b, 1).strokeRoundedRect(-36, -16, w, 32, 16);
    // Pinned to the tile, not the sprite (which may be mid-drag).
    const p = this.scene.slotPos(this.slot);
    this.buffRing!.setPosition(p.x, p.y + 32).setDepth(98 + p.y);
    this.buffBadge.setPosition(p.x + 36, p.y - 44).setDepth(160 + p.y);
    this.setBuffVisible(!this.dragging);
    if (changed) {
      this.buffBadge.setScale(1.4);
      scene.tweens.add({ targets: this.buffBadge, scale: 1, duration: 260, ease: "Back.Out" });
    }
  }

  /** Pops a label over the unit when one of its hits lands big (crit, execute). */
  callout(text: string, color: string) {
    const scene = this.scene;
    if (scene.now - this.calloutAt < 0.35 || this.dragging) return;
    this.calloutAt = scene.now;
    const { x, y } = scene.slotPos(this.slot);
    const burst = scene.add.graphics().setPosition(x, y - 10).setDepth(99 + y);
    burst.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 0.5).fillCircle(0, 0, 52).setScale(0.4);
    scene.tweens.add({ targets: burst, scale: 1.3, alpha: 0, duration: 320, ease: "Cubic.Out", onComplete: () => burst.destroy() });
    const t = txt(scene, x, y - 78, text, 26, color).setDepth(600).setScale(0.3);
    scene.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1.15, duration: 140, ease: "Back.Out" },
        { scale: 1, duration: 80 },
        { y: y - 112, alpha: 0, delay: 260, duration: 420, ease: "Cubic.In" },
      ],
      onComplete: () => t.destroy(),
    });
  }

  setBuffVisible(on: boolean) {
    this.buffBadge?.setVisible(on);
    this.buffRing?.setVisible(on);
  }

  drawPips(x: number, y: number) {
    const g = this.pips;
    g.clear().setDepth(150 + y);
    const n = this.rank;
    const gap = 11;
    const startX = x - ((n - 1) * gap) / 2;
    const py = y + 40;
    for (let i = 0; i < n; i++) {
      g.fillStyle(NAVY, 1).fillCircle(startX + i * gap, py, 6.5);
      g.fillStyle(n === 7 ? 0xffd93b : ELEMENT_COLOR[this.def.element], 1).fillCircle(startX + i * gap, py, 4.5);
    }
  }

  playIdle() {
    const key = animKey(this.folder, `${this.def.id}_idle`);
    const was = this.sprite.anims.currentAnim?.key;
    this.sprite.play(key, true);
    // Switching to the late-loaded awakened art: its frames may be a different size.
    if (was && was.split("/")[0] !== key.split("/")[0]) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setScale(this.baseScale);
    }
  }

  playOnce(anim: "attack" | "skill", timeScale = 1) {
    const key = animKey(this.folder, `${this.def.id}_${anim}`);
    if (!this.scene.anims.exists(key)) {
      // No clean clip for this action: squash and stretch the idle instead.
      const s = this.baseScale;
      if (!this.scene.tweens.isTweening(this.sprite)) {
        this.scene.tweens.add({ targets: this.sprite, scaleX: s * 1.12, scaleY: s * 0.9, yoyo: true, duration: 90 });
      }
      return;
    }
    if (this.sprite.anims.currentAnim?.key === key && this.sprite.anims.isPlaying) return;
    this.sprite.play(key);
    this.sprite.anims.timeScale = timeScale;
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.sprite.anims.timeScale = 1;
      if (!this.dragging) this.playIdle();
    });
  }

  update(dt: number, now: number) {
    if (this.dragging) return;
    if (now < this.frozenUntil) {
      this.sprite.setTint(0x7fd8ff);
      this.sprite.anims.timeScale = 0;
      return;
    }
    if (this.sprite.isTinted) {
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
    }
    this.alive += dt;

    if (this.def.arch === "buff") {
      this.pulse -= dt;
      if (this.pulse <= 0) {
        this.pulse = 4;
        this.playOnce("skill");
      }
      return;
    }
    if (this.def.arch === "mana") {
      this.pulse += dt;
      if (this.pulse >= EFFECTS.mana.every) {
        this.pulse = 0;
        this.playOnce("skill");
        this.scene.gainMana(manaPerPulse(this.rank), this.sprite.x, this.sprite.y - 50);
      }
    }

    if (this.awakened) {
      this.ult += dt;
      if (this.ult >= ECONOMY.ultimateCooldown) {
        const target = this.def.arch === "mana" ? null : this.scene.pickTarget(this.def.arch === "sniper" ? "strongest" : "first");
        if (target || this.def.arch === "mana") {
          this.ult = 0;
          this.playOnce("skill");
          this.scene.ultimate(this, target);
          this.cooldown = Math.max(this.cooldown, 0.5);
          return;
        }
      }
    }

    const { speed } = this.stats;
    const rate = speed * (1 + this.haste + this.scene.heroHaste);
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const target = this.scene.pickTarget(this.def.arch === "sniper" ? "strongest" : "first");
    if (!target) return;
    this.cooldown = 1 / rate;
    // Speed the attack animation up if the unit fires faster than it plays.
    const animLen = 16 / 24;
    this.playOnce("attack", Math.max(1, animLen * rate));
    this.scene.fire(this, target);
  }

  destroy() {
    this.aura?.destroy();
    this.buffBadge?.destroy();
    this.buffRing?.destroy();
    this.sprite.destroy();
    this.pips.destroy();
  }
}
