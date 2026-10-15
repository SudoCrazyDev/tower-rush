import Phaser from "phaser";
import { UNITS, RARITY_ORDER, RARITY_STATS, maxCardLevel } from "../data/units";
import { W, H, WIDE, txt, button, cardView } from "../ui";
import { ScrollView, saloonAmbience } from "../saloon";
import { music, sfx } from "../audio";
import { profile } from "../save";

/**
 * Pick units the player owns, then fight on the meadow with unlimited mana (see BattleScene's `lab`).
 * v2.8: open to everyone. Unowned cards show locked; a lab battle never reports to the server.
 */
export const LAB_ENABLED = true;
/** Whether the player owns a card (only owned units can go in a lab deck). */
const owns = (id: string) => !!profile.cards[id];

const DECK_SIZE = 5;
const KEY = "crownkeep.lab";
const CARD = 124;
const GAP_X = 150;

type Saved = { deck: string[]; max: boolean };

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    // A saved lab deck keeps only units the player (still) owns.
    if (s && Array.isArray(s.deck)) return { deck: s.deck.filter((id) => UNITS.some((u) => u.id === id) && owns(id)).slice(0, DECK_SIZE), max: s.max !== false };
  } catch {
    /* ignore */
  }
  return { deck: [], max: true };
}

function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export class LabScene extends Phaser.Scene {
  constructor() {
    super("Lab");
  }

  create() {
    music("lobby");
    const state = load();
    save(state);
    saloonAmbience(this, "loc:deck_room_background", [[0.15, 0.12], [0.85, 0.12], [0.5, 0.42]], undefined, 0.5);

    txt(this, W / 2, 70, "UNIT LAB", 56, "#ffd27a");
    const count = txt(this, W / 2, 140, "", 28, "#fff4c2");
    const lvBtn = button(this, W / 2, 205, 300, 76, "", "blue", () => {
      state.max = !state.max;
      refresh();
    }, 34);

    const rect = new Phaser.Geom.Rectangle(0, 260, W, H - 260 - 150);
    const view = new ScrollView(this, rect);
    const cols = Math.max(3, Math.min(WIDE ? 14 : 5, Math.floor((W - 40) / GAP_X)));
    const left = W / 2 - (cols * GAP_X) / 2;
    const rings = new Map<string, Phaser.GameObjects.Graphics>();

    // Story-only units can never be owned, so they stay out of the list.
    const units = UNITS.filter((u) => u.enabled && (!u.storyOnly || owns(u.id))).sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || a.name.localeCompare(b.name));
    let y = 20;
    for (const rar of [...RARITY_ORDER].reverse()) {
      const list = units.filter((u) => u.rarity === rar);
      if (!list.length) continue;
      const color = "#" + RARITY_STATS[rar].color.toString(16).padStart(6, "0");
      view.content.add(txt(this, W / 2, y + 22, `${rar.toUpperCase()}  (${list.length})`, 32, color));
      y += 56;
      list.forEach((u, i) => {
        const x = left + GAP_X / 2 + (i % cols) * GAP_X;
        const cy = y + Math.floor(i / cols) * (CARD + 54) + CARD / 2;
        const ring = this.add.graphics().setVisible(false);
        ring.lineStyle(8, 0x7dff7a, 1).strokeRoundedRect(-CARD / 2 - 4, -CARD / 2 - 4, CARD + 8, CARD + 8, 14);
        const locked = !owns(u.id);
        const card = cardView(this, 0, 0, CARD, u.id, { name: true, locked });
        if (locked) card.setAlpha(0.6);
        const c = this.add.container(x, cy, [ring, card]).setSize(CARD, CARD);
        c.setInteractive({ useHandCursor: true });
        c.on("pointerup", () => {
          if (!view.tapOk()) return;
          if (locked) return void sfx("error");
          const at = state.deck.indexOf(u.id);

          if (at >= 0) state.deck.splice(at, 1);
          else if (state.deck.length < DECK_SIZE) state.deck.push(u.id);
          else return void sfx("error");
          sfx("click");
          refresh();
        });
        rings.set(u.id, ring);
        view.content.add(c);
      });
      y += Math.ceil(list.length / cols) * (CARD + 54) + 24;
    }
    view.setHeight(y + 20);

    const start = button(this, W / 2 + 190, H - 80, 340, 100, "START", "green", () => {
      if (!state.deck.length) return;
      this.scene.start("Battle", { arena: "meadow", lab: { deck: [...state.deck], level: state.max ? maxCardLevel() : 1 } });
    });
    button(this, W / 2 - 190, H - 80, 340, 100, "BACK", "red", () => this.scene.start("Lobby"));

    const refresh = () => {
      save(state);
      rings.forEach((r, id) => r.setVisible(state.deck.includes(id)));
      count.setText(state.deck.length ? `${state.deck.length}/${DECK_SIZE}: ${state.deck.map((id) => units.find((u) => u.id === id)?.name ?? id).join(", ")}` : `Pick up to ${DECK_SIZE} units`);
      count.setWordWrapWidth(W - 40).setFontSize(state.deck.length ? 22 : 28);
      lvBtn.label.setText(state.max ? `Lv MAX (${maxCardLevel()})` : "Lv 1");
      start.setEnabled(state.deck.length > 0);
    };
    refresh();
  }
}
