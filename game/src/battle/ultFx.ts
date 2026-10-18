/**
 * v2.7 per-unit ultimate visuals. Cheap tweens over existing art (vfx anims, vfx:proj_* sprites,
 * Graphics). Passive ultimates (multi_shot, tesla_coil) have no cast and are drawn by shots / zaps.
 */
import Phaser from "phaser";
import { MURC_NAMES, ULTIMATES, type UltId } from "../../../shared/awakened.ts";
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

/** Ultra Focused (Sand Monk): a golden spirit fist punches through a crit. */
export function fistStrike(scene: BattleScene, x: number, y: number) {
  if (hasFx(scene, "fist_strike")) {
    const img = scene.add.image(x, y - 10, fxKey("fist_strike")).setDepth(2110);
    const end = 120 / Math.max(1, img.width);
    img.setScale(end * 0.3).setAlpha(0.95);
    scene.tweens.add({ targets: img, scale: end * 1.15, duration: 110, ease: "Back.Out" });
    scene.tweens.add({ targets: img, scale: end * 1.35, alpha: 0, delay: 170, duration: 220, onComplete: () => img.destroy() });
  } else {
    const c = scene.add.circle(x, y - 10, 26, GOLD, 0.9).setDepth(2110);
    scene.tweens.add({ targets: c, scale: 2.2, alpha: 0, duration: 300, onComplete: () => c.destroy() });
  }
  ring(scene, x, y - 10, 70, 0xf2c14e, 320, 6);
  for (let i = 0; i < 4; i++) steam(scene, x + (Math.random() - 0.5) * 50, y + 5, 0xe8c27a);
}

/** Iceborn Warmother (Bear Rider): frost shatters off a boss she hits. */
export function icebornHit(scene: BattleScene, x: number, y: number) {
  ring(scene, x, y, 55, 0x9fe6ff, 300, 5);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.random() * 0.6;
    const s = scene.add.rectangle(x, y, 6, 16, 0xdff6ff).setDepth(2105).setRotation(a + Math.PI / 2).setStrokeStyle(2, 0x5fb8e8);
    scene.tweens.add({ targets: s, x: x + Math.cos(a) * 55, y: y + Math.sin(a) * 55, alpha: 0, duration: 340, ease: "Cubic.Out", onComplete: () => s.destroy() });
  }
}

/** Grace of Mjolnir (Thunder Dwarf): the first link of the chain falls from the sky as a hammer bolt. */
export function mjolnirBolt(scene: BattleScene, x: number, y: number) {
  const g = scene.add.graphics().setDepth(2052);
  const pts: Pt[] = [{ x: x + (Math.random() - 0.5) * 40, y: y - 280 }];
  for (let i = 1; i < 7; i++) pts.push({ x: x + (Math.random() - 0.5) * 34, y: y - 280 + i * 40 });
  pts.push({ x, y });
  g.lineStyle(16, 0xfff27a, 0.35).strokePoints(pts);
  g.lineStyle(7, 0xfff6b0, 1).strokePoints(pts);
  g.lineStyle(3, 0xffffff, 1).strokePoints(pts);
  scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  ring(scene, x, y, 60, 0xfff27a, 280, 6);
  const flash = scene.add.circle(x, y, 30, 0xffffff, 0.8).setDepth(2053);
  scene.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
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
  crystal_throw(scene, e, from) {
    const p = e.points?.[0] ?? { x: e.x, y: e.y };
    glow(scene, from.x, from.y + 30, 0xb58cff);
    fly(scene, "crystal_boulder", { x: from.x, y: from.y - 40 }, p, 620, 120, 260, hasFx(scene, "crystal_boulder") ? undefined : 0xb58cff, () => {
      if (hasFx(scene, "crystal_shatter")) {
        const img = scene.add.image(p.x, p.y - 10, fxKey("crystal_shatter")).setDepth(2095);
        const end = (e.radius * 1.8) / Math.max(1, img.width);
        img.setScale(end * 0.3);
        scene.tweens.add({ targets: img, scale: end, alpha: 0, duration: 650, ease: "Cubic.Out", onComplete: () => img.destroy() });
      }
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
        const s = scene.add.rectangle(p.x, p.y, 10, 24, 0xd9c2ff).setDepth(2096).setRotation(a + Math.PI / 2).setStrokeStyle(2, 0x7a4bd8);
        scene.tweens.add({ targets: s, x: p.x + Math.cos(a) * e.radius, y: p.y + Math.sin(a) * e.radius * 0.7, alpha: 0, angle: 200, duration: 520, ease: "Cubic.Out", onComplete: () => s.destroy() });
      }
      ring(scene, p.x, p.y, e.radius, 0xb58cff, 520, 10);
      scene.cameras.main.shake(260, 0.012);
      sfx("shoot", "cannonball");
    });
  },
  moonshine(scene, e, from) {
    glow(scene, from.x, from.y + 30, 0xdfe8ff);
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(i * 120, () => {
        const beam = scene.add.rectangle(p.x, p.y - 260, 70, 520, 0xe8f0ff, 0.55).setDepth(2058).setOrigin(0.5, 0.5);
        scene.tweens.add({ targets: beam, scaleX: 0.2, alpha: 0, duration: 650, ease: "Cubic.In", onComplete: () => beam.destroy() });
        ring(scene, p.x, p.y, 70, 0xdfe8ff, 450, 6);
      }),
    );
  },
  reborn(scene, e, from) {
    if (e.radius === 1) {
      // Hatch: a burst of fire and a stun wave over the whole board.
      const flash = scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0xffb347, 0.5).setDepth(2058);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 650, onComplete: () => flash.destroy() });
      scene.vfx("fire_explosion", from.x, from.y, 260);
      ring(scene, from.x, from.y + 30, 800, 0xffb347, 800, 14);
      scene.time.delayedCall(150, () => ring(scene, from.x, from.y + 30, 520, 0xffffff, 550, 6));
      scene.cameras.main.shake(380, 0.014);
      for (const uid of e.targets ?? []) {
        const m = scene.getMonster(uid);
        if (m) scene.vfx("hit_impact", m.sprite.x, m.sprite.y - 20, 70);
      }
      return;
    }
    glow(scene, from.x, from.y + 30, 0xff7a1a);
    ring(scene, from.x, from.y + 30, 120, 0xff9a3b, 450, 8);
  },
  black_plague(scene, e, from) {
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(i * 70, () =>
        fly(scene, "proj_poison", from, p, 360, 38, 110, 0x3a4a2a, () => {
          for (let k = 0; k < 4; k++) steam(scene, p.x + (Math.random() - 0.5) * 60, p.y, 0x35402a);
        }),
      ),
    );
  },
  shadow_clones(scene, _e, from) {
    glow(scene, from.x, from.y + 30, 0x3a2a5a);
    ring(scene, from.x, from.y + 30, 110, 0x9a7aff, 400, 6);
  },
  hunting_storm(scene, e, from) {
    glow(scene, from.x, from.y + 30, 0x9ff0ff);
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(i * 70, () => {
        mjolnirBolt(scene, p.x, p.y);
        scene.vfx("lightning_strike", p.x, p.y, 120);
      }),
    );
  },
  forest_grasp(scene, e) {
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(i * 80, () => {
        if (hasFx(scene, "root_grasp")) {
          const img = scene.add.image(p.x, p.y + 30, fxKey("root_grasp")).setOrigin(0.5, 0.9).setDepth(2094);
          const end = 120 / Math.max(1, img.width);
          img.setScale(end, end * 0.2);
          scene.tweens.add({ targets: img, scaleY: end, duration: 220, ease: "Back.Out" });
          scene.tweens.add({ targets: img, alpha: 0, delay: 1300, duration: 400, onComplete: () => img.destroy() });
        } else {
          for (let k = 0; k < 4; k++) {
            const r = scene.add.rectangle(p.x - 30 + k * 20, p.y + 20, 10, 60, 0x6a4a2a).setOrigin(0.5, 1).setDepth(2094).setAngle((k - 1.5) * 14).setScale(1, 0.1);
            scene.tweens.add({ targets: r, scaleY: 1, duration: 200, ease: "Back.Out" });
            scene.tweens.add({ targets: r, alpha: 0, delay: 1300, duration: 400, onComplete: () => r.destroy() });
          }
        }
        ring(scene, p.x, p.y, 55, 0x7bd13a, 380, 5);
      }),
    );
  },
  raise_dead(scene, e) {
    ring(scene, e.x, e.y, e.radius, 0x9be27a, 420, 7);
    scene.vfx("hit_impact", e.x, e.y, 110);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const b = scene.add.rectangle(e.x, e.y, 6, 18, 0xf2ecd8).setDepth(2096).setRotation(a).setStrokeStyle(2, 0x6a5a8a);
      scene.tweens.add({ targets: b, x: e.x + Math.cos(a) * e.radius * 0.8, y: e.y + Math.sin(a) * e.radius * 0.6, angle: 300, alpha: 0, duration: 480, onComplete: () => b.destroy() });
    }
    sfx("shoot", "cannonball");
  },
  tidal_wave(scene, e, from) {
    glow(scene, from.x, from.y + 30, 0x5fb8ff);
    const veil = scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0x3a8adf, 0.25).setDepth(2056);
    scene.tweens.add({ targets: veil, alpha: 0, duration: 1100, onComplete: () => veil.destroy() });
    for (let row = 0; row < 3; row++) {
      const y = 380 + row * ((ARENA_H - 700) / 2);
      const img = hasFx(scene, "tidal_wave") ? scene.add.image(ARENA_W + 200, y, fxKey("tidal_wave")) : null;
      const obj = img ? img.setScale(360 / Math.max(1, img.width)) : scene.add.ellipse(ARENA_W + 200, y, 300, 140, 0x5fb8ff, 0.8);
      obj.setDepth(2057).setAlpha(0.95);
      scene.tweens.add({ targets: obj, x: -220, delay: row * 120, duration: 900, ease: "Sine.InOut", onComplete: () => obj.destroy() });
    }
    for (const uid of e.targets ?? []) {
      const m = scene.getMonster(uid);
      if (m) scene.time.delayedCall(250, () => steam(scene, m.sprite.x, m.sprite.y - 10, 0x9fd8ff));
    }
    scene.cameras.main.shake(300, 0.008);
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

Object.assign(PLAY, {
  star_merger(scene, e, from) {
    // The absorbed astronomers stream into her as stars.
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(i * 90, () => {
        scene.vfx("star_burst", p.x, p.y - 20, 110);
        fly(scene, "proj_star", { x: p.x, y: p.y - 30 }, from, 380, 40, 60, undefined, () => {
          ring(scene, from.x, from.y + 30, 90, 0xffe27a, 380, 6);
          scene.vfx("merge_levelup", from.x, from.y + 20, 150);
        });
      }),
    );
  },
  frozen_fields(scene, e, from) {
    const flash = scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0xdff6ff, 0.55).setDepth(2058);
    scene.tweens.add({ targets: flash, alpha: 0, duration: 700, onComplete: () => flash.destroy() });
    ring(scene, from.x, from.y + 30, 800, 0x9fe0ff, 900, 14);
    scene.cameras.main.shake(260, 0.01);
    for (const uid of e.targets ?? []) {
      const m = scene.getMonster(uid);
      if (m) scene.vfx("freeze", m.sprite.x, m.sprite.y - 20, 90);
    }
  },
  black_hole(scene, e, from) {
    glow(scene, from.x, from.y + 30, 0x5a2a9a);
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(i * 140, () => {
        streak(scene, [from, p], 0xb06bff);
        scene.vfx("arcane_vortex", p.x, p.y - 10, e.radius * 2);
        ring(scene, p.x, p.y, e.radius, 0xb06bff, 500, 8);
      }),
    );
    scene.cameras.main.shake(300, 0.012);
  },
  big_ben(scene, e, from) {
    // A clock-face ring on the Chrono Mage, then a golden tick on each unit she hastes.
    ring(scene, from.x, from.y + 30, 130, 0xffd86b, 600, 8);
    scene.time.delayedCall(120, () => ring(scene, from.x, from.y + 30, 90, 0xffffff, 450, 4));
    (e.points ?? []).forEach((p, i) =>
      scene.time.delayedCall(80 + i * 100, () => {
        streak(scene, [from, { x: p.x, y: p.y - 30 }], 0xffd86b);
        ring(scene, p.x, p.y, 70, 0xffd86b, 420, 6);
      }),
    );
  },
  resurreccion(scene, e, from) {
    if (e.variant === "zero" && e.points?.length === 2) {
      // Dark Zero: a black beam with a dark green border and a cyan glow, through the whole line.
      const [a, b] = e.points;
      const g = scene.add.graphics().setDepth(2056);
      const draw = (w: number) => {
        g.clear();
        g.lineStyle(w + 26, 0x3affe0, 0.28).lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(w + 12, 0x0e6b45, 1).lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(w, 0x050807, 1).lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(2, 0x9ffff0, 0.9).lineBetween(a.x, a.y, b.x, b.y);
      };
      const t = { w: e.radius * 0.9 };
      draw(t.w);
      scene.tweens.add({ targets: t, w: 2, duration: 260, ease: "Cubic.In", onUpdate: () => draw(t.w), onComplete: () => g.destroy() });
      const muzzle = scene.add.circle(a.x, a.y, 26, 0x3affe0, 0.8).setDepth(2057);
      scene.tweens.add({ targets: muzzle, scale: 1.8, alpha: 0, duration: 200, onComplete: () => muzzle.destroy() });
      for (const uid of e.targets ?? []) {
        const m = scene.getMonster(uid);
        if (m && hasFx(scene, "impact_lanza")) {
          const img = scene.add.image(m.sprite.x, m.sprite.y - 20, fxKey("impact_lanza")).setDepth(2058).setTint(0x3affe0);
          img.setScale(70 / Math.max(1, img.width));
          scene.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.4, duration: 260, onComplete: () => img.destroy() });
        }
      }
      sfx("shoot", "lightning");
      return;
    }
    if (e.variant === "lanza" && e.radius > 0) {
      // Lanza del Relampago: green lightning lances, one after another for a rapid volley.
      (e.targets ?? []).forEach((uid, i) =>
        scene.time.delayedCall(i * 110, () => {
          const m = scene.getMonster(uid);
          const to = m ? { x: m.sprite.x, y: m.sprite.y - 20 } : { x: e.x, y: e.y };
          const tex = hasFx(scene, "proj_lanza") ? scene.add.image(from.x, from.y, fxKey("proj_lanza")).setDepth(2090) : scene.add.rectangle(from.x, from.y, 90, 8, 0x5dffb0).setDepth(2090);
          if (tex instanceof Phaser.GameObjects.Image) tex.setScale(150 / Math.max(1, tex.width));
          tex.setRotation(Math.atan2(to.y - from.y, to.x - from.x));
          sfx("shoot", "lightning");
          scene.tweens.add({
            targets: tex,
            x: to.x,
            y: to.y,
            duration: 140,
            ease: "Cubic.In",
            onComplete: () => {
              tex.destroy();
              if (hasFx(scene, "impact_lanza")) {
                const img = scene.add.image(to.x, to.y, fxKey("impact_lanza")).setDepth(2091);
                img.setScale(150 / Math.max(1, img.width));
                scene.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.5, duration: 340, onComplete: () => img.destroy() });
              }
              ring(scene, to.x, to.y, 80, 0x5dffb0, 320, 6);
              scene.cameras.main.shake(140, 0.006);
            },
          });
        }),
      );
      return;
    }
    // Resurreccion: he releases. A green-black pillar, a dark flash, and the ultimate he rolled.
    const despair = e.variant === "despair";
    const col = despair ? 0x8a8a8a : 0x3affe0;
    const pillar = scene.add.rectangle(from.x, from.y - 120, 90, 420, despair ? 0x1a1a1a : 0x0e6b45, 0.75).setDepth(2058);
    pillar.setScale(0.2, 1);
    scene.tweens.add({ targets: pillar, scaleX: 1.4, alpha: 0, duration: 700, ease: "Cubic.Out", onComplete: () => pillar.destroy() });
    const dark = scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0x000000, 0.45).setDepth(2057);
    scene.tweens.add({ targets: dark, alpha: 0, duration: 800, onComplete: () => dark.destroy() });
    ring(scene, from.x, from.y + 30, 160, col, 650, 10);
    scene.time.delayedCall(150, () => ring(scene, from.x, from.y + 30, 110, 0x050807, 500, 8));
    scene.cameras.main.shake(400, 0.012);
    if (e.variant) scene.floater(from.x, from.y - 110, MURC_NAMES[e.variant].toUpperCase() + "!", despair ? "#d0d0d0" : "#5dffb0", 26);
  },
  surgeon_of_death(scene, e, from) {
    if (e.radius <= 0) {
      // "There can only be one": the other Surgeons fold into him as light cubes.
      (e.points ?? []).forEach((p, i) =>
        scene.time.delayedCall(i * 90, () => {
          ring(scene, p.x, p.y, 70, 0x7ff3ff, 300, 5);
          const cube = scene.add.rectangle(p.x, p.y - 30, 22, 22, 0x9ff6ff, 0.9).setStrokeStyle(3, 0xffffff).setAngle(45).setDepth(2064);
          scene.tweens.add({
            targets: cube,
            x: from.x,
            y: from.y,
            angle: 405,
            scale: 0.4,
            duration: 380,
            ease: "Cubic.In",
            onComplete: () => {
              cube.destroy();
              ring(scene, from.x, from.y + 30, 100, 0x7ff3ff, 400, 7);
            },
          });
        }),
      );
      return;
    }
    // Scalpel: the Room flashes, a cyan beam leaves the Surgeon, and a huge crescent cut crosses the boss twice.
    const room = e.points?.[0] ?? { x: e.x, y: e.y };
    ring(scene, room.x, room.y, e.radius, 0x7ff3ff, 420, 10);
    streak(scene, [from, { x: e.x, y: e.y }], 0x7ff3ff, 6);
    const tint = scene.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0x2ad6ff, 0.18).setDepth(2058);
    scene.tweens.add({ targets: tint, alpha: 0, duration: 380, onComplete: () => tint.destroy() });
    const cut = (delay: number, ang: number) =>
      scene.time.delayedCall(delay, () => {
        const g = scene.add.graphics().setPosition(e.x, e.y - 20).setDepth(2066).setAngle(ang);
        g.lineStyle(26, 0x2ad6ff, 0.35).beginPath();
        g.arc(0, 60, 150, Math.PI * 1.15, Math.PI * 1.85);
        g.strokePath();
        g.lineStyle(12, 0x9ff6ff, 0.95).beginPath();
        g.arc(0, 60, 150, Math.PI * 1.18, Math.PI * 1.82);
        g.strokePath();
        g.lineStyle(4, 0xffffff, 1).beginPath();
        g.arc(0, 60, 150, Math.PI * 1.22, Math.PI * 1.78);
        g.strokePath();
        g.setScale(0.3, 0.3);
        scene.tweens.add({ targets: g, scaleX: 1.15, scaleY: 1.15, duration: 120, ease: "Cubic.Out" });
        scene.tweens.add({ targets: g, alpha: 0, delay: 140, duration: 260, onComplete: () => g.destroy() });
        if (hasFx(scene, "slash_arc")) {
          const img = scene.add.image(e.x, e.y - 20, fxKey("slash_arc")).setTint(0x7ff3ff).setAngle(ang).setDepth(2067).setBlendMode(Phaser.BlendModes.ADD);
          img.setScale(260 / Math.max(1, img.width));
          scene.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.3, duration: 320, onComplete: () => img.destroy() });
        }
        const flash = scene.add.circle(e.x, e.y - 20, 40, 0xffffff, 0.9).setDepth(2068);
        scene.tweens.add({ targets: flash, scale: 2.4, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
        sfx("shoot", "spark");
      });
    cut(60, -25);
    cut(240, 155);
    scene.cameras.main.shake(320, 0.014);
  },
} satisfies Partial<Record<UltId, Play>>);

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
  crystal_throw: "#d9c2ff",
  moonshine: "#e8f0ff",
  reborn: "#ffb35c",
  shadow_clones: "#b9a2ff",
  hunting_storm: "#9ff0ff",
  forest_grasp: "#9be27a",
  tidal_wave: "#8fd0ff",
  star_merger: "#ffe27a",
  frozen_fields: "#bfe9ff",
  black_hole: "#d9a2ff",
  big_ben: "#ffd86b",
  surgeon_of_death: "#7ff3ff",
  resurreccion: "#5dffb0",
};

/** Plays the look of a "special" ultimate (or an Echo Spirit's repeat of one). */
export function playUltimate(scene: BattleScene, e: UltEvent, unitSprite?: { x: number; y: number }) {
  if (!e.ult) return;
  const from: Pt = { x: unitSprite?.x ?? e.x, y: (unitSprite?.y ?? e.y) - 30 };
  const quiet = e.ult === "vineyard" || e.ult === "mushroom_puff" || e.ult === "black_plague" || e.ult === "raise_dead";
  if (!quiet) sfx("ultimate");
  PLAY[e.ult]?.(scene, e, from);
  // Scalpel has its own "SCALPEL!" callout from the Sim.
  // Murcielago's Dark Zero and Lanza fire on attacks: no ultimate name over him each time.
  if (quiet || (e.ult === "surgeon_of_death" && e.radius > 0) || (e.ult === "resurreccion" && e.radius > 0)) return;
  scene.floater(from.x, from.y - 60, ULTIMATES[e.ult].name.toUpperCase() + "!", FLOAT_COLOR[e.ult] ?? "#ffd93b", 28);
}
