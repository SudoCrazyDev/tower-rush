import Phaser from "phaser";
import { ensureAnim, loadSheet, animKey, sheetScale, hasAnim } from "../assets";
import { HEROES, HERO_BY_ID, heroAbilityText } from "../data/heroes";
import { profile, ownsHero, heroBuyProblem, buyHero, setHero } from "../save";
import { W, H, WIDE, txt, button, iconButton, heroCardView, modal, pressable, attempt, fmt } from "../ui";
import { cover, topBar } from "./LobbyScene";
import { music, sfx } from "../audio";

const CARD = 160;
const GAP_X = 180;
const GAP_Y = 290;
const COLS = WIDE ? 8 : 4;
const TOP = 330;

/** Pick the hero taken into battle, or buy a new one. */
export class HeroScene extends Phaser.Scene {
  constructor() {
    super("Heroes");
  }

  preload() {
    for (const h of HEROES) loadSheet(this, "heroes", `${h.id}_idle`);
  }

  create() {
    music("lobby");
    for (const h of HEROES) ensureAnim(this, "heroes", `${h.id}_idle`, 14, -1);
    cover(this, "loc:deck_room_background", 0.35);
    topBar(this);
    iconButton(this, 50, 130, "back", 76, () => this.scene.start("Deck"));
    txt(this, W / 2, 130, "HEROES", 48, "#fff4c2");
    txt(this, W / 2, 190, "Your hero joins every battle with one special ability.", 24, "#c9d2ff");

    const heroes = HEROES.filter((h) => h.enabled || ownsHero(profile, h.id));
    heroes.forEach((h, i) => {
      const x = W / 2 + ((i % COLS) - (Math.min(COLS, heroes.length) - 1) / 2) * GAP_X;
      const y = TOP + Math.floor(i / COLS) * GAP_Y;
      const owned = ownsHero(profile, h.id);
      const c = heroCardView(this, x, y, CARD, h.id, { locked: !owned, name: h.name });
      let status: Phaser.GameObjects.GameObject;
      if (profile.hero === h.id) status = txt(this, 0, CARD * 0.78, "IN USE", 24, "#7dff7a");
      else if (owned) status = txt(this, 0, CARD * 0.78, "OWNED", 24, "#c9d2ff");
      else if (profile.trophies < h.trophies) {
        status = this.add.container(0, CARD * 0.78, [
          this.add.image(-34, 0, "item:trophy").setDisplaySize(36, 36),
          txt(this, 6, 0, fmt(h.trophies), 24, "#ff9a9a", [0, 0.5]),
        ]);
      } else {
        status = this.add.container(0, CARD * 0.78, [
          this.add.image(-30, 0, "item:gems").setDisplaySize(36, 36),
          txt(this, -6, 0, fmt(h.price), 24, profile.gems >= h.price ? "#7fffd4" : "#ff9a9a", [0, 0.5]),
        ]);
      }
      c.add(status);
      pressable(c, () => this.showHero(h.id));
    });
    const rows = Math.ceil(heroes.length / COLS);
    txt(this, W / 2, TOP + rows * GAP_Y - 40, "In battle, tap the hero button (or press H)\nto use the ability. It then recharges.", 24, "#c9d2ff");
  }

  private showHero(id: string) {
    const h = HERO_BY_ID[id];
    const owned = ownsHero(profile, id);
    const m = modal(this, 640, Math.min(1000, H - 120), h.name, () => {});
    const { cx, cy } = m;
    const top = cy - Math.min(1000, H - 120) / 2;

    // The hero, animated if its idle clip exists.
    if (hasAnim("heroes", `${id}_idle`) && this.anims.exists(animKey("heroes", `${id}_idle`))) {
      const s = this.add.sprite(cx, top + 270, animKey("heroes", `${id}_idle`)).setScale(sheetScale("heroes", 340));
      s.play(animKey("heroes", `${id}_idle`));
      if (!owned) s.setTint(0x666677);
      m.add(s);
    } else {
      m.add(heroCardView(this, cx, top + 270, 260, id, { locked: !owned }));
    }
    m.add(txt(this, cx, top + 470, h.ability.toUpperCase(), 38, "#ffd93b"));
    m.add(txt(this, cx, top + 540, heroAbilityText(h), 26, "#ffffff").setWordWrapWidth(540));
    m.add(this.add.image(cx - 110, top + 620, "item:hourglass_speedup").setDisplaySize(48, 48));
    m.add(txt(this, cx - 74, top + 620, `Recharge: ${h.cooldown}s`, 28, "#c9d2ff", [0, 0.5]));
    m.add(txt(this, cx, top + 690, `"${h.blurb}"`, 22, "#c9d2ff").setWordWrapWidth(540));

    const by = top + 820;
    if (profile.hero === id) {
      m.add(txt(this, cx, by, "In use", 34, "#7dff7a"));
    } else if (owned) {
      m.add(button(this, cx, by, 400, 100, "USE HERO", "blue", () => {
        m.close();
        attempt(this, () => setHero(id)).then((ok) => {
          if (ok) sfx("upgrade");
          this.scene.restart();
        });
      }));
    } else if (profile.trophies < h.trophies) {
      m.add(txt(this, cx, by, `Unlocks at ${fmt(h.trophies)} trophies`, 32, "#ff9a9a"));
    } else {
      const b = button(this, cx, by, 420, 100, `BUY  ${fmt(h.price)} GEMS`, "green", () => {
        b.setEnabled(false);
        attempt(this, () => buyHero(id)).then((ok) => {
          if (ok) sfx("chest");
          this.scene.restart();
        });
      }, 36);
      b.setEnabled(!heroBuyProblem(profile, id));
      m.add(b);
    }
  }
}
