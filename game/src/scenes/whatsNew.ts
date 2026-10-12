import Phaser from "phaser";
import { sfx } from "../audio";
import { button, modal, txt } from "../ui";

/** The release the "What's new" popup describes (see docs/features). */
export const RELEASE = { version: "2.4.0", title: "The Silver Tribunal", tagline: "Book 2 ends in the city of clockwork law." };
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
  m.add(txt(scene, m.cx, m.cy + 150, "Book 2 Story 5: The Silver Tribunal, the finale.", 26, "#ffffff").setWordWrapWidth(600));
  m.add(txt(scene, m.cx, m.cy + 210, "Plead guilty or not guilty, break out of the cells, balance the Great Scale.", 26, "#c9d2ff").setWordWrapWidth(600));
  m.add(txt(scene, m.cx, m.cy + 280, "New card: Argent, the Merciful. New badge: Unbroken.", 26, "#ff9df0").setWordWrapWidth(600));
  m.add(button(scene, m.cx, m.cy + 420, 320, 96, "LET'S GO!", "green", () => m.close()));
}
