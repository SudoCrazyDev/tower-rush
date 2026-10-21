import Phaser from "phaser";
import { sfx } from "../audio";
import { button, modal, txt } from "../ui";

/** The release the "What's new" popup describes (see docs/features). */
export const RELEASE = { version: "2.9.5", title: "Rising Tide", tagline: "Five new units. Something stirs below." };
const SEEN_KEY = "tower-rush-whats-new";

function seen() {
  try {
    return localStorage.getItem(SEEN_KEY) === RELEASE.version;
  } catch {
    return true;
  }
}

/** Show the release popup once per device after an update (only once the first battle is behind them). */
export function whatsNew(scene: Phaser.Scene, force = false) {
  if (!force && seen()) return;
  try {
    localStorage.setItem(SEEN_KEY, RELEASE.version);
  } catch {
    // Shown again next time.
  }
  show(scene);
}

function show(scene: Phaser.Scene) {
  sfx("upgrade");
  const m = modal(scene, 720, 1060, `NEW IN ${RELEASE.version}`);
  m.add(txt(scene, m.cx, m.cy - 420, RELEASE.title.toUpperCase(), 38, "#ffd93b"));
  m.add(txt(scene, m.cx, m.cy - 370, RELEASE.tagline, 30, "#c9d2ff"));
  const logo = scene.add.image(m.cx, m.cy - 130, "ui:logo");
  logo.setScale(560 / logo.width);
  m.add(logo);
  scene.tweens.add({ targets: logo, y: logo.y + 10, yoyo: true, repeat: -1, duration: 1800, ease: "Sine.InOut" });
  logo.once(Phaser.GameObjects.Events.DESTROY, () => scene.tweens.killTweensOf(logo));
  m.add(txt(scene, m.cx, m.cy + 130, "Two gift Mythics for everyone: Heart Surgeon and Dark Spawn.", 26, "#ffffff").setWordWrapWidth(600));
  m.add(txt(scene, m.cx, m.cy + 190, "Windrunner roots monsters, and the roots jump when they fall.", 26, "#8fdc5a").setWordWrapWidth(600));
  m.add(txt(scene, m.cx, m.cy + 250, "Cursed Totem never attacks. Its neighbours execute.", 26, "#c9a0ff").setWordWrapWidth(600));
  m.add(txt(scene, m.cx, m.cy + 310, "And from the deep... the Sea Serpent. Its secrets: ???", 26, "#7fd8ff").setWordWrapWidth(600));
  m.add(txt(scene, m.cx, m.cy + 365, "Echo Spirit now becomes a copy of its neighbour.", 22, "#c9d2ff").setWordWrapWidth(600));
  m.add(button(scene, m.cx, m.cy + 445, 320, 96, "LET'S GO!", "green", () => m.close()));
}

/** v2.9.5: the next reveal, teased in the lobby (the SOON orb under What's new). Unset to hide it. */
export const TEASER: { title: string; lines: string[]; art: string } | null = {
  title: "THE DEEP STIRS",
  lines: ["The Sea Serpent has surfaced, but no one knows what it is.", "Its secrets rise with the next tide. Coming soon."],
  art: "ui:coming_soon",
};

export function comingSoon(scene: Phaser.Scene) {
  if (!TEASER) return;
  sfx("upgrade");
  const m = modal(scene, 720, 1060, "COMING SOON");
  m.add(txt(scene, m.cx, m.cy - 420, TEASER.title, 40, "#7fd8ff"));
  if (scene.textures.exists(TEASER.art)) {
    const art = scene.add.image(m.cx, m.cy - 80, TEASER.art);
    art.setScale(600 / Math.max(art.width, art.height));
    m.add(art);
  }
  TEASER.lines.forEach((line, i) => m.add(txt(scene, m.cx, m.cy + 270 + i * 64, line, 26, i ? "#ffd93b" : "#ffffff").setWordWrapWidth(600)));
  m.add(button(scene, m.cx, m.cy + 445, 320, 96, "CAN'T WAIT", "blue", () => m.close()));
}
