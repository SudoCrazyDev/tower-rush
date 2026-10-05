import Phaser from "phaser";
import { animKey, hasAnim, sheetScale } from "../assets";
import { ELEMENT_COLOR, maxRank, unitStats, type UnitDef } from "../data/units";
import { ECONOMY } from "../../../shared/economy.ts";
import { EFFECTS, manaPerPulse } from "../../../shared/effects.ts";
import { withPerk, type Perk } from "../../../shared/perks.ts";
import { isSupport } from "../../../shared/support.ts";
import { newStatus } from "../../../shared/statuses.ts";
import { NAVY, txt } from "../ui";
import type { BattleScene } from "../scenes/BattleScene";

export const UNIT_PX = 116;
/** Awakened units stand a little taller. */
export const AWAKENED_PX = 132;

/** Whether a unit has awakened art (and so awakens at max rank). */
export const canAwaken = (id: string, arch?: string) => (!arch || !isSupport(arch as never)) && hasAnim("units_awakened", `${id}_idle`);

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
  /** Extra ultimate charge rate from neighbouring Hourglass Owls (0.5 = +50%). */
  charge = 0;
  /** Support timer: Mime prep and Mirror Slime progress count up, Portal Imp recharge counts down. */
  timer = 0;
  /** Portal rush: attacks faster until then. */
  rushUntil = 0;
  /** v1.2 statuses: Rally, Irritation, Fatigue, Shellshock (see statuses.ts). */
  status = newStatus();
  /** Princess Muse's Last Call on this unit: attack speed and damage bonus. */
  auraSpeed = 0;
  auraDamage = 0;
  /** Hired Blade whose wages weren't paid this wave: no attacks. */
  sulking = false;
  /** Timer for a unit effect that goes off every few seconds (Rogue Knight's Irritation). */
  effectTimer = 0;
  private statusIcons: Phaser.GameObjects.Container | null = null;
  private statusDrawn = "";
  private heart: Phaser.GameObjects.Text | null = null;
  /** Ready / recharge ring at the feet of support units with a timer. */
  private supportRing: Phaser.GameObjects.Graphics | null = null;
  private supportDrawn = "";
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
    this.awakened = rank >= maxRank() && canAwaken(def.id, def.arch);
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
    this.supportRing?.setPosition(p.x, p.y + 34).setDepth(97 + p.y);
    this.heart?.setPosition(p.x - 40, p.y - 44).setDepth(160 + p.y);
    this.statusIcons?.setPosition(p.x, p.y - 78).setDepth(170 + p.y);
    this.supportDrawn = "";
    this.drawPips(p.x, p.y);
  }

  /**
   * Mime, Portal Imp and Mirror Slime: a ring at the feet fills as the timer runs (`progress`
   * 0-1) and turns green when the unit is ready to be dragged.
   */
  drawSupportRing(progress: number, color: number) {
    if (!this.supportRing) {
      const p = this.scene.slotPos(this.slot);
      this.supportRing = this.scene.add.graphics().setPosition(p.x, p.y + 34).setDepth(97 + p.y);
    }
    const ready = progress >= 1;
    const key = `${Math.round(progress * 40)}:${color}`;
    if (key === this.supportDrawn) return;
    this.supportDrawn = key;
    const g = this.supportRing.clear();
    g.lineStyle(7, NAVY, 0.7).strokeEllipse(0, 0, 88, 30);
    if (ready) {
      g.lineStyle(5, color, 1).strokeEllipse(0, 0, 88, 30).fillStyle(color, 0.18).fillEllipse(0, 0, 88, 30);
      return;
    }
    // An ellipse arc from the top, clockwise.
    const pts: { x: number; y: number }[] = [];
    const n = Math.max(2, Math.round(40 * progress));
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i / 40) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * 44, y: Math.sin(a) * 15 });
    }
    g.lineStyle(5, 0xc9d2ff, 0.9).strokePoints(pts);
  }

  /** Muse's heart badge on a unit inside her Last Call square. */
  private showHeart() {
    const on = this.auraSpeed > 0 || this.auraDamage > 0;
    if (!on) {
      this.heart?.destroy();
      this.heart = null;
      return;
    }
    if (!this.heart) {
      const p = this.scene.slotPos(this.slot);
      this.heart = txt(this.scene, p.x - 40, p.y - 44, "♥", 26, "#ff8fd8").setDepth(160 + p.y);
      this.heart.setScale(1.6);
      this.scene.tweens.add({ targets: this.heart, scale: 1, duration: 260, ease: "Back.Out" });
    }
    this.heart.setVisible(!this.dragging);
  }

  /** Status icons over the head (Rally, Irritation, Fatigue, Shellshock), redrawn when they change. */
  drawStatus(now: number) {
    const s = this.status;
    const on = [
      now < s.rallyUntil && "rally",
      now < s.irritatedUntil && "irritation",
      (now < s.fatiguedUntil || this.sulking) && "fatigue",
      now < s.shockedUntil && "shellshock",
    ].filter(Boolean) as string[];
    const key = on.join(",") + (this.dragging ? "d" : "");
    if (key === this.statusDrawn) return;
    this.statusDrawn = key;
    this.statusIcons?.destroy();
    this.statusIcons = null;
    if (!on.length || this.dragging) return;
    const scene = this.scene;
    const p = scene.slotPos(this.slot);
    const icons = on.map((k, i) => scene.add.image((i - (on.length - 1) / 2) * 34, 0, `ui:status_${k}`).setDisplaySize(34, 34));
    this.statusIcons = scene.add.container(p.x, p.y - 78, icons).setDepth(170 + p.y);
  }

  /** Show (or clear) the buffed marker after the board's buffs change. */
  showBuff() {
    this.showHeart();
    const scene = this.scene;
    // Owl charge on an awakened unit shows in teal; any attack-speed bonus in gold.
    const teal = this.haste <= 0 && this.charge > 0;
    const amount = teal ? this.charge : this.haste;
    const color = teal ? 0x3fe0d0 : 0xffd93b;
    if (amount <= 0 || (this.buffBadge && this.buffBadge.getData("color") !== color)) {
      this.buffBadge?.destroy();
      this.buffRing?.destroy();
      this.buffBadge = this.buffRing = null;
      if (amount <= 0) return;
    }
    const label = `+${Math.round(amount * 100)}%`;
    if (!this.buffBadge) {
      const css = "#" + color.toString(16).padStart(6, "0");
      this.buffRing = scene.add.graphics();
      this.buffRing.lineStyle(4, color, 0.85).strokeEllipse(0, 0, 96, 36);
      this.buffRing.fillStyle(color, 0.12).fillEllipse(0, 0, 96, 36);
      scene.tweens.add({ targets: this.buffRing, alpha: { from: 1, to: 0.45 }, yoyo: true, repeat: -1, duration: 650, ease: "Sine.InOut" });
      const bg = scene.add.graphics();
      const icon = scene.add.image(-20, 0, teal ? "item:hourglass_speedup" : "stat:attack_speed").setDisplaySize(26, 26);
      const text = txt(scene, 0, 0, label, 18, css, [0, 0.5]).setName("label");
      this.buffBadge = scene.add.container(0, 0, [bg, icon, text]).setData("color", color);
    }
    const text = this.buffBadge.getByName("label") as Phaser.GameObjects.Text;
    const changed = text.text !== label;
    text.setText(label).setX(-6);
    const w = 26 + text.width + 10;
    const bg = this.buffBadge.list[0] as Phaser.GameObjects.Graphics;
    bg.clear().fillStyle(NAVY, 0.92).fillRoundedRect(-36, -16, w, 32, 16).lineStyle(2, color, 1).strokeRoundedRect(-36, -16, w, 32, 16);
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
    this.heart?.setVisible(on);
    this.statusIcons?.setVisible(on);
    this.buffBadge?.setVisible(on);
    this.buffRing?.setVisible(on);
    this.supportRing?.setVisible(on);
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
    this.drawStatus(now);
    if (now < this.frozenUntil || now < this.status.shockedUntil) {
      this.sprite.setTint(now < this.frozenUntil ? 0x7fd8ff : 0xb0a890);
      this.sprite.anims.timeScale = 0;
      return;
    }
    if (this.sprite.isTinted) {
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
    }
    this.alive += dt;

    if (this.def.effect === "irritate") {
      this.effectTimer += dt;
      if (this.effectTimer >= EFFECTS.irritate.every) {
        this.effectTimer = 0;
        this.scene.irritateNeighbours(this);
      }
    }
    if (this.def.arch === "buff" || this.def.arch === "aura" || this.def.arch === "aegis") {
      this.pulse -= dt;
      if (this.pulse <= 0) {
        this.pulse = 4;
        // Muse's "attack" clip is her buff pulse, the Aegis Knight's a shield pulse.
        this.playOnce(this.def.arch === "buff" ? "skill" : "attack");
      }
      return;
    }
    if (isSupport(this.def.arch)) {
      this.scene.updateSupport(this, dt);
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
      this.ult += dt * (1 + this.charge);
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
    const rate = speed * (1 + this.scene.hasteOf(this)) * this.scene.slowOf(this);
    this.cooldown -= dt;
    if (this.cooldown > 0 || this.sulking) return;
    const target = this.scene.pickTarget(this.def.arch === "sniper" ? "strongest" : "first");
    if (!target) return;
    this.cooldown = 1 / rate;
    // Speed the attack animation up if the unit fires faster than it plays.
    const animLen = 16 / 24;
    this.playOnce("attack", Math.max(1, animLen * rate));
    this.scene.fire(this, target);
  }

  destroy() {
    this.heart?.destroy();
    this.statusIcons?.destroy();
    this.aura?.destroy();
    this.buffBadge?.destroy();
    this.buffRing?.destroy();
    this.supportRing?.destroy();
    this.sprite.destroy();
    this.pips.destroy();
  }
}
