import Phaser from "phaser";
import { BASE } from "../assets";
import { music, sfx } from "../audio";
import { claimPlay, releasePlay } from "../play";
import { profile, startStory, cardLevel } from "../save";
import { UNIT_BY_ID } from "../data/units";
import { W, H, WIDE, txt, button, iconButton, modal, pressable, cardView, attempt, onSwipe, ornateFrame } from "../ui";
import { cover, topBar } from "./LobbyScene";
import { starRow, storyPanels } from "./storyUi";
import { kitSummary } from "../../../shared/kit.ts";
import { BOOK, chapterLock, chapterWon, deckChecks, eventPickProblem, storyById, storyFinished, type StoryChapter, type StoryDef } from "../../../shared/stories.ts";

const PICK_KEY = "tower-rush-story-pick";
/** The last Event deck picked for each chapter on this device. */
function lastPick(chapter: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(PICK_KEY) ?? "{}")[chapter] ?? [];
  } catch {
    return [];
  }
}
function savePick(chapter: string, pick: string[]) {
  try {
    const all = JSON.parse(localStorage.getItem(PICK_KEY) ?? "{}");
    all[chapter] = pick;
    localStorage.setItem(PICK_KEY, JSON.stringify(all));
  } catch {
    // Not remembered.
  }
}

/**
 * Story mode (v1.2): one story's chapters as a carousel (swipe, the arrows, or tap a neighbour);
 * the lobby's Stories page is the carousel of books before it. Play checks the deck (Event deck
 * pick for Story 2, deck rules for Story 3), shows the chapter's panels and starts the battle on
 * the server, which hands back the deck and card levels to use.
 */
export class StoryScene extends Phaser.Scene {
  private story?: StoryDef;
  private starting = false;
  /** The chapter in the middle of the carousel. */
  private focus = 0;
  private strip!: Phaser.GameObjects.Container;
  private cards: Phaser.GameObjects.Container[] = [];
  private gap = 0;
  private dots!: Phaser.GameObjects.Graphics;
  private dotsY = 0;
  private prev!: Phaser.GameObjects.Image;
  private next!: Phaser.GameObjects.Image;

  constructor() {
    super("Story");
  }

  init(data: { story?: string }) {
    this.story = (data.story && storyById(data.story)) || BOOK.stories.find((s) => !storyFinished(profile.story, s)) || BOOK.stories[BOOK.stories.length - 1];
    this.starting = false;
    this.cards = [];
    // Open on the chapter to play next (the last one once they're all won).
    const next = this.story?.chapters.findIndex((c) => !chapterWon(profile.story, c.id)) ?? 0;
    this.focus = next < 0 ? this.story!.chapters.length - 1 : next;
  }

  preload() {
    if (!this.textures.exists("story:story_background")) this.load.image("story:story_background", `${BASE}story/story_background.webp`);
    for (const c of this.story?.chapters ?? []) {
      const p = c.intro[0]?.image;
      if (p && !this.textures.exists(`story:panels/${p}`)) this.load.image(`story:panels/${p}`, `${BASE}story/panels/${p}.webp`);
    }
  }

  create() {
    const s = this.story;
    if (!s || !s.chapters.length) return void this.scene.start("Lobby");
    music("lobby");
    cover(this, "story:story_background", 0.45);
    topBar(this);
    iconButton(this, 50, 130, "back", 76, () => this.scene.start("Lobby", { mode: "story", story: s.id }));
    txt(this, W / 2, 130, s.title.toUpperCase(), 46, "#fff4c2");
    txt(this, W / 2, 196, s.blurb, 24, "#c9d2ff").setWordWrapWidth(W - 160);

    const cw = WIDE ? 620 : 560;
    const ch = 780;
    const cy = WIDE ? H / 2 + 40 : 930;
    this.gap = cw + (WIDE ? 60 : 24);
    this.strip = this.add.container(W / 2, cy);
    s.chapters.forEach((c, i) => {
      const card = this.chapterCard(s, c, i, cw, ch).setX(i * this.gap);
      this.strip.add(card);
      this.cards.push(card);
    });
    this.dots = this.add.graphics();
    this.dotsY = cy + ch / 2 + 46;
    const ax = WIDE ? cw / 2 + 90 : W / 2 - 42;
    this.prev = iconButton(this, W / 2 - ax, cy, "back", 84, () => this.go(this.focus - 1));
    this.next = iconButton(this, W / 2 + ax, cy, "back", 84, () => this.go(this.focus + 1)).setFlipX(true);
    onSwipe(this, new Phaser.Geom.Rectangle(0, cy - ch / 2, W, ch), () => this.strip, (d) => this.go(this.focus + d));
    this.go(this.focus, false);

    const last = BOOK.stories[BOOK.stories.length - 1];
    if (s === last && profile.story.badges.includes("the_chosen")) txt(this, W / 2, this.dotsY + (WIDE ? 70 : 110), "★ THE CHOSEN ★\nYou finished Book 1. To be continued…", 28, "#ffd93b");
  }

  /** Bring chapter `i` to the middle; its neighbours shrink and dim to the sides. */
  private go(i: number, animate = true) {
    const n = this.cards.length;
    if (i < 0 || i >= n) return;
    this.focus = i;
    const x = W / 2 - i * this.gap;
    if (animate) this.tweens.add({ targets: this.strip, x, duration: 280, ease: "Cubic.Out" });
    else this.strip.setX(x);
    this.cards.forEach((card, j) => {
      const to = { scale: j === i ? 1 : 0.86, alpha: j === i ? 1 : 0.55 };
      if (animate) this.tweens.add({ targets: card, ...to, duration: 280, ease: "Cubic.Out" });
      else card.setScale(to.scale).setAlpha(to.alpha);
    });
    this.prev.setVisible(i > 0);
    this.next.setVisible(i < n - 1);
    // Page dots: gold for chapters won, the current one bigger.
    const s = this.story!;
    this.dots.clear();
    s.chapters.forEach((c, j) => {
      const dx = W / 2 + (j - (n - 1) / 2) * 40;
      this.dots.fillStyle(chapterWon(profile.story, c.id) ? 0xffd93b : 0xc9d2ff, j === i ? 1 : 0.5).fillCircle(dx, this.dotsY, j === i ? 13 : 9);
    });
  }

  /** One chapter: its first panel, title, best stars, waves and deck, and PLAY (or what unlocks it). */
  private chapterCard(s: StoryDef, c: StoryChapter, i: number, cw: number, ch: number) {
    const lock = chapterLock(profile.story, profile.trophies, c.id);
    const best = profile.story.chapters[c.id]?.stars ?? 0;
    const iw = cw - 56;
    const ih = (iw * 752) / 1344;
    const iy = -ch / 2 + 26 + ih / 2;
    const { frame, trim } = ornateFrame(this, cw, ch, !!lock, { x: -iw / 2, y: iy - ih / 2, w: iw, h: ih });
    const parts: Phaser.GameObjects.GameObject[] = [frame];
    const key = `story:panels/${c.intro[0]?.image}`;
    if (c.intro[0] && this.textures.exists(key)) {
      const img = this.add.image(0, iy, key).setDisplaySize(iw, ih);
      if (lock) img.setTint(0x444455);
      parts.push(img);
    }
    if (lock) {
      const pad = this.add.image(0, iy, "ui:padlock");
      pad.setScale(100 / Math.max(pad.width, pad.height));
      parts.push(pad);
    }
    parts.push(trim);
    const y = iy + ih / 2;
    parts.push(txt(this, 0, y + 40, `CHAPTER ${i + 1} OF ${s.chapters.length}`, 24, "#ffd27a"));
    parts.push(txt(this, 0, y + 92, c.title, 38, "#fff4c2").setWordWrapWidth(cw - 40));
    parts.push(starRow(this, 0, y + 170, best, 52));
    const deckLine = c.eventDeck ? `Event deck: pick ${c.eventDeck.pick} of ${c.eventDeck.units.length}` : c.rules ? "Your deck, with rules" : "Your own deck";
    parts.push(txt(this, 0, y + 240, `${c.waves.length} waves · ${deckLine}`, 22, "#c9d2ff").setWordWrapWidth(cw - 60));
    if (lock) parts.push(txt(this, 0, ch / 2 - 80, lock, 26, "#ffb0b0").setWordWrapWidth(cw - 60));
    else parts.push(button(this, 0, ch / 2 - 80, 320, 104, best ? "REPLAY" : "PLAY", best ? "blue" : "green", () => (i === this.focus ? this.play(s, c) : this.go(i)), 48));
    const card = this.add.container(0, 0, parts).setSize(cw, ch);
    // Tapping a neighbour brings it to the middle.
    card.setInteractive().on("pointerup", (p: Phaser.Input.Pointer) => {
      if (i !== this.focus && p.getDistance() < 40) this.go(i);
    });
    return card;
  }

  // ---------------------------------------------------------------- play

  private play(s: StoryDef, c: StoryChapter) {
    if (this.starting) return;
    if (c.eventDeck) this.pickDeck(c, (pick) => this.begin(s, c, pick));
    else if (c.rules) this.checkDeck(c, () => this.begin(s, c));
    else this.begin(s, c);
  }

  /** Panels, then claim the play slot and start the chapter on the server. */
  private begin(_s: StoryDef, c: StoryChapter, pick?: string[]) {
    storyPanels(this, c.intro, async () => {
      if (this.starting) return;
      this.starting = true;
      const ok = await claimPlay("battle");
      if (!ok || !this.sys.isActive()) {
        if (ok) releasePlay();
        this.starting = false;
        return;
      }
      let start: Awaited<ReturnType<typeof startStory>> | null = null;
      const done = await attempt(this, async () => {
        start = await startStory(c.id, pick);
      });
      this.starting = false;
      if (!done || !start) return releasePlay();
      this.scene.start("Battle", { story: { chapter: c.id, start } });
    });
  }

  /** Story 2: pick the Event deck (5 of the 9 Knights and Mercenaries). */
  private pickDeck(c: StoryChapter, onPlay: (pick: string[]) => void) {
    const ed = c.eventDeck!;
    const mh = Math.min(1240, H - 40);
    const m = modal(this, 700, mh, "EVENT DECK", () => {});
    const { cx, cy } = m;
    const top = cy - mh / 2;
    m.add(txt(this, cx, top + 96, `Pick ${ed.pick}. Every unit fights at level ${ed.level}.`, 26, "#c9d2ff"));
    const picked = new Set(lastPick(c.id).filter((id) => ed.units.includes(id)).slice(0, ed.pick));
    const size = 140;
    const cols = 3;
    const info = txt(this, cx, top + mh - 250, "Tap a card to pick it. Knights help their neighbours;\nMercenaries hit hard but bother them.", 22, "#ffffff").setWordWrapWidth(620);
    const count = txt(this, cx, top + mh - 170, "", 26, "#ffd93b");
    const play = button(this, cx, top + mh - 90, 360, 96, "TO BATTLE!", "green", () => {
      if (eventPickProblem(ed, [...picked])) return void sfx("error");
      savePick(c.id, [...picked]);
      m.close();
      onPlay([...picked]);
    });
    const marks = new Map<string, Phaser.GameObjects.GameObject[]>();
    const refresh = () => {
      const why = picked.size === ed.pick ? eventPickProblem(ed, [...picked]) : null;
      const needs = Object.entries(ed.minRoles ?? {}).map(([role, n]) => `at least ${n} ${role}${n > 1 ? "s" : ""}`);
      count.setText(why ?? `Picked ${picked.size} / ${ed.pick}${needs.length ? ` · ${needs.join(", ")}` : ""}`).setColor(why ? "#ff8080" : "#ffd93b");
      play.setEnabled(!eventPickProblem(ed, [...picked]));
      for (const [id, objs] of marks) for (const o of objs) (o as Phaser.GameObjects.Image).setVisible(picked.has(id));
    };
    ed.units.forEach((id, i) => {
      const def = UNIT_BY_ID[id];
      if (!def) return;
      const x = cx + ((i % cols) - (cols - 1) / 2) * (size + 50);
      const y = top + 220 + Math.floor(i / cols) * (size + 92);
      const card = cardView(this, 0, 0, size, id);
      const ring = this.add.graphics();
      ring.lineStyle(8, 0x7dff7a, 1).strokeRoundedRect(-size / 2 - 6, -size / 2 - 6, size + 12, size + 12, 16);
      const check = txt(this, -size / 2 + 10, -size / 2 + 10, "✔", 36, "#7dff7a");
      const name = txt(this, 0, size * 0.6, def.name, 19, "#ffffff").setWordWrapWidth(size + 40);
      const role = txt(this, 0, size * 0.6 + 26, (def.role ?? "").toUpperCase(), 17, def.role === "Knight" ? "#9fd0ff" : "#ff9a9a");
      const box = this.add.container(x, y, [ring, card, check, name, role]).setSize(size, size);
      marks.set(id, [ring, check]);
      m.add(box);
      pressable(box, () => {
        if (picked.has(id)) picked.delete(id);
        else if (picked.size < ed.pick) picked.add(id);
        else sfx("error");
        const effect = kitSummary(def, 1).join("\n");
        info.setText(`${def.name} (${def.role}): ${def.blurb}\n${effect}`);
        refresh();
      });
    });
    m.add([info, count, play]);
    refresh();
  }

  /** Story 3: the deck rules checklist; Play stays greyed out until every line passes. */
  private checkDeck(c: StoryChapter, onPlay: () => void) {
    const rules = c.rules!;
    const checks = deckChecks(profile.deck, rules);
    const ok = checks.every((x) => x.ok);
    const m = modal(this, 680, 900, "DECK CHECK", () => {});
    const { cx, cy } = m;
    m.add(txt(this, cx, cy - 330, "The rift's chaos wards turn legends away.\nOnly the Chosen may lead the way in.", 24, "#c9d2ff"));
    checks.forEach((x, i) => {
      const y = cy - 220 + i * 70;
      m.add(txt(this, cx - 280, y, x.ok ? "✔" : "✘", 40, x.ok ? "#7dff7a" : "#ff6a6a", [0.5, 0.5]));
      m.add(txt(this, cx - 240, y, x.text, 26, x.ok ? "#ffffff" : "#ffb0b0", [0, 0.5]).setWordWrapWidth(520));
    });
    // The deck as it will fight: required units raised to the story level.
    profile.deck.forEach((id, i) => {
      const x = cx + (i - 2) * 124;
      const raised = rules.requiredUnits.includes(id) && cardLevel(id) < rules.levelFloor;
      const lvl = raised ? rules.levelFloor : cardLevel(id);
      const v = cardView(this, x, cy + 120, 104, id, { level: lvl });
      const banned = rules.bannedRarities.includes(UNIT_BY_ID[id]?.rarity);
      if (banned) v.add(txt(this, 0, 0, "✘", 64, "#ff6a6a"));
      m.add(v);
      if (raised) m.add(txt(this, x, cy + 200, "(story)", 18, "#ffd93b"));
    });
    if (rules.levelFloor) m.add(txt(this, cx, cy + 250, `Required units fight at level ${rules.levelFloor} or higher.`, 22, "#c9d2ff"));
    m.add(button(this, cx - 160, cy + 360, 280, 96, "EDIT DECK", "blue", () => this.scene.start("Deck")));
    const play = button(this, cx + 160, cy + 360, 280, 96, "TO BATTLE!", "green", () => {
      m.close();
      onPlay();
    });
    play.setEnabled(ok);
    m.add(play);
  }
}
