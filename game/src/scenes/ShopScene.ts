import Phaser from "phaser";
import { animKey, ensureAnim, loadSheet, sheetScale } from "../assets";
import { CHESTS, buyChest, claimGift, giftReadyAt, profile, type ChestDef, type ChestLoot } from "../save";
import { ECONOMY } from "../../../shared/economy.ts";
import { W, WIDE, txt, button, iconButton, lootCards, modal, fmt, NAVY, attempt } from "../ui";
import { cover, topBar } from "./LobbyScene";
import { music, sfx } from "../audio";

export class ShopScene extends Phaser.Scene {
  constructor() {
    super("Shop");
  }

  preload() {
    loadSheet(this, "vfx", "chest_open");
    loadSheet(this, "vfx", "coin_burst");
  }

  create() {
    music("lobby");
    ensureAnim(this, "vfx", "chest_open", 24, 0);
    ensureAnim(this, "vfx", "coin_burst", 30, 0);
    cover(this, "loc:shop_background", 0.3, "shop_background");
    topBar(this);
    iconButton(this, 50, 130, "back", 76, () => this.scene.start("Lobby"));
    txt(this, W / 2, 130, "SHOP", 56, "#fff4c2");

    CHESTS.filter((c) => c.enabled).slice(0, 4).forEach((c, i) => {
      // One row of four on wide screens, a 2x2 grid on phones.
      const x = WIDE ? W / 2 + (i - 1.5) * 380 : i % 2 ? W * 0.74 : W * 0.26;
      const y = WIDE ? 480 : 380 + Math.floor(i / 2) * 530;
      this.chestTile(c, x, y);
    });
    this.giftTile(W / 2, WIDE ? 1080 : 1400);
  }

  /** Chosen quantity per chest; kept across restarts so buying again is one tap. */
  private static qty: Record<string, number> = {};

  private chestTile(c: ChestDef, x: number, y: number) {
    const g = this.add.graphics();
    g.fillStyle(NAVY, 0.8).fillRoundedRect(x - 165, y - 190, 330, 500, 30);
    g.lineStyle(6, 0xf2b630, 1).strokeRoundedRect(x - 165, y - 190, 330, 500, 30);
    const img = this.add.image(x, y - 40, `item:${c.image}`).setDisplaySize(230, 230);
    this.tweens.add({ targets: img, y: y - 50, yoyo: true, repeat: -1, duration: 1400 + Math.random() * 400, ease: "Sine.InOut" });
    txt(this, x, y + 100, c.name, 32);
    txt(this, x, y - 160, `${c.rolls} cards`, 24, "#c9d2ff");

    const unit = c.currency === "coins" ? "GOLD" : "GEMS";
    const most = Math.max(1, Math.min(ECONOMY.chestBulkMax, Math.floor(profile[c.currency] / c.price)));
    let n = Math.min(ShopScene.qty[c.id] ?? 1, most);
    const count = txt(this, x, y + 170, "", 40);
    const buy = button(this, x, y + 255, 270, 90, "", c.currency === "coins" ? "yellow" : "blue", () => this.buy(c, n), 32);
    const minus = button(this, x - 100, y + 170, 76, 70, "-", "grey", () => set(n - 1), 44);
    const plus = button(this, x + 100, y + 170, 76, 70, "+", "grey", () => set(n + 1), 44);
    const set = (v: number) => {
      n = Math.max(1, Math.min(most, v));
      ShopScene.qty[c.id] = n;
      count.setText(`x${n}`);
      buy.label.setText(`${fmt(c.price * n)} ${unit}`);
      buy.setEnabled(profile[c.currency] >= c.price * n);
      minus.setEnabled(n > 1);
      plus.setEnabled(n < most);
    };
    set(n);
  }

  private giftTile(x: number, y: number) {
    const readyAt = giftReadyAt(profile);
    const ready = Date.now() >= readyAt;
    const g = this.add.graphics();
    g.fillStyle(NAVY, 0.8).fillRoundedRect(x - 330, y - 90, 660, 180, 30);
    this.add.image(x - 230, y, "item:gift_box").setDisplaySize(150, 150);
    txt(this, x - 140, y - 40, "FREE GIFT", 38, "#fff4c2", [0, 0.5]);
    const mins = Math.ceil((readyAt - Date.now()) / 60000);
    const what = `${ECONOMY.giftCoins} gold + ${ECONOMY.giftGems} gems`;
    txt(this, x - 140, y + 20, ready ? what : `Ready in ${Math.floor(mins / 60)}h ${mins % 60}m`, 26, "#c9d2ff", [0, 0.5]);
    const claim = button(this, x + 220, y, 180, 90, "CLAIM", "green", () => {
      claim.setEnabled(false);
      attempt(this, claimGift).then((ok) => {
        if (ok) sfx("coin");
        this.scene.restart();
      });
    }).setEnabled(ready);
  }

  private busy = false;

  private async buy(c: ChestDef, n: number) {
    if (this.busy || profile[c.currency] < c.price * n) return;
    this.busy = true;
    let loot: ChestLoot | null = null;
    const ok = await attempt(this, async () => {
      loot = await buyChest(c.id, n);
    });
    this.busy = false;
    if (!ok || !loot) return;
    const got: ChestLoot = loot;

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
