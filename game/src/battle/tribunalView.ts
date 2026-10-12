/**
 * v2.4 Story 5 ("The Silver Tribunal") battle visuals: the plea screen before each count, the law banner,
 * jailed and chained markers on units, the cells of chapter 2, the Great Scale's pans, the falling city and
 * Argent's sentence meter. A view only: the rules are in shared/sim.ts and shared/tribunal.ts.
 */
import Phaser from "phaser";
import type { SimEvent } from "../../../shared/sim.ts";
import type { ChapterMechanics, StoryChapter } from "../../../shared/stories.ts";
import { BOSS_BY_ID } from "../../../shared/monsters.ts";
import { LAWS, panOf, type LawId } from "../../../shared/tribunal.ts";
import { UNIT_BY_ID } from "../data/units";
import { NAVY, button, modal, txt } from "../ui";
import { banner, hudAnchor } from "./tideView";
import type { BattleScene } from "../scenes/BattleScene";

const SILVER = 0xc9d2ff;
const BRASS = 0xd9a441;
const CRIMSON = 0xff6b6b;
const css = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

type Mark = { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text; key: string };

/** Whether any boss of the chapter declares laws or reads a sentence (they need the law bar and the meter). */
const bossHas = (chapter: StoryChapter | undefined, kind: string) => !!chapter?.waves.some((w) => w.boss && BOSS_BY_ID[w.boss]?.skills?.some((k) => k.kind === kind));

export class TribunalView {
  private lawBar: Phaser.GameObjects.Container | null = null;
  private lawTitle: Phaser.GameObjects.Text | null = null;
  private lawSub: Phaser.GameObjects.Text | null = null;
  private lawIcon: Phaser.GameObjects.Image | null = null;
  private lawKey = "";
  private marks = new Map<number, Mark>();
  private cells: { root: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; seen: string }[] = [];
  private cellText: Phaser.GameObjects.Text | null = null;
  private scaleG: Phaser.GameObjects.Graphics | null = null;
  private scaleText: Phaser.GameObjects.Text | null = null;
  private panG: Phaser.GameObjects.Graphics | null = null;
  private scaleKey = "";
  private floor: Phaser.GameObjects.Graphics | null = null;
  private floorKey = "";
  private floorText: Phaser.GameObjects.Text | null = null;
  private warn: number[] = [];
  private sentenceBar: Phaser.GameObjects.Container | null = null;
  private sentenceG: Phaser.GameObjects.Graphics | null = null;
  private sentenceKey = "";

  constructor(private scene: BattleScene, mech: ChapterMechanics | undefined) {
    const chapter = scene.story?.chapter;
    if (mech?.trial || bossHas(chapter, "decree")) this.buildLawBar();
    if (mech?.cells) this.buildCells(mech);
    if (mech?.scale) this.buildScale();
    if (mech?.collapse) this.buildFloor(mech);
    if (bossHas(chapter, "sentence")) this.buildSentence();
  }

  // ------------------------------------------------------------------ build

  private hudBlock(row: number, w = 460, h = 68, border = SILVER) {
    const a = hudAnchor(row);
    const bg = this.scene.add.graphics();
    bg.fillStyle(NAVY, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, 22).lineStyle(4, border, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    const root = this.scene.add.container(a.x, a.y, [bg]).setDepth(3000).setScrollFactor(0).setScale(a.scale);
    return { root, bg, w, h };
  }

  private buildLawBar() {
    const b = this.hudBlock(0, 480, 92, CRIMSON);
    this.lawTitle = txt(this.scene, 30, -20, "", 28, "#ffb0b0").setWordWrapWidth(380);
    this.lawSub = txt(this.scene, 30, 16, "", 19, "#ffffff").setWordWrapWidth(380);
    b.root.add([this.lawTitle, this.lawSub]);
    b.root.setVisible(false);
    this.lawBar = b.root;
  }

  private buildCells(mech: ChapterMechanics) {
    const b = this.hudBlock(0, 460, 60, BRASS);
    this.cellText = txt(this.scene, 0, 0, "", 24, "#ffd27a");
    b.root.add(this.cellText);
    void mech;
    this.scene.sim.cells.forEach((c) => {
      const g = this.scene.add.graphics();
      const root = this.scene.add.container(c.x, c.y, [g]).setDepth(1450);
      const key = `portrait:${c.card}`;
      if (this.scene.textures.exists(key)) {
        const img = this.scene.add.image(0, -4, key).setDisplaySize(54, 54).setAlpha(0.85);
        root.addAt(img, 0);
      }
      this.cells.push({ root, g, seen: "" });
    });
  }

  private buildScale() {
    const b = this.hudBlock(0, 460, 78, BRASS);
    this.scaleG = this.scene.add.graphics();
    this.scaleText = txt(this.scene, 0, 24, "", 20, "#ffd27a");
    b.root.add([this.scaleG, this.scaleText]);
    this.panG = this.scene.add.graphics().setDepth(60);
  }

  private buildFloor(mech: ChapterMechanics) {
    const b = this.hudBlock(0, 460, 56, BRASS);
    this.floorText = txt(this.scene, 0, 0, "", 22, "#ffd27a");
    b.root.add(this.floorText);
    this.floor = this.scene.add.graphics().setDepth(92);
    void mech;
  }

  private buildSentence() {
    const b = this.hudBlock(1, 460, 60, CRIMSON);
    this.sentenceG = this.scene.add.graphics();
    b.root.add([this.sentenceG, txt(this.scene, -210, -22, "SENTENCE", 16, "#ffb0b0", [0, 0.5])]);
    b.root.setVisible(false);
    this.sentenceBar = b.root;
  }

  // ----------------------------------------------------------------- events

  handle(e: SimEvent) {
    const s = this.scene;
    switch (e.type) {
      case "plea":
        this.plea(e);
        break;
      case "pleaed":
        banner(s, e.guilty ? "GUILTY" : "NOT GUILTY", e.guilty ? "#ffb347" : "#7dff7a", 56, 480);
        break;
      case "law":
        if (e.law || e.decree) banner(s, `LAW: ${LAWS[(e.decree ?? e.law) as LawId].name.toUpperCase()}`, "#ff8a8a", 44, 540);
        break;
      case "jail":
        if (e.on) {
          s.floater(e.x, e.y - 70, "JAILED", "#ff8a8a", 28);
          s.vfx("shadow_smoke", e.x, e.y, 110);
        }
        break;
      case "shackle":
        if (e.on) {
          s.floater(e.x, e.y - 70, "CHAINED!", "#c9d2ff", 30);
          s.vfx("ground_crater", e.x, e.y + 20, 110);
        } else {
          s.floater(e.x, e.y - 70, "FREE", "#7dff7a", 28);
          s.vfx("coin_burst", e.x, e.y - 20, 110);
        }
        break;
      case "cell": {
        const c = this.cells[e.index];
        if (!c) break;
        c.seen = "";
        s.vfx("hit_impact", e.x, e.y, 120);
        if (e.broken) {
          s.cameras.main.shake(220, 0.006);
          s.vfx("holy_heal", e.x, e.y - 10, 180);
          const name = UNIT_BY_ID[e.card]?.name ?? e.card;
          banner(s, `${name.toUpperCase()} IS FREE!`, "#ffd93b", 40, 520);
          s.unlockCard(e.card);
        } else s.floater(e.x, e.y - 50, `${e.hp}`, "#ffd27a", 26);
        break;
      }
      case "crush": {
        s.cameras.main.shake(160, 0.005);
        s.vfx("ground_crater", e.x, e.y + 20, 130);
        break;
      }
      case "collapse":
        if (e.warn) {
          this.warn = e.slots;
          banner(s, "THE FLOOR TREMBLES", "#ffb347", 46, 540);
          s.cameras.main.shake(500, 0.003);
        } else {
          this.warn = [];
          s.cameras.main.shake(700, 0.012);
          banner(s, "THE FLOOR FALLS!", "#ff8a8a", 50, 540);
          for (const slot of e.slots) {
            const p = s.slotPos(slot);
            s.vfx("ground_crater", p.x, p.y + 10, 150);
          }
        }
        break;
      case "unit_gone": {
        s.removeUnit(e.uid);
        if (e.why === "condemned") {
          s.vfx("arcane_vortex", e.x, e.y - 10, 190);
          s.floater(e.x, e.y - 80, "CONDEMNED", "#ff8a8a", 34);
          s.cameras.main.flash(260, 200, 210, 255);
        } else if (e.why === "fell") {
          s.floater(e.x, e.y - 70, e.mana ? `+${e.mana}` : "FELL", "#7fd8ff", 26);
          s.vfx("shadow_smoke", e.x, e.y, 120);
        } else s.vfx("holy_heal", e.x, e.y - 10, 130);
        break;
      }
      case "sentence":
        if (e.uid !== null) banner(s, "THE SENTENCE IS READ", "#ff8a8a", 44, 540);
        break;
    }
  }

  /** The plea screen: the count's charge, then Guilty or Not guilty. The battle holds until the player pleads. */
  private plea(e: Extract<SimEvent, { type: "plea" }>) {
    const s = this.scene;
    s.hold(true);
    const m = modal(s, 680, 1020, `COUNT ${e.wave} OF ${e.total}`);
    const wit = UNIT_BY_ID[e.witness]?.name ?? e.witness;
    const law = LAWS[e.law];
    m.add(txt(s, m.cx, m.cy - 380, e.land.toUpperCase(), 28, "#ffd27a"));
    m.add(txt(s, m.cx, m.cy - 325, e.title, 38, "#fff4c2").setWordWrapWidth(600));
    m.add(txt(s, m.cx, m.cy - 235, e.text, 24, "#c9d2ff").setWordWrapWidth(600));
    const pk = `portrait:${e.witness}`;
    if (s.textures.exists(pk)) m.add(s.add.image(m.cx, m.cy - 100, pk).setDisplaySize(140, 140));
    m.add(txt(s, m.cx, m.cy - 10, `${wit} stands witness for this land`, 22, "#ffffff").setWordWrapWidth(600));
    const pick = (guilty: boolean) => {
      m.close();
      s.sim.plead(guilty);
      s.hold(false);
      s.flush();
    };
    const hp = Math.round((e.guiltyHp - 1) * 100);
    const gx = m.cx;
    const g = button(s, gx, m.cy + 110, 560, 120, "GUILTY", "red", () => pick(true), 46);
    m.add(g);
    const gi = s.textures.exists("ui:plea_guilty") ? s.add.image(gx - 220, m.cy + 110, "ui:plea_guilty").setDisplaySize(70, 70) : null;
    if (gi) m.add(gi);
    m.add(txt(s, gx, m.cy + 195, `Enemies have +${hp}% HP, but ${wit} fights for you this count.`, 21, "#ffd6a0").setWordWrapWidth(560));
    const n = button(s, gx, m.cy + 290, 560, 120, "NOT GUILTY", "green", () => pick(false), 46);
    m.add(n);
    const ni = s.textures.exists("ui:plea_not_guilty") ? s.add.image(gx - 250, m.cy + 290, "ui:plea_not_guilty").setDisplaySize(70, 70) : null;
    if (ni) m.add(ni);
    m.add(txt(s, gx, m.cy + 375, `The Prosecutor declares a law: ${law.name}. ${law.text}`, 21, "#b8ffb8").setWordWrapWidth(560));
  }

  // ------------------------------------------------------------------ frame

  update() {
    const sim = this.scene.sim;
    this.drawLaw();
    this.syncMarks();
    this.drawCells();
    this.drawScale();
    this.drawFloor();
    this.drawSentence();
    void sim;
  }

  private drawLaw() {
    if (!this.lawBar) return;
    const s = this.scene.sim;
    const laws = s.activeLaws();
    const left = s.decree ? Math.max(0, Math.ceil(s.decree.until - s.now)) : 0;
    const key = `${s.law}|${s.decree?.law}|${left}|${s.bellRung}`;
    this.lawBar.setVisible(laws.length > 0 && !this.scene.over);
    if (key === this.lawKey) return;
    this.lawKey = key;
    const main = (s.law ?? s.decree?.law) as LawId | undefined;
    if (!main) return;
    const info = LAWS[main];
    this.lawTitle?.setText(s.law ? `LAW: ${info.name.toUpperCase()}` : `DECREE: ${info.name.toUpperCase()} (${left}s)`);
    this.lawSub?.setText(s.law && s.decree ? `Decree: ${LAWS[s.decree.law].name} (${left}s)` : info.text);
    this.lawIcon?.destroy();
    this.lawIcon = null;
    const tex = `ui:${info.icon}`;
    if (this.scene.textures.exists(tex)) {
      this.lawIcon = this.scene.add.image(-210, 0, tex).setDisplaySize(64, 64);
      this.lawBar.add(this.lawIcon);
    }
  }

  /** Bars over a jailed unit, a ring and the links left around a chained one. */
  private syncMarks() {
    const sim = this.scene.sim;
    const seen = new Set<number>();
    for (const su of sim.units) {
      if (!su || (!su.jailed && su.chain <= 0)) continue;
      const u = this.scene.getUnit(su.uid);
      if (!u) continue;
      seen.add(su.uid);
      let m = this.marks.get(su.uid);
      if (!m) {
        m = { g: this.scene.add.graphics(), t: txt(this.scene, 0, 0, "", 20, "#e8ecff"), key: "" };
        this.marks.set(su.uid, m);
      }
      const x = u.sprite.x;
      const y = u.sprite.y;
      m.g.setPosition(x, y).setDepth(2000 + y);
      m.t.setPosition(x, y + 34).setDepth(2001 + y);
      const key = `${su.jailed}|${su.chain}`;
      if (key === m.key) continue;
      m.key = key;
      m.g.clear();
      if (su.jailed) {
        m.g.fillStyle(NAVY, 0.35).fillRoundedRect(-36, -52, 72, 84, 10);
        m.g.lineStyle(6, SILVER, 0.95);
        for (const bx of [-24, -8, 8, 24]) m.g.lineBetween(bx, -50, bx, 30);
        m.g.lineStyle(7, BRASS, 1).lineBetween(-38, -50, 38, -50).lineBetween(-38, 30, 38, 30);
      }
      if (su.chain > 0) {
        m.g.lineStyle(7, 0xaab0c8, 1).strokeEllipse(0, 22, 74, 30);
        m.g.lineStyle(3, 0xe8ecff, 1).strokeEllipse(0, 22, 62, 22);
      }
      m.t.setText(su.chain > 0 ? `CHAIN ${su.chain}` : "JAILED");
      m.t.setColor(su.chain > 0 ? "#e8ecff" : "#ff8a8a");
    }
    for (const [uid, m] of this.marks) {
      if (seen.has(uid)) continue;
      m.g.destroy();
      m.t.destroy();
      this.marks.delete(uid);
    }
  }

  private drawCells() {
    const sim = this.scene.sim;
    if (!this.cells.length) return;
    let broken = 0;
    sim.cells.forEach((c, i) => {
      if (c.broken) broken++;
      const v = this.cells[i];
      if (!v) return;
      const key = `${c.hp}|${c.broken}`;
      if (key === v.seen) return;
      v.seen = key;
      const g = v.g;
      g.clear();
      if (c.broken) {
        this.scene.tweens.add({ targets: v.root, alpha: 0, y: v.root.y - 30, duration: 700, onComplete: () => v.root.setVisible(false) });
        return;
      }
      const frac = c.hp / c.max;
      g.fillStyle(NAVY, 0.55).fillRoundedRect(-36, -40, 72, 80, 12);
      g.lineStyle(5, BRASS, 1).strokeRoundedRect(-36, -40, 72, 80, 12);
      g.lineStyle(4, BRASS, 0.9);
      for (const bx of [-18, 0, 18]) g.lineBetween(bx, -38, bx, 38);
      g.fillStyle(NAVY, 1).fillRoundedRect(-30, 46, 60, 12, 6);
      g.fillStyle(frac > 0.5 ? 0xffd93b : 0xff8a3b, 1).fillRoundedRect(-28, 48, Math.max(6, 56 * frac), 8, 4);
    });
    this.cellText?.setText(`CELLS BROKEN ${broken} / ${sim.cells.length}`);
  }

  private drawScale() {
    if (!this.scaleG) return;
    const sim = this.scene.sim;
    const sc = this.scene.story?.chapter.mechanics?.scale;
    if (!sc) return;
    const l = sim.scaleL;
    const r = sim.scaleR;
    const diff = l - r;
    const heavy = Math.abs(diff) >= sc.gap ? (diff > 0 ? "left" : "right") : "";
    const key = `${l}|${r}|${heavy}`;
    if (key === this.scaleKey) return;
    this.scaleKey = key;
    const tilt = Phaser.Math.Clamp(diff / (sc.gap * 3), -1, 1) * 18;
    const g = this.scaleG;
    g.clear();
    g.lineStyle(8, BRASS, 1).lineBetween(-190, -tilt - 6, 190, tilt - 6);
    g.fillStyle(BRASS, 1).fillTriangle(0, -2, -12, 14, 12, 14);
    g.fillStyle(heavy === "left" ? CRIMSON : SILVER, 1).fillRoundedRect(-210, -tilt - 6, 60, 12, 6);
    g.fillStyle(heavy === "right" ? CRIMSON : SILVER, 1).fillRoundedRect(150, tilt - 6, 60, 12, 6);
    this.scaleText?.setText(heavy ? `${heavy.toUpperCase()} PAN IS CRUSHING  ·  ${l} vs ${r}` : `LEVEL  ·  ${l} vs ${r}`).setColor(heavy ? "#ff9a9a" : "#ffd27a");
    // The two pans over the board: the heavy one is red.
    const pg = this.panG;
    if (!pg) return;
    const a = this.scene.slotPos(0);
    const b = this.scene.slotPos(1);
    const c = this.scene.slotPos(3);
    const d = this.scene.slotPos(4);
    const bottom = this.scene.slotPos(10).y + 56;
    pg.clear();
    pg.fillStyle(heavy === "left" ? CRIMSON : SILVER, heavy === "left" ? 0.2 : 0.07).fillRoundedRect(a.x - 56, a.y - 56, b.x - a.x + 112, bottom - a.y + 56, 16);
    pg.fillStyle(heavy === "right" ? CRIMSON : SILVER, heavy === "right" ? 0.2 : 0.07).fillRoundedRect(c.x - 56, c.y - 56, d.x - c.x + 112, bottom - c.y + 56, 16);
    void panOf;
  }

  private drawFloor() {
    if (!this.floor) return;
    const sim = this.scene.sim;
    const cl = this.scene.story?.chapter.mechanics?.collapse;
    if (!cl) return;
    const now = Math.floor(sim.now * 3) % 2;
    const key = `${[...sim.fallen].join(",")}|${this.warn.join(",")}|${this.warn.length ? now : 0}`;
    const left = 15 - sim.fallen.size;
    const next = cl.at.find((n) => n > sim.wave);
    this.floorText?.setText(next ? `FLOOR: ${left} TILES · NEXT FALL AT WAVE ${next}` : `FLOOR: ${left} TILES · THE LAST STAND`);
    if (key === this.floorKey) return;
    this.floorKey = key;
    const g = this.floor;
    g.clear();
    for (const slot of sim.fallen) {
      const p = this.scene.slotPos(slot);
      g.fillStyle(0x05060f, 0.88).fillRoundedRect(p.x - 50, p.y - 44, 100, 96, 14);
      g.lineStyle(3, 0x4a5078, 1).lineBetween(p.x - 36, p.y - 30, p.x - 4, p.y + 4).lineBetween(p.x - 4, p.y + 4, p.x + 20, p.y - 20).lineBetween(p.x - 4, p.y + 4, p.x + 10, p.y + 36);
    }
    if (now) for (const slot of this.warn) {
      const p = this.scene.slotPos(slot);
      g.lineStyle(6, CRIMSON, 0.95).strokeRoundedRect(p.x - 50, p.y - 44, 100, 96, 14);
    }
  }

  private drawSentence() {
    if (!this.sentenceBar || !this.sentenceG) return;
    const sim = this.scene.sim;
    const b = sim.boss;
    const on = !!b && !b.gone && !!b.boss?.skills?.some((k) => k.kind === "sentence") && sim.sentenceMax > 0;
    this.sentenceBar.setVisible(on && !this.scene.over);
    if (!on) return;
    const key = `${sim.sentence}|${sim.sentenceMax}`;
    if (key === this.sentenceKey) return;
    this.sentenceKey = key;
    const g = this.sentenceG;
    g.clear();
    const n = sim.sentenceMax;
    const w = 330 / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle(i < sim.sentence ? CRIMSON : 0x3b4270, 1).fillRoundedRect(-120 + i * w, -8, w - 4, 20, 5);
    }
    g.lineStyle(2, SILVER, 0.7).strokeRoundedRect(-122, -10, 330 + 2, 24, 6);
    void css;
  }
}
