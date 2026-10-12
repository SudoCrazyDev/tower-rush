/**
 * Story balance check: runs Book 2 chapters headless on a few seeds and card levels with a fixed
 * full board, and prints wins, waves reached, lives and objectives. Compare a new chapter with
 * b2s1 (already tuned and live). Sleeping units are tapped awake after `WAKE` seconds, as a player would.
 *   node scripts/story-sim.ts                 every Book 2 chapter
 *   node scripts/story-sim.ts b2s2c1 b2s3c3   only these
 * v2.4 options (Story 5):
 *   --plea=guilty|not|alt   how the trial (b2s5c1) is pleaded: always guilty, always not guilty (default), or alternating
 *   --play                  start with an empty board and a greedy player (summon, merge, tap chains) instead of a fixed full board;
 *                           the realistic mode for the confiscated deck (b2s5c2) and the collapsing city (b2s5c4)
 * The row also shows crushes (Great Scale), cells broken, units condemned and jail events when they happen.
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

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}`))?.split("=")[1] ?? (args.includes(`--${name}`) ? "1" : null);
const PLEA = flag("plea") ?? "not";
const PLAY = args.includes("--play");
const ids = args.filter((a) => !a.startsWith("--")).length
  ? args.filter((a) => !a.startsWith("--"))
  : BOOKS[1].stories.flatMap((s) => s.chapters.filter((c) => !c.duel).map((c) => c.id));

for (const id of ids) {
  const f = findChapter(id);
  if (!f) throw new Error(`unknown chapter ${id}`);
  // Tuning knob: HPSCALE=3 node scripts/story-sim.ts b2s5c1 tries another hpScale without editing the story.
  if (process.env.HPSCALE) f.chapter.hpScale = Number(process.env.HPSCALE);
  if (process.env.GUILTYHP && f.chapter.mechanics?.trial) f.chapter.mechanics.trial.guiltyHp = Number(process.env.GUILTYHP);
  if (process.env.WRANK && f.chapter.mechanics?.trial) f.chapter.mechanics.trial.witnessRank = Number(process.env.WRANK);
  if (process.env.LASTHP) f.chapter.waves[f.chapter.waves.length - 1].hp = Number(process.env.LASTHP);
  const row: string[] = [];
  // The greedy player starts empty with a 5-card deck (the first is the one a confiscated deck keeps).
  const hand = PLAY ? ["hooded_archer", "aegis_knight", "berserker_sellsword", "goblin_bomber", "penguin_wizard"] : deck;
  for (const level of LEVELS) {
    let wins = 0, waves = 0, lives = 0;
    const obj: string[] = [];
    const fam = [0, 0];
    let stk = 0;
    const tally: Record<string, number> = {};
    const why: Record<string, number> = {};
    for (const seed of SEEDS) {
      const board: BoardUnit[] = PLAY
        ? new Array(15).fill(null)
        : Array.from({ length: 15 }, (_, i) => ({ id: deck[(i * 5 + 1) % deck.length], rank: ranks[(i + 2) % ranks.length] }));
      const setup: SimSetup = { arena: f.chapter.layout, board, cardLevel: level, powerUp: 0, hero: "young_king", seed, maxTime: 2400, scenario: { kind: "run", from: 1, to: Infinity } };
      const levels = Object.fromEntries(hand.map((d) => [d, level]));
      // v2.4: a trial's witnesses fight at the trial's witness level.
      const trial = f.chapter.mechanics?.trial;
      if (trial) for (const wv of f.chapter.waves) if (wv.charge) levels[wv.charge.witness] = trial.witnessLevel;
      const sim = new Sim(setup, { story: f.chapter, deck: hand, levels, startMana: ECONOMY.startMana });
      const asleepAt = new Map<number, number>();
      let stacks = 0;
      let tick = 0;
      let pleas = 0;
      while (!sim.over) {
        if (sim.pleaPending) sim.plead(PLEA === "guilty" ? true : PLEA === "alt" ? pleas++ % 2 === 0 : false);
        if (PLAY || f.chapter.mechanics?.collapse) {
          tick++;
          if (sim.canSummon) sim.summon();
          else if (tick % 30 === 0 && sim.mana > 250) for (const d of hand) if (sim.powerUp(d)) break;
          if (tick % 15 === 0) {
            for (let a = 0; a < 15; a++) for (let b = a + 1; b < 15; b++) if (sim.merge(a, b)) a = b = 15;
            for (let a = 0; a < 15; a++) if (sim.units[a]?.chain) sim.shake(a);
          }
        }
        sim.step();
        for (const e of sim.drainEvents()) {
          if (e.type === "sleep") e.asleep ? asleepAt.set(e.slot, sim.now) : asleepAt.delete(e.slot);
          if (e.type === "absorb") stacks = Math.max(stacks, e.stacks);
          // v2.4 counters: crushes, cells broken, units condemned, jailings.
          if (e.type === "crush") tally.crush = (tally.crush ?? 0) + 1;
          if (e.type === "cell" && e.broken) tally.cells = (tally.cells ?? 0) + 1;
          if (e.type === "unit_gone" && e.why === "condemned") tally.condemned = (tally.condemned ?? 0) + 1;
          if (e.type === "jail" && e.on) tally.jail = (tally.jail ?? 0) + 1;
          if (e.type === "shackle" && e.on) tally.chained = (tally.chained ?? 0) + 1;
          if (e.type === "unit_gone" && e.why === "lent") tally.lent = (tally.lent ?? 0) + 1;
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
    const extra = Object.entries(tally).map(([k, v]) => `${k} ${(v / n).toFixed(1)}`).join(", ");
    row.push(`L${level}: ${wins}/${n} won, wave ${(waves / n).toFixed(1)}, lives ${(lives / n).toFixed(1)}${obj.length ? ` [${obj.join(" ")}]` : ""}${f.chapter.mechanics?.evacuation ? ` fam ${(fam[0] / n).toFixed(1)} saved / ${(fam[1] / n).toFixed(1)} lost` : ""}${stk ? ` stacks ${(stk / n).toFixed(1)}` : ""}${extra ? ` {${extra}}` : ""}${Object.keys(why).length ? ` (lost: ${Object.entries(why).map(([k, v]) => `${k} ${v}`).join(", ")})` : ""}`);
  }
  console.log(`${id.padEnd(7)} ${f.chapter.title.slice(0, 28).padEnd(28)} ${row.join(" | ")}`);
}
