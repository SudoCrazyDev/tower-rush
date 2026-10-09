import Phaser from "phaser";
import { sfx } from "../audio";
import { button, modal, txt } from "../ui";

/** The release the "What's new" popup describes (see docs/features). */
export const RELEASE = { version: "2.1.0", title: "Chaos Corrupted", tagline: "Book 2 begins in the Elven Wilds." };
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
  m.add(txt(scene, m.cx, m.cy + 150, "Story mode Book 2: The Elven Wilds, 3 new chapters.", 26, "#ffffff").setWordWrapWidth(600));
  m.add(txt(scene, m.cx, m.cy + 210, "Face Thalmyr, three elf captains and Vaeltharion.", 26, "#c9d2ff").setWordWrapWidth(600));
  m.add(txt(scene, m.cx, m.cy + 280, "New boss skills: entangle, impale, volley and block.", 26, "#ff9df0").setWordWrapWidth(600));
  m.add(button(scene, m.cx, m.cy + 420, 320, 96, "LET'S GO!", "green", () => m.close()));
}
