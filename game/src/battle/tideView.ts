/**
 * v2.2 Story 2 ("The Drowned Coast") battle visuals: the tide meter and water over the flooded slots,
 * tide pools beside the path, Ondrath's shell (banners and cleanse bursts), the rolling isle, anchor hook, siren sleep (tap to wake) and the
 * lantern beam. A view only: every rule is in shared/tide.ts, this draws the Sim's events.
 */
import Phaser from "phaser";
import type { SimEvent } from "../../../shared/sim.ts";
import type { ChapterMechanics } from "../../../shared/stories.ts";
import { ARENA_W, ARENA_H, W, WIDE, NAVY, txt, toast } from "../ui";
import type { BattleScene } from "../scenes/BattleScene";

/** Where the `row`-th rules HUD block goes (left panel on wide screens; on phones below the boss bar and the bark bubble). */
export function hudAnchor(row: number) {
  const ox = (W - ARENA_W) / 2;
  return WIDE ? { x: ox / 2, y: 410 + row * 180, scale: Math.min(1, (ox - 40) / 420) } : { x: W / 2, y: 292 + row * 58, scale: 1 };
}

/** A big message that pops over the arena and fades (above every unit and monster). */
export function banner(scene: Phaser.Scene, text: string, color: string, size = 56, y = 520) {
  const t = txt(scene, ARENA_W / 2, y, text, size, color).setDepth(2900).setScale(1.7).setAlpha(0);
  scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: "Back.Out" });
  scene.tweens.add({ targets: t, alpha: 0, y: y - 40, delay: 1100, duration: 400, onComplete: () => t.destroy() });
  return t;
}

const HINT_KEY = "crown-keep-wake-hint";
function hintSeen() {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}
function markHint() {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    // Shown again next time.
  }
}

type PoolView = { x: number; y: number; g: Phaser.GameObjects.Graphics; full: boolean };
type BeamView = { g: Phaser.GameObjects.Graphics; tower: Phaser.GameObjects.Text; e: Extract<SimEvent, { type: "beam" }> };

export class TideView {
  private readonly tide?: ChapterMechanics["tide"];
  private meter: { root: Phaser.GameObjects.Container; bar: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; time: Phaser.GameObjects.Text } | null = null;
  private water = new Map<number, Phaser.GameObjects.Graphics>();
  /** 0 (dry) to 1 (flooded): the water eases toward the tide. */
  private level = 0;
  private clock = 0;
  private pools: PoolView[] = [];
  private zzz = new Map<number, Phaser.GameObjects.Text>();
  private beams: BeamView[] = [];
  /** The flooded arena picture, shown over the normal one at high tide. */
  private high: Phaser.GameObjects.Image | null = null;

  /** Lay the flooded arena (`key`) over the arena and its ambient loop, hidden until high tide. */
  highArt(key: string, tint: number | null) {
    this.high = this.scene.add.image(0, 0, key).setOrigin(0).setDisplaySize(ARENA_W, ARENA_H).setDepth(1).setAlpha(0);
    if (tint !== null) this.high.setTint(tint);
  }

  constructor(private scene: BattleScene, mech: ChapterMechanics | undefined) {
    this.tide = mech?.tide;
    if (mech?.tide) {
      this.buildMeter();
    }
    if (mech?.tidePools) this.buildPools(mech.tidePools.at);
  }

  // ------------------------------------------------------------------ build

  private buildMeter() {
    const a = hudAnchor(0);
    const bg = this.scene.add.graphics();
    bg.fillStyle(NAVY, 0.92).fillRoundedRect(-210, -34, 420, 68, 22).lineStyle(4, 0x7fc8ff, 1).strokeRoundedRect(-210, -34, 420, 68, 22);
    const bar = this.scene.add.graphics();
    const label = txt(this.scene, -194, -10, "LOW TIDE", 28, "#ffd27a", [0, 0.5]);
    const t = txt(this.scene, 194, -10, "", 28, "#ffffff", [1, 0.5]);
    const root = this.scene.add.container(a.x, a.y, [bg, bar, label, t]).setDepth(3000).setScrollFactor(0).setScale(a.scale);
    this.meter = { root, bar, label, time: t };
  }

  /** A flooded slot's water layer, with the ring that warns of it at low tide. */
  private waterOf(slot: number) {
    let g = this.water.get(slot);
    if (!g) {
      g = this.scene.add.graphics();
      const p = this.scene.slotPos(slot);
      g.setPosition(p.x, p.y).setDepth(100 + p.y + 2);
      this.water.set(slot, g);
    }
    return g;
  }

  private buildPools(at: number[]) {
    const path = this.scene.paths[0];
    if (!path) return;
    // Pools sit on the side of the path that faces away from the board.
    const slots = Array.from({ length: 15 }, (_, i) => this.scene.slotPos(i));
    const cx = slots.reduce((s, p) => s + p.x, 0) / slots.length;
    const cy = slots.reduce((s, p) => s + p.y, 0) / slots.length;
    for (const share of at) {
      const d = path.length * share;
      const p = path.at(d);
      const q = path.at(Math.min(path.length, d + 12));
      const r = path.at(Math.max(0, d - 12));
      let nx = -(q.y - r.y);
      let ny = q.x - r.x;
      const n = Math.hypot(nx, ny) || 1;
      nx /= n;
      ny /= n;
      // On the board side of the path: the far side runs off the screen edge on most layouts.
      if ((p.x - cx) * nx + (p.y - cy) * ny > 0) [nx, ny] = [-nx, -ny];
      const x = p.x + nx * 62;
      const y = p.y + ny * 62;
      const g = this.scene.add.graphics().setPosition(x, y).setDepth(60 + y);
      const v: PoolView = { x, y, g, full: true };
      this.drawPool(v);
      this.scene.tweens.add({ targets: g, scaleX: { from: 1, to: 1.06 }, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.InOut" });
      this.pools.push(v);
    }
  }

  private drawPool(v: PoolView) {
    const g = v.g.clear();
    if (v.full) {
      g.fillStyle(0x1b4f8f, 1).fillEllipse(0, 0, 84, 42);
      g.fillStyle(0x3fa7ff, 0.95).fillEllipse(0, -2, 70, 32);
      g.fillStyle(0xffffff, 0.55).fillEllipse(-14, -8, 22, 7);
      g.lineStyle(3, 0xbfe6ff, 0.8).strokeEllipse(0, 0, 84, 42);
    } else {
      g.fillStyle(0x8a6c46, 0.9).fillEllipse(0, 0, 84, 42);
      g.fillStyle(0xc9a56a, 0.9).fillEllipse(0, -2, 66, 30);
      g.lineStyle(2, 0x5b4527, 0.8).lineBetween(-20, -4, -4, 4).lineBetween(-4, 4, 10, -6).lineBetween(10, -6, 22, 2);
    }
  }

  // ----------------------------------------------------------------- events

  handle(e: SimEvent) {
    switch (e.type) {
      case "tide": {
        // A new set of slots each low tide: drop water from the old ones, mark the new.
        for (const [s, g] of this.water) if (!e.slots.includes(s)) {
          g.destroy();
          this.water.delete(s);
        }
        for (const s of e.slots) this.waterOf(s);
        if (this.high) this.scene.tweens.add({ targets: this.high, alpha: e.high ? 1 : 0, duration: 1500, ease: "Sine.InOut" });
        banner(this.scene, e.high ? "HIGH TIDE!" : "LOW TIDE", e.high ? "#7fc8ff" : "#ffd27a", 54, 480);
        break;
      }
      case "pool": {
        const v = this.pools[e.index];
        if (!v || !v.full) break;
        v.full = false;
        this.drawPool(v);
        this.splash(v.x, v.y);
        this.scene.floater(v.x, v.y - 30, "POOL LOST", "#7fc8ff", 24);
        break;
      }
      case "isle":
        if (e.on) {
          banner(this.scene, "THE ISLE ROLLS!", "#ffb47a", 48, 520);
          this.scene.cameras.main.shake(e.dur * 1000, 0.004);
        }
        break;
      case "shell":
        // Ondrath's shell: a fresh stage of barnacle clusters.
        if (e.stage === 0) banner(this.scene, "BREAK THE BARNACLES!", "#d9a8ff", 46, 520);
        else banner(this.scene, e.stage === e.stages - 1 ? "THE LAST BARNACLE!" : "MORE BARNACLES GROW!", "#d9a8ff", 46, 520);
        break;
      case "cleanse":
        this.splash(e.x, e.y);
        this.scene.vfx("poison_cloud", e.x, e.y - 20, 140);
        if (e.left > 0) this.scene.floater(e.x, e.y - 70, `SHELL ${e.total - e.left}/${e.total} CLEAN`, "#7fffd4", 28);
        else {
          banner(this.scene, "ONDRATH IS CLEANSED!", "#7fffd4", 52, 520);
          this.scene.cameras.main.flash(500, 180, 255, 230);
        }
        break;
      case "lantern":
        // Corvaline's lantern: the only way to hurt her.
        if (e.lit) {
          this.scene.vfx("arcane_vortex", e.x, e.y - 20, 160);
          if (e.first) banner(this.scene, "STRIKE THE LANTERN!", "#d9a8ff", 46, 520);
          else this.scene.floater(e.x, e.y - 80, "LANTERN LIT!", "#d9a8ff", 30);
        } else this.scene.vfx("shadow_smoke", e.x, e.y - 20, 140);
        break;
      case "hooked":
        this.hook(e);
        break;
      case "sleep":
        this.sleep(e);
        break;
      case "beam":
        this.beam(e);
        break;
    }
  }

  private splash(x: number, y: number) {
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.15 + 0.7 * Math.random());
      const d = 40 + Math.random() * 50;
      const c = this.scene.add.circle(x, y, 4 + Math.random() * 4, 0x7fc8ff, 0.95).setDepth(2100);
      this.scene.tweens.add({ targets: c, x: x + Math.cos(a) * d, alpha: 0, duration: 600, ease: "Cubic.Out", onComplete: () => c.destroy() });
      this.scene.tweens.add({ targets: c, y: y + Math.sin(a) * d, duration: 300, ease: "Quad.Out", yoyo: true });
    }
    this.scene.vfx("poison_cloud", x, y, 110);
  }

  /** The anchor drags a unit across the board: its sprite flies to the new tile on an arc, with a chain. */
  private hook(e: Extract<SimEvent, { type: "hooked" }>) {
    const u = this.scene.getUnit(e.uid);
    const from = this.scene.slotPos(e.from);
    const to = this.scene.slotPos(e.to);
    if (!u) return;
    u.place(e.to);
    u.sprite.setPosition(from.x, from.y);
    const t = { k: 0 };
    this.scene.tweens.add({
      targets: t,
      k: 1,
      duration: 520,
      ease: "Cubic.InOut",
      onUpdate: () => u.sprite.setPosition(from.x + (to.x - from.x) * t.k, from.y + (to.y - from.y) * t.k - Math.sin(Math.PI * t.k) * 70),
      onComplete: () => u.place(e.to),
    });
    const g = this.scene.add.graphics().setDepth(2050);
    const links = 9;
    for (let i = 0; i <= links; i++) {
      const k = i / links;
      g.fillStyle(0x9aa6c4, 1).fillCircle(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - 30, 6);
      g.lineStyle(2, NAVY, 0.9).strokeCircle(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - 30, 6);
    }
    this.scene.tweens.add({ targets: g, alpha: 0, delay: 400, duration: 400, onComplete: () => g.destroy() });
    this.scene.vfx("shadow_smoke", from.x, from.y, 120);
    this.scene.vfx("shadow_smoke", to.x, to.y, 120);
    banner(this.scene, "ANCHOR HOOK!", "#c9d2ff", 44, 520);
  }

  private sleep(e: Extract<SimEvent, { type: "sleep" }>) {
    const old = this.zzz.get(e.uid);
    if (!e.asleep) {
      old?.destroy();
      this.zzz.delete(e.uid);
      const u = this.scene.getUnit(e.uid);
      if (e.tapped && u) {
        this.scene.vfx("holy_heal", u.sprite.x, u.sprite.y - 10, 130);
        this.scene.floater(u.sprite.x, u.sprite.y - 90, "AWAKE!", "#7dff7a", 26);
      }
      return;
    }
    if (old) return;
    const t = txt(this.scene, 0, 0, "Zzz\nTAP!", 30, "#cfd8ff").setDepth(3000 - 1).setAlign("center");
    t.setStroke("#10133a", 6);
    this.zzz.set(e.uid, t);
    if (!hintSeen()) {
      markHint();
      toast(this.scene, "TAP A SLEEPING UNIT TO WAKE IT", "#ffffff");
    }
  }

  private beam(e: Extract<SimEvent, { type: "beam" }>) {
    const g = this.scene.add.graphics().setDepth(2000);
    const tower = txt(this.scene, e.x, e.y, "🗼", 90).setDepth(2001);
    this.beams.push({ g, tower, e });
  }

  // ----------------------------------------------------------------- frame

  /** Every frame (seconds since the last). */
  update(dt: number) {
    this.clock += dt;
    this.drawMeter();
    this.drawWater(dt);
    this.followSleepers();
    this.drawBeams();
  }

  private drawMeter() {
    const m = this.meter;
    const tide = this.tide;
    if (!m || !tide) return;
    const sim = this.scene.sim;
    const high = sim.tideHigh;
    const left = Number.isFinite(sim.tideNext) ? Math.max(0, sim.tideNext - sim.now) : 0;
    const half = tide.cycle / 2;
    const p = Number.isFinite(sim.tideNext) ? Phaser.Math.Clamp(1 - left / half, 0, 1) : 0;
    m.label.setText(high ? "HIGH TIDE" : "LOW TIDE").setColor(high ? "#7fc8ff" : "#ffd27a");
    m.time.setText(Number.isFinite(sim.tideNext) ? `${high ? "tide falls" : "tide rises"} in ${Math.ceil(left)}s` : "");
    m.bar.clear().fillStyle(0x10133a, 1).fillRoundedRect(-194, 12, 388, 12, 6);
    m.bar.fillStyle(high ? 0x7fc8ff : 0xffd27a, 1).fillRoundedRect(-194, 12, Math.max(10, 388 * p), 12, 6);
  }

  private drawWater(dt: number) {
    const target = this.scene.sim.tideHigh ? 1 : 0;
    this.level += Math.sign(target - this.level) * Math.min(Math.abs(target - this.level), dt * 2);
    for (const g of this.water.values()) {
      g.clear();
      // Sized to the arena's plank tiles (~80 px), so it marks one tile and doesn't spill onto its neighbours.
      // At low tide: a pulsing ring warning where the water comes in next.
      const warn = 1 - this.level;
      g.lineStyle(4, 0x7fc8ff, warn * (0.45 + 0.3 * Math.sin(this.clock * 4))).strokeRoundedRect(-40, -40, 80, 80, 12);
      if (this.level <= 0) continue;
      g.fillStyle(0x2f7fff, 0.45 * this.level).fillRoundedRect(-40, -40, 80, 80, 12);
      g.lineStyle(3, 0xd8f0ff, 0.6 * this.level);
      for (let row = 0; row < 3; row++) {
        g.beginPath();
        for (let x = -36; x <= 36; x += 4) {
          const y = -22 + row * 22 + Math.sin(x * 0.14 + this.clock * 3 + row * 1.7) * 3;
          if (x === -36) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokePath();
      }
    }
  }

  private followSleepers() {
    for (const [uid, t] of this.zzz) {
      const u = this.scene.getUnit(uid);
      if (!u) {
        t.destroy();
        this.zzz.delete(uid);
        continue;
      }
      t.setPosition(u.sprite.x + 28, u.sprite.y - 92 + Math.sin(this.clock * 3 + uid) * 5);
    }
  }

  private drawBeams() {
    const now = this.scene.sim.now;
    this.beams = this.beams.filter((b) => {
      const k = (now - b.e.t) / b.e.dur;
      if (k >= 1.05) {
        b.g.destroy();
        b.tower.destroy();
        return false;
      }
      const a = b.e.a0 + (b.e.a1 - b.e.a0) * Phaser.Math.Clamp(k, 0, 1);
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const px = -dy;
      const py = dx;
      const len = 1800;
      const strip = (hw: number, alpha: number, color: number) => {
        b.g.fillStyle(color, alpha).fillPoints(
          [
            new Phaser.Geom.Point(b.e.x + px * hw * 0.25, b.e.y + py * hw * 0.25),
            new Phaser.Geom.Point(b.e.x - px * hw * 0.25, b.e.y - py * hw * 0.25),
            new Phaser.Geom.Point(b.e.x - px * hw + dx * len, b.e.y - py * hw + dy * len),
            new Phaser.Geom.Point(b.e.x + px * hw + dx * len, b.e.y + py * hw + dy * len),
          ],
          true,
        );
      };
      b.g.clear();
      strip(b.e.width / 2, 0.2, 0xfff2a8);
      strip(b.e.width / 4, 0.22, 0xffffff);
      return true;
    });
  }
}
