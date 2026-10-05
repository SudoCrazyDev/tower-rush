import Phaser from "phaser";
import { BASE } from "../assets";
import { UNIT_BY_ID } from "../data/units";
import { BOOK } from "../../../shared/stories.ts";
import { sfx } from "../audio";
import { button, cardView, modal, txt } from "../ui";

/** The release the "What's new" popup describes (see docs/features). */
export const RELEASE = { version: "1.2.0", title: "Stories", tagline: "The Candy Kingdom is falling to chaos." };
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
  if (!BOOK.stories.length) return;
  const covers = BOOK.stories.map((s) => `story:covers/${s.cover}`).filter((k) => !scene.textures.exists(k));
  if (covers.length) {
    for (const s of BOOK.stories) scene.load.image(`story:covers/${s.cover}`, `${BASE}story/covers/${s.cover}.webp`);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => scene.sys.isActive() && show(scene));
    scene.load.start();
  } else show(scene);
}

function show(scene: Phaser.Scene) {
  sfx("upgrade");
  const m = modal(scene, 720, 1060, `NEW IN ${RELEASE.version}`);
  m.add(txt(scene, m.cx, m.cy - 420, `${RELEASE.title.toUpperCase()}: ${BOOK.title.toUpperCase()}`, 38, "#ffd93b"));
  m.add(txt(scene, m.cx, m.cy - 370, RELEASE.tagline, 26, "#c9d2ff"));
  m.add(txt(scene, m.cx, m.cy - 320, "Three stories, played in order. Swipe to STORIES in the lobby.", 22, "#ffffff").setWordWrapWidth(600));
  BOOK.stories.slice(0, 3).forEach((s, i) => {
    const x = m.cx + (i - 1) * 210;
    const key = `story:covers/${s.cover}`;
    if (scene.textures.exists(key)) m.add(scene.add.image(x, m.cy - 140, key).setDisplaySize(180, 239));
    m.add(txt(scene, x, m.cy + 4, s.title, 22, "#fff4c2").setWordWrapWidth(200));
  });
  // The rewards: the first Event card, then the two knights.
  const rewards = ["princess_muse", "pentagonal_knight", "rogue_knight"].filter((id) => UNIT_BY_ID[id]);
  rewards.forEach((id, i) => {
    const x = m.cx + (i - (rewards.length - 1) / 2) * 200;
    m.add(cardView(scene, x, m.cy + 150, 120, id));
    m.add(txt(scene, x, m.cy + 232, UNIT_BY_ID[id].name, 20, "#ffffff"));
  });
  m.add(txt(scene, m.cx, m.cy + 290, "Earn Princess Muse, the first EVENT card, and the Chosen knights.", 22, "#ff9df0").setWordWrapWidth(600));
  m.add(button(scene, m.cx, m.cy + 420, 320, 96, "LET'S GO!", "green", () => m.close()));
}
