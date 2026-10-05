import Phaser from "phaser";
import { BUTTON, ICON, type ButtonColor } from "./assets";
import { UNIT_BY_ID, RARITY_STATS } from "./data/units";
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
  obj.on("pointerup", () => {
    scene.tweens.add({ targets: obj, scaleX: base.x, scaleY: base.y, duration: 80 });
    sfx("click");
    onClick();
  });
  return obj;
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
  parts.push(scene.add.image(size * 0.35, -size * 0.35, `element:${def.element}`).setDisplaySize(size * 0.24, size * 0.24));
  if (opts.level !== undefined) {
    const lv = txt(scene, 0, size * 0.39, `LV ${opts.level}`, Math.round(size * 0.15));
    parts.push(lv);
  }
  if (opts.name) {
    parts.push(txt(scene, 0, size * 0.58, def.name, Math.round(size * 0.12), "#ffffff"));
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
    v.add(txt(scene, 0, size * 0.63, `x${card.copies}`, 26));
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

/** A small "RACE / Human" plate in the race's colour. */
export function raceBadge(scene: Phaser.Scene, x: number, y: number, race: Race) {
  const g = scene.add.graphics();
  g.fillStyle(0x0b1530, 0.85).fillRoundedRect(-64, -36, 128, 72, 16);
  g.lineStyle(3, RACES[race]?.color ?? 0xffffff, 1).strokeRoundedRect(-64, -36, 128, 72, 16);
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
