/**
 * v2.7 field layer: draws what units leave on the path (Sim.fields: puddles, mushrooms, rag dolls,
 * prickly vines, vineyards, hives, black holes, Heart Surgeon Rooms) one sprite per field id, plus the Scorched Earth glow
 * (Sim.scorch) and the Frozen Fields ice (Sim.frost).
 * Every texture use is guarded; a missing vfx falls back to a plain shape.
 */
import Phaser from "phaser";
import type { Sim, SimField } from "../../../shared/sim.ts";
import { fxKey, hasFx } from "./vfx";
import { ARENA_W, ARENA_H, txt } from "../ui";

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
  /** Room: the kill count last drawn. */
  seen: number;
}

const GROUND_DEPTH = 50;
const GREEN = 0x9be27a;

const fitW = (img: Phaser.GameObjects.Image, w: number) => img.setScale(w / Math.max(1, img.width));
const fitH = (img: Phaser.GameObjects.Image, h: number) => img.setScale(h / Math.max(1, img.height));

export class FieldLayer {
  private entries = new Map<number, Entry>();
  private scorchG: Phaser.GameObjects.Rectangle | null = null;
  private emberAt = 0;
  private frostG: Phaser.GameObjects.Rectangle | null = null;
  private snowAt = 0;

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
    this.frost(now);
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
    this.frostG?.destroy();
    this.frostG = null;
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
      case "plague": {
        const img = this.image("black_puddle", f.x, f.y);
        if (img) obj = fitW(img, f.radius * 2).setDepth(GROUND_DEPTH);
        else obj = sc.add.ellipse(f.x, f.y, f.radius * 2, f.radius * 1.2, 0x1d2a14, 0.75).setDepth(GROUND_DEPTH);
        // Splashes open where the flask lands.
        const [sx, sy] = [obj.scaleX, obj.scaleY];
        obj.setScale(sx * 0.2, sy * 0.2);
        sc.tweens.add({ targets: obj, scaleX: sx, scaleY: sy, duration: 220, ease: "Back.Out" });
        break;
      }
      case "skeleton": {
        const img = this.image("bone_skeleton", f.x, f.y);
        if (img) obj = fitH(img.setOrigin(0.5, 0.92), 64).setDepth(prop);
        else obj = sc.add.ellipse(f.x, f.y - 24, 26, 48, 0xe8e2cf, 1).setStrokeStyle(3, 0x6a5a8a).setDepth(prop);
        break;
      }
      case "blackhole": {
        // A dark core with a slowly turning purple swirl around it.
        obj = sc.add.ellipse(f.x, f.y, f.radius * 1.1, f.radius * 0.66, 0x07000f, 0.92).setStrokeStyle(5, 0xb06bff, 0.9).setDepth(GROUND_DEPTH + 3);
        const swirl = sc.add.graphics().setPosition(f.x, f.y).setDepth(GROUND_DEPTH + 2);
        for (let k = 0; k < 3; k++) {
          swirl.lineStyle(6 - k, k === 1 ? 0xff7ad9 : 0x8a4dff, 0.6 - k * 0.12);
          swirl.beginPath();
          for (let a = 0; a <= Math.PI * 1.4; a += 0.12) {
            const r = f.radius * (0.35 + (a / (Math.PI * 1.4)) * 0.65);
            const t = a + (k * Math.PI * 2) / 3;
            if (a === 0) swirl.moveTo(Math.cos(t) * r, Math.sin(t) * r);
            else swirl.lineTo(Math.cos(t) * r, Math.sin(t) * r);
          }
          swirl.strokePath();
        }
        swirl.setScale(1, 0.6);
        extra.push(swirl);
        sc.tweens.add({ targets: swirl, angle: -360, duration: 2200, repeat: -1 });
        sc.tweens.add({ targets: obj, scaleX: { from: 0.94, to: 1.06 }, scaleY: { from: 0.94, to: 1.06 }, duration: 600, yoyo: true, repeat: -1, ease: "Sine.InOut" });
        break;
      }
      case "room": {
        // Heart Surgeon's Room: a translucent cyan dome over a glowing floor ring, its kill count on top.
        const aw = f.unit.awakened;
        const r = f.radius;
        obj = sc.add.ellipse(f.x, f.y, r * 2, r * 1.2, 0x5fd8ff, aw ? 0.2 : 0.14).setStrokeStyle(aw ? 5 : 3, aw ? 0x7ff3ff : 0xbff4ff, 0.9).setDepth(GROUND_DEPTH + 1);
        const dome = sc.add.graphics().setPosition(f.x, f.y).setDepth(prop + 1);
        dome.fillStyle(0x8fe6ff, aw ? 0.16 : 0.1).fillEllipse(0, -r * 0.35, r * 2, r * 1.7);
        dome.lineStyle(aw ? 4 : 3, 0xdffaff, 0.55).strokeEllipse(0, -r * 0.35, r * 2, r * 1.7);
        // A highlight arc on the upper left, like light on glass.
        dome.lineStyle(5, 0xffffff, 0.45).beginPath();
        dome.arc(0, -r * 0.35, r * 0.78, Math.PI * 1.08, Math.PI * 1.42);
        dome.strokePath();
        dome.setScale(1, 0.85);
        extra.push(dome);
        sc.tweens.add({ targets: dome, alpha: { from: 0.75, to: 1 }, duration: 900 + (f.id % 4) * 120, yoyo: true, repeat: -1, ease: "Sine.InOut" });
        // A scan line sweeps the floor.
        const scan = sc.add.graphics().setPosition(f.x, f.y).setDepth(GROUND_DEPTH + 2);
        scan.lineStyle(3, 0xffffff, 0.6).beginPath();
        scan.arc(0, 0, r * 0.92, 0, Math.PI * 0.5);
        scan.strokePath();
        scan.setScale(1, 0.6);
        extra.push(scan);
        sc.tweens.add({ targets: scan, angle: 360, duration: aw ? 1600 : 2600, repeat: -1 });
        const label = txt(sc, f.x, f.y - r * 1.55, `✚ ${f.unit.roomKills}`, aw ? 24 : 20, aw ? "#7ff3ff" : "#dffaff").setDepth(1600);
        extra.push(label);
        // The dome opens from the floor up.
        dome.setScale(0.2, 0.1);
        sc.tweens.add({ targets: dome, scaleX: 1, scaleY: 0.85, duration: 420, ease: "Back.Out" });
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
    if (f.kind !== "puddle" && f.kind !== "mushroom" && f.kind !== "plague") {
      obj.setScale(to * 0.3, toY * 0.3);
      sc.tweens.add({ targets: obj, scaleX: to, scaleY: toY, duration: 260, ease: "Back.Out" });
    }
    return { f, obj, extra, grown: false, base, seen: f.kind === "room" ? f.unit.roomKills : 0 };
  }

  private tick(e: Entry, now: number) {
    const f = e.f;
    const o = e.obj;
    if (f.kind === "puddle" || f.kind === "plague") {
      o.setAlpha(Math.max(0, Math.min(1, (f.until - now) / 1)) * 0.9);
    } else if (f.kind === "skeleton") {
      // It walks back up the path: follow the Sim, face the way it walks, and bob.
      if (o instanceof Phaser.GameObjects.Image) o.setFlipX(f.x > o.x ? false : f.x < o.x ? true : o.flipX);
      o.setPosition(f.x, f.y - Math.abs(Math.sin(now * 9)) * 6).setDepth(100 + f.y);
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
    } else if (f.kind === "room") {
      const kills = f.unit.roomKills;
      if (kills !== e.seen) {
        e.seen = kills;
        const label = e.extra[2] as Phaser.GameObjects.Text;
        label.setText(`✚ ${kills}`);
        this.scene.tweens.add({ targets: label, scale: { from: 1.4, to: 1 }, duration: 220 });
        // A ripple on the floor for every kill inside.
        const rip = this.scene.add.ellipse(f.x, f.y, f.radius * 0.6, f.radius * 0.36).setStrokeStyle(3, 0x7ff3ff, 0.9).setDepth(GROUND_DEPTH + 2);
        this.scene.tweens.add({ targets: rip, scaleX: 3.3, scaleY: 3.3, alpha: 0, duration: 420, onComplete: () => rip.destroy() });
      }
      if (f.unit.awakened && Math.random() < 0.12) {
        // Light cubes drift up inside the awakened Rooms.
        const cx = f.x + (Math.random() - 0.5) * f.radius * 1.4;
        const cube = this.scene.add.rectangle(cx, f.y - Math.random() * 20, 9, 9, 0x9ff6ff, 0.85).setStrokeStyle(2, 0xffffff, 0.9).setAngle(45).setDepth(100 + f.y + 2);
        this.scene.tweens.add({ targets: cube, y: cube.y - 70 - Math.random() * 40, angle: 225, alpha: 0, duration: 1100, onComplete: () => cube.destroy() });
      }
    } else if (f.kind === "vine") {
      o.setAngle(f.held > 0 ? Math.sin(now * 40) * 4 : 0);
    } else if (f.kind === "blackhole" && Math.random() < 0.25) {
      // Motes spiral into the hole.
      const a = Math.random() * Math.PI * 2;
      const mote = this.scene.add.circle(f.x + Math.cos(a) * f.radius, f.y + Math.sin(a) * f.radius * 0.6, 3 + Math.random() * 3, 0xd9b3ff, 0.9).setDepth(GROUND_DEPTH + 4);
      this.scene.tweens.add({ targets: mote, x: f.x, y: f.y, scale: 0.2, alpha: 0.2, duration: 520, ease: "Cubic.In", onComplete: () => mote.destroy() });
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

  /** Frozen Fields: an icy tint over the arena with falling snow. */
  private frost(now: number) {
    const fr = this.scene.sim.frost;
    const on = !!fr && now < fr.until;
    if (!on) {
      if (this.frostG) {
        const g = this.frostG;
        this.frostG = null;
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() });
      }
      return;
    }
    if (!this.frostG) this.frostG = this.scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0x9fe0ff, 0.01).setDepth(GROUND_DEPTH + 5);
    this.frostG.setFillStyle(0x9fe0ff, 0.2 + Math.sin(now * 2) * 0.03);
    const t = this.scene.time.now;
    if (t >= this.snowAt) {
      this.snowAt = t + 70;
      const x = Math.random() * ARENA_W;
      const y = 200 + Math.random() * (ARENA_H - 500);
      const fl = this.scene.add.circle(x, y, 2 + Math.random() * 3, 0xffffff, 0.95).setDepth(1500);
      this.scene.tweens.add({ targets: fl, y: y + 120 + Math.random() * 80, x: x + (Math.random() - 0.5) * 50, alpha: 0, duration: 1300, onComplete: () => fl.destroy() });
    }
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
