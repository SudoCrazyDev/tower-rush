/**
 * v2.7 per-unit ultimate visuals. Cheap tweens over existing art (vfx anims, vfx:proj_* sprites,
 * Graphics). Passive ultimates (multi_shot, tesla_coil) have no cast and are drawn by shots / zaps.
 */
import Phaser from "phaser";
import { ULTIMATES, type UltId } from "../../../shared/awakened.ts";
import type { SimEvent } from "../../../shared/sim.ts";
import { sfx } from "../audio";
import { hasFx, fxKey } from "./vfx";
import type { Pt } from "./path";
import type { BattleScene } from "../scenes/BattleScene";

export type UltEvent = Extract<SimEvent, { type: "ultimate" }>;

const GOLD = 0xffd93b;

/** Flies a projectile sprite (or a plain orb) from a to b, then calls done. */
function fly(scene: BattleScene, tex: string, a: Pt, b: Pt, ms: number, size: number, arc: number, tint: number | undefined, done: () => void) {
  const key = fxKey(tex);
  const obj: Phaser.GameObjects.Image | Phaser.GameObjects.Arc = hasFx(scene, tex)
    ? scene.add.image(a.x, a.y, key).setDisplaySize(size, size)
    : scene.add.circle(a.x, a.y, size / 3, tint ?? GOLD, 1);
  obj.setDepth(2090);
  if (tint !== undefined && obj instanceof Phaser.GameObjects.Image) obj.setTint(tint);
  const t = { p: 0 };
  scene.tweens.add({
    targets: t,
    p: 1,
    duration: ms,
    ease: "Sine.In",
    onUpdate: () => obj.setPosition(a.x + (b.x - a.x) * t.p, a.y + (b.y - a.y) * t.p - Math.sin(t.p * Math.PI) * arc),
    onComplete: () => {
      obj.destroy();
      done();
    },
  });
}

function ring(scene: BattleScene, x: number, y: number, radius: number, color: number, ms = 450, width = 8) {
  const g = scene.add.graphics().setDepth(2060).setPosition(x, y);
  g.lineStyle(width + 4, 0x16213e, 0.6).strokeCircle(0, 0, radius);
  g.lineStyle(width, color, 1).strokeCircle(0, 0, radius);
  g.setScale(0.15);
  scene.tweens.add({ targets: g, scale: 1, alpha: 0, duration: ms, ease: "Cubic.Out", onComplete: () => g.destroy() });
}

/** A bright line through the points that fades out. */
function streak(scene: BattleScene, pts: Pt[], color: number, width = 8) {
  if (pts.length < 2) return;
  const g = scene.add.graphics().setDepth(2055);
  g.lineStyle(width + 6, color, 0.35).beginPath().moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.strokePath();
  g.lineStyle(width * 0.5, 0xffffff, 0.95).beginPath().moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.strokePath();
  scene.tweens.add({ targets: g, alpha: 0, duration: 420, onComplete: () => g.destroy() });
}

type Play = (scene: BattleScene, e: UltEvent, from: Pt) => void;

const PLAY: Partial<Record<UltId, Play>> = {
  burning_spear(scene, e, from) {
    const pts = e.points ?? [];
    streak(scene, [from, ...pts], 0xff7a1a);
    pts.forEach((p, i) => scene.time.delayedCall(i * 60, () => scene.vfx("fire_explosion", p.x, p.y, 110)));
    sfx("shoot", "fireball");
  },
  bomberman(scene, e, from) {
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(i * 110, () =>
        fly(scene, "proj_cannonball", from, p, 420, 44, 90, undefined, () => {
          scene.vfx("fire_explosion", p.x, p.y, e.radius * 1.6);
          ring(scene, p.x, p.y, e.radius, 0xff7a1a, 300, 5);
          sfx("shoot", "cannonball");
        }),
      ),
    );
  },
  wisp(scene, e, from) {
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(i * 90, () =>
        fly(scene, "proj_fireball", from, p, 350, 40, 40, 0xff9a3b, () => scene.vfx("fire_explosion", p.x, p.y, 90)),
      ),
    );
    sfx("shoot", "fireball");
  },
  primal_roar(scene, e) {
    ring(scene, e.x, e.y, 700, GOLD, 700, 12);
    scene.time.delayedCall(140, () => ring(scene, e.x, e.y, 480, 0xffffff, 500, 6));
    scene.cameras.main.shake(300, 0.01);
    for (const uid of e.targets ?? []) {
      const m = scene.getMonster(uid);
      if (m) scene.vfx("hit_impact", m.sprite.x, m.sprite.y - 20, 70);
    }
  },
  broadside(scene, e, from) {
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(i * 80, () =>
        fly(scene, "proj_cannonball", from, p, 380, 44, 70, undefined, () => {
          scene.vfx("fire_explosion", p.x, p.y, e.radius * 1.5);
          sfx("shoot", "cannonball");
        }),
      ),
    );
  },
  judgment_slam(scene, e) {
    scene.vfx("arcane_vortex", e.x, e.y, e.radius * 1.4);
    scene.vfx("lightning_strike", e.x, e.y, 160);
    ring(scene, e.x, e.y, e.radius, 0xc84bff, 600, 10);
    scene.time.delayedCall(120, () => ring(scene, e.x, e.y, e.radius * 0.6, 0xff6ec7, 450, 6));
    scene.cameras.main.shake(250, 0.009);
  },
};

const FLOAT_COLOR: Partial<Record<UltId, string>> = {
  burning_spear: "#ff9a3b",
  bomberman: "#ff9a3b",
  wisp: "#ffb35c",
  primal_roar: "#ffd93b",
  broadside: "#9fd3ff",
  judgment_slam: "#e07bff",
};

/** Plays the look of a "special" ultimate (or an Echo Spirit's repeat of one). */
export function playUltimate(scene: BattleScene, e: UltEvent, unitSprite?: { x: number; y: number }) {
  if (!e.ult) return;
  const from: Pt = { x: unitSprite?.x ?? e.x, y: (unitSprite?.y ?? e.y) - 30 };
  sfx("ultimate");
  PLAY[e.ult]?.(scene, e, from);
  scene.floater(from.x, from.y - 60, ULTIMATES[e.ult].name.toUpperCase() + "!", FLOAT_COLOR[e.ult] ?? "#ffd93b", 28);
}
