import Phaser from "phaser";
import { assetIndex } from "./assets";
import { HERO_BY_ID } from "./data/heroes";

/** The avatars a player can pick: whatever the asset index lists (loaded as `avatar:<id>`). */
export const avatarIds = (): string[] => assetIndex()["ui/avatars"] ?? [];

/** A bot's avatar: one of the list, picked from its name so it stays the same all match. */
export function botAvatar(name: string): string | null {
  const ids = avatarIds();
  if (!ids.length) return null;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ids[h % ids.length];
}

/**
 * A player's portrait in the gold ring: their avatar, else (the old look) their hero's portrait,
 * else an empty ring. `size` is the ring's width; the art sits inside its opening.
 */
export function avatarView(scene: Phaser.Scene, x: number, y: number, size: number, avatar: string | null | undefined, hero?: string | null) {
  const c = scene.add.container(x, y);
  const art = avatar && scene.textures.exists(`avatar:${avatar}`) ? `avatar:${avatar}` : hero && HERO_BY_ID[hero] && scene.textures.exists(`hero_portrait:${hero}`) ? `hero_portrait:${hero}` : null;
  if (art) c.add(scene.add.image(0, 0, art).setDisplaySize(size * 0.62, size * 0.62));
  c.add(scene.add.image(0, 0, "ui:avatar_frame").setDisplaySize(size, size));
  c.setSize(size, size);
  return c;
}
