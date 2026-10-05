import Phaser from "phaser";
import { auraBonus, buffBonus, effectSummary, unitEffectSummary, EFFECTS } from "../../../shared/effects.ts";
import { noAttack } from "../../../shared/support.ts";
import { PERKS } from "../../../shared/perks.ts";
import {
  SUPPORT_ARCHS, SUPPORT_TEXT, brewMana, echoStrength, isSupport, luckyChance, mimePrep, mirrorInterval, owlCharge, portalCooldown, type SupportArch,
} from "../../../shared/support.ts";
import { ARCHETYPES, STYLES, maxRank, RARITY_ORDER, rarityIndex, RARITY_STATS, ELEMENTS, ELEMENT_COLOR, UNITS, UNIT_BY_ID, maxCardLevel, maxPowerUp, powerUpCost, unitStats, upgradeCost, boostMult, levelMult } from "../data/units";
import type { Arch, Element, Rarity, UnitDef } from "../data/units";
import { HERO_BY_ID, heroAbilityText } from "../data/heroes";
import { ECONOMY } from "../../../shared/economy.ts";
import { profile, canUpgrade, upgradeCard, setDeck } from "../save";
import { canAwaken } from "../battle/Unit";
import { W, H, WIDE, txt, button, iconButton, cardView, heroCardView, modal, fmt, pressable, attempt, raceBadge } from "../ui";
import { topBar } from "./LobbyScene";
import { coach, setTutorialDone, tutorialDue } from "../tutorial";
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
  event: ["EVENT", "On the house"],
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
  { key: "support", title: "BARKEEPS", sub: "Buffs and mana", icon: "item:mana_orb", archs: ["buff", "aura", "mana"] },
  { key: "cast", title: "SUPPORTING CAST", sub: "Never attack: copy, swap, brew", icon: "item:star_shard", archs: SUPPORT_ARCHS },
];

/** A support unit's effect in a few characters, for the stats tables. */
function supportCell(arch: SupportArch, rank: number, mult: number) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  switch (arch) {
    case "mime":
      return `${+mimePrep(mult).toFixed(1)}s`;
    case "portal":
      return `${+portalCooldown(rank, mult).toFixed(1)}s`;
    case "mirror":
      return `${+mirrorInterval(rank, mult).toFixed(1)}s`;
    case "lucky":
      return pct(luckyChance(rank, mult));
    case "hourglass":
      return `+${pct(owlCharge(rank, mult))}`;
    case "echo":
      return pct(echoStrength(rank, mult));
    case "herald":
      return `+${pct(Math.min(EFFECTS.herald.max, (EFFECTS.herald.perAwakened + EFFECTS.herald.perRank * (rank - 1)) * mult))}`;
    case "brewer":
      return `+${brewMana(rank, mult)}`;
  }
}

/** What the stats tables of a support unit show, and its icon. */
const SUPPORT_STAT: Record<SupportArch, [string, string]> = {
  mime: ["item:hourglass_speedup", "Seconds before it can copy"],
  portal: ["item:hourglass_speedup", "Recharge after a swap or hop"],
  mirror: ["item:hourglass_speedup", "Seconds between mirrors"],
  lucky: ["item:coins", "Chance a neighbour's merge keeps its unit"],
  hourglass: ["item:hourglass_speedup", "Neighbours' ultimate charge rate"],
  echo: ["stat:splash", "Strength of the repeated ultimate"],
  herald: ["stat:damage", "Damage for every unit, per awakened unit"],
  brewer: ["item:mana_orb", `Mana every ${EFFECTS.brewer.every}s, plus rank × wave at wave end`],
};

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
      icon: `element:${e}`,
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
  /** Last tab viewed in the card dialog. */
  private static cardTab: "info" | "stats" = "info";

  /** When set, the next tap on a deck slot puts this card there. */
  private swapping: string | null = null;
  private hint!: Phaser.GameObjects.Text;
  private view!: ScrollView;
  private slots: Phaser.GameObjects.Image[] = [];
  private deckCards: Phaser.GameObjects.Container[] = [];
  /** Set after an upgrade; closing the card dialog then rebuilds the scene to show the new levels. */
  private upgraded = false;
  private bar!: ReturnType<typeof topBar>;
  private statusChips: { id: Status; paint: (on: boolean) => void }[] = [];
  private elementChips: { id: Element; paint: (on: boolean, dim: boolean) => void }[] = [];

  constructor() {
    super("Deck");
  }

  /** `show` opens that card's details on arrival (from the lobby's deck row); `scroll` restores the list after a rebuild. */
  create(data?: { show?: string; scroll?: number }) {
    music("lobby");
    this.swapping = null;
    this.slots = [];
    this.deckCards = [];
    this.upgraded = false;
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
    this.bar = topBar(this);
    hangingSign(this, colX, "BATTLE DECK", "~ THE REGULARS' TABLE ~", WIDE ? 520 : 400, WIDE ? 124 : 104);
    iconButton(this, 50, 130, "back", 76, () => this.scene.start("Lobby"));

    const deckTop = WIDE ? 330 : 232;
    this.counter(colX, deckTop, colW);
    this.heroStrip(colX, deckTop + (WIDE ? 270 : 218), colW);
    this.filters(filterX, filterY, filterW);
    this.fill();
    if (data?.scroll) this.view.scrollTo(data.scroll);
    // Static shapes become cached images (see bake.ts); phones can't redraw them every frame.
    bakeAll(this);
    if (data?.show && UNIT_BY_ID[data.show]) this.showCard(data.show);
    else if (tutorialDue("deck")) this.tour(colX);
    // Phaser keeps start data across restart(), which would reopen the card after every upgrade.
    this.sys.settings.data = {};
  }

  /** First visit after the battle tutorial: what the deck is, the collection, and upgrades. */
  private tour(colX: number) {
    const [x, y] = WIDE ? [colX, 1000] : [W / 2, 1250];
    const mid = this.deckCards[2];
    const rect = this.view.rect;
    const cols = Math.max(3, Math.min(WIDE ? 12 : 4, Math.floor((rect.width - 40) / GAP_X)));
    const first = { x: rect.centerX - (cols * GAP_X) / 2 + GAP_X / 2, y: rect.y + 136 + CARD / 2 + 20 };
    coach(
      this,
      [
        {
          text: `This is your battle deck: the ${profile.deck.length} cards you take into battle. Summons and merges only ever give you these units.`,
          x, y, ok: "NEXT", point: { x: mid.x, y: mid.y }, dir: "up", r: mid.width / 2 + 8,
        },
        { text: "Below is your collection. Tap any card to see what it does, or USE IN DECK to swap it in.", x, y, ok: "NEXT", point: first, r: CARD / 2 + 10 },
        { text: "Copies from chests plus gold UPGRADE a card for good, unlike battle power ups. A full green bar means it's ready!", x, y, ok: "GOT IT" },
      ],
      (skipped) => skipped || setTutorialDone("deck"),
    );
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
      const icon = this.add.image(0, 0, `element:${e}`).setDisplaySize(dot, dot);
      const c = this.add.container(x, y2, [face, icon]).setSize(dot, dot);
      const paint = (on: boolean, dim: boolean) => {
        face.draw((g) => {
          g.fillStyle(0x000000, 0.4).fillCircle(2, 4, dot / 2 + 2);
          if (on) g.fillStyle(BRASS, 1).fillCircle(0, 0, dot / 2 + 4);
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
    return UNITS.filter((u) => (u.enabled || profile.cards[u.id]) && !u.storyOnly)
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
    const all = UNITS.filter((u) => (u.enabled || profile.cards[u.id]) && !u.storyOnly);
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
      await attempt(this, () => setDeck(deck));
      this.rebuild();
      return;
    }
    this.rebuild();
  }

  /** Restart the scene to show fresh state, keeping the collection where it was scrolled. */
  private rebuild() {
    this.scene.restart({ scroll: this.view.position });
  }

  /** `celebrate` reopens the dialog in place after an upgrade, with a level-up burst. */
  private showCard(id: string, celebrate = false) {
    const def = UNIT_BY_ID[id];
    const owned = profile.cards[id];
    const m = modal(this, 640, 1180, def.name, () => {
      if (this.upgraded) this.rebuild();
    });
    const { cx, cy } = m;
    const cardY = cy - 370;
    const card = cardView(this, cx, cardY, 260, id, { level: owned?.level, locked: !owned });
    m.add(card);
    if (celebrate) {
      // Skip the dialog's pop-in: it's the same dialog, refreshed.
      this.tweens.killTweensOf(m);
      m.setScale(1).setAlpha(1).setPosition(0, 0);
      this.levelUpBurst(m, card);
    }
    m.add(raceBadge(this, cx - 212, cardY - 40, def.race));

    // Two tabs under the card: the unit's details, and how its stats grow.
    const level = owned?.level ?? 1;
    const info = this.add.container(0, 0);
    const stats = this.statsTab(def, level, cx, cy - 120);
    const show = (t: "info" | "stats") => {
      DeckScene.cardTab = t;
      for (const x of tabs) x.c.paint(x.t === t);
      info.setVisible(t === "info");
      stats.setVisible(t === "stats");
    };
    const tabs = (["info", "stats"] as const).map((t, i) => {
      const c = chip(this, cx + (i ? 115 : -115), cy - 190, 210, 60, t === "info" ? "DETAILS" : "STATS");
      pressable(c, () => show(t));
      return { t, c };
    });

    const rarityCss = "#" + RARITY_STATS[def.rarity].color.toString(16).padStart(6, "0");
    const rarityLine = txt(this, cx, cy - 120, `${def.rarity.toUpperCase()} · ${def.element.toUpperCase()}`, 28, rarityCss);
    info.add(rarityLine);
    // Awakened form: a small preview to the side; tap either card to flip between them.
    if (canAwaken(id) && this.textures.exists(`portrait_awakened:${id}`)) {
      const awake = cardView(this, cx, cardY, 260, id, { awakened: true, locked: !owned }).setVisible(false);
      m.add(awake);
      const thumb = cardView(this, cx + 225, cardY - 60, 96, id, { awakened: true, locked: !owned });
      m.add(thumb);
      const label = txt(this, cx + 225, cardY + 12, `AWAKENS\nAT RANK ${maxRank()}`, 18, "#ffd93b");
      m.add(label);
      const awakeText = txt(this, cx, cy - 120, `AWAKENED: ×${ECONOMY.awakenDamageMult} dmg · ×${ECONOMY.awakenSpeedMult} speed · ultimate every ${ECONOMY.ultimateCooldown}s`, 22, "#ffd93b");
      info.add(awakeText.setVisible(false));
      const flip = () => {
        const showAwake = !awake.visible;
        awake.setVisible(showAwake);
        card.setVisible(!showAwake);
        thumb.setVisible(!showAwake);
        label.setVisible(!showAwake);
        rarityLine.setVisible(!showAwake);
        awakeText.setVisible(showAwake);
      };
      for (const c of [card, awake, thumb]) pressable(c, flip);
    }
    // A role (Barkeeper, Knight, Mercenary) shows in place of the style for units that never attack.
    const silent = noAttack(def.arch);
    const style =
      (def.role ? `${def.role.toUpperCase()} · ` : "") +
      (def.arch === "buff" || (silent && def.role) ? "" : isSupport(def.arch) ? "SUPPORT · " : `${STYLES[def.style].label.toUpperCase()} · `);
    info.add(txt(this, cx, cy - 82, style + (isSupport(def.arch) ? SUPPORT_TEXT[def.arch] : ARCHETYPES[def.arch].label), isSupport(def.arch) ? 22 : 26, "#ffffff"));
    // The archetype's numbers for this unit as summoned (rank 1), and a Knight's or Mercenary's own effect.
    const effect = effectSummary(def.arch, 1, rarityIndex(def.rarity), EFFECTS, levelMult(owned?.level ?? 1));
    let lineY = cy - 48;
    for (const line of [effect, def.effect ? unitEffectSummary(def.effect, 1) : null]) {
      if (!line) continue;
      info.add(txt(this, cx, lineY, line, 20, "#7fffd4"));
      lineY += 32;
    }
    if (def.perk !== "none") {
      const perk = PERKS[def.perk];
      info.add(txt(this, cx, lineY, `${def.arch === "buff" ? "Neighbours get " : ""}${perk.label}: ${perk.text}`, 20, "#ffd27a"));
      lineY += 32;
    }
    info.add(txt(this, cx, lineY, `"${def.blurb}"`, 20, "#c9d2ff"));

    const now = unitStats(def, 1, level, 0);
    const rows: [string, string][] = [
      ...(isSupport(def.arch)
        ? ([[SUPPORT_STAT[def.arch][0], "never attacks"]] as [string, string][])
        : def.arch === "buff"
        ? ([["stat:attack_speed", `neighbours +${Math.round(buffBonus(1, rarityIndex(def.rarity), levelMult(level)) * 100)}% faster`]] as [string, string][])
        : def.arch === "aura"
        ? ([["stat:attack_speed", `3×3 +${Math.round(auraBonus(1, levelMult(level)).speed * 100)}% speed, +${Math.round(auraBonus(1, levelMult(level)).damage * 100)}% dmg`]] as [string, string][])
        : def.arch === "aegis"
        ? ([["stat:attack_speed", "never attacks"]] as [string, string][])
        : ([
            ["stat:damage", fmt(now.damage)],
            ["stat:attack_speed", `every ${+(1 / now.speed).toFixed(2)}s`],
          ] as [string, string][])),
    ];
    // Lay the icon+value pairs out by their real widths and centre the row.
    const statY = cy + 76;
    const pairs = rows.map(([icon, value]) => ({
      img: this.add.image(0, statY, icon).setDisplaySize(56, 56).setOrigin(0, 0.5),
      label: txt(this, 0, statY, value, 32, "#ffffff", [0, 0.5]),
    }));
    const pairW = (p: (typeof pairs)[number]) => 56 + 12 + p.label.width;
    const gap = 60;
    let x = cx - (pairs.reduce((s, p) => s + pairW(p), 0) + gap * (pairs.length - 1)) / 2;
    for (const p of pairs) {
      p.img.setX(x);
      p.label.setX(x + 68);
      x += pairW(p) + gap;
      info.add([p.img, p.label]);
      if (celebrate && def.arch !== "buff" && !isSupport(def.arch)) {
        p.label.setColor("#7dff7a");
        this.tweens.add({ targets: p.label, scale: 1.25, yoyo: true, duration: 220, delay: 250, ease: "Quad.Out" });
        this.time.delayedCall(1400, () => p.label.active && p.label.setColor("#ffffff"));
      }
    }
    this.cardActions(m, info, id, cx, cy);
    // Filled before adding, so the modal pins every child to the screen.
    m.add([info, stats, ...tabs.map((x) => x.c)]);
    show(celebrate ? "info" : DeckScene.cardTab);
  }

  /** The buttons on the details tab: upgrade, and put the card in the deck. */
  private cardActions(m: ReturnType<typeof modal>, box: Phaser.GameObjects.Container, id: string, cx: number, cy: number) {
    const def = UNIT_BY_ID[id];
    const owned = profile.cards[id];
    if (!owned) {
      box.add(txt(this, cx, cy + 200, "Find this card in chests!", 32, "#ffd27a"));
      box.add(button(this, cx, cy + 360, 360, 100, "SHOP", "green", () => this.scene.start("Shop")));
      return;
    }

    if (owned.level < maxCardLevel()) {
      const cost = upgradeCost(owned.level, def.rarity);
      box.add(txt(this, cx, cy + 170, `Cards: ${owned.copies} / ${cost.copies}`, 30, owned.copies >= cost.copies ? "#7dff7a" : "#ffffff"));
      const up = button(this, cx, cy + 270, 400, 100, `UPGRADE  ${fmt(cost.coins)}`, "yellow", () => {
        up.setEnabled(false);
        attempt(this, () => upgradeCard(id)).then((ok) => {
          if (!this.sys.isActive()) return;
          if (!ok) {
            up.setEnabled(canUpgrade(id));
            return;
          }
          sfx("upgrade");
          this.upgraded = true;
          this.bar.refresh();
          // Rebuild the dialog with the new level so they can keep upgrading.
          m.destroy();
          this.showCard(id, true);
        });
      }, 36);
      up.setEnabled(canUpgrade(id));
      box.add(up);
    } else {
      box.add(txt(this, cx, cy + 220, "MAX LEVEL", 40, "#ffd93b"));
    }

    if (profile.deck.includes(id)) {
      box.add(txt(this, cx, cy + 400, "In your deck", 30, "#7dff7a"));
    } else if (!def.enabled) {
      box.add(txt(this, cx, cy + 400, "Currently unavailable", 30, "#ff8080"));
    } else {
      box.add(
        button(this, cx, cy + 400, 400, 100, "USE IN DECK", "blue", () => {
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

  /**
   * How the unit's numbers grow: permanent card levels, in-battle power-ups (mana) and
   * merge ranks. Every value comes from unitStats(), so it matches the battle.
   */
  private statsTab(def: UnitDef, level: number, cx: number, top: number) {
    const box = this.add.container(0, 0);
    const support = isSupport(def.arch) ? def.arch : null;
    const noAttack = def.arch === "buff" || def.arch === "aura" || def.arch === "aegis" || !!support;
    const dmg = (v: number) => (noAttack ? "—" : v < 100 ? String(+v.toFixed(1)) : fmt(v));
    const every = (s: number) => (noAttack ? "—" : `${+(1 / s).toFixed(2)}s`);
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    // Buff units: the attack speed they give their neighbours, in place of damage.
    const rarityIdx = rarityIndex(def.rarity);
    // Support units: their own effect (a time, a chance, mana...) in the same place; Muse her speed bonus.
    const buff = (rank: number, lvl: number, up: number, mult = 1) =>
      support
        ? supportCell(support, rank, boostMult(lvl, up))
        : def.arch === "aura"
        ? `+${pct(auraBonus(rank, boostMult(lvl, up)).speed)}`
        : def.arch === "aegis"
        ? "—"
        : `+${pct(buffBonus(rank, rarityIdx, boostMult(lvl, up) * mult))}`;
    const buffIcon = support ? SUPPORT_STAT[support][0] : "stat:attack_speed";
    const ROW = 33;
    let y = top - 6;
    // How it fights: style (hit size vs attack speed) and its perk.
    const st = STYLES[def.style];
    const vs = def.style === "balanced" ? "" : ` · ×${+st.dmg.toFixed(2)} damage, ×${st.speed} speed`;
    if (!noAttack) box.add(txt(this, cx, y, `${st.label.toUpperCase()}: ${st.text}${vs}`, 21, "#ffffff"));
    if (def.perk !== "none") {
      const perk = PERKS[def.perk];
      box.add(txt(this, cx, noAttack ? y : y + 30, `${noAttack ? "Neighbours get " : ""}${perk.label}: ${perk.text}`, 20, "#ffd27a"));
    }
    y += 72;
    const section = (title: string, note: string) => {
      box.add(txt(this, cx, y, title, 26, "#ffd93b"));
      box.add(txt(this, cx, y + 28, note, 19, "#c9d2ff"));
      y += 64;
    };
    // A header row of column names, then one row per stat; column `hi` is highlighted.
    const table = (heads: string[], rows: { icon: string; cells: string[] }[], hi = -1) => {
      const colW = Math.min(96, 480 / heads.length);
      const x0 = cx - (colW * heads.length) / 2 + 22;
      const at = (i: number) => x0 + colW * (i + 0.5);
      if (hi >= 0) {
        const h = ROW * (rows.length + 1) + 8;
        box.add(this.add.rectangle(at(hi), y - ROW / 2 - 4 + h / 2, colW - 6, h, 0xffd93b, 0.16).setStrokeStyle(2, 0xffd93b, 0.7));
      }
      heads.forEach((h, i) => box.add(txt(this, at(i), y, h, 20, i === hi ? "#ffd93b" : "#9fb0e0")));
      rows.forEach((r, ri) => {
        const ry = y + ROW * (ri + 1);
        box.add(this.add.image(x0 - 26, ry, r.icon).setDisplaySize(32, 32));
        r.cells.forEach((c, i) => box.add(txt(this, at(i), ry, c, 22, i === hi ? "#ffffff" : "#e6e9ff")));
      });
      y += ROW * (rows.length + 1) + 20;
    };

    // Card levels: the current one and the next few (or the last few near max).
    const max = maxCardLevel();
    const first = Math.max(1, Math.min(level, max - 4));
    const levels = Array.from({ length: Math.min(5, max) }, (_, i) => first + i);
    const what = noAttack ? "boost" : "damage";
    section("CARD LEVEL", `+${pct(ECONOMY.levelBonus)} ${what} per upgrade · max level ${max}`);
    table(
      levels.map((l) => (l === max ? "MAX" : `Lv ${l}`)),
      [
        noAttack
          ? { icon: buffIcon, cells: levels.map((l) => buff(1, l, 0)) }
          : { icon: "stat:damage", cells: levels.map((l) => dmg(unitStats(def, 1, l, 0).damage)) },
      ],
      levels.indexOf(level),
    );

    // Power-ups are bought with mana during a battle and last until it ends.
    const ups = Array.from({ length: maxPowerUp() + 1 }, (_, i) => i);
    section("POWER-UPS IN BATTLE", `Spend mana: +${pct(ECONOMY.powerUpBonus)} ${what} each, for that battle`);
    table(
      ups.map((p) => (p ? `+${p}` : "Base")),
      [
        noAttack
          ? { icon: buffIcon, cells: ups.map((p) => buff(1, level, p)) }
          : { icon: "stat:damage", cells: ups.map((p) => dmg(unitStats(def, 1, level, p).damage)) },
        { icon: "item:mana_orb", cells: ups.map((p) => (p ? fmt(powerUpCost(p - 1)) : "—")) },
      ],
      0,
    );

    // Merge ranks: two of the same unit at the same rank make one of the next rank.
    const ranks = Array.from({ length: maxRank() }, (_, i) => i + 1);
    const awakens = canAwaken(def.id, def.arch);
    const boost = (r: number, mult: number) => (awakens && r === maxRank() ? mult : 1);
    const mergeNote = support
      ? "Each merge: a stronger effect · support units never awaken"
      : noAttack
      ? `Each merge: +${pct(EFFECTS.buff.perRank)} boost${awakens ? ` · ★7 awakens (×${ECONOMY.awakenDamageMult})` : ""}`
      : `Each merge: +${pct(ECONOMY.rankDamageStep)} base damage, ${pct(ECONOMY.rankSpeedStep)} faster${awakens ? " · ★7 awakens" : ""}`;
    section("MERGE RANK", mergeNote);
    table(
      ranks.map((r) => `★${r}`),
      noAttack ? [{ icon: buffIcon, cells: ranks.map((r) => buff(r, level, 0, boost(r, ECONOMY.awakenDamageMult))) }] : [
        { icon: "stat:damage", cells: ranks.map((r) => dmg(unitStats(def, r, level, 0).damage * boost(r, ECONOMY.awakenDamageMult))) },
        { icon: "stat:attack_speed", cells: ranks.map((r) => every(unitStats(def, r, level, 0).speed * boost(r, ECONOMY.awakenSpeedMult))) },
      ],
      0,
    );
    const foot = support
      ? `${SUPPORT_STAT[support][1]} (Lv ${level}). ${SUPPORT_TEXT[support]}; it never attacks.`
      : noAttack
      ? `Its four neighbours attack this much faster (Lv ${level}, max +${pct(EFFECTS.buff.max)}).`
      : `At your card level (Lv ${level}). Times are seconds between attacks.`;
    box.add(txt(this, cx, y - 6, foot, 18, "#9fb0e0").setWordWrapWidth(540));
    return box;
  }

  /** Glow, sparks, a card pop and a "LEVEL UP!" banner over the card in the dialog. */
  private levelUpBurst(m: ReturnType<typeof modal>, card: Phaser.GameObjects.Container) {
    const { x, y } = card;
    const glow = this.add.image(x, y, GLOW).setTint(0xffd93b).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6);
    m.add(glow);
    m.moveBelow<Phaser.GameObjects.GameObject>(glow, card);
    this.tweens.add({ targets: glow, scale: 2.6, alpha: 0, duration: 750, ease: "Cubic.Out", onComplete: () => glow.destroy() });

    const sparks = this.add.particles(x, y, "saloon_mote", {
      speed: { min: 220, max: 560 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 500, max: 850 },
      scale: { start: 1.6, end: 0 },
      tint: [0xffd93b, 0xffffff, 0x7dff7a],
      blendMode: "ADD",
      emitting: false,
    });
    m.add(sparks);
    sparks.explode(36);
    this.time.delayedCall(1000, () => sparks.destroy());

    card.setScale(1.3);
    this.tweens.add({ targets: card, scale: 1, duration: 420, ease: "Back.Out" });

    const banner = txt(this, x, y + 40, "LEVEL UP!", 60, "#ffd93b").setScale(0);
    m.add(banner);
    this.tweens.chain({
      targets: banner,
      tweens: [
        { scale: 1.15, y, duration: 260, ease: "Back.Out" },
        { scale: 1, duration: 120 },
        { alpha: 0, y: y - 40, delay: 700, duration: 300, onComplete: () => banner.destroy() },
      ],
    });
  }
}
