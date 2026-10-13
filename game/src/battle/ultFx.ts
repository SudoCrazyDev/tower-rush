/**
 * v2.7 per-unit ultimate visuals. Cheap tweens over existing art (vfx anims, vfx:proj_* sprites,
 * Graphics). Passive ultimates (multi_shot, tesla_coil) have no cast and are drawn by shots / zaps.
 */
import Phaser from "phaser";
import { ULTIMATES, type UltId } from "../../../shared/awakened.ts";
import type { SimEvent } from "../../../shared/sim.ts";
import { sfx } from "../audio";
import { ARENA_W, ARENA_H } from "../ui";
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

/** A soft coloured flash behind a caster. */
function glow(scene: BattleScene, x: number, y: number, color: number) {
  const c = scene.add.circle(x, y - 30, 70, color, 0.55).setDepth(2057);
  scene.tweens.add({ targets: c, scale: 2, alpha: 0, duration: 650, ease: "Cubic.Out", onComplete: () => c.destroy() });
}

/** A little steam cloud rising and fading. */
export function steam(scene: Phaser.Scene, x: number, y: number, color = 0xdddddd) {
  const c = scene.add.circle(x, y, 7 + Math.random() * 4, color, 0.6).setDepth(2060);
  scene.tweens.add({ targets: c, y: y - 36, scale: 2, alpha: 0, duration: 650, onComplete: () => c.destroy() });
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
  scorched_earth(scene, _e, from) {
    const flash = scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0xff5a14, 0.45).setDepth(2058);
    scene.tweens.add({ targets: flash, alpha: 0, duration: 700, onComplete: () => flash.destroy() });
    glow(scene, from.x, from.y + 30, 0xff7a1a);
    ring(scene, from.x, from.y + 30, 260, 0xff7a1a, 600, 8);
    scene.cameras.main.shake(220, 0.006);
  },
  winter_storm(scene, e, from) {
    glow(scene, from.x, from.y + 30, 0x9fe0ff);
    for (let i = 0; i < 16; i++) {
      const y = 260 + Math.random() * (ARENA_H - 520);
      const len = 90 + Math.random() * 120;
      const g = scene.add.graphics().setDepth(2057).setPosition(-len, y);
      g.lineStyle(4, 0xe8f8ff, 0.85).lineBetween(0, 0, len, len * 0.12);
      g.lineStyle(2, 0xffffff, 1).lineBetween(len * 0.2, len * 0.02, len, len * 0.12);
      scene.tweens.add({ targets: g, x: ARENA_W + 40, duration: 700 + Math.random() * 300, delay: i * 45, ease: "Sine.In", onComplete: () => g.destroy() });
    }
    const veil = scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0xbfe9ff, 0.22).setDepth(2056);
    scene.tweens.add({ targets: veil, alpha: 0, duration: 1100, onComplete: () => veil.destroy() });
    for (const uid of e.targets ?? []) {
      const m = scene.getMonster(uid);
      if (m) scene.vfx("ice_burst", m.sprite.x, m.sprite.y - 20, 120);
    }
    for (const p of e.points ?? []) scene.vfx("ice_burst", p.x, p.y - 20, 120);
  },
  overheat(scene, _e, from) {
    glow(scene, from.x, from.y + 30, 0xff3a1a);
    ring(scene, from.x, from.y + 30, 90, 0xff5a2a, 500, 6);
    for (let i = 0; i < 6; i++) scene.time.delayedCall(i * 90, () => steam(scene, from.x + (Math.random() - 0.5) * 50, from.y - 10, 0xffd0b0));
  },
  rag_doll(scene, e) {
    const pts = e.points?.length ? e.points : [{ x: e.x, y: e.y }];
    pts.forEach((p, i) =>
      scene.time.delayedCall(i * 90, () => {
        scene.vfx("lightning_strike", p.x, p.y, 150);
        ring(scene, p.x, p.y, 50, 0xffe45c, 350, 5);
      }),
    );
  },
  mushroom_puff(scene, e) {
    const key = fxKey("spore_burst");
    const r = e.radius || 90;
    if (hasFx(scene, "spore_burst")) {
      const img = scene.add.image(e.x, e.y, key).setDepth(2062).setTint(0xc79bff).setAlpha(0.9);
      const end = (r * 2) / Math.max(1, img.width);
      img.setScale(end * 0.3);
      scene.tweens.add({ targets: img, scale: end, alpha: 0, duration: 700, ease: "Cubic.Out", onComplete: () => img.destroy() });
    } else {
      const c = scene.add.circle(e.x, e.y, r, 0x9b7bd8, 0.5).setDepth(2062).setScale(0.3);
      scene.tweens.add({ targets: c, scale: 1, alpha: 0, duration: 700, ease: "Cubic.Out", onComplete: () => c.destroy() });
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.7;
      const dot = scene.add.circle(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.6, 4 + Math.random() * 4, i % 2 ? 0xa6e36a : 0xb98bff, 0.8).setDepth(2063);
      scene.tweens.add({ targets: dot, y: dot.y - 40, alpha: 0, duration: 800, onComplete: () => dot.destroy() });
    }
  },
  vineyard(scene, e) {
    const p = e.points?.[0] ?? { x: e.x, y: e.y };
    for (let i = 0; i < 5; i++) {
      const leaf = scene.add.ellipse(p.x + (Math.random() - 0.5) * 40, p.y - 4, 8, 14, i % 2 ? 0x7bd13a : 0x4aa832, 0.95).setDepth(2064).setAngle((Math.random() - 0.5) * 80);
      scene.tweens.add({ targets: leaf, y: leaf.y - 30 - Math.random() * 20, x: leaf.x + (Math.random() - 0.5) * 40, alpha: 0, angle: leaf.angle + 90, duration: 600, onComplete: () => leaf.destroy() });
    }
    ring(scene, p.x, p.y, 40, 0x7bd13a, 350, 4);
  },
};

const FLOAT_COLOR: Partial<Record<UltId, string>> = {
  burning_spear: "#ff9a3b",
  bomberman: "#ff9a3b",
  wisp: "#ffb35c",
  primal_roar: "#ffd93b",
  broadside: "#9fd3ff",
  judgment_slam: "#e07bff",
  scorched_earth: "#ff7a3b",
  winter_storm: "#bfe9ff",
  overheat: "#ff6a3b",
  rag_doll: "#ffe45c",
};

/** Plays the look of a "special" ultimate (or an Echo Spirit's repeat of one). */
export function playUltimate(scene: BattleScene, e: UltEvent, unitSprite?: { x: number; y: number }) {
  if (!e.ult) return;
  const from: Pt = { x: unitSprite?.x ?? e.x, y: (unitSprite?.y ?? e.y) - 30 };
  const quiet = e.ult === "vineyard" || e.ult === "mushroom_puff";
  if (!quiet) sfx("ultimate");
  PLAY[e.ult]?.(scene, e, from);
  if (quiet) return;
  scene.floater(from.x, from.y - 60, ULTIMATES[e.ult].name.toUpperCase() + "!", FLOAT_COLOR[e.ult] ?? "#ffd93b", 28);
}
