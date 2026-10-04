import Phaser from "phaser";
import { RES } from "./display";

/**
 * Static Graphics, drawn once into textures.
 *
 * In WebGL, Phaser re-triangulates every Graphics path on every frame, and each rounded
 * corner or circle is 100 points. A screen full of wooden planks, rounded panels and
 * badges then costs more per frame than a phone can spare. `bake` swaps a finished
 * Graphics for an Image of the same drawing, cached by its content, so identical shapes
 * (60 card gems, say) share one texture. Textures are dropped when the last scene using
 * them shuts down.
 */

// Graphics command ids and how many arguments follow each (phaser/src/gameobjects/graphics/Commands.js).
const ARC = 0;
const FILL_RECT = 3;
const LINE_TO = 4;
const MOVE_TO = 5;
const LINE_STYLE = 6;
const FILL_TRIANGLE = 10;
const STROKE_TRIANGLE = 11;
const ARGS: Record<number, number> = { 0: 7, 1: 0, 2: 0, 3: 4, 4: 2, 5: 2, 6: 3, 7: 2, 8: 0, 9: 0, 10: 6, 11: 6, 14: 0, 15: 0 };

/** Graphics that get redrawn later; `bakeAll` leaves them alone. */
const live = new WeakSet<Phaser.GameObjects.Graphics>();
export function keepLive<T extends Phaser.GameObjects.Graphics>(g: T): T {
  live.add(g);
  return g;
}

interface Shape {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Bounds and a cache key for a command buffer. Null when it uses something baking doesn't
 * handle (transforms, gradients); those stay as Graphics.
 */
function measure(buf: number[]): Shape | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let line = 0;
  const add = (x: number, y: number) => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };
  for (let i = 0; i < buf.length; i += 1 + ARGS[buf[i]]) {
    const c = buf[i];
    if (ARGS[c] === undefined) return null;
    const a = i + 1;
    if (c === ARC) {
      add(buf[a] - buf[a + 2], buf[a + 1] - buf[a + 2]);
      add(buf[a] + buf[a + 2], buf[a + 1] + buf[a + 2]);
    } else if (c === FILL_RECT) {
      add(buf[a], buf[a + 1]);
      add(buf[a] + buf[a + 2], buf[a + 1] + buf[a + 3]);
    } else if (c === LINE_TO || c === MOVE_TO) add(buf[a], buf[a + 1]);
    else if (c === FILL_TRIANGLE || c === STROKE_TRIANGLE) for (let k = 0; k < 6; k += 2) add(buf[a + k], buf[a + k + 1]);
    else if (c === LINE_STYLE) line = Math.max(line, buf[a]);
  }
  if (x0 > x1) return null;
  const pad = Math.ceil(line / 2) + 2;
  const x = Math.floor(x0) - pad;
  const y = Math.floor(y0) - pad;
  // Key on the drawing relative to its corner, so the same shape drawn elsewhere reuses it.
  const parts: (string | number)[] = [];
  for (let i = 0; i < buf.length; i += 1 + ARGS[buf[i]]) {
    const c = buf[i];
    const a = i + 1;
    parts.push(c);
    const rel = (k: number, d: number) => Math.round((buf[a + k] - d) * 100) / 100;
    if (c === ARC) parts.push(rel(0, x), rel(1, y), ...buf.slice(a + 2, a + 7));
    else if (c === FILL_RECT) parts.push(rel(0, x), rel(1, y), buf[a + 2], buf[a + 3]);
    else if (c === LINE_TO || c === MOVE_TO) parts.push(rel(0, x), rel(1, y));
    else if (c === FILL_TRIANGLE || c === STROKE_TRIANGLE) for (let k = 0; k < 6; k++) parts.push(rel(k, k % 2 ? y : x));
    else parts.push(...buf.slice(a, a + ARGS[c]));
  }
  return { key: "baked:" + hash(parts.join(",")), x, y, w: Math.ceil(x1) + pad - x, h: Math.ceil(y1) + pad - y };
}

/** Two independent 32-bit FNV-1a hashes, so collisions are out of the question. */
function hash(s: string) {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    a = Math.imul(a ^ ch, 0x01000193);
    b = Math.imul(b ^ ch, 0x5bd1e995);
  }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36) + s.length.toString(36);
}

/** Scenes using each baked texture; it's removed when the last one shuts down. */
const users = new Map<string, Set<Phaser.Scene>>();
const watched = new WeakSet<Phaser.Scene>();

function use(scene: Phaser.Scene, key: string) {
  let set = users.get(key);
  if (!set) users.set(key, (set = new Set()));
  set.add(scene);
  if (watched.has(scene)) return;
  watched.add(scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    watched.delete(scene);
    for (const [k, s] of users) {
      if (!s.delete(scene) || s.size) continue;
      users.delete(k);
      if (scene.textures.exists(k)) scene.textures.remove(k);
    }
  });
}

/** Render the drawing in `buf` into a texture (once per distinct shape). */
function texture(scene: Phaser.Scene, buf: number[]): Shape | null {
  const s = measure(buf);
  if (!s) return null;
  if (!scene.textures.exists(s.key)) {
    const tmp = scene.make.graphics({}, false);
    // Draw at the render scale so baked shapes stay crisp when the canvas is above 1x.
    tmp.scaleCanvas(RES, RES).translateCanvas(-s.x, -s.y);
    (tmp.commandBuffer as number[]).push(...buf);
    tmp.generateTexture(s.key, Math.ceil(s.w * RES), Math.ceil(s.h * RES));
    tmp.destroy();
  }
  use(scene, s.key);
  return s;
}

/**
 * Replace a finished Graphics with an Image of it, in the same place in its container or
 * the display list. Returns the Graphics unchanged if it can't be baked.
 */
export function bake(g: Phaser.GameObjects.Graphics): Phaser.GameObjects.Image | Phaser.GameObjects.Graphics {
  if (g.rotation || g.scaleX !== 1 || g.scaleY !== 1) return g;
  const scene = g.scene;
  const s = texture(scene, g.commandBuffer as number[]);
  if (!s) return g;
  const img = scene.make.image({ x: g.x + s.x, y: g.y + s.y, key: s.key }, false);
  img.setOrigin(0).setScale(1 / RES).setAlpha(g.alpha).setVisible(g.visible).setDepth(g.depth).setScrollFactor(g.scrollFactorX, g.scrollFactorY);
  const parent = g.parentContainer;
  if (parent) {
    parent.addAt(img, parent.getIndex(g));
  } else if (g.displayList) {
    const list = scene.children;
    const at = list.getIndex(g);
    img.addToDisplayList();
    list.moveTo(img, at);
  }
  g.destroy();
  return img;
}

/** `?nobake` turns it off, to compare against or rule it out. */
const OFF = new URLSearchParams(location.search).has("nobake");

/** Bake every Graphics under `root` (a scene's display list or a container), except live ones. */
export function bakeAll(root: Phaser.Scene | Phaser.GameObjects.Container) {
  if (OFF) return;
  const list = root instanceof Phaser.Scene ? root.children.list : root.list;
  for (const o of [...list]) {
    if (o instanceof Phaser.GameObjects.Graphics) {
      if (!live.has(o)) bake(o);
    } else if (o instanceof Phaser.GameObjects.Container) bakeAll(o);
  }
}

/**
 * An Image that's drawn like a Graphics and can be redrawn (toggle chips, scroll knobs).
 * `draw` uses the image's own coordinates, as a Graphics at the same spot would.
 */
export function bakedImage(scene: Phaser.Scene, x = 0, y = 0) {
  const img = scene.add.image(x, y, "__DEFAULT").setOrigin(0).setVisible(false);
  const scratch = scene.make.graphics({}, false);
  img.once(Phaser.GameObjects.Events.DESTROY, () => scratch.destroy());
  return Object.assign(img, {
    draw(fn: (g: Phaser.GameObjects.Graphics) => void) {
      scratch.clear();
      fn(scratch);
      const s = texture(scene, scratch.commandBuffer as number[]);
      if (!s) return img.setVisible(false);
      img.setTexture(s.key).setScale(1 / RES).setDisplayOrigin(-s.x * RES, -s.y * RES).setVisible(true);
      return img;
    },
  });
}
