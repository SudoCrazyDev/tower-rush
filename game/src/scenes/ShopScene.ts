import Phaser from "phaser";
import { animKey, ensureAnim, loadSheet, sheetScale } from "../assets";
import { CHESTS, buyChest, buyOffer, claimGift, giftReadyAt, profile, serverNow, type ChestDef, type ChestLoot } from "../save";
import { ECONOMY } from "../../../shared/economy.ts";
import { activeEvents, discounted, msLeft, nextChange, offerLeft, offerWindow, shopOffers, shortDuration, timeOf, type EventDef, type OfferDef } from "../../../shared/offers.ts";
import { chestById } from "../../../shared/profile.ts";
import { rewardPopup } from "./daily";
import { RARITY_STATS } from "../data/units";
import { W, H, WIDE, txt, button, iconButton, pressable, lootCards, modal, fmt, attempt, type Button } from "../ui";
import { cover, topBar } from "./LobbyScene";
import { music, sfx } from "../audio";

/** Saloon palette: dark mahogany, warm planks and brass trim. */
const WOOD_DARK = 0x2a150a;
const WOOD = 0x6b3a1a;
const WOOD_LIGHT = 0x9a5a2a;
const BRASS = 0xd9a441;
const BRASS_DARK = 0x7a4a12;
const TAN = "#f1d7a8";
const GOLD_TEXT = "#ffd77a";

type Filter = "all" | "free" | "coins" | "gems";
type GroupId = "offers" | "free" | "coins" | "gems";
/** Draws one shelf item (a chest or an offer) centred at x, hanging from `top`. */
type Item = (x: number, top: number, w: number, h: number) => Phaser.GameObjects.Container;

/** Accent for limited-time things: sale badges, event banners and offer ribbons. */
const SALE = 0xe0443a;
const EVENT_TEXT = "#ffb3e6";

const TABS: { id: Filter; label: string; icon?: string }[] = [
  { id: "all", label: "ALL" },
  { id: "free", label: "FREE", icon: "item:gift_box" },
  { id: "coins", label: "GOLD", icon: "item:coins" },
  { id: "gems", label: "GEMS", icon: "item:gems" },
];

const GROUPS: { id: GroupId; title: string; sub: string; icon: string }[] = [
  { id: "offers", title: "SPECIALS", sub: "Limited bundles, while they last", icon: "item:card_pack" },
  { id: "free", title: "ON THE HOUSE", sub: "A free round from the bartender", icon: "item:gift_box" },
  { id: "coins", title: "GOLD BAR", sub: "Chests paid in gold", icon: "item:coins" },
  { id: "gems", title: "TOP SHELF", sub: "Premium chests paid in gems", icon: "item:gems" },
];

export class ShopScene extends Phaser.Scene {
  constructor() {
    super("Shop");
  }

  /** Chosen quantity per chest and the active filters; kept across restarts so buying again is one tap. */
  private static qty: Record<string, number> = {};
  private static filter: Filter = "all";
  private static affordable = false;

  private content!: Phaser.GameObjects.Container;
  private viewTop = 0;
  private viewBottom = 0;
  private scroll = 0;
  private scrollTarget = 0;
  private scrollMax = 0;
  private knob?: Phaser.GameObjects.Graphics;
  private drag: { y: number; scroll: number; last: number; v: number } | null = null;
  private dragged = false;
  private busy = false;
  private locked = false;
  private tabs: { id: Filter; paint: (on: boolean) => void }[] = [];
  /** One-second clock for countdowns; each tick returns true when the shelves need rebuilding. */
  private clock?: Phaser.Time.TimerEvent;
  private ticks: (() => boolean)[] = [];

  preload() {
    loadSheet(this, "vfx", "chest_open");
    loadSheet(this, "vfx", "coin_burst");
  }

  create() {
    music("lobby");
    ensureAnim(this, "vfx", "chest_open", 24, 0);
    ensureAnim(this, "vfx", "coin_burst", 30, 0);
    this.busy = this.locked = false;
    this.drag = null;
    this.scroll = this.scrollTarget = 0;
    this.tabs = [];

    this.ambience();
    topBar(this);
    iconButton(this, 50, 130, "back", 76, () => this.scene.start("Lobby"));
    this.sign();
    this.filterBar(WIDE ? 285 : 268);

    this.viewTop = WIDE ? 345 : 322;
    this.viewBottom = H - 8;
    this.content = this.add.container(0, this.viewTop);
    const maskShape = this.make.graphics({}, false).fillRect(0, this.viewTop, W, this.viewBottom - this.viewTop);
    this.content.setMask(maskShape.createGeometryMask());
    this.edgeShades();
    this.scrolling();
    this.fill();
  }

  // ---------------------------------------------------------------- ambience

  /** The shop art, warmed up into a lamp-lit saloon: amber wash, vignette, lantern glow and dust. */
  private ambience() {
    const bg = cover(this, "loc:shop_background", 0, "shop_background");
    this.add.rectangle(W / 2, H / 2, W, H, 0x3a1a06, 0.42);
    this.radialTexture("shop_vignette", 512, [
      [0, "rgba(0,0,0,0)"],
      [0.55, "rgba(0,0,0,0)"],
      [1, "rgba(10,4,0,0.85)"],
    ]);
    this.add.image(W / 2, H / 2, "shop_vignette").setDisplaySize(W * 1.25, H * 1.15);

    // Lanterns in the shop art (fractions of the image), each with a flickering warm halo.
    this.radialTexture("shop_glow", 256, [
      [0, "rgba(255,255,255,1)"],
      [0.25, "rgba(255,255,255,0.45)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    const lanterns = [
      [0.19, 0.1],
      [0.81, 0.1],
      [0.61, 0.46],
    ];
    for (const [fx, fy] of lanterns) {
      const x = bg.x + (fx - 0.5) * bg.displayWidth;
      const y = bg.y + (fy - 0.5) * bg.displayHeight;
      const glow = this.add.image(x, y, "shop_glow").setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setScale(1.5).setAlpha(0.45);
      const flicker = () =>
        this.tweens.add({
          targets: glow,
          alpha: Phaser.Math.FloatBetween(0.3, 0.6),
          scale: Phaser.Math.FloatBetween(1.35, 1.6),
          duration: Phaser.Math.Between(90, 260),
          onComplete: flicker,
        });
      flicker();
    }

    // Dust drifting through the lamplight.
    this.radialTexture("shop_mote", 16, [
      [0, "rgba(255,255,255,1)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    this.add.particles(0, 0, "shop_mote", {
      x: { min: 0, max: W },
      y: { min: 0, max: H },
      lifespan: 7000,
      speedY: { min: -14, max: -4 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.3, max: 0.9 },
      alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.55 },
      tint: 0xffd59a,
      blendMode: "ADD",
      frequency: 160,
      advance: 7000,
    });
  }

  private radialTexture(key: string, size: number, stops: [number, string][]) {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, size, size)!;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [at, color] of stops) grad.addColorStop(at, color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  /** A wooden plank with grain, a dark edge and a lit top lip. */
  private plank(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number, base = WOOD) {
    g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 4, y + 8, w, h, r);
    g.fillStyle(0x1a0c04, 1).fillRoundedRect(x - 4, y - 4, w + 8, h + 8, r + 3);
    g.fillStyle(base, 1).fillRoundedRect(x, y, w, h, r);
    g.lineStyle(2, 0x000000, 0.18);
    for (let gy = y + 16; gy < y + h - 8; gy += 18) g.lineBetween(x + r * 0.6, gy, x + w - r * 0.6, gy + Math.sin(gy) * 2);
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(x + 6, y + 4, w - 12, Math.min(10, h / 4), 5);
  }

  private rivets(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, inset = 16) {
    for (const [rx, ry] of [
      [x + inset, y + inset],
      [x + w - inset, y + inset],
      [x + inset, y + h - inset],
      [x + w - inset, y + h - inset],
    ]) {
      g.fillStyle(BRASS_DARK, 1).fillCircle(rx, ry, 7);
      g.fillStyle(BRASS, 1).fillCircle(rx - 1, ry - 1, 5);
      g.fillStyle(0xffffff, 0.6).fillCircle(rx - 2, ry - 2, 1.6);
    }
  }

  /** The swinging saloon sign hanging from the top bar. */
  private sign() {
    const w = WIDE ? 560 : 430;
    const h = WIDE ? 128 : 116;
    const drop = 34;
    const sign = this.add.container(W / 2, 76);
    const g = this.add.graphics();
    for (const sx of [-w * 0.32, w * 0.32]) {
      for (let cy = 4; cy < drop + 6; cy += 12) {
        g.lineStyle(4, 0x3b2a18, 1).strokeEllipse(sx, cy, 10, 14);
        g.lineStyle(2, 0xb08850, 1).strokeEllipse(sx, cy, 8, 12);
      }
    }
    this.plank(g, -w / 2, drop, w, h, 22, 0x7a4420);
    g.lineStyle(4, BRASS, 1).strokeRoundedRect(-w / 2 + 10, drop + 10, w - 20, h - 20, 14);
    this.rivets(g, -w / 2, drop, w, h, 22);
    sign.add(g);
    sign.add(txt(this, 0, drop + h * 0.38, "SHOP", WIDE ? 62 : 56, GOLD_TEXT));
    sign.add(txt(this, 0, drop + h * 0.78, "~ GOLDEN TANKARD SALOON ~", WIDE ? 22 : 19, TAN));
    sign.setAngle(-1.4);
    this.tweens.add({ targets: sign, angle: 1.4, yoyo: true, repeat: -1, duration: 2200, ease: "Sine.InOut" });
  }

  // ---------------------------------------------------------------- filters

  private filterBar(y: number) {
    const tabW = WIDE ? 190 : 128;
    const gap = WIDE ? 14 : 10;
    const toggleW = WIDE ? 220 : 150;
    const total = TABS.length * tabW + gap * TABS.length + toggleW;
    let x = W / 2 - total / 2;
    for (const t of TABS) {
      this.tab(x + tabW / 2, y, tabW, t);
      x += tabW + gap;
    }
    this.affordToggle(x + toggleW / 2, y, toggleW);
  }

  private tab(x: number, y: number, w: number, t: (typeof TABS)[number]) {
    const h = 70;
    const g = this.add.graphics();
    const label = txt(this, t.icon ? 16 : 0, -1, t.label, WIDE ? 30 : 26, TAN);
    const parts: Phaser.GameObjects.GameObject[] = [g, label];
    if (t.icon) {
      const icon = this.add.image(-w / 2 + (WIDE ? 40 : 28), 0, t.icon);
      icon.setScale((WIDE ? 46 : 38) / Math.max(icon.width, icon.height));
      parts.push(icon);
    }
    const c = this.add.container(x, y, parts).setSize(w, h);
    const paint = (on: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.4).fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 18);
      g.fillStyle(on ? BRASS_DARK : 0x1a0c04, 1).fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 20);
      g.fillStyle(on ? BRASS : 0x4a2812, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      g.fillStyle(0xffffff, on ? 0.3 : 0.08).fillRoundedRect(-w / 2 + 8, -h / 2 + 5, w - 16, 12, 6);
      label.setColor(on ? "#fff8e0" : TAN);
      c.setScale(on ? 1.04 : 1);
    };
    paint(ShopScene.filter === t.id);
    this.tabs.push({ id: t.id, paint });
    pressable(c, () => {
      if (ShopScene.filter === t.id) return;
      ShopScene.filter = t.id;
      for (const tab of this.tabs) tab.paint(tab.id === t.id);
      this.fill();
    });
  }

  private affordToggle(x: number, y: number, w: number) {
    const h = 70;
    const g = this.add.graphics();
    const box = WIDE ? 34 : 30;
    const bx = -w / 2 + 16;
    const label = txt(this, bx + box + 10, -1, WIDE ? "CAN AFFORD" : "CAN BUY", WIDE ? 26 : 22, TAN, [0, 0.5]);
    const c = this.add.container(x, y, [g, label]).setSize(w, h);
    const paint = () => {
      const on = ShopScene.affordable;
      g.clear();
      g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      g.lineStyle(3, on ? BRASS : 0x8a6440, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
      g.fillStyle(0x1a0c04, 1).fillRoundedRect(bx, -box / 2, box, box, 8);
      g.lineStyle(3, BRASS, 1).strokeRoundedRect(bx, -box / 2, box, box, 8);
      if (on) {
        g.lineStyle(6, 0x7dff7a, 1);
        g.beginPath();
        g.moveTo(bx + box * 0.2, 0);
        g.lineTo(bx + box * 0.43, box * 0.25);
        g.lineTo(bx + box * 0.85, -box * 0.3);
        g.strokePath();
      }
      label.setColor(on ? "#fff8e0" : TAN);
    };
    paint();
    pressable(c, () => {
      ShopScene.affordable = !ShopScene.affordable;
      paint();
      this.fill();
    });
  }

  // ---------------------------------------------------------------- layout

  /** Rebuild the shelves for the current filters, popping the items in. */
  private fill() {
    this.content.removeAll(true);
    this.scroll = this.scrollTarget = 0;
    const now = serverNow();
    // Rebuild the moment an event or offer starts or ends.
    const change = nextChange(now);
    this.ticks = [() => serverNow() >= change];
    this.clock?.remove();
    this.clock = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.ticks.some((t) => t()) && this.fill() });

    const f = ShopScene.filter;
    const afford = ShopScene.affordable;
    const chests = CHESTS.filter((c) => c.enabled && (!afford || profile[c.currency] >= discounted(c.price, now)));
    // Offers sit under the tab of their currency (free ones under FREE). A sold-out offer stays up
    // (marked SOLD OUT) until it ends; one that never ends is just taken off the shelf.
    const offers = shopOffers(profile.trophies, now).filter(
      (o) =>
        (offerLeft(o, profile.offers) > 0 || offerWindow(o).end !== null) &&
        (f === "all" || (f === "free" ? o.price === 0 : o.price > 0 && o.currency === f)) &&
        (!afford || (offerLeft(o, profile.offers) > 0 && profile[o.currency] >= o.price)),
    );
    const giftReady = Date.now() >= giftReadyAt(profile);
    const groups = GROUPS.filter((gr) => gr.id === "offers" || f === "all" || f === gr.id)
      .map((gr) => ({
        ...gr,
        items: (gr.id === "offers"
          ? offers.map((o): Item => (x, top, w, h) => this.offerCard(o, x, top, w, h))
          : gr.id === "free"
            ? []
            : chests
                .filter((c) => c.currency === gr.id)
                .sort((a, b) => a.price - b.price)
                .map((c): Item => (x, top, w, h) => this.chestCard(c, x, top, w, h))) as Item[],
        gift: gr.id === "free" && (!afford || giftReady),
      }))
      .filter((gr) => gr.gift || gr.items.length);

    const cols = WIDE ? 4 : 2;
    const cardW = WIDE ? 360 : 336;
    const cardH = 500;
    const gap = WIDE ? 28 : 20;
    const gridW = cols * cardW + (cols - 1) * gap;
    const left = W / 2 - gridW / 2;
    let y = 18;
    let n = 0;

    // Running events head the shop: what they boost and when they end.
    for (const e of activeEvents(now)) {
      const banner = this.eventBanner(e, y, gridW);
      this.content.add(banner);
      this.popIn(banner, n++);
      y += banner.height + 30;
    }

    if (!groups.length) {
      const msg = txt(this, W / 2, y + 200, "The bartender shrugs.\nNothing on the shelves for that.", 32, TAN);
      this.content.add(msg);
      this.popIn(msg, 0);
      y += 380;
    }

    // On wide screens, small chest groups share a shelf side by side instead of each taking a row
    // (the specials keep a shelf of their own).
    const bands: (typeof groups)[] = [];
    for (const gr of groups) {
      const last = bands.at(-1);
      const used = last?.reduce((sum, b) => sum + b.items.length, 0) ?? 0;
      const alone = (g: (typeof groups)[number]) => g.gift || g.id === "offers";
      if (WIDE && last && !alone(gr) && !alone(last[0]) && used + gr.items.length <= cols) last.push(gr);
      else bands.push([gr]);
    }

    for (const band of bands) {
      if (band.length > 1) {
        const groupGap = 70;
        const spans = band.map((gr) => gr.items.length * cardW + (gr.items.length - 1) * gap);
        const bandW = spans.reduce((a, b) => a + b, 0) + groupGap * (band.length - 1);
        let x = W / 2 - bandW / 2;
        this.content.add(this.shelf(x - 20, y + 108 + cardH - 14, bandW + 40));
        band.forEach((gr, gi) => {
          const head = this.groupHeader(x, y, spans[gi], gr, gr.items.length);
          this.content.add(head);
          this.popIn(head, n++);
          gr.items.forEach((item, i) => {
            const card = item(x + cardW / 2 + i * (cardW + gap), y + 108, cardW, cardH);
            this.content.add(card);
            this.popIn(card, n++);
          });
          x += spans[gi] + groupGap;
        });
        y += 108 + cardH + 78;
        continue;
      }

      const gr = band[0];
      const count = gr.items.length + (gr.gift ? 1 : 0);
      const head = this.groupHeader(left, y, gridW, gr, count);
      this.content.add(head);
      this.popIn(head, n++);
      y += 108;

      if (gr.gift) {
        const gift = this.giftCard(W / 2, y, gridW);
        this.content.add(gift);
        this.popIn(gift, n++);
        y += 210 + 40;
      }

      for (let r = 0; r * cols < gr.items.length; r++) {
        const row = gr.items.slice(r * cols, r * cols + cols);
        const rowW = row.length * cardW + (row.length - 1) * gap;
        const shelf = this.shelf(left - 20, y + cardH - 14, gridW + 40);
        this.content.add(shelf);
        row.forEach((item, i) => {
          const card = item(W / 2 - rowW / 2 + cardW / 2 + i * (cardW + gap), y, cardW, cardH);
          this.content.add(card);
          this.popIn(card, n++);
        });
        y += cardH + 62;
      }
      y += 16;
    }

    this.scrollMax = Math.max(0, y - (this.viewBottom - this.viewTop));
    this.content.y = this.viewTop;
    this.drawKnob();
  }

  private popIn(obj: Phaser.GameObjects.Container | Phaser.GameObjects.Text, i: number) {
    const y = obj.y;
    obj.setAlpha(0).setY(y + 40);
    this.tweens.add({ targets: obj, alpha: 1, y, delay: 40 + i * 55, duration: 380, ease: "Back.Out" });
  }

  private groupHeader(left: number, y: number, w: number, gr: (typeof GROUPS)[number], count: number) {
    const c = this.add.container(0, y);
    const g = this.add.graphics();
    const h = 86;
    // A brass-trimmed chalkboard plaque, with rope trim running out to the edges.
    g.lineStyle(4, BRASS, 0.7).lineBetween(left, h / 2, left + w, h / 2);
    const pw = Math.min(WIDE ? 560 : 470, w - 84);
    const px = left + 10;
    g.fillStyle(0x000000, 0.4).fillRoundedRect(px + 4, 8, pw, h, 16);
    g.fillStyle(BRASS_DARK, 1).fillRoundedRect(px - 4, -4, pw + 8, h + 8, 18);
    g.fillStyle(0x1f2a22, 1).fillRoundedRect(px, 0, pw, h, 14);
    g.fillStyle(0xffffff, 0.05).fillRoundedRect(px + 10, 8, pw - 20, h / 2 - 8, 10);
    g.lineStyle(3, BRASS, 1).strokeRoundedRect(px, 0, pw, h, 14);
    c.add(g);
    const icon = this.add.image(px + 50, h / 2, gr.icon);
    icon.setScale(66 / Math.max(icon.width, icon.height));
    c.add(icon);
    c.add(txt(this, px + 96, 30, gr.title, 36, GOLD_TEXT, [0, 0.5]));
    c.add(txt(this, px + 98, 64, gr.sub, 20, "#d8e2d0", [0, 0.5]));
    // Item count in a brass coin at the right end of the rope.
    const bx = left + w - 34;
    g.fillStyle(BRASS_DARK, 1).fillCircle(bx, h / 2, 28);
    g.fillStyle(BRASS, 1).fillCircle(bx, h / 2, 23);
    c.add(txt(this, bx, h / 2 - 1, `${count}`, 28));
    return c;
  }

  /** A wall shelf the chest cards stand on. */
  private shelf(x: number, y: number, w: number) {
    const g = this.add.graphics();
    for (const bx of [x + 70, x + w - 70]) {
      g.fillStyle(0x1a0c04, 1).fillTriangle(bx - 22, y + 26, bx + 22, y + 26, bx, y + 74);
      g.fillStyle(BRASS_DARK, 1).fillTriangle(bx - 16, y + 26, bx + 16, y + 26, bx, y + 64);
    }
    g.fillStyle(0x000000, 0.35).fillRect(x + 10, y + 34, w - 20, 14);
    this.plank(g, x, y, w, 30, 6, WOOD_LIGHT);
    return g;
  }

  // ---------------------------------------------------------------- items

  private chestCard(c: ChestDef, x: number, top: number, w: number, h: number) {
    const card = this.add.container(x, top);
    const rarity = RARITY_STATS[c.guarantee].color;
    const g = this.add.graphics();
    this.plank(g, -w / 2, 0, w, h, 26, WOOD);
    g.fillStyle(WOOD_DARK, 1).fillRoundedRect(-w / 2 + 14, 14, w - 28, h - 28, 18);
    g.lineStyle(2, 0x000000, 0.25);
    for (let gx = -w / 2 + 50; gx < w / 2 - 20; gx += 46) g.lineBetween(gx, 18, gx, h - 18);
    g.lineStyle(3, BRASS, 0.85).strokeRoundedRect(-w / 2 + 14, 14, w - 28, h - 28, 18);
    this.rivets(g, -w / 2, 0, w, h, 14);

    // Lit-up hover zone underneath the controls (desktop only, harmless on touch).
    const hover = this.add.zone(0, h / 2, w, h).setInteractive();
    hover.on("pointerover", () => this.tweens.add({ targets: card, scale: 1.025, duration: 140, ease: "Sine.Out" }));
    hover.on("pointerout", () => this.tweens.add({ targets: card, scale: 1, duration: 160, ease: "Sine.Out" }));

    const glow = this.add.image(0, 150, "shop_glow").setTint(rarity).setBlendMode(Phaser.BlendModes.ADD).setScale(1.25).setAlpha(0.55);
    this.tweens.add({ targets: glow, alpha: 0.3, scale: 1.1, yoyo: true, repeat: -1, duration: 1300, ease: "Sine.InOut" });
    const img = this.add.image(0, 150, `item:${c.image}`).setDisplaySize(200, 200);
    this.tweens.add({ targets: img, y: 140, yoyo: true, repeat: -1, duration: 1400 + Math.random() * 400, ease: "Sine.InOut" });

    // Corner tags: card count and the guaranteed rarity.
    const tags = this.add.graphics();
    tags.fillStyle(0x000000, 0.55).fillRoundedRect(-w / 2 + 24, 26, 116, 36, 18);
    const rarityLabel = txt(this, 0, 44, `${c.guarantee.toUpperCase()}+`, 20);
    const rw = Math.max(100, rarityLabel.width + 26);
    rarityLabel.setX(w / 2 - 24 - rw / 2);
    tags.fillStyle(rarity, 1).fillRoundedRect(w / 2 - 24 - rw, 26, rw, 36, 18);
    tags.lineStyle(2, 0xffffff, 0.5).strokeRoundedRect(w / 2 - 24 - rw, 26, rw, 36, 18);

    // Name on a brass plaque.
    const plaque = this.add.graphics();
    const pw = w - 70;
    plaque.fillStyle(BRASS_DARK, 1).fillRoundedRect(-pw / 2 - 3, 252, pw + 6, 52, 14);
    plaque.fillStyle(BRASS, 1).fillRoundedRect(-pw / 2, 255, pw, 46, 12);
    plaque.fillStyle(0xffffff, 0.25).fillRoundedRect(-pw / 2 + 8, 258, pw - 16, 10, 5);

    card.add([g, hover, glow, img, tags, plaque]);
    card.add(txt(this, -w / 2 + 82, 44, `${c.rolls} CARDS`, 20, TAN));
    card.add(rarityLabel);
    card.add(txt(this, 0, 278, c.name, 30));
    const info = txt(this, 0, 326, "", 21, TAN);
    card.add(info);

    // A running event's discount, shown as a sale badge on the art.
    const price = discounted(c.price, serverNow());
    if (price < c.price) card.add(this.saleBadge(w / 2 - 70, 196, `-${Math.round((1 - price / c.price) * 100)}%`));

    const unit = c.currency === "coins" ? "GOLD" : "GEMS";
    const most = Math.max(1, Math.min(ECONOMY.chestBulkMax, Math.floor(profile[c.currency] / price)));
    let n = Math.min(ShopScene.qty[c.id] ?? 1, most);
    const count = txt(this, 0, 382, "", 38);
    const buy = button(this, 0, 446, w - 70, 80, "", c.currency === "coins" ? "yellow" : "blue", this.tap(() => this.buy(c, n)), 30);
    const minus = button(this, -96, 382, 72, 62, "-", "grey", this.tap(() => set(n - 1)), 42);
    const plus = button(this, 96, 382, 72, 62, "+", "grey", this.tap(() => set(n + 1)), 42);
    card.add([count, minus, plus, buy]);
    const set = (v: number) => {
      n = Math.max(1, Math.min(most, v));
      ShopScene.qty[c.id] = n;
      count.setText(`x${n}`);
      buy.label.setText(`${fmt(price * n)} ${unit}`);
      const short = price * n - profile[c.currency];
      buy.setEnabled(short <= 0);
      minus.setEnabled(n > 1);
      plus.setEnabled(n < most);
      info.setText(short > 0 ? `Need ${fmt(short)} more ${unit.toLowerCase()}` : `+${c.coinsMin * n}-${c.coinsMax * n} gold inside`);
      info.setColor(short > 0 ? "#ff9a8a" : TAN);
    };
    set(n);
    return card;
  }

  private giftCard(x: number, top: number, w: number) {
    const h = 210;
    const card = this.add.container(x, top);
    const g = this.add.graphics();
    this.plank(g, -w / 2, 0, w, h, 26, WOOD);
    g.fillStyle(WOOD_DARK, 1).fillRoundedRect(-w / 2 + 14, 14, w - 28, h - 28, 18);
    g.lineStyle(3, BRASS, 0.85).strokeRoundedRect(-w / 2 + 14, 14, w - 28, h - 28, 18);
    this.rivets(g, -w / 2, 0, w, h, 14);
    card.add(g);

    const readyAt = giftReadyAt(profile);
    const ready = Date.now() >= readyAt;
    const gx = -w / 2 + (WIDE ? 130 : 105);
    const glow = this.add.image(gx, h / 2, "shop_glow").setTint(0x7dff7a).setBlendMode(Phaser.BlendModes.ADD).setScale(ready ? 1 : 0.7).setAlpha(ready ? 0.5 : 0.15);
    const box = this.add.image(gx, h / 2, "item:gift_box").setDisplaySize(150, 150);
    card.add([glow, box]);
    if (ready) {
      this.tweens.add({ targets: box, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 600, ease: "Sine.InOut" });
      this.tweens.add({ targets: glow, alpha: 0.25, yoyo: true, repeat: -1, duration: 800 });
    } else box.setAlpha(0.75);

    const tx = gx + 95;
    card.add(txt(this, tx, 58, "FREE GIFT", WIDE ? 40 : 34, GOLD_TEXT, [0, 0.5]));
    // Rewards as icon + amount pairs.
    const rewards: [string, number][] = [
      ["item:coins", ECONOMY.giftCoins],
      ["item:gems", ECONOMY.giftGems],
    ];
    rewards.forEach(([key, amount], i) => {
      const rx = tx + i * 130;
      const icon = this.add.image(rx + 20, 112, key);
      icon.setScale(44 / Math.max(icon.width, icon.height));
      card.add([icon, txt(this, rx + 48, 112, `+${amount}`, 28, "#ffffff", [0, 0.5])]);
    });
    const status = txt(this, tx, 160, "", 22, TAN, [0, 0.5]);
    card.add(status);

    const bw = WIDE ? 240 : 170;
    const claim: Button = button(this, w / 2 - 30 - bw / 2, h / 2, bw, 90, "CLAIM", "green", this.tap(() => {
      claim.setEnabled(false);
      attempt(this, claimGift).then((ok) => {
        if (ok) sfx("coin");
        this.scene.restart();
      });
    }), WIDE ? 36 : 30).setEnabled(ready);
    card.add(claim);
    if (ready) {
      status.setText("Ready to claim!").setColor("#9dff8a");
      this.tweens.add({ targets: claim, scale: 1.06, yoyo: true, repeat: -1, duration: 650, ease: "Sine.InOut" });
    } else {
      // Live countdown; rebuild the shelves the moment it's ready.
      const tick = () => {
        const left = Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
        if (!left) return true;
        const hh = Math.floor(left / 3600);
        const mm = Math.floor((left % 3600) / 60);
        const ss = left % 60;
        status.setText(`Next round in ${hh}h ${String(mm).padStart(2, "0")}m ${String(ss).padStart(2, "0")}s`);
        return false;
      };
      tick();
      this.ticks.push(tick);
    }
    return card;
  }

  /** A tilted red price-tag starburst ("-25%"). */
  private saleBadge(x: number, y: number, label: string) {
    const g = this.add.graphics();
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 24; i++) {
      const r = i % 2 ? 40 : 50;
      const a = (i / 24) * Math.PI * 2;
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
    g.fillStyle(0x000000, 0.35).fillPoints(pts.map((p) => new Phaser.Math.Vector2(p.x + 3, p.y + 5)), true);
    g.fillStyle(SALE, 1).fillPoints(pts, true);
    g.lineStyle(3, 0xffffff, 0.85).strokeCircle(0, 0, 34);
    const c = this.add.container(x, y, [g, txt(this, 0, -1, label, label.length > 4 ? 22 : 26)]).setAngle(12);
    this.tweens.add({ targets: c, scale: 1.08, yoyo: true, repeat: -1, duration: 700, ease: "Sine.InOut" });
    return c;
  }

  /** "Ends in 2d 4h" text that counts down (and asks for a rebuild when it's over). */
  private countdown(t: Phaser.GameObjects.Text, end: number | null, prefix: string) {
    const tick = () => {
      const left = msLeft(end, serverNow());
      if (left === null) return false;
      t.setText(`${prefix}${shortDuration(left)}`);
      return left <= 0;
    };
    tick();
    this.ticks.push(tick);
  }

  /** A running event: its name and what it boosts, with time left. */
  private eventBanner(e: EventDef, top: number, w: number) {
    const lines = [
      e.coinMult > 1 && `x${+e.coinMult.toFixed(2)} BATTLE GOLD`,
      e.gemMult > 1 && `x${+e.gemMult.toFixed(2)} BATTLE GEMS`,
      e.chestDiscount > 0 && `${Math.round(e.chestDiscount * 100)}% OFF CHESTS`,
    ].filter((s): s is string => !!s);
    const h = WIDE ? 150 : 196;
    const c = this.add.container(W / 2, top).setSize(w, h);
    const g = this.add.graphics();
    this.plank(g, -w / 2, 0, w, h, 26, 0x5a1f3a);
    g.lineStyle(4, BRASS, 1).strokeRoundedRect(-w / 2 + 12, 12, w - 24, h - 24, 18);
    this.rivets(g, -w / 2, 0, w, h, 14);
    c.add(g);
    const ix = -w / 2 + (WIDE ? 90 : 70);
    const glow = this.add.image(ix, h / 2, "shop_glow").setTint(0xff7ad9).setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setAlpha(0.6);
    const star = this.add.image(ix, h / 2, "item:star_shard").setDisplaySize(WIDE ? 110 : 90, WIDE ? 110 : 90);
    this.tweens.add({ targets: star, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 900, ease: "Sine.InOut" });
    this.tweens.add({ targets: glow, alpha: 0.3, yoyo: true, repeat: -1, duration: 900 });
    c.add([glow, star]);
    const tx = ix + (WIDE ? 90 : 70);
    c.add(txt(this, tx, WIDE ? 42 : 40, e.name.toUpperCase(), WIDE ? 38 : 32, GOLD_TEXT, [0, 0.5]));
    if (e.text) c.add(txt(this, tx, WIDE ? 84 : 80, e.text, WIDE ? 24 : 21, TAN, [0, 0.5]).setWordWrapWidth(w / 2 + (WIDE ? 100 : 160)));
    c.add(txt(this, tx, WIDE ? 120 : 160, lines.join("   ·   "), WIDE ? 24 : 21, EVENT_TEXT, [0, 0.5]));
    // Time left in a dark pill at the right.
    const pw = WIDE ? 250 : 200;
    const px = w / 2 - 30 - pw / 2;
    const py = WIDE ? h / 2 : 40;
    g.fillStyle(0x000000, 0.45).fillRoundedRect(px - pw / 2, py - 26, pw, 52, 26);
    const left = txt(this, px, py, "", WIDE ? 26 : 22, "#ffffff");
    c.add(left);
    this.countdown(left, timeOf(e.endsAt), "ENDS IN ");
    return c;
  }

  private offerCard(o: OfferDef, x: number, top: number, w: number, h: number) {
    const card = this.add.container(x, top);
    const g = this.add.graphics();
    this.plank(g, -w / 2, 0, w, h, 26, WOOD);
    g.fillStyle(0x2e0f1c, 1).fillRoundedRect(-w / 2 + 14, 14, w - 28, h - 28, 18);
    g.lineStyle(3, BRASS, 0.9).strokeRoundedRect(-w / 2 + 14, 14, w - 28, h - 28, 18);
    this.rivets(g, -w / 2, 0, w, h, 14);

    const hover = this.add.zone(0, h / 2, w, h).setInteractive();
    hover.on("pointerover", () => this.tweens.add({ targets: card, scale: 1.025, duration: 140, ease: "Sine.Out" }));
    hover.on("pointerout", () => this.tweens.add({ targets: card, scale: 1, duration: 160, ease: "Sine.Out" }));

    const glow = this.add.image(0, 145, "shop_glow").setTint(0xffc94a).setBlendMode(Phaser.BlendModes.ADD).setScale(1.25).setAlpha(0.55);
    this.tweens.add({ targets: glow, alpha: 0.3, scale: 1.1, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.InOut" });
    const img = this.add.image(0, 145, `item:${o.image}`).setDisplaySize(180, 180);
    this.tweens.add({ targets: img, y: 135, yoyo: true, repeat: -1, duration: 1400 + Math.random() * 400, ease: "Sine.InOut" });
    card.add([g, hover, glow, img]);

    // Corner tags: how many are left (when limited) and time left (when it ends).
    const left = offerLeft(o, profile.offers);
    const tags = this.add.graphics();
    card.add(tags);
    if (o.limit > 0) {
      tags.fillStyle(left > 0 ? 0x000000 : SALE, left > 0 ? 0.55 : 1).fillRoundedRect(-w / 2 + 24, 26, 120, 36, 18);
      card.add(txt(this, -w / 2 + 84, 44, left > 0 ? `${left} LEFT` : "SOLD OUT", 20, left > 0 ? TAN : "#ffffff"));
    }
    const end = offerWindow(o).end;
    if (end !== null) {
      tags.fillStyle(0x000000, 0.55).fillRoundedRect(w / 2 - 24 - 130, 26, 130, 36, 18);
      const t = txt(this, w / 2 - 24 - 65, 44, "", 20, EVENT_TEXT);
      card.add(t);
      this.countdown(t, end, "");
    }
    if (o.wasPrice > o.price) card.add(this.saleBadge(w / 2 - 70, 196, `-${Math.round((1 - o.price / o.wasPrice) * 100)}%`));

    // Name on a brass plaque, then the line of text.
    const plaque = this.add.graphics();
    const pw = w - 70;
    plaque.fillStyle(BRASS_DARK, 1).fillRoundedRect(-pw / 2 - 3, 252, pw + 6, 52, 14);
    plaque.fillStyle(BRASS, 1).fillRoundedRect(-pw / 2, 255, pw, 46, 12);
    plaque.fillStyle(0xffffff, 0.25).fillRoundedRect(-pw / 2 + 8, 258, pw - 16, 10, 5);
    card.add([plaque, txt(this, 0, 278, o.name, o.name.length > 16 ? 24 : 30)]);
    const info = txt(this, 0, 326, o.text, 20, TAN);
    card.add(info);

    // What's in the bundle, as icon + amount chips.
    const chest = o.reward.chest ? chestById(o.reward.chest) : undefined;
    const parts: [string, string][] = [];
    if (o.reward.coins) parts.push(["item:coins", fmt(o.reward.coins)]);
    if (o.reward.gems) parts.push(["item:gems", fmt(o.reward.gems)]);
    if (chest) parts.push([`item:${chest.image}`, `x${Math.max(1, o.chests)}`]);
    const chipW = (w - 60) / Math.max(1, parts.length);
    parts.forEach(([icon, label], i) => {
      const cx = -w / 2 + 30 + chipW * (i + 0.5);
      const t = txt(this, 0, 382, label, 28, "#ffffff", [0, 0.5]);
      const iw = 46;
      const span = iw + 6 + t.width;
      const im = this.add.image(cx - span / 2 + iw / 2, 382, icon);
      im.setScale(iw / Math.max(im.width, im.height));
      t.setX(cx - span / 2 + iw + 6);
      card.add([im, t]);
    });

    const unit = o.currency === "coins" ? "GOLD" : "GEMS";
    const short = o.price - profile[o.currency];
    const label = left <= 0 ? "SOLD OUT" : o.price === 0 ? "FREE" : `${fmt(o.price)} ${unit}`;
    const buy = button(this, 0, 446, w - 70, 80, label, o.price === 0 ? "green" : o.currency === "coins" ? "yellow" : "blue", this.tap(() => this.buyDeal(o)), 30);
    buy.setEnabled(left > 0 && short <= 0);
    card.add(buy);
    if (o.wasPrice > o.price && left > 0) {
      // The old price, struck through, tucked into the button's corner.
      const was = txt(this, w / 2 - 50, 418, fmt(o.wasPrice), 20, "#ffd0c8");
      const strike = this.add.graphics().lineStyle(3, SALE, 1).lineBetween(was.x - was.width / 2 - 3, 420, was.x + was.width / 2 + 3, 416);
      card.add([was, strike]);
    }
    if (left > 0 && short > 0) info.setText(`Need ${fmt(short)} more ${unit.toLowerCase()}`).setColor("#ff9a8a");
    return card;
  }

  private async buyDeal(o: OfferDef) {
    if (this.busy) return;
    this.busy = true;
    let loot: ChestLoot | null = null;
    const ok = await attempt(this, async () => {
      loot = await buyOffer(o.id);
    });
    this.busy = false;
    if (!ok) return this.fill();
    this.locked = true;
    rewardPopup(this, o.name.toUpperCase(), { reward: o.reward, loot }, () => this.scene.restart(), o.chests);
  }

  // ---------------------------------------------------------------- scrolling

  /** Soft shadows at the top and bottom edge of the shelves so items fade in and out of view. */
  private edgeShades() {
    const g = this.add.graphics();
    const dark = 0x140802;
    g.fillGradientStyle(dark, dark, dark, dark, 0.75, 0.75, 0, 0).fillRect(0, this.viewTop, W, 26);
    g.fillGradientStyle(dark, dark, dark, dark, 0, 0, 0.8, 0.8).fillRect(0, this.viewBottom - 40, W, 40);
    this.knob = this.add.graphics();
  }

  private drawKnob() {
    const k = this.knob;
    if (!k) return;
    k.clear();
    if (this.scrollMax <= 0) return;
    const x = W - 14;
    const span = this.viewBottom - this.viewTop - 40;
    const len = Math.max(80, (span * (this.viewBottom - this.viewTop)) / (this.scrollMax + this.viewBottom - this.viewTop));
    const y = this.viewTop + 20 + (span - len) * (this.scroll / this.scrollMax);
    k.fillStyle(0x000000, 0.35).fillRoundedRect(x - 4, this.viewTop + 20, 8, span, 4);
    k.fillStyle(BRASS, 0.9).fillRoundedRect(x - 5, y, 10, len, 5);
  }

  private scrolling() {
    const inView = (p: Phaser.Input.Pointer) => p.worldY >= this.viewTop && p.worldY <= this.viewBottom;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragged = false;
      if (this.locked || !inView(p)) return;
      this.drag = { y: p.worldY, scroll: this.scroll, last: p.worldY, v: 0 };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || !p.isDown) return;
      if (Math.abs(p.worldY - d.y) > 12) this.dragged = true;
      if (!this.dragged) return;
      d.v = d.last - p.worldY;
      d.last = p.worldY;
      // A little rubber-band past either end.
      const raw = d.scroll + (d.y - p.worldY);
      const over = raw < 0 ? raw : raw > this.scrollMax ? raw - this.scrollMax : 0;
      this.scroll = this.scrollTarget = raw - over * 0.65;
    });
    const release = () => {
      if (this.drag && this.dragged) this.scrollTarget = Phaser.Math.Clamp(this.scroll + this.drag.v * 14, 0, this.scrollMax);
      this.drag = null;
    };
    this.input.on("pointerup", release);
    this.input.on("pointerupoutside", release);
    this.input.on("wheel", (p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (this.locked || !inView(p)) return;
      this.scrollTarget = Phaser.Math.Clamp(this.scrollTarget + dy, 0, this.scrollMax);
    });
  }

  /** Wrap a shelf button's action so it ignores drags and taps on items scrolled out of view. */
  private tap(fn: () => void) {
    return () => {
      const p = this.input.activePointer;
      if (this.dragged || this.locked || p.worldY < this.viewTop || p.worldY > this.viewBottom) return;
      fn();
    };
  }

  update() {
    if (!this.content) return;
    if (!this.drag || !this.dragged) {
      this.scrollTarget = Phaser.Math.Clamp(this.scrollTarget, 0, this.scrollMax);
      this.scroll += (this.scrollTarget - this.scroll) * 0.18;
      if (Math.abs(this.scrollTarget - this.scroll) < 0.3) this.scroll = this.scrollTarget;
    }
    const y = this.viewTop - this.scroll;
    if (this.content.y !== y) {
      this.content.y = y;
      this.drawKnob();
    }
  }

  // ---------------------------------------------------------------- buying

  private async buy(c: ChestDef, n: number) {
    if (this.busy || profile[c.currency] < discounted(c.price, serverNow()) * n) return;
    this.busy = true;
    let loot: ChestLoot | null = null;
    const ok = await attempt(this, async () => {
      loot = await buyChest(c.id, n);
    });
    this.busy = false;
    if (!ok || !loot) return;
    const got: ChestLoot = loot;
    this.locked = true;

    const m = modal(this, 700, 1300, n > 1 ? `${n}x ${c.name}` : c.name);
    const { cx, cy } = m;
    // Several chests shake as a fanned-out pile, then burst open together.
    const shown = Math.min(n, 5);
    const size = n > 1 ? 200 : 300;
    const chestY = n > 1 ? cy - 390 : cy - 300;
    const chests = Array.from({ length: shown }, (_, i) => {
      const off = i - (shown - 1) / 2;
      const img = this.add.image(cx + off * 110, chestY + Math.abs(off) * 14, `item:${c.image}`).setDisplaySize(size, size);
      m.add(img);
      return img;
    });
    if (n > shown) m.add(txt(this, cx, chestY + size / 2 + 10, `x${n}`, 40));
    this.tweens.add({ targets: chests, angle: { from: -6, to: 6 }, yoyo: true, repeat: 4, duration: 80 });
    this.time.delayedCall(700, () => {
      sfx("chest");
      const key = animKey("vfx", "chest_open");
      if (this.anims.exists(key)) {
        for (const chest of chests) {
          const fx = this.add.sprite(chest.x, chest.y, key).setScale(sheetScale("vfx", size * 1.4));
          m.add(fx);
          fx.play(key);
        }
      }
      chests.forEach((chest) => chest.setVisible(false));
      this.showLoot(m, got, n > 1);
    });
  }

  private showLoot(m: ReturnType<typeof modal>, loot: ChestLoot, many: boolean) {
    const { cx, cy } = m;
    const coins = txt(this, cx, many ? cy - 220 : cy - 110, `+${fmt(loot.coins)} gold`, 40, "#ffd93b");
    m.add(coins);
    if (many) {
      // Combined haul: a denser grid, best rarities first; the rest is summarised.
      const max = 20;
      m.add(lootCards(this, cx, cy - 100, loot.cards, 96, 5, max));
      const rest = loot.cards.slice(max);
      if (rest.length) {
        const copies = rest.reduce((s, c) => s + c.copies, 0);
        m.add(txt(this, cx, cy + 490, `+${rest.length} more cards (${copies} copies)`, 28, "#c9d2ff"));
      }
    } else m.add(lootCards(this, cx, cy + 20, loot.cards));
    m.add(button(this, cx, cy + 580, 340, 100, "COLLECT", "green", () => this.scene.restart()));
  }
}

