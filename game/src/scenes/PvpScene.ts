/**
 * A PvP match (see PVP.md). Your board is a PvpBoard simulated here at a fixed step on the
 * match clock and drawn every frame. The opponent's board is drawn small (a second camera
 * looking at a copy placed far to the right of the world): from their snapshots online, or
 * straight from the bot's board in a bot match.
 */
import Phaser from "phaser";
import { BASE, animKey, assetIndex, ensureAnim, loadImages, loadSheet, sheetScale } from "../assets";
import { RES } from "../display";
import { music, sfx } from "../audio";
import { W, H, WIDE, ARENA_W, ARENA_H, NAVY, PORTRAIT_FIT, button, cardView, floatText, fmt, iconButton, modal, pressable, resourcePill, toast, txt } from "../ui";
import { loadMe } from "../save";
import { canAwaken } from "../battle/Unit";
import { rewardPopup } from "./daily";
import { MatchConn, finishBotMatch } from "../pvpnet";
import { ARENA_BY_ID, ARENAS, type ArenaDef } from "../../../shared/arenas.ts";
import { BOSS_BY_ID } from "../../../shared/monsters.ts";
import { ELEMENT_COLOR, MAX_RANK, UNIT_BY_ID, maxPowerUp, powerUpCost } from "../../../shared/units.ts";
import { HERO_BY_ID } from "../../../shared/heroes.ts";
import { ECONOMY } from "../../../shared/economy.ts";
import { LEAGUES } from "../../../shared/leagues.ts";
import { arenaPaths, slotPos, type Path, type Pt } from "../../../shared/path.ts";
import { PVP, matchModeName, type BoardSnap, type MatchResult, type MatchSetup, type SendDef, type ServerMsg } from "../../../shared/pvp.ts";
import { PvpBoard, SIM_DT } from "../../../shared/pvpsim.ts";
import { PvpBot, botSkill } from "../../../shared/pvpbot.ts";
import type { SimFx, SimMonster, SimShot, SimUnit } from "../../../shared/sim.ts";
import type { Promotion } from "../../../shared/profile.ts";

/** The opponent's board sits this far right in the world; only the small camera sees it. */
const OX = 6000;
const AUTO_CAST_KEY = "tower-rush-autocast";
const SNAP_MS = 250;

interface UnitView {
  u: SimUnit;
  sprite: Phaser.GameObjects.Sprite;
  pips: Phaser.GameObjects.Graphics;
  aura: Phaser.GameObjects.Graphics | null;
  fired: number;
  /** Gold ring and "+N%" badge while a neighbouring buff unit speeds this one up. */
  buff: { ring: Phaser.GameObjects.Graphics; badge: Phaser.GameObjects.Container } | null;
  haste: number;
  /** Board time of the last crit/execute callout, so rapid-fire units don't stack them. */
  calloutAt: number;
}

interface MonView {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  folder: "monsters" | "bosses";
  hp: number;
  walking: boolean;
}

interface OppMon {
  sprite: Phaser.GameObjects.Sprite;
  path: number;
  from: number;
  to: number;
  at: number;
}

interface SendButton {
  s: SendDef;
  root: Phaser.GameObjects.Container;
  shade: Phaser.GameObjects.Graphics;
  note: Phaser.GameObjects.Text;
  pips: Phaser.GameObjects.Graphics;
}

type Outcome = "win" | "loss" | "draw";

export class PvpScene extends Phaser.Scene {
  private setup!: MatchSetup;
  private you: 0 | 1 = 0;
  private conn: MatchConn | null = null;
  private early: ServerMsg[] = [];
  /** Server clock minus ours. */
  private offset = 0;

  private arena!: ArenaDef;
  private paths!: Path[];
  board!: PvpBoard;
  /** Bot matches only: the bot's board and its brain. */
  private opp: PvpBoard | null = null;
  private bot: PvpBot | null = null;
  private oppSnap: BoardSnap | null = null;
  private oppConnected = true;

  private units: (UnitView | null)[] = [];
  private mons = new Map<SimMonster, MonView>();
  private shotViews = new Map<SimShot, Phaser.GameObjects.Image>();
  private seenFx = new WeakSet<SimFx>();
  private oppUnits: ({ key: string; sprite: Phaser.GameObjects.Sprite; pips: Phaser.GameObjects.Graphics } | null)[] = [];
  private oppMons = new Map<number, OppMon>();
  private oppSnapAt = 0;

  private mini!: Phaser.Cameras.Scene2D.Camera;
  private versus: Phaser.GameObjects.Container | null = null;
  private dragging = -1;
  private highlights: Phaser.GameObjects.Image[] = [];

  // HUD
  private waveText!: Phaser.GameObjects.Text;
  private nextText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private incomeText!: Phaser.GameObjects.Text;
  private oppText!: Phaser.GameObjects.Text;
  private summonBtn!: Phaser.GameObjects.Container;
  private summonCost!: Phaser.GameObjects.Text;
  private deckCards: { id: string; root: Phaser.GameObjects.Container; cost: Phaser.GameObjects.Text; pips: Phaser.GameObjects.Graphics }[] = [];
  private sendBtns: SendButton[] = [];
  private sendBar!: Phaser.GameObjects.Container;
  private incomingBar!: Phaser.GameObjects.Container;
  private bossBar!: Phaser.GameObjects.Container;
  private bossFill!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.Text;
  private heroBtn: { pie: Phaser.GameObjects.Graphics; time: Phaser.GameObjects.Text; glow: Phaser.GameObjects.Graphics; r: number } | null = null;

  // Bookkeeping for sounds and banners.
  private seen = { wave: 0, hp: 0, kills: 0, heroCasts: 0, incoming: 0 };
  private lastSnap = 0;
  private hudAt = 0;
  private reported = false;
  private done = false;
  private logSent = false;

  constructor() {
    super("Pvp");
  }

  init(data: { setup: MatchSetup; you: 0 | 1; conn?: MatchConn; early?: ServerMsg[]; offset?: number }) {
    this.setup = data.setup;
    this.you = data.you;
    this.conn = data.conn ?? null;
    this.early = data.early ?? [];
    this.offset = data.offset ?? 0;
    this.arena = ARENA_BY_ID[this.setup.arena] ?? ARENAS[0];
    this.opp = this.bot = this.oppSnap = null;
    this.oppConnected = true;
    this.units = new Array(15).fill(null);
    this.oppUnits = new Array(15).fill(null);
    this.mons = new Map();
    this.shotViews = new Map();
    this.seenFx = new WeakSet();
    this.oppMons = new Map();
    this.deckCards = [];
    this.sendBtns = [];
    this.highlights = [];
    this.heroBtn = null;
    this.versus = null;
    this.dragging = -1;
    this.reported = this.done = this.logSent = false;
    this.lastSnap = this.hudAt = this.oppSnapAt = 0;
  }

  private get me() {
    return this.setup.players[this.you];
  }

  private get them() {
    return this.setup.players[1 - this.you];
  }

  /** Seconds since wave time 0 on the server's clock (negative during the versus screen). */
  private matchTime() {
    return (Date.now() + this.offset - this.setup.startAt) / 1000;
  }

  preload() {
    const a = this.arena;
    this.load.image(`loc:arena_${a.id}`, `${BASE}locations/arena_${a.id}.webp`);
    if (!this.textures.exists("loc:pvp_versus_background")) this.load.image("loc:pvp_versus_background", `${BASE}locations/pvp_versus_background.webp`);
    for (const p of this.setup.players) {
      for (const id of p.deck) for (const anim of ["idle", "attack", "skill"]) loadSheet(this, "units", `${id}_${anim}`);
      if (p.hero) for (const anim of ["idle", "skill"]) loadSheet(this, "heroes", `${p.hero}_${anim}`);
    }
    const monsters = new Set(a.monsters);
    for (const s of PVP.sends) if (s.monster !== "boss") monsters.add(s.monster);
    for (const b of a.bosses) if (BOSS_BY_ID[b]?.minion) monsters.add(BOSS_BY_ID[b].minion!);
    if (monsters.has("gelatinous_cube")) monsters.add("slime_blob");
    for (const id of monsters) for (const anim of ["walk", "death"]) loadSheet(this, "monsters", `${id}_${anim}`);
    for (const id of a.bosses) for (const anim of ["walk", "death", "intro"]) loadSheet(this, "bosses", `${id}_${anim}`);
    for (const name of assetIndex().anims.vfx) loadSheet(this, "vfx", name);
    loadImages(this, "mon", "monsters", [...monsters]);
    loadImages(this, "bossimg", "bosses", a.bosses);
    loadImages(this, "emote", "emotes", assetIndex().emotes ?? []);
  }

  create() {
    this.children.removeAll(true);
    this.input.removeAllListeners();
    this.cameras.resetAll();
    this.cameras.main.setOrigin(0).setZoom(RES);
    // The opponent's camera sees nothing but what theirs() lets in.
    const r = this.miniRect();
    this.mini = this.cameras.add(r.x * RES, r.y * RES, r.w * RES, r.h * RES).setZoom((r.w / ARENA_W) * RES);
    this.mini.centerOn(OX + ARENA_W / 2, ARENA_H / 2).setBackgroundColor(0x0d1030);
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, (o: Phaser.GameObjects.GameObject) => this.mini.ignore(o));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE));
    this.makeAnims();
    music("battle");

    const a = this.arena;
    this.paths = arenaPaths(a);
    const seed = this.setup.seed;
    this.board = new PvpBoard({ seed, side: this.you, arena: a.id, loadout: this.me, awakens: canAwaken });
    this.board.apply({ t: "autohero", on: loadAutoCast() });
    if (!this.conn) {
      // Bot match: the bot plays its own board right here.
      this.opp = new PvpBoard({ seed, side: (1 - this.you) as 0 | 1, arena: a.id, loadout: this.them });
      this.bot = new PvpBot(this.opp, botSkill(this.me.trophies), seed + 7, (id) => this.receive(id));
    }
    this.seen.hp = this.board.hp;

    this.add.image(0, 0, `loc:arena_${a.id}`).setOrigin(0).setDisplaySize(ARENA_W, ARENA_H);
    this.theirs(this.add.image(OX, 0, `loc:arena_${a.id}`).setOrigin(0).setDisplaySize(ARENA_W, ARENA_H));
    this.cameras.main.setScroll(WIDE ? -(W - ARENA_W) / 2 : 0, 0);
    this.buildHud();
    this.miniFrame();
    this.setupDrag();
    this.input.keyboard?.on("keydown-SPACE", () => this.summon());
    this.input.keyboard?.on("keydown-H", () => this.castHero());
    this.showVersus();

    if (this.conn) {
      this.conn.on = (m) => this.onServer(m);
      this.conn.onStatus = (on) => !on && !this.done && toast(this, "Reconnecting...");
      for (const m of this.early.splice(0)) this.onServer(m);
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.conn?.close());
  }

  private makeAnims() {
    const idx = assetIndex();
    for (const folder of ["units", "monsters", "bosses", "vfx", "heroes"]) {
      for (const name of idx.anims[folder] ?? []) {
        const loop = name.endsWith("_idle") || name.endsWith("_walk");
        ensureAnim(this, folder, name, folder === "vfx" ? 30 : loop ? 14 : 24, loop ? -1 : 0);
      }
    }
  }

  /** HUD objects stay put while the battle camera scrolls. */
  private hud<T extends Phaser.GameObjects.GameObject & { setScrollFactor(x: number): T }>(o: T): T {
    pin(o);
    return o;
  }

  /** The small camera showing the opponent's board. */
  private miniRect() {
    if (WIDE) {
      const ox = (W - ARENA_W) / 2;
      const w = Math.min(ox - 90, 300);
      return { x: ox / 2 - w / 2, y: 120, w, h: (w * ARENA_H) / ARENA_W };
    }
    const w = 158;
    return { x: ARENA_W - w - 10, y: 76, w, h: (w * ARENA_H) / ARENA_W };
  }

  /** Frame and caption around the opponent's board. */
  private miniFrame() {
    const r = this.miniRect();
    const g = this.hud(this.add.graphics().setDepth(3000));
    g.lineStyle(6, 0xf2b630, 1).strokeRoundedRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 10);
    g.lineStyle(3, NAVY, 1).strokeRoundedRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 12);
    this.oppText = this.hud(txt(this, r.x + r.w / 2, r.y + r.h + (WIDE ? 34 : 24), "", WIDE ? 28 : 20, "#ffd27a").setDepth(3001));
    if (WIDE) this.hud(txt(this, r.x + r.w / 2, r.y - 40, this.them.name, 32, "#fff4c2").setDepth(3001));
  }

  /** The opponent's board objects are only for the little camera (everything else is kept out of it on creation). */
  private theirs<T extends Phaser.GameObjects.GameObject>(o: T): T {
    o.cameraFilter = this.cameras.main.id;
    return o;
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    const ox = (W - ARENA_W) / 2;
    const L = ox / 2;
    const R = W - ox / 2;
    if (WIDE) {
      const back = this.hud(this.add.image(W / 2, H / 2, `loc:arena_${this.arena.id}`).setDepth(-10));
      back.setScale(Math.max(W / back.width, H / back.height)).setTint(0x5a5f8a);
      const g = this.hud(this.add.graphics().setDepth(2990));
      g.fillStyle(0x10133a, 0.72).fillRect(0, 0, ox, H).fillRect(W - ox, 0, ox, H);
      g.fillStyle(0xf2b630, 1).fillRect(ox - 6, 0, 6, H).fillRect(W - ox, 0, 6, H);
      this.hud(txt(this, R, 70, `${matchModeName(this.setup).toUpperCase()} PVP`, 36, "#ffd27a").setDepth(3000));
    } else {
      const g = this.hud(this.add.graphics().setDepth(3000));
      g.fillGradientStyle(0x232a63, 0x232a63, 0x10133a, 0x10133a, 1).fillRect(0, ARENA_H, W, H - ARENA_H);
      g.fillStyle(0xf2b630, 1).fillRect(0, ARENA_H, W, 6);
    }

    // Wave, time to the next one, and my HP.
    const r = this.miniRect();
    this.waveText = this.hud(WIDE ? txt(this, L, r.y + r.h + 110, "", 64).setDepth(3000) : txt(this, 20, 34, "", 34, "#ffffff", [0, 0.5]).setDepth(3000));
    this.nextText = this.hud(WIDE ? txt(this, L, r.y + r.h + 162, "", 26, "#c9d2ff").setDepth(3000) : txt(this, 20, 70, "", 20, "#c9d2ff", [0, 0.5]).setDepth(3000));
    const hpPill = this.hud(resourcePill(this, WIDE ? L : 300, WIDE ? r.y + r.h + 230 : 36, "item:heart_life", "20", WIDE ? 200 : 150).setDepth(3010));
    this.hpText = hpPill.text;

    // Power-ups: deck cards under the arena, or a 3+2 grid on the right.
    this.me.deck.forEach((id, i) => {
      const [x, y] = WIDE ? [R + (i < 3 ? i - 1 : i - 3.5) * 150, i < 3 ? 190 : 350] : [76 + i * 150, ARENA_H + 66];
      const def = UNIT_BY_ID[id];
      const frame = this.add.image(0, 0, `card:frame_${def.rarity}`).setDisplaySize(104, 104);
      const portrait = this.add.image(0, 0, `portrait:${id}`).setDisplaySize(104 * PORTRAIT_FIT, 104 * PORTRAIT_FIT);
      const pips = this.add.graphics();
      const costBg = this.add.graphics().fillStyle(NAVY, 0.9).fillRoundedRect(-50, 52, 100, 32, 16);
      const orb = this.add.image(-34, 68, "item:mana_orb").setDisplaySize(32, 32);
      const cost = txt(this, 10, 67, "", 22);
      const lvl = txt(this, 36, -36, `L${this.me.levels[id] ?? 1}`, 18, "#fff4c2");
      const root = this.hud(this.add.container(x, y, [frame, portrait, pips, costBg, orb, cost, lvl]).setDepth(3010));
      root.setSize(104, 136).setScale(WIDE ? 1.15 : 1);
      pressable(root, () => this.powerUp(id));
      this.deckCards.push({ id, root, cost, pips });
    });

    // Mana and income.
    const heroRow = !WIDE && !!this.me.hero;
    const mana = this.hud(resourcePill(this, WIDE ? L : heroRow ? 104 : 120, WIDE ? H - 150 : H - 76, "item:mana_orb", "0", heroRow ? 168 : 190).setDepth(3010));
    if (WIDE) mana.setScale(1.4);
    this.manaText = mana.text.setFontSize(30);
    this.incomeText = this.hud(txt(this, WIDE ? L : heroRow ? 112 : 128, WIDE ? H - 92 : H - 34, "", WIDE ? 24 : 18, "#7fd8ff").setDepth(3010));

    // Summon.
    const sb = this.add.image(0, 0, "ui:summon_button").setDisplaySize(124, 124);
    const costBg = this.add.graphics().fillStyle(NAVY, 0.95).fillRoundedRect(-42, 40, 84, 30, 15);
    this.summonCost = txt(this, 0, 54, "", 24);
    this.summonBtn = this.hud(this.add.container(WIDE ? R : heroRow ? 410 : 330, WIDE ? 1000 : H - 76, [sb, costBg, this.summonCost]).setDepth(3010));
    this.summonBtn.setSize(124, 124).setScale(WIDE ? 1.5 : 1);
    pressable(this.summonBtn, () => this.summon());

    // Show/hide the sends bar (phone), surrender menu, emotes.
    if (!WIDE) {
      const t = this.hud(this.add.container(560, H - 76).setDepth(3010));
      const bg = this.add.graphics().fillStyle(0xb8323a, 1).fillRoundedRect(-62, -44, 124, 88, 22).lineStyle(4, NAVY, 1).strokeRoundedRect(-62, -44, 124, 88, 22);
      t.add([bg, txt(this, 0, -2, "SEND", 32, "#ffffff")]);
      t.setSize(124, 88);
      pressable(t, () => this.sendBar.setVisible(!this.sendBar.visible));
    }
    this.hud(iconButton(this, WIDE ? R + 180 : 690, WIDE ? 1000 : H - 76, "pause", WIDE ? 96 : 72, () => this.menu()).setDepth(3010));
    const emote = this.hud(this.add.image(WIDE ? R - 180 : W - 50, WIDE ? 1000 : ARENA_H - 190, "emote:goblin_laugh").setDepth(3010));
    emote.setScale((WIDE ? 96 : 64) / Math.max(1, emote.width));
    pressable(emote, () => this.emotePicker());
    if (this.me.hero) this.buildHeroButton(WIDE ? L : 250, WIDE ? H - 330 : H - 76);

    this.buildSendBar(R);
    this.incomingBar = this.hud(this.add.container(WIDE ? W / 2 : ARENA_W / 2 - 60, 120).setDepth(3020));

    // Boss bar.
    const bg = this.add.graphics().fillStyle(NAVY, 0.9).fillRoundedRect(-230, -18, 460, 36, 18);
    this.bossFill = this.add.graphics();
    this.bossName = txt(this, 0, -36, "", WIDE ? 30 : 24, "#ffb0b0");
    this.bossBar = this.hud(this.add.container(WIDE ? W / 2 : ARENA_W / 2 - 60, WIDE ? 60 : 200, [bg, this.bossFill, this.bossName]).setDepth(3000).setVisible(false));
    if (!WIDE) this.bossBar.setScale(0.8);
  }

  private buildHeroButton(x: number, y: number) {
    const h = HERO_BY_ID[this.me.hero!];
    if (!h) return;
    const size = WIDE ? 132 : 96;
    const r = size * 0.42;
    const glow = this.add.graphics().fillStyle(0xffd93b, 0.55).fillCircle(0, 0, size * 0.62);
    const frame = this.add.image(0, 0, "card:frame_legendary").setDisplaySize(size, size);
    const portrait = this.add.image(0, 0, `hero_portrait:${h.id}`).setDisplaySize(size * PORTRAIT_FIT, size * PORTRAIT_FIT);
    const pie = this.add.graphics();
    const time = txt(this, 0, 0, "", Math.round(size * 0.34));
    const root = this.hud(this.add.container(x, y, [glow, frame, portrait, pie, time]).setDepth(3010));
    root.setSize(size, size);
    pressable(root, () => this.castHero());
    this.heroBtn = { pie, time, glow, r };
    // Auto-cast switch underneath.
    const label = txt(this, 0, 0, "", WIDE ? 22 : 16);
    const sw = this.hud(this.add.container(x, y + size * 0.5 + (WIDE ? 26 : 8), [label]).setDepth(3020));
    const draw = () => label.setText(this.board.autoHero ? "AUTO ON" : "AUTO OFF").setColor(this.board.autoHero ? "#7dff7a" : "#c9d2ff");
    draw();
    sw.setSize(110, 34);
    pressable(sw, () => {
      const on = !this.board.autoHero;
      this.board.apply({ t: "autohero", on });
      saveAutoCast(on);
      draw();
    });
  }

  /** One button per send: icon, cost, income, charges; dimmed when locked or recharging. */
  private buildSendBar(R: number) {
    const sends = PVP.sends.filter((s) => s.enabled);
    const n = sends.length;
    const size = WIDE ? 104 : Math.min(100, (ARENA_W - 16) / n - 4);
    const gap = size + (WIDE ? 14 : 4);
    this.sendBar = this.hud(this.add.container(WIDE ? R : ARENA_W / 2, WIDE ? 560 : ARENA_H - 74).setDepth(3015));
    if (WIDE) this.sendBar.add(txt(this, 0, -96, "SEND TO OPPONENT", 28, "#ff9a9a"));
    else this.sendBar.add(this.add.graphics().fillStyle(0x000000, 0.55).fillRoundedRect(-ARENA_W / 2 + 4, -size / 2 - 22, ARENA_W - 8, size + 44, 18));
    sends.forEach((s, i) => {
      const perRow = WIDE ? 4 : n;
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - row * perRow);
      const x = (i % perRow - (inRow - 1) / 2) * gap;
      const y = row * (size + 56);
      const bg = this.add.graphics().fillStyle(0x3a1430, 0.95).fillRoundedRect(-size / 2, -size / 2, size, size, 14).lineStyle(3, 0xff6b6b, 1).strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
      const key = s.monster === "boss" ? `bossimg:${this.arena.bosses[0]}` : `mon:${s.monster}`;
      const icon = this.add.image(0, -8, this.textures.exists(key) ? key : "item:skull");
      icon.setScale((size * 0.72) / Math.max(1, icon.width, icon.height));
      const count = txt(this, size / 2 - 6, -size / 2 + 12, s.count > 1 ? `x${s.count}` : "", 18, "#ffffff", [1, 0.5]);
      const cost = txt(this, 0, size / 2 - 12, fmt(s.cost), 20, "#7fd8ff");
      const income = txt(this, -size / 2 + 6, -size / 2 + 12, s.income ? `+${s.income}` : "", 16, "#7dff7a", [0, 0.5]);
      const pips = this.add.graphics();
      const shade = this.add.graphics();
      const note = txt(this, 0, -6, "", 22, "#ffffff");
      const root = this.add.container(x, y, [bg, icon, count, income, cost, pips, shade, note]);
      root.setSize(size, size);
      pressable(root, () => this.doSend(s));
      this.sendBar.add(root);
      this.sendBtns.push({ s, root, shade, note, pips });
    });
  }

  private refreshHud() {
    const b = this.board;
    const now = b.now;
    const next = Math.max(0, b.nextWaveAt - now);
    this.waveText.setText(b.wave ? `WAVE ${b.wave}` : "GET READY");
    this.nextText.setText(b.wave >= PVP.rules.maxWave ? "Last wave!" : `${b.suddenDeath ? "SUDDEN DEATH · " : ""}next wave in ${Math.ceil(next)}s`);
    this.nextText.setColor(b.suddenDeath ? "#ff8080" : "#c9d2ff");
    this.hpText.setText(String(b.hp));
    this.manaText.setText(fmt(Math.floor(b.mana)));
    this.incomeText.setText(`+${b.income} / ${PVP.rules.incomeEvery}s`);
    this.summonCost.setText(fmt(b.summonCost));
    this.summonBtn.setAlpha(b.mana >= b.summonCost && b.units.includes(null) ? 1 : 0.6);
    for (const c of this.deckCards) {
      const lvl = b.powerUps[c.id];
      const cost = powerUpCost(lvl);
      c.cost.setText(lvl >= maxPowerUp() ? "MAX" : fmt(cost));
      c.root.setAlpha(lvl < maxPowerUp() && b.mana >= cost ? 1 : 0.65);
      c.pips.clear();
      for (let i = 0; i < maxPowerUp(); i++) {
        c.pips.fillStyle(NAVY, 1).fillCircle(-36 + i * 18, -46, 7);
        c.pips.fillStyle(i < lvl ? 0xffd93b : 0x3b4270, 1).fillCircle(-36 + i * 18, -46, 5);
      }
    }
    for (const sb of this.sendBtns) {
      const s = sb.s;
      const locked = b.wave < s.unlockWave;
      const charges = b.stock.charges(s, now);
      const wait = b.stock.wait(s, now);
      const size = sb.root.width;
      sb.shade.clear();
      sb.note.setText(locked ? `W${s.unlockWave}` : charges <= 0 ? String(Math.ceil(wait)) : "");
      if (locked || charges <= 0) sb.shade.fillStyle(0x000000, 0.6).fillRoundedRect(-size / 2, -size / 2, size, size, 14);
      else if (b.mana < s.cost) sb.shade.fillStyle(0x000000, 0.35).fillRoundedRect(-size / 2, -size / 2, size, size, 14);
      sb.pips.clear();
      if (!locked && s.cooldown > 0 && s.stock > 1) for (let i = 0; i < s.stock; i++) sb.pips.fillStyle(i < charges ? 0xffd93b : 0x3b4270, 1).fillCircle((i - (s.stock - 1) / 2) * 12, -size / 2 - 8, 5);
    }
    // Opponent line under their board.
    const o = this.oppSnap;
    const name = WIDE ? "" : `${this.them.name}  `;
    this.oppText.setText(o ? `${name}♥ ${o.hp}  ·  W${o.wave}${this.oppConnected ? "" : "  (offline)"}` : name);
    this.refreshHero();
    this.refreshIncoming();
    const boss = b.boss && !b.boss.gone ? b.boss : null;
    this.bossBar.setVisible(!!boss);
    if (boss) {
      this.bossName.setText(boss.boss!.name);
      this.bossFill.clear().fillStyle(0xe53935, 1).fillRoundedRect(-224, -12, Math.max(12, 448 * Math.max(0, boss.hp / boss.maxHp)), 24, 12);
    }
  }

  private refreshHero() {
    const h = this.heroBtn;
    const def = this.me.hero ? HERO_BY_ID[this.me.hero] : null;
    if (!h || !def) return;
    const left = this.board.heroLeft;
    h.pie.clear();
    h.glow.setVisible(left <= 0);
    if (left > 0) {
      const frac = Math.min(1, left / def.cooldown);
      const start = -Math.PI / 2 + (1 - frac) * Math.PI * 2;
      h.pie.fillStyle(0x000000, 0.62).slice(0, 0, h.r, start, Math.PI * 1.5, false).fillPath();
      h.time.setText(String(Math.ceil(left)));
    } else h.time.setText("");
  }

  /** Sends on their way to me: icons with a countdown at the top of the arena. */
  private refreshIncoming() {
    const list = this.board.incoming;
    if (list.length !== this.seen.incoming) {
      this.incomingBar.removeAll(true);
      if (list.length) {
        const w = 120 + list.length * 70;
        this.incomingBar.add(this.add.graphics().fillStyle(0x7a1020, 0.9).fillRoundedRect(-w / 2, -40, w, 80, 24).lineStyle(4, 0xffd93b, 1).strokeRoundedRect(-w / 2, -40, w, 80, 24));
        this.incomingBar.add(txt(this, -w / 2 + 64, 0, "INCOMING", 22, "#ffd93b"));
        list.forEach((inc, i) => {
          const key = inc.send.monster === "boss" ? `bossimg:${this.arena.bosses[0]}` : `mon:${inc.send.monster}`;
          const img = this.add.image(-w / 2 + 150 + i * 70, -6, this.textures.exists(key) ? key : "item:skull");
          img.setScale(54 / Math.max(1, img.width, img.height));
          this.incomingBar.add([img, txt(this, img.x, 24, "", 18, "#ffffff").setName(`t${i}`)]);
        });
        this.tweens.add({ targets: this.incomingBar, scale: { from: 1.25, to: 1 }, duration: 250, ease: "Back.Out" });
      }
      this.seen.incoming = list.length;
    }
    list.forEach((inc, i) => (this.incomingBar.getByName(`t${i}`) as Phaser.GameObjects.Text | null)?.setText(`${Math.max(0, Math.ceil(inc.at - this.board.now))}s`));
  }

  // ---------------------------------------------------------------- versus screen

  private showVersus() {
    const c = this.hud(this.add.container(0, 0).setDepth(5000));
    const bg = this.add.image(W / 2, H / 2, "loc:pvp_versus_background");
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    c.add([bg, this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.35)]);
    c.add(txt(this, W / 2, WIDE ? 90 : 120, matchModeName(this.setup).toUpperCase(), 48, "#ffd27a"));
    const side = (p: (typeof this.setup.players)[number], y: number, x: number, label: string) => {
      c.add(txt(this, x, y - 140, label, 26, "#c9d2ff"));
      c.add(txt(this, x, y - 96, p.name, 52, "#fff4c2"));
      c.add(this.add.image(x - 70, y - 40, "item:trophy").setDisplaySize(46, 46));
      c.add(txt(this, x - 40, y - 40, String(p.trophies), 32, "#ffd93b", [0, 0.5]));
      const gap = WIDE ? 120 : 132;
      p.deck.forEach((id, i) => c.add(cardView(this, x + (i - 2) * gap, y + 60, WIDE ? 104 : 116, id, { level: p.levels[id] })));
      if (p.hero && this.textures.exists(`hero_portrait:${p.hero}`)) {
        const hx = WIDE ? x : x + (y < H / 2 ? 280 : -280);
        c.add(this.add.image(hx, y + (WIDE ? 200 : -96), `hero_portrait:${p.hero}`).setDisplaySize(96, 96));
      }
    };
    if (WIDE) {
      side(this.me, H / 2, W * 0.27, "YOU");
      side(this.them, H / 2, W * 0.73, "OPPONENT");
    } else {
      side(this.me, H * 0.74, W / 2, "YOU");
      side(this.them, H * 0.3, W / 2, "OPPONENT");
    }
    const vs = txt(this, W / 2, H / 2, "VS", 140, "#ff6b6b");
    const count = txt(this, W / 2, WIDE ? H - 120 : H / 2 + 110, "", 44, "#ffffff");
    c.add([vs, count]);
    this.tweens.add({ targets: vs, scale: { from: 0.9, to: 1.1 }, yoyo: true, repeat: -1, duration: 500 });
    c.setData("count", count);
    this.versus = c;
    // The opponent's camera draws over everything, so it waits for the match to start.
    this.mini.setVisible(false);
  }

  // ---------------------------------------------------------------- loop

  update(_t: number, delta: number) {
    const t = this.matchTime();
    if (this.versus) {
      if (t < 0) {
        (this.versus.getData("count") as Phaser.GameObjects.Text).setText(`Starting in ${Math.ceil(-t)}`);
        return;
      }
      const v = this.versus;
      this.versus = null;
      this.tweens.add({ targets: v, alpha: 0, duration: 300, onComplete: () => v.destroy() });
      this.mini.setVisible(true);
      sfx("wave");
    }
    const b = this.board;
    const opp = this.opp;
    if (!this.done) {
      // Catch up with the match clock (a lot at once if the tab was in the background).
      let n = 0;
      while ((b.ticks + 1) * SIM_DT <= t && n++ < 900 && !b.over && !opp?.over) {
        this.bot?.think();
        b.tick();
        opp?.tick();
      }
      if (opp) this.oppSnap = opp.snap();
      if (this.conn && Date.now() - this.lastSnap >= SNAP_MS) {
        this.lastSnap = Date.now();
        this.conn.send({ t: "snap", s: b.snap() });
      }
      this.checkEnd();
    }
    const frac = Math.max(0, Math.min(1, (t - b.ticks * SIM_DT) / SIM_DT));
    this.drawUnits();
    this.drawMonsters(this.done ? 0 : frac);
    this.drawShots();
    this.drawFx();
    this.drawOpponent();
    this.feedback();
    this.hudAt -= delta;
    if (this.hudAt <= 0) {
      this.hudAt = 100;
      this.refreshHud();
    }
  }

  /** Sounds and banners for things that happened since the last frame. */
  private feedback() {
    const b = this.board;
    if (b.wave !== this.seen.wave) {
      this.seen.wave = b.wave;
      const boss = b.wave % ECONOMY.bossEvery === 0;
      sfx(boss ? "boss" : "wave");
      const banner = txt(this, ARENA_W / 2, 560, boss ? `BOSS WAVE ${b.wave}` : `WAVE ${b.wave}`, 64, boss ? "#ff8080" : "#fff4c2").setDepth(2800);
      if (b.wave === PVP.rules.suddenDeathWave) banner.setText("SUDDEN DEATH!").setColor("#ff6b6b");
      this.tweens.add({ targets: banner, alpha: 0, y: 500, delay: 900, duration: 400, onComplete: () => banner.destroy() });
    }
    if (b.hp < this.seen.hp) {
      const lost = this.seen.hp - b.hp;
      sfx("hurt");
      this.cameras.main.shake(180, 0.006);
      floatText(this, ARENA_W / 2, ARENA_H - 220, `-${lost} HP`, "#ff6b6b", 40);
    }
    this.seen.hp = b.hp;
    if (b.kills > this.seen.kills) {
      this.seen.kills = b.kills;
      sfx("die");
    }
  }

  // ---------------------------------------------------------------- drawing my board

  private drawUnits() {
    const b = this.board;
    for (let slot = 0; slot < 15; slot++) {
      const u = b.units[slot];
      let v = this.units[slot];
      if (v && v.u !== u) {
        v.sprite.destroy();
        v.pips.destroy();
        v.aura?.destroy();
        this.clearBuff(v);
        v = this.units[slot] = null;
      }
      if (!u) continue;
      if (!v) v = this.units[slot] = this.unitView(u);
      this.showBuff(v, slot !== this.dragging);
      if (slot === this.dragging) continue;
      if (u.firedAt !== v.fired) {
        v.fired = u.firedAt;
        this.playOnce(v, "attack");
      }
      v.sprite.setTint(b.now < u.frozenUntil ? 0x7fd8ff : 0xffffff);
    }
  }

  private unitView(u: SimUnit): UnitView {
    const p = slotPos(this.arena, u.slot);
    const awakenedArt = u.awakened && this.anims.exists(animKey("units_awakened", `${u.def.id}_idle`));
    const folder = awakenedArt ? "units_awakened" : "units";
    const px = u.awakened ? 132 : 116;
    let aura: Phaser.GameObjects.Graphics | null = null;
    if (u.awakened) {
      aura = this.add.graphics().fillStyle(0xffd93b, 0.28).fillEllipse(0, 0, 112, 46).setPosition(p.x, p.y + 30).setDepth(99 + p.y);
      this.tweens.add({ targets: aura, scale: { from: 0.85, to: 1.12 }, yoyo: true, repeat: -1, duration: 700 });
    }
    const sprite = this.add.sprite(p.x, p.y, animKey(folder, `${u.def.id}_idle`));
    sprite.setOrigin(0.5, 0.62).setDepth(100 + p.y);
    const scale = sheetScale(folder, px);
    if (this.anims.exists(animKey(folder, `${u.def.id}_idle`))) sprite.play(animKey(folder, `${u.def.id}_idle`));
    sprite.setScale(0);
    this.tweens.add({ targets: sprite, scale, duration: 260, ease: "Back.Out" });
    sprite.setInteractive({ draggable: true, useHandCursor: true });
    sprite.setData("slot", u.slot).setData("scale", scale).setData("folder", folder);
    const pips = this.add.graphics().setDepth(150 + p.y);
    const gap = 11;
    for (let i = 0; i < u.rank; i++) {
      const x = p.x - ((u.rank - 1) * gap) / 2 + i * gap;
      pips.fillStyle(NAVY, 1).fillCircle(x, p.y + 40, 6.5);
      pips.fillStyle(u.rank === MAX_RANK ? 0xffd93b : ELEMENT_COLOR[u.def.element], 1).fillCircle(x, p.y + 40, 4.5);
    }
    this.vfx("summon_circle", p.x, p.y + 20, u.awakened ? 200 : 130, 90);
    sfx(u.rank > 1 ? (u.awakened ? "awaken" : "merge") : "summon");
    return { u, sprite, pips, aura, fired: u.firedAt, buff: null, haste: 0, calloutAt: -1 };
  }

  /** The buffed marker (same look as solo battles): follows the unit's haste, hidden while it's dragged. */
  private showBuff(v: UnitView, visible: boolean) {
    const haste = v.u.haste;
    if (haste !== v.haste) {
      v.haste = haste;
      if (haste <= 0) this.clearBuff(v);
      else {
        const p = slotPos(this.arena, v.u.slot);
        if (!v.buff) {
          const ring = this.add.graphics().setPosition(p.x, p.y + 32).setDepth(98 + p.y);
          ring.lineStyle(4, 0xffd93b, 0.85).strokeEllipse(0, 0, 96, 36).fillStyle(0xffd93b, 0.12).fillEllipse(0, 0, 96, 36);
          this.tweens.add({ targets: ring, alpha: { from: 1, to: 0.45 }, yoyo: true, repeat: -1, duration: 650, ease: "Sine.InOut" });
          const bg = this.add.graphics();
          const icon = this.add.image(-20, 0, "stat:attack_speed").setDisplaySize(26, 26);
          const text = txt(this, -6, 0, "", 18, "#ffd93b", [0, 0.5]);
          v.buff = { ring, badge: this.add.container(p.x + 36, p.y - 44, [bg, icon, text]).setDepth(160 + p.y) };
        }
        const [bg, , text] = v.buff.badge.list as [Phaser.GameObjects.Graphics, Phaser.GameObjects.Image, Phaser.GameObjects.Text];
        text.setText(`+${Math.round(haste * 100)}%`);
        const w = 26 + text.width + 10;
        bg.clear().fillStyle(NAVY, 0.92).fillRoundedRect(-36, -16, w, 32, 16).lineStyle(2, 0xffd93b, 1).strokeRoundedRect(-36, -16, w, 32, 16);
        v.buff.badge.setScale(1.4);
        this.tweens.add({ targets: v.buff.badge, scale: 1, duration: 260, ease: "Back.Out" });
      }
    }
    v.buff?.ring.setVisible(visible);
    v.buff?.badge.setVisible(visible);
  }

  private clearBuff(v: UnitView) {
    v.buff?.ring.destroy();
    v.buff?.badge.destroy();
    v.buff = null;
  }

  /** Pops a label over the unit that landed a big hit (crit, execute). */
  private callout(slot: number, text: string, color: string) {
    const v = this.units[slot];
    if (!v || slot === this.dragging || this.board.now - v.calloutAt < 0.35) return;
    v.calloutAt = this.board.now;
    const { x, y } = slotPos(this.arena, slot);
    const burst = this.add.graphics().setPosition(x, y - 10).setDepth(99 + y);
    burst.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 0.5).fillCircle(0, 0, 52).setScale(0.4);
    this.tweens.add({ targets: burst, scale: 1.3, alpha: 0, duration: 320, ease: "Cubic.Out", onComplete: () => burst.destroy() });
    const t = txt(this, x, y - 78, text, 26, color).setDepth(600).setScale(0.3);
    this.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1.15, duration: 140, ease: "Back.Out" },
        { scale: 1, duration: 80 },
        { y: y - 112, alpha: 0, delay: 260, duration: 420, ease: "Cubic.In" },
      ],
      onComplete: () => t.destroy(),
    });
  }

  private playOnce(v: UnitView, anim: "attack" | "skill") {
    const folder = v.sprite.getData("folder") as string;
    const key = animKey(folder, `${v.u.def.id}_${anim}`);
    if (!this.anims.exists(key)) return;
    if (v.sprite.anims.currentAnim?.key === key && v.sprite.anims.isPlaying) return;
    v.sprite.play(key);
    v.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => v.sprite.active && v.sprite.play(animKey(folder, `${v.u.def.id}_idle`)));
  }

  private drawMonsters(frac: number) {
    const b = this.board;
    const live = new Set<SimMonster>();
    for (const m of b.monsters) {
      if (m.gone) continue;
      live.add(m);
      let v = this.mons.get(m);
      if (!v) {
        v = this.monView(m);
        this.mons.set(m, v);
      }
      const moving = m.intro <= 0 && m.pinned === null;
      if (!v.walking && m.intro <= 0) {
        v.walking = true;
        const walk = animKey(v.folder, `${m.id}_walk`);
        if (this.anims.exists(walk)) v.sprite.play({ key: walk, startFrame: m.uid % 16 });
      }
      const d = moving ? Math.min(m.path.length, m.dist + m.speed(b.now) * frac * SIM_DT) : m.dist;
      const p = m.path.at(d);
      v.sprite.setPosition(p.x, p.y).setDepth(100 + p.y);
      v.sprite.anims.timeScale = b.now < m.frozenUntil || b.now < m.stunUntil ? 0 : 1;
      const tint = b.now < m.frozenUntil ? 0x7fd8ff : b.now < m.shieldUntil ? 0x9fb4ff : m.poison.length ? 0xc89bff : b.now < m.slowUntil ? 0xb8e8ff : 0xffffff;
      v.sprite.setTint(tint);
      const hp = Math.max(0, Math.ceil(m.hp));
      if (hp !== v.hp) {
        v.hp = hp;
        v.label.setText(fmt(hp));
      }
      v.label.setPosition(p.x, p.y - m.size * 0.82).setDepth(1500 + p.y);
    }
    for (const [m, v] of this.mons) {
      if (live.has(m)) continue;
      this.mons.delete(m);
      v.label.destroy();
      const death = animKey(v.folder, `${m.id}_death`);
      if (!m.leaked && this.anims.exists(death)) {
        v.sprite.clearTint().play(death);
        v.sprite.anims.timeScale = 1;
        v.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => v.sprite.destroy());
      } else this.tweens.add({ targets: v.sprite, alpha: 0, duration: 220, onComplete: () => v.sprite.destroy() });
    }
  }

  private monView(m: SimMonster): MonView {
    const folder = m.boss ? "bosses" : "monsters";
    const p = m.foot;
    const intro = m.boss && m.intro > 0 && this.anims.exists(animKey("bosses", `${m.id}_intro`));
    const sprite = this.add.sprite(p.x, p.y, animKey(folder, `${m.id}_${intro ? "intro" : "walk"}`));
    sprite.setScale(sheetScale(folder, m.size)).setOrigin(0.5, 0.85);
    if (intro) sprite.play(animKey("bosses", `${m.id}_intro`));
    const sent = this.board.isSent(m);
    const label = txt(this, p.x, p.y, fmt(m.hp), m.boss ? 26 : 20, sent ? "#ff9a9a" : "#ffffff");
    if (sent) {
      // A red ring under monsters the opponent sent.
      const ring = this.add.graphics().lineStyle(4, 0xff4b4b, 0.9).strokeEllipse(0, 0, m.size * 0.7, m.size * 0.26);
      const follow = () => {
        if (!sprite.active) return void ring.destroy();
        ring.setPosition(sprite.x, sprite.y).setDepth(sprite.depth - 1);
      };
      this.events.on(Phaser.Scenes.Events.POST_UPDATE, follow);
      sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
        this.events.off(Phaser.Scenes.Events.POST_UPDATE, follow);
        ring.destroy();
      });
    }
    return { sprite, label, folder, hp: Math.ceil(m.hp), walking: !intro };
  }

  private drawShots() {
    const live = new Set(this.board.shots);
    for (const s of this.board.shots) {
      let img = this.shotViews.get(s);
      if (!img) {
        const proj = s.unit.def.proj;
        img = this.add.image(s.x, s.y, proj === "spark" ? "vfx:hit_spark" : `vfx:proj_${proj}`).setDepth(2000);
        img.setScale((proj === "spark" ? 40 : 56) / Math.max(1, img.width));
        this.shotViews.set(s, img);
        sfx("shoot", proj);
      }
      img.setPosition(s.x, s.y).setRotation(Math.atan2(s.aim.y - s.y, s.aim.x - s.x));
    }
    for (const [s, img] of this.shotViews) {
      if (live.has(s)) continue;
      this.shotViews.delete(s);
      img.destroy();
    }
  }

  private drawFx() {
    for (const f of this.board.fx) {
      if (this.seenFx.has(f)) continue;
      this.seenFx.add(f);
      const color = Phaser.Display.Color.HexStringToColor(f.color).color;
      if (f.kind === "text" && f.text) {
        if (f.callout && f.slot !== undefined) {
          // Big hits punch in at the target and pop a label over the unit that landed them.
          const t = floatText(this, f.x, f.y, f.text, f.color, 32).setDepth(520).setScale(1.8);
          this.tweens.add({ targets: t, scale: 1, duration: 180, ease: "Back.Out" });
          this.callout(f.slot, f.callout, f.color);
        } else floatText(this, f.x, f.y, f.text, f.color, 26);
      }
      else if (f.kind === "zap") {
        const g = this.add.graphics().setDepth(2050);
        zigzag(g, { x: f.x, y: f.y }, { x: f.x2 ?? f.x, y: f.y2 ?? f.y }, color);
        this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
      } else if (f.kind === "ring") {
        const g = this.add.graphics().setDepth(2040).setPosition(f.x, f.y);
        g.lineStyle(5, color, 0.9).strokeCircle(0, 0, f.x2 ?? 60);
        g.setScale(0.4);
        this.tweens.add({ targets: g, scale: 1, alpha: 0, duration: 320, onComplete: () => g.destroy() });
      }
    }
  }

  private vfx(name: string, x: number, y: number, px: number, depth = 2100) {
    const key = animKey("vfx", name);
    if (!this.anims.exists(key)) return;
    const s = this.add.sprite(x, y, key).setDepth(depth).setScale(sheetScale("vfx", px));
    s.play(key);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  }

  // ---------------------------------------------------------------- drawing the opponent

  private drawOpponent() {
    const s = this.oppSnap;
    if (!s) return;
    for (let slot = 0; slot < 15; slot++) {
      const cell = s.units[slot];
      const key = cell ? `${cell[0]}:${cell[1]}` : "";
      const v = this.oppUnits[slot];
      if (v && v.key === key) continue;
      v?.sprite.destroy();
      v?.pips.destroy();
      this.oppUnits[slot] = null;
      if (!cell || !UNIT_BY_ID[cell[0]]) continue;
      const p = slotPos(this.arena, slot);
      const idle = animKey("units", `${cell[0]}_idle`);
      const sprite = this.theirs(this.add.sprite(OX + p.x, p.y, idle).setOrigin(0.5, 0.62).setDepth(100 + p.y));
      sprite.setScale(sheetScale("units", 116));
      if (this.anims.exists(idle)) sprite.play(idle);
      const pips = this.theirs(this.add.graphics().setDepth(150 + p.y));
      for (let i = 0; i < cell[1]; i++) pips.fillStyle(0xffd93b, 1).fillCircle(OX + p.x - ((cell[1] - 1) * 14) / 2 + i * 14, p.y + 42, 7);
      this.oppUnits[slot] = { key, sprite, pips };
    }
    // Monsters glide between snapshots (every frame in a bot match, 4x a second online).
    const now = this.time.now;
    const span = this.opp ? 1 : SNAP_MS;
    if (this.oppSnapAt !== s.t) {
      this.oppSnapAt = s.t;
      const seen = new Set<number>();
      for (const [uid, id, pathIdx, dist] of s.monsters) {
        seen.add(uid);
        const m = this.oppMons.get(uid);
        if (m) {
          m.from = this.oppDist(m, now, span);
          m.to = dist;
          m.at = now;
          continue;
        }
        const folder = BOSS_BY_ID[id] ? "bosses" : "monsters";
        const walk = animKey(folder, `${id}_walk`);
        const sprite = this.theirs(this.add.sprite(OX, 0, walk).setOrigin(0.5, 0.85));
        sprite.setScale(sheetScale(folder, folder === "bosses" ? 190 : 84));
        if (this.anims.exists(walk)) sprite.play(walk);
        this.oppMons.set(uid, { sprite, path: pathIdx, from: dist, to: dist, at: now });
      }
      for (const [uid, m] of this.oppMons) {
        if (seen.has(uid)) continue;
        this.oppMons.delete(uid);
        this.tweens.add({ targets: m.sprite, alpha: 0, duration: 200, onComplete: () => m.sprite.destroy() });
      }
    }
    for (const m of this.oppMons.values()) {
      const path = this.paths[m.path] ?? this.paths[0];
      const p = path.at(this.oppDist(m, now, span));
      m.sprite.setPosition(OX + p.x, p.y).setDepth(100 + p.y);
    }
  }

  private oppDist(m: OppMon, now: number, span: number) {
    return m.from + (m.to - m.from) * Math.min(1, (now - m.at) / span);
  }

  // ---------------------------------------------------------------- actions

  private summon() {
    if (this.done || this.versus) return;
    if (!this.board.apply({ t: "summon" })) {
      sfx("error");
      return;
    }
    this.refreshHud();
  }

  private powerUp(id: string) {
    if (this.done || this.versus) return;
    if (!this.board.apply({ t: "power", id })) return void sfx("error");
    sfx("powerup");
    for (const v of this.units) if (v?.u.def.id === id) this.playOnce(v, "skill");
    this.refreshHud();
  }

  private castHero() {
    if (this.done || this.versus) return;
    if (!this.board.apply({ t: "hero" })) return void sfx("error");
    sfx("hero");
    this.refreshHud();
  }

  private doSend(s: SendDef) {
    if (this.done || this.versus) return;
    const problem = this.board.sendProblem(s.id);
    if (problem || !this.board.apply({ t: "send", id: s.id })) {
      sfx("error");
      toast(this, problem ?? "Can't send that now");
      return;
    }
    sfx("boss_die");
    if (this.opp) this.opp.apply({ t: "recv", id: s.id });
    else this.conn?.send({ t: "send", id: s.id, at: this.board.now });
    const sent = this.hud(txt(this, WIDE ? W / 2 : ARENA_W / 2, WIDE ? H - 260 : ARENA_H - 170, `${s.name.toUpperCase()} SENT!`, 36, "#ff9a9a").setDepth(3030));
    this.tweens.add({ targets: sent, y: sent.y - 60, alpha: 0, duration: 900, onComplete: () => sent.destroy() });
    this.refreshHud();
  }

  /** A send from the opponent reached the server (or the bot made one). */
  private receive(id: string) {
    if (!this.board.apply({ t: "recv", id })) return;
    sfx("boss");
  }

  private setupDrag() {
    this.input.on("dragstart", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite) => {
      const slot = obj.getData("slot") as number | undefined;
      const u = slot === undefined ? null : this.board.units[slot];
      if (!u || this.done) return;
      this.dragging = slot!;
      obj.setDepth(2500);
      this.board.units.forEach((o, i) => {
        if (!o || i === slot || o.def.id !== u.def.id || o.rank !== u.rank || u.rank >= MAX_RANK) return;
        const p = slotPos(this.arena, i);
        this.highlights.push(this.add.image(p.x, p.y + 6, "ui:tile_highlight_valid").setDisplaySize(104, 104).setDepth(95));
      });
    });
    this.input.on("drag", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite, x: number, y: number) => {
      if (obj.getData("slot") === this.dragging) obj.setPosition(x, y);
    });
    this.input.on("dragend", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite) => {
      this.highlights.forEach((h) => h.destroy());
      this.highlights = [];
      const from = obj.getData("slot") as number;
      if (from !== this.dragging) return;
      this.dragging = -1;
      let to = -1;
      let best = 60;
      for (let i = 0; i < 15; i++) {
        if (i === from || !this.board.units[i]) continue;
        const p = slotPos(this.arena, i);
        const d = Math.hypot(p.x - obj.x, p.y - obj.y);
        if (d < best) {
          best = d;
          to = i;
        }
      }
      if (to >= 0 && this.board.apply({ t: "merge", from, to })) {
        this.vfx("merge_levelup", obj.x, obj.y - 10, 150);
        return;
      }
      const p = slotPos(this.arena, from);
      obj.setPosition(p.x, p.y).setDepth(100 + p.y);
    });
  }

  // ---------------------------------------------------------------- emotes

  private emotePicker() {
    const names = assetIndex().emotes ?? [];
    if (!names.length) return;
    this.mini.setVisible(false);
    const m = modal(this, 600, 520, "EMOTES", () => this.mini.setVisible(!this.done));
    names.slice(0, 12).forEach((name, i) => {
      const img = this.add.image(m.cx + ((i % 4) - 1.5) * 130, m.cy - 110 + Math.floor(i / 4) * 130, `emote:${name}`);
      img.setScale(110 / Math.max(1, img.width, img.height));
      pressable(img, () => {
        m.close();
        this.conn?.send({ t: "emote", n: i });
        this.showEmote(i, true);
      });
      m.add(img);
    });
  }

  private showEmote(n: number, mine: boolean) {
    const name = (assetIndex().emotes ?? [])[n];
    if (!name) return;
    const r = this.miniRect();
    const [x, y] = mine ? (WIDE ? [W / 2 - 220, H - 200] : [110, ARENA_H - 230]) : [r.x + r.w / 2, r.y + r.h / 2];
    const img = this.hud(this.add.image(x, y, `emote:${name}`).setDepth(4000));
    img.setScale(0);
    const s = (WIDE ? 170 : 130) / Math.max(1, img.width);
    this.tweens.add({ targets: img, scale: s, duration: 250, ease: "Back.Out" });
    this.tweens.add({ targets: img, alpha: 0, delay: 2200, duration: 300, onComplete: () => img.destroy() });
  }

  // ---------------------------------------------------------------- network

  private onServer(m: ServerMsg) {
    switch (m.t) {
      case "incoming":
        this.receive(m.id);
        break;
      case "snap":
        this.oppSnap = m.s;
        break;
      case "rejected":
        toast(this, `Send refused: ${m.reason}`);
        break;
      case "opponent":
        this.oppConnected = m.connected;
        if (!m.connected && !this.done) toast(this, "Opponent disconnected");
        break;
      case "emote":
        this.showEmote(m.n, false);
        break;
      case "over":
        this.endOnline(m.result, (m.promotions ?? []) as Promotion[]);
        break;
      case "setup":
        this.offset = m.now - Date.now();
        break;
    }
  }

  // ---------------------------------------------------------------- ending

  private stats() {
    const b = this.board;
    return {
      kills: b.kills,
      bosses: b.events.filter((e) => e.kind === "kill").length,
      summons: b.counts.summons,
      merges: b.counts.merges,
      awakens: b.counts.awakens,
      heroCasts: b.heroCasts,
    };
  }

  /** My board's replay log (seed, loadout and every action with its tick). */
  private log() {
    const b = this.board;
    return { seed: this.setup.seed, side: this.you, arena: this.setup.arena, loadout: this.me, ticks: b.ticks, hp: b.hp, actions: b.actions, stats: this.stats() };
  }

  private sendLog() {
    if (this.logSent || !this.conn) return;
    this.logSent = true;
    this.conn.send({ t: "log", log: this.log() });
  }

  private checkEnd() {
    const b = this.board;
    if (this.opp) {
      const o = this.opp;
      if (!b.over && !o.over) return;
      const mineLost = b.outcome === "lost";
      const theirsLost = o.outcome === "lost";
      const outcome: Outcome = mineLost && theirsLost ? "draw" : mineLost ? "loss" : theirsLost ? "win" : b.hp === o.hp ? "draw" : b.hp > o.hp ? "win" : "loss";
      this.endBot(outcome);
      return;
    }
    if (!b.over || this.reported) return;
    this.reported = true;
    // Tell the room; it answers with "over" once it has decided.
    if (b.outcome === "lost") this.conn?.send({ t: "dead", at: b.now });
    else this.conn?.send({ t: "end", hp: b.hp });
    this.sendLog();
  }

  private endBot(outcome: Outcome | "left") {
    if (this.done) return;
    this.done = true;
    this.board.end("done");
    const shown: Outcome = outcome === "left" ? "loss" : outcome;
    const res = finishBotMatch(this.setup.id, { result: outcome, seconds: this.board.now, stats: this.stats(), log: this.log() })
      .then((r) => ({ trophies: r.result.trophies[0], coins: r.result.coins[0], promotions: r.promotions }))
      .catch(() => null);
    this.results(shown, res);
  }

  private endOnline(r: MatchResult, promotions: Promotion[]) {
    if (this.done) return;
    this.done = true;
    if (!this.board.over) this.board.end("done");
    this.sendLog();
    const outcome: Outcome = r.winner === null ? "draw" : r.winner === this.you ? "win" : "loss";
    this.results(outcome, Promise.resolve({ trophies: r.trophies[this.you], coins: r.coins[this.you], promotions }), r.reason);
  }

  private results(outcome: Outcome, reward: Promise<{ trophies: number; coins: number; promotions: Promotion[] } | null>, reason?: MatchResult["reason"]) {
    sfx(outcome === "win" ? "win" : "lose");
    this.time.delayedCall(600, () => {
      this.mini.setVisible(false);
      const m = modal(this, 600, 820, "");
      const banner = this.add.image(m.cx, m.cy - 280, outcome === "win" ? "ui:banner_victory" : "ui:banner_defeat");
      banner.setScale(460 / banner.width);
      m.add([banner, txt(this, m.cx, m.cy - 270, outcome === "win" ? "VICTORY" : outcome === "draw" ? "DRAW" : "DEFEAT", 44)]);
      const why =
        reason === "left" ? (outcome === "win" ? "Your opponent surrendered" : "You surrendered") : reason === "disconnect" ? (outcome === "win" ? "Your opponent left" : "Disconnected") : reason === "maxWave" ? "Decided by HP after the last wave" : "";
      m.add(txt(this, m.cx, m.cy - 150, `vs ${this.them.name}`, 34, "#fff4c2"));
      if (why) m.add(txt(this, m.cx, m.cy - 105, why, 22, "#c9d2ff"));
      const saving = txt(this, m.cx, m.cy + 40, "Saving...", 32, "#c9d2ff");
      m.add(saving);
      let promotions: Promotion[] = [];
      const next = () => {
        const p = promotions.shift();
        if (!p) return void loadMe().finally(() => this.scene.start("Lobby"));
        const name = LEAGUES.find((l) => l.id === p.league)?.name ?? p.league;
        rewardPopup(this, `${name.toUpperCase()} REWARD`, p, next);
      };
      m.add(button(this, m.cx, m.cy + 320, 360, 100, "CONTINUE", "green", () => {
        if (promotions.length) m.destroy();
        next();
      }));
      reward.then((r) => {
        if (!m.active) return;
        if (!r) return void saving.setText("Couldn't save this match\n(no connection)").setColor("#ff8080");
        saving.destroy();
        if (this.setup.practice) return void m.add(txt(this, m.cx, m.cy + 40, "Practice match: no rewards", 30, "#c9d2ff"));
        const rows: [string, string, string][] = [["item:coins", `+${fmt(r.coins)}`, "#ffd93b"]];
        if (this.setup.mode === "ranked" && !this.setup.friendly) rows.push(["item:trophy", `${r.trophies >= 0 ? "+" : ""}${r.trophies}`, r.trophies >= 0 ? "#ffd93b" : "#ff8080"]);
        rows.forEach(([icon, value, color], i) => {
          const y = m.cy - 10 + i * 90;
          m.add(this.add.image(m.cx - 90, y, icon).setDisplaySize(70, 70));
          m.add(txt(this, m.cx - 30, y, value, 44, color, [0, 0.5]));
        });
        promotions = [...r.promotions];
      });
    });
  }

  private menu() {
    if (this.done) return;
    this.mini.setVisible(false);
    const m = modal(this, 560, 480, "MATCH");
    m.add(button(this, m.cx, m.cy - 60, 340, 96, "RESUME", "green", () => {
      m.close();
      this.mini.setVisible(true);
    }));
    m.add(button(this, m.cx, m.cy + 80, 340, 96, "SURRENDER", "red", () => {
      m.close();
      if (this.opp) this.endBot("left");
      else {
        this.conn?.send({ t: "leave" });
        this.sendLog();
      }
    }));
  }
}

/**
 * Scroll factor 0 for an object and, in a container, everything inside it, now and when
 * added later. Phaser draws a container's children with the container's scroll factor but
 * hit-tests each child with its own, so a nested button would miss its clicks on the wide
 * layout, where the main camera is scrolled.
 */
function pin(o: Phaser.GameObjects.GameObject) {
  (o as unknown as { setScrollFactor?: (x: number) => void }).setScrollFactor?.(0);
  if (!(o instanceof Phaser.GameObjects.Container) || o.getData("pinned")) return;
  o.setData("pinned", true);
  o.list.forEach(pin);
  const box = o as unknown as { addHandler: (child: Phaser.GameObjects.GameObject) => void };
  const add = box.addHandler;
  box.addHandler = function (child) {
    add.call(this, child);
    pin(child);
  };
}

function loadAutoCast() {
  try {
    return localStorage.getItem(AUTO_CAST_KEY) === "1";
  } catch {
    return false;
  }
}

function saveAutoCast(on: boolean) {
  try {
    localStorage.setItem(AUTO_CAST_KEY, on ? "1" : "0");
  } catch {
    // Storage blocked: the switch just won't be remembered.
  }
}

function zigzag(g: Phaser.GameObjects.Graphics, a: Pt, b: Pt, color: number) {
  const pts: Pt[] = [a];
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    pts.push({ x: a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 22, y: a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 22 });
  }
  pts.push(b);
  g.lineStyle(7, NAVY, 0.8).strokePoints(pts);
  g.lineStyle(4, color, 1).strokePoints(pts);
}
