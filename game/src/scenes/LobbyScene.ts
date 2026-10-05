import Phaser from "phaser";
import { BASE, ICON } from "../assets";
import { ARENAS, ARENA_BY_ID, arenaForTrophies, type ArenaDef } from "../data/arenas";
import { profile, account, mail, setArena, signOut, loadMe, loadInbox, serverNow } from "../save";
import { storyIsNew } from "../../../shared/profile.ts";
import { BOOK, chapterWon, storyFinished, storyLock, type StoryDef } from "../../../shared/stories.ts";
import { loadStoryImages } from "./storyUi";
import { activeEvents, msLeft, shortDuration, timeOf } from "../../../shared/offers.ts";
import { utcDay } from "../../../shared/daily.ts";
import { dailyCounts, loginModal, questsModal } from "./daily";
import { leagueBadge, leagueModal } from "./leagues";
import { inboxModal, mailIcon } from "./inbox";
import { leagueFor } from "../../../shared/leagues.ts";
import { showAuth } from "../authOverlay";
import { claimPlay, releasePlay } from "../play";
import { music } from "../audio";
import { bakeAll } from "../bake";
import { pointAt, tutorialDue } from "../tutorial";
import { ambientVideo, coverFit } from "../backdrop";
import { arenaInfo } from "./arenaInfo";
import { whatsNew } from "./whatsNew";
import { audioButtons, W, H, WIDE, txt, button, iconButton, resourcePill, cardView, fmt, NAVY, modal, pressable, badge, onSwipe, toast, ornateFrame } from "../ui";
import { sfx } from "../audio";

/** The login reward pops up by itself once per session. */
let loginShown = false;
/** Day we last re-fetched the profile for (quests roll over at UTC midnight). */
let refreshedFor = "";

/** The lobby carousel's pages: the arenas, then the story books. */
type Mode = "arena" | "story";
const MODES: Mode[] = ["arena", "story"];
let mode: Mode = "arena";
/** Whether the mode card is open (its arenas or books showing) rather than the ARENA / STORIES cards. */
let opened = false;
/** The middle of the carousel card. */
const CARD_Y = WIDE ? 680 : 790;
/** The book (story) showing on the Stories page; -1 picks the one the player is on. */
let bookIdx = -1;

/** The story to show first: the first one not finished yet (or the last one). */
function currentStory() {
  const i = BOOK.stories.findIndex((s) => !storyFinished(profile.story, s));
  return i < 0 ? BOOK.stories.length - 1 : i;
}

const storyStars = (s: StoryDef) => s.chapters.reduce((n, c) => n + (profile.story.chapters[c.id]?.stars ?? 0), 0);

/** Full-screen background that covers the canvas, with its ambient loop on top if it has one. */
export function cover(scene: Phaser.Scene, key: string, dim = 0, loop?: string) {
  const bg = scene.add.image(W / 2, H / 2, key);
  bg.setScale(Math.max(W / bg.width, H / bg.height));
  if (loop) ambientVideo(scene, loop, coverFit(W, H));
  if (dim) scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, dim);
  return bg;
}

export function topBar(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(NAVY, 0.6).fillRect(0, 0, W, 76);
  // Right-aligned on wide screens, spread across the top on phones.
  const x0 = WIDE ? W - 820 : 0;
  const coins = resourcePill(scene, x0 + 120, 38, "item:coins", fmt(profile.coins), 200);
  const gems = resourcePill(scene, x0 + 350, 38, "item:gems", fmt(profile.gems), 180);
  resourcePill(scene, x0 + 580, 38, "item:trophy", fmt(profile.trophies), 190);
  // League badge in the corner; tap it for the leagues list.
  pressable(leagueBadge(scene, W - 46, 38, 66, leagueFor(profile.trophies)), () => leagueModal(scene));
  /** Re-read coins and gems after spending without rebuilding the scene. */
  return { refresh: () => (coins.text.setText(fmt(profile.coins)), gems.text.setText(fmt(profile.gems))) };
}

/** The running event (soonest to end), as a pill in the top bar (wide) or above the shop button (phone). Tap for the shop. */
function eventStrip(scene: Phaser.Scene) {
  const live = activeEvents(serverNow()).sort((a, b) => timeOf(a.endsAt) - timeOf(b.endsAt));
  if (!live.length) return;
  const e = live[0];
  const w = WIDE ? Math.min(640, W - 900) : 470;
  const h = 58;
  const g = scene.add.graphics();
  g.fillStyle(0x5a1f3a, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(3, 0xd9a441, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  const star = scene.add.image(-w / 2 + 34, 0, "item:star_shard").setDisplaySize(52, 52);
  const name = txt(scene, -w / 2 + 68, 0, e.name.toUpperCase() + (live.length > 1 ? ` +${live.length - 1}` : ""), 24, "#ffd77a", [0, 0.5]);
  const left = txt(scene, w / 2 - 22, 0, "", 22, "#ffb3e6", [1, 0.5]);
  const c = scene.add.container(WIDE ? 24 + w / 2 : W / 2, WIDE ? 38 : 1442, [g, star, name, left]).setSize(w, h);
  scene.tweens.add({ targets: star, angle: { from: -10, to: 10 }, yoyo: true, repeat: -1, duration: 900, ease: "Sine.InOut" });
  const tick = () => {
    const ms = msLeft(timeOf(e.endsAt), serverNow()) ?? 0;
    if (ms <= 0) return void c.destroy();
    left.setText(shortDuration(ms));
    // Shorten a long name so it doesn't run into the time.
    const room = w - 100 - left.width;
    while (name.width > room && name.text.length > 4) name.setText(name.text.slice(0, -2) + "…");
  };
  tick();
  scene.time.addEvent({ delay: 15_000, loop: true, callback: tick });
  pressable(c, () => scene.scene.start("Shop"));
}

export class LobbyScene extends Phaser.Scene {
  private arena!: ArenaDef;
  private card?: Phaser.GameObjects.Container;

  private saveTimer?: Phaser.Time.TimerEvent;
  /** Waiting to hear whether a battle can start here. */
  private starting = false;

  constructor() {
    super("Lobby");
  }

  init(data: { mode?: Mode; story?: string }) {
    if (data.mode) {
      mode = data.mode;
      opened = true;
    }
    const i = data.story ? BOOK.stories.findIndex((s) => s.id === data.story) : -1;
    if (i >= 0) bookIdx = i;
  }

  create() {
    music("lobby");
    const unlocked = arenaForTrophies(profile.trophies);
    const chosen = profile.arena ? ARENA_BY_ID[profile.arena] : null;
    this.arena = chosen && chosen.trophies <= profile.trophies ? chosen : unlocked;
    this.card = undefined;
    if (!BOOK.stories.length) mode = "arena";
    // New players go straight to the first arena's BATTLE.
    if (tutorialDue("battle")) [mode, opened] = ["arena", true];
    if (bookIdx < 0 || bookIdx >= BOOK.stories.length) bookIdx = currentStory();
    this.saveTimer = undefined;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.flushArena());

    cover(this, WIDE ? "loc:lobby_landscape" : "loc:lobby_portrait", 0, WIDE ? "lobby_landscape" : "lobby_portrait");
    topBar(this);
    iconButton(this, W - 44, 120, "settings", 70, () => this.settings());
    // What's new: the latest release popup, any time (under settings; under the quests on phones).
    const [nx, ny, ns] = WIDE ? [W - 44, 215, 80] : [54, 420, 64];
    const book = this.add.image(nx, ny, "item:spell_book");
    book.setScale(ns / Math.max(book.width, book.height));
    pressable(book, () => whatsNew(this, true));
    txt(this, nx, ny + ns * 0.58, "NEW", 20, "#ffd93b");

    // Wide: logo on the left, arena in the middle, deck on the right. Phone: stacked.
    const side = W * 0.2;
    const logoPos = WIDE ? [side, 330] : [W / 2, 250];
    const logo = this.add.image(logoPos[0], logoPos[1], "ui:logo").setScale(WIDE ? 1 : 0.78);
    this.tweens.add({ targets: logo, y: logoPos[1] + 12, yoyo: true, repeat: -1, duration: 1800, ease: "Sine.InOut" });
    if (WIDE) txt(this, side, 620, `Welcome, ${account.name}!`, 40, "#fff4c2");

    this.drawCard();
    // Swipe the card: the other mode card, or (once one is open) the next arena or book.
    onSwipe(this, new Phaser.Geom.Rectangle(W / 2 - 330, CARD_Y - 340, 660, 740), () => this.card, (d) => {
      if (!opened) this.setMode(MODES.indexOf(mode) + d, d);
      else if (mode === "arena") this.stepArena(d);
      else this.stepBook(d);
    });

    // Deck preview.
    const deckX = WIDE ? W - side : W / 2;
    const deckY = WIDE ? 420 : 1340;
    const gap = WIDE ? Math.min(140, (side * 2 - 40) / 5) : 140;
    txt(this, deckX, deckY - 90, "YOUR DECK", 30, "#fff4c2");
    profile.deck.forEach((id, i) => {
      const c = cardView(this, deckX + (i - 2) * gap, deckY, Math.min(120, gap - 12), id, { level: profile.cards[id].level });
      pressable(c, () => this.scene.start("Deck", { show: id }));
    });

    this.lobbyTiles(side);

    if (WIDE) {
      button(this, deckX, 640, 340, 110, "DECK", "blue", () => this.scene.start("Deck"));
      button(this, deckX, 790, 340, 110, "SHOP", "green", () => this.scene.start("Shop"));
      button(this, deckX, 940, 340, 110, "PVP", "red", () => this.scene.start("PvpMenu"));
    } else {
      button(this, W / 2 - 240, 1530, 220, 110, "DECK", "blue", () => this.scene.start("Deck"), 40);
      button(this, W / 2, 1530, 220, 110, "PVP", "red", () => this.scene.start("PvpMenu"), 40);
      button(this, W / 2 + 240, 1530, 220, 110, "SHOP", "green", () => this.scene.start("Shop"), 40);
    }
    eventStrip(this);
    // Static shapes become cached images (see bake.ts).
    bakeAll(this);
    // New players: point at the first battle, then at the deck once it's done.
    if (tutorialDue("battle")) pointAt(this, { x: W / 2, y: CARD_Y + 330 }, "down", "START HERE!", 80);
    else if (tutorialDue("deck")) pointAt(this, WIDE ? { x: deckX, y: 640 } : { x: W / 2 - 240, y: 1530 }, "down", WIDE ? "YOUR DECK" : undefined, 70);
    // After an update: the release popup, once (not for brand-new players mid-tutorial).
    else this.time.delayedCall(700, () => this.sys.isActive() && whatsNew(this));
  }

  /** Daily reward, quests, leaderboard and mail buttons (with a badge when something can be claimed). */
  private lobbyTiles(side: number) {
    // The game was left open past UTC midnight: fetch the new day's quests.
    const today = utcDay();
    if (profile.daily.day !== today && refreshedFor !== today) {
      refreshedFor = today;
      loadMe().then(() => this.sys.isActive() && this.scene.restart(), () => {});
    }
    const counts = dailyCounts();
    const size = WIDE ? 150 : 104;
    const at: [number, number][] = WIDE
      ? [[side - 95, 800], [side + 95, 800], [side - 95, 1010], [side + 95, 1010]]
      : [[66, 160], [66, 300], [W - 66, 300], [W - 58, 205]];
    const done = () => this.scene.restart();
    const tile = ([x, y]: [number, number], icon: string, label: string | null, count: string | null, open: () => void, s = size) => {
      const img = this.add.image(x, y, icon);
      img.setScale(s / Math.max(img.width, img.height));
      pressable(img, open);
      if (label) txt(this, x, y + s * 0.62, label, WIDE ? 26 : 20, "#fff4c2");
      return count ? badge(this, x + s * 0.36, y - s * 0.36, count) : null;
    };
    tile(at[0], "ui:icon_daily_login", "DAILY", counts.login ? "!" : null, () => loginModal(this, done));
    tile(at[1], "ui:icon_quests", "QUESTS", counts.quests ? String(counts.quests) : null, () => questsModal(this, done));
    tile(at[2], `icon:${ICON.ranks}`, "RANKS", null, () => this.scene.start("Leaderboard"));
    // Mail: a small round button under settings on phones (the tile columns are full there).
    const ms = WIDE ? size : 70;
    const mailCount = () => (mail.unread ? String(mail.unread) : null);
    let mailBadge = tile(at[3], mailIcon(this), WIDE ? "MAIL" : null, mailCount(), () => inboxModal(this, done), ms);
    // Refresh the inbox in the background and redraw the badge.
    loadInbox().then(() => {
      if (!this.sys.isActive()) return;
      mailBadge?.destroy();
      const n = mailCount();
      mailBadge = n ? badge(this, at[3][0] + ms * 0.36, at[3][1] - ms * 0.36, n) : null;
    }, () => {});
    if (counts.login && !loginShown) {
      loginShown = true;
      this.time.delayedCall(400, () => loginModal(this, done));
    }
  }

  /** Show the other mode card (ARENA / STORIES), sliding it in from that side. */
  private setMode(i: number, dir: number) {
    const next = MODES[i];
    if (!next || next === mode) return;
    if (next === "story" && !BOOK.stories.length) return;
    mode = next;
    this.drawCard({ slide: dir * 420 });
  }

  /** Open the mode card (its arenas or books) or close it back to the mode cards, with a card flip. */
  private open(on: boolean) {
    opened = on;
    this.drawCard({ flip: true });
  }

  /**
   * The card in the middle: a mode card, or the open mode's arena or book. Redraws just the card,
   * so the background video keeps playing; `slide` brings it in from that many pixels to the side
   * and `flip` turns it over.
   */
  private drawCard(anim: { slide?: number; flip?: boolean } = {}) {
    const old = this.card;
    const { slide = 0, flip = false } = anim;
    if (old && (slide || flip)) {
      const off = (o: Phaser.GameObjects.GameObject) => {
        o.disableInteractive();
        if (o instanceof Phaser.GameObjects.Container) o.list.forEach(off);
      };
      off(old);
      const out = flip ? { scaleX: 0 } : { x: old.x - slide, alpha: 0 };
      this.tweens.add({ targets: old, ...out, duration: flip ? 130 : 200, ease: "Sine.In", onComplete: () => old.destroy() });
    } else old?.destroy();
    const group = this.add.container(W / 2, CARD_Y);
    this.card = group;
    if (!opened) this.modeCard(group);
    else if (mode === "story") this.storyCard(group);
    else this.arenaCard(group);
    if (flip && old) {
      group.setScale(0, 1);
      this.tweens.add({ targets: group, scaleX: 1, delay: 130, duration: 170, ease: "Sine.Out" });
    } else if (slide) {
      group.setX(W / 2 + slide).setAlpha(0);
      this.tweens.add({ targets: group, x: W / 2, alpha: 1, duration: 240, ease: "Sine.Out" });
    }
  }

  /**
   * A mode card: ARENA (the arena you're on) or STORIES (the book covers). Tap it to open it;
   * arrows, a swipe or the dots show the other one.
   */
  private modeCard(group: Phaser.GameObjects.Container) {
    this.cardFrame(group, false);
    const i = MODES.indexOf(mode);
    if (mode === "arena") {
      const a = this.arena;
      this.arenaArt(group, a, a.trophies > profile.trophies);
      this.namePlate(group, "ARENA");
      group.add(txt(this, 0, 236, `${a.name} · Best wave ${profile.arenaBest?.[a.id] ?? 0}`, 26, "#c9d2ff"));
    } else {
      this.storiesArt(group);
      const total = BOOK.stories.reduce((n, s) => n + storyStars(s), 0);
      const max = BOOK.stories.reduce((n, s) => n + s.chapters.length * 3, 0);
      this.namePlate(group, "STORIES");
      group.add(txt(this, 0, 236, `${BOOK.title} · ★ ${total} / ${max}`, 26, "#c9d2ff"));
      if (storyIsNew(profile)) group.add(badge(this, 268, -298, "!"));
    }
    const hint = txt(this, 0, 296, mode === "arena" ? "TAP TO PICK AN ARENA" : "TAP TO OPEN THE BOOKS", 26, "#ffd93b");
    group.add(hint);
    this.tweens.add({ targets: hint, alpha: 0.35, yoyo: true, repeat: -1, duration: 750 });
    // Page dots under the card.
    const modes = BOOK.stories.length ? MODES : (["arena"] as Mode[]);
    if (modes.length > 1) {
      const dots = this.add.graphics();
      modes.forEach((_, j) => dots.fillStyle(0xfff4c2, j === i ? 1 : 0.4).fillCircle((j - (modes.length - 1) / 2) * 36, 368, j === i ? 12 : 8));
      group.add(dots);
      if (i > 0) group.add(iconButton(this, -250, -60, "back", 76, () => this.setMode(i - 1, -1)));
      if (i < modes.length - 1) group.add(iconButton(this, 250, -60, "back", 76, () => this.setMode(i + 1, 1)).setFlipX(true));
    }
    group.setSize(600, 660);
    pressable(group, () => this.open(true));
  }

  /** The STORIES card's art: the story background with the book covers fanned out on it. */
  private storiesArt(group: Phaser.GameObjects.Container) {
    const covers = BOOK.stories.slice(0, 3);
    loadStoryImages(this, ["story_background", ...covers.map((s) => `covers/${s.cover}`)], () => {
      if (!group.active) return;
      const parts: Phaser.GameObjects.GameObject[] = [];
      const bg = this.add.image(0, 0, "story:story_background");
      const s = Math.max(540 / bg.width, 470 / bg.height);
      const cw = 540 / s;
      const ch = 470 / s;
      bg.setScale(s).setCrop((bg.width - cw) / 2, (bg.height - ch) / 2, cw, ch).setY(-85);
      parts.push(bg);
      // Side covers first, the middle one on top.
      const order = covers.map((_, j) => j).sort((a, b) => Math.abs(b - (covers.length - 1) / 2) - Math.abs(a - (covers.length - 1) / 2));
      for (const j of order) {
        const off = j - (covers.length - 1) / 2;
        const img = this.add.image(off * 136, -80 + Math.abs(off) * 24, `story:covers/${covers[j].cover}`).setDisplaySize(226, 300).setAngle(off * 12);
        if (storyLock(profile.story, profile.trophies, covers[j])) img.setTint(0x77778a);
        parts.push(img);
      }
      group.addAt(parts, 1);
    });
  }

  private stepArena(d: number) {
    const next = ARENAS[ARENAS.indexOf(this.arena) + d];
    if (!next) return;
    this.arena = next;
    this.drawCard({ slide: d * 120 });
    this.saveArena();
  }

  private stepBook(d: number) {
    if (!BOOK.stories[bookIdx + d]) return;
    bookIdx += d;
    this.drawCard({ slide: d * 120 });
  }

  /** The ✕ on an open card, back to the mode cards (not for new players before their first battle). */
  private closeButton(group: Phaser.GameObjects.Container) {
    if (!tutorialDue("battle")) group.add(iconButton(this, -248, -282, "close", 60, () => this.open(false)));
  }

  /** The card's ornate frame, with a border around the art window at the top (the art goes in at index 1, under it). */
  private cardFrame(group: Phaser.GameObjects.Container, locked: boolean, art = true) {
    const { frame, trim } = ornateFrame(this, 600, 660, locked, art ? { x: -270, y: -320, w: 540, h: 470 } : undefined);
    group.add([frame, trim]);
  }

  /** A gold-edged plate behind a mode card's title, sitting on the bottom of the art window. */
  private namePlate(group: Phaser.GameObjects.Container, label: string) {
    const g = this.add.graphics();
    g.fillStyle(0x6b3f08, 1).fillRoundedRect(-196, 140, 392, 82, 22);
    g.fillStyle(0xf2b630, 1).fillRoundedRect(-190, 146, 380, 70, 18);
    g.fillStyle(0x2a1d5c, 1).fillRoundedRect(-184, 152, 368, 58, 14);
    group.add([g, txt(this, 0, 180, label, 52)]);
  }

  /** The arena page: the arena's board, best wave and BATTLE, with arrows to the other arenas. */
  private arenaCard(group: Phaser.GameObjects.Container) {
    const a = this.arena;
    const locked = a.trophies > profile.trophies;
    this.cardFrame(group, locked);

    this.arenaArt(group, a, locked);
    // Warm up the neighbours so the next arrow tap shows its art straight away.
    const idx = ARENAS.indexOf(a);
    for (const n of [ARENAS[idx - 1], ARENAS[idx + 1]]) if (n) this.loadArenaArt(n);

    group.add(txt(this, 0, -290, `ARENA ${idx + 1}`, 28, "#ffd27a"));
    group.add(iconButton(this, 248, -282, "info", 64, () => arenaInfo(this, a)));
    this.closeButton(group);
    group.add(txt(this, 0, 186, a.name, 46));
    group.add(txt(this, 0, 236, `Best wave: ${profile.arenaBest?.[a.id] ?? 0}`, 26, "#c9d2ff"));
    const battle = button(this, 0, 330, 380, 120, "BATTLE", "yellow", () => this.battle(a.id), 54);
    group.add(battle);
    if (locked) battle.setEnabled(false);

    if (idx > 0) group.add(iconButton(this, -250, -60, "back", 76, () => this.stepArena(-1)));
    if (idx < ARENAS.length - 1) group.add(iconButton(this, 250, -60, "back", 76, () => this.stepArena(1)).setFlipX(true));
  }

  /**
   * The stories page: one book (story) at a time, with its cover, stars and PLAY, and arrows to
   * the other books. PLAY opens the book's chapters.
   */
  private storyCard(group: Phaser.GameObjects.Container) {
    const n = BOOK.stories.length;
    const s = BOOK.stories[bookIdx];
    const lock = storyLock(profile.story, profile.trophies, s);
    const done = storyFinished(profile.story, s);
    this.cardFrame(group, !!lock, false);
    group.add(txt(this, 0, -290, `${BOOK.title.toUpperCase()} · ${bookIdx + 1} / ${n}`, 26, "#ffd27a"));
    this.closeButton(group);
    // The cover, framed like a book; greyed with a padlock while locked.
    const ch = 400;
    const cw = ch * (880 / 1168);
    const coverY = -58;
    const key = `story:covers/${s.cover}`;
    const show = () => {
      if (!group.active || !this.textures.exists(key)) return;
      const img = this.add.image(0, coverY, key).setDisplaySize(cw, ch);
      if (lock) img.setTint(0x55556a);
      group.addAt(img, 1);
    };
    const edge = this.add.graphics();
    edge.lineStyle(6, done ? 0xffd93b : lock ? 0x8a8fa8 : 0xf2b630, 1).strokeRoundedRect(-cw / 2, coverY - ch / 2, cw, ch, 12);
    group.add(edge);
    if (this.textures.exists(key)) show();
    else loadStoryImages(this, [`covers/${s.cover}`], show);
    if (lock) {
      const pad = this.add.image(0, coverY - 30, "ui:padlock");
      pad.setScale(110 / Math.max(pad.width, pad.height));
      group.add([pad, txt(this, 0, coverY + 60, lock, 26, "#ffb0b0").setWordWrapWidth(cw - 20)]);
    }
    group.add(txt(this, 0, 186, s.title, 44));
    const stars = storyStars(s);
    const won = s.chapters.filter((c) => chapterWon(profile.story, c.id)).length;
    const progress = done ? "COMPLETE" : `Chapter ${won + 1} of ${s.chapters.length}`;
    group.add(txt(this, 0, 236, `★ ${stars} / ${s.chapters.length * 3} · ${progress}`, 26, done ? "#ffd93b" : "#c9d2ff"));
    const label = done ? "REPLAY" : won ? "CONTINUE" : "PLAY";
    const play = button(this, 0, 330, 380, 120, label, done ? "blue" : "yellow", () => {
      if (lock) return void (sfx("error"), toast(this, lock));
      this.scene.start("Story", { story: s.id });
    }, 54);
    group.add(play);
    if (lock) play.setEnabled(false);

    if (bookIdx > 0) group.add(iconButton(this, -250, coverY, "back", 76, () => this.stepBook(-1)));
    if (bookIdx < n - 1) group.add(iconButton(this, 250, coverY, "back", 76, () => this.stepBook(1)).setFlipX(true));
  }

  /** The middle of the arena (the board) inside the card window, greyed with a padlock while locked. */
  private arenaArt(group: Phaser.GameObjects.Container, a: ArenaDef, locked: boolean) {
    const key = `loc:arena_${a.id}`;
    if (locked) {
      const shade = this.add.graphics();
      shade.fillStyle(0x000000, 0.55).fillRect(-270, -320, 540, 470);
      const lock = this.add.image(0, -110, "ui:padlock");
      lock.setScale(130 / Math.max(lock.width, lock.height));
      const need = txt(this, 22, 0, `Requires ${fmt(a.trophies)}`, 34, "#ffd27a");
      const cup = this.add.image(need.x - need.width / 2 - 26, 0, "item:trophy").setDisplaySize(46, 46);
      const more = txt(this, 0, 48, `${fmt(a.trophies - profile.trophies)} more trophies to unlock`, 22, "#ffffff");
      group.add([shade, lock, need, cup, more]);
    }
    const show = () => {
      if (!group.active || !this.textures.exists(key)) return;
      const img = this.add.image(0, 0, key);
      const s = 540 / img.width;
      img.setScale(s).setCrop(0, 380, img.width, 470 / s);
      img.setY(-320 - 380 * s + (img.height * s) / 2);
      if (locked) img.setTint(0x9a9a9a);
      group.addAt(img, 1);
    };
    if (this.textures.exists(key)) show();
    else this.loadArenaArt(a, show);
  }

  private loadArenaArt(a: ArenaDef, done?: () => void) {
    const key = `loc:arena_${a.id}`;
    if (this.textures.exists(key)) return;
    if (done) this.load.once(`filecomplete-image-${key}`, done);
    this.load.image(key, `${BASE}locations/arena_${a.id}.webp`);
    this.load.start();
  }

  /**
   * Remember the chosen arena (locked ones aren't). Kept locally right away and sent once the
   * player stops flipping through them, or when they leave the lobby.
   */
  private saveArena() {
    const a = this.arena;
    if (a.trophies > profile.trophies || a.id === profile.arena) return;
    profile.arena = a.id;
    this.saveTimer?.remove();
    this.saveTimer = this.time.delayedCall(800, () => this.flushArena());
  }

  private flushArena() {
    if (!this.saveTimer) return;
    this.saveTimer.remove();
    this.saveTimer = undefined;
    if (profile.arena) setArena(profile.arena).catch(() => {});
  }

  /** Start a battle, unless another device is in one and the player keeps it there. */
  private async battle(arena: string) {
    if (this.starting) return;
    this.starting = true;
    const ok = await claimPlay("battle");
    this.starting = false;
    if (ok && this.sys.isActive()) this.scene.start("Battle", { arena });
    else if (ok) releasePlay();
  }

  private settings() {
    const m = modal(this, 600, 780, "SETTINGS", () => {});
    const { cx, cy } = m;
    m.add(txt(this, cx, cy - 280, account.name, 40, "#fff4c2"));
    m.add(txt(this, cx, cy - 230, account.isGuest ? "Guest account" : `Signed in as ${account.username}`, 24, "#c9d2ff"));
    m.add(audioButtons(this, cx, cy - 130));
    m.add(txt(this, cx, cy - 40, "Drag matching units to merge.\nSPACE summons, H uses your hero,\nD shows the path overlay.", 22, "#ffffff"));
    if (account.isGuest) {
      m.add(txt(this, cx, cy + 50, "Create an account so you\ndon't lose your progress.", 24, "#ffd27a"));
      m.add(
        button(this, cx, cy + 150, 400, 96, "SAVE PROGRESS", "green", async () => {
          m.close();
          if (await showAuth({ mode: "register", canClose: true })) this.scene.restart();
        }, 34),
      );
    }
    m.add(
      button(this, cx, cy + 280, 400, 96, account.isGuest ? "SWITCH ACCOUNT" : "SIGN OUT", "red", async () => {
        m.close();
        await signOut().catch(() => {});
        // Re-run boot, which shows the sign-in screen.
        location.reload();
      }, 34),
    );
  }
}
