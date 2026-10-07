import Phaser from "phaser";
import { BUTTON, ICON, type ButtonColor } from "./assets";
import { UNIT_BY_ID, RARITY_STATS } from "./data/units";
import type { UnitDef } from "../../shared/units.ts";
import { sfx, audioSettings, setAudio } from "./audio";
import { LAYOUT, RES } from "./display";
import { RACES, raceCss, raceLabel, type Race } from "../../shared/races.ts";


export const WIDE = LAYOUT.wide;
export const W = LAYOUT.w;
export const H = LAYOUT.h;
/** The arena art's own size; battle world coordinates use it. */
export const ARENA_W = 752;
export const ARENA_H = 1344;
export const FONT = "'Lilita One', 'Arial Black', sans-serif";
export const NAVY = 0x14183a;
export const NAVY_CSS = "#14183a";

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 32,
  color = "#ffffff",
  origin: [number, number] = [0.5, 0.5],
) {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      stroke: NAVY_CSS,
      strokeThickness: Math.max(3, Math.round(size / 6)),
      align: "center",
      // Rasterise at the render scale so text stays crisp when the canvas is drawn above 1x.
      resolution: RES,
      shadow: { offsetX: 0, offsetY: Math.max(2, size / 14), color: NAVY_CSS, fill: true, stroke: true, blur: 0 },
    })
    .setOrigin(origin[0], origin[1]);
}

/** Make any game object behave like a button (press squash + click). */
export function pressable<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform>(obj: T, onClick: () => void): T {
  const scene = obj.scene;
  const base = { x: obj.scaleX, y: obj.scaleY };
  obj.setInteractive({ useHandCursor: true });
  obj.on("pointerdown", () => scene.tweens.add({ targets: obj, scaleX: base.x * 0.92, scaleY: base.y * 0.92, duration: 60 }));
  obj.on("pointerout", () => scene.tweens.add({ targets: obj, scaleX: base.x, scaleY: base.y, duration: 80 }));
  obj.on("pointerup", (p: Phaser.Input.Pointer) => {
    scene.tweens.add({ targets: obj, scaleX: base.x, scaleY: base.y, duration: 80 });
    // A swipe that starts and ends on it isn't a tap.
    if (p.getDistance() > 40) return;
    sfx("click");
    onClick();
  });
  return obj;
}

/**
 * Horizontal swipes that start inside `area` call `fn(1)` for the next page (swiped left) or
 * `fn(-1)` for the previous one. A swipe that starts on something outside `root` (a dialog on
 * top, say) is ignored.
 */
export function onSwipe(scene: Phaser.Scene, area: Phaser.Geom.Rectangle, root: () => Phaser.GameObjects.GameObject | undefined, fn: (dir: 1 | -1) => void) {
  const within = (o: Phaser.GameObjects.GameObject | null, r?: Phaser.GameObjects.GameObject): boolean => !!o && !!r && (o === r || within(o.parentContainer, r));
  let armed = false;
  scene.input.on("pointerdown", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
    armed = area.contains(p.x, p.y) && (!over[0] || within(over[0], root()));
  });
  scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
    if (!armed) return;
    armed = false;
    const dx = p.upX - p.downX;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(p.upY - p.downY) * 1.2) fn(dx < 0 ? 1 : -1);
  });
}

/**
 * A card's ornate frame: a layered gold rim with blue gems on the corners and sides (grey while
 * locked), centred on 0,0. `art` is the art window to edge in gold; `trim` (that edge and the
 * gems) goes above the art and `frame` below it.
 */
export function ornateFrame(scene: Phaser.Scene, w: number, h: number, locked: boolean, art?: { x: number; y: number; w: number; h: number }) {
  const [dark, gold, light] = locked ? [0x3e4252, 0x8a8fa8, 0xd0d4e0] : [0x6b3f08, 0xf2b630, 0xfff0a8];
  const frame = scene.add.graphics();
  frame.fillStyle(NAVY, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, 36);
  frame.lineStyle(16, dark, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 36);
  frame.lineStyle(9, gold, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 36);
  frame.lineStyle(2, light, 0.9).strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 38);
  frame.lineStyle(2, dark, 1).strokeRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 28);
  const trim = scene.add.graphics();
  if (art) {
    trim.lineStyle(10, dark, 1).strokeRoundedRect(art.x - 2, art.y - 2, art.w + 4, art.h + 4, 14);
    trim.lineStyle(5, gold, 1).strokeRoundedRect(art.x - 2, art.y - 2, art.w + 4, art.h + 4, 14);
    trim.lineStyle(2, light, 0.8).strokeRoundedRect(art.x + 2, art.y + 2, art.w - 4, art.h - 4, 11);
  }
  const V = Phaser.Math.Vector2;
  const diamond = (x: number, y: number, r: number) => {
    const pts = [new V(x, y - r * 1.3), new V(x + r, y), new V(x, y + r * 1.3), new V(x - r, y)];
    const grow = (k: number) => pts.map((p) => new V(x + (p.x - x) * k, y + (p.y - y) * k));
    trim.fillStyle(dark, 1).fillPoints(grow(1.35), true);
    trim.fillStyle(gold, 1).fillPoints(grow(1.15), true);
    trim.fillStyle(locked ? 0x9aa0b8 : 0x3f8cff, 1).fillPoints(pts, true);
    trim.fillStyle(0xffffff, 0.75).fillPoints([pts[0], new V(x + r * 0.35, y - r * 0.2), new V(x, y), new V(x - r * 0.35, y - r * 0.2)], true);
  };
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) diamond(x * (w / 2 - 8), y * (h / 2 - 8), 13);
  for (const x of [-1, 1]) diamond((x * w) / 2, h * 0.09, 11);
  return { frame, trim };
}

export interface Button extends Phaser.GameObjects.Container {
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): Button;
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: ButtonColor,
  onClick: () => void,
  fontSize = Math.round(h * 0.42),
): Button {
  const bg = scene.add.nineslice(0, 0, `button:${BUTTON[color]}`, undefined, w, h, 48, 48, 40, 44);
  const t = txt(scene, 0, -2, label, fontSize);
  const c = scene.add.container(x, y, [bg, t]) as Button;
  c.label = t;
  c.setSize(w, h);
  let enabled = true;
  pressable(c, () => enabled && onClick());
  c.setEnabled = (on: boolean) => {
    enabled = on;
    bg.setTint(on ? 0xffffff : 0x777777);
    c.setAlpha(on ? 1 : 0.85);
    return c;
  };
  return c;
}

export function iconButton(scene: Phaser.Scene, x: number, y: number, icon: keyof typeof ICON, size: number, onClick: () => void) {
  const img = scene.add.image(x, y, `icon:${ICON[icon]}`);
  img.setScale(size / Math.max(img.width, img.height));
  return pressable(img, onClick);
}

/** Small resource pill: icon + number, e.g. coins in the top bar. */
export function resourcePill(scene: Phaser.Scene, x: number, y: number, icon: string, value: string, w = 170) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.45).fillRoundedRect(-w / 2 + 14, -22, w - 14, 44, 22);
  g.lineStyle(3, NAVY, 1).strokeRoundedRect(-w / 2 + 14, -22, w - 14, 44, 22);
  const img = scene.add.image(-w / 2 + 16, 0, icon);
  img.setScale(60 / Math.max(img.width, img.height));
  const t = txt(scene, 14, 0, value, 26);
  const c = scene.add.container(x, y, [g, img, t]);
  return Object.assign(c, { text: t });
}

/** Portrait size as a share of the card frame: fills the frame's inner window without covering its border. */
export const PORTRAIT_FIT = 0.68;

/** A unit card: rarity frame + portrait, with optional level and dimmed state. */
export function cardView(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  id: string,
  opts: { level?: number; locked?: boolean; name?: boolean; awakened?: boolean } = {},
) {
  const def = UNIT_BY_ID[id];
  const frame = scene.add.image(0, 0, `card:frame_${opts.awakened ? "mythic" : def.rarity}`).setDisplaySize(size, size);
  const art = opts.awakened && scene.textures.exists(`portrait_awakened:${id}`) ? `portrait_awakened:${id}` : `portrait:${id}`;
  const portrait = scene.add.image(0, 0, art).setDisplaySize(size * PORTRAIT_FIT, size * PORTRAIT_FIT);
  const parts: Phaser.GameObjects.GameObject[] = [frame, portrait];
  // Element badge in the corner (an icon, so it doesn't read as a notification dot).
  parts.push(fitImage(scene.add.image(size * 0.35, -size * 0.35, `element:${def.element}`), size * 0.24));
  if (opts.level !== undefined) {
    const lv = txt(scene, 0, size * 0.39, `LV ${opts.level}`, Math.round(size * 0.15));
    parts.push(lv);
  }
  const kitRow = size >= KIT_ROW_MIN_SIZE ? kitIconRow(scene, def, size) : [];
  parts.push(...kitRow);
  if (opts.name) {
    parts.push(txt(scene, 0, size * (kitRow.length ? 0.64 : 0.58), def.name, Math.round(size * 0.12), "#ffffff"));
  }
  if (opts.locked) {
    portrait.setTint(0x333344);
    frame.setTint(0x555566);
    const lock = scene.add.image(0, 0, "ui:padlock");
    lock.setScale((size * 0.4) / lock.width);
    parts.push(lock);
  }
  const c = scene.add.container(x, y, parts);
  c.setSize(size, size);
  return c;
}

/** Cards smaller than this (px) skip the kit icon row. */
export const KIT_ROW_MIN_SIZE = 90;
const KIT_ROW_MAX = 4;

/**
 * Icons for a unit's kit slots that have art (primary first), then its perks, centred along the card's
 * bottom edge (below the LV text). More than 4 shows the first 3 plus a "+N" chip. Empty when no art is loaded.
 */
function kitIconRow(scene: Phaser.Scene, def: UnitDef, size: number): Phaser.GameObjects.GameObject[] {
  const slots = [
    ...def.kit.map((s) => ({ kind: "arch" as const, id: s.arch as string })),
    ...def.perks.map((p) => ({ kind: "perk" as const, id: p.perk as string })),
  ].filter((s) => scene.textures.exists(`${s.kind}:${s.id}`));
  if (!slots.length) return [];
  const shown = slots.length > KIT_ROW_MAX ? slots.slice(0, KIT_ROW_MAX - 1) : slots;
  const extra = slots.length - shown.length;
  const icon = size * 0.15;
  const gap = icon * 0.12;
  const n = shown.length + (extra ? 1 : 0);
  const y = size * 0.5;
  let x = (-(n * icon + (n - 1) * gap) + icon) / 2;
  const out: Phaser.GameObjects.GameObject[] = [];
  const bg = scene.add.graphics();
  const half = (n * icon + (n - 1) * gap) / 2 + icon * 0.15;
  bg.fillStyle(0x0b1530, 0.8).fillRoundedRect(-half, y - icon * 0.62, half * 2, icon * 1.24, icon * 0.3);
  out.push(bg);
  for (const s of shown) {
    out.push(fitImage(scene.add.image(x, y, `${s.kind}:${s.id}`), icon));
    x += icon + gap;
  }
  if (extra) out.push(txt(scene, x, y, `+${extra}`, Math.round(icon * 0.8), "#ffffff"));
  return out;
}

/** A hero card: gold frame + hero portrait, optionally locked. */
export function heroCardView(scene: Phaser.Scene, x: number, y: number, size: number, id: string, opts: { locked?: boolean; name?: string } = {}) {
  const frame = scene.add.image(0, 0, "card:frame_legendary").setDisplaySize(size, size);
  const portrait = scene.add.image(0, 0, `hero_portrait:${id}`).setDisplaySize(size * PORTRAIT_FIT, size * PORTRAIT_FIT);
  const parts: Phaser.GameObjects.GameObject[] = [frame, portrait];
  if (opts.name) parts.push(txt(scene, 0, size * 0.58, opts.name, Math.round(size * 0.12), "#ffffff"));
  if (opts.locked) {
    portrait.setTint(0x333344);
    frame.setTint(0x555566);
    const lock = scene.add.image(0, 0, "ui:padlock");
    lock.setScale((size * 0.4) / lock.width);
    parts.push(lock);
  }
  const c = scene.add.container(x, y, parts);
  c.setSize(size, size);
  return c;
}

/** Cards from a chest, popping in one by one (4 per row). Returns the card containers. */
export function lootCards(
  scene: Phaser.Scene,
  cx: number,
  y: number,
  cards: { id: string; copies: number; isNew: boolean }[],
  size = 120,
  cols = 4,
  max = 12,
) {
  return cards.slice(0, max).map((card, i) => {
    const x = cx + ((i % cols) - (Math.min(cols, cards.length) - 1) / 2) * (size + 30);
    const v = cardView(scene, x, y + Math.floor(i / cols) * (size + 70), size, card.id);
    v.add(txt(scene, 0, size * 0.69, `x${card.copies}`, 26));
    if (card.isNew) v.add(txt(scene, 0, -size * 0.55, "NEW!", 24, "#7dff7a"));
    v.setScale(0);
    scene.tweens.add({ targets: v, scale: 1, delay: i * Math.min(150, 1800 / cards.length), duration: 250, ease: "Back.Out" });
    return v;
  });
}

/** A small red count badge (e.g. on a lobby button with something to claim). */
export function badge(scene: Phaser.Scene, x: number, y: number, text: string) {
  const g = scene.add.graphics();
  g.fillStyle(0xe8333a, 1).fillCircle(0, 0, 22);
  g.lineStyle(4, 0xffffff, 1).strokeCircle(0, 0, 22);
  const c = scene.add.container(x, y, [g, txt(scene, 0, -1, text, 26)]);
  scene.tweens.add({ targets: c, scale: 1.15, yoyo: true, repeat: -1, duration: 500, ease: "Sine.InOut" });
  return c;
}

export const rarityColor = (id: string) => RARITY_STATS[UNIT_BY_ID[id].rarity].color;

/** Darkened full-screen blocker + panel for modal dialogs. Returns the content container. */
export function modal(scene: Phaser.Scene, w: number, h: number, title: string, onClose?: () => void) {
  const root = scene.add.container(0, 0).setDepth(5000).setScrollFactor(0);
  // Pointer hit-tests use each child's own scrollFactor, not the container's, so
  // everything added to the dialog must be screen-fixed too (the battle camera scrolls
  // in the wide layout, which otherwise shifts every button's hit area).
  const pin = (o: Phaser.GameObjects.GameObject) => {
    (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0);
    if (o instanceof Phaser.GameObjects.Container) o.list.forEach(pin);
  };
  const addRaw = root.add.bind(root);
  root.add = ((child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]) => {
    addRaw(child);
    (Array.isArray(child) ? child : [child]).forEach(pin);
    return root;
  }) as typeof root.add;
  const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setInteractive();
  const panel = scene.add.nineslice(W / 2, H / 2, "ui:panel_dialog", undefined, w, h, 80, 80, 110, 60);
  const t = txt(scene, W / 2, H / 2 - h / 2 + 34, title, 38, "#fff4c2");
  root.add([shade, panel, t]);
  const close = () => {
    root.destroy();
    onClose?.();
  };
  if (onClose) root.add(iconButton(scene, W / 2 + w / 2 - 26, H / 2 - h / 2 + 26, "close", 64, close));
  root.setScale(0.9).setAlpha(0);
  scene.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 140, ease: "Back.Out" });
  // Scale around screen centre.
  root.setPosition((W / 2) * 0.1, (H / 2) * 0.1);
  scene.tweens.add({ targets: root, x: 0, y: 0, duration: 140, ease: "Back.Out" });
  return Object.assign(root, { close, cx: W / 2, cy: H / 2 });
}

/** Scale an image to fit inside a size x size box, keeping its aspect (element emblems are not square). */
export function fitImage<T extends Phaser.GameObjects.Image>(img: T, size: number): T {
  const f = img.frame;
  const k = size / Math.max(f.realWidth, f.realHeight, 1);
  return img.setDisplaySize(f.realWidth * k, f.realHeight * k) as T;
}

/** Element emblem fitted into a size x size box. */
export const elementIcon = (scene: Phaser.Scene, x: number, y: number, element: string, size: number) =>
  fitImage(scene.add.image(x, y, `element:${element}`), size);

/**
 * Archetype or perk icon (`arch:<id>` / `perk:<id>`) fitted into size x size, or null when that
 * art isn't loaded (not uploaded yet, or pending generation). Callers skip or fall back on null.
 */
export function kitIcon(scene: Phaser.Scene, kind: "arch" | "perk", id: string, size: number, x = 0, y = 0) {
  const key = `${kind}:${id}`;
  return scene.textures.exists(key) ? fitImage(scene.add.image(x, y, key), size) : null;
}

/** A small "RACE / Human" plate in the race's colour; shows the race crest when that art is loaded. */
export function raceBadge(scene: Phaser.Scene, x: number, y: number, race: Race) {
  const color = RACES[race]?.color ?? 0xffffff;
  const crest = scene.textures.exists(`race:${race}`);
  const h = crest ? 100 : 72;
  const g = scene.add.graphics();
  g.fillStyle(0x0b1530, 0.85).fillRoundedRect(-64, -h / 2, 128, h, 16);
  g.lineStyle(3, color, 1).strokeRoundedRect(-64, -h / 2, 128, h, 16);
  if (crest) {
    const img = fitImage(scene.add.image(0, -14, `race:${race}`), 64);
    return scene.add.container(x, y, [g, img, txt(scene, 0, 34, raceLabel(race).toUpperCase(), 18, raceCss(race))]);
  }
  return scene.add.container(x, y, [g, txt(scene, 0, -14, "RACE", 18, "#c9d2ff"), txt(scene, 0, 12, raceLabel(race).toUpperCase(), 20, raceCss(race))]);
}

export function fmt(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return Math.round(n).toString();
}

/** Floating text that rises and fades. */
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = "#ffffff", size = 26) {
  const t = txt(scene, x, y, text, size, color).setDepth(500);
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 800, ease: "Cubic.Out", onComplete: () => t.destroy() });
  return t;
}

/** Short message near the bottom of the screen. */
export function toast(scene: Phaser.Scene, msg: string, color = "#ffb0b0") {
  const t = txt(scene, W / 2, H - 230, msg, 30, color).setDepth(6000).setScrollFactor(0);
  scene.tweens.add({ targets: t, alpha: 0, y: H - 260, delay: 1600, duration: 300, onComplete: () => t.destroy() });
}

/** Run a server action; on failure show its error as a toast. Resolves to whether it worked. */
export async function attempt(scene: Phaser.Scene, action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (e) {
    if (scene.sys.isActive()) toast(scene, (e as Error).message);
    return false;
  }
}

/** Music / sound on-off buttons, side by side (for settings and pause dialogs). */
export function audioButtons(scene: Phaser.Scene, x: number, y: number) {
  const make = (kind: "music" | "sfx", dx: number) => {
    const name = kind === "music" ? "MUSIC" : "SOUND";
    const label = () => `${name}: ${audioSettings()[kind] ? "ON" : "OFF"}`;
    const b: Button = button(scene, x + dx, y, 230, 84, label(), audioSettings()[kind] ? "blue" : "grey", () => {
      setAudio(kind, !audioSettings()[kind]);
      b.label.setText(label());
      (b.list[0] as Phaser.GameObjects.NineSlice).setTexture(`button:${audioSettings()[kind] ? 2 : 4}`);
    }, 30);
    return b;
  };
  return [make("music", -122), make("sfx", 122)];
}
