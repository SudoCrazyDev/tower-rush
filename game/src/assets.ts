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
  /** v2 UI art; each missing in older builds, and entries may be absent while art is pending. */
  "ui/races"?: string[];
  "ui/archs"?: string[];
  "ui/perks"?: string[];
  /** Player avatars (ui/avatars/<id>.webp), loaded as `avatar:<id>`; the choosable list. */
  "ui/avatars"?: string[];
  /** Melee weapon sprites (vfx/weapons/<key>.webp), loaded as `weapon:<key>`. */
  "vfx/weapons"?: string[];
  anims: Record<string, string[]>;
  /** Frame size per sheet folder, including the `<folder>_hd` twins. */
  frameSize: Record<string, number>;
  /** Slices of the button, icon and league_ranks sheets (`leagues` is missing in older builds). */
  atlas: { buttons: number; icons: number; leagues?: number };
  /** Ambient location loops and the trailer, in `video/<name>.mp4`. */
  videos: string[];
  /** "<folder>/<name>" sheets whose background didn't key out cleanly; treated as missing. */
  hazy: string[];
  /** Content hash per "<folder>/<name>" sheet, used to bust the cache (missing in older builds). */
  ver?: Record<string, string>;
}

/** Where the art lives: public/assets in dev, the R2 bucket in production (see vite.config.ts). */
export const BASE = __ASSET_BASE__;
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

/**
 * v2.3: unit cards whose own art isn't in the pack yet borrow an existing card's (portrait, still, card and sheets), so
 * Story 4 can be earned and played before its art lands. Drop an entry once the art is built.
 */
const UNIT_STAND_IN: Record<string, string> = { brakka: "thunder_dwarf", durgrim: "bear_rider", emberhold_gunner: "pirate_gunner", runecaller: "frost_sorceress", argent: "aegis_knight" };

/** The unit id whose sheets draw unit `id` (itself, or its stand-in while its own sheets are missing). */
export function unitArt(id: string) {
  return !hasAnim("units", `${id}_idle`) && UNIT_STAND_IN[id] ? UNIT_STAND_IN[id] : id;
}

/** Queue a set of static images under `<prefix>:<id>` keys. */
export function loadImages(scene: Phaser.Scene, prefix: string, folder: string, ids: string[]) {
  // A unit without its own portrait, still or card image loads its stand-in's file under its own key.
  if (folder === "portraits" || folder === "units" || folder === "cards") {
    for (const [id, from] of Object.entries(UNIT_STAND_IN)) {
      const key = `${prefix}:${id}`;
      if (!ids.includes(id) && ids.includes(from) && !scene.textures.exists(key)) scene.load.image(key, `${BASE}${folder}/${from}.webp`);
    }
  }
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

/**
 * v2.1: sprites that stand in for monsters and bosses whose own art isn't in the pack yet, so a new
 * story can be played before its art lands. Drop an entry once the real sheets are built.
 */
// v2.2: every Story 2-3 monster and boss has its own sheets; the Barnacle Cluster (Ondrath's shell growth) borrows the Barnacle Spawn art and Corvaline's Lantern the Fire Wisp art.
const STAND_IN: Record<string, string> = {
  barnacle_cluster: "barnacle_spawn",
  corvaline_lantern: "fire_wisp",
  // v2.3 Story 4 "The Iron Oath": borrowed sprites until its own sheets are built.
  drake_whelp: "lava_imp",
  dwarf_family: "kobold_miner",
  iron_soldier: "gargoyle",
  iron_crossbow: "corrupted_elf_archer",
  iron_brute: "door_ogre",
  ashmaw: "fire_dragon",
  walking_forge: "goblin_war_machine",
  chaos_colossus: "stone_colossus",
  // v2.4 Story 5 "The Silver Tribunal": borrowed sprites until its own sheets are built (the art is in the pack now; these only apply to a build without it).
  brass_warden: "armored_beetle",
  ledger_crossbowman: "corrupted_elf_archer",
  chainbearer: "orc_brute",
  quill_drone: "flying_eyeball",
  gavel_golem: "ice_golem_minion",
  prosecutor: "goblin_war_machine",
  bailiff: "stone_colossus",
  argent_justiciar: "lich_king",
  vaeltharion_dust: "vaeltharion",
};

/** The id whose sheets draw monster or boss `id` (itself, or its stand-in while its art is missing). */
export function sheetId(folder: "monsters" | "bosses", id: string) {
  return !hasAnim(folder, `${id}_walk`) && STAND_IN[id] ? STAND_IN[id] : id;
}

/** Queue a 16-frame sprite sheet if it exists in the pack. */
export function loadSheet(scene: Phaser.Scene, folder: string, name: string) {
  if (!hasAnim(folder, name)) return;
  const key = sheetKey(folder, name);
  if (scene.textures.exists(key)) return;
  const src = source(folder);
  const size = index.frameSize[src];
  const v = index.ver?.[`${src}/${name}`];
  scene.load.spritesheet(key, `${BASE}sheets/${src}/${name}.webp${v ? `?v=${v}` : ""}`, { frameWidth: size, frameHeight: size });
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
