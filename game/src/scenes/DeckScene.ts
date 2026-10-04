import Phaser from "phaser";
import { effectSummary } from "../../../shared/effects.ts";
import { ARCHETYPES, RARITY_ORDER, RARITY_STATS, ELEMENTS, ELEMENT_COLOR, UNITS, UNIT_BY_ID, maxCardLevel, unitStats, upgradeCost } from "../data/units";
import type { Arch, Element, Rarity, UnitDef } from "../data/units";
import { HERO_BY_ID, heroAbilityText } from "../data/heroes";
import { ECONOMY } from "../../../shared/economy.ts";
import { profile, canUpgrade, upgradeCard, setDeck } from "../save";
import { canAwaken } from "../battle/Unit";
import { W, H, WIDE, txt, button, iconButton, cardView, heroCardView, modal, fmt, pressable, attempt } from "../ui";
import { topBar } from "./LobbyScene";
import { music, sfx } from "../audio";
import { bakeAll, bakedImage } from "../bake";
import {
  BRASS,
  BRASS_DARK,
  GLOW,
  GOLD_TEXT,
  TAN,
  WOOD_DARK,
  WOOD_LIGHT,
  ScrollView,
  board,
  chip,
  groupHeader,
  hangingSign,
  plank,
  rivets,
  saloonAmbience,
  shelf,
  stxt,
} from "../saloon";

const CARD = 150;
const GAP_X = 176;
const ROW_H = 264;

type Status = "all" | "owned" | "locked" | "ready";
type GroupBy = "rarity" | "element" | "role" | "none";

const STATUS_TABS: { id: Status; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "owned", label: "OWNED" },
  { id: "locked", label: "LOCKED" },
  { id: "ready", label: "UPGRADE" },
];
const GROUP_ORDER: GroupBy[] = ["rarity", "element", "role", "none"];

interface Group {
  key: string;
  title: string;
  sub: string;
  icon?: string;
  accent?: number;
  match: (u: UnitDef) => boolean;
}

const RARITY_GROUPS: Record<Rarity, [string, string]> = {
  common: ["COMMON", "The house pour"],
  rare: ["RARE", "Fine spirits"],
  epic: ["EPIC", "Aged in oak"],
  legendary: ["LEGENDARY", "Top shelf"],
  mythic: ["MYTHIC", "Kept under the counter"],
};
const ELEMENT_GROUPS: Record<Element, [string, string]> = {
  fire: ["FIRE", "Firewater"],
  ice: ["ICE", "Served on the rocks"],
  lightning: ["LIGHTNING", "Thunder shots"],
  nature: ["NATURE", "Herbal brews"],
  poison: ["POISON", "Snake oil"],
  arcane: ["ARCANE", "Mystic mixers"],
};
/** Archetypes bundled into four broad roles. */
const ROLES: { key: string; title: string; sub: string; icon: string; archs: Arch[] }[] = [
  { key: "gun", title: "GUNSLINGERS", sub: "Single-target damage", icon: "stat:range", archs: ["shot", "pierce", "sniper", "crit", "execute", "growth"] },
  { key: "brawl", title: "BRAWLERS", sub: "Hit the whole crowd", icon: "stat:splash", archs: ["splash", "burn", "chain"] },
  { key: "trick", title: "TRICKSTERS", sub: "Slow, freeze, stun and curse", icon: "stat:slow", archs: ["slow", "freeze", "stun", "poison", "curse"] },
  { key: "support", title: "BARKEEPS", sub: "Buffs and mana", icon: "item:mana_orb", archs: ["buff", "mana"] },
];

function groupsFor(by: GroupBy): Group[] {
  if (by === "rarity")
    return RARITY_ORDER.map((r) => ({
      key: r,
      title: RARITY_GROUPS[r][0],
      sub: RARITY_GROUPS[r][1],
      accent: RARITY_STATS[r].color,
      match: (u) => u.rarity === r,
    }));
  if (by === "element")
    return ELEMENTS.map((e) => ({
      key: e,
      title: ELEMENT_GROUPS[e][0],
      sub: ELEMENT_GROUPS[e][1],
      icon: `item:essence_${e}`,
      accent: ELEMENT_COLOR[e],
      match: (u) => u.element === e,
    }));
  if (by === "role") return ROLES.map((r) => ({ ...r, match: (u) => r.archs.includes(u.arch) }));
  return [{ key: "all", title: "THE WHOLE SALOON", sub: "Every card, owned first", match: () => true }];
}

export class DeckScene extends Phaser.Scene {
  /** Filters live on the class so they survive restarts (after an upgrade or a deck change). */
  private static status: Status = "all";
  private static elements = new Set<Element>();
  private static groupBy: GroupBy = "rarity";

  /** When set, the next tap on a deck slot puts this card there. */
  private swapping: string | null = null;
  private hint!: Phaser.GameObjects.Text;
  private view!: ScrollView;
  private slots: Phaser.GameObjects.Image[] = [];
  private deckCards: Phaser.GameObjects.Container[] = [];
  private statusChips: { id: Status; paint: (on: boolean) => void }[] = [];
  private elementChips: { id: Element; paint: (on: boolean, dim: boolean) => void }[] = [];

  constructor() {
    super("Deck");
  }

  /** `show` opens that card's details on arrival (from the lobby's deck row). */
  create(data?: { show?: string }) {
    music("lobby");
    this.swapping = null;
    this.slots = [];
    this.deckCards = [];
    this.statusChips = [];
    this.elementChips = [];
    saloonAmbience(this, "loc:deck_room_background", [[0.15, 0.12], [0.85, 0.12], [0.5, 0.42]], undefined, 0.38);

    // Wide: deck and hero on the left, filters and the collection on the right. Phone: stacked.
    const colW = WIDE ? 760 : W - 40;
    const colX = WIDE ? 60 + colW / 2 : W / 2;
    let listRect: Phaser.Geom.Rectangle;
    let filterX: number, filterW: number, filterY: number;
    if (WIDE) {
      const rx = colX + colW / 2 + 50;
      filterW = W - 30 - rx;
      filterX = rx + filterW / 2;
      filterY = 150;
      listRect = new Phaser.Geom.Rectangle(rx - 20, 300, W - rx + 20, H - 300);
    } else {
      filterW = W - 40;
      filterX = W / 2;
      filterY = 654;
      listRect = new Phaser.Geom.Rectangle(0, 776, W, H - 776);
    }

    this.view = new ScrollView(this, listRect);
    topBar(this);
    hangingSign(this, colX, "BATTLE DECK", "~ THE REGULARS' TABLE ~", WIDE ? 520 : 400, WIDE ? 124 : 104);
    iconButton(this, 50, 130, "back", 76, () => this.scene.start("Lobby"));

    const deckTop = WIDE ? 330 : 232;
    this.counter(colX, deckTop, colW);
    this.heroStrip(colX, deckTop + (WIDE ? 270 : 218), colW);
    this.filters(filterX, filterY, filterW);
    this.fill();
    // Static shapes become cached images (see bake.ts); phones can't redraw them every frame.
    bakeAll(this);
    if (data?.show && UNIT_BY_ID[data.show]) this.showCard(data.show);
    // Phaser keeps start data across restart(), which would reopen the card after every upgrade.
    this.sys.settings.data = {};
  }

  // ---------------------------------------------------------------- deck + hero

  /** The deck: five cards standing on the bar, lit from behind. */
  private counter(cx: number, top: number, w: number) {
    const left = cx - w / 2;
    const h = WIDE ? 236 : 204;
    const g = this.add.graphics();
    board(g, left, top, w, h, 24);
    const gap = Math.min(146, (w - 60) / 5);
    const size = Math.min(124, gap - 16);
    const cardY = top + (WIDE ? 96 : 82);
    // A dark recess and a lamp halo behind each slot, then the bar top with a brass foot rail.
    for (let i = 0; i < 5; i++) {
      const x = cx + (i - 2) * gap;
      g.fillStyle(0x000000, 0.35).fillRoundedRect(x - size / 2 - 6, cardY - size / 2 - 6, size + 12, size + 12, 16);
      const halo = this.add.image(x, cardY, GLOW).setTint(0xffb050).setBlendMode(Phaser.BlendModes.ADD).setScale(0.75).setAlpha(0.32);
      this.slots.push(halo);
    }
    const barY = top + h - (WIDE ? 74 : 64);
    plank(g, left + 8, barY, w - 16, 40, 8, WOOD_LIGHT);
    g.lineStyle(5, BRASS_DARK, 1).lineBetween(left + 26, barY + 52, left + w - 26, barY + 52);
    g.lineStyle(3, BRASS, 1).lineBetween(left + 26, barY + 50, left + w - 26, barY + 50);

    profile.deck.forEach((id, i) => {
      const x = cx + (i - 2) * gap;
      const c = cardView(this, x, cardY, size, id, { level: profile.cards[id].level });
      pressable(c, () => this.tapDeckSlot(i));
      c.on("pointerover", () => this.tweens.add({ targets: c, y: cardY - 6, duration: 120 }));
      c.on("pointerout", () => this.tweens.add({ targets: c, y: cardY, duration: 140 }));
      this.deckCards.push(c);
    });
    this.hint = stxt(this, cx, barY + 20, "Tap a card to see it", WIDE ? 24 : 22, TAN);
  }

  /** The equipped hero, under the deck. Opens the hero screen. */
  private heroStrip(cx: number, top: number, w: number) {
    const left = cx - w / 2;
    const h = WIDE ? 180 : 150;
    const g = this.add.graphics();
    board(g, left, top, w, h, 24);
    const hero = profile.hero ? HERO_BY_ID[profile.hero] : null;
    const cardSize = h - 50;
    const textX = left + cardSize + 52;
    const btnW = WIDE ? 200 : 170;
    const wrap = w - (textX - left) - btnW - 44;
    const midY = top + h / 2;
    if (hero) {
      pressable(heroCardView(this, left + 28 + cardSize / 2, midY, cardSize, hero.id), () => this.scene.start("Heroes"));
      stxt(this, textX, top + 42, `HERO: ${hero.name}`, WIDE ? 28 : 25, GOLD_TEXT, [0, 0.5]);
      stxt(this, textX, top + 74, hero.ability, WIDE ? 23 : 21, "#ffd93b", [0, 0.5]);
      stxt(this, textX, top + 94, heroAbilityText(hero), WIDE ? 19 : 17, TAN, [0, 0]).setWordWrapWidth(wrap).setAlign("left");
    } else {
      stxt(this, textX, midY, "No hero selected", 28, TAN, [0, 0.5]);
    }
    button(this, left + w - 28 - btnW / 2, midY, btnW, WIDE ? 86 : 76, "HEROES", "yellow", () => this.scene.start("Heroes"), WIDE ? 32 : 28);
  }

  // ---------------------------------------------------------------- filters

  private filters(cx: number, y: number, w: number) {
    const h = 56;
    const back = this.add.graphics();
    plank(back, cx - w / 2, y - 46, w, 164, 20, WOOD_DARK);
    back.lineStyle(3, BRASS, 0.6).strokeRoundedRect(cx - w / 2 + 8, y - 38, w - 16, 148, 14);
    rivets(back, cx - w / 2, y - 46, w, 164, 18);

    // Row 1: ownership tabs.
    const inner = w - 64;
    const gap = 10;
    const tabW = Math.min(200, (inner - gap * 3) / 4);
    STATUS_TABS.forEach((t, i) => {
      const x = cx + (i - 1.5) * (tabW + gap);
      const c = chip(this, x, y, tabW, h, t.label, t.id === "ready" ? "ui:upgrade_arrow" : undefined);
      this.statusChips.push({ id: t.id, paint: (on) => (c.paint(on), c.setScale(on ? 1.04 : 1)) });
      pressable(c, () => {
        if (DeckScene.status === t.id) return;
        DeckScene.status = t.id;
        this.repaintFilters();
        this.fill();
      });
    });

    // Row 2: element toggles (none on = every element), then the group-by switch.
    const y2 = y + 72;
    const dot = 50;
    const dotGap = 10;
    const groupW = Math.min(300, inner - ELEMENTS.length * (dot + dotGap) - 4);
    const rowW = ELEMENTS.length * (dot + dotGap) + groupW;
    let x = cx - rowW / 2 + dot / 2;
    for (const e of ELEMENTS) {
      const face = bakedImage(this);
      const icon = this.add.image(0, 0, `item:essence_${e}`);
      icon.setScale((dot * 0.8) / Math.max(icon.width, icon.height));
      const c = this.add.container(x, y2, [face, icon]).setSize(dot, dot);
      const paint = (on: boolean, dim: boolean) => {
        face.draw((g) => {
          g.fillStyle(0x000000, 0.4).fillCircle(2, 4, dot / 2 + 2);
          g.fillStyle(on ? BRASS : 0x1a0c04, 1).fillCircle(0, 0, dot / 2 + 3);
          g.fillStyle(on ? ELEMENT_COLOR[e] : 0x4a2812, on ? 0.6 : 1).fillCircle(0, 0, dot / 2 - 2);
        });
        icon.setAlpha(dim ? 0.35 : 1);
        c.setScale(on ? 1.08 : 1);
      };
      this.elementChips.push({ id: e, paint });
      pressable(c, () => {
        const set = DeckScene.elements;
        if (set.has(e)) set.delete(e);
        else set.add(e);
        if (set.size === ELEMENTS.length) set.clear();
        this.repaintFilters();
        this.fill();
      });
      x += dot + dotGap;
    }
    const group = chip(this, x - dot / 2 + groupW / 2, y2, groupW, h, "");
    group.paint(true);
    const setLabel = () => group.label.setText(`GROUP: ${DeckScene.groupBy.toUpperCase()}`);
    setLabel();
    pressable(group, () => {
      DeckScene.groupBy = GROUP_ORDER[(GROUP_ORDER.indexOf(DeckScene.groupBy) + 1) % GROUP_ORDER.length];
      setLabel();
      this.fill();
    });
    this.repaintFilters();
  }

  private repaintFilters() {
    for (const c of this.statusChips) c.paint(c.id === DeckScene.status);
    const set = DeckScene.elements;
    for (const c of this.elementChips) c.paint(set.has(c.id), set.size > 0 && !set.has(c.id));
  }

  // ---------------------------------------------------------------- collection

  private visibleUnits() {
    const set = DeckScene.elements;
    const status = DeckScene.status;
    return UNITS.filter((u) => u.enabled || profile.cards[u.id])
      .filter((u) => !set.size || set.has(u.element))
      .filter((u) => {
        const owned = !!profile.cards[u.id];
        if (status === "owned") return owned;
        if (status === "locked") return !owned;
        if (status === "ready") return owned && canUpgrade(u.id);
        return true;
      })
      .sort((a, b) => {
        const owned = Number(!!profile.cards[b.id]) - Number(!!profile.cards[a.id]);
        if (owned) return owned;
        const r = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
        return r || a.name.localeCompare(b.name);
      });
  }

  /** Rebuild the shelves for the current filters and grouping. */
  private fill() {
    const content = this.view.content;
    content.removeAll(true);
    const rect = this.view.rect;
    const cols = Math.max(3, Math.min(WIDE ? 12 : 4, Math.floor((rect.width - 40) / GAP_X)));
    const gridW = cols * GAP_X;
    const left = rect.centerX - gridW / 2;
    const units = this.visibleUnits();
    const all = UNITS.filter((u) => u.enabled || profile.cards[u.id]);
    let y = 24;
    let n = 0;

    if (!units.length) {
      const msg = stxt(this, rect.centerX, 160, "The barkeep shrugs.\nNo cards match that.", 32, TAN);
      content.add(msg);
      this.popIn(msg, 0);
      this.view.setHeight(320);
      return;
    }

    for (const gr of groupsFor(DeckScene.groupBy)) {
      const list = units.filter(gr.match);
      if (!list.length) continue;
      const inGroup = all.filter(gr.match);
      const owned = inGroup.filter((u) => profile.cards[u.id]).length;
      const head = groupHeader(this, left, y, gridW, gr, `${owned}/${inGroup.length}`);
      content.add(head);
      this.popIn(head, n++);
      y += 112;
      for (let r = 0; r * cols < list.length; r++) {
        const row = list.slice(r * cols, r * cols + cols);
        content.add(shelf(this, left - 10, y + 226, gridW + 20));
        row.forEach((u, i) => {
          const card = this.collectionCard(u, left + GAP_X / 2 + i * GAP_X, y + CARD / 2 + 20);
          content.add(card);
          this.popIn(card, n++);
        });
        y += ROW_H;
      }
      y += 14;
    }
    bakeAll(content);
    this.view.setHeight(y + 40);
  }

  private collectionCard(u: UnitDef, x: number, y: number) {
    const owned = profile.cards[u.id];
    const ready = !!owned && canUpgrade(u.id);
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (owned) {
      const glow = this.add.image(0, 0, GLOW).setTint(ready ? 0x7dff7a : RARITY_STATS[u.rarity].color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.85).setAlpha(ready ? 0.45 : 0.22);
      parts.push(glow);
      if (ready) this.tweens.add({ targets: glow, alpha: 0.2, yoyo: true, repeat: -1, duration: 900, ease: "Sine.InOut" });
    }
    parts.push(cardView(this, 0, 0, CARD, u.id, { level: owned?.level, locked: !owned, name: true }));
    if (owned) {
      const need = owned.level < maxCardLevel() ? upgradeCost(owned.level, u.rarity).copies : 0;
      const p = need ? Math.min(1, owned.copies / need) : 1;
      const bar = this.add.graphics();
      bar.fillStyle(0x1a0c04, 1).fillRoundedRect(-62, 100, 124, 20, 10);
      bar.lineStyle(2, BRASS, 1).strokeRoundedRect(-62, 100, 124, 20, 10);
      bar.fillStyle(ready ? 0x59d64a : 0xe0a030, 1).fillRoundedRect(-59, 103, Math.max(10, 118 * p), 14, 7);
      bar.fillStyle(0xffffff, 0.3).fillRoundedRect(-56, 104, Math.max(6, 112 * p), 4, 2);
      parts.push(bar, stxt(this, 0, 110, need ? `${owned.copies}/${need}` : "MAX", 15));
      if (profile.deck.includes(u.id)) {
        const tag = this.add.graphics();
        tag.fillStyle(0x1a0c04, 1).fillRoundedRect(-52, -CARD / 2 - 14, 104, 30, 15);
        tag.fillStyle(0x3f8f2e, 1).fillRoundedRect(-49, -CARD / 2 - 11, 98, 24, 12);
        parts.push(tag, stxt(this, 0, -CARD / 2 + 1, "IN DECK", 17, "#eaffd8"));
      }
      if (ready) {
        const arrow = this.add.image(-CARD / 2 + 14, -CARD / 2 + 20, "ui:upgrade_arrow");
        arrow.setScale(44 / Math.max(arrow.width, arrow.height));
        parts.push(arrow);
        this.tweens.add({ targets: arrow, y: arrow.y - 8, yoyo: true, repeat: -1, duration: 500, ease: "Sine.InOut" });
      }
    }
    const card = this.add.container(x, y, parts).setSize(CARD, CARD);
    card.setInteractive({ useHandCursor: true });
    card.on("pointerover", () => this.tweens.add({ targets: card, scale: 1.05, duration: 120, ease: "Sine.Out" }));
    card.on("pointerout", () => this.tweens.add({ targets: card, scale: 1, duration: 140, ease: "Sine.Out" }));
    card.on("pointerup", () => {
      if (!this.view.tapOk()) return;
      sfx("click");
      this.showCard(u.id);
    });
    return card;
  }

  private popIn(obj: Phaser.GameObjects.Container | Phaser.GameObjects.Text, i: number) {
    const y = obj.y;
    obj.setAlpha(0).setY(y + 30);
    this.tweens.add({ targets: obj, alpha: 1, y, delay: Math.min(i * 28, 500), duration: 320, ease: "Back.Out" });
  }

  // ---------------------------------------------------------------- actions

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
      else this.scene.restart();
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
    m.add(txt(this, cx, cy - 72, ARCHETYPES[def.arch].label, 26, "#ffffff"));
    // The archetype's numbers for this unit as summoned (rank 1).
    const effect = effectSummary(def.arch, 1, RARITY_ORDER.indexOf(def.rarity));
    if (effect) m.add(txt(this, cx, cy - 40, effect, 20, "#7fffd4"));
    m.add(txt(this, cx, effect ? cy - 8 : cy - 26, `"${def.blurb}"`, effect ? 20 : 22, "#c9d2ff"));

    const level = owned?.level ?? 1;
    const stats = unitStats(def, 1, level, 0);
    const rows: [string, string][] = [
      ["stat:damage", def.arch === "buff" ? "—" : fmt(stats.damage)],
      ["stat:attack_speed", def.arch === "buff" ? "—" : `every ${+(1 / stats.speed).toFixed(2)}s`],
    ];
    // Lay the icon+value pairs out by their real widths and centre the row.
    const pairs = rows.map(([icon, value]) => ({
      img: this.add.image(0, cy + 40, icon).setDisplaySize(56, 56).setOrigin(0, 0.5),
      label: txt(this, 0, cy + 40, value, 32, "#ffffff", [0, 0.5]),
    }));
    const pairW = (p: (typeof pairs)[number]) => 56 + 12 + p.label.width;
    const gap = 60;
    let x = cx - (pairs.reduce((s, p) => s + pairW(p), 0) + gap * (pairs.length - 1)) / 2;
    for (const p of pairs) {
      p.img.setX(x);
      p.label.setX(x + 68);
      x += pairW(p) + gap;
      m.add([p.img, p.label]);
    }

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
          for (const halo of this.slots) {
            halo.setTint(0x7dff7a);
            this.tweens.add({ targets: halo, alpha: 0.75, scale: 0.9, yoyo: true, repeat: -1, duration: 450, ease: "Sine.InOut" });
          }
          // The deck cards wiggle in a wave so it's obvious they're waiting to be tapped.
          this.deckCards.forEach((c, i) => {
            this.tweens.add({ targets: c, scale: 1.08, yoyo: true, repeat: -1, duration: 450, ease: "Sine.InOut", delay: i * 90 });
            this.tweens.chain({
              targets: c,
              delay: i * 90,
              loop: -1,
              loopDelay: 700,
              tweens: [
                { angle: -6, duration: 70 },
                { angle: 6, duration: 110 },
                { angle: -4, duration: 100 },
                { angle: 0, duration: 80 },
              ],
            });
          });
        }),
      );
    }
  }
}
