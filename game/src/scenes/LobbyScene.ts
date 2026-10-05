import Phaser from "phaser";
import { BASE, ICON } from "../assets";
import { ARENAS, ARENA_BY_ID, arenaForTrophies, type ArenaDef } from "../data/arenas";
import { profile, account, mail, setArena, signOut, loadMe, loadInbox, serverNow } from "../save";
import { storyIsNew } from "../../../shared/profile.ts";
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
import { audioButtons, W, H, WIDE, txt, button, iconButton, resourcePill, cardView, fmt, NAVY, modal, pressable, badge } from "../ui";

/** The login reward pops up by itself once per session. */
let loginShown = false;
/** Day we last re-fetched the profile for (quests roll over at UTC midnight). */
let refreshedFor = "";

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

  create() {
    music("lobby");
    const unlocked = arenaForTrophies(profile.trophies);
    const chosen = profile.arena ? ARENA_BY_ID[profile.arena] : null;
    this.arena = chosen && chosen.trophies <= profile.trophies ? chosen : unlocked;
    this.card = undefined;
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

    this.drawArenaCard();

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
      button(this, 103, 1530, 170, 110, "DECK", "blue", () => this.scene.start("Deck"), 40);
      button(this, 285, 1530, 170, 110, "STORY", "yellow", () => this.scene.start("Story"), 40);
      if (storyIsNew(profile)) badge(this, 285 + 70, 1530 - 44, "!");
      button(this, 467, 1530, 170, 110, "PVP", "red", () => this.scene.start("PvpMenu"), 40);
      button(this, 649, 1530, 170, 110, "SHOP", "green", () => this.scene.start("Shop"), 40);
    }
    eventStrip(this);
    // Static shapes become cached images (see bake.ts).
    bakeAll(this);
    // New players: point at the first battle, then at the deck once it's done.
    if (tutorialDue("battle")) pointAt(this, { x: W / 2, y: (WIDE ? 680 : 760) + 330 }, "down", "START HERE!", 80);
    else if (tutorialDue("deck")) pointAt(this, WIDE ? { x: deckX, y: 640 } : { x: 103, y: 1530 }, "down", WIDE ? "YOUR DECK" : undefined, 70);
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
    // Story mode (v1.2): a book tile with a NEW dot until the first story is started (a bottom-row button on phones).
    if (WIDE) tile([side, 1200], "ui:icon_story", "STORY", storyIsNew(profile) ? "!" : null, () => this.scene.start("Story"));
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

  /** The arena card. Arrow taps redraw just the card, so the background video keeps playing. */
  private drawArenaCard() {
    this.card?.destroy();
    const a = this.arena;
    const locked = a.trophies > profile.trophies;
    const y = WIDE ? 680 : 760;
    const group = this.add.container(W / 2, y);
    this.card = group;
    const frame = this.add.graphics();
    frame.fillStyle(NAVY, 0.85).fillRoundedRect(-300, -330, 600, 660, 36);
    frame.lineStyle(8, locked ? 0x8a8fa8 : 0xf2b630, 1).strokeRoundedRect(-300, -330, 600, 660, 36);
    group.add(frame);

    this.arenaArt(group, a, locked);
    // Warm up the neighbours so the next arrow tap shows its art straight away.
    const idx = ARENAS.indexOf(a);
    for (const n of [ARENAS[idx - 1], ARENAS[idx + 1]]) if (n) this.loadArenaArt(n);

    group.add(txt(this, 0, -290, `ARENA ${idx + 1}`, 28, "#ffd27a"));
    group.add(iconButton(this, 248, -282, "info", 64, () => arenaInfo(this, a)));
    group.add(txt(this, 0, 186, a.name, 46));
    group.add(txt(this, 0, 236, `Best wave: ${profile.arenaBest?.[a.id] ?? 0}`, 26, "#c9d2ff"));
    const battle = button(this, 0, 330, 380, 120, "BATTLE", "yellow", () => this.battle(a.id), 54);
    group.add(battle);
    if (locked) battle.setEnabled(false);

    const step = (d: number) => {
      const next = ARENAS[ARENAS.indexOf(this.arena) + d];
      if (!next) return;
      this.arena = next;
      this.drawArenaCard();
      this.saveArena();
    };
    if (idx > 0) group.add(iconButton(this, -250, -60, "back", 76, () => step(-1)));
    if (idx < ARENAS.length - 1) group.add(iconButton(this, 250, -60, "back", 76, () => step(1)).setFlipX(true));
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
