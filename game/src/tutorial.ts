/**
 * Onboarding tutorial: a guided first battle (summon, merge, power up), then a short tour
 * of the deck screen. Every account gets each part once; finishing or skipping it is saved
 * on the server (profile.tutorial), so it never shows again on any device.
 */
import Phaser from "phaser";
import { profile, finishTutorial } from "./save";
import { W, H, NAVY, txt, button } from "./ui";
import type { TutorialPart } from "../../shared/profile.ts";

/** Whether this part of the tutorial should run now. The deck tour follows a finished battle tutorial. */
export function tutorialDue(part: TutorialPart) {
  const done = profile.tutorial ?? [];
  if (done.includes(part)) return false;
  return part === "battle" || done.includes("battle");
}
/** Mark parts done (also locally, so a lost connection still won't repeat them this session). */
export function setTutorialDone(...parts: TutorialPart[]) {
  finishTutorial(parts).catch(() => {});
}
function skipAll() {
  setTutorialDone("battle", "deck");
}

export interface Pt {
  x: number;
  y: number;
}
/** Coach marks sit over the HUD but under dialogs (pause, card details). */
const DEPTH = 4900;

/** A bouncing gold arrow with a pulsing ring around the spot (screen coordinates). */
export function pointAt(scene: Phaser.Scene, at: Pt, dir: "down" | "up" = "down", caption?: string, r = 58) {
  const ring = scene.add.graphics();
  ring.lineStyle(8, NAVY, 0.6).strokeCircle(0, 0, r);
  ring.lineStyle(5, 0xffd93b, 1).strokeCircle(0, 0, r);
  scene.tweens.add({ targets: ring, scale: { from: 0.8, to: 1.15 }, alpha: { from: 1, to: 0.35 }, yoyo: true, repeat: -1, duration: 600, ease: "Sine.InOut" });
  const s = dir === "down" ? -1 : 1;
  const arrow = scene.add.graphics();
  const tri = (g: Phaser.GameObjects.Graphics, grow: number) =>
    g.fillTriangle(-34 - grow, 0, 34 + grow, 0, 0, -s * (44 + grow)).fillRect(-14 - grow, 0, 28 + grow * 2, s * (40 + grow));
  tri(arrow.fillStyle(NAVY, 1), 5);
  tri(arrow.fillStyle(0xffd93b, 1), 0);
  // The arrow's tip points at the ring's edge.
  arrow.setPosition(0, s * (r + 54));
  const parts: Phaser.GameObjects.GameObject[] = [ring, arrow];
  if (caption) parts.push(txt(scene, 0, s * (r + 128), caption, 30, "#ffd93b"));
  scene.tweens.add({ targets: arrow, y: s * (r + 34), yoyo: true, repeat: -1, duration: 420, ease: "Sine.InOut" });
  return scene.add.container(at.x, at.y, parts).setDepth(DEPTH).setScrollFactor(0);
}

/** A ghost finger sliding from one spot to another, over and over. */
function dragHint(scene: Phaser.Scene, from: Pt, to: Pt) {
  const g = scene.add.graphics();
  g.lineStyle(6, 0xffd93b, 0.5).lineBetween(from.x, from.y, to.x, to.y);
  const finger = scene.add.graphics();
  finger.fillStyle(NAVY, 0.8).fillCircle(0, 0, 30).fillStyle(0xffffff, 0.95).fillCircle(0, 0, 24);
  finger.setPosition(from.x, from.y);
  scene.tweens.chain({
    targets: finger,
    loop: -1,
    tweens: [
      { alpha: { from: 0, to: 1 }, scale: { from: 1.4, to: 1 }, x: from.x, y: from.y, duration: 250 },
      { x: to.x, y: to.y, duration: 800, ease: "Sine.InOut" },
      { alpha: 0, scale: 1.4, duration: 250, delay: 150 },
    ],
  });
  return scene.add.container(0, 0, [g, finger]).setDepth(DEPTH).setScrollFactor(0);
}

function pin<T extends Phaser.GameObjects.GameObject>(o: T): T {
  (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0);
  if (o instanceof Phaser.GameObjects.Container) o.list.forEach(pin);
  return o;
}

export interface CoachStep {
  text: string;
  /** Centre of the text panel (screen coordinates). */
  y: number;
  x?: number;
  point?: Pt;
  dir?: "down" | "up";
  /** Radius of the ring around `point`. */
  r?: number;
  drag?: [Pt, Pt];
  /** Shows a button that ends the step; without one the step waits for the game to call `next`. */
  ok?: string;
}

/**
 * Runs coach steps one after another. Steps without an OK button wait for the caller to
 * call `next()` (e.g. after the player summons). `onEnd` runs once, finished or skipped.
 */
export function coach(scene: Phaser.Scene, steps: (CoachStep | (() => CoachStep | null))[], onEnd: (skipped: boolean) => void) {
  let i = -1;
  let shown: Phaser.GameObjects.GameObject[] = [];
  let ended = false;
  const clear = () => {
    shown.forEach((o) => o.destroy());
    shown = [];
  };
  const end = (skipped: boolean) => {
    if (ended) return;
    ended = true;
    clear();
    if (skipped) skipAll();
    onEnd(skipped);
  };
  const next = () => {
    if (ended) return;
    clear();
    let step: CoachStep | null = null;
    while (!step && ++i < steps.length) {
      const s = steps[i];
      step = typeof s === "function" ? s() : s;
    }
    if (!step) return end(false);
    show(step);
  };
  const show = (s: CoachStep) => {
    const w = Math.min(680, W - 40);
    const cx = s.x ?? W / 2;
    const body = txt(scene, 0, 0, s.text, 28, "#ffffff").setWordWrapWidth(w - 60);
    const btnH = 76;
    const h = body.height + 56 + btnH + 10;
    const top = -h / 2;
    body.setY(top + 26 + body.height / 2);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 4, top + 8, w, h, 26);
    bg.fillStyle(0x10133a, 0.94).fillRoundedRect(-w / 2, top, w, h, 26);
    bg.lineStyle(5, 0xf2b630, 1).strokeRoundedRect(-w / 2, top, w, h, 26);
    const parts: Phaser.GameObjects.GameObject[] = [bg, body];
    const by = h / 2 - btnH / 2 - 16;
    // Skipping ends the whole tutorial for good (battle and deck tour).
    parts.push(button(scene, -w / 2 + 120, by, 200, btnH, "SKIP", "grey", () => end(true), 30));
    if (s.ok) parts.push(button(scene, w / 2 - 130, by, 220, btnH, s.ok, "green", next, 32));
    const panel = scene.add.container(cx, Math.min(H - h / 2 - 10, Math.max(h / 2 + 10, s.y)), parts).setDepth(DEPTH + 1).setScrollFactor(0);
    // Containers need every child screen-fixed too, or hit areas drift when the camera scrolls.
    pin(panel);
    panel.setScale(0.85).setAlpha(0);
    scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 180, ease: "Back.Out" });
    shown.push(panel);
    if (s.point) shown.push(pin(pointAt(scene, s.point, s.dir, undefined, s.r)));
    if (s.drag) shown.push(pin(dragHint(scene, ...s.drag)));
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (ended = true));
  next();
  return { next, end: () => end(false) };
}
