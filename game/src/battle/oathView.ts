/**
 * v2.3 Story 4 ("The Iron Oath") battle visuals: the evacuation counter and dragon dives, the Walking
 * Forge's part bars (tap one to aim every unit at it), rune shield breaks and the Colossus's absorb.
 * (Rune markers are drawn by Monster, the Colossus stack count by BattleScene.updateBossBar.)
 * A view only: the rules are in shared/sim.ts and shared/oath.ts.
 */
import Phaser from "phaser";
import type { SimEvent } from "../../../shared/sim.ts";
import type { ChapterMechanics } from "../../../shared/stories.ts";
import { BOSS_BY_ID } from "../../../shared/monsters.ts";
import { ELEMENT_COLOR } from "../data/units";
import { NAVY, txt } from "../ui";
import { banner, hudAnchor } from "./tideView";
import type { BattleScene } from "../scenes/BattleScene";

/** The part rows are this tall (px) in the HUD block. */
const ROW = 54;
const COLORS: Record<string, number> = { legs: 0xffb347, cannons: 0xff6a6a, furnace: 0xff8a3b, core: 0xb48cff };

type PartRow = { id: string; root: Phaser.GameObjects.Container; bar: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; note: Phaser.GameObjects.Text; seen: string };

export class OathView {
  private counter: Phaser.GameObjects.Text | null = null;
  private rows: PartRow[] = [];
  private panel: Phaser.GameObjects.Container | null = null;

  constructor(private scene: BattleScene, mech: ChapterMechanics | undefined) {
    if (mech?.evacuation) this.buildCounter(mech.evacuation.goal);
    if (mech?.forge) this.buildParts();
  }

  // ------------------------------------------------------------------ build

  private buildCounter(goal: number) {
    const a = hudAnchor(0);
    const bg = this.scene.add.graphics();
    bg.fillStyle(NAVY, 0.92).fillRoundedRect(-230, -34, 460, 68, 22).lineStyle(4, 0xffd27a, 1).strokeRoundedRect(-230, -34, 460, 68, 22);
    this.counter = txt(this.scene, 0, -10, "", 28);
    const sub = txt(this.scene, 0, 18, `Get ${goal} families out`, 20, "#ffd27a");
    this.scene.add.container(a.x, a.y, [bg, this.counter, sub]).setDepth(3000).setScrollFactor(0).setScale(a.scale);
    this.drawCounter();
  }

  private drawCounter() {
    const s = this.scene.sim;
    this.counter?.setText(`Out ${s.famSaved} / ${this.scene.story?.chapter.mechanics?.evacuation?.goal ?? 0}  ·  Lost ${s.famLost}`);
  }

  /** The Walking Forge's parts, one tappable bar each (built when the boss's parts are known). */
  private buildParts() {
    const a = hudAnchor(0);
    const defs = this.scene.story ? [...new Set(this.scene.story.chapter.waves.flatMap((w) => (w.boss ? [w.boss] : [])))] : [];
    const parts = defs.map((id) => BOSS_BY_ID[id]?.parts ?? []).find((p) => p.length) ?? [];
    this.panel = this.scene.add.container(a.x, a.y - 30).setDepth(3000).setScrollFactor(0).setScale(a.scale).setVisible(false);
    parts.forEach((p, i) => {
      const y = i * ROW;
      const bg = this.scene.add.graphics();
      const bar = this.scene.add.graphics();
      const label = txt(this.scene, -196, y, p.name.toUpperCase(), 22, "#ffffff", [0, 0.5]);
      const note = txt(this.scene, 196, y, "", 18, "#ffd27a", [1, 0.5]);
      bg.fillStyle(NAVY, 0.92).fillRoundedRect(-210, y - 22, 420, 44, 14);
      const root = this.scene.add.container(0, 0, [bg, bar, label, note]);
      // scrollFactor 0 like the panel: the wide layout scrolls the camera, and input hit-tests each child by its own factor.
      const hit = this.scene.add.rectangle(0, y, 420, 44, 0xffffff, 0.001).setScrollFactor(0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        if (this.scene.over || this.scene.paused) return;
        this.scene.sim.focusPart(p.id);
      });
      root.add(hit);
      this.panel!.add(root);
      this.rows.push({ id: p.id, root, bar, label, note, seen: "" });
    });
  }

  // ----------------------------------------------------------------- events

  handle(e: SimEvent) {
    const s = this.scene;
    switch (e.type) {
      case "family": {
        const m = s.getMonster(e.uid);
        if (e.fate === "saved") {
          m?.remove();
          s.vfx("holy_heal", e.x, e.y - 20, 120);
          s.floater(e.x, e.y - 60, "OUT!", "#7dff7a", 34);
        } else {
          m?.remove();
          s.cameras.main.shake(180, 0.006);
          s.vfx("fire_explosion", e.x, e.y - 20, 150);
          s.floater(e.x, e.y - 60, "LOST", "#ff6b6b", 38);
        }
        this.drawCounter();
        break;
      }
      case "dive": {
        // A dragon's swoop: a dark streak from the hunter to the family.
        const g = s.add.graphics().setDepth(2200);
        g.lineStyle(10, NAVY, 0.6).lineBetween(e.x, e.y, e.x2, e.y2);
        g.lineStyle(5, 0xff8a3b, 1).lineBetween(e.x, e.y, e.x2, e.y2);
        s.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
        s.floater(e.x, e.y - 40, "DIVE!", "#ffb347", 30);
        break;
      }
      case "rune":
        if (e.state === "broken") {
          s.vfx("arcane_vortex", e.x, e.y, 130);
          s.floater(e.x, e.y - 50, "RUNE BROKEN", `#${ELEMENT_COLOR[e.element].toString(16).padStart(6, "0")}`, 24);
        }
        break;
      case "part": {
        s.cameras.main.shake(300, 0.012);
        s.vfx("hit_impact", e.x, e.y, 260);
        s.vfx("fire_explosion", e.x, e.y, 200);
        banner(s, e.part === "core" ? "THE ANVIL-HEART IS FREE!" : `${e.name.toUpperCase()} BROKEN!`, "#ffd93b", e.part === "core" ? 46 : 54, 480);
        break;
      }
      case "absorb": {
        s.getMonster(e.uid)?.remove();
        s.vfx("shadow_smoke", e.x, e.y, 130);
        const boss = s.getMonster(e.boss);
        if (boss) {
          s.floater(boss.pos.x, boss.pos.y - 90, `x${e.stacks}`, "#c58bff", 34);
          s.tweens.add({ targets: boss.sprite, scaleX: boss.sprite.scaleX * 1.04, scaleY: boss.sprite.scaleY * 1.04, yoyo: true, duration: 120 });
        }
        break;
      }
    }
  }

  /** Every frame: the Forge's part bars follow the boss's parts. */
  update() {
    const b = this.scene.sim.boss;
    if (!this.panel) return;
    const on = !!b && !b.gone && b.parts.length > 0;
    this.panel.setVisible(on);
    if (!on || !b) return;
    const armored = b.parts.some((p) => p.id !== "core" && !p.broken);
    const target = b.parts.filter((p) => !p.broken).find((p) => p.id === b.focus) ?? b.parts.find((p) => !p.broken && p.id !== "core") ?? b.parts.find((p) => !p.broken);
    for (const row of this.rows) {
      const p = b.parts.find((x) => x.id === row.id);
      if (!p) continue;
      const frac = Math.max(0, p.hp / p.max);
      const key = `${Math.round(frac * 40)}|${p.broken}|${target?.id === p.id}|${armored}`;
      if (key === row.seen) continue;
      row.seen = key;
      const y = this.rows.indexOf(row) * ROW;
      const color = COLORS[p.id] ?? 0xb48cff;
      row.bar.clear();
      if (p.broken) row.bar.fillStyle(0x3b4270, 0.6).fillRoundedRect(-206, y - 18, 412, 36, 12);
      else {
        row.bar.fillStyle(color, 0.9).fillRoundedRect(-206, y - 18, Math.max(14, 412 * frac), 36, 12);
        if (target?.id === p.id) row.bar.lineStyle(5, 0xffffff, 1).strokeRoundedRect(-208, y - 20, 416, 40, 13);
      }
      row.label.setColor(p.broken ? "#8a90b8" : "#ffffff");
      row.note.setText(p.broken ? "BROKEN" : p.id === "core" && armored ? "ARMORED" : target?.id === p.id ? "AIMING" : "TAP TO AIM");
    }
  }
}
