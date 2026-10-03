import Phaser from "phaser";
import { ARCHETYPES, RARITY_ORDER, RARITY_STATS, UNITS, UNIT_BY_ID, maxCardLevel, unitStats, upgradeCost } from "../data/units";
import { HERO_BY_ID, heroAbilityText } from "../data/heroes";
import { ECONOMY } from "../../../shared/economy.ts";
import { profile, canUpgrade, upgradeCard, setDeck } from "../save";
import { canAwaken } from "../battle/Unit";
import { W, H, WIDE, txt, button, iconButton, cardView, heroCardView, modal, NAVY, fmt, pressable, attempt } from "../ui";
import { cover, topBar } from "./LobbyScene";
import { RES } from "../display";
import { music, sfx } from "../audio";

const CARD = 150;
const GAP_X = 176;
/** Collection columns: 4 on phones, as many as fit (up to 12) on wide screens. */
const COLS = WIDE ? Math.min(12, Math.floor((W - 120) / GAP_X)) : 4;
const GAP_Y = 222;
const LIST_TOP = 640;

export class DeckScene extends Phaser.Scene {
  /** When set, the next tap on a deck slot puts this card there. */
  private swapping: string | null = null;
  private list!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super("Deck");
  }

  create() {
    music("lobby");
    this.swapping = null;
    cover(this, "loc:deck_room_background", 0.35);
    // The collection goes in first so the deck and hero controls sit above the cards that
    // scroll (masked) underneath them and get the taps.
    this.buildList();
    topBar(this);
    iconButton(this, 50, 130, "back", 76, () => this.scene.start("Lobby"));
    txt(this, W / 2, 130, "BATTLE DECK", 48, "#fff4c2");

    // Deck slots.
    const g = this.add.graphics();
    const panelW = WIDE ? 760 : W - 40;
    g.fillStyle(NAVY, 0.75).fillRoundedRect((W - panelW) / 2, 180, panelW, 230, 28);
    profile.deck.forEach((id, i) => {
      const c = cardView(this, W / 2 + (i - 2) * 140, 280, 124, id, { level: profile.cards[id].level });
      pressable(c, () => this.tapDeckSlot(i));
    });
    this.hint = txt(this, W / 2, 388, "Tap a card to see it", 24, "#c9d2ff");

    this.heroStrip(panelW);
  }

  /** The equipped hero, under the deck. Opens the hero screen. */
  private heroStrip(panelW: number) {
    const left = (W - panelW) / 2;
    const g = this.add.graphics();
    g.fillStyle(NAVY, 0.75).fillRoundedRect(left, 425, panelW, 170, 28);
    const hero = profile.hero ? HERO_BY_ID[profile.hero] : null;
    const textX = left + 170;
    const wrap = panelW - 170 - 230;
    if (hero) {
      pressable(heroCardView(this, left + 85, 510, 130, hero.id), () => this.scene.start("Heroes"));
      txt(this, textX, 462, `HERO: ${hero.name}`, 28, "#fff4c2", [0, 0.5]);
      txt(this, textX, 498, hero.ability, 24, "#ffd93b", [0, 0.5]);
      txt(this, textX, 528, heroAbilityText(hero), 19, "#c9d2ff", [0, 0]).setWordWrapWidth(wrap).setAlign("left");
    } else {
      txt(this, textX, 510, "No hero selected", 28, "#c9d2ff", [0, 0.5]);
    }
    button(this, left + panelW - 115, 510, 200, 90, "HEROES", "yellow", () => this.scene.start("Heroes"), 32);
  }

  private sortedUnits() {
    return UNITS.filter((u) => u.enabled || profile.cards[u.id]).sort((a, b) => {
      const owned = Number(!!profile.cards[b.id]) - Number(!!profile.cards[a.id]);
      if (owned) return owned;
      return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    });
  }

  private buildList() {
    this.list = this.add.container(0, LIST_TOP);
    const units = this.sortedUnits();
    const ownedCount = units.filter((u) => profile.cards[u.id]).length;
    this.list.add(txt(this, W / 2, 10, `COLLECTION  ${ownedCount}/${units.length}`, 30, "#fff4c2"));
    units.forEach((u, i) => {
      const x = W / 2 + ((i % COLS) - (COLS - 1) / 2) * GAP_X;
      const y = 140 + Math.floor(i / COLS) * GAP_Y;
      const owned = profile.cards[u.id];
      const c = cardView(this, x, y, CARD, u.id, { level: owned?.level, locked: !owned, name: true });
      if (owned) {
        const need = owned.level < maxCardLevel() ? upgradeCost(owned.level, u.rarity).copies : 0;
        const bar = this.add.graphics();
        const p = need ? Math.min(1, owned.copies / need) : 1;
        bar.fillStyle(NAVY, 1).fillRoundedRect(-60, 66, 120, 16, 8);
        bar.fillStyle(canUpgrade(u.id) ? 0x59d64a : 0x3d8bff, 1).fillRoundedRect(-58, 68, Math.max(8, 116 * p), 12, 6);
        c.add(bar);
        if (profile.deck.includes(u.id)) c.add(txt(this, 0, -CARD / 2 + 6, "IN DECK", 20, "#7dff7a"));
      }
      c.setInteractive();
      c.on("pointerup", (ptr: Phaser.Input.Pointer) => {
        // Cards scrolled up under the deck panel are masked but still interactive.
        if (ptr.getDistance() < 12 * RES && ptr.worldY > LIST_TOP - 20) this.showCard(u.id);
      });
      this.list.add(c);
    });

    // Scroll by dragging or mouse wheel.
    const rows = Math.ceil(units.length / COLS);
    const minY = Math.min(LIST_TOP, H - 60 - (140 + rows * GAP_Y));
    const mask = this.make.graphics({}, false).fillRect(0, LIST_TOP - 20, W, H - LIST_TOP + 20);
    this.list.setMask(mask.createGeometryMask());
    let startY = 0;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => (startY = p.worldY > LIST_TOP - 20 ? this.list.y : NaN));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown || Number.isNaN(startY)) return;
      this.list.y = Phaser.Math.Clamp(startY + (p.y - p.downY) / RES, minY, LIST_TOP);
    });
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.list.y = Phaser.Math.Clamp(this.list.y - dy, minY, LIST_TOP);
    });
  }

  private async tapDeckSlot(i: number) {
    if (!this.swapping) {
      this.showCard(profile.deck[i]);
      return;
    }
    if (!profile.deck.includes(this.swapping)) {
      const deck = [...profile.deck];
      deck[i] = this.swapping;
      this.swapping = null;
      if (await attempt(this, () => setDeck(deck))) this.scene.restart();
      else this.hint.setText("Tap a card to see it").setColor("#c9d2ff");
      return;
    }
    this.scene.restart();
  }

  private showCard(id: string) {
    const def = UNIT_BY_ID[id];
    const owned = profile.cards[id];
    const m = modal(this, 640, 980, def.name, () => {});
    const { cx, cy } = m;
    const card = cardView(this, cx, cy - 270, 260, id, { level: owned?.level, locked: !owned });
    m.add(card);
    // Awakened form: a small preview to the side; tap either card to flip between them.
    if (canAwaken(id) && this.textures.exists(`portrait_awakened:${id}`)) {
      const awake = cardView(this, cx, cy - 270, 260, id, { awakened: true, locked: !owned }).setVisible(false);
      m.add(awake);
      const thumb = cardView(this, cx + 225, cy - 330, 96, id, { awakened: true, locked: !owned });
      m.add(thumb);
      const label = txt(this, cx + 225, cy - 258, "AWAKENS\nAT RANK 7", 18, "#ffd93b");
      m.add(label);
      const flip = () => {
        const showAwake = !awake.visible;
        awake.setVisible(showAwake);
        card.setVisible(!showAwake);
        thumb.setVisible(!showAwake);
        label.setVisible(!showAwake);
        rarityLine.setVisible(!showAwake);
        info.setText(showAwake ? `AWAKENED: ×${ECONOMY.awakenDamageMult} dmg · ×${ECONOMY.awakenSpeedMult} speed · ultimate every ${ECONOMY.ultimateCooldown}s` : "");
      };
      const info = txt(this, cx, cy - 110, "", 22, "#ffd93b");
      m.add(info);
      for (const c of [card, awake, thumb]) pressable(c, flip);
    }
    const rarityCss = "#" + RARITY_STATS[def.rarity].color.toString(16).padStart(6, "0");
    const rarityLine = txt(this, cx, cy - 110, `${def.rarity.toUpperCase()} · ${def.element.toUpperCase()}`, 28, rarityCss);
    m.add(rarityLine);
    m.add(txt(this, cx, cy - 66, ARCHETYPES[def.arch].label, 26, "#ffffff"));
    m.add(txt(this, cx, cy - 26, `"${def.blurb}"`, 22, "#c9d2ff"));

    const level = owned?.level ?? 1;
    const stats = unitStats(def, 1, level, 0);
    const rows: [string, string][] = [
      ["stat:damage", def.arch === "buff" ? "—" : fmt(stats.damage)],
      ["stat:attack_speed", def.arch === "buff" ? "—" : `${stats.speed.toFixed(2)}/s`],
    ];
    rows.forEach(([icon, value], i) => {
      const x = cx - 130 + i * 260;
      m.add(this.add.image(x - 50, cy + 40, icon).setDisplaySize(56, 56));
      m.add(txt(this, x + 10, cy + 40, value, 32, "#ffffff", [0, 0.5]));
    });

    if (!owned) {
      m.add(txt(this, cx, cy + 170, "Find this card in chests!", 32, "#ffd27a"));
      m.add(button(this, cx, cy + 330, 360, 100, "SHOP", "green", () => this.scene.start("Shop")));
      return;
    }

    if (owned.level < maxCardLevel()) {
      const cost = upgradeCost(owned.level, def.rarity);
      m.add(txt(this, cx, cy + 130, `Cards: ${owned.copies} / ${cost.copies}`, 30, owned.copies >= cost.copies ? "#7dff7a" : "#ffffff"));
      const up = button(this, cx, cy + 230, 400, 100, `UPGRADE  ${fmt(cost.coins)}`, "yellow", () => {
        up.setEnabled(false);
        attempt(this, () => upgradeCard(id)).then((ok) => {
          if (ok) sfx("upgrade");
          this.scene.restart();
        });
      }, 36);
      up.setEnabled(canUpgrade(id));
      m.add(up);
    } else {
      m.add(txt(this, cx, cy + 170, "MAX LEVEL", 40, "#ffd93b"));
    }

    if (profile.deck.includes(id)) {
      m.add(txt(this, cx, cy + 350, "In your deck", 30, "#7dff7a"));
    } else if (!def.enabled) {
      m.add(txt(this, cx, cy + 350, "Currently unavailable", 30, "#ff8080"));
    } else {
      m.add(
        button(this, cx, cy + 350, 400, 100, "USE IN DECK", "blue", () => {
          m.close();
          this.swapping = id;
          this.hint.setText("Tap a deck slot to replace").setColor("#ffd93b");
          this.tweens.add({ targets: this.hint, scale: 1.1, yoyo: true, repeat: -1, duration: 400 });
        }),
      );
    }
  }
}
