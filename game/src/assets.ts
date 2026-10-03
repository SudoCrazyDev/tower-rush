import Phaser from "phaser";
import { HD } from "./display";

/** Shape of public/assets/index.json (written by tools/build_assets.py). */
export interface AssetIndex {
  units: string[];
  units_awakened: string[];
  heroes: string[];
  monsters: string[];
  bosses: string[];
  portraits: string[];
  portraits_awakened: string[];
  portraits_heroes: string[];
  cards: string[];
  items: string[];
  ui: string[];
  vfx: string[];
  locations: string[];
  boss_banners: string[];
  emotes: string[];
  stats: string[];
  anims: Record<string, string[]>;
  /** Frame size per sheet folder, including the `<folder>_hd` twins. */
  frameSize: Record<string, number>;
  /** Slices of the button, icon and league_ranks sheets (`leagues` is missing in older builds). */
  atlas: { buttons: number; icons: number; leagues?: number };
  /** Ambient location loops and the trailer, in `video/<name>.mp4`. */
  videos: string[];
  /** "<folder>/<name>" sheets whose background didn't key out cleanly; treated as missing. */
  hazy: string[];
}

export const BASE = "assets/";
let index: AssetIndex;

export const assetIndex = () => index;
export const setAssetIndex = (i: AssetIndex) => (index = i);

/** Round icon buttons sliced from icon_buttons_set, in atlas order. */
export const ICON = {
  settings: 0,
  pause: 1,
  play: 2,
  close: 3,
  back: 4,
  cart: 5,
  home: 6,
  plus: 7,
  info: 8,
  sound: 9,
  music: 10,
  ranks: 11,
} as const;

export const BUTTON = { green: 0, yellow: 1, blue: 2, red: 3, grey: 4 } as const;
export type ButtonColor = keyof typeof BUTTON;

export const sheetKey = (folder: string, name: string) => `sheet:${folder}/${name}`;
export const animKey = sheetKey;

/** Queue a set of static images under `<prefix>:<id>` keys. */
export function loadImages(scene: Phaser.Scene, prefix: string, folder: string, ids: string[]) {
  for (const id of ids) {
    const key = `${prefix}:${id}`;
    if (!scene.textures.exists(key)) scene.load.image(key, `${BASE}${folder}/${id}.webp`);
  }
}

/**
 * Where a folder's sheets are read from: its `_hd` twin (same clips, bigger frames) when HD
 * is on. Texture and animation keys keep the base folder name, so callers never care.
 */
const source = (folder: string) => (HD && index.anims[`${folder}_hd`] ? `${folder}_hd` : folder);

export function hasAnim(folder: string, name: string) {
  const src = source(folder);
  return (index.anims[src]?.includes(name) ?? false) && !index.hazy?.includes(`${src}/${name}`);
}

/** Queue a 16-frame sprite sheet if it exists in the pack. */
export function loadSheet(scene: Phaser.Scene, folder: string, name: string) {
  if (!hasAnim(folder, name)) return;
  const key = sheetKey(folder, name);
  if (scene.textures.exists(key)) return;
  const src = source(folder);
  const size = index.frameSize[src];
  scene.load.spritesheet(key, `${BASE}sheets/${src}/${name}.webp`, { frameWidth: size, frameHeight: size });
}

/** Create the Phaser animation for a loaded sheet (idempotent). */
export function ensureAnim(scene: Phaser.Scene, folder: string, name: string, frameRate: number, repeat: number) {
  if (!hasAnim(folder, name)) return null;
  const key = animKey(folder, name);
  if (scene.anims.exists(key) || !scene.textures.exists(key)) return scene.anims.exists(key) ? key : null;
  scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, {}), frameRate, repeat });
  return key;
}

/** Display scale for a sheet frame so the sprite is `px` pixels tall. */
export const sheetScale = (folder: string, px: number) => px / index.frameSize[source(folder)];
