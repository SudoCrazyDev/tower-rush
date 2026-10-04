import Phaser from "phaser";
import { ambientVideo } from "../backdrop";
import { BASE, ensureAnim, loadImages, loadSheet, assetIndex, animKey, sheetScale } from "../assets";
import { ARENAS, type ArenaDef } from "../data/arenas";
import { BOSS_BY_ID, MONSTER_BY_ID, type BossDef, type MonsterDef } from "../data/monsters";
import { MAX_RANK, RARITY_ORDER, UNIT_BY_ID, maxPowerUp, powerUpCost, type Element, type UnitDef } from "../data/units";
import { raceLabel } from "../../../shared/races.ts";
import { ECONOMY } from "../../../shared/economy.ts";
import {
  EFFECTS, buffBonus, chainJumps, critChance, critMult, curseStep, executeChance, freezeChance, growthMult, pierceTargets, slowAmount, splashRadius, stunChance,
} from "../../../shared/effects.ts";
import { HERO_BY_ID, type HeroDef } from "../data/heroes";
import { questById, questDone, questText } from "../../../shared/daily.ts";
import { LEAGUES, leagueFor } from "../../../shared/leagues.ts";
import { rewardPopup } from "./daily";
import { leagueBadge } from "./leagues";
import { cardLevel, profile, startBattle, finishBattle, type BattleResult } from "../save";
import { music, sfx } from "../audio";
import { audioButtons, W, H, WIDE, ARENA_W, ARENA_H, txt, button, iconButton, fmt, floatText, modal, pressable, NAVY, resourcePill, toast, PORTRAIT_FIT } from "../ui";
import { Monster } from "../battle/Monster";
import { Unit, canAwaken } from "../battle/Unit";
import { arenaPaths, slotPos, type Path, type Pt } from "../battle/path";


const HIT_VFX: Record<Element, string> = {
  fire: "fire_explosion",
  ice: "ice_burst",
  lightning: "lightning_strike",
  nature: "hit_impact",
  poison: "poison_cloud",
  arcane: "arcane_vortex",
};

const AUTO_CAST_KEY = "tower-rush-autocast";
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
    // Not remembered.
  }
}

interface Shot {
  img: Phaser.GameObjects.Image;
  unit: Unit;
  def: UnitDef;
  rank: number;
  damage: number;
  target: Monster;
  aim: Pt;
  speed: number;
}

interface QueuedSpawn {
  def?: MonsterDef;
  boss?: BossDef;
}

export class BattleScene extends Phaser.Scene {
  arena!: ArenaDef;
  paths!: Path[];
  targetFrom = 0;
  now = 0;
  speedMult = 1;
  paused = false;
  over = false;

  mana = 0;
  summonCost = 0;
  lives = 0;
  /** Server-side battle record; null if the server couldn't be reached at start. */
  private battleId: Promise<number | null> = Promise.resolve(null);
  wave = 0;
  kills = 0;
  bossesKilled = 0;
  /** Counted for daily quests. */
  private counts = { summons: 0, merges: 0, awakens: 0, heroCasts: 0 };
  powerUps: Record<string, number> = {};
  deck: string[] = [];

  board: (Unit | null)[] = [];
  monsters: Monster[] = [];
  shots: Shot[] = [];

  private queue: QueuedSpawn[] = [];
  private spawnTimer = 0;
  private spawnInterval = 1;
  private waveTimer = 0;
  private waveState: "intro" | "spawning" | "clearing" = "intro";
  private introTimer = 2;
  private healTimer = 0;
  private boss: Monster | null = null;

  // HUD
  private manaText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private summonBtn!: Phaser.GameObjects.Container;
  private summonCostText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private deckCards: { root: Phaser.GameObjects.Container; cost: Phaser.GameObjects.Text; pips: Phaser.GameObjects.Graphics; id: string }[] = [];
  private bossBar!: Phaser.GameObjects.Container;
  private bossBarFill!: Phaser.GameObjects.Graphics;
  private highlights: Phaser.GameObjects.Image[] = [];
  private debug: Phaser.GameObjects.Graphics | null = null;

  // Hero
  hero: HeroDef | null = null;
  private heroReadyAt = 0;
  private rageUntil = 0;
  private hasteUntil = 0;
  private stormUntil = 0;
  private stormTimer = 0;
  /** Standing hero in the wide layout's side panel. */
  private heroSprite: Phaser.GameObjects.Sprite | null = null;
  /** Unit ids whose awakened sheets have been requested this battle. */
  private awakenedRequested = new Set<string>();
  private heroBtn: { root: Phaser.GameObjects.Container; pie: Phaser.GameObjects.Graphics; time: Phaser.GameObjects.Text; glow: Phaser.GameObjects.Graphics; r: number } | null = null;
  /** Cast the hero ability by itself whenever it is ready (remembered between battles). */
  private autoCast = loadAutoCast();

  constructor() {
    super("Battle");
  }

  init(data: { arena?: string }) {
    this.arena = ARENAS.find((a) => a.id === data.arena) ?? ARENAS[0];
    this.deck = [...profile.deck];
    this.now = 0;
    this.speedMult = 1;
    this.paused = this.over = false;
    this.mana = ECONOMY.startMana;
    this.summonCost = ECONOMY.summonCostStart;
    this.lives = ECONOMY.lives;
    this.wave = this.kills = this.bossesKilled = 0;
    this.counts = { summons: 0, merges: 0, awakens: 0, heroCasts: 0 };
    this.powerUps = Object.fromEntries(this.deck.map((id) => [id, 0]));
    this.board = new Array(15).fill(null);
    this.monsters = [];
    this.shots = [];
    this.queue = [];
    this.hearts = [];
    this.deckCards = [];
    this.highlights = [];
    this.boss = null;
    this.debug = null;
    this.waveState = "intro";
    this.introTimer = 1.5;
    const hero = profile.hero ? HERO_BY_ID[profile.hero] : undefined;
    this.hero = hero?.enabled ? hero : null;
    // The first use is ready a bit sooner than a full recharge.
    this.heroReadyAt = this.hero ? this.hero.cooldown * 0.4 : 0;
    this.rageUntil = this.hasteUntil = this.stormUntil = this.stormTimer = 0;
    this.heroSprite = null;
    this.heroBtn = null;
    this.awakenedRequested = new Set();
  }

  preload() {
    this.cameras.main.setScroll(0, 0);
    const a = this.arena;
    const bar = this.add.graphics();
    txt(this, W / 2, H / 2 - 60, a.name, 48, "#fff4c2");
    const progress = (p: number) => {
      bar.clear().fillStyle(NAVY, 1).fillRoundedRect(W / 2 - 260, H / 2, 520, 36, 18);
      bar.fillStyle(0x59d64a, 1).fillRoundedRect(W / 2 - 254, H / 2 + 6, Math.max(24, 508 * p), 24, 12);
    };
    this.load.on("progress", progress);
    this.load.once("complete", () => this.load.off("progress", progress));

    this.load.image(`loc:arena_${a.id}`, `${BASE}locations/arena_${a.id}.webp`);
    for (const id of this.deck) for (const anim of ["idle", "attack", "skill"]) loadSheet(this, "units", `${id}_${anim}`);
    const monsters = new Set(a.monsters);
    for (const b of a.bosses) if (BOSS_BY_ID[b].minion) monsters.add(BOSS_BY_ID[b].minion!);
    if (monsters.has("gelatinous_cube")) monsters.add("slime_blob");
    for (const id of monsters) for (const anim of ["walk", "death"]) loadSheet(this, "monsters", `${id}_${anim}`);
    for (const id of a.bosses) for (const anim of ["walk", "attack", "death", "intro"]) loadSheet(this, "bosses", `${id}_${anim}`);
    for (const name of assetIndex().anims.vfx) loadSheet(this, "vfx", name);
    loadImages(this, "boss_banner", "boss_banners", a.bosses);
    if (this.hero) for (const anim of ["idle", "skill", "victory"]) loadSheet(this, "heroes", `${this.hero.id}_${anim}`);
  }

  create() {
    this.children.removeAll(true);
    this.input.removeAllListeners();
    this.anims.globalTimeScale = 1;
    this.tweens.timeScale = 1;
    this.makeAnims();

    const a = this.arena;
    this.battleId = startBattle(a.id).catch(() => null);
    this.paths = arenaPaths(a);
    this.targetFrom = Math.max(0, a.ring.top - a.entryY - 40);
    this.add.image(0, 0, `loc:arena_${a.id}`).setOrigin(0).setDisplaySize(ARENA_W, ARENA_H);
    // Half the arenas have an ambient loop of the same picture (water, flags, lava...).
    ambientVideo(this, `arena_${a.id}`, (v) => v.setOrigin(0).setDisplaySize(ARENA_W, ARENA_H));
    // Wide layout: the world (arena coordinates) is centred by scrolling the camera;
    // HUD objects use scrollFactor 0 so they stay in screen space.
    this.cameras.main.setScroll(WIDE ? -(W - ARENA_W) / 2 : 0, 0);

    this.buildHud();
    this.setupDrag();
    this.input.keyboard?.on("keydown-D", () => this.toggleDebug());
    this.input.keyboard?.on("keydown-SPACE", () => this.summon());
    this.input.keyboard?.on("keydown-H", () => this.castHero());
    music("battle");
    this.load.on(Phaser.Loader.Events.COMPLETE, this.onAwakenedArt, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.load.off(Phaser.Loader.Events.COMPLETE, this.onAwakenedArt, this);
      this.anims.globalTimeScale = 1;
      this.tweens.timeScale = 1;
    });
    this.refreshHud();
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

  // ---------------------------------------------------------------- helpers

  slotPos(slot: number) {
    return slotPos(this.arena, slot);
  }

  cardLevel(id: string) {
    return cardLevel(id);
  }

  floater(x: number, y: number, text: string, color: string, size = 24) {
    floatText(this, x, y, text, color, size);
  }

  vfx(name: string, x: number, y: number, px: number, depth = 2100) {
    const key = animKey("vfx", name);
    if (!this.anims.exists(key)) return;
    const s = this.add.sprite(x, y, key).setDepth(depth).setScale(sheetScale("vfx", px));
    s.play(key);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  }

  gainMana(amount: number, x?: number, y?: number) {
    this.mana += amount;
    if (x !== undefined && y !== undefined) {
      this.floater(x, y, `+${amount}`, "#7fd8ff", 22);
      sfx("coin");
    }
    this.refreshHud();
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    const hud = <T extends Phaser.GameObjects.GameObject & { setScrollFactor(x: number): T }>(o: T) => o.setScrollFactor(0);
    const ox = (W - ARENA_W) / 2;
    const L = ox / 2;
    const R = W - ox / 2;

    if (WIDE) {
      // Blurred, darkened arena behind the side panels.
      const back = hud(this.add.image(W / 2, H / 2, `loc:arena_${this.arena.id}`).setDepth(-10));
      back.setScale(Math.max(W / back.width, H / back.height)).setTint(0x5a5f8a);
      back.preFX?.addBlur(2, 4, 4, 2);
      const g = hud(this.add.graphics().setDepth(2990));
      g.fillStyle(0x10133a, 0.72).fillRect(0, 0, ox, H).fillRect(W - ox, 0, ox, H);
      g.fillStyle(0xf2b630, 1).fillRect(ox - 6, 0, 6, H).fillRect(W - ox, 0, 6, H);
      g.fillStyle(NAVY, 1).fillRect(ox - 10, 0, 4, H).fillRect(W - ox + 6, 0, 4, H);
      hud(txt(this, L, 80, this.arena.name.toUpperCase(), 40, "#ffd27a").setDepth(3000));
      hud(txt(this, R, 80, "POWER UPS", 40, "#ffd27a").setDepth(3000));
      hud(txt(this, L, H - 60, "Drag matching units together to merge", 22, "#c9d2ff").setDepth(3000));
    } else {
      const g = hud(this.add.graphics().setDepth(3000));
      g.fillGradientStyle(0x232a63, 0x232a63, 0x10133a, 0x10133a, 1).fillRect(0, ARENA_H, W, H - ARENA_H);
      g.fillStyle(0xf2b630, 1).fillRect(0, ARENA_H, W, 6);
      g.fillStyle(NAVY, 1).fillRect(0, ARENA_H + 6, W, 4);
    }

    // Deck cards with power-up costs: a row under the arena, or a 3+2 grid on the right.
    this.deck.forEach((id, i) => {
      const [x, y] = WIDE ? [R + ((i < 3 ? i - 1 : i - 3.5) * 165), i < 3 ? 250 : 450] : [76 + i * 150, ARENA_H + 66];
      const def = UNIT_BY_ID[id];
      const frame = this.add.image(0, 0, `card:frame_${def.rarity}`).setDisplaySize(104, 104);
      const portrait = this.add.image(0, 0, `portrait:${id}`).setDisplaySize(104 * PORTRAIT_FIT, 104 * PORTRAIT_FIT);
      const pips = this.add.graphics();
      const costBg = this.add.graphics();
      costBg.fillStyle(NAVY, 0.9).fillRoundedRect(-50, 52, 100, 32, 16);
      const orb = this.add.image(-34, 68, "item:mana_orb").setDisplaySize(32, 32);
      const cost = txt(this, 10, 67, "100", 22);
      const root = hud(this.add.container(x, y, [frame, portrait, pips, costBg, orb, cost]).setDepth(3010));
      root.setSize(104, 136).setScale(WIDE ? 1.25 : 1);
      pressable(root, () => this.powerUp(id));
      this.deckCards.push({ root, cost, pips, id });
    });

    // Mana.
    const heroRow = !WIDE && !!this.hero;
    const manaPill = hud(resourcePill(this, WIDE ? L : heroRow ? 112 : 130, WIDE ? H - 190 : H - 66, "item:mana_orb", "100", heroRow ? 184 : 200).setDepth(3010));
    if (WIDE) manaPill.setScale(1.5);
    this.manaText = manaPill.text.setFontSize(32);

    // Summon button.
    const sb = this.add.image(0, 0, "ui:summon_button").setDisplaySize(124, 124);
    const costBg = this.add.graphics();
    costBg.fillStyle(NAVY, 0.95).fillRoundedRect(-42, 40, 84, 30, 15);
    this.summonCostText = txt(this, 0, 54, "10", 24);
    this.summonBtn = hud(this.add.container(WIDE ? R : heroRow ? 424 : W / 2, WIDE ? 760 : H - 76, [sb, costBg, this.summonCostText]).setDepth(3010));
    this.summonBtn.setSize(124, 124).setScale(WIDE ? 1.8 : 1);
    pressable(this.summonBtn, () => this.summon());
    this.tweens.add({ targets: sb, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 900, ease: "Sine.InOut" });
    if (WIDE) hud(txt(this, R, 920, "SUMMON  (Space)", 26, "#c9d2ff").setDepth(3000));

    // Speed + pause.
    const speed = this.add.image(0, 0, "ui:speed_toggle").setDisplaySize(96, 96);
    const speedBtn = hud(this.add.container(WIDE ? R - 90 : heroRow ? 584 : 590, WIDE ? H - 120 : H - 70, [speed]).setDepth(3010));
    speedBtn.setSize(96, 96).setScale(WIDE ? 1.2 : 1);
    pressable(speedBtn, () => {
      this.speedMult = this.speedMult === 1 ? 2 : 1;
      speed.setTint(this.speedMult === 2 ? 0xffffff : 0x8a8a8a);
      this.anims.globalTimeScale = this.speedMult;
      this.tweens.timeScale = this.speedMult;
    });
    speed.setTint(0x8a8a8a);
    hud(iconButton(this, WIDE ? R + 90 : 690, WIDE ? H - 120 : H - 70, "pause", WIDE ? 96 : 76, () => this.pause()).setDepth(3010));
    if (this.hero) this.buildHeroHud(L);

    // Wave + lives.
    this.waveText = hud(
      WIDE ? txt(this, L, 200, "WAVE 1", 80).setDepth(3000) : txt(this, 24, 34, "WAVE 1", 36, "#ffffff", [0, 0.5]).setDepth(3000),
    );
    for (let i = 0; i < ECONOMY.lives; i++) {
      const [x, y, size] = WIDE ? [L + (i - (ECONOMY.lives - 1) / 2) * 84, 320, 76] : [W - 40 - i * 54, 36, 54];
      this.hearts.push(hud(this.add.image(x, y, "item:heart_life").setDisplaySize(size, size).setDepth(3000)));
    }

    // Boss HP bar.
    const bg = this.add.graphics();
    bg.fillStyle(NAVY, 0.9).fillRoundedRect(-230, -18, 460, 36, 18);
    this.bossBarFill = this.add.graphics();
    const name = txt(this, 0, -36, "", WIDE ? 32 : 26, "#ffb0b0");
    this.bossBar = hud(this.add.container(WIDE ? L : W / 2, WIDE ? 500 : 110, [bg, this.bossBarFill, name]).setDepth(3000).setVisible(false));
    if (WIDE) this.bossBar.setScale(Math.min(1, (ox - 40) / 460));
    this.bossBar.setData("name", name);
  }

  /** Hero: standing in the left panel (wide) plus the ability button with its recharge dial. */
  private buildHeroHud(L: number) {
    const h = this.hero!;
    const hud = <T extends Phaser.GameObjects.GameObject & { setScrollFactor(x: number): T }>(o: T) => o.setScrollFactor(0);
    const idle = animKey("heroes", `${h.id}_idle`);
    if (WIDE && this.anims.exists(idle)) {
      this.heroSprite = hud(this.add.sprite(L, 740, idle).setScale(sheetScale("heroes", 300)).setDepth(3005));
      this.heroSprite.play(idle);
    }
    const size = WIDE ? 132 : 100;
    const r = size * 0.42;
    const glow = this.add.graphics();
    glow.fillStyle(0xffd93b, 0.55).fillCircle(0, 0, size * 0.62);
    const frame = this.add.image(0, 0, "card:frame_legendary").setDisplaySize(size, size);
    const portrait = this.add.image(0, 0, `hero_portrait:${h.id}`).setDisplaySize(size * PORTRAIT_FIT, size * PORTRAIT_FIT);
    const pie = this.add.graphics();
    const time = txt(this, 0, 0, "", Math.round(size * 0.34));
    const parts: Phaser.GameObjects.GameObject[] = [glow, frame, portrait, pie, time];
    if (WIDE) parts.push(txt(this, 0, size * 0.66, `${h.ability}  (H)`, 26, "#ffd93b"));
    const [x, y] = WIDE ? [L, 990] : [272, H - 72];
    const root = hud(this.add.container(x, y, parts).setDepth(3010));
    root.setSize(size, size);
    pressable(root, () => this.castHero());
    this.tweens.add({ targets: glow, scale: { from: 0.92, to: 1.08 }, yoyo: true, repeat: -1, duration: 500, ease: "Sine.InOut" });
    this.heroBtn = { root, pie, time, glow, r };
    // Auto-cast switch: beside the button in the side panel, tucked under it on phones.
    hud(this.autoCastSwitch(WIDE ? x + size * 0.5 + 80 : x, WIDE ? y : y + size * 0.5 + 6).setDepth(3020));
  }

  private autoCastSwitch(x: number, y: number) {
    const [tw, th] = WIDE ? [92, 40] : [72, 30];
    const track = this.add.graphics();
    const knob = this.add.graphics();
    const label = txt(this, 0, WIDE ? -th - 4 : 0, "AUTO", WIDE ? 24 : 16, "#ffffff");
    const draw = () => {
      const on = this.autoCast;
      track.clear().fillStyle(NAVY, 1).fillRoundedRect(-tw / 2 - 3, -th / 2 - 3, tw + 6, th + 6, (th + 6) / 2);
      track.fillStyle(on ? 0x59d64a : 0x3b4270, 1).fillRoundedRect(-tw / 2, -th / 2, tw, th, th / 2);
      const kx = on ? tw / 2 - th / 2 : -tw / 2 + th / 2;
      knob.clear().fillStyle(0xffffff, 1).fillCircle(kx, 0, th / 2 - 4);
      // On phones the label sits in the track, on the side the knob isn't.
      if (!WIDE) label.setX(on ? -tw / 2 + (tw - th) / 2 + 2 : tw / 2 - (tw - th) / 2 - 2);
      label.setColor(on ? "#ffffff" : "#c9d2ff");
    };
    draw();
    const root = this.add.container(x, y, [track, knob, label]);
    root.setSize(tw + 10, th + (WIDE ? th + 10 : 10));
    pressable(root, () => {
      this.autoCast = !this.autoCast;
      saveAutoCast(this.autoCast);
      draw();
    });
    return root;
  }

  private refreshHeroButton() {
    const b = this.heroBtn;
    if (!b || !this.hero) return;
    const left = this.heroReadyAt - this.now;
    b.pie.clear();
    b.glow.setVisible(left <= 0);
    if (left > 0) {
      // Dark wedge that shrinks clockwise as the ability recharges.
      const frac = Math.min(1, left / this.hero.cooldown);
      const start = -Math.PI / 2 + (1 - frac) * Math.PI * 2;
      b.pie.fillStyle(0x000000, 0.62).slice(0, 0, b.r, start, Math.PI * 1.5, false).fillPath();
      b.time.setText(String(Math.ceil(left)));
    } else b.time.setText("");
  }

  private refreshHud() {
    if (!this.manaText) return;
    this.manaText.setText(fmt(this.mana));
    this.summonCostText.setText(fmt(this.summonCost));
    const canSummon = this.mana >= this.summonCost && this.board.includes(null);
    this.summonBtn.setAlpha(canSummon ? 1 : 0.6);
    this.waveText.setText(`WAVE ${Math.max(1, this.wave)}`);
    this.hearts.forEach((h, i) => h.setAlpha(i < this.lives ? 1 : 0.2));
    for (const c of this.deckCards) {
      const lvl = this.powerUps[c.id];
      const cost = powerUpCost(lvl);
      c.cost.setText(lvl >= maxPowerUp() ? "MAX" : fmt(cost));
      c.root.setAlpha(lvl < maxPowerUp() && this.mana >= cost ? 1 : 0.65);
      c.pips.clear();
      for (let i = 0; i < maxPowerUp(); i++) {
        c.pips.fillStyle(NAVY, 1).fillCircle(-36 + i * 18, -46, 7);
        c.pips.fillStyle(i < lvl ? 0xffd93b : 0x3b4270, 1).fillCircle(-36 + i * 18, -46, 5);
      }
    }
  }

  // ---------------------------------------------------------------- hero

  /** Units' attack speed bonus from the hero (added to their haste). */
  get heroHaste() {
    return this.hero?.power === "haste" && this.now < this.hasteUntil ? this.hero.amount : 0;
  }

  get heroDamageMult() {
    return this.hero?.power === "rage" && this.now < this.rageUntil ? 1 + this.hero.amount : 1;
  }

  castHero(auto = false) {
    const h = this.hero;
    if (!h || this.over || this.paused) return;
    if (this.now < this.heroReadyAt) return void (auto || sfx("error"));
    const targets = this.monsters.filter((m) => !m.gone && m.intro <= 0);
    // Auto-cast also holds haste/rage until there is something to fight.
    const needsTargets = h.power !== "mana" && (auto || (h.power !== "haste" && h.power !== "rage"));
    if (needsTargets && !targets.length) {
      if (auto) return;
      sfx("error");
      toast(this, "No monsters to hit yet");
      return;
    }
    this.heroReadyAt = this.now + h.cooldown;
    this.counts.heroCasts++;
    sfx("hero");
    this.heroCastAnim(h);
    const now = this.now;
    const hpUnit = this.baseHp(Math.max(1, this.wave));
    const units = this.board.filter((u): u is Unit => !!u);

    switch (h.power) {
      case "meteor":
        this.cameras.main.shake(300, 0.01);
        for (const m of targets) {
          this.vfx("shadow_smoke", m.pos.x, m.pos.y, 170);
          m.damage(h.amount * hpUnit, { sure: true, crit: true, color: "#c58bff" });
        }
        break;
      case "storm":
        this.stormUntil = now + h.duration;
        this.stormTimer = 0;
        break;
      case "freeze":
        sfx("freeze");
        for (const m of targets) {
          m.frozenUntil = Math.max(m.frozenUntil, now + (m.boss ? h.duration / 3 : h.duration));
          this.vfx("ice_burst", m.pos.x, m.pos.y, 140);
          if (h.amount > 0) m.damage(h.amount * hpUnit, { sure: true, quiet: true });
        }
        break;
      case "slow":
        for (const m of targets) {
          m.slowPct = Math.max(m.slowUntil > now ? m.slowPct : 0, h.amount * (m.boss ? 0.5 : 1));
          m.slowUntil = now + h.duration;
          this.vfx("poison_cloud", m.pos.x, m.pos.y, 130);
        }
        break;
      case "mana": {
        const amount = Math.round(h.amount * (1 + 0.1 * this.wave));
        this.gainMana(amount);
        this.floater(ARENA_W / 2, 640, `+${amount} MANA`, "#7fd8ff", 48);
        this.vfx("coin_burst", ARENA_W / 2, 680, 260);
        sfx("coin");
        break;
      }
      case "haste":
        this.hasteUntil = now + h.duration;
        for (const u of units) this.vfx("lightning_strike", u.sprite.x, u.sprite.y - 20, 110);
        break;
      case "rage":
        this.rageUntil = now + h.duration;
        for (const u of units) this.vfx("fire_explosion", u.sprite.x, u.sprite.y - 20, 110);
        break;
      case "knockback":
        this.cameras.main.shake(250, 0.006);
        for (const m of targets) {
          this.vfx("hit_impact", m.pos.x, m.pos.y, 120);
          m.dist = Math.max(0, m.dist - (m.boss ? h.amount / 3 : h.amount));
          m.stunUntil = Math.max(m.stunUntil, now + h.duration);
          m.sync(now);
          this.vfx("shadow_smoke", m.pos.x, m.pos.y, 120);
        }
        break;
    }
    this.refreshHeroButton();
  }

  /** The hero's skill clip: in the side panel (wide), or popping up over the arena (phone). */
  private heroCastAnim(h: HeroDef) {
    const skill = animKey("heroes", `${h.id}_skill`);
    const idle = animKey("heroes", `${h.id}_idle`);
    const banner = txt(this, ARENA_W / 2, 520, h.ability.toUpperCase(), 56, "#ffd93b").setDepth(2850).setScale(0.5);
    this.tweens.add({ targets: banner, scale: 1, duration: 250, ease: "Back.Out" });
    this.tweens.add({ targets: banner, alpha: 0, y: 480, delay: 900, duration: 300, onComplete: () => banner.destroy() });
    if (!this.anims.exists(skill)) return;
    if (this.heroSprite) {
      this.heroSprite.play(skill);
      this.heroSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.heroSprite?.active && this.heroSprite.play(idle));
      return;
    }
    const s = this.add.sprite(ARENA_W / 2, 720, skill).setDepth(2840).setScale(0);
    this.tweens.add({ targets: s, scale: sheetScale("heroes", 360), duration: 200, ease: "Back.Out" });
    s.play(skill);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
      this.tweens.add({ targets: s, alpha: 0, scale: 0, duration: 200, onComplete: () => s.destroy() }),
    );
  }

  /** Arcane storm: a bolt from the sky every quarter second while it lasts. */
  private updateStorm(dt: number) {
    if (this.hero?.power !== "storm" || this.now >= this.stormUntil) return;
    this.stormTimer -= dt;
    if (this.stormTimer > 0) return;
    this.stormTimer += 0.25;
    const targets = this.monsters.filter((m) => !m.gone && m.intro <= 0);
    if (!targets.length) return;
    const m = targets[Math.floor(Math.random() * targets.length)];
    const g = this.add.graphics().setDepth(2050);
    this.zigzag(g, { x: m.pos.x + (Math.random() - 0.5) * 120, y: m.pos.y - 320 }, m.pos, 0xd9a3ff);
    this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
    this.vfx("arcane_vortex", m.pos.x, m.pos.y, 110);
    sfx("zap");
    m.damage(this.hero.amount * this.baseHp(Math.max(1, this.wave)), { sure: true });
  }

  private updateBossBar() {
    const b = this.boss;
    if (!b || b.gone) {
      this.bossBar.setVisible(false);
      return;
    }
    this.bossBar.setVisible(true);
    (this.bossBar.getData("name") as Phaser.GameObjects.Text).setText(b.boss!.name);
    const p = Math.max(0, b.hp / b.maxHp);
    this.bossBarFill.clear().fillStyle(0xe53935, 1).fillRoundedRect(-224, -12, Math.max(12, 448 * p), 24, 12);
  }

  // ---------------------------------------------------------------- player actions

  summon() {
    if (this.over || this.paused) return;
    const empty = this.board.map((u, i) => (u ? -1 : i)).filter((i) => i >= 0);
    if (!empty.length || this.mana < this.summonCost) {
      const x0 = this.summonBtn.getData("x0") ?? this.summonBtn.x;
      this.summonBtn.setData("x0", x0);
      this.tweens.add({ targets: this.summonBtn, x: { from: x0 - 8, to: x0 }, duration: 200, ease: "Bounce.Out" });
      sfx("error");
      return;
    }
    this.mana -= this.summonCost;
    this.summonCost += ECONOMY.summonCostStep;
    this.counts.summons++;
    const slot = empty[Math.floor(Math.random() * empty.length)];
    const id = this.deck[Math.floor(Math.random() * this.deck.length)];
    this.spawnUnit(id, 1, slot);
    this.refreshHud();
  }

  private spawnUnit(id: string, rank: number, slot: number) {
    const u = new Unit(this, UNIT_BY_ID[id], rank, slot);
    this.board[slot] = u;
    const p = this.slotPos(slot);
    this.vfx("summon_circle", p.x, p.y + 20, u.awakened ? 200 : 130, 90);
    if (u.awakened) this.celebrateAwakening(u);
    else sfx(rank > 1 ? "merge" : "summon");
    // Merges give a random deck unit, so once anything gets close to max rank, fetch the
    // awakened art for the whole deck in the background.
    if (rank >= MAX_RANK - 2) for (const d of this.deck) this.requestAwakenedArt(d);
    if (u.awakened) this.requestAwakenedArt(id);
    u.sprite.setScale(0);
    this.tweens.add({ targets: u.sprite, scale: u.baseScale, duration: u.awakened ? 420 : 260, ease: "Back.Out" });
    this.recomputeBuffs();
    return u;
  }

  // ---------------------------------------------------------------- awakening

  /** Queue a unit's awakened sheets (about 0.8 MB, so only when they may be needed). */
  private requestAwakenedArt(id: string) {
    if (this.awakenedRequested.has(id) || !canAwaken(id)) return;
    this.awakenedRequested.add(id);
    for (const anim of ["idle", "attack", "skill"]) loadSheet(this, "units_awakened", `${id}_${anim}`);
    this.load.start();
  }

  /** Late-loaded awakened sheets: build their animations and dress any awakened units. */
  private onAwakenedArt() {
    for (const id of this.awakenedRequested) {
      ensureAnim(this, "units_awakened", `${id}_idle`, 14, -1);
      ensureAnim(this, "units_awakened", `${id}_attack`, 24, 0);
      ensureAnim(this, "units_awakened", `${id}_skill`, 24, 0);
    }
    for (const u of this.board) {
      if (u?.awakened && !u.dragging && !u.sprite.anims.currentAnim?.key.includes("units_awakened")) u.playIdle();
    }
  }

  private celebrateAwakening(u: Unit) {
    this.counts.awakens++;
    sfx("awaken");
    const p = this.slotPos(u.slot);
    this.vfx("merge_levelup", p.x, p.y - 20, 220);
    this.vfx("holy_heal", p.x, p.y - 10, 200);
    this.floater(p.x, p.y - 80, "AWAKENED!", "#ffd93b", 34);
    this.cameras.main.flash(180, 255, 230, 140);
  }

  /** An awakened unit's ultimate: its own hit, much stronger, on everything around the target. */
  ultimate(unit: Unit, target: Monster | null) {
    const e = ECONOMY;
    const from = { x: unit.sprite.x, y: unit.sprite.y - 30 };
    sfx("ultimate");
    if (unit.def.arch === "mana" || !target) {
      this.gainMana(Math.round(EFFECTS.mana.ultimateBase + EFFECTS.mana.ultimatePerWave * this.wave), from.x, from.y - 30);
      this.vfx("coin_burst", from.x, from.y, 160);
      return;
    }
    const center = target.pos;
    const damage = unit.stats.damage * this.heroDamageMult * e.ultimateDamageMult;
    const ring = this.add.graphics().setDepth(2060).setPosition(center.x, center.y);
    ring.lineStyle(10, NAVY, 0.7).strokeCircle(0, 0, e.ultimateRadius);
    ring.lineStyle(6, 0xffd93b, 1).strokeCircle(0, 0, e.ultimateRadius);
    ring.setScale(0.2);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, ease: "Cubic.Out", onComplete: () => ring.destroy() });
    const beam = this.add.graphics().setDepth(2050);
    this.zigzag(beam, from, center, 0xffd93b);
    this.tweens.add({ targets: beam, alpha: 0, duration: 260, onComplete: () => beam.destroy() });
    this.vfx(HIT_VFX[unit.def.element], center.x, center.y, e.ultimateRadius * 1.6);
    this.floater(center.x, center.y - 70, "ULTIMATE!", "#ffd93b", 30);
    for (const m of this.nearby(center, e.ultimateRadius)) this.applyHit({ def: unit.def, rank: unit.rank, damage }, m);
  }

  private powerUp(id: string) {
    if (this.over || this.paused) return;
    const lvl = this.powerUps[id];
    const cost = powerUpCost(lvl);
    if (lvl >= maxPowerUp() || this.mana < cost) return void sfx("error");
    sfx("powerup");
    this.mana -= cost;
    this.powerUps[id] = lvl + 1;
    for (const u of this.board) {
      if (u?.def.id === id) {
        this.vfx("merge_levelup", u.sprite.x, u.sprite.y - 20, 110);
        u.playOnce("skill");
      }
    }
    this.refreshHud();
  }

  private setupDrag() {
    let origin: Unit | null = null;
    this.input.on("dragstart", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite & { unit?: Unit }) => {
      const u = obj.unit;
      if (!u || this.over || this.paused) return;
      origin = u;
      u.dragging = true;
      obj.setDepth(2500);
      for (const other of this.board) {
        if (other && other !== u && other.def.id === u.def.id && other.rank === u.rank && u.rank < MAX_RANK) {
          const p = this.slotPos(other.slot);
          this.highlights.push(this.add.image(p.x, p.y + 6, "ui:tile_highlight_valid").setDisplaySize(104, 104).setDepth(95));
        }
      }
    });
    this.input.on("drag", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite & { unit?: Unit }, x: number, y: number) => {
      if (obj.unit && obj.unit === origin) obj.setPosition(x, y);
    });
    this.input.on("dragend", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite & { unit?: Unit }) => {
      const u = obj.unit;
      this.highlights.forEach((h) => h.destroy());
      this.highlights = [];
      if (!u || u !== origin) return;
      origin = null;
      u.dragging = false;
      const target = this.unitAt(obj.x, obj.y);
      if (target && target !== u && target.def.id === u.def.id && target.rank === u.rank && u.rank < MAX_RANK && !this.over) {
        this.merge(u, target);
      } else {
        u.place(u.slot);
        u.playIdle();
      }
    });
  }

  private unitAt(x: number, y: number) {
    let best: Unit | null = null;
    let bestD = 60;
    for (const u of this.board) {
      if (!u || u.dragging) continue;
      const p = this.slotPos(u.slot);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  private merge(a: Unit, b: Unit) {
    const slot = b.slot;
    this.board[a.slot] = null;
    this.board[b.slot] = null;
    a.destroy();
    b.destroy();
    const id = this.deck[Math.floor(Math.random() * this.deck.length)];
    const u = this.spawnUnit(id, a.rank + 1, slot);
    this.counts.merges++;
    this.vfx("merge_levelup", u.sprite.x, u.sprite.y - 10, 150);
    this.refreshHud();
  }

  /** Buff units speed up their four neighbours. */
  private recomputeBuffs() {
    for (const u of this.board) if (u) u.haste = 0;
    this.board.forEach((u, i) => {
      if (!u || u.def.arch !== "buff") return;
      const bonus = buffBonus(u.rank, RARITY_ORDER.indexOf(u.def.rarity)) * (u.awakened ? ECONOMY.awakenDamageMult : 1);
      const col = i % 5;
      const n = [i - 5, i + 5, col > 0 ? i - 1 : -1, col < 4 ? i + 1 : -1];
      for (const j of n) {
        const v = this.board[j];
        if (v && v.def.arch !== "buff") v.haste += bonus;
      }
    });
  }

  private pause() {
    if (this.over) return;
    this.paused = true;
    this.anims.pauseAll();
    const m = modal(this, 560, 560, "PAUSED");
    const resume = () => {
      m.close();
      this.paused = false;
      this.anims.resumeAll();
    };
    m.add(button(this, m.cx, m.cy - 80, 340, 96, "RESUME", "green", resume));
    m.add(audioButtons(this, m.cx, m.cy + 40));
    m.add(button(this, m.cx, m.cy + 170, 340, 96, "SURRENDER", "red", () => {
      m.close();
      this.anims.resumeAll();
      this.paused = false;
      this.endGame();
    }));
  }

  // ---------------------------------------------------------------- combat

  pickTarget(mode: "first" | "strongest"): Monster | null {
    let best: Monster | null = null;
    for (const m of this.monsters) {
      // Monsters are fair game once they leave the gate corridor and reach the ring.
      if (m.gone || m.intro > 0 || m.dist < this.targetFrom) continue;
      if (!best) best = m;
      else if (mode === "first" ? m.progress > best.progress : m.hp > best.hp) best = m;
    }
    return best;
  }

  fire(unit: Unit, target: Monster) {
    const def = unit.def;
    let damage = unit.stats.damage * this.heroDamageMult;
    if (def.arch === "growth") damage *= growthMult(unit.alive);
    const from = { x: unit.sprite.x, y: unit.sprite.y - 30 };

    if (def.arch === "chain") {
      this.chainLightning(unit, target, damage, from);
      return;
    }
    const tex = def.proj === "spark" ? "vfx:hit_spark" : `vfx:proj_${def.proj}`;
    const img = this.add.image(from.x, from.y, tex).setDepth(2000);
    img.setScale((def.proj === "spark" ? 40 : 56) / img.width);
    sfx("shoot", def.proj);
    this.shots.push({ img, unit, def, rank: unit.rank, damage, target, aim: target.pos, speed: def.arch === "sniper" ? EFFECTS.sniper.shotSpeed : 1100 });
  }

  private chainLightning(unit: Unit, first: Monster, damage: number, from: Pt) {
    const jumps = chainJumps(unit.rank, RARITY_ORDER.indexOf(unit.def.rarity));
    const hit: Monster[] = [first];
    let cur = first;
    while (hit.length < jumps) {
      let next: Monster | null = null;
      let bestD = EFFECTS.chain.range;
      for (const m of this.monsters) {
        if (m.gone || hit.includes(m)) continue;
        const d = Math.hypot(m.pos.x - cur.pos.x, m.pos.y - cur.pos.y);
        if (d < bestD) {
          bestD = d;
          next = m;
        }
      }
      if (!next) break;
      hit.push(next);
      cur = next;
    }
    sfx("zap");
    const g = this.add.graphics().setDepth(2050);
    const color = unit.def.element === "lightning" ? 0xfff27a : 0x9ff0ff;
    let p = from;
    for (const m of hit) {
      this.zigzag(g, p, m.pos, color);
      p = m.pos;
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    hit.forEach((m, i) => {
      this.vfx("lightning_strike", m.pos.x, m.pos.y, 80);
      m.damage(damage * Math.pow(EFFECTS.chain.falloff, i));
    });
  }

  private zigzag(g: Phaser.GameObjects.Graphics, a: Pt, b: Pt, color: number) {
    const pts: Pt[] = [a];
    const n = 6;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push({ x: a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 22, y: a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 22 });
    }
    pts.push(b);
    g.lineStyle(7, NAVY, 0.8).strokePoints(pts);
    g.lineStyle(4, color, 1).strokePoints(pts);
  }

  private updateShots(dt: number) {
    for (const s of this.shots) {
      if (!s.target.gone) s.aim = s.target.pos;
      const dx = s.aim.x - s.img.x;
      const dy = s.aim.y - s.img.y;
      const d = Math.hypot(dx, dy);
      const step = s.speed * dt;
      s.img.rotation = Math.atan2(dy, dx);
      if (d <= step + 4) {
        s.img.destroy();
        if (!s.target.gone) this.applyHit(s, s.target);
        else this.vfx("hit_impact", s.aim.x, s.aim.y, 50);
      } else {
        s.img.x += (dx / d) * step;
        s.img.y += (dy / d) * step;
      }
    }
    this.shots = this.shots.filter((s) => s.img.active);
  }

  private nearby(center: Pt, radius: number, except?: Monster) {
    return this.monsters.filter((m) => !m.gone && m !== except && Math.hypot(m.pos.x - center.x, m.pos.y - center.y) <= radius);
  }

  private applyHit(s: Pick<Shot, "def" | "rank" | "damage">, m: Monster) {
    const { def, rank, damage } = s;
    const e = EFFECTS;
    const now = this.now;
    const rarityIdx = RARITY_ORDER.indexOf(def.rarity);
    const pos = m.pos;
    const isBoss = !!m.boss;
    const frostproof = m.has("frostproof");
    let vfxSize = 70;

    switch (def.arch) {
      case "splash":
      case "burn": {
        const splash = this.nearby(pos, splashRadius(def.arch, rank), m);
        const burnDps = def.arch === "burn" ? damage * e.burn.burnDps : 0;
        m.damage(damage);
        for (const o of splash) o.damage(damage * e[def.arch].splash, { sure: true, quiet: true });
        if (burnDps) for (const o of [m, ...splash]) o.burn = { dps: Math.max(o.burn.until > now ? o.burn.dps : 0, burnDps), until: now + e.burn.burnTime };
        vfxSize = 130 + rank * 6;
        break;
      }
      case "pierce": {
        m.damage(damage);
        const behind = this.nearby(pos, e.pierce.range, m)
          .sort((a, b) => Math.hypot(a.pos.x - pos.x, a.pos.y - pos.y) - Math.hypot(b.pos.x - pos.x, b.pos.y - pos.y))
          .slice(0, pierceTargets(rank));
        for (const o of behind) {
          o.damage(damage * e.pierce.damage, { sure: true });
          this.vfx("hit_impact", o.pos.x, o.pos.y, 50);
        }
        break;
      }
      case "slow":
        m.damage(damage);
        if (!frostproof || def.element !== "ice") {
          m.slowPct = Math.max(m.slowUntil > now ? m.slowPct : 0, slowAmount(rank, rarityIdx, isBoss));
          m.slowUntil = now + e.slow.duration;
        }
        break;
      case "freeze":
        m.damage(damage);
        if (!frostproof && Math.random() < freezeChance(rank, rarityIdx)) {
          m.frozenUntil = now + (isBoss ? e.freeze.bossDuration : e.freeze.duration);
          this.floater(pos.x, pos.y - 30, "FROZEN", "#7fd8ff", 22);
          sfx("freeze");
        }
        break;
      case "stun":
        m.damage(damage);
        if (Math.random() < stunChance(rank, rarityIdx)) {
          m.stunUntil = now + (isBoss ? e.stun.bossDuration : e.stun.duration);
          this.floater(pos.x, pos.y - 30, "STUN", "#ffd93b", 22);
        }
        break;
      case "poison":
        m.damage(damage);
        m.poison.push({ dps: damage * e.poison.dps, until: now + e.poison.duration });
        while (m.poison.length > e.poison.maxStacks) m.poison.shift();
        break;
      case "crit": {
        const crit = Math.random() < critChance(rank);
        m.damage(crit ? damage * critMult(rank) : damage, { crit });
        if (crit) vfxSize = 110;
        break;
      }
      case "curse":
        m.damage(damage);
        m.curse = Math.min(e.curse.max, m.curse + curseStep(rank, rarityIdx));
        break;
      case "execute":
        if (Math.random() < executeChance(rank, rarityIdx)) {
          if (isBoss) m.damage(damage * e.execute.bossMult, { crit: true, color: "#ff7ad9" });
          else {
            this.floater(pos.x, pos.y - 30, "EXECUTE", "#ff7ad9", 26);
            m.damage(m.hp / (1 + m.curse) / (m.has("armored") ? 0.7 : 1) + 1, { sure: true });
          }
          vfxSize = 130;
        } else m.damage(damage);
        break;
      case "sniper":
        m.damage(damage, { crit: true, color: "#ffffff" });
        vfxSize = 120;
        break;
      default:
        m.damage(damage);
    }
    this.vfx(HIT_VFX[def.element], pos.x, pos.y, vfxSize);
    sfx("hit", def.element);
  }

  // ---------------------------------------------------------------- waves

  private baseHp(n: number) {
    const e = ECONOMY;
    const arenaIdx = ARENAS.indexOf(this.arena);
    return e.waveHpBase * Math.pow(e.waveHpGrowth, n - 1) * (1 + arenaIdx * e.arenaHpStep);
  }

  private startWave() {
    this.wave++;
    const n = this.wave;
    const e = ECONOMY;
    const isBoss = n % e.bossEvery === 0;
    if (n > 1) this.gainMana(Math.round(e.waveManaBase + n * e.waveManaPerWave));
    const pool = this.arena.monsters.map((id) => MONSTER_BY_ID[id]);
    // Tanky monsters show up more in later waves.
    const pick = () => {
      const weights = pool.map((m) => (m.traits.includes("tank") ? Math.min(1, n / 12) : 1));
      let x = Math.random() * weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < pool.length; i++) if ((x -= weights[i]) <= 0) return pool[i];
      return pool[0];
    };
    this.queue = [];
    if (isBoss) {
      const bosses = this.arena.bosses;
      const boss = BOSS_BY_ID[bosses[(n / e.bossEvery - 1) % bosses.length]];
      this.queue.push({ boss });
      for (let i = 0; i < 4 + Math.floor(n / e.bossEvery); i++) this.queue.push({ def: pick() });
      this.showBanner(`BOSS: ${boss.name}`, true, boss.id, raceLabel(boss.race).toUpperCase());
      sfx("boss");
      music("boss");
    } else {
      const count = Math.min(e.waveSizeMax, Math.round(e.waveSizeBase + n * e.waveSizePerWave));
      for (let i = 0; i < count; i++) this.queue.push({ def: pick() });
      this.showBanner(`WAVE ${n}`);
      sfx("wave");
    }
    this.spawnInterval = Math.max(e.spawnIntervalMin, e.spawnIntervalStart - n * e.spawnIntervalStep);
    this.spawnTimer = isBoss ? 1.6 : 0.5;
    this.waveTimer = 0;
    this.waveState = "spawning";
    this.refreshHud();
  }

  private showBanner(text: string, boss = false, bossId?: string, sub?: string) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (boss && bossId && this.textures.exists(`boss_banner:${bossId}`)) {
      const img = this.add.image(0, -40, `boss_banner:${bossId}`);
      img.setScale(Math.min(560 / img.width, 300 / img.height));
      parts.push(img);
    } else if (boss) {
      parts.push(this.add.image(0, -70, "ui:boss_warning").setDisplaySize(150, 150));
    } else {
      parts.push(this.add.image(-150, 0, "ui:wave_horn").setDisplaySize(110, 110));
    }
    parts.push(txt(this, boss ? 0 : 40, boss ? 130 : 0, text, boss ? 46 : 64, boss ? "#ff8080" : "#fff4c2"));
    if (sub) parts.push(txt(this, 0, 178, sub, 26, "#ffd0d0"));
    const c = this.add.container(ARENA_W / 2, 470, parts).setDepth(2800).setAlpha(0).setScale(0.6);
    this.tweens.add({
      targets: c,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: "Back.Out",
      onComplete: () => this.tweens.add({ targets: c, alpha: 0, y: 420, delay: boss ? 1400 : 700, duration: 300, onComplete: () => c.destroy() }),
    });
  }

  private spawn(q: QueuedSpawn, at?: { path: Path; dist: number }, scale = 1, hpMult = 1) {
    const path = at?.path ?? this.paths[Math.random() < 0.5 ? 0 : 1];
    const n = this.wave;
    if (q.boss) {
      const hp = this.baseHp(n) * ECONOMY.bossHpMult * q.boss.hp;
      const m = new Monster(this, { boss: q.boss }, path, hp, { mana: 150 + n * 15 });
      m.powerTimer = 5;
      this.boss = m;
      this.monsters.push(m);
      return m;
    }
    const def = q.def!;
    const hp = this.baseHp(n) * def.hp * hpMult;
    const m = new Monster(this, { def }, path, hp, { dist: at?.dist, scale, mana: def.mana + Math.floor(n / 2) });
    this.monsters.push(m);
    return m;
  }

  onMonsterKilled(m: Monster) {
    this.kills++;
    this.gainMana(m.mana);
    if (!m.boss) sfx("die");
    if (m.boss) {
      this.bossesKilled++;
      sfx("boss_die");
      music("battle");
      this.floater(m.pos.x, m.pos.y - 40, "BOSS DEFEATED!", "#ffd93b", 40);
      this.vfx("coin_burst", m.pos.x, m.pos.y, 220);
    }
    if (m.def?.traits.includes("rich")) this.vfx("coin_burst", m.pos.x, m.pos.y, 120);
    // Splitters break into two smaller slimes once.
    if (m.def?.traits.includes("splitter") && m.size > 60) {
      const child = m.def.id === "gelatinous_cube" ? MONSTER_BY_ID.slime_blob : m.def;
      for (const off of [-18, 18]) {
        const c = this.spawn({ def: child }, { path: m.path, dist: Math.max(0, m.dist + off) }, 0.7, 0.35);
        c.mana = 3;
      }
    }
  }

  private bossPower(m: Monster) {
    const b = m.boss!;
    const key = animKey("bosses", `${b.id}_attack`);
    if (this.anims.exists(key)) {
      m.sprite.play(key);
      m.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => !m.dead && m.sprite.play(animKey("bosses", `${b.id}_walk`)));
    }
    const pos = m.pos;
    switch (b.power) {
      case "summon":
        for (let i = 0; i < 3; i++) this.spawn({ def: MONSTER_BY_ID[b.minion!] }, { path: m.path, dist: Math.max(0, m.dist - 30 - i * 35) }, 0.9, 0.8);
        this.vfx("summon_circle", pos.x, pos.y + 40, 200, 90);
        break;
      case "heal":
        m.heal(m.maxHp * 0.08);
        this.vfx("holy_heal", pos.x, pos.y, 220);
        this.floater(pos.x, pos.y - 60, "HEAL", "#7dff7a", 32);
        break;
      case "haste":
        m.hasteUntil = this.now + 3;
        this.vfx("fire_explosion", pos.x, pos.y, 200);
        this.floater(pos.x, pos.y - 60, "RAGE", "#ff8a3b", 32);
        break;
      case "shield":
        m.shieldUntil = this.now + 2.5;
        this.vfx("arcane_vortex", pos.x, pos.y, 230);
        this.floater(pos.x, pos.y - 60, "SHIELD", "#9fb4ff", 32);
        break;
      case "teleport":
        this.vfx("shadow_smoke", pos.x, pos.y, 220);
        m.dist = Math.min(m.path.length * 0.92, m.dist + 160);
        m.sync(this.now);
        this.vfx("shadow_smoke", m.pos.x, m.pos.y, 220);
        break;
      case "freeze_units": {
        const units = this.board.filter((u): u is Unit => !!u);
        Phaser.Utils.Array.Shuffle(units);
        for (const u of units.slice(0, 3)) {
          u.frozenUntil = this.now + 3;
          this.vfx("ice_burst", u.sprite.x, u.sprite.y - 20, 140);
        }
        break;
      }
    }
  }

  private loseLife(m: Monster) {
    this.lives = Math.max(0, this.lives - (m.boss ? ECONOMY.lives : 1));
    this.cameras.main.shake(250, 0.008);
    sfx("hurt");
    this.cameras.main.flash(200, 255, 40, 40);
    this.refreshHud();
    if (this.lives <= 0) this.endGame();
  }

  // ---------------------------------------------------------------- loop

  update(_time: number, delta: number) {
    if (this.paused || this.over) return;
    const dt = (Math.min(delta, 50) / 1000) * this.speedMult;
    this.now += dt;
    const now = this.now;

    // Wave flow.
    if (this.waveState === "intro") {
      this.introTimer -= dt;
      if (this.introTimer <= 0) this.startWave();
    } else if (this.waveState === "spawning") {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.queue.length) {
        this.spawn(this.queue.shift()!);
        this.spawnTimer = this.spawnInterval;
      }
      if (!this.queue.length) this.waveState = "clearing";
      this.waveTimer += dt;
    } else {
      this.waveTimer += dt;
      const bossAlive = this.boss && !this.boss.gone;
      const alive = this.monsters.some((m) => !m.gone);
      if (!bossAlive && (!alive || this.waveTimer > 20)) {
        this.waveState = "intro";
        this.introTimer = alive ? 0.5 : 1.5;
      }
    }

    // Monsters.
    this.healTimer -= dt;
    const healPulse = this.healTimer <= 0;
    if (healPulse) this.healTimer = 3;
    for (const m of this.monsters) {
      if (m.gone) continue;
      m.update(dt, now);
      if (m.gone) continue;
      if (m.boss && m.intro <= 0) {
        m.powerTimer -= dt;
        if (m.powerTimer <= 0) {
          m.powerTimer = 6;
          this.bossPower(m);
        }
      }
      if (healPulse && m.has("healer")) {
        for (const o of this.nearby(m.pos, 130)) o.heal(o.maxHp * 0.08);
        this.vfx("holy_heal", m.pos.x, m.pos.y, 120);
      }
      if (m.dist >= m.path.length) {
        m.remove();
        this.loseLife(m);
        if (this.over) return;
      }
    }
    this.monsters = this.monsters.filter((m) => !m.gone);
    if (this.boss?.gone) this.boss = null;

    for (const u of this.board) u?.update(dt, now);
    this.updateStorm(dt);
    this.updateShots(dt);
    if (this.autoCast && this.hero && now >= this.heroReadyAt) this.castHero(true);
    this.refreshHeroButton();
    this.updateBossBar();
    this.refreshHud();
  }

  // ---------------------------------------------------------------- end

  private endGame() {
    if (this.over) return;
    this.over = true;
    music(null);
    const stats = { wave: this.wave, kills: this.kills, bosses: this.bossesKilled, ...this.counts };
    const doneBefore = new Set(profile.daily.quests.filter(questDone).map((q) => q.id));
    const leagueBefore = leagueFor(profile.trophies);
    const result: Promise<BattleResult | null> = this.battleId
      .then((id) => (id === null ? null : finishBattle(id, stats)))
      .catch(() => null);

    this.time.delayedCall(500, () => {
      const m = modal(this, 600, 900, "");
      const banner = this.add.image(m.cx, m.cy - 300, "ui:banner_defeat");
      banner.setScale(460 / banner.width);
      const headline = txt(this, m.cx, m.cy - 290, "GAME OVER", 40);
      m.add([banner, headline]);
      m.add(txt(this, m.cx, m.cy - 150, `Wave ${stats.wave}`, 64, "#fff4c2"));
      m.add(txt(this, m.cx, m.cy - 90, `${stats.kills} monsters  ·  ${stats.bosses} bosses`, 26, "#c9d2ff"));
      const saving = txt(this, m.cx, m.cy + 90, "Saving...", 36, "#c9d2ff");
      m.add(saving);
      // Promotion rewards are shown one after another before going back to the lobby.
      let promotions: BattleResult["promotions"] = [];
      const next = () => {
        const p = promotions.shift();
        if (!p) return void this.scene.start("Lobby");
        const name = LEAGUES.find((l) => l.id === p.league)?.name ?? p.league;
        rewardPopup(this, `${name.toUpperCase()} REWARD`, p, next);
      };
      m.add(button(this, m.cx, m.cy + 370, 360, 100, "CONTINUE", "green", () => {
        if (promotions.length) m.destroy();
        next();
      }));

      result.then((r) => {
        if (!m.active) return;
        if (!r) {
          sfx("lose");
          saving.setText("Couldn't save this run\n(no connection)").setColor("#ff8080").setFontSize(30);
          return;
        }
        saving.destroy();
        sfx(r.newBest ? "win" : "lose");
        if (r.newBest) {
          const victory = this.hero && animKey("heroes", `${this.hero.id}_victory`);
          if (victory && this.heroSprite && this.anims.exists(victory)) this.heroSprite.play({ key: victory, repeat: -1 });
          banner.setTexture("ui:banner_victory");
          headline.setText("NEW BEST!");
        }
        const t = r.rewards.trophies;
        const rows: [string, string, string, number][] = [
          ["item:coins", `+${fmt(r.rewards.coins)}`, "#ffd93b", r.boosts?.coinMult ?? 1],
          ["item:gems", `+${r.rewards.gems}`, "#7fffd4", r.boosts?.gemMult ?? 1],
          ["item:trophy", `${t >= 0 ? "+" : ""}${t}`, t >= 0 ? "#ffd93b" : "#ff8080", 1],
        ];
        rows.forEach(([icon, value, color, mult], i) => {
          const y = m.cy + 10 + i * 80;
          m.add(this.add.image(m.cx - 90, y, icon).setDisplaySize(70, 70));
          const label = txt(this, m.cx - 30, y, value, 44, color, [0, 0.5]);
          m.add(label);
          // A running event multiplied this one.
          if (mult > 1) m.add(txt(this, label.x + label.width + 16, y, `x${+mult.toFixed(2)} EVENT`, 24, "#ff9df0", [0, 0.5]));
        });
        // Daily quests this run finished (claimed from the lobby).
        const finished = profile.daily.quests.filter((q) => questDone(q) && !doneBefore.has(q.id)).map((q) => questById(q.id)!);
        if (finished.length) {
          const more = finished.length > 1 ? `  (+${finished.length - 1} more)` : "";
          m.add(txt(this, m.cx, m.cy + 232, `Quest complete: ${questText(finished[0])}${more}`, 24, "#7dff7a").setWordWrapWidth(540));
          sfx("upgrade");
        }
        // League change: promoted (with rewards to show) or dropped back down.
        const league = leagueFor(profile.trophies);
        if (league.id !== leagueBefore.id) {
          const up = league.trophies > leagueBefore.trophies;
          const line = txt(this, m.cx + 30, m.cy + 285, up ? `PROMOTED TO ${league.name.toUpperCase()}!` : `Dropped to ${league.name}`, up ? 30 : 26, up ? league.color : "#ff8080");
          m.add([line, leagueBadge(this, line.x - line.width / 2 - 36, m.cy + 285, 56, league)]);
          if (up) sfx("win");
        }
        promotions = [...r.promotions];
      });
    });
  }

  // ---------------------------------------------------------------- debug

  private toggleDebug() {
    if (this.debug) {
      this.debug.destroy();
      this.debug = null;
      return;
    }
    const g = (this.debug = this.add.graphics().setDepth(2900));
    for (const [i, p] of this.paths.entries()) {
      g.lineStyle(6, i ? 0xff00ff : 0x00ffff, 0.9).strokePoints(p.pts);
    }
    for (let s = 0; s < 15; s++) {
      const p = this.slotPos(s);
      g.lineStyle(3, 0xffff00, 1).strokeRect(p.x - 38, p.y - 38, 76, 76);
      g.fillStyle(0xff0000, 1).fillCircle(p.x, p.y, 4);
    }
  }
}

