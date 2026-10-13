/**
 * v2.7 field layer: draws what units leave on the path (Sim.fields: puddles, mushrooms, rag dolls,
 * prickly vines, vineyards, hives) one sprite per field id, plus the Scorched Earth glow (Sim.scorch).
 * Every texture use is guarded; a missing vfx falls back to a plain shape.
 */
import Phaser from "phaser";
import type { Sim, SimField } from "../../../shared/sim.ts";
import { fxKey, hasFx } from "./vfx";
import { ARENA_W, ARENA_H } from "../ui";

type Obj = Phaser.GameObjects.Image | Phaser.GameObjects.Ellipse;
type Scene = Phaser.Scene & { sim: Sim };

interface Entry {
  f: SimField;
  obj: Obj;
  extra: Phaser.GameObjects.GameObject[];
  /** mushroom: grown art swapped in. */
  grown: boolean;
  /** Natural scale the idle tweens pulse around. */
  base: number;
}

const GROUND_DEPTH = 50;
const GREEN = 0x9be27a;

const fitW = (img: Phaser.GameObjects.Image, w: number) => img.setScale(w / Math.max(1, img.width));
const fitH = (img: Phaser.GameObjects.Image, h: number) => img.setScale(h / Math.max(1, img.height));

export class FieldLayer {
  private entries = new Map<number, Entry>();
  private scorchG: Phaser.GameObjects.Rectangle | null = null;
  private emberAt = 0;

  constructor(private scene: Scene) {}

  /** Call every frame. */
  update() {
    const sim = this.scene.sim;
    const fields = sim.fields ?? [];
    const now = sim.now;
    const live = new Set<number>();
    for (const f of fields) {
      live.add(f.id);
      let e = this.entries.get(f.id);
      if (!e) {
        e = this.make(f);
        this.entries.set(f.id, e);
      }
      this.tick(e, now);
    }
    for (const [id, e] of this.entries) {
      if (live.has(id)) continue;
      this.entries.delete(id);
      this.remove(e);
    }
    this.scorch(now);
  }

  destroy() {
    for (const e of this.entries.values()) {
      this.scene.tweens.killTweensOf([e.obj, ...e.extra]);
      e.obj.destroy();
      e.extra.forEach((x) => x.destroy());
    }
    this.entries.clear();
    this.scorchG?.destroy();
    this.scorchG = null;
  }

  private image(key: string, x: number, y: number) {
    return hasFx(this.scene, key) ? this.scene.add.image(x, y, fxKey(key)) : null;
  }

  private make(f: SimField): Entry {
    const sc = this.scene;
    const extra: Phaser.GameObjects.GameObject[] = [];
    let obj: Obj;
    let base = 1;
    const prop = 100 + f.y;
    switch (f.kind) {
      case "puddle": {
        const img = this.image("ground_poison", f.x, f.y);
        if (img) obj = fitW(img, f.radius * 2).setDepth(GROUND_DEPTH);
        else obj = sc.add.ellipse(f.x, f.y, f.radius * 2, f.radius * 1.2, 0x7bd13a, 0.5).setDepth(GROUND_DEPTH);
        break;
      }
      case "mushroom": {
        const img = this.image("mushroom_sprout", f.x, f.y);
        if (img) obj = img.setOrigin(0.5, 0.85).setDepth(prop);
        else obj = sc.add.ellipse(f.x, f.y - 10, 24, 28, 0xb07bd8, 1).setDepth(prop);
        break;
      }
      case "doll": {
        const ring = sc.add.graphics().setPosition(f.x, f.y).setDepth(GROUND_DEPTH + 1);
        ring.fillStyle(0x7fe8ff, 0.1).fillCircle(0, 0, f.radius);
        ring.lineStyle(3, 0xffe45c, 0.55).strokeCircle(0, 0, f.radius);
        ring.setScale(1, 0.7);
        extra.push(ring);
        sc.tweens.add({ targets: ring, alpha: { from: 0.5, to: 1 }, duration: 260, yoyo: true, repeat: -1 });
        const img = this.image("rag_doll", f.x, f.y);
        if (img) obj = fitH(img.setOrigin(0.5, 0.92), 90).setDepth(prop);
        else obj = sc.add.ellipse(f.x, f.y - 40, 30, 70, 0xc9a56b, 1).setDepth(prop);
        sc.tweens.add({ targets: obj, alpha: { from: 0.8, to: 1 }, duration: 120 + Math.random() * 80, yoyo: true, repeat: -1 });
        break;
      }
      case "vine": {
        const img = this.image("prickly_vine", f.x, f.y);
        if (img) obj = fitW(img.setOrigin(0.5, 0.75).setTint(GREEN), f.radius * 2).setDepth(prop);
        else obj = sc.add.ellipse(f.x, f.y - 10, f.radius * 1.6, 30, 0x4aa832, 0.9).setDepth(prop);
        break;
      }
      case "vineyard": {
        const a = f.path.at(f.dist - 10);
        const b = f.path.at(f.dist + 10);
        let ang = Math.atan2(b.y - a.y, b.x - a.x);
        if (ang > Math.PI / 2) ang -= Math.PI;
        else if (ang < -Math.PI / 2) ang += Math.PI;
        const img = this.image("vineyard", f.x, f.y);
        if (img) obj = img.setTint(GREEN).setDisplaySize(f.radius * 2, Math.max(70, f.radius * 0.9)).setRotation(ang).setDepth(GROUND_DEPTH + 2);
        else obj = sc.add.ellipse(f.x, f.y, f.radius * 2, 60, 0x4aa832, 0.45).setRotation(ang).setDepth(GROUND_DEPTH + 2);
        break;
      }
      default: {
        // hive
        const img = this.image("beehive", f.x, f.y);
        if (img) obj = fitH(img.setOrigin(0.5, 0.9), 110).setDepth(prop);
        else obj = sc.add.ellipse(f.x, f.y - 40, 60, 80, 0xe8b830, 1).setDepth(prop);
        sc.tweens.add({ targets: obj, y: obj.y - 5, duration: 900 + (f.id % 5) * 90, yoyo: true, repeat: -1, ease: "Sine.InOut" });
        break;
      }
    }
    base = obj.scaleX;
    // Pop in.
    const to = obj.scaleX;
    const toY = obj.scaleY;
    if (f.kind !== "puddle" && f.kind !== "mushroom") {
      obj.setScale(to * 0.3, toY * 0.3);
      sc.tweens.add({ targets: obj, scaleX: to, scaleY: toY, duration: 260, ease: "Back.Out" });
    }
    return { f, obj, extra, grown: false, base };
  }

  private tick(e: Entry, now: number) {
    const f = e.f;
    const o = e.obj;
    if (f.kind === "puddle") {
      o.setAlpha(Math.max(0, Math.min(1, (f.until - now) / 1)) * 0.9);
    } else if (f.kind === "mushroom") {
      const span = Math.max(0.01, f.readyAt - f.born);
      if (now < f.readyAt) {
        const p = Math.max(0, Math.min(1, (now - f.born) / span));
        if (o instanceof Phaser.GameObjects.Image) fitW(o, 22 + 26 * p);
        else o.setScale(0.5 + p * 0.5);
      } else if (!e.grown) {
        e.grown = true;
        if (o instanceof Phaser.GameObjects.Image && hasFx(this.scene, "mushroom_grown")) {
          o.setTexture(fxKey("mushroom_grown"));
          fitW(o, 72);
        } else if (!(o instanceof Phaser.GameObjects.Image)) o.setFillStyle(0xd06bff, 1).setScale(1.3);
        const sx = o.scaleX;
        const sy = o.scaleY;
        this.scene.tweens.add({ targets: o, scaleX: sx * 1.05, scaleY: sy * 1.08, duration: 700, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      }
    } else if (f.kind === "vine") {
      o.setAngle(f.held > 0 ? Math.sin(now * 40) * 4 : 0);
    }
  }

  private remove(e: Entry) {
    const sc = this.scene;
    const all = [e.obj, ...e.extra];
    sc.tweens.killTweensOf(all);
    sc.tweens.add({
      targets: all,
      alpha: 0,
      scaleX: e.f.kind === "puddle" || e.f.kind === "vineyard" ? e.obj.scaleX : e.obj.scaleX * 1.25,
      scaleY: e.f.kind === "puddle" || e.f.kind === "vineyard" ? e.obj.scaleY : e.obj.scaleY * 0.7,
      duration: e.f.kind === "puddle" ? 120 : 220,
      onComplete: () => all.forEach((x) => x.destroy()),
    });
  }

  /** Scorched Earth: a red glow over the arena with drifting embers. */
  private scorch(now: number) {
    const sc = this.scene.sim.scorch;
    const on = !!sc && now < sc.until;
    if (!on) {
      if (this.scorchG) {
        const g = this.scorchG;
        this.scorchG = null;
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });
      }
      return;
    }
    if (!this.scorchG) {
      this.scorchG = this.scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0xff3a10, 0.01).setDepth(GROUND_DEPTH + 5);
    }
    this.scorchG.setFillStyle(0xff3a10, 0.17 + Math.sin(now * 5) * 0.04);
    const t = this.scene.time.now;
    if (t >= this.emberAt) {
      this.emberAt = t + 90;
      const x = Math.random() * ARENA_W;
      const y = 300 + Math.random() * (ARENA_H - 500);
      const em = this.scene.add.circle(x, y, 3 + Math.random() * 3, Math.random() < 0.5 ? 0xff9a3b : 0xffd23b, 0.9).setDepth(1500);
      this.scene.tweens.add({ targets: em, y: y - 120 - Math.random() * 80, x: x + (Math.random() - 0.5) * 60, alpha: 0, duration: 900, onComplete: () => em.destroy() });
    }
  }
}
