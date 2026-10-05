import Phaser from "phaser";
import { UNIT_BY_ID } from "../data/units";
import { RELEASE_GIFTS } from "../../../shared/profile.ts";
import { SUPPORT_TEXT, isSupport } from "../../../shared/support.ts";
import { profile } from "../save";
import { sfx } from "../audio";
import { button, cardView, modal, txt } from "../ui";

/** The release the "What's new" popup describes (see docs/features). */
export const RELEASE = { version: "1.1.0", title: "Supporting Cast Arrival", tagline: "Not every hero swings a sword." };
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
  const cast = Object.values(UNIT_BY_ID).filter((u) => isSupport(u.arch) && u.enabled);
  if (!cast.length) return;
  sfx("upgrade");
  const m = modal(scene, 680, 1060, `NEW IN ${RELEASE.version}`);
  m.add(txt(scene, m.cx, m.cy - 420, RELEASE.title.toUpperCase(), 44, "#ffd93b"));
  m.add(txt(scene, m.cx, m.cy - 370, RELEASE.tagline, 26, "#c9d2ff"));
  m.add(txt(scene, m.cx, m.cy - 320, "Support units never attack. They copy, swap, brew and rally.", 22, "#ffffff").setWordWrapWidth(600));
  cast.slice(0, 8).forEach((u, i) => {
    const y = m.cy - 230 + i * 104;
    m.add(cardView(scene, m.cx - 230, y, 92, u.id));
    m.add(txt(scene, m.cx - 160, y - 16, u.name, 28, "#fff4c2", [0, 0.5]));
    m.add(txt(scene, m.cx - 160, y + 18, SUPPORT_TEXT[u.arch as keyof typeof SUPPORT_TEXT], 20, "#c9d2ff", [0, 0.5]));
  });
  const gift = RELEASE_GIFTS.find((g) => g.version === RELEASE.version);
  const got = gift?.cards.filter((id) => UNIT_BY_ID[id]?.enabled && profile.cards[id]).map((id) => UNIT_BY_ID[id].name);
  if (got?.length) m.add(txt(scene, m.cx, m.cy + 330, `Launch gift: ${got.join(" + ")} added to your cards!`, 24, "#7dff7a").setWordWrapWidth(600));
  m.add(button(scene, m.cx, m.cy + 420, 320, 96, "LET'S GO!", "green", () => m.close()));
}
