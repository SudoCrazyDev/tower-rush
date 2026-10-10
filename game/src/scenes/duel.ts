/**
 * v2.2 Story arena duel: a best-of match against the PvP bot, played by PvpScene in story
 * mode. This file holds the pieces that aren't PvP: the run state carried between rounds,
 * the match setup, the rival's bark and the crowd favor meter.
 */
import Phaser from "phaser";
import { NAVY, txt } from "../ui";
import { account, profile, type StoryStart } from "../save";
import { UNIT_BY_ID } from "../../../shared/units.ts";
import type { StoryChapter, StoryLine } from "../../../shared/stories.ts";
import type { MatchSetup } from "../../../shared/pvp.ts";
import type { PvpBoard } from "../../../shared/pvpsim.ts";

/** Carried from round to round (and from StoryScene into the first one). */
export interface DuelRun {
  chapter: string;
  story: string;
  start: StoryStart;
  /** 1-based. */
  round: number;
  wins: number;
  losses: number;
}

/** Seconds the versus screen shows before a round starts. */
const LEAD_SECS = 5;

export function duelSetup(c: StoryChapter, run: DuelRun): MatchSetup {
  const d = c.duel!;
  const levels = Object.fromEntries(d.deck.map((id) => [id, d.level]));
  return {
    id: `duel:${c.id}:${run.round}`,
    mode: "casual",
    seed: Math.floor(Math.random() * 2 ** 31),
    arena: d.arena,
    startAt: Date.now() + LEAD_SECS * 1000,
    practice: true,
    players: [
      { name: account.name || "You", trophies: 0, deck: [...run.start.deck], levels: { ...run.start.levels }, hero: profile.hero },
      { name: d.rivalName, trophies: 0, deck: [...d.deck], levels, hero: null, bot: true },
    ],
  };
}

/** Bot skill of a round (the last value repeats if the list is short). */
export const roundSkill = (c: StoryChapter, round: number) => {
  const s = c.duel!.skill;
  return s[Math.min(round, s.length) - 1] ?? 0.5;
};

/** Stars for a won duel: 3 with no round lost, 2 with one, 1 otherwise. */
export const duelStars = (losses: number) => (losses <= 0 ? 3 : losses === 1 ? 2 : 1);

export const rivalBark = (c: StoryChapter, round: number): StoryLine | null => c.duel!.barks[Math.min(round, c.duel!.barks.length) - 1] ?? null;

/** Texture key of a bark speaker's portrait (unit card portrait or story portrait). */
export const barkPortraitKey = (who: string) => (UNIT_BY_ID[who] ? `portrait:${who}` : `story_portrait:${who}`);

/** The rival's line as a speech bubble centered on (0, 0), width 700. Add it to a container. */
export function barkBubble(scene: Phaser.Scene, line: StoryLine): Phaser.GameObjects.Container {
  const w = 700;
  const g = scene.add.graphics();
  g.fillStyle(NAVY, 0.92).fillRoundedRect(-w / 2, -64, w, 128, 22).lineStyle(4, 0xffd27a, 1).strokeRoundedRect(-w / 2, -64, w, 128, 22);
  const parts: Phaser.GameObjects.GameObject[] = [g];
  const key = barkPortraitKey(line.who);
  if (scene.textures.exists(key)) parts.push(scene.add.image(-w / 2 + 68, 0, key).setDisplaySize(104, 104));
  const name = UNIT_BY_ID[line.who]?.name ?? line.who.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  parts.push(txt(scene, -w / 2 + 136, -34, name, 24, "#ffd27a", [0, 0.5]));
  parts.push(txt(scene, -w / 2 + 136, 12, line.text, 26, "#ffffff", [0, 0.5]).setWordWrapWidth(w - 170));
  return scene.add.container(0, 0, parts);
}

// ---------------------------------------------------------------- crowd favor

const MULTI_KILLS = 3;
const MULTI_WINDOW = 1; // seconds
const FILL_MULTI = 0.2;
const FILL_CLEAN_WAVE = 0.15;

/**
 * The crowd loves flashy play: 3+ kills within a second and waves with no leaks fill the
 * meter; when full it pays one free summon (the mana for the next one) and resets.
 */
export class CrowdFavor {
  value = 0;
  private bar: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private kills = 0;
  private killTimes: number[] = [];
  private wave = 0;
  private leaked = false;
  private hp: number;
  private shownValue = -1;

  /** `x`,`y`: center of the bar in scene coordinates; `pin` pins HUD objects to the screen. */
  constructor(
    scene: Phaser.Scene,
    board: PvpBoard,
    x: number,
    y: number,
    pin: <T extends Phaser.GameObjects.GameObject & { setScrollFactor(f: number): T }>(o: T) => T,
    private onPay: (text: string) => void,
  ) {
    this.hp = board.hp;
    this.wave = board.wave;
    this.bar = pin(scene.add.graphics().setDepth(3005).setPosition(x, y));
    this.label = pin(txt(scene, x, y - 22, "CROWD FAVOR", 20, "#ffd27a").setDepth(3006));
    this.draw();
  }

  /** Call after the board ticked. */
  update(board: PvpBoard) {
    const now = board.now;
    if (board.kills > this.kills) {
      for (let i = this.kills; i < board.kills; i++) this.killTimes.push(now);
      this.kills = board.kills;
      this.killTimes = this.killTimes.filter((t) => now - t <= MULTI_WINDOW);
      if (this.killTimes.length >= MULTI_KILLS) {
        this.killTimes = [];
        this.add(board, FILL_MULTI, "MULTI-KILL!");
      }
    }
    if (board.hp < this.hp) this.leaked = true;
    this.hp = board.hp;
    if (board.wave > this.wave) {
      // The wave that just ended: any leaks while it was on the board?
      if (this.wave > 0 && !this.leaked) this.add(board, FILL_CLEAN_WAVE, "CLEAN WAVE!");
      this.wave = board.wave;
      this.leaked = false;
    }
    this.draw();
  }

  private add(board: PvpBoard, amount: number, why: string) {
    this.value += amount;
    if (this.value < 1) return this.onPay(why);
    this.value = 0;
    board.mana += board.summonCost;
    this.onPay("THE CROWD ROARS! Free summon");
  }

  private draw() {
    const v = Math.round(this.value * 100);
    if (v === this.shownValue) return;
    this.shownValue = v;
    const w = 340;
    const h = 16;
    this.bar.clear();
    this.bar.fillStyle(NAVY, 0.85).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    this.bar.fillStyle(0xffd93b, 1).fillRoundedRect(-w / 2, -h / 2, Math.max(0, w * Math.min(1, this.value)), h, 8);
    this.bar.lineStyle(3, 0xf2b630, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  }

  destroy() {
    this.bar.destroy();
    this.label.destroy();
  }
}
