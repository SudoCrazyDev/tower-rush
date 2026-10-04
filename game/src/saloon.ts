import Phaser from "phaser";
import { W, H, WIDE, txt } from "./ui";
import { cover } from "./scenes/LobbyScene";
import { bakedImage } from "./bake";

/** Saloon palette: dark mahogany, warm planks and brass trim. */
export const WOOD_DARK = 0x2a150a;
export const WOOD = 0x6b3a1a;
export const WOOD_LIGHT = 0x9a5a2a;
export const BRASS = 0xd9a441;
export const BRASS_DARK = 0x7a4a12;
export const TAN = "#f1d7a8";
export const GOLD_TEXT = "#ffd77a";
const INK = "#1f0f05";

/** Text with a dark-brown outline instead of the default navy, so it sits on wood. */
export function stxt(scene: Phaser.Scene, x: number, y: number, text: string, size = 32, color = "#ffffff", origin: [number, number] = [0.5, 0.5]) {
  const t = txt(scene, x, y, text, size, color, origin);
  t.setStroke(INK, Math.max(3, Math.round(size / 6)));
  t.setShadow(0, Math.max(2, size / 14), INK, 0, true, true);
  return t;
}

export function radialTexture(scene: Phaser.Scene, key: string, size: number, stops: [number, string][]) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size)!;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

/** Soft white blob, tinted for lamp halos and card glows. */
export const GLOW = "saloon_glow";
function glowTextures(scene: Phaser.Scene) {
  radialTexture(scene, GLOW, 256, [
    [0, "rgba(255,255,255,1)"],
    [0.25, "rgba(255,255,255,0.45)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  radialTexture(scene, "saloon_mote", 16, [
    [0, "rgba(255,255,255,1)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  radialTexture(scene, "saloon_vignette", 512, [
    [0, "rgba(0,0,0,0)"],
    [0.55, "rgba(0,0,0,0)"],
    [1, "rgba(10,4,0,0.85)"],
  ]);
}

/**
 * A location art warmed into a lamp-lit saloon: amber wash, vignette, flickering lantern
 * halos (at fractions of the art) and dust drifting through the light.
 */
export function saloonAmbience(scene: Phaser.Scene, bgKey: string, lanterns: [number, number][], loop?: string, wash = 0.42) {
  glowTextures(scene);
  const bg = cover(scene, bgKey, 0, loop);
  scene.add.rectangle(W / 2, H / 2, W, H, 0x3a1a06, wash);
  scene.add.image(W / 2, H / 2, "saloon_vignette").setDisplaySize(W * 1.25, H * 1.15);
  for (const [fx, fy] of lanterns) {
    const x = bg.x + (fx - 0.5) * bg.displayWidth;
    const y = bg.y + (fy - 0.5) * bg.displayHeight;
    const glow = scene.add.image(x, y, GLOW).setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setScale(1.5).setAlpha(0.45);
    const flicker = () =>
      scene.tweens.add({
        targets: glow,
        alpha: Phaser.Math.FloatBetween(0.3, 0.6),
        scale: Phaser.Math.FloatBetween(1.35, 1.6),
        duration: Phaser.Math.Between(90, 260),
        onComplete: flicker,
      });
    flicker();
  }
  scene.add.particles(0, 0, "saloon_mote", {
    x: { min: 0, max: W },
    y: { min: 0, max: H },
    lifespan: 7000,
    speedY: { min: -14, max: -4 },
    speedX: { min: -8, max: 8 },
    scale: { min: 0.3, max: 0.9 },
    alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.55 },
    tint: 0xffd59a,
    blendMode: "ADD",
    frequency: 160,
    advance: 7000,
  });
  return bg;
}

/** A wooden plank with grain, a dark edge and a lit top lip. */
export function plank(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number, base = WOOD) {
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 4, y + 8, w, h, r);
  g.fillStyle(0x1a0c04, 1).fillRoundedRect(x - 4, y - 4, w + 8, h + 8, r + 3);
  g.fillStyle(base, 1).fillRoundedRect(x, y, w, h, r);
  g.lineStyle(2, 0x000000, 0.18);
  for (let gy = y + 16; gy < y + h - 8; gy += 18) g.lineBetween(x + r * 0.6, gy, x + w - r * 0.6, gy + Math.sin(gy) * 2);
  g.fillStyle(0xffffff, 0.12).fillRoundedRect(x + 6, y + 4, w - 12, Math.min(10, h / 4), 5);
}

export function rivets(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, inset = 16) {
  for (const [rx, ry] of [
    [x + inset, y + inset],
    [x + w - inset, y + inset],
    [x + inset, y + h - inset],
    [x + w - inset, y + h - inset],
  ]) {
    g.fillStyle(BRASS_DARK, 1).fillCircle(rx, ry, 7);
    g.fillStyle(BRASS, 1).fillCircle(rx - 1, ry - 1, 5);
    g.fillStyle(0xffffff, 0.6).fillCircle(rx - 2, ry - 2, 1.6);
  }
}

/** A framed board: plank edge, dark inset panel with vertical boards, brass trim and rivets. */
export function board(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r = 26) {
  plank(g, x, y, w, h, r, WOOD);
  g.fillStyle(WOOD_DARK, 1).fillRoundedRect(x + 14, y + 14, w - 28, h - 28, r - 8);
  g.lineStyle(2, 0x000000, 0.25);
  for (let gx = x + 50; gx < x + w - 20; gx += 46) g.lineBetween(gx, y + 18, gx, y + h - 18);
  g.lineStyle(3, BRASS, 0.85).strokeRoundedRect(x + 14, y + 14, w - 28, h - 28, r - 8);
  rivets(g, x, y, w, h, 14);
}

/** The swinging saloon sign hanging from the top bar. */
export function hangingSign(scene: Phaser.Scene, x: number, title: string, subtitle: string, w = WIDE ? 560 : 430, h = WIDE ? 128 : 116) {
  const drop = 34;
  const sign = scene.add.container(x, 76);
  const g = scene.add.graphics();
  for (const sx of [-w * 0.32, w * 0.32]) {
    for (let cy = 4; cy < drop + 6; cy += 12) {
      g.lineStyle(4, 0x3b2a18, 1).strokeEllipse(sx, cy, 10, 14);
      g.lineStyle(2, 0xb08850, 1).strokeEllipse(sx, cy, 8, 12);
    }
  }
  plank(g, -w / 2, drop, w, h, 22, 0x7a4420);
  g.lineStyle(4, BRASS, 1).strokeRoundedRect(-w / 2 + 10, drop + 10, w - 20, h - 20, 14);
  rivets(g, -w / 2, drop, w, h, 22);
  sign.add(g);
  sign.add(stxt(scene, 0, drop + h * 0.38, title, Math.round(h * 0.48), GOLD_TEXT));
  sign.add(stxt(scene, 0, drop + h * 0.78, subtitle, Math.round(h * 0.17), TAN));
  sign.setAngle(-1.4);
  scene.tweens.add({ targets: sign, angle: 1.4, yoyo: true, repeat: -1, duration: 2200, ease: "Sine.InOut" });
  return sign;
}

/** Section header: a brass-trimmed chalkboard plaque with rope trim out to a count coin. */
export function groupHeader(
  scene: Phaser.Scene,
  left: number,
  y: number,
  w: number,
  head: { title: string; sub: string; icon?: string; accent?: number },
  count: string,
) {
  const c = scene.add.container(0, y);
  const g = scene.add.graphics();
  const h = 80;
  g.lineStyle(4, BRASS, 0.7).lineBetween(left, h / 2, left + w, h / 2);
  const pw = Math.min(WIDE ? 520 : 470, w - 110);
  const px = left + 10;
  g.fillStyle(0x000000, 0.4).fillRoundedRect(px + 4, 8, pw, h, 16);
  g.fillStyle(BRASS_DARK, 1).fillRoundedRect(px - 4, -4, pw + 8, h + 8, 18);
  g.fillStyle(0x1f2a22, 1).fillRoundedRect(px, 0, pw, h, 14);
  g.fillStyle(0xffffff, 0.05).fillRoundedRect(px + 10, 8, pw - 20, h / 2 - 8, 10);
  g.lineStyle(3, BRASS, 1).strokeRoundedRect(px, 0, pw, h, 14);
  if (head.accent !== undefined) g.fillStyle(head.accent, 1).fillRoundedRect(px + 8, 12, 8, h - 24, 4);
  c.add(g);
  let tx = px + 28;
  if (head.icon) {
    const icon = scene.add.image(px + 56, h / 2, head.icon);
    icon.setScale(60 / Math.max(icon.width, icon.height));
    c.add(icon);
    tx = px + 98;
  }
  const accentCss = head.accent !== undefined ? "#" + head.accent.toString(16).padStart(6, "0") : GOLD_TEXT;
  c.add(stxt(scene, tx, 28, head.title, 34, accentCss, [0, 0.5]));
  c.add(stxt(scene, tx + 2, 60, head.sub, 19, "#d8e2d0", [0, 0.5]));
  const label = stxt(scene, 0, h / 2 - 1, count, 24);
  const cw = Math.max(56, label.width + 26);
  const bx = left + w - cw / 2 - 4;
  label.setX(bx);
  g.fillStyle(BRASS_DARK, 1).fillRoundedRect(bx - cw / 2 - 4, h / 2 - 28, cw + 8, 56, 28);
  g.fillStyle(BRASS, 1).fillRoundedRect(bx - cw / 2, h / 2 - 24, cw, 48, 24);
  g.fillStyle(0xffffff, 0.25).fillRoundedRect(bx - cw / 2 + 8, h / 2 - 20, cw - 16, 10, 5);
  c.add(label);
  return c;
}

/** A wall shelf with brackets, for things to stand on. */
export function shelf(scene: Phaser.Scene, x: number, y: number, w: number) {
  const g = scene.add.graphics();
  for (const bx of [x + 70, x + w - 70]) {
    g.fillStyle(0x1a0c04, 1).fillTriangle(bx - 20, y + 22, bx + 20, y + 22, bx, y + 62);
    g.fillStyle(BRASS_DARK, 1).fillTriangle(bx - 14, y + 22, bx + 14, y + 22, bx, y + 54);
  }
  g.fillStyle(0x000000, 0.35).fillRect(x + 10, y + 30, w - 20, 12);
  plank(g, x, y, w, 26, 6, WOOD_LIGHT);
  return g;
}

/** A brass/wood toggle chip. `paint(on)` restyles it. */
export function chip(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, icon?: string) {
  const face = bakedImage(scene);
  const size = Math.round(h * 0.4);
  const t = stxt(scene, icon ? h * 0.28 : 0, -1, label, size, TAN);
  const parts: Phaser.GameObjects.GameObject[] = [face, t];
  if (icon) {
    const img = scene.add.image(-w / 2 + h * 0.48, 0, icon);
    img.setScale((h * 0.58) / Math.max(img.width, img.height));
    parts.push(img);
    t.setX(Math.max(t.x, -w / 2 + h * 0.9 + t.width / 2));
  }
  const c = scene.add.container(x, y, parts).setSize(w, h);
  const paint = (on: boolean) => {
    face.draw((g) => {
      g.fillStyle(0x000000, 0.4).fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, h * 0.28);
      g.fillStyle(on ? BRASS_DARK : 0x1a0c04, 1).fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, h * 0.3);
      g.fillStyle(on ? BRASS : 0x4a2812, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h * 0.28);
      g.fillStyle(0xffffff, on ? 0.3 : 0.08).fillRoundedRect(-w / 2 + 8, -h / 2 + 5, w - 16, h * 0.17, 6);
    });
    t.setColor(on ? "#fff8e0" : TAN);
  };
  return Object.assign(c, { paint, label: t });
}

/**
 * A vertical scroll area: drag with momentum and a little rubber band, wheel, a brass
 * scroll knob and soft shaded edges. Call `setHeight` after filling `content`.
 */
export class ScrollView {
  readonly content: Phaser.GameObjects.Container;
  /** True when the last pointer press turned into a drag (taps should be ignored). */
  dragged = false;
  private scroll = 0;
  private target = 0;
  private max = 0;
  private drag: { y: number; scroll: number; last: number; v: number } | null = null;
  private track: ReturnType<typeof bakedImage>;
  private thumb: ReturnType<typeof bakedImage>;
  private thumbLen = 0;

  constructor(
    private scene: Phaser.Scene,
    readonly rect: Phaser.Geom.Rectangle,
  ) {
    const { x, y, width, height } = rect;
    this.content = scene.add.container(0, y);
    const mask = scene.make.graphics({}, false).fillRect(x, y, width, height);
    this.content.setMask(mask.createGeometryMask());
    const g = scene.add.graphics();
    const dark = 0x140802;
    g.fillGradientStyle(dark, dark, dark, dark, 0.75, 0.75, 0, 0).fillRect(x, y, width, 26);
    g.fillGradientStyle(dark, dark, dark, dark, 0, 0, 0.8, 0.8).fillRect(x, y + height - 40, width, 40);
    this.track = bakedImage(scene);
    this.thumb = bakedImage(scene);

    const inView = (p: Phaser.Input.Pointer) => rect.contains(p.worldX, p.worldY);
    // A press on something interactive outside the list (a dialog's backdrop, say) isn't a scroll.
    const owns = (o: Phaser.GameObjects.GameObject | null): boolean => !!o && (o === this.content || owns(o.parentContainer));
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      this.dragged = false;
      if (!inView(p) || (over[0] && !owns(over[0]))) return;
      this.drag = { y: p.worldY, scroll: this.scroll, last: p.worldY, v: 0 };
    });
    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || !p.isDown) return;
      if (Math.abs(p.worldY - d.y) > 12) this.dragged = true;
      if (!this.dragged) return;
      d.v = d.last - p.worldY;
      d.last = p.worldY;
      const raw = d.scroll + (d.y - p.worldY);
      const over = raw < 0 ? raw : raw > this.max ? raw - this.max : 0;
      this.scroll = this.target = raw - over * 0.65;
    });
    const release = () => {
      if (this.drag && this.dragged) this.target = Phaser.Math.Clamp(this.scroll + this.drag.v * 14, 0, this.max);
      this.drag = null;
    };
    scene.input.on("pointerup", release);
    scene.input.on("pointerupoutside", release);
    scene.input.on("wheel", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (inView(p) && !(over[0] && !owns(over[0]))) this.target = Phaser.Math.Clamp(this.target + dy, 0, this.max);
    });
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", () => scene.events.off("update", this.update, this));
  }

  /** Whether a tap that just ended should count: not a drag, and inside the visible area. */
  tapOk() {
    const p = this.scene.input.activePointer;
    return !this.dragged && this.rect.contains(p.worldX, p.worldY);
  }

  setHeight(contentH: number, resetScroll = true) {
    this.max = Math.max(0, contentH - this.rect.height);
    if (resetScroll) this.scroll = this.target = 0;
    this.content.y = this.rect.y - this.scroll;
    this.thumbLen = 0;
    this.drawKnob();
    cull(this.content, this.scroll, this.rect.height);
  }

  private update() {
    if (!this.drag || !this.dragged) {
      this.target = Phaser.Math.Clamp(this.target, 0, this.max);
      this.scroll += (this.target - this.scroll) * 0.18;
      if (Math.abs(this.target - this.scroll) < 0.3) this.scroll = this.target;
    }
    const y = this.rect.y - this.scroll;
    if (this.content.y !== y) {
      this.content.y = y;
      this.drawKnob();
      cull(this.content, this.scroll, this.rect.height);
    }
  }

  private drawKnob() {
    const { y: top, height } = this.rect;
    const x = this.rect.right - 12;
    const span = height - 40;
    const len = Math.max(80, (span * height) / (this.max + height));
    if (this.max <= 0) {
      this.track.setVisible(false);
      this.thumb.setVisible(false);
      return;
    }
    // Redrawn only when the content height changes; scrolling just moves the thumb.
    if (len !== this.thumbLen) {
      this.thumbLen = len;
      this.track.draw((g) => g.fillStyle(0x000000, 0.35).fillRoundedRect(x - 4, top + 20, 8, span, 4));
      this.thumb.draw((g) => g.fillStyle(BRASS, 0.9).fillRoundedRect(x - 5, 0, 10, len, 5));
    }
    this.thumb.y = top + 20 + (span - len) * Phaser.Math.Clamp(this.scroll / this.max, 0, 1);
  }
}

/**
 * Hide a scroll list's items that are well outside the visible band, so the renderer skips
 * them. Items are placed by their top or centre, hence the generous margin.
 */
export function cull(content: Phaser.GameObjects.Container, scroll: number, height: number, margin = 600) {
  for (const o of content.list as (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Visible)[]) {
    o.setVisible(o.y > scroll - margin && o.y < scroll + height + margin / 2);
  }
}
