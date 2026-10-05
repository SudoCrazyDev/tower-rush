/**
 * v1.2 Story mode UI shared by the Story screen and the battle: illustrated panels, and the
 * chapter result (victory with stars and rewards, or defeat).
 */
import Phaser from "phaser";
import { BASE } from "../assets";
import { sfx } from "../audio";
import { W, H, NAVY, txt, button, modal, fmt, cardView, lootCards } from "../ui";
import { UNIT_BY_ID } from "../data/units";
import { BADGES, type StoryChapter, type StoryDef, type StoryPanel } from "../../../shared/stories.ts";
import { chestById } from "../../../shared/profile.ts";
import type { StoryResult } from "../save";

/** Load story images (by path under story/, without .webp) that aren't loaded yet, then call `done`. */
export function loadStoryImages(scene: Phaser.Scene, paths: string[], done: () => void) {
  const need = paths.filter((p) => !scene.textures.exists(`story:${p}`));
  if (!need.length) return done();
  for (const p of need) scene.load.image(`story:${p}`, `${BASE}story/${p}.webp`);
  scene.load.once(Phaser.Loader.Events.COMPLETE, done);
  scene.load.start();
}

/** Full-screen illustrated panels, one after another: tap to continue, SKIP ends them all. */
export function storyPanels(scene: Phaser.Scene, panels: StoryPanel[], onDone: () => void) {
  if (!panels.length) return onDone();
  const root = scene.add.container(0, 0).setDepth(7000).setScrollFactor(0);
  const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x05061a, 1).setInteractive().setScrollFactor(0);
  root.add(shade);
  const loading = txt(scene, W / 2, H / 2, "…", 48, "#c9d2ff").setScrollFactor(0);
  root.add(loading);
  let i = -1;
  let page: Phaser.GameObjects.Container | null = null;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    scene.tweens.add({ targets: root, alpha: 0, duration: 250, onComplete: () => root.destroy() });
    onDone();
  };
  const next = () => {
    if (finished) return;
    i++;
    if (i >= panels.length) return finish();
    const p = panels[i];
    const old = page;
    if (old) scene.tweens.add({ targets: old, alpha: 0, duration: 200, onComplete: () => old.destroy() });
    const img = scene.add.image(0, 0, `story:panels/${p.image}`);
    const scale = Math.min((W - 40) / img.width, (H * 0.55) / img.height);
    img.setScale(scale);
    const frame = scene.add.graphics();
    const fw = img.width * scale;
    const fh = img.height * scale;
    frame.lineStyle(8, 0xf2b630, 1).strokeRoundedRect(-fw / 2 - 4, -fh / 2 - 4, fw + 8, fh + 8, 12);
    const top = H / 2 - 60 - fh / 2;
    const parts: Phaser.GameObjects.GameObject[] = [img.setPosition(0, 0), frame];
    const text = txt(scene, 0, fh / 2 + 40, p.lines.join("\n"), 34, "#fff4c2", [0.5, 0]).setWordWrapWidth(W - 80).setLineSpacing(10);
    parts.push(text);
    page = scene.add.container(W / 2, top + fh / 2, parts).setAlpha(0);
    page.list.forEach((o) => (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0));
    page.setScrollFactor(0);
    root.add(page);
    scene.tweens.add({ targets: page, alpha: 1, duration: 300 });
    hint.setText(i === panels.length - 1 ? "Tap to begin" : "Tap to continue");
  };
  const hint = txt(scene, W / 2, H - 70, "", 26, "#c9d2ff").setScrollFactor(0);
  const skip = button(scene, W - 110, 70, 160, 70, "SKIP", "grey", finish).setScrollFactor(0);
  skip.list.forEach((o) => (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0));
  root.add([hint, skip]);
  scene.tweens.add({ targets: hint, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
  shade.on("pointerup", next);
  loadStoryImages(
    scene,
    panels.map((p) => `panels/${p.image}`),
    () => {
      loading.destroy();
      next();
    },
  );
}

/** Three stars, `n` of them lit. */
export function starRow(scene: Phaser.Scene, x: number, y: number, n: number, size = 56) {
  const c = scene.add.container(x, y);
  for (let i = 0; i < 3; i++) {
    const s = txt(scene, (i - 1) * size * 1.1, i === 1 ? -size * 0.2 : 0, "★", size, i < n ? "#ffd93b" : "#3b4270");
    c.add(s);
  }
  return c;
}

export interface StoryResultOpts {
  story: StoryDef;
  chapter: StoryChapter;
  won: boolean;
  why?: string;
  stars: number;
  wave: number;
  result: Promise<StoryResult | null>;
}

/**
 * The chapter is over: Victory (stars, first-clear or replay reward, a card reveal for a unit
 * reward) or Defeat. CONTINUE plays the story's ending panels when this win finished it, then
 * goes back to the story screen.
 */
export function storyResult(scene: Phaser.Scene, o: StoryResultOpts) {
  const m = modal(scene, 640, 980, "");
  const { cx, cy } = m;
  const banner = scene.add.image(cx, cy - 330, o.won ? "ui:banner_victory" : "ui:banner_defeat");
  banner.setScale(480 / banner.width);
  m.add([banner, txt(scene, cx, cy - 320, o.won ? "VICTORY!" : "DEFEAT", 42)]);
  m.add(txt(scene, cx, cy - 212, o.chapter.title, 30, "#ffd27a"));
  if (o.why) m.add(txt(scene, cx, cy - 176, o.why, 24, "#ffd27a"));
  const total = o.chapter.waves.length;
  if (o.won) m.add(starRow(scene, cx, cy - 140, o.stars, 64));
  else m.add(txt(scene, cx, cy - 130, `Wave ${o.wave} / ${total}`, 56, "#fff4c2"));
  const saving = txt(scene, cx, cy + 40, "Saving...", 34, "#c9d2ff");
  m.add(saving);
  let storyDone = false;
  const leave = () => {
    const back = () => scene.scene.start("Story", { story: o.story.id });
    if (storyDone) storyPanels(scene, o.story.ending, back);
    else back();
  };
  m.add(button(scene, cx, cy + 410, 360, 100, o.won ? "CONTINUE" : "BACK", "green", leave));
  o.result.then((r) => {
    if (!m.active) return;
    if (!r) {
      saving.setText("Couldn't save this battle\n(no connection)").setColor("#ff8080").setFontSize(28);
      return;
    }
    saving.destroy();
    if (!r.won || !r.win) {
      sfx("lose");
      m.add(txt(scene, cx, cy - 40, "The corruption holds… for now.\nRearrange your units and try again!", 28, "#c9d2ff").setLineSpacing(8));
      return;
    }
    const w = r.win;
    storyDone = w.storyDone;
    m.add(txt(scene, cx, cy - 80, w.firstClear ? "FIRST CLEAR!" : w.stars > w.bestBefore ? "NEW BEST STARS!" : "Replay reward", 30, w.firstClear ? "#7dff7a" : "#c9d2ff"));
    // Gold, gems and a chest on one row.
    const items: [string, string, string][] = [];
    if (w.coins) items.push(["item:coins", `+${fmt(w.coins)}`, "#ffd93b"]);
    if (w.gems) items.push(["item:gems", `+${w.gems}`, "#7fffd4"]);
    const chest = w.chest ? chestById(w.chest) : undefined;
    if (chest) items.push([`item:${chest.image}`, chest.name, "#ffffff"]);
    items.forEach(([icon, label, color], i) => {
      const x = cx + (i - (items.length - 1) / 2) * 190;
      m.add(scene.add.image(x, cy - 10, icon).setDisplaySize(72, 72));
      m.add(txt(scene, x, cy + 44, label, 24, color));
    });
    // Unit rewards get their own reveal; chest loot and Event copies show as cards.
    const units = w.firstClear ? w.cards : [];
    if (units.length) {
      sfx("win");
      units.forEach((c, i) => {
        const x = cx + (i - (units.length - 1) / 2) * 230;
        const glow = scene.add.graphics();
        glow.fillStyle(UNIT_BY_ID[c.id]?.rarity === "event" ? 0xff8fd8 : 0xffd93b, 0.45).fillCircle(0, 0, 120);
        const card = cardView(scene, 0, 0, 180, c.id, { name: true });
        const reveal = scene.add.container(x, cy + 185, [glow, card]).setScale(0);
        m.add(reveal);
        scene.tweens.add({ targets: reveal, scale: 1, delay: 300 + i * 250, duration: 450, ease: "Back.Out" });
        scene.tweens.add({ targets: glow, scale: 1.15, alpha: 0.6, yoyo: true, repeat: -1, duration: 700 });
      });
      m.add(txt(scene, cx, cy + 340, units.length > 1 ? "NEW UNITS JOIN YOUR ARMY!" : `${UNIT_BY_ID[units[0].id]?.name.toUpperCase()} JOINS YOUR ARMY!`, 28, "#ff9df0"));
    } else {
      const cards = [...(w.firstClear ? [] : w.cards), ...(w.loot?.cards ?? [])];
      if (cards.length) m.add(lootCards(scene, cx, cy + 160, cards, 100, 4, 8));
    }
    if (w.badge) m.add(txt(scene, cx, cy + 360, `Badge earned: ${BADGES[w.badge]?.label ?? w.badge}`, 26, "#ffd93b"));
    sfx("win");
  });
  return m;
}

/** A dark plate with rounded corners, for story cards and rows. */
export function plate(scene: Phaser.Scene, w: number, h: number, border = 0xf2b630, alpha = 0.85) {
  const g = scene.add.graphics();
  g.fillStyle(NAVY, alpha).fillRoundedRect(-w / 2, -h / 2, w, h, 20);
  g.lineStyle(4, border, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
  return g;
}
