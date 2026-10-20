import Phaser from "phaser";
import { animKey, hasAnim, sheetScale, unitArt } from "../assets";
import { fxBusy, fxKey, fxSprite, fxTrack, hasFx } from "./vfx";
import { ELEMENT_COLOR, boostMult, type UnitDef } from "../data/units";
import { EFFECTS } from "../../../shared/effects.ts";
import { steam } from "./ultFx";
import { MURC_NAMES, mayAwaken, ultEvery, ultOf } from "../../../shared/awakened.ts";
import { kitPrimary } from "../../../shared/kit.ts";
import { BETA_SUPPORT, REWORKS } from "../../../shared/reworks.ts";
import { canBecome, isSupport, mirrorInterval, neighbours } from "../../../shared/support.ts";
import type { SimUnit } from "../../../shared/sim.ts";
import { NAVY, txt } from "../ui";
import type { BattleScene } from "../scenes/BattleScene";

/** v2.8.2 War Drums buff marker colour per stage (adjacent x1.2, adjacent x2.4, everyone x3). */
const DRUM_COLORS = [0xffb25a, 0xff7a3a, 0xff3a2a];

/** v2.8.1: when the last board-wide War Drums sweep started (one sweep for every Kodo on the board). */
let drumSweepAt = -1e9;

export const UNIT_PX = 116;
/** Awakened units stand a little taller. */
export const AWAKENED_PX = 132;

/** v2.10: an Echo Spirit's copy is drawn pale blue (ghostly), with its own rank in blue pips. */
const ECHO_TINT = 0xbfefff;

/** Whether a unit has awakened art (and so awakens at max rank). */
export const canAwaken = (id: string, arch?: string) => (!arch || !isSupport(arch as never)) && mayAwaken(id) && hasAnim("units_awakened", `${id}_idle`);

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
  private ultRing: Phaser.GameObjects.Graphics | null = null;
  private ultDrawn = -1;
  private steamAt = 0;
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
  /** A v2.2 board-rule look (tide water, sleep, glimmer, equal ground) is on the sprite. */
  private envShown = false;
  private wasReady = false;
  /** Idle show-off timer of buff and support units that have no real action to animate. */
  private showOff = 0;
  /** v2.7 epic looks: the Phoenix egg, Shadow clones, Luna's Blessing halo, the Black Plague kill tally. */
  private egg: Phaser.GameObjects.Image | Phaser.GameObjects.Ellipse | null = null;
  private clones: Phaser.GameObjects.Sprite[] = [];
  private halo: Phaser.GameObjects.Ellipse | null = null;
  private tally: Phaser.GameObjects.Container | null = null;
  /** v2.7 Big Ben clock ring and Frozen Fields ice aura. */
  private benRing: Phaser.GameObjects.Ellipse | null = null;
  private iceAura: Phaser.GameObjects.Ellipse | null = null;
  /** v2.8.2 Orc abilities: Grunt's Berserker rage, Headhunter's late-wave frenzy (a glow under the unit). */
  private orcAura: Phaser.GameObjects.Image | Phaser.GameObjects.Ellipse | null = null;
  private orcLevel = 0;
  private frenzy = false;
  private tallySeen = -1;

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
    this.sprite = scene.add.sprite(p.x, p.y, animKey(this.folder, `${this.art}_idle`));
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

  /** The art name for its sheets: a True Despair Murcielago has his own awakened art (when it is loaded). */
  get art() {
    if (this.awakened && this.sim.murc === "despair" && this.scene.anims.exists(animKey("units_awakened", "murcielago_despair_idle"))) return "murcielago_despair";
    return unitArt(this.def.id);
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
    this.ultRing?.setPosition(p.x, p.y + 30).setDepth(98 + p.y);
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
    // v2.8.2: War Drums haste counts too, and turns the marker drum orange (red at the board-wide stage).
    const drum = scene.sim.drumHaste(this.sim);
    const teal = this.sim.haste <= 0 && drum <= 0 && this.sim.charge > 0;
    const amount = teal ? this.sim.charge : this.sim.haste + drum;
    const color = teal ? 0x3fe0d0 : drum > 0 ? DRUM_COLORS[scene.sim.drums] ?? 0xff7a3a : 0xffd93b;
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
    // v2.10 Echo Spirit copy: its own rank (what it merges as), in ghostly blue.
    const n = this.sim.echoRank || this.rank;
    const gap = 11;
    const startX = x - ((n - 1) * gap) / 2;
    const py = y + 40;
    for (let i = 0; i < n; i++) {
      g.fillStyle(NAVY, 1).fillCircle(startX + i * gap, py, 6.5);
      g.fillStyle(this.sim.echoRank ? ECHO_TINT : n === 7 ? 0xffd93b : ELEMENT_COLOR[this.def.element], 1).fillCircle(startX + i * gap, py, 4.5);
    }
  }

  playIdle() {
    const key = animKey(this.folder, `${this.art}_idle`);
    const was = this.sprite.anims.currentAnim?.key;
    this.sprite.play(key, true);
    // Switching to the late-loaded awakened art: its frames may be a different size.
    if (was && was.split("/")[0] !== key.split("/")[0]) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setScale(this.baseScale);
    }
  }

  playOnce(anim: "attack" | "skill", timeScale = 1) {
    const key = animKey(this.folder, `${this.art}_${anim}`);
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

  /** Thin gold arc at the feet of an awakened unit: its ultimate charge (timer ultimates only). */
  private drawUltRing() {
    if (!this.awakened) return;
    const every = ultEvery(this.def.id);
    if (every <= 0) return;
    const f = Math.min(1, Math.max(0, this.sim.ult / every));
    if (this.ultRing && Math.abs(f - this.ultDrawn) < 0.02) return;
    this.ultDrawn = f;
    if (!this.ultRing) {
      const p = this.scene.slotPos(this.slot);
      this.ultRing = this.scene.add.graphics().setPosition(p.x, p.y + 30).setDepth(98 + p.y);
    }
    const g = this.ultRing;
    g.clear();
    g.lineStyle(4, 0x16213e, 0.45).strokeEllipse(0, 0, 100, 40);
    if (f > 0) {
      g.lineStyle(4, f >= 1 ? 0xffffff : 0xffd93b, 0.95).beginPath();
      const steps = Math.max(2, Math.ceil(36 * f));
      for (let i = 0; i <= steps; i++) {
        const a = -Math.PI / 2 + Math.PI * 2 * f * (i / steps);
        const x = Math.cos(a) * 50;
        const y = Math.sin(a) * 20;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }
  }

  /** Every frame: dress the sprite for what the Sim says this unit is doing. */
  update(dt: number) {
    if (this.dragging) return;
    const s = this.sim;
    const scene = this.scene;
    const now = scene.sim.now;
    if (s.slot !== this.slotSeen) this.place(s.slot);
    this.drawStatus(now);
    this.drawUltRing();
    this.epicLook(now);
    this.orcLook();

    // Buff badge and Muse's heart follow the Sim's haste, charge and aura numbers.
    const buff = `${s.haste.toFixed(3)}:${s.charge.toFixed(3)}:${s.auraSpeed > 0 || s.auraDamage > 0}:${scene.sim.drumHaste(s)}:${scene.sim.drums}`;
    if (buff !== this.buffSeen) {
      this.buffSeen = buff;
      this.showBuff();
    }

    const frozen = now < s.frozenUntil;
    if (frozen && !this.wasFrozen) scene.vfx("ice_burst", this.sprite.x, this.sprite.y - 20, 140);
    this.wasFrozen = frozen;
    // v2.2 board rules: submerged (high tide), asleep (siren song), glimmered (lantern beam), equal ground.
    const under = now < s.status.submergedUntil;
    const asleep = now < s.status.asleepUntil;
    if (frozen || now < s.status.shockedUntil || now < s.status.entangledUntil || asleep || s.jailed) {
      this.sprite.setTint(frozen ? 0x7fd8ff : now < s.status.entangledUntil ? 0x8fcf6a : asleep ? 0x8f98c8 : s.jailed ? 0x7f86a0 : 0xb0a890);
      this.sprite.setAlpha(under ? 0.55 : 1);
      this.sprite.anims.timeScale = 0;
      this.envShown = true;
      return;
    }
    // v2.7 Gear Engineer: Overheat glows orange-red, then the jam goes grey and steams.
    const hot = this.awakened && now < s.overheatUntil;
    const jam = this.awakened && !hot && now < s.jamUntil;
    if (jam && this.scene.time.now > this.steamAt) {
      this.steamAt = this.scene.time.now + 350;
      steam(this.scene, this.sprite.x + (Math.random() - 0.5) * 30, this.sprite.y - 50);
    }
    const env = hot ? (Math.sin(now * 12) > 0 ? 0xff7a4a : 0xff4a2a) : jam ? 0x8a8f9a : under ? 0x6fa8ff : now < s.status.glimmeredUntil ? 0xfff3b0 : now < scene.equalUntil ? 0xa8ffe8 : s.echoRank ? ECHO_TINT : null;
    if (env !== null) {
      this.sprite.setTint(env);
      this.sprite.setAlpha(under ? 0.55 + Math.sin(now * 4 + this.slot) * 0.08 : 1);
      this.sprite.setAngle(under ? Math.sin(now * 3 + this.slot) * 4 : 0);
      this.sprite.anims.timeScale = 1;
      this.envShown = true;
    } else if (this.envShown) {
      this.envShown = false;
      this.sprite.setAlpha(1).setAngle(0);
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
    } else if (this.sprite.isTinted) {
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
    }

    const arch = kitPrimary(this.def);
    // v2.8 Kodo Beasts: drum rings, faster and redder at each War Drums stage.
    if (this.def.id === "kodo_beasts") this.drumRings(dt, scene.sim.drums);
    if (arch === "buff" || arch === "aura" || arch === "aegis") {
      // Muse's "attack" clip is her buff pulse, the Aegis Knight's a shield pulse.
      this.showOff -= dt;
      if (this.showOff <= 0) {
        this.showOff = 4;
        // v2.8 Peon and Kodo Beasts swing (their sheets have no skill clip).
        this.playOnce(arch === "buff" && !BETA_SUPPORT.has(this.def.id) ? "skill" : "attack");
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

  /**
   * v2.8.2 Orc ability looks. Grunt: a red rage glow that grows with each Berserker tier. Headhunter:
   * a gold frenzy glow from the wave his Berserker Upgrade starts (with a FRENZY! callout).
   */
  private orcLook() {
    const id = this.def.id;
    if (id !== "grunt" && id !== "headhunter") return;
    const sc = this.scene;
    const hh = REWORKS.headhunter.upgrade;
    const level = id === "grunt" ? this.sim.berserk : sc.sim.wave >= hh.fastWave ? 2 : 0;
    if (id === "headhunter") {
      const on = level > 0;
      if (on && !this.frenzy) {
        this.callout("FRENZY!", "#6fd8ff");
        fxSprite(sc, "merge_flash", this.sprite.x, this.sprite.y - 30, { size: 200, life: 500, from: 0.4, tint: 0x6fd8ff });
      }
      this.frenzy = on;
    }
    if (level !== this.orcLevel) {
      this.orcLevel = level;
      this.orcAura?.destroy();
      this.orcAura = null;
      if (level > 0) {
        // A ground ring at the feet: fire for the Grunt (redder from tier 3), lightning for the Headhunter.
        const key = id === "grunt" ? "aura_fire" : "aura_lightning";
        const color = id === "grunt" ? 0xff3a2a : 0x6fd8ff;
        this.orcAura = hasFx(sc, key) ? sc.add.image(0, 0, fxKey(key)) : sc.add.ellipse(0, 0, 120, 60, color, 0.35);
        if (id === "grunt" && level >= 3 && this.orcAura instanceof Phaser.GameObjects.Image) this.orcAura.setTint(0xff7a6a);
      }
    }
    const a = this.orcAura;
    if (!a) return;
    // Bigger and brighter per tier; a heartbeat pulse with no tween (one image, moved every frame).
    const t = sc.time.now / (id === "grunt" ? 160 - level * 15 : 110);
    const base = ((id === "grunt" ? 80 + level * 14 : 110) / Math.max(1, a.width)) * (1 + Math.sin(t) * 0.06);
    a.setScale(base, base * 0.55).setAlpha((id === "grunt" ? 0.55 + level * 0.1 : 0.85) + Math.sin(t) * 0.1);
    const p = sc.slotPos(this.slot);
    a.setPosition(p.x, p.y + 30).setDepth(98 + p.y).setVisible(!this.dragging);
  }

  private drumAt = 0;
  /**
   * v2.8 War Drums: a ring pulses from the Kodo (vfx/drum_ring, or a drawn ring). At stage 2 it sweeps the whole board.
   * v2.8.1: slower pulses, and the board-wide sweep is one ring for the whole board (from the centre), not one huge ring per Kodo.
   */
  private drumRings(dt: number, stage: number) {
    if (stage < 0) return;
    this.drumAt -= dt;
    if (this.drumAt > 0) return;
    this.drumAt = [1.6, 1.1, 1.1][stage] ?? 1.6;
    if (fxBusy()) return;
    const color = [0xffb25a, 0xff7a3a, 0xff3a2a][stage] ?? 0xffb25a;
    if (stage === 2) {
      const now = this.scene.time.now;
      if (now - drumSweepAt < 1000) return;
      drumSweepAt = now;
    }
    const reach = stage === 2 ? 480 : 150;
    // The sweep starts from the board's middle tile (slot 7 of the 5x3 grid).
    const mid = this.scene.slotPos(7);
    const x = stage === 2 ? mid.x : this.sprite.x;
    const y = stage === 2 ? mid.y + 10 : this.sprite.y + 10;
    const depth = this.sprite.depth - 1;
    const ring: Phaser.GameObjects.Image | Phaser.GameObjects.Arc = hasFx(this.scene, "drum_ring")
      ? this.scene.add.image(x, y, fxKey("drum_ring")).setTint(color)
      : this.scene.add.circle(x, y, 50).setStrokeStyle(6, color, 0.9);
    fxTrack(ring);
    const base = 100 / Math.max(1, ring.width);
    ring.setScale(base * 0.5, base * 0.5 * 0.55).setDepth(depth).setAlpha(0.9);
    const end = (reach * 2) / Math.max(1, ring.width);
    this.scene.tweens.add({ targets: ring, scaleX: end, scaleY: end * 0.55, alpha: 0, duration: stage === 2 ? 900 : 650, ease: "Sine.Out", onComplete: () => ring.destroy() });
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

  /** v2.7 epic ultimates that change how the unit itself looks. */
  private epicLook(now: number) {
    const s = this.sim;
    const sc = this.scene;
    const { x, y } = this.sprite;
    const depth = this.sprite.depth;
    // Reborn: the Phoenix Chick sits as a rocking egg until it hatches.
    const egg = now < s.eggUntil;
    if (egg && !this.egg) {
      const img = hasFx(sc, "phoenix_egg") ? sc.add.image(x, y + 24, fxKey("phoenix_egg")).setOrigin(0.5, 0.85) : null;
      this.egg = img ? img.setScale(96 / Math.max(1, img.height)) : sc.add.ellipse(x, y - 10, 56, 72, 0xff9a3b, 1).setStrokeStyle(4, 0xffe08a);
      this.egg.setDepth(depth + 1);
      sc.tweens.add({ targets: this.egg, angle: { from: -7, to: 7 }, yoyo: true, repeat: -1, duration: 170, ease: "Sine.InOut" });
      this.sprite.setVisible(false);
    } else if (!egg && this.egg) {
      sc.tweens.killTweensOf(this.egg);
      this.egg.destroy();
      this.egg = null;
      this.sprite.setVisible(true);
    }
    if (this.egg && sc.time.now > this.steamAt) {
      this.steamAt = sc.time.now + 160;
      steam(sc, x + (Math.random() - 0.5) * 44, y - 30, Math.random() < 0.5 ? 0xffb35c : 0xff6a2a);
    }
    // Shadow Clones: two dark copies mirror every frame of the ninja.
    const cloned = now < s.clonesUntil;
    if (cloned && !this.clones.length) {
      for (const side of [-1, 1]) {
        const c = sc.add.sprite(x + side * 48, y, this.sprite.texture.key, this.sprite.frame.name).setOrigin(0.5, 0.62);
        c.setScale(this.sprite.scaleX * 0.92, this.sprite.scaleY * 0.92).setTint(0x2a1f45).setAlpha(0).setDepth(depth - 1);
        sc.tweens.add({ targets: c, alpha: 0.7, duration: 200 });
        sc.vfx("shadow_smoke", c.x, y - 10, 110);
        this.clones.push(c);
      }
    } else if (!cloned && this.clones.length) {
      for (const c of this.clones) sc.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
      this.clones = [];
    }
    for (const [i, c] of this.clones.entries()) {
      c.setTexture(this.sprite.texture.key, this.sprite.frame.name).setFlipX(this.sprite.flipX);
      c.setPosition(x + (i ? 48 : -48), y + Math.sin(now * 3 + i) * 3);
    }
    // Luna's Blessing: a pale moon halo over the head while any blessing lasts.
    const blessed = s.blessings.some((t) => t > now);
    if (blessed && !this.halo) {
      this.halo = sc.add.ellipse(x, y, 62, 18).setStrokeStyle(5, 0xdfe8ff, 0.95).setDepth(depth + 2);
      sc.tweens.add({ targets: this.halo, alpha: { from: 1, to: 0.5 }, yoyo: true, repeat: -1, duration: 500 });
    } else if (!blessed && this.halo) {
      sc.tweens.killTweensOf(this.halo);
      this.halo.destroy();
      this.halo = null;
    }
    this.halo?.setPosition(x, y - this.px * 0.72);
    // Big Ben: a golden ring ticks round the unit while it attacks faster.
    const ben = now < s.benUntil;
    if (ben && !this.benRing) {
      this.benRing = sc.add.ellipse(x, y, 96, 30).setStrokeStyle(4, 0xffd86b, 0.95).setDepth(depth - 1);
      sc.tweens.add({ targets: this.benRing, scaleX: { from: 1, to: 1.15 }, scaleY: { from: 1, to: 1.15 }, yoyo: true, repeat: -1, duration: 250 });
    } else if (!ben && this.benRing) {
      sc.tweens.killTweensOf(this.benRing);
      this.benRing.destroy();
      this.benRing = null;
    }
    this.benRing?.setPosition(x, y + 20);
    // Frozen Fields: the Crystal Queen glows with ice while she holds it (no attacks).
    const ice = now < s.frostUntil;
    if (ice && !this.iceAura) {
      this.iceAura = sc.add.ellipse(x, y, 120, 150, 0x9fe0ff, 0.25).setStrokeStyle(4, 0xdff6ff, 0.9).setDepth(depth - 1);
      sc.tweens.add({ targets: this.iceAura, alpha: { from: 1, to: 0.55 }, yoyo: true, repeat: -1, duration: 700 });
    } else if (!ice && this.iceAura) {
      sc.tweens.killTweensOf(this.iceAura);
      this.iceAura.destroy();
      this.iceAura = null;
    }
    this.iceAura?.setPosition(x, y - this.px * 0.25);
    // Black Plague: a skull and the kill count (each kill brings more puddles). Star Merger: a star and the ranks absorbed.
    const star = this.awakened && ultOf(this.def.id)?.id === "star_merger";
    if (star) {
      if (!this.tally) {
        const icon = hasFx(sc, "pt_star") ? sc.add.image(-16, 0, fxKey("pt_star")) : null;
        if (icon) icon.setScale(30 / Math.max(1, icon.height));
        const label = txt(sc, 4, 0, "0", 22, "#ffe27a", [0, 0.5]);
        this.tally = sc.add.container(0, 0, icon ? [icon, label] : [sc.add.star(-16, 0, 5, 6, 13, 0xffe27a), label]);
      }
      this.tally.setPosition(x + 30, y - this.px * 0.62).setDepth(depth + 2);
      if (s.absorbed !== this.tallySeen) {
        this.tallySeen = s.absorbed;
        (this.tally.list[1] as Phaser.GameObjects.Text).setText(String(s.absorbed));
        sc.tweens.add({ targets: this.tally, scale: { from: 1.5, to: 1 }, duration: 260 });
      }
    }
    // v2.10 Murcielago: the ultimate he rolled, over his head.
    if (this.awakened && this.sim.murc) {
      if (!this.tally) {
        const color = this.sim.murc === "despair" ? "#c8c8c8" : "#5dffb0";
        this.tally = sc.add.container(0, 0, [txt(sc, 0, 0, MURC_NAMES[this.sim.murc].toUpperCase(), 16, color)]);
      }
      this.tally.setPosition(x, y - this.px * 0.7).setDepth(depth + 2);
    }
    // v2.10 Surgeon of Death: a cube and the Surgeons merged into him.
    if (this.awakened && ultOf(this.def.id)?.id === "surgeon_of_death") {
      if (!this.tally) {
        const cube = sc.add.rectangle(-16, 0, 16, 16, 0x9ff6ff, 0.95).setStrokeStyle(3, 0xffffff).setAngle(45);
        const label = txt(sc, 4, 0, "x1", 22, "#7ff3ff", [0, 0.5]);
        this.tally = sc.add.container(0, 0, [cube, label]);
      }
      this.tally.setPosition(x + 30, y - this.px * 0.62).setDepth(depth + 2);
      if (s.surgeons !== this.tallySeen) {
        this.tallySeen = s.surgeons;
        (this.tally.list[1] as Phaser.GameObjects.Text).setText(`x${s.surgeons}`);
        sc.tweens.add({ targets: this.tally, scale: { from: 1.5, to: 1 }, duration: 260 });
      }
    }
    if (this.awakened && ultOf(this.def.id)?.id === "black_plague") {
      if (!this.tally) {
        const icon = hasFx(sc, "plague_skull") ? sc.add.image(-16, 0, fxKey("plague_skull")) : null;
        if (icon) icon.setScale(30 / Math.max(1, icon.height));
        const label = txt(sc, 4, 0, "0", 22, "#b6ff7a", [0, 0.5]);
        this.tally = sc.add.container(0, 0, icon ? [icon, label] : [sc.add.circle(-16, 0, 11, 0x2f4a1a).setStrokeStyle(2, 0xb6ff7a), label]);
      }
      this.tally.setPosition(x + 30, y - this.px * 0.62).setDepth(depth + 2);
      if (s.kills !== this.tallySeen) {
        this.tallySeen = s.kills;
        (this.tally.list[1] as Phaser.GameObjects.Text).setText(String(s.kills));
        sc.tweens.add({ targets: this.tally, scale: { from: 1.35, to: 1 }, duration: 200 });
      }
    }
  }

  destroy() {
    this.egg?.destroy();
    this.clones.forEach((c) => c.destroy());
    this.halo?.destroy();
    this.tally?.destroy();
    this.benRing?.destroy();
    this.iceAura?.destroy();
    this.orcAura?.destroy();
    this.heart?.destroy();
    this.statusIcons?.destroy();
    this.aura?.destroy();
    this.ultRing?.destroy();
    this.auraRing?.destroy();
    this.buffBadge?.destroy();
    this.buffRing?.destroy();
    this.supportRing?.destroy();
    this.sprite.destroy();
    this.pips.destroy();
  }
}
