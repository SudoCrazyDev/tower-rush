/**
 * The solo battle: a view over `Sim` (shared/sim.ts). The Sim runs every rule (waves, combat,
 * bosses, heroes, stories, rewards math); this scene steps it at a fixed rate, draws what it
 * says (Unit and Monster are sprite wrappers), turns its event stream into effects and sounds,
 * and sends the player's input back to it as Sim actions.
 */
import Phaser from "phaser";
import { ambientVideo } from "../backdrop";
import { BASE, ensureAnim, hasAnim, loadImages, loadSheet, assetIndex, animKey, sheetScale, sheetId, unitArt } from "../assets";
import { ARENAS, ARENA_BY_ID, type ArenaDef } from "../data/arenas";
import { BOSS_BY_ID, MONSTER_BY_ID, SPLITS_INTO } from "../data/monsters";
import { maxRank, UNIT_BY_ID, boostMult, maxPowerUp, powerUpCost, type Element } from "../data/units";
import { findChapter, type StoryChapter, type StoryDef } from "../../../shared/stories.ts";
import { square3 } from "../../../shared/statuses.ts";
import { ECONOMY } from "../../../shared/economy.ts";
import { SUPPORT_TIP, canBecome, mimePrep, neighbours, noAttack, type SupportArch } from "../../../shared/support.ts";
import { kitPrimary } from "../../../shared/kit.ts";
import type { HeroDef } from "../data/heroes";
import { questById, questDone, questText } from "../../../shared/daily.ts";
import { LEAGUES, playerLeague } from "../../../shared/leagues.ts";
import { Sim, SIM_DT, type SimEvent, type SimSetup, type SimShot } from "../../../shared/sim.ts";
import { rewardPopup } from "./daily";
import { leagueBadge } from "./leagues";
import { cardLevel, profile, startBattle, finishBattle, finishStory, type BattleResult, type StoryResult, type StoryStart } from "../save";
import { storyPanels, storyResult } from "./storyUi";
import { onPlayLost, releasePlay } from "../play";
import { arenaMusic, music, sfx } from "../audio";
import { audioButtons, W, H, WIDE, ARENA_W, ARENA_H, txt, button, iconButton, fmt, floatText, modal, pressable, NAVY, resourcePill, toast, PORTRAIT_FIT, rewardRays, rewardPop } from "../ui";
import { coach, setTutorialDone, tutorialDue, type CoachStep } from "../tutorial";
import { Monster } from "../battle/Monster";
import { Unit, canAwaken } from "../battle/Unit";
import { ShotView, fxBusy, fxEvent, fxHit, fxTrack } from "../battle/vfx";
import { TideView } from "../battle/tideView";
import { FacelessView } from "../battle/facelessView";
import { OathView } from "../battle/oathView";
import { TribunalView } from "../battle/tribunalView";
import { BoardPortal } from "../battle/portalView";
import { playUltimate, fistStrike, icebornHit, mjolnirBolt } from "../battle/ultFx";
import { MJOLNIR_COLOR } from "../../../shared/ultimates.ts";
import { FieldLayer } from "../battle/fields";
import { arenaPaths, slotPos, type Path, type Pt } from "../battle/path";


const HIT_VFX: Record<Element, string> = {
  fire: "fire_explosion",
  ice: "ice_burst",
  lightning: "lightning_strike",
  nature: "hit_impact",
  poison: "poison_cloud",
  arcane: "arcane_vortex",
  normal: "hit_impact",
};

const AUTO_CAST_KEY = "tower-rush-autocast";
function loadAutoCast() {
  try {
    return localStorage.getItem(AUTO_CAST_KEY) === "1";
  } catch {
    return false;
  }
}
const TIPS_KEY = "tower-rush-support-tips";
/** Support units whose one-time tip has been shown on this device. */
function tipsSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TIPS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function markTipSeen(arch: string) {
  try {
    localStorage.setItem(TIPS_KEY, JSON.stringify([...tipsSeen(), arch]));
  } catch {
    // Shown again next time.
  }
}

function saveAutoCast(on: boolean) {
  try {
    localStorage.setItem(AUTO_CAST_KEY, on ? "1" : "0");
  } catch {
    // Not remembered.
  }
}

/** Most Sim steps one frame may run (a long stall just slows the battle instead of freezing the page). */
const MAX_STEPS = 12;

export class BattleScene extends Phaser.Scene {
  arena!: ArenaDef;
  paths!: Path[];
  /** The battle itself: every rule lives here. */
  sim!: Sim;
  /** Sim time left over after the last whole step (seconds), used to glide sprites between steps. */
  private acc = 0;
  speedMult = 1;
  paused = false;
  over = false;

  /** Server-side battle record; null if the server couldn't be reached at start. */
  private battleId: Promise<number | null> = Promise.resolve(null);
  private pauseMenu: ReturnType<typeof modal> | null = null;
  deck: string[] = [];
  /** Unit Lab (staging / dev only): a battle with picked units, lots of mana, and no server or profile effects. */
  private lab: { deck: string[]; level: number } | null = null;

  /** Sprites of the Sim's units and monsters, by uid. */
  private units = new Map<number, Unit>();
  /** Iceborn frost bursts, at most one per unit every 0.25 s. */
  private iceAt = new Map<number, number>();
  private monsters = new Map<number, Monster>();
  private shotImgs = new Map<SimShot, ShotView>();
  private fieldLayer: FieldLayer | null = null;
  private bubbleImgs = new Map<number, Phaser.GameObjects.Image>();
  /** Boss uids that had a stage or a power event in the batch being handled (they play their own clip). */
  private clipped = new Set<number>();

  /** Story mode (v1.2): the chapter being played, and the deck and levels the server handed out. */
  story: { def: StoryDef; chapter: StoryChapter; start: StoryStart } | null = null;
  /** v2.2 Sand & Sea visuals (story chapters only; they draw nothing without their mechanics). */
  private tideView: TideView | null = null;
  private faceless: FacelessView | null = null;
  /** v2.3 The Iron Oath visuals (evacuation, forge parts, runes, absorb). */
  private oath: OathView | null = null;
  /** v2.4 The Silver Tribunal visuals (pleas, laws, jail, cells, pans, falling city, sentence). */
  private tribunal: TribunalView | null = null;
  /** v2.7.1: opens under a locked board; a unit dropped in leaves for part of its worth. */
  private portal: BoardPortal | null = null;
  /** Equal ground: units wear the balance tint until this sim time. */
  equalUntil = 0;
  /** Chaos Taffy tethers, redrawn every frame. */
  private tethers: Phaser.GameObjects.Graphics | null = null;

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

  init(data: { arena?: string; story?: { chapter: string; start: StoryStart }; lab?: { deck: string[]; level: number } }) {
    // v2.8: the Unit Lab is open to everyone (only owned units; it never reports to the server).
    this.lab = data.lab && !data.story ? data.lab : null;
    const f = data.story ? findChapter(data.story.chapter) : null;
    this.story = f && data.story ? { def: f.story, chapter: f.chapter, start: data.story.start } : null;
    this.arena = (this.story && ARENA_BY_ID[this.story.chapter.layout]) || (ARENAS.find((a) => a.id === data.arena) ?? ARENAS[0]);
    this.deck = this.lab ? this.lab.deck.filter((id) => UNIT_BY_ID[id] && profile.cards[id]) : this.story ? [...this.story.start.deck] : [...profile.deck];
    this.tethers = null;
    this.tideView = this.faceless = this.oath = this.tribunal = null;
    this.equalUntil = 0;
    this.acc = 0;
    this.speedMult = 1;
    this.paused = this.over = false;
    this.units = new Map();
    this.monsters = new Map();
    this.shotImgs = new Map();
    this.fieldLayer = null;
    this.bubbleImgs = new Map();
    this.hearts = [];
    this.deckCards = [];
    this.highlights = [];
    this.debug = null;
    this.autoCast = loadAutoCast();
    const setup: SimSetup = {
      arena: this.arena.id,
      board: new Array(15).fill(null),
      cardLevel: 1,
      powerUp: 0,
      hero: profile.hero ?? null,
      scenario: { kind: "run", from: 1, to: Infinity },
      seed: Math.floor(Math.random() * 2 ** 32),
      maxTime: Infinity,
    };
    this.sim = new Sim(setup, {
      mode: "solo",
      levels: Object.fromEntries(this.deck.map((id) => [id, this.cardLevel(id)])),
      deck: this.deck,
      awakens: (id) => canAwaken(id, (UNIT_BY_ID[id] ? kitPrimary(UNIT_BY_ID[id]) : undefined)),
      bossIntro: (id) => hasAnim("bosses", `${id}_intro`),
      autoHero: this.autoCast,
      story: this.story?.chapter,
      startMana: this.lab ? 999999 : ECONOMY.startMana,
      freeMove: !!this.lab,
      bubbles: true,
      timelineCap: 64,
      view: true,
    });
    this.hero = this.sim.hero;
    this.heroSprite = null;
    this.heroBtn = null;
    this.awakenedRequested = new Set();
  }

  preload() {
    this.cameras.main.setScroll(0, 0);
    const a = this.arena;
    const bar = this.add.graphics();
    txt(this, W / 2, H / 2 - 60, this.story?.chapter.title ?? a.name, 48, "#fff4c2");
    const progress = (p: number) => {
      bar.clear().fillStyle(NAVY, 1).fillRoundedRect(W / 2 - 260, H / 2, 520, 36, 18);
      bar.fillStyle(0x59d64a, 1).fillRoundedRect(W / 2 - 254, H / 2 + 6, Math.max(24, 508 * p), 24, 12);
    };
    this.load.on("progress", progress);
    this.load.once("complete", () => this.load.off("progress", progress));

    this.load.image(this.artKey, `${BASE}locations/${this.art}.webp`);
    // v2.2: a tide chapter's arena has a flooded twin (<art>_high) that fades in at high tide.
    if (this.story?.chapter.mechanics?.tide && assetIndex().locations.includes(`${this.art}_high`)) this.load.image(`${this.artKey}_high`, `${BASE}locations/${this.art}_high.webp`);
    // v2.3: a chapter's hero unit isn't in the deck but is on the board; unitArt gives a stand-in sheet while its own art is missing.
    // v2.4: the trial's witnesses are lent to the board for a count, so their sheets load too.
    const witnesses = this.story?.chapter.mechanics?.trial ? this.story.chapter.waves.flatMap((w) => (w.charge ? [w.charge.witness] : [])) : [];
    for (const id of [...new Set([...this.deck, ...witnesses, ...(this.story?.chapter.hero ? [this.story.chapter.hero.unit] : [])])]) for (const anim of ["idle", "attack", "skill"]) loadSheet(this, "units", `${unitArt(id)}_${anim}`);
    const waves = this.story?.chapter.waves;
    const bosses = waves ? [...new Set(waves.flatMap((w) => (w.boss ? [w.boss] : [])))] : a.bosses;
    const monsters = new Set(waves ? waves.flatMap((w) => w.spawns.map((s) => s.id)) : a.monsters);
    for (const b of bosses) if (BOSS_BY_ID[b]?.minion) monsters.add(BOSS_BY_ID[b].minion!);
    if (this.story?.chapter.mechanics?.shell) monsters.add("barnacle_cluster");
    if (this.story?.chapter.mechanics?.evacuation) monsters.add(this.story.chapter.mechanics.evacuation.family);
    if (this.story?.chapter.mechanics?.lanterns) monsters.add("corvaline_lantern");
    for (const id of [...monsters]) if (SPLITS_INTO[id]) monsters.add(SPLITS_INTO[id]);
    for (const id of monsters) for (const anim of ["walk", "death"]) loadSheet(this, "monsters", `${sheetId("monsters", id)}_${anim}`);
    for (const boss of bosses) {
      const id = sheetId("bosses", boss);
      for (const anim of ["walk", "attack", "death", "intro", "crack", "portal"]) if (hasAnim("bosses", `${id}_${anim}`)) loadSheet(this, "bosses", `${id}_${anim}`);
    }
    for (const name of assetIndex().anims.vfx) loadSheet(this, "vfx", name);
    loadImages(this, "boss_banner", "boss_banners", bosses);
    // Speakers of in-battle barks: unit portraits are loaded already; story portraits aren't.
    for (const w of waves ?? []) {
      for (const who of [w.bark?.who]) if (who && !UNIT_BY_ID[who] && !this.textures.exists(`story_portrait:${who}`)) this.load.image(`story_portrait:${who}`, `${BASE}story/portraits/${who}.webp`);
      // v2.1: the allies of a rally cutscene.
      for (const id of w.rally?.allies ?? []) if (!this.textures.exists(`story_ally:${id}`)) this.load.image(`story_ally:${id}`, `${BASE}story/allies/${id}.webp`);
    }
    // v2.3: Brakka and the other speakers of the Forge's barks.
    for (const line of Object.values(this.story?.chapter.mechanics?.forge?.barks ?? {})) {
      if (!UNIT_BY_ID[line.who] && !this.textures.exists(`story_portrait:${line.who}`)) this.load.image(`story_portrait:${line.who}`, `${BASE}story/portraits/${line.who}.webp`);
    }
    if (this.hero) for (const anim of ["idle", "skill", "victory"]) loadSheet(this, "heroes", `${this.hero.id}_${anim}`);
  }

  create() {
    this.children.removeAll(true);
    this.input.removeAllListeners();
    this.anims.globalTimeScale = 1;
    this.tweens.timeScale = 1;
    this.makeAnims();

    const a = this.arena;
    // A story chapter was started on the server before the scene (the server chose its deck).
    this.battleId = this.lab ? Promise.resolve(null) : this.story ? Promise.resolve(this.story.start.battleId) : startBattle(a.id).catch(() => null);
    this.paths = arenaPaths(a);
    const tint = this.story?.chapter.tint ? Phaser.Display.Color.HexStringToColor(this.story.chapter.tint).color : null;
    const bg = this.add.image(0, 0, this.artKey).setOrigin(0).setDisplaySize(ARENA_W, ARENA_H);
    if (tint !== null) bg.setTint(tint);
    // A flashback chapter shows its arena in sepia (WebGL only).
    const sepia = !!this.story?.chapter.sepia;
    if (sepia) bg.preFX?.addColorMatrix().sepia();
    // Half the arenas have an ambient loop of the same picture (water, flags, lava...).
    ambientVideo(this, this.art, (v) => {
      v.setOrigin(0).setDisplaySize(ARENA_W, ARENA_H);
      if (tint !== null) v.setTint(tint);
      if (sepia) v.preFX?.addColorMatrix().sepia();
    });
    this.tethers = this.add.graphics().setDepth(1400);
    // Wide layout: the world (arena coordinates) is centred by scrolling the camera;
    // HUD objects use scrollFactor 0 so they stay in screen space.
    this.cameras.main.setScroll(WIDE ? -(W - ARENA_W) / 2 : 0, 0);

    this.buildHud();
    this.setupDrag();
    // Lab boards are built by hand, so no portal there.
    if (!this.lab) this.portal = new BoardPortal(this, this.arena);
    if (this.story) {
      this.tideView = new TideView(this, this.story.chapter.mechanics);
      if (this.textures.exists(`${this.artKey}_high`)) this.tideView.highArt(`${this.artKey}_high`, tint);
      this.faceless = new FacelessView(this, this.story.chapter.mechanics);
      this.oath = new OathView(this, this.story.chapter.mechanics);
      this.tribunal = new TribunalView(this, this.story.chapter.mechanics);
    }
    this.input.keyboard?.on("keydown-D", () => this.toggleDebug());
    this.input.keyboard?.on("keydown-SPACE", () => this.summon());
    if (this.lab) this.input.on("pointerup", (p: Phaser.Input.Pointer) => this.labTap(p));
    this.input.keyboard?.on("keydown-H", () => this.castHero());
    // v2.8: the arena's own track streams in over the synth battle music.
    arenaMusic(this.arena.id);
    music("battle");
    this.load.on(Phaser.Loader.Events.COMPLETE, this.onAwakenedArt, this);
    // Another device started a battle: this one ends, saving what it has.
    onPlayLost(() => {
      if (this.over) return;
      this.pauseMenu?.close();
      this.anims.resumeAll();
      this.paused = false;
      this.sim.end("Continued on another device");
      this.pump();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      onPlayLost(null);
      releasePlay();
      this.load.off(Phaser.Loader.Events.COMPLETE, this.onAwakenedArt, this);
      this.anims.globalTimeScale = 1;
      this.tweens.timeScale = 1;
    });
    this.refreshHud();
    if (!this.lab && tutorialDue("battle")) this.runTutorial();
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

  /** Battle time in seconds (the Sim's clock). */
  get now() {
    return this.sim.now;
  }

  slotPos(slot: number) {
    return slotPos(this.arena, slot);
  }

  cardLevel(id: string) {
    return this.lab?.level ?? this.story?.start.levels[id] ?? cardLevel(id);
  }

  /** Background art: the arena's, or the story chapter's. */
  get art() {
    return this.story?.chapter.art ?? `arena_${this.arena.id}`;
  }

  get artKey() {
    return `loc:${this.art}`;
  }

  /**
   * v2.8.1: floating numbers alive right now. Each one is a text texture drawn on the CPU, and late
   * waves (fast crits, kill mana) made dozens a second, so small ones are capped; big ones always show.
   */
  private floats = 0;
  private float(x: number, y: number, text: string, color: string, size: number) {
    if (size < 30 && this.floats >= 18) return null;
    const t = floatText(this, x, y, text, color, size);
    this.floats++;
    t.once(Phaser.GameObjects.Events.DESTROY, () => this.floats--);
    return t;
  }

  floater(x: number, y: number, text: string, color: string, size = 24) {
    this.float(x, y, text, color, size);
  }

  /** A big hit number that punches in before it rises (crits, executes). Capped like the small numbers. */
  critFloater(x: number, y: number, text: string, color: string, size = 36) {
    if (this.floats >= 18) return;
    const t = this.float(x, y, text, color, size);
    if (!t) return;
    t.setDepth(520).setScale(1.8);
    this.tweens.add({ targets: t, scale: 1, duration: 180, ease: "Back.Out" });
  }

  vfx(name: string, x: number, y: number, px: number, depth = 2100) {
    const key = animKey("vfx", name);
    if (!this.anims.exists(key) || fxBusy()) return;
    const s = fxTrack(this.add.sprite(x, y, key).setDepth(depth).setScale(sheetScale("vfx", px)));
    s.play(key);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  }

  /** The sprite wrapper of a unit / monster by Sim uid (null when gone). */
  getUnit(uid: number) {
    return this.units.get(uid) ?? null;
  }

  getMonster(uid: number) {
    return this.monsters.get(uid) ?? null;
  }

  allMonsters() {
    return [...this.monsters.values()].filter((m) => !m.dead);
  }

  private unitInSlot(slot: number) {
    const su = this.sim.units[slot];
    return su ? this.units.get(su.uid) ?? null : null;
  }

  /** Card level × power-up multiplier of a unit's support effect (as the Sim computes it). */
  private supportMult(u: Unit) {
    return boostMult(this.cardLevel(u.def.id), this.sim.powerLevel(u.def.id));
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    const hud = <T extends Phaser.GameObjects.GameObject & { setScrollFactor(x: number): T }>(o: T) => o.setScrollFactor(0);
    const ox = (W - ARENA_W) / 2;
    const L = ox / 2;
    const R = W - ox / 2;

    if (WIDE) {
      // Blurred, darkened arena behind the side panels.
      const back = hud(this.add.image(W / 2, H / 2, this.artKey).setDepth(-10));
      back.setScale(Math.max(W / back.width, H / back.height)).setTint(0x5a5f8a);
      back.preFX?.addBlur(2, 4, 4, 2);
      const g = hud(this.add.graphics().setDepth(2990));
      g.fillStyle(0x10133a, 0.72).fillRect(0, 0, ox, H).fillRect(W - ox, 0, ox, H);
      g.fillStyle(0xf2b630, 1).fillRect(ox - 6, 0, 6, H).fillRect(W - ox, 0, 6, H);
      g.fillStyle(NAVY, 1).fillRect(ox - 10, 0, 4, H).fillRect(W - ox + 6, 0, 4, H);
      hud(txt(this, L, 80, (this.story?.chapter.title ?? this.arena.name).toUpperCase(), 40, "#ffd27a").setDepth(3000).setWordWrapWidth(ox - 40));
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
      if (this.lab) {
        // Lab: tap picks this unit (then tap empty tiles to place it), drag it onto any empty tile to place it there,
        // hold (450ms) to power it up.
        let timer: Phaser.Time.TimerEvent | null = null;
        let held = false;
        let ghost: Phaser.GameObjects.Image | null = null;
        let start: { x: number; y: number } | null = null;
        const stop = () => {
          this.input.off("pointermove", move);
          this.input.off("pointerup", drop);
          ghost?.destroy();
          ghost = null;
          start = null;
        };
        const move = (p: Phaser.Input.Pointer) => {
          if (!start) return;
          if (!ghost && Math.hypot(p.x - start.x, p.y - start.y) > 16) {
            timer?.remove();
            ghost = hud(this.add.image(p.x, p.y, `portrait:${id}`).setDisplaySize(96, 96).setAlpha(0.85).setDepth(4000));
          }
          ghost?.setPosition(p.x, p.y);
        };
        const drop = (p: Phaser.Input.Pointer) => {
          const dragged = !!ghost;
          stop();
          if (!dragged) return;
          const w = this.cameras.main.getWorldPoint(p.x, p.y);
          let best = -1;
          let bestD = 90;
          for (let slot = 0; slot < 15; slot++) {
            const t = this.slotPos(slot);
            const d = Math.hypot(t.x - w.x, t.y - w.y);
            if (d < bestD && !this.sim.units[slot]) [best, bestD] = [slot, d];
          }
          if (best < 0) return void sfx("error");
          this.labSummon(id, best);
        };
        root.on("pointerdown", (p: Phaser.Input.Pointer) => {
          held = false;
          start = { x: p.x, y: p.y };
          timer = this.time.delayedCall(450, () => ((held = true), this.powerUp(id)));
          this.input.on("pointermove", move);
          this.input.on("pointerup", drop);
        });
        root.on("pointerup", () => timer?.remove());
        pressable(root, () => !held && !ghost && this.labArm(this.labArmed === id ? null : id));
      } else pressable(root, () => this.powerUp(id));
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
    // Lab: no summoning; units go where the player puts them.
    if (this.lab) this.summonBtn.setVisible(false).disableInteractive();
    this.tweens.add({ targets: sb, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 900, ease: "Sine.InOut" });
    if (WIDE && !this.lab) hud(txt(this, R, 920, "SUMMON  (Space)", 26, "#c9d2ff").setDepth(3000));
    // Unit Lab (every build) plus staging and dev builds: a test button that takes every unit on the board to max rank
    // (awakening it). On phones in the lab it takes the summon button's spot, clear of the deck row.
    if (this.lab || import.meta.env.DEV || import.meta.env.MODE === "staging") {
      const [tx, ty] = WIDE ? [R, 1010] : this.lab ? [heroRow ? 424 : W / 2, H - 76] : [W - 130, H - 200];
      const t = button(this, tx, ty, !WIDE && this.lab ? 190 : 220, 64, `TEST ★${maxRank()}`, "red", () => this.sim.testMaxRankAll());
      hud(t.setDepth(3010));
    }

    if (this.lab) {
      // A title and short how-to lines: under the hearts on wide screens, one line under the wave on phones.
      if (WIDE) {
        hud(txt(this, L, 392, "UNIT LAB", 34, "#7dff7a").setDepth(3000));
        ["Tap a card, then tap tiles", "Hold a card: power up", "Drag units to move them"].forEach((line, i) =>
          hud(txt(this, L, 432 + i * 30, line, 22, "#c9f5c0").setDepth(3000)),
        );
      } else hud(txt(this, 24, 66, "LAB · tap card + tile · hold: power up · drag to move", 18, "#7dff7a", [0, 0.5]).setDepth(3000));
      this.labWavePicker(hud, WIDE ? R : W - 150, WIDE ? 760 : H - 600);
    }

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
      this.sim.setAutoHero(this.autoCast);
      saveAutoCast(this.autoCast);
      draw();
    });
    return root;
  }

  private refreshHeroButton() {
    const b = this.heroBtn;
    if (!b || !this.hero) return;
    const left = this.sim.heroLeft;
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
    const sim = this.sim;
    this.manaText.setText(fmt(sim.mana));
    this.summonCostText.setText(fmt(sim.summonCost));
    this.summonBtn.setAlpha(sim.canSummon ? 1 : 0.6);
    const n = Math.max(1, sim.wave);
    this.waveText.setText(this.story ? `WAVE ${n} / ${this.story.chapter.waves.length}` : `WAVE ${n}`);
    this.hearts.forEach((h, i) => h.setAlpha(i < sim.lives ? 1 : 0.2));
    for (const c of this.deckCards) {
      const lvl = sim.powerUps[c.id];
      // v2.4 chapter 2: a card still locked in its cell.
      if (lvl === undefined) {
        c.cost.setText("LOCKED");
        c.root.setAlpha(0.3);
        c.pips.clear();
        continue;
      }
      const cost = powerUpCost(lvl);
      c.cost.setText(lvl >= maxPowerUp() ? "MAX" : fmt(cost));
      c.root.setAlpha(lvl < maxPowerUp() && sim.mana >= cost ? 1 : 0.65);
      c.pips.clear();
      for (let i = 0; i < maxPowerUp(); i++) {
        c.pips.fillStyle(NAVY, 1).fillCircle(-36 + i * 18, -46, 7);
        c.pips.fillStyle(i < lvl ? 0xffd93b : 0x3b4270, 1).fillCircle(-36 + i * 18, -46, 5);
      }
    }
  }

  private updateBossBar() {
    const b = this.sim.boss;
    // v2.3: the Forge's part bars (oathView) replace the boss bar; they sit in the same spot.
    if (!b || b.gone || b.parts.length) {
      this.bossBar.setVisible(false);
      return;
    }
    this.bossBar.setVisible(true);
    const g = this.bossBarFill.clear();
    if (b.chainTotal > 0) {
      // v2.2 Purify: a row of chain links (whole or broken) and the bar of the chain showing now.
      (this.bossBar.getData("name") as Phaser.GameObjects.Text).setText(`${b.boss!.name}  CHAIN ${Math.min(b.chainTotal, b.chainIndex + 1)}/${b.chainTotal}`);
      g.fillStyle(0xb48cff, 1).fillRoundedRect(-224, -12, Math.max(12, 448 * Math.max(0, b.chainHp / b.chainMax)), 24, 12);
      for (let i = 0; i < b.chainTotal; i++) {
        const x = (i - (b.chainTotal - 1) / 2) * 34;
        if (i < b.chainIndex) {
          g.fillStyle(0x3b4270, 0.7).fillCircle(x, 38, 11).lineStyle(3, 0xff6b6b, 1).lineBetween(x - 8, 30, x + 8, 46);
        } else {
          g.fillStyle(NAVY, 1).fillCircle(x, 38, 13).fillStyle(i === b.chainIndex ? 0xffd93b : 0xb48cff, 1).fillCircle(x, 38, 10).fillStyle(NAVY, 1).fillCircle(x, 38, 4);
        }
      }
      return;
    }
    // v2.3: the Colossus counts the iron it has eaten.
    const eaten = b.boss!.skills?.some((k) => k.kind === "absorb") ? `   IRON x${b.stacks}` : "";
    (this.bossBar.getData("name") as Phaser.GameObjects.Text).setText(`${b.boss!.name}${eaten}`);
    const p = Math.max(0, b.hp / b.maxHp);
    g.fillStyle(0xe53935, 1).fillRoundedRect(-224, -12, Math.max(12, 448 * p), 24, 12);
  }

  // ---------------------------------------------------------------- player actions

  castHero() {
    const h = this.hero;
    if (!h || this.over || this.paused) return;
    if (this.sim.heroLeft > 0) return void sfx("error");
    if (!this.sim.useHero()) {
      sfx("error");
      toast(this, "No monsters to hit yet");
      return;
    }
    this.pump();
    this.refreshHeroButton();
  }

  summon() {
    if (this.over || this.paused || this.lab) return;
    if (!this.sim.summon()) {
      const x0 = this.summonBtn.getData("x0") ?? this.summonBtn.x;
      this.summonBtn.setData("x0", x0);
      this.tweens.add({ targets: this.summonBtn, x: { from: x0 - 8, to: x0 }, duration: 200, ease: "Bounce.Out" });
      sfx("error");
      return;
    }
    this.pump();
    this.refreshHud();
  }

  /** Unit Lab: the deck card picked for placing (tap empty tiles to place it), highlighted. */
  /** Unit Lab: pick the next wave's number (−10/−1/+1/+10), then GO. */
  private labWavePicker(hud: <T extends Phaser.GameObjects.GameObject & { setScrollFactor(x: number): T }>(o: T) => T, x: number, y: number) {
    let n = 10;
    const s = WIDE ? 1 : 0.8;
    hud(txt(this, x, y, "NEXT WAVE", Math.round(26 * s), "#7dff7a").setDepth(3000));
    const value = hud(txt(this, x, y + 50 * s, String(n), Math.round(34 * s), "#ffffff").setDepth(3010));
    const go = hud(button(this, x, y + 112 * s, 240 * s, 60 * s, `GO TO WAVE ${n}`, "blue", () => {
      this.sim.labWave(n);
      this.floater(ARENA_W / 2, 300, `WAVE ${n} IS NEXT`, "#7dff7a", 34);
    }).setDepth(3010));
    const bump = (d: number) => {
      n = Math.max(1, Math.min(999, n + d));
      value.setText(String(n));
      go.label.setText(`GO TO WAVE ${n}`);
    };
    [-10, -1, 1, 10].forEach((d, i) => {
      const bx = x + [-150, -82, 82, 150][i] * s;
      hud(button(this, bx, y + 50 * s, 60 * s, 52 * s, d > 0 ? `+${d}` : `${d}`, d > 0 ? "green" : "red", () => bump(d), Math.round(20 * s)).setDepth(3010));
    });
  }

  private labArmed: string | null = null;
  private labArm(id: string | null) {
    this.labArmed = id;
    for (const c of this.deckCards) {
      const on = c.id === id;
      c.root.setScale((WIDE ? 1.25 : 1) * (on ? 1.15 : 1));
      (c.root.list[0] as Phaser.GameObjects.Image).setTint(on ? 0x7dff7a : 0xffffff);
    }
  }

  /** Unit Lab: tap an empty tile with a card picked to place that unit there. */
  private labTap(p: Phaser.Input.Pointer) {
    // A drag (moving a unit, dragging a card) is not a tap.
    if (!this.labArmed || this.over || this.paused || p.getDistance() > 12) return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const slot = this.emptySlotAt(w.x, w.y);
    if (slot >= 0) this.labSummon(this.labArmed, slot);
  }

  /** Unit Lab: summon this specific unit onto `slot`, or a random empty tile. */
  private labSummon(id: string, slot?: number) {
    if (this.over || this.paused) return;
    if (!this.sim.summon({ id, slot })) return void sfx("error");
    this.pump();
    this.refreshHud();
  }

  private powerUp(id: string) {
    if (this.over || this.paused) return;
    if (!this.sim.powerUp(id)) return void sfx("error");
    this.pump();
    this.refreshHud();
  }

  // ---------------------------------------------------------------- tutorial

  /** The first battle teaches summon, merge and power-up before the first wave comes in. */
  private runTutorial() {
    const sim = this.sim;
    sim.tutorialHold = true;
    const cam = this.cameras.main;
    const screen = (p: Pt) => ({ x: p.x - cam.scrollX, y: p.y - cam.scrollY });
    const y = WIDE ? H - 230 : 1090;
    const [slotA, slotB] = [6, 8];
    let merged: Unit | null = null;
    let waitFor: string | null = null;
    // Mana for the next step, so an early power-up or extra summons can't leave them stuck.
    const topUp = (need: number) => sim.mana < need && sim.gainMana(need - sim.mana);
    const summonStep = (text: string, slot: number): CoachStep => {
      topUp(sim.summonCost);
      sim.tutorialPick = { id: this.deck[0], slot };
      waitFor = "summon";
      const b = this.summonBtn;
      return { text, y, point: { x: b.x, y: b.y }, r: 62 * b.scaleY + 6 };
    };
    const c = coach(
      this,
      [
        { text: "Monsters march along the path. Stop them before they reach the exit: each one that gets through costs a heart!", y, ok: "GOT IT" },
        () => summonStep("Tap SUMMON to put a unit from your deck on the board. It costs mana, and the price goes up each time.", slotA),
        () => summonStep("Nice! Summon one more.", slotB),
        () => {
          waitFor = "merge";
          return { text: "Two of the same unit with the same rank? Drag one onto the other to MERGE them.", y, drag: [screen(this.slotPos(slotA)), screen(this.slotPos(slotB))] };
        },
        () => {
          const u = merged!;
          return {
            text: "Merged! The new unit is one rank higher and hits much harder. It can turn into any card in your deck, so keep merging!",
            y,
            ok: "NEXT",
            point: screen({ x: u.sprite.x, y: u.sprite.y - 20 }),
            r: 56,
          };
        },
        () => {
          const id = merged?.def.id ?? this.deck[0];
          const card = this.deckCards.find((d) => d.id === id) ?? this.deckCards[0];
          topUp(powerUpCost(sim.powerUps[card.id]));
          waitFor = "powerup";
          const name = UNIT_BY_ID[card.id].name;
          return {
            text: `Tap a deck card to POWER UP that unit. Every ${name} on the board gets stronger for the rest of this battle.`,
            y,
            point: { x: card.root.x, y: card.root.y },
            r: 52 * card.root.scaleY + 12,
          };
        },
        { text: `Each card can be powered up ${maxPowerUp()} times (the dots on top). Earn mana by beating monsters and clearing waves. Good luck!`, y, ok: "FIGHT!" },
      ],
      (skipped) => {
        this.events.off("tutorial", on);
        sim.tutorialHold = false;
        sim.tutorialPick = null;
        // Start the first wave with the usual mana, whatever the lessons spent.
        topUp(ECONOMY.startMana);
        if (!skipped) setTutorialDone("battle");
      },
    );
    const on = (what: string, u?: Unit) => {
      if (what !== waitFor) return;
      waitFor = null;
      if (u) merged = u;
      // A beat to see the result before the next tip.
      this.time.delayedCall(what === "merge" ? 500 : 250, c.next);
    };
    this.events.on("tutorial", on);
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
    for (const u of this.units.values()) {
      if (u.awakened && !u.dragging && !u.sprite.anims.currentAnim?.key.includes("units_awakened")) u.playIdle();
    }
  }

  // ---------------------------------------------------------------- drag and drop

  private setupDrag() {
    let origin: Unit | null = null;
    // v2.2 siren song: a tap on a sleeping unit only wakes it (never a drag, merge or swap).
    let sleeper: Unit | null = null;
    let shaker: Unit | null = null;
    this.input.on("dragstart", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite & { unit?: Unit }) => {
      const u = obj.unit;
      if (!u || this.over || this.paused || !u.sprite.active) return;
      // v2.4: a lent witness can't be moved; a chained unit can't be picked up, a tap shakes its chain.
      if (u.sim.witness) return;
      if (u.sim.chain > 0) {
        shaker = u;
        return;
      }
      if (this.now < u.sim.status.asleepUntil) {
        sleeper = u;
        return;
      }
      origin = u;
      u.dragging = true;
      this.sim.setDragging(u.slot, true);
      u.setBuffVisible(false);
      obj.setDepth(2500);
      const mark = (slot: number) => {
        const p = this.slotPos(slot);
        this.highlights.push(this.add.image(p.x, p.y + 6, "ui:tile_highlight_valid").setDisplaySize(104, 104).setDepth(95));
      };
      // Princess Muse: a soft pink mark on the 3×3 square her Last Call reaches.
      if (kitPrimary(u.def) === "aura") {
        for (const s of square3(u.slot)) {
          const p = this.slotPos(s);
          this.highlights.push(this.add.image(p.x, p.y + 6, "ui:tile_highlight_valid").setDisplaySize(104, 104).setDepth(94).setTint(0xff8fd8).setAlpha(0.55));
        }
      }
      if (this.sim.locked && this.sim.canBanish(u.slot)) this.portal?.setHot(true);
      const mime = kitPrimary(u.def) === "mime" && this.sim.mimeReady(u.slot);
      const portal = kitPrimary(u.def) === "portal" && this.sim.portalReady(u.slot);
      this.sim.units.forEach((other, slot) => {
        if (!other) {
          if (portal || (this.sim.freeMove && !this.sim.fallen.has(slot))) mark(slot);
          return;
        }
        if (other === u.sim) return;
        const merges = other.def.id === u.def.id && other.rank === u.rank && u.rank < maxRank();
        if (merges || (mime && canBecome(u.sim, other)) || (portal && other.rank === u.rank)) mark(slot);
      });
    });
    this.input.on("drag", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite & { unit?: Unit }, x: number, y: number) => {
      if (obj.unit && obj.unit === origin) obj.setPosition(x, y);
    });
    this.input.on("dragend", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite & { unit?: Unit }) => {
      const u = obj.unit;
      this.highlights.forEach((h) => h.destroy());
      this.highlights = [];
      this.portal?.setHot(false);
      if (u && u === shaker) {
        shaker = null;
        if (!this.over && !this.paused && this.sim.shake(u.slot)) {
          this.floater(u.sprite.x, u.sprite.y - 70, `${u.sim.chain}`, "#e8ecff", 26);
          this.pump();
        }
        return;
      }
      if (u && u === sleeper) {
        sleeper = null;
        if (!this.over && !this.paused && this.sim.units[u.slot] === u.sim && this.sim.wake(u.slot)) this.pump();
        return;
      }
      if (!u || u !== origin) return;
      origin = null;
      u.dragging = false;
      const sim = this.sim;
      // The unit may be gone already (merged away by the Sim while held, or the battle ended).
      if (!u.sprite.active || sim.units[u.slot] !== u.sim) return;
      sim.setDragging(u.slot, false);
      const target = this.unitAt(obj.x, obj.y);
      const back = () => {
        u.place(u.slot);
        u.setBuffVisible(true);
        u.playIdle();
      };
      if (this.over) return back();
      const from = u.slot;
      const done = (ok: boolean) => {
        if (!ok) return back();
        this.pump();
        this.refreshHud();
      };
      if (this.portal?.hit(obj.x, obj.y)) {
        if (!sim.canBanish(from)) this.refuse(u, u.awakened ? "Awakened units stay" : "Can't go through");
        else done(sim.banish(from));
      } else if (target && target !== u && target.def.id === u.def.id && target.rank === u.rank && u.rank < maxRank()) {
        done(sim.merge(from, target.slot));
      } else if (target && target !== u && kitPrimary(u.def) === "mime") {
        if (!sim.mimeReady(from)) this.refuse(u, `Ready in ${Math.ceil(mimePrep(this.supportMult(u)) - u.sim.timer)}s`);
        else if (target.rank !== u.rank) this.refuse(u, `Needs ★${u.rank}`);
        else if (!canBecome(u.sim, target.sim)) this.refuse(u, target.awakened ? "Can't copy awakened" : "Can't copy support");
        else done(sim.copy(from, target.slot));
      } else if (kitPrimary(u.def) === "portal" && (target ? target !== u : this.emptySlotAt(obj.x, obj.y) >= 0)) {
        if (!sim.portalReady(from)) this.refuse(u, `Ready in ${Math.ceil(u.sim.timer)}s`);
        else if (target && target.rank !== u.rank) this.refuse(u, `Needs ★${u.rank}`);
        else done(target ? sim.swap(from, target.slot) : sim.hop(from, this.emptySlotAt(obj.x, obj.y)));
      } else if (!target && sim.freeMove && this.emptySlotAt(obj.x, obj.y) >= 0) {
        done(sim.move(from, this.emptySlotAt(obj.x, obj.y)));
      } else back();
    });
  }

  /** Nearest empty tile within reach of (x, y), or -1. */
  private emptySlotAt(x: number, y: number) {
    let best = -1;
    let bestD = 60;
    for (let s = 0; s < 15; s++) {
      if (this.sim.units[s]) continue;
      const p = this.slotPos(s);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  private unitAt(x: number, y: number) {
    let best: Unit | null = null;
    let bestD = 60;
    for (const u of this.units.values()) {
      if (u.dragging) continue;
      const p = this.slotPos(u.slot);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  /** A drop that doesn't work: back to its tile with a shake and the reason. */
  private refuse(u: Unit, why: string) {
    u.place(u.slot);
    u.setBuffVisible(true);
    u.playIdle();
    sfx("error");
    const x = u.sprite.x;
    this.tweens.add({ targets: u.sprite, x: { from: x - 10, to: x }, duration: 260, ease: "Bounce.Out" });
    this.floater(x, u.sprite.y - 80, why, "#ffb0b0", 24);
  }

  /** v2.4: hold the battle (the plea screen) or let it go on. */
  hold(on: boolean) {
    this.paused = on;
    if (!on) this.acc = 0;
  }

  /** v2.4: process the Sim's events at once (after the plea). */
  flush() {
    this.pump();
    this.refreshHud();
  }

  /** v2.4: a unit left the board (a witness, a condemned unit, a fallen tile). */
  removeUnit(uid: number) {
    this.dropUnit(uid);
  }

  /** v2.4 chapter 2: a card came back from its cell. */
  unlockCard(id: string) {
    const c = this.deckCards.find((d) => d.id === id);
    if (c) this.tweens.add({ targets: c.root, scale: c.root.scale * 1.25, yoyo: true, duration: 220 });
    this.refreshHud();
  }

  private pause() {
    if (this.over) return;
    this.paused = true;
    this.anims.pauseAll();
    const m = (this.pauseMenu = modal(this, 560, 560, "PAUSED"));
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
      this.sim.end("lost");
      this.pump();
    }));
  }

  // ---------------------------------------------------------------- loop

  update(_time: number, delta: number) {
    if (this.paused || this.over) return;
    const sim = this.sim;
    this.acc += (Math.min(delta, 50) / 1000) * this.speedMult;
    let steps = 0;
    while (this.acc >= SIM_DT && !sim.over && !this.over && !this.paused) {
      sim.step();
      this.acc -= SIM_DT;
      this.pump();
      if (++steps >= MAX_STEPS) {
        this.acc = 0;
        break;
      }
    }
    if (this.over) return;
    const ahead = this.acc;
    for (const u of this.units.values()) u.update((delta / 1000) * this.speedMult);
    for (const [uid, m] of this.monsters) {
      if (m.finished) this.monsters.delete(uid);
      else m.update(ahead);
    }
    this.updateShots(ahead);
    (this.fieldLayer ??= new FieldLayer(this)).update();
    this.updateTethers();
    this.refreshHeroButton();
    this.updateBossBar();
    this.refreshHud();
    this.tideView?.update(delta / 1000);
    this.oath?.update();
    this.tribunal?.update();
    this.portal?.update(sim);
  }

  /** Sim shots become projectile sprites: one per shot, gliding on between steps. */
  private updateShots(ahead: number) {
    const live = new Set<SimShot>(this.sim.shots);
    for (const [s, img] of this.shotImgs) {
      if (live.has(s)) continue;
      img.destroy(s.aim);
      this.shotImgs.delete(s);
    }
    for (const s of live) {
      let img = this.shotImgs.get(s);
      if (!img) {
        const def = s.unit.def;
        img = new ShotView(this, def, s.x, s.y, s.unit.berserk, !!s.focus);
        if (s.kind === "bee" && this.textures.exists("vfx:bee_swarm")) {
          img.img.setTexture("vfx:bee_swarm");
          img.img.setScale(60 / Math.max(1, img.img.width));
        }
        // Ultra Focused: an awakened Sand Monk throws spirit fists.
        if (this.fistOf(s.unit.uid) && this.textures.exists("vfx:fist_strike")) {
          img.img.setTexture("vfx:fist_strike").setVisible(true);
          img.img.setScale(60 / Math.max(1, img.img.width));
        }
        sfx("shoot", def.proj);
        this.shotImgs.set(s, img);
      }
      const dx = s.aim.x - s.x;
      const dy = s.aim.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const glide = Math.min(Math.max(0, d - 4), s.speed * ahead);
      img.move(s.x + (dx / d) * glide, s.y + (dy / d) * glide, Math.atan2(dy, dx));
      if (s.kind === "bee") img.img.setRotation(Math.sin(this.time.now / 60 + s.x) * 0.35);
      else if (img.img.texture.key === "vfx:fist_strike") img.img.setRotation(0);
    }
  }

  /** Chaos Taffy tethers, redrawn every frame. */
  private updateTethers() {
    const g = this.tethers;
    g?.clear();
    for (const t of this.sim.tethers) {
      const mp = t.monster.pos;
      g?.lineStyle(7, NAVY, 0.6).lineBetween(mp.x, mp.y, t.unit.x, t.unit.y - 30);
      g?.lineStyle(4, 0xc58bff, 0.9).lineBetween(mp.x, mp.y, t.unit.x, t.unit.y - 30);
    }
  }

  // ---------------------------------------------------------------- Sim events

  /** Handle everything the Sim reported since the last call. */
  private pump() {
    const events = this.sim.drainEvents();
    if (!events.length) return;
    this.clipped.clear();
    for (const e of events) if (e.type === "boss_stage" || e.type === "boss_power") this.clipped.add(e.uid);
    for (const e of events) {
      // Ultra Focused draws its own fist instead of the crit star.
      if (!(e.type === "bighit" && this.fistOf(e.uid))) fxEvent(this, e);
      this.handle(e);
    }
  }

  private makeUnit(uid: number, slot: number) {
    const su = this.sim.units[slot];
    if (!su || su.uid !== uid) return null;
    const u = new Unit(this, su);
    this.units.set(uid, u);
    return u;
  }

  private dropUnit(uid: number) {
    this.units.get(uid)?.destroy();
    this.units.delete(uid);
  }

  /** A unit appears on its tile (summon, merge, copy, mirror). */
  private spawnUnit(u: Unit) {
    const p = this.slotPos(u.slot);
    this.vfx("summon_circle", p.x, p.y + 20, u.awakened ? 200 : 130, 90);
    if (!u.awakened) sfx(u.rank > 1 ? "merge" : "summon");
    // Merges give a random deck unit, so once anything gets close to max rank, fetch the
    // awakened art for the whole deck in the background.
    if (u.rank >= maxRank() - 2) for (const d of this.deck) this.requestAwakenedArt(d);
    if (u.awakened) this.requestAwakenedArt(u.def.id);
    u.sprite.setScale(0);
    this.tweens.add({ targets: u.sprite, scale: u.baseScale, duration: u.awakened ? 420 : 260, ease: "Back.Out" });
    const tip = SUPPORT_TIP[kitPrimary(u.def) as SupportArch];
    if (tip && !this.sim.tutorialHold && !tipsSeen().includes(kitPrimary(u.def))) {
      markTipSeen(kitPrimary(u.def));
      this.time.delayedCall(400, () => toast(this, tip));
    }
  }

  private handle(e: SimEvent) {
    switch (e.type) {
      case "summon": {
        const u = this.makeUnit(e.uid, e.slot);
        if (!u) break;
        this.spawnUnit(u);
        this.events.emit("tutorial", "summon");
        break;
      }
      case "merge": {
        for (const g of e.gone) this.dropUnit(g);
        const u = this.makeUnit(e.uid, e.slot);
        if (!u) break;
        this.spawnUnit(u);
        this.vfx("merge_levelup", u.sprite.x, u.sprite.y - 10, 150);
        if (e.lucky) {
          this.vfx("coin_burst", u.sprite.x, u.sprite.y - 30, 150);
          for (const j of neighbours(e.slot)) if ((this.sim.units[j] && kitPrimary(this.sim.units[j]!.def)) === "lucky") this.unitInSlot(j)?.playOnce("skill");
        }
        this.events.emit("tutorial", "merge", u);
        break;
      }
      case "become": {
        this.vfx(e.why === "rank" ? "merge_levelup" : "arcane_vortex", e.x, e.y - 20, 150);
        this.dropUnit(e.gone);
        const u = this.makeUnit(e.uid, e.slot);
        if (u) this.spawnUnit(u);
        // v2.7 Big Ben ranks units up; Retribution awakens a Shield Knight.
        if (e.why === "rank") this.floater(e.x, e.y - 70, "RANK UP!", "#ffd86b", 26);
        break;
      }
      case "swap": {
        const imp = this.units.get(e.uid);
        const other = e.other === null ? null : this.units.get(e.other);
        if (imp) {
          imp.place(imp.slot);
          imp.setBuffVisible(true);
          imp.playOnce("attack");
        }
        other?.place(other.slot);
        for (const s of [e.from, e.to]) {
          const p = this.slotPos(s);
          this.vfx("shadow_smoke", p.x, p.y - 10, 130);
        }
        sfx("summon");
        break;
      }
      case "awaken": {
        sfx("awaken");
        this.vfx("merge_levelup", e.x, e.y - 20, 220);
        this.vfx("holy_heal", e.x, e.y - 10, 200);
        this.floater(e.x, e.y - 80, "AWAKENED!", "#ffd93b", 34);
        this.cameras.main.flash(180, 255, 230, 140);
        break;
      }
      case "herald_cry": {
        const herald = e.uid === null ? undefined : this.units.get(e.uid);
        herald?.playOnce("skill");
        herald?.callout("WAR CRY!", "#ff8a3b");
        for (const v of this.units.values()) if (!noAttack(kitPrimary(v.def))) this.vfx("fire_explosion", v.sprite.x, v.sprite.y - 20, 90);
        break;
      }
      case "powerup": {
        sfx("powerup");
        for (const u of this.units.values()) {
          if (u.def.id !== e.id) continue;
          this.vfx("merge_levelup", u.sprite.x, u.sprite.y - 20, 110);
          u.playOnce("skill");
        }
        this.events.emit("tutorial", "powerup");
        break;
      }
      case "wave": {
        // v2.3: a scripted cutscene before the wave (the Colossus forms).
        const cut = this.story?.chapter.waves[e.wave - 1]?.cutscene;
        if (cut?.length) {
          this.paused = true;
          storyPanels(this, cut, () => {
            this.paused = false;
            this.acc = 0;
          });
        }
        if (e.boss) {
          this.showBanner(e.banner, true, e.boss, e.sub ?? undefined);
          sfx("boss");
          music("boss");
        } else {
          this.showBanner(e.banner);
          sfx("wave");
        }
        break;
      }
      case "spawn": {
        const sm = this.sim.monsters.find((m) => m.uid === e.uid);
        if (!sm) break;
        const corruption = this.story?.chapter.corruption ?? 0;
        // Corrupted bosses glow violet; the tint is the chapter's corruption.
        const corrupted = !!sm.boss?.corrupted;
        const m = new Monster(this, sm, corrupted ? Math.max(0.3, corruption) : corruption);
        if (corrupted) m.sprite.preFX?.addGlow(0x9b4dff, 4, 0, false, 0.1, 12);
        // Ondrath's barnacle clusters: a pulsing violet growth (drawn with the Barnacle Spawn art).
        if (sm.id === "barnacle_cluster") {
          m.sprite.preFX?.addGlow(0xd17dff, 6, 0, false, 0.1, 14);
          m.sprite.setTint(0xc89bff);
        }
        // Corvaline's lantern: a violet flame (drawn with the Fire Wisp art).
        if (sm.id === "corvaline_lantern") {
          m.sprite.preFX?.addGlow(0xb070ff, 8, 0, false, 0.1, 16);
          m.sprite.setTint(0xd8b0ff);
        }
        this.monsters.set(e.uid, m);
        break;
      }
      case "kill": {
        this.monsters.get(e.uid)?.die();
        if (!e.boss) sfx("die");
        else {
          sfx("boss_die");
          music("battle");
          if (!this.story?.chapter.mechanics?.shell) this.floater(e.x, e.y - 40, "BOSS DEFEATED!", "#ffd93b", 40);
          this.vfx("coin_burst", e.x, e.y, 220);
        }
        if (MONSTER_BY_ID[e.id]?.traits.includes("rich")) this.vfx("coin_burst", e.x, e.y, 120);
        break;
      }
      case "leak": {
        this.monsters.get(e.uid)?.remove();
        this.cameras.main.shake(250, 0.008);
        sfx("hurt");
        this.cameras.main.flash(200, 255, 40, 40);
        break;
      }
      case "boss_stage": {
        const m = this.monsters.get(e.uid);
        if (e.power === "split") {
          this.floater(e.x, e.y - 60, "SPLIT!", "#b8ffb0", 32);
          this.vfx("poison_cloud", e.x, e.y, 200);
        } else if (e.power === "portal") {
          // Blink forward once a phase.
          this.vfx("shadow_smoke", e.x, e.y, 220);
          const at = m?.sim.pos ?? e;
          this.vfx("arcane_vortex", at.x, at.y, 220);
          this.floater(at.x, at.y - 60, "BLINK!", "#c58bff", 32);
        } else {
          // A Jawbreaker layer breaks: units are shaken, it sheds, speeds up and releases chaos-born.
          this.cameras.main.shake(300, 0.012);
          this.floater(e.x, e.y - 70, e.text, "#ffd93b", 34);
          this.vfx("hit_impact", e.x, e.y, 260);
          if (e.stage >= 3) m?.playBoss(animKey("bosses", `${sheetId("bosses", e.id)}_crack`));
        }
        break;
      }
      case "boss_power": {
        const portal = animKey("bosses", `${sheetId("bosses", e.id)}_portal`);
        this.monsters.get(e.uid)?.playBoss(e.power === "portal" && this.anims.exists(portal) ? portal : animKey("bosses", `${sheetId("bosses", e.id)}_attack`));
        const { x, y } = e;
        switch (e.power) {
          case "charm":
            this.floater(x, y - 60, "CHARM", "#ff9ae6", 32);
            this.vfx("arcane_vortex", x, y, 200);
            break;
          case "roar":
            if (e.text === "ROAR!") {
              this.cameras.main.shake(400, 0.014);
              this.floater(x, y - 70, "ROAR!", "#ff8a3b", 40);
            } else {
              this.vfx("fire_explosion", x, y, 200);
              this.floater(x, y - 60, "RAGE", "#ff8a3b", 32);
            }
            break;
          case "layers":
            this.floater(x, y - 70, "CHAOS PULSE", "#c58bff", 34);
            this.vfx("arcane_vortex", x, y, 280);
            break;
          case "summon":
            this.vfx("summon_circle", x, y + 40, 200, 90);
            break;
          case "heal":
            this.vfx("holy_heal", x, y, 220);
            this.floater(x, y - 60, "HEAL", "#7dff7a", 32);
            break;
          case "haste":
            this.vfx("fire_explosion", x, y, 200);
            this.floater(x, y - 60, "RAGE", "#ff8a3b", 32);
            break;
          case "shield":
            this.vfx("arcane_vortex", x, y, 230);
            this.floater(x, y - 60, "SHIELD", "#9fb4ff", 32);
            break;
          case "teleport": {
            this.vfx("shadow_smoke", x, y, 220);
            const at = this.monsters.get(e.uid)?.sim.pos;
            if (at) this.vfx("shadow_smoke", at.x, at.y, 220);
            break;
          }
        }
        break;
      }
      case "split": {
        // The layers boss's minion phase has no power event of its own: it still plays its attack clip.
        if (e.kind === "boss" && !this.clipped.has(e.uid)) {
          this.clipped.add(e.uid);
          const m = this.monsters.get(e.uid);
          m?.playBoss(animKey("bosses", `${m.id}_attack`));
        }
        break;
      }
      case "portal": {
        // A portal opens further along the path and minions step out of it.
        const ring = this.add.graphics().setPosition(e.x, e.y).setDepth(90 + e.y + 20);
        ring.fillStyle(0x6a2bbf, 0.5).fillEllipse(0, 0, 130, 54).lineStyle(6, 0xc58bff, 1).strokeEllipse(0, 0, 130, 54);
        ring.setScale(0.2);
        this.tweens.add({ targets: ring, scale: 1, duration: 300, ease: "Back.Out" });
        this.tweens.add({ targets: ring, alpha: 0, delay: 2200, duration: 400, onComplete: () => ring.destroy() });
        this.vfx("summon_circle", e.x, e.y + 20, 170, 90 + e.y + 20);
        break;
      }
      case "bark":
        this.bark(e);
        break;
      case "rally":
        this.rally(e);
        break;
      case "reveal":
        this.reveal(e);
        break;
      case "tide":
      case "pool":
      case "isle":
      case "shell":
      case "cleanse":
      case "hooked":
      case "sleep":
      case "beam":
        this.tideView?.handle(e);
        break;
      case "lantern":
        if (!e.lit) this.monsters.get(e.uid)?.remove();
        this.tideView?.handle(e);
        break;
      case "plea":
      case "pleaed":
      case "law":
      case "jail":
      case "shackle":
      case "cell":
      case "crush":
      case "collapse":
      case "sentence":
        this.tribunal?.handle(e);
        break;
      case "unit_gone":
        if (e.why !== "portal") {
          this.tribunal?.handle(e);
          break;
        }
        this.removeUnit(e.uid);
        this.vfx("arcane_vortex", this.portal?.x ?? e.x, this.portal?.y ?? e.y, 190);
        this.floater(this.portal?.x ?? e.x, (this.portal?.y ?? e.y) - 80, `+${e.mana}`, "#c9a8ff", 30);
        this.portal?.swallow();
        sfx("summon");
        break;
      case "family":
      case "dive":
      case "rune":
      case "part":
      case "absorb":
        this.oath?.handle(e);
        break;
      case "brazier":
      case "unmask":
      case "civilian":
      case "chain":
      case "cage":
      case "roar":
      case "burrow":
      case "equal":
        this.faceless?.handle(e);
        break;
      case "boss_skill": {
        this.monsters.get(e.uid)?.playBoss(animKey("bosses", `${sheetId("bosses", e.id)}_attack`));
        const color = e.skill === "entangle" ? "#8dff7a" : e.skill === "volley" ? "#ffd27a" : "#c58bff";
        this.floater(e.x, e.y - 70, e.text, color, 34);
        if (e.skill === "entangle") this.vfx("aura_nature", e.x, e.y, 240);
        else if (e.skill === "impale") this.vfx("ground_crater", e.x, e.y + 20, 200);
        break;
      }
      case "mana": {
        if (e.source === "harvest") for (const u of this.units.values()) if (kitPrimary(u.def) === "brewer") u.playOnce("skill");
        if (e.source === "pulse" && e.x !== null && e.y !== null) this.unitNear(e.x, e.y + 50)?.playOnce("skill");
        if (e.x === null || e.y === null) break;
        if (e.source === "hero") {
          this.floater(ARENA_W / 2, 640, `+${e.amount} MANA`, "#7fd8ff", 48);
          this.vfx("coin_burst", ARENA_W / 2, 680, 260);
        } else this.floater(e.x, e.y, `+${e.amount}`, "#7fd8ff", 22);
        sfx("coin");
        break;
      }
      case "wages":
        if (e.paid) this.floater(e.x, e.y, `-${e.cost}`, "#ffb0b0", 22);
        break;
      case "callout": {
        if (e.kind === "block" || e.kind === "dodge") this.floater(e.x, e.y, e.text, e.color, 20);
        else if (e.kind === "miss") this.floater(e.x, e.y, e.text, e.color, 22);
        else if (e.uid !== null) this.units.get(e.uid)?.callout(e.text, e.color);
        break;
      }
      case "afflict":
        if (e.kind === "shellshock") this.vfx("lightning_strike", e.x, e.y, 90);
        else if (e.kind === "irritation") this.vfx("arcane_vortex", e.x, e.y + 10, 110);
        else if (e.kind === "entangle") this.vfx("status_rooted", e.x, e.y + 30, 130);
        break;
      case "hero":
        this.heroEffects(e.power);
        break;
      case "ultimate": {
        const u = this.units.get(e.uid);
        u?.playOnce("skill");
        if (e.kind === "special") {
          // v2.7 Star Merger: the absorbed astronomers leave the board.
          if (e.ult === "star_merger") for (const g of e.targets ?? []) this.dropUnit(g);
          playUltimate(this, e, u?.sprite);
          break;
        }
        sfx("ultimate");
        const from = { x: u?.sprite.x ?? e.x, y: (u?.sprite.y ?? e.y) - 30 };
        if (e.kind === "mana") {
          this.vfx("coin_burst", from.x, from.y, 160);
          break;
        }
        const ring = this.add.graphics().setDepth(2060).setPosition(e.x, e.y);
        ring.lineStyle(10, NAVY, 0.7).strokeCircle(0, 0, e.radius);
        ring.lineStyle(6, 0xffd93b, 1).strokeCircle(0, 0, e.radius);
        ring.setScale(0.2);
        this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, ease: "Cubic.Out", onComplete: () => ring.destroy() });
        const beam = this.add.graphics().setDepth(2050);
        this.zigzag(beam, from, e, 0xffd93b);
        this.tweens.add({ targets: beam, alpha: 0, duration: 260, onComplete: () => beam.destroy() });
        if (u) this.vfx(HIT_VFX[u.def.element], e.x, e.y, e.radius * 1.6);
        this.floater(e.x, e.y - 70, "ULTIMATE!", "#ffd93b", 30);
        break;
      }
      case "encore": {
        for (const u of this.units.values()) if (kitPrimary(u.def) === "echo") u.playOnce("attack");
        if (e.ult) {
          // The recast emits its own "ultimate" event (drawn there); only mark it as an encore.
          this.floater(e.x, e.y - 110, "ENCORE!", "#9ff0ff", 24);
          break;
        }
        this.floater(e.x, e.y - 70, "ENCORE!", "#9ff0ff", 28);
        if (!e.strike) break;
        const ring = this.add.graphics().setDepth(2060).setPosition(e.x, e.y);
        ring.lineStyle(6, 0x9ff0ff, 1).strokeCircle(0, 0, e.radius).setScale(0.2);
        this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, ease: "Cubic.Out", onComplete: () => ring.destroy() });
        this.vfx("ice_burst", e.x, e.y, e.radius * 1.4);
        break;
      }
      case "shot_lost":
        this.vfx("hit_impact", e.x, e.y, 50);
        break;
      case "brew":
        this.brewBubble(e.bubble, e.x, e.y);
        break;
      case "brew_collect": {
        const orb = this.bubbleImgs.get(e.bubble);
        this.bubbleImgs.delete(e.bubble);
        if (!orb) break;
        if (e.tapped) this.vfx("coin_burst", orb.x, orb.y, 90);
        orb.disableInteractive();
        this.tweens.add({ targets: orb, scale: orb.scale * 1.6, alpha: 0, duration: 200, onComplete: () => orb.destroy() });
        break;
      }
      case "hit": {
        this.monsters.get(e.target)?.flash();
        if (e.kind === "main" && this.units.get(e.uid)?.sim.bossBonus && this.monsters.get(e.target)?.sim.boss && (this.iceAt.get(e.uid) ?? 0) <= this.time.now) {
          this.iceAt.set(e.uid, this.time.now + 250);
          icebornHit(this, e.x, e.y);
        }
        if (e.kind === "main") {
          if (!fxHit(this, e)) this.vfx(HIT_VFX[e.element], e.x, e.y, e.size);
          sfx("hit", e.element);
        } else if (e.kind === "pierce") {
          if (!fxHit(this, e)) this.vfx("hit_impact", e.x, e.y, e.size);
        } else if (e.kind === "chain") {
          if (!fxHit(this, e)) this.vfx("lightning_strike", e.x, e.y, e.size);
        }
        break;
      }
      case "bighit":
        this.monsters.get(e.target)?.flash();
        if (this.fistOf(e.uid)) fistStrike(this, e.x, e.y + 14);
        this.critFloater(e.x, e.y, fmt(e.dmg) + "!", e.color);
        break;
      case "proc":
        if (e.kind === "frozen") {
          this.floater(e.x, e.y, "FROZEN", "#7fd8ff", 22);
          sfx("freeze");
        } else if (e.kind === "stun") this.floater(e.x, e.y, "STUN", "#ffd93b", 22);
        else this.floater(e.x, e.y, "EXECUTE", "#ff7ad9", 26);
        break;
      case "zap": {
        const color = Phaser.Display.Color.HexStringToColor(e.color).color;
        const g = this.add.graphics().setDepth(e.kind === "storm" ? 2050 : 2050);
        if (e.kind === "storm") {
          this.zigzag(g, { x: e.x + (Math.random() - 0.5) * 120, y: e.y }, { x: e.x2, y: e.y2 }, color);
          this.vfx("arcane_vortex", e.x2, e.y2, 110);
          sfx("zap");
        } else {
          this.zigzag(g, { x: e.x, y: e.y }, { x: e.x2, y: e.y2 }, color);
          if (e.kind === "chain" && e.n === 0) sfx("zap");
          if (e.color === MJOLNIR_COLOR) {
            if (e.n === 0) mjolnirBolt(this, e.x, e.y);
            this.vfx("lightning_strike", e.x2, e.y2, 90);
          }
        }
        this.tweens.add({ targets: g, alpha: 0, duration: e.kind === "storm" ? 200 : 220, onComplete: () => g.destroy() });
        break;
      }
      case "heal_pulse":
        this.vfx("holy_heal", e.x, e.y, 120);
        break;
      case "end":
        this.endGame(e.why ?? undefined, e.outcome === "won");
        break;
    }
  }

  /** The unit standing closest to (x, y), within a tile. */
  private unitNear(x: number, y: number) {
    let best: Unit | null = null;
    let bestD = 60;
    for (const u of this.units.values()) {
      const d = Math.hypot(u.sprite.x - x, u.sprite.y - y);
      if (d < bestD) [best, bestD] = [u, d];
    }
    return best;
  }

  /** Monsters a hero power just touched: on the field now, or killed by it this very instant. */
  private heroTargets() {
    const now = this.sim.now;
    return [...this.monsters.values()].filter((m) => m.sim.intro <= 0 && (!m.dead || m.diedAt >= now - 1e-6));
  }

  /** The hero's cast: sound, banner, skill clip and the power's effect on the field. */
  private heroEffects(power: HeroDef["power"]) {
    const h = this.hero;
    if (!h) return;
    sfx("hero");
    this.heroCastAnim(h);
    const targets = this.heroTargets();
    const units = [...this.units.values()];
    switch (power) {
      case "meteor":
        this.cameras.main.shake(300, 0.01);
        for (const m of targets) this.vfx("shadow_smoke", m.pos.x, m.pos.y, 170);
        break;
      case "freeze":
        sfx("freeze");
        for (const m of targets) this.vfx("ice_burst", m.pos.x, m.pos.y, 140);
        break;
      case "slow":
        for (const m of targets) this.vfx("poison_cloud", m.pos.x, m.pos.y, 130);
        break;
      case "haste":
        for (const u of units) this.vfx("lightning_strike", u.sprite.x, u.sprite.y - 20, 110);
        break;
      case "rage":
        for (const u of units) this.vfx("fire_explosion", u.sprite.x, u.sprite.y - 20, 110);
        break;
      case "knockback":
        this.cameras.main.shake(250, 0.006);
        for (const m of targets) {
          this.vfx("hit_impact", m.pos.x, m.pos.y, 120);
          this.vfx("shadow_smoke", m.pos.x, m.pos.y, 120);
        }
        break;
    }
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

  /** Whether a big hit came from an awakened Sand Monk (Ultra Focused). */
  private fistOf(uid?: number) {
    const u = uid === undefined ? undefined : this.units.get(uid);
    return !!u?.awakened && u.sim.def.id === "sand_monk";
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

  /** A Gnome Brewer's mana bubble: tap it for a bonus, or the Sim pops it by itself. */
  private brewBubble(id: number, x: number, y: number) {
    const orb = this.add.image(x, y, "item:mana_orb").setDisplaySize(10, 10).setDepth(2400);
    this.tweens.add({ targets: orb, displayWidth: 50, displayHeight: 50, y: y - 28, duration: 260, ease: "Back.Out" });
    orb.setInteractive({ useHandCursor: true });
    orb.on("pointerdown", () => {
      if (this.over || this.paused) return;
      if (this.sim.collectBrew(id)) this.pump();
    });
    this.bubbleImgs.set(id, orb);
  }

  /** A story speech bubble over the arena: the speaker's portrait and a line. */
  /**
   * v2.1 story rally (BossRally): the battle holds while the wave's `before` panels play, the allies
   * charge down the path and shove the boss back to the start, then the `after` panels; it resumes.
   * The Sim already moved and hurt the boss, so this is only the show.
   */
  private rally(e: Extract<SimEvent, { type: "rally" }>) {
    const cut = this.story?.chapter.waves[this.sim.wave - 1]?.rally;
    const boss = this.monsters.get(e.uid);
    const path = this.sim.boss?.path;
    this.paused = true;
    const resume = () => {
      this.paused = false;
      this.acc = 0;
    };
    const charge = () => {
      if (!path || !boss) return storyPanels(this, cut?.after ?? [], resume);
      const allies = cut?.allies.length ? cut.allies : ["ally"];
      const end = path.length;
      const fromDist = Math.min(end, Math.max(0, end * (this.sim.boss!.boss?.rally?.at ?? 0.8)));
      this.cameras.main.shake(300, 0.006);
      for (let i = 0; i < 40; i++) {
        const id = allies[i % allies.length];
        const key = `story_ally:${id}`;
        const spr: Phaser.GameObjects.Image | Phaser.GameObjects.Arc = this.textures.exists(key)
          ? this.add.image(0, 0, key).setDisplaySize(96, 96).setOrigin(0.5, 0.85).setFlipX(true)
          : this.add.circle(0, 0, 22, 0x7dff7a, 0.9);
        const lane = ((i % 5) - 2) * 14;
        const t = { d: end };
        const place = () => {
          const p = path.at(t.d);
          spr.setPosition(p.x + lane, p.y + lane * 0.5).setDepth(100 + p.y);
        };
        place();
        spr.setAlpha(0);
        this.tweens.add({ targets: spr, alpha: 1, duration: 150, delay: i * 55 });
        this.tweens.add({
          targets: t, d: 0, duration: 1900, delay: i * 55, ease: "Sine.In", onUpdate: place,
          onComplete: () => this.tweens.add({ targets: spr, alpha: 0, duration: 250, onComplete: () => spr.destroy() }),
        });
      }
      // The boss is caught by the front of the charge and shoved back with it.
      const b = { d: fromDist };
      this.tweens.add({
        targets: b, d: 0, delay: 500, duration: 1700, ease: "Cubic.Out",
        onUpdate: () => {
          const p = path.at(b.d);
          boss.sprite.setPosition(p.x, p.y).setDepth(100 + p.y);
        },
        onComplete: () => {
          this.cameras.main.shake(400, 0.014);
          this.floater(e.to.x, e.to.y - 120, `-${fmt(Math.round(e.damage))}`, "#ff6b6b", 46);
          this.vfx("impact_nature", e.to.x, e.to.y - 40, 260);
          this.time.delayedCall(900, () => storyPanels(this, cut?.after ?? [], resume));
        },
      });
    };
    storyPanels(this, cut?.before ?? [], charge);
  }

  /** v2.2 scripted reveal (StoryWave.reveal): the battle holds for the wave's reveal panels, then resumes (the boss is already stunned). */
  private reveal(e: Extract<SimEvent, { type: "reveal" }>) {
    const panels = this.story?.chapter.waves[this.sim.wave - 1]?.reveal?.panels ?? [];
    const boss = this.monsters.get(e.uid);
    if (boss) this.vfx("arcane_vortex", boss.pos.x, boss.pos.y, 220);
    this.paused = true;
    storyPanels(this, panels, () => {
      this.paused = false;
      this.acc = 0;
    });
  }

  private bark(line: { who: string; text: string }) {
    const key = UNIT_BY_ID[line.who] ? `portrait:${line.who}` : `story_portrait:${line.who}`;
    const w = 620;
    const g = this.add.graphics();
    g.fillStyle(NAVY, 0.92).fillRoundedRect(-w / 2, -58, w, 116, 22).lineStyle(4, 0xffd27a, 1).strokeRoundedRect(-w / 2, -58, w, 116, 22);
    const parts: Phaser.GameObjects.GameObject[] = [g];
    if (this.textures.exists(key)) parts.push(this.add.image(-w / 2 + 62, 0, key).setDisplaySize(96, 96));
    const name = UNIT_BY_ID[line.who]?.name ?? line.who.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    parts.push(txt(this, -w / 2 + 124, -30, name, 22, "#ffd27a", [0, 0.5]));
    parts.push(txt(this, -w / 2 + 124, 12, line.text, 24, "#ffffff", [0, 0.5]).setWordWrapWidth(w - 150));
    const c = this.add.container(ARENA_W / 2, 200, parts).setDepth(2850).setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, y: 180, duration: 250, ease: "Back.Out" });
    this.tweens.add({ targets: c, alpha: 0, delay: 3600, duration: 300, onComplete: () => c.destroy() });
  }

  private showBanner(text: string, boss = false, bossId?: string, sub?: string) {
    if (boss && bossId && this.textures.exists(`boss_banner:${bossId}`)) return this.bossCard(bossId, text, sub);
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (boss) {
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

  /** The boss arrival card: dimmed arena, framed art cropped to fill, a BOSS ribbon and a name plate. */
  private bossCard(bossId: string, text: string, sub?: string) {
    const name = BOSS_BY_ID[bossId]?.name ?? text.replace(/^BOSS:\s*/i, "");
    const cw = 600, ch = 470, iw = 560, ih = 300, iy = -70;
    const dim = this.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0x000000, 0.5).setDepth(2799).setAlpha(0);

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.45).fillRoundedRect(-cw / 2 + 6, -ch / 2 + 10, cw, ch, 26);
    g.fillStyle(0x2a0f18, 0.97).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 26);
    g.lineStyle(6, 0xc23a3a, 1).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 26);
    g.lineStyle(2, 0xffd27a, 0.9).strokeRoundedRect(-cw / 2 + 9, -ch / 2 + 9, cw - 18, ch - 18, 20);

    // Cover-fit the art into the window, cropping the overflow instead of letterboxing.
    const img = this.add.image(0, iy, `boss_banner:${bossId}`);
    const s = Math.max(iw / img.width, ih / img.height);
    const cropW = iw / s, cropH = ih / s;
    img.setCrop((img.width - cropW) / 2, (img.height - cropH) / 2, cropW, cropH).setScale(s);
    const frame = this.add.graphics();
    frame.lineStyle(4, 0xffd27a, 1).strokeRect(-iw / 2, iy - ih / 2, iw, ih);

    // Red "BOSS" ribbon over the top edge.
    const rib = this.add.graphics();
    rib.fillStyle(0xc23a3a, 1).fillRoundedRect(-90, -ch / 2 - 22, 180, 44, 14);
    rib.lineStyle(3, 0xffd27a, 1).strokeRoundedRect(-90, -ch / 2 - 22, 180, 44, 14);
    const ribText = txt(this, 0, -ch / 2, "BOSS", 30, "#fff4c2");

    const nameY = iy + ih / 2 + 52;
    const nameText = txt(this, 0, nameY, name, 44, "#ffd27a");
    const parts: Phaser.GameObjects.GameObject[] = [g, img, frame, rib, ribText, nameText];
    if (sub) {
      const pill = this.add.graphics();
      const pw = Math.max(160, sub.length * 16 + 48);
      pill.fillStyle(0x000000, 0.4).fillRoundedRect(-pw / 2, nameY + 34, pw, 36, 18);
      parts.push(pill, txt(this, 0, nameY + 52, sub, 22, "#ffd0d0"));
    }

    const c = this.add.container(ARENA_W / 2, 470, parts).setDepth(2800).setAlpha(0).setScale(0.7);
    this.tweens.add({ targets: dim, alpha: 1, duration: 250 });
    this.tweens.add({
      targets: c,
      alpha: 1,
      scale: 1,
      duration: 320,
      ease: "Back.Out",
      onComplete: () => {
        this.tweens.add({ targets: dim, alpha: 0, delay: 1600, duration: 300, onComplete: () => dim.destroy() });
        this.tweens.add({ targets: c, alpha: 0, y: 420, delay: 1600, duration: 300, onComplete: () => c.destroy() });
      },
    });
  }

  // ---------------------------------------------------------------- end

  /** `why`: shown under the headline when the battle didn't end by itself. `won`: a story chapter was won. */
  private endGame(why?: string, won = false) {
    if (this.over) return;
    this.over = true;
    this.pauseMenu = null;
    releasePlay();
    const sim = this.sim;
    // Left mid-tutorial (surrendered): it still only runs once.
    if (sim.tutorialHold && !this.lab) setTutorialDone("battle");
    music(null);
    const c = sim.counts;
    const stats = {
      wave: sim.wave,
      kills: sim.kills,
      bosses: c.bossesKilled,
      summons: c.summons,
      merges: c.merges,
      awakens: c.awakens,
      heroCasts: c.heroCasts,
      copies: c.copies,
      swaps: c.swaps,
      brewed: c.brewed,
    };
    if (this.story) {
      const story = this.story;
      const lives = sim.lives;
      const objectives = sim.result().objectives ?? undefined;
      const result: Promise<StoryResult | null> = this.battleId
        .then((id) => (id === null ? null : finishStory(id, { ...stats, won, lives, ...(won && objectives ? { objectives } : {}) })))
        .catch(() => null);
      if (won) {
        sfx("win");
        const victory = this.hero && animKey("heroes", `${this.hero.id}_victory`);
        if (victory && this.heroSprite && this.anims.exists(victory)) this.heroSprite.play({ key: victory, repeat: -1 });
        this.floater(ARENA_W / 2, 600, "VICTORY!", "#ffd93b", 72);
      }
      this.time.delayedCall(won ? 1200 : 500, () =>
        storyResult(this, { story: story.def, chapter: story.chapter, won, why, stars: won ? sim.stars ?? 0 : 0, wave: stats.wave, result, objectives }),
      );
      return;
    }
    if (this.lab) {
      this.time.delayedCall(500, () => {
        const m = modal(this, 600, 520, "");
        m.add(txt(this, m.cx, m.cy - 150, "LAB OVER", 44, "#ffd27a"));
        m.add(txt(this, m.cx, m.cy - 80, `Wave ${stats.wave}  ·  ${stats.kills} kills`, 32, "#fff4c2"));
        if (why) m.add(txt(this, m.cx, m.cy - 30, why, 24, "#c9d2ff"));
        m.add(button(this, m.cx, m.cy + 70, 360, 96, "AGAIN", "green", () => this.scene.restart()));
        m.add(button(this, m.cx, m.cy + 190, 360, 96, "BACK TO LAB", "blue", () => this.scene.start("Lab")));
      });
      return;
    }
    const doneBefore = new Set(profile.daily.quests.filter(questDone).map((q) => q.id));
    const leagueBefore = playerLeague(profile);
    const result: Promise<BattleResult | null> = this.battleId
      .then((id) => (id === null ? null : finishBattle(id, stats)))
      .catch(() => null);

    this.time.delayedCall(500, () => {
      const m = modal(this, 600, 900, "");
      const banner = this.add.image(m.cx, m.cy - 300, "ui:banner_defeat");
      banner.setScale(460 / banner.width);
      const headline = txt(this, m.cx, m.cy - 290, "GAME OVER", 40);
      m.add([banner, headline]);
      if (why) m.add(txt(this, m.cx, m.cy - 212, why, 24, "#ffd27a"));
      m.add(txt(this, m.cx, m.cy - 150, `Wave ${stats.wave}`, 64, "#fff4c2"));
      m.add(txt(this, m.cx, m.cy - 100, `${stats.kills} monsters  ·  ${stats.bosses} bosses`, 26, "#c9d2ff"));
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
          rewardRays(this, m, m.cx, m.cy - 300, 620, banner, 0.5);
          rewardPop(this, m, "star_burst", m.cx, m.cy - 300, 360, { life: 900, from: 0.4, add: true });
        }
        const best = profile.arenaBest?.[this.arena.id] ?? stats.wave;
        m.add(txt(this, m.cx, m.cy - 62, r.newBest ? `New record in ${this.arena.name}!` : `Best in ${this.arena.name}: wave ${best}`, 22, r.newBest ? "#7dff7a" : "#ffd27a"));
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
        // v2.9: why the trophies went the way they did.
        const tr = r.trophyRules;
        if (tr) {
          const note = !tr.counts ? "No trophies in this arena" : stats.wave < tr.minWave ? `Short of wave ${tr.minWave}` : `Past wave ${tr.minWave}`;
          m.add(txt(this, m.cx - 30, m.cy + 203, note, 18, tr.counts && stats.wave >= tr.minWave ? "#c9d2ff" : "#ff8080", [0, 0.5]));
        }
        // Daily quests this run finished (claimed from the lobby).
        const finished = profile.daily.quests.filter((q) => questDone(q) && !doneBefore.has(q.id)).map((q) => questById(q.id)!);
        if (finished.length) {
          const more = finished.length > 1 ? `  (+${finished.length - 1} more)` : "";
          m.add(txt(this, m.cx, m.cy + 232, `Quest complete: ${questText(finished[0])}${more}`, 24, "#7dff7a").setWordWrapWidth(540));
          sfx("upgrade");
        }
        // League change: promoted (with rewards to show) or dropped back down.
        const league = playerLeague(profile);
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
