/**
 * Story balance check: runs Book 2 chapters headless on a few seeds and card levels with a fixed
 * full board, and prints wins, waves reached, lives and objectives. Compare a new chapter with
 * b2s1 (already tuned and live). Sleeping units are tapped awake after `WAKE` seconds, as a player would.
 *   node scripts/story-sim.ts                 every Book 2 chapter
 *   node scripts/story-sim.ts b2s2c1 b2s3c3   only these
 */
import { applyConfig, defaultConfig } from "../shared/config.ts";
import { Sim, type BoardUnit, type SimSetup } from "../shared/sim.ts";
import { ECONOMY } from "../shared/economy.ts";
import { BOOKS, findChapter } from "../shared/stories.ts";

applyConfig(defaultConfig());

const WAKE = 1.5;
const SEEDS = [11, 22, 33, 44, 55];
const LEVELS = [6, 8, 10];
const deck = ["aegis_knight", "berserker_sellsword", "hooded_archer", "goblin_bomber", "penguin_wizard", "tesla_gnome", "flame_adept", "princess_muse"];
const ranks = [3, 4, 5, 4, 3];

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : BOOKS[1].stories.flatMap((s) => s.chapters.filter((c) => !c.duel).map((c) => c.id));

for (const id of ids) {
  const f = findChapter(id);
  if (!f) throw new Error(`unknown chapter ${id}`);
  const row: string[] = [];
  for (const level of LEVELS) {
    let wins = 0, waves = 0, lives = 0;
    const obj: string[] = [];
    const fam = [0, 0];
    let stk = 0;
    const why: Record<string, number> = {};
    for (const seed of SEEDS) {
      const board: BoardUnit[] = Array.from({ length: 15 }, (_, i) => ({ id: deck[(i * 5 + 1) % deck.length], rank: ranks[(i + 2) % ranks.length] }));
      const setup: SimSetup = { arena: f.chapter.layout, board, cardLevel: level, powerUp: 0, hero: "young_king", seed, maxTime: 2400, scenario: { kind: "run", from: 1, to: Infinity } };
      const levels = Object.fromEntries(deck.map((d) => [d, level]));
      const sim = new Sim(setup, { story: f.chapter, deck, levels, startMana: ECONOMY.startMana });
      const asleepAt = new Map<number, number>();
      let stacks = 0;
      while (!sim.over) {
        sim.step();
        for (const e of sim.drainEvents()) {
          if (e.type === "sleep") e.asleep ? asleepAt.set(e.slot, sim.now) : asleepAt.delete(e.slot);
          if (e.type === "absorb") stacks = Math.max(stacks, e.stacks);
        }
        for (const [slot, t] of asleepAt) if (sim.now - t >= WAKE) sim.wake(slot);
      }
      const r = sim.result();
      if (r.outcome === "won") wins++;
      waves += r.wave;
      lives += sim.lives;
      // v2.3: evacuation (families saved / lost), Colossus stacks, and why a loss happened.
      fam[0] += sim.famSaved;
      fam[1] += sim.famLost;
      stk += stacks;
      if (r.outcome !== "won") why[sim.endWhy ? "families" : sim.lives <= 0 ? "lives" : r.outcome] = (why[sim.endWhy ? "families" : sim.lives <= 0 ? "lives" : r.outcome] ?? 0) + 1;
      if (r.objectives && (f.chapter.mechanics?.tidePools || f.chapter.mechanics?.faceless || f.chapter.mechanics?.cage)) obj.push(`${r.objectives.poolsLeft}p/${r.objectives.civiliansSaved}s/${r.objectives.civiliansHit}h`);
    }
    const n = SEEDS.length;
    row.push(`L${level}: ${wins}/${n} won, wave ${(waves / n).toFixed(1)}, lives ${(lives / n).toFixed(1)}${obj.length ? ` [${obj.join(" ")}]` : ""}${f.chapter.mechanics?.evacuation ? ` fam ${(fam[0] / n).toFixed(1)} saved / ${(fam[1] / n).toFixed(1)} lost` : ""}${stk ? ` stacks ${(stk / n).toFixed(1)}` : ""}${Object.keys(why).length ? ` (lost: ${Object.entries(why).map(([k, v]) => `${k} ${v}`).join(", ")})` : ""}`);
  }
  console.log(`${id.padEnd(7)} ${f.chapter.title.slice(0, 28).padEnd(28)} ${row.join(" | ")}`);
}
