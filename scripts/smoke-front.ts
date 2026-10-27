/** v3.0 smoke test: the Dark War's fronts shift in order (kills or the wave fallback). node scripts/smoke-front.ts */
import { applyConfig, defaultConfig } from "../shared/config.ts";
import { Sim, type BoardUnit } from "../shared/sim.ts";
import { ECONOMY } from "../shared/economy.ts";
import { BOOKS, findChapter } from "../shared/stories.ts";

applyConfig(defaultConfig());
const deck = ["hooded_archer", "flame_adept", "tesla_gnome", "penguin_wizard", "goblin_bomber"];
let bad = 0;
for (const s of BOOKS[2].stories) for (const c of s.chapters) {
  const f = findChapter(c.id)!;
  const board: BoardUnit[] = Array.from({ length: 15 }, (_, i) => ({ id: deck[i % deck.length], rank: 4 }));
  const sim = new Sim({ arena: c.layout, board, cardLevel: 10, powerUp: 0, hero: "young_king", seed: 7, maxTime: 2400, scenario: { kind: "run", from: 1, to: Infinity } }, { story: f.chapter, deck, levels: Object.fromEntries(deck.map((d) => [d, 10])), startMana: ECONOMY.startMana });
  const shifts: string[] = [];
  while (!sim.over) {
    sim.step();
    for (const e of sim.drainEvents()) if (e.type === "front") shifts.push(`w${sim.wave}:${e.to}`);
  }
  const want = c.mechanics!.front!.fronts.length - 1;
  if (shifts.length !== want) bad++;
  console.log(`${c.id} ${sim.result().outcome} shifts ${shifts.length}/${want} ${shifts.join(" ")}`);
}
if (bad) process.exit(1);
