import Phaser from "phaser";
import { BASE } from "../assets";
import { music, sfx } from "../audio";
import { claimPlay, releasePlay } from "../play";
import { profile, startStory, cardLevel } from "../save";
import { UNIT_BY_ID } from "../data/units";
import { W, H, WIDE, txt, button, iconButton, modal, pressable, cardView, attempt, toast } from "../ui";
import { cover, topBar } from "./LobbyScene";
import { loadStoryImages, plate, starRow, storyPanels } from "./storyUi";
import { effectSummary, unitEffectSummary } from "../../../shared/effects.ts";
import { rarityIndex } from "../../../shared/units.ts";
import { BOOK, chapterLock, deckChecks, storyById, storyFinished, storyLock, type StoryChapter, type StoryDef } from "../../../shared/stories.ts";

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

const storyStars = (s: StoryDef) => s.chapters.reduce((n, c) => n + (profile.story.chapters[c.id]?.stars ?? 0), 0);

/**
 * Story mode (v1.2): the book's story covers, then a story's chapter path. Play checks the
 * deck (Event deck pick for Story 2, deck rules for Story 3), shows the chapter's panels and
 * starts the battle on the server, which hands back the deck and card levels to use.
 */
export class StoryScene extends Phaser.Scene {
  private story: StoryDef | null = null;
  private starting = false;

  constructor() {
    super("Story");
  }

  init(data: { story?: string }) {
    this.story = (data.story && storyById(data.story)) || null;
    this.starting = false;
  }

  preload() {
    if (!this.textures.exists("story:story_background")) this.load.image("story:story_background", `${BASE}story/story_background.webp`);
    for (const s of BOOK.stories) if (!this.textures.exists(`story:covers/${s.cover}`)) this.load.image(`story:covers/${s.cover}`, `${BASE}story/covers/${s.cover}.webp`);
  }

  create() {
    music("lobby");
    cover(this, "story:story_background", 0.45);
    topBar(this);
    if (this.story) this.storyView(this.story);
    else this.bookView();
  }

  // ---------------------------------------------------------------- book: the story covers

  private bookView() {
    iconButton(this, 50, 130, "back", 76, () => this.scene.start("Lobby"));
    txt(this, W / 2, 130, BOOK.title.toUpperCase(), 46, "#fff4c2");
    txt(this, W / 2, 186, "Three stories, played in order.", 24, "#c9d2ff");
    const n = BOOK.stories.length;
    const cw = Math.min(WIDE ? 340 : 226, (W - 60) / n - 16);
    const ch = cw * (1168 / 880);
    const y = WIDE ? H / 2 : 230 + ch / 2 + 20;
    BOOK.stories.forEach((s, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * (cw + 20);
      const lock = storyLock(profile.story, profile.trophies, s);
      const img = this.add.image(0, 0, `story:covers/${s.cover}`).setDisplaySize(cw, ch);
      const frame = this.add.graphics();
      frame.lineStyle(6, storyFinished(profile.story, s) ? 0xffd93b : 0xf2b630, 1).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 14);
      const parts: Phaser.GameObjects.GameObject[] = [img, frame];
      if (lock) {
        img.setTint(0x444455);
        const pad = this.add.image(0, -20, "ui:padlock");
        pad.setScale((cw * 0.4) / pad.width);
        parts.push(pad, txt(this, 0, cw * 0.3, lock, Math.round(cw * 0.085), "#ffb0b0").setWordWrapWidth(cw - 20));
      }
      parts.push(txt(this, 0, ch / 2 + 34, `${i + 1}. ${s.title}`, Math.round(cw * 0.11), "#fff4c2").setWordWrapWidth(cw + 10));
      parts.push(txt(this, 0, ch / 2 + 84, `★ ${storyStars(s)} / ${s.chapters.length * 3}`, Math.round(cw * 0.1), "#ffd93b"));
      const c = this.add.container(x, y, parts).setSize(cw, ch);
      pressable(c, () => {
        if (lock) return void (sfx("error"), toast(this, lock));
        this.scene.restart({ story: s.id });
      });
    });
    const badges = profile.story.badges;
    if (badges.includes("the_chosen")) txt(this, W / 2, H - 120, "★ THE CHOSEN ★\nYou finished Book 1. To be continued…", 30, "#ffd93b");
  }

  // ---------------------------------------------------------------- a story: its chapter path

  private storyView(s: StoryDef) {
    iconButton(this, 50, 130, "back", 76, () => this.scene.restart({}));
    txt(this, W / 2, 130, s.title.toUpperCase(), 46, "#fff4c2");
    txt(this, W / 2, 190, s.blurb, 24, "#c9d2ff").setWordWrapWidth(W - 160);
    const rowW = Math.min(700, W - 40);
    const rowH = 250;
    const top = 290;
    // A path line behind the chapter nodes.
    const path = this.add.graphics();
    path.lineStyle(10, 0xf2b630, 0.6).lineBetween(W / 2, top + rowH / 2, W / 2, top + (s.chapters.length - 0.5) * (rowH + 30));
    loadStoryImages(
      this,
      s.chapters.flatMap((c) => (c.intro[0] ? [`panels/${c.intro[0].image}`] : [])),
      () => {
        s.chapters.forEach((c, i) => this.chapterRow(s, c, i, W / 2, top + rowH / 2 + i * (rowH + 30), rowW, rowH));
      },
    );
  }

  private chapterRow(s: StoryDef, c: StoryChapter, i: number, x: number, y: number, w: number, h: number) {
    const lock = chapterLock(profile.story, profile.trophies, c.id);
    const best = profile.story.chapters[c.id]?.stars ?? 0;
    const parts: Phaser.GameObjects.GameObject[] = [plate(this, w, h, best ? 0xffd93b : 0xf2b630)];
    const tw = Math.min(300, w * 0.42);
    const th = (tw * 752) / 1344;
    const left = -w / 2 + 20 + tw / 2;
    if (c.intro[0] && this.textures.exists(`story:panels/${c.intro[0].image}`)) {
      const img = this.add.image(left, -h / 2 + 24 + th / 2, `story:panels/${c.intro[0].image}`).setDisplaySize(tw, th);
      if (lock) img.setTint(0x444455);
      parts.push(img);
    }
    parts.push(starRow(this, left, h / 2 - 24, best, 40));
    const tx = left + tw / 2 + 24;
    parts.push(txt(this, tx, -h / 2 + 36, `CHAPTER ${i + 1}`, 22, "#c9d2ff", [0, 0.5]));
    parts.push(txt(this, tx, -h / 2 + 76, c.title, 32, "#fff4c2", [0, 0.5]).setWordWrapWidth(w / 2 + 40));
    const deckLine = c.eventDeck ? `Event deck: pick ${c.eventDeck.pick} of ${c.eventDeck.units.length}` : c.rules ? "Your deck, with rules" : "Your own deck";
    parts.push(txt(this, tx, -h / 2 + 118, `${c.waves.length} waves · ${deckLine}`, 20, "#c9d2ff", [0, 0.5]).setWordWrapWidth(w / 2 + 40));
    const bx = (tx + w / 2) / 2;
    if (lock) {
      parts.push(this.add.image(bx, 40, "ui:padlock").setDisplaySize(56, 56));
      parts.push(txt(this, bx, 90, lock, 20, "#ffb0b0").setWordWrapWidth(w / 2 - 40));
    } else {
      parts.push(button(this, bx, 60, 220, 86, best ? "REPLAY" : "PLAY", best ? "blue" : "green", () => this.play(s, c)));
    }
    this.add.container(x, y, parts);
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
      if (picked.size !== ed.pick) return;
      savePick(c.id, [...picked]);
      m.close();
      onPlay([...picked]);
    });
    const marks = new Map<string, Phaser.GameObjects.GameObject[]>();
    const refresh = () => {
      count.setText(`Picked ${picked.size} / ${ed.pick}`);
      play.setEnabled(picked.size === ed.pick);
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
        const effect = def.effect ? unitEffectSummary(def.effect, 1) : effectSummary(def.arch, 1, rarityIndex(def.rarity)) ?? "";
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
