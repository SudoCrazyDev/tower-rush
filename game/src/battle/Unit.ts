import Phaser from "phaser";
import { animKey, hasAnim, sheetScale } from "../assets";
import { fxKey, hasFx } from "./vfx";
import { ELEMENT_COLOR, boostMult, type UnitDef } from "../data/units";
import { EFFECTS } from "../../../shared/effects.ts";
import { kitPrimary } from "../../../shared/kit.ts";
import { canBecome, isSupport, mirrorInterval, neighbours } from "../../../shared/support.ts";
import type { SimUnit } from "../../../shared/sim.ts";
import { NAVY, txt } from "../ui";
import type { BattleScene } from "../scenes/BattleScene";

export const UNIT_PX = 116;
/** Awakened units stand a little taller. */
export const AWAKENED_PX = 132;

/** Whether a unit has awakened art (and so awakens at max rank). */
export const canAwaken = (id: string, arch?: string) => (!arch || !isSupport(arch as never)) && hasAnim("units_awakened", `${id}_idle`);

/**
 * A defender standing on one of the 15 board tiles: the sprite and badges for a SimUnit.
 * It holds no combat state; everything it shows is read from the Sim every frame.
 */
export class Unit {
  readonly scene: BattleScene;
  readonly sim: SimUnit;
  readonly def: UnitDef;
  readonly rank: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly pips: Phaser.GameObjects.Graphics;
  /** Being dragged by the player (the Sim has it frozen too: see Sim.setDragging). */
  dragging = false;
  /** Max rank with awakened art: stronger, and fires ultimates. */
  readonly awakened: boolean;
  private statusIcons: Phaser.GameObjects.Container | null = null;
  private statusDrawn = "";
  private heart: Phaser.GameObjects.Text | null = null;
  /** Ready / recharge ring at the feet of support units with a timer. */
  private supportRing: Phaser.GameObjects.Graphics | null = null;
  private supportDrawn = "";
  private aura: Phaser.GameObjects.Graphics | null = null;
  /** v2 art: the element aura ring under an awakened unit (drawn when aura_<element> is built). */
  private auraRing: Phaser.GameObjects.Image | null = null;
  /** Shown while a neighbouring buff unit speeds this one up: icon and the bonus. */
  private buffBadge: Phaser.GameObjects.Container | null = null;
  private buffRing: Phaser.GameObjects.Graphics | null = null;
  /** When the last callout went up, so rapid-fire units don't stack them. */
  private calloutAt = -1;
  // What the last frame saw, to turn Sim state changes into animations.
  private firedSeen: number;
  private buffSeen = "";
  private slotSeen: number;
  private wasFrozen = false;
  private wasReady = false;
  /** Idle show-off timer of buff and support units that have no real action to animate. */
  private showOff = 0;

  constructor(scene: BattleScene, sim: SimUnit) {
    this.scene = scene;
    this.sim = sim;
    this.def = sim.def;
    this.rank = sim.rank;
    this.slotSeen = sim.slot;
    this.firedSeen = sim.firedAt;
    this.awakened = sim.awakened;
    const p = scene.slotPos(sim.slot);
    if (this.awakened) {
      this.aura = scene.add.graphics();
      this.aura.fillStyle(0xffd93b, 0.28).fillEllipse(0, 0, 112, 46);
      this.aura.fillStyle(0xffffff, 0.22).fillEllipse(0, 0, 70, 26);
      if (hasFx(scene, `aura_${this.def.element}`)) {
        this.auraRing = scene.add.image(0, 0, fxKey(`aura_${this.def.element}`));
        this.auraRing.setScale(140 / Math.max(1, this.auraRing.width));
        scene.tweens.add({ targets: this.auraRing, alpha: { from: 1, to: 0.65 }, yoyo: true, repeat: -1, duration: 700, ease: "Sine.InOut" });
        this.aura.setVisible(false);
      }
      scene.tweens.add({ targets: this.aura, scale: { from: 0.85, to: 1.12 }, alpha: { from: 1, to: 0.6 }, yoyo: true, repeat: -1, duration: 700, ease: "Sine.InOut" });
    }
    this.sprite = scene.add.sprite(p.x, p.y, animKey(this.folder, `${this.def.id}_idle`));
    this.sprite.setScale(this.baseScale).setOrigin(0.5, 0.62);
    this.playIdle();
    this.pips = scene.add.graphics();
    this.place(sim.slot);
    this.sprite.setInteractive({ draggable: true, useHandCursor: true });
    (this.sprite as Phaser.GameObjects.Sprite & { unit?: Unit }).unit = this;
  }

  get slot() {
    return this.sim.slot;
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
    this.slotSeen = slot;
    const p = this.scene.slotPos(slot);
    this.sprite.setPosition(p.x, p.y).setDepth(100 + p.y);
    this.aura?.setPosition(p.x, p.y + 30).setDepth(99 + p.y);
    this.auraRing?.setPosition(p.x, p.y + 30).setDepth(99 + p.y);
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
    const on = this.sim.auraSpeed > 0 || this.sim.auraDamage > 0;
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
    const s = this.sim.status;
    const on = [
      now < s.rallyUntil && "rally",
      now < s.irritatedUntil && "irritation",
      (now < s.fatiguedUntil || this.sim.sulking) && "fatigue",
      now < s.shockedUntil && "shellshock",
      now < s.entangledUntil && this.scene.textures.exists("ui:status_entangled") && "entangled",
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
    const teal = this.sim.haste <= 0 && this.sim.charge > 0;
    const amount = teal ? this.sim.charge : this.sim.haste;
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

  /** Every frame: dress the sprite for what the Sim says this unit is doing. */
  update(dt: number) {
    if (this.dragging) return;
    const s = this.sim;
    const scene = this.scene;
    const now = scene.sim.now;
    if (s.slot !== this.slotSeen) this.place(s.slot);
    this.drawStatus(now);

    // Buff badge and Muse's heart follow the Sim's haste, charge and aura numbers.
    const buff = `${s.haste.toFixed(3)}:${s.charge.toFixed(3)}:${s.auraSpeed > 0 || s.auraDamage > 0}`;
    if (buff !== this.buffSeen) {
      this.buffSeen = buff;
      this.showBuff();
    }

    const frozen = now < s.frozenUntil;
    if (frozen && !this.wasFrozen) scene.vfx("ice_burst", this.sprite.x, this.sprite.y - 20, 140);
    this.wasFrozen = frozen;
    if (frozen || now < s.status.shockedUntil || now < s.status.entangledUntil) {
      this.sprite.setTint(frozen ? 0x7fd8ff : now < s.status.entangledUntil ? 0x8fcf6a : 0xb0a890);
      this.sprite.anims.timeScale = 0;
      return;
    }
    if (this.sprite.isTinted) {
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
    }

    const arch = kitPrimary(this.def);
    if (arch === "buff" || arch === "aura" || arch === "aegis") {
      // Muse's "attack" clip is her buff pulse, the Aegis Knight's a shield pulse.
      this.showOff -= dt;
      if (this.showOff <= 0) {
        this.showOff = 4;
        this.playOnce(arch === "buff" ? "skill" : "attack");
      }
      return;
    }
    if (isSupport(arch)) this.updateSupport(dt);

    // It attacked (or brewed) since the last frame: play the clip, faster if the unit fires faster than it plays.
    if (s.firedAt !== this.firedSeen) {
      this.firedSeen = s.firedAt;
      const rate = s.stats.speed * (1 + scene.sim.hasteOf(s)) * (now < s.status.fatiguedUntil ? 1 - EFFECTS.fatigue.slow : 1);
      this.playOnce("attack", Math.max(1, (16 / 24) * rate));
    }
  }

  /** Support units: the timer ring, ready flashes, the Mirror Slime's wobble, idle show-offs. */
  private updateSupport(dt: number) {
    const scene = this.scene;
    const s = this.sim;
    const progress = scene.sim.supportProgress(s.slot);
    switch (kitPrimary(this.def)) {
      case "mime":
      case "portal": {
        const p = progress ?? 0;
        this.drawSupportRing(p, kitPrimary(this.def) === "mime" ? 0x59d64a : 0xff8a3b);
        const ready = p >= 1;
        if (ready && !this.wasReady) this.playOnce("skill");
        this.wasReady = ready;
        return;
      }
      case "mirror": {
        const p = progress ?? 0;
        this.drawSupportRing(p, 0xc58bff);
        const every = mirrorInterval(s.rank, boostMult(scene.cardLevel(this.def.id), scene.sim.powerLevel(this.def.id)));
        const options = neighbours(s.slot).some((j) => { const v = scene.sim.units[j]; return !!v && !v.dragging && canBecome(s, v); });
        if (options && every * (1 - p) <= EFFECTS.mirror.warn && !this.sprite.getData("wobble")) {
          this.sprite.setData("wobble", true);
          scene.tweens.add({ targets: this.sprite, angle: { from: -8, to: 8 }, yoyo: true, repeat: 5, duration: 140, onComplete: () => this.sprite.active && this.sprite.setAngle(0) });
        }
        return;
      }
      case "brewer":
        return;
      default:
        // Auras (Lucky Cat, Hourglass Owl, Echo Spirit, Banner Herald) just show off now and then.
        this.showOff -= dt;
        if (this.showOff <= 0) {
          this.showOff = 4;
          this.playOnce("skill");
        }
    }
  }

  destroy() {
    this.heart?.destroy();
    this.statusIcons?.destroy();
    this.aura?.destroy();
    this.auraRing?.destroy();
    this.buffBadge?.destroy();
    this.buffRing?.destroy();
    this.supportRing?.destroy();
    this.sprite.destroy();
    this.pips.destroy();
  }
}
