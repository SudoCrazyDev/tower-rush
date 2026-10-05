import Phaser from "phaser";
import { animKey, hasAnim, sheetScale } from "../assets";
import type { MonsterDef, BossDef } from "../data/monsters";
import { fmt, txt } from "../ui";
import type { Path } from "./path";
import type { BattleScene } from "../scenes/BattleScene";
import { PERK, perkMult, type Perk } from "../../../shared/perks.ts";

export interface HitOpts {
  crit?: boolean;
  /** Ignores dodge (damage over time, splash). */
  sure?: boolean;
  color?: string;
  quiet?: boolean;
  /** Perks of the unit that hit. */
  perks?: readonly Perk[];
}

/** White blended toward the corruption's violet by `k` (0-1). */
export function corruptTint(k: number) {
  const mix = (a: number, b: number) => Math.round(a + (b - a) * Math.min(1, k) * 0.75);
  return (mix(255, 0xb0) << 16) | (mix(255, 0x70) << 8) | mix(255, 0xff);
}

/** A walking enemy (regular monster or boss). */
export class Monster {
  readonly scene: BattleScene;
  readonly def: MonsterDef | null;
  readonly boss: BossDef | null;
  readonly folder: "monsters" | "bosses";
  readonly id: string;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly label: Phaser.GameObjects.Text;
  path: Path;
  dist = 0;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  size: number;
  mana: number;
  dead = false;
  /** Set once the monster is done (killed or leaked) so units stop targeting it. */
  gone = false;

  slowPct = 0;
  slowUntil = 0;
  frozenUntil = 0;
  stunUntil = 0;
  hasteUntil = 0;
  shieldUntil = 0;
  curse = 0;
  poison: { dps: number; until: number }[] = [];
  burn = { dps: 0, until: 0 };
  powerTimer = 0;
  intro = 0;
  /** v1.2 story corruption, 0-1: a violet tint drawn in code (the art is clean). */
  corruption = 0;
  /** HP stages a split, layers or portal boss has passed (each quarter or third of its HP). */
  stage = 0;
  /** The Corrupted Bear's roar has gone off. */
  roared = false;
  /** Shedding a Jawbreaker layer makes it faster. */
  speedMult = 1;
  /** Tint of the current Jawbreaker layer. */
  layerTint: number | null = null;
  private bob = Math.random() * 10;
  private flashUntil = 0;

  constructor(
    scene: BattleScene,
    kind: { def?: MonsterDef; boss?: BossDef },
    path: Path,
    hp: number,
    opts: { dist?: number; scale?: number; mana: number },
  ) {
    this.scene = scene;
    this.def = kind.def ?? null;
    this.boss = kind.boss ?? null;
    this.folder = this.boss ? "bosses" : "monsters";
    this.id = (this.boss ?? this.def)!.id;
    this.path = path;
    this.dist = opts.dist ?? 0;
    this.hp = this.maxHp = hp;
    this.baseSpeed = this.boss ? this.boss.speed : this.def!.speed;
    this.size = (this.boss ? 190 : this.def!.size) * (opts.scale ?? 1);
    this.mana = opts.mana;

    const p = path.at(this.dist);
    this.sprite = scene.add.sprite(p.x, p.y, animKey(this.folder, `${this.id}_walk`));
    this.sprite.setScale(sheetScale(this.folder, this.size)).setOrigin(0.5, 0.85);
    this.sprite.play({ key: animKey(this.folder, `${this.id}_walk`), startFrame: Math.floor(Math.random() * 16) });
    this.label = txt(scene, p.x, p.y, fmt(hp), this.boss ? 26 : 20);
    if (this.boss && hasAnim("bosses", `${this.id}_intro`)) {
      this.intro = 1.4;
      this.sprite.play(animKey("bosses", `${this.id}_intro`));
    }
    this.sync(0);
  }

  get progress() {
    return this.dist / this.path.length;
  }

  get pos() {
    return { x: this.sprite.x, y: this.sprite.y - this.size * 0.35 };
  }

  has(trait: string) {
    return (this.def?.traits ?? this.boss?.traits ?? []).includes(trait as never);
  }

  /** Current movement speed after slows/haste. */
  speed(now: number) {
    if (now < this.frozenUntil || now < this.stunUntil) return 0;
    let s = this.baseSpeed * this.speedMult;
    if (now < this.slowUntil) s *= 1 - this.slowPct;
    if (now < this.hasteUntil) s *= 1.8;
    return s;
  }

  update(dt: number, now: number) {
    if (this.dead) return;
    if (this.intro > 0) {
      this.intro -= dt;
      if (this.intro <= 0) this.sprite.play(animKey("bosses", `${this.id}_walk`));
    } else {
      this.dist += this.speed(now) * dt;
    }

    // Damage over time.
    let dot = 0;
    this.poison = this.poison.filter((p) => p.until > now);
    for (const p of this.poison) dot += p.dps;
    if (this.burn.until > now) dot += this.burn.dps;
    if (dot > 0) this.damage(dot * dt, { sure: true, quiet: true });

    const frozen = now < this.frozenUntil;
    this.sprite.anims.timeScale = frozen || now < this.stunUntil ? 0 : 1;
    this.sync(now);
  }

  sync(now: number) {
    const p = this.path.at(this.dist);
    this.bob += 0.15;
    this.sprite.setPosition(p.x, p.y + Math.sin(this.bob) * 1.5);
    this.sprite.setDepth(100 + p.y);
    this.label.setPosition(p.x, p.y - this.size * 0.82).setDepth(1500 + p.y);

    let tint: number | null = null;
    if (now < this.frozenUntil) tint = 0x7fd8ff;
    else if (now < this.shieldUntil) tint = 0x9fb4ff;
    else if (this.poison.length) tint = 0xc89bff;
    else if (now < this.slowUntil) tint = 0xb8e8ff;
    else if (this.burn.until > now) tint = 0xffb38a;
    else if (this.layerTint !== null) tint = this.layerTint;
    else if (this.corruption > 0) tint = corruptTint(this.corruption);
    if (now < this.flashUntil) this.sprite.setTintFill(0xffffff);
    else if (tint !== null) this.sprite.setTint(tint);
    else this.sprite.clearTint();
  }

  /** Apply damage; returns true if this hit killed the monster. */
  damage(amount: number, opts: HitOpts = {}) {
    if (this.dead) return false;
    const now = this.scene.now;
    if (now < this.shieldUntil) {
      if (!opts.quiet) this.scene.floater(this.pos.x, this.pos.y - 20, "BLOCK", "#9fb4ff", 20);
      return false;
    }
    const perks = opts.perks ?? [];
    if (!opts.sure && this.has("dodge") && !perks.includes("true_strike") && Math.random() < 0.15) {
      this.scene.floater(this.pos.x, this.pos.y - 20, "MISS", "#dddddd", 20);
      return false;
    }
    let dmg = amount * (1 + this.curse) * perkMult(perks, this);
    if (this.has("armored") && !perks.includes("armor_breaker")) dmg *= 0.7;
    this.hp -= dmg;
    if (!opts.quiet) {
      this.flashUntil = now + 0.06;
      if (opts.crit) this.scene.critFloater(this.pos.x, this.pos.y - 24, fmt(dmg) + "!", opts.color ?? "#ffd93b");
    }
    this.label.setText(fmt(Math.max(0, this.hp)));
    if (this.hp <= 0) {
      this.die();
      if (perks.includes("plunder")) this.scene.gainMana(PERK.plunder, this.pos.x, this.pos.y - 40);
      return true;
    }
    return false;
  }

  heal(amount: number) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.label.setText(fmt(this.hp));
  }

  die() {
    if (this.dead) return;
    this.dead = this.gone = true;
    this.scene.onMonsterKilled(this);
    this.label.destroy();
    const key = animKey(this.folder, `${this.id}_death`);
    if (this.scene.anims.exists(key)) {
      this.sprite.clearTint();
      this.sprite.anims.timeScale = 1;
      this.sprite.play(key);
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.sprite.destroy());
    } else {
      this.scene.tweens.add({ targets: this.sprite, alpha: 0, scale: 0, duration: 250, onComplete: () => this.sprite.destroy() });
    }
  }

  /** Remove without the death animation (leaked through the gate). */
  remove() {
    this.dead = this.gone = true;
    this.label.destroy();
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 200, onComplete: () => this.sprite.destroy() });
  }
}
