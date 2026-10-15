/**
 * v2.8 smoke test for the Orc units: runs headless Sims and checks their rules fire.
 *   node scripts/smoke-orcs.ts
 */
import { applyConfig, defaultConfig } from "../shared/config.ts";
import { ARENAS } from "../shared/arenas.ts";
import { Sim, type BoardUnit, type SimEvent } from "../shared/sim.ts";
import { gruntMult, gruntTier, pillageChance } from "../shared/reworks.ts";
import { PvpBoard, replayBoard } from "../shared/pvpsim.ts";
import { PvpBot } from "../shared/pvpbot.ts";
import { pvpArena, type Loadout } from "../shared/pvp.ts";

applyConfig(defaultConfig());
let fail = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) fail++;
};

check(gruntMult(9) === 1 && gruntMult(10) === 2 && gruntMult(20) === 4 && gruntMult(30) === 7 && gruntMult(35) === 10.5 && Math.abs(gruntMult(40) - 15.75) < 1e-9, "gruntMult steps");
check(gruntTier(0) === 0 && gruntTier(10) === 1 && gruntTier(20) === 2 && gruntTier(30) === 3 && gruntTier(34) === 3 && gruntTier(35) === 4, "gruntTier steps");
check(pillageChance(0) === 0.5 && Math.abs(pillageChance(3) - 0.56) < 1e-9 && pillageChance(100) === 1, "pillageChance");

function run(board: (BoardUnit | null)[], to: number, maxTime = 2000) {
  const sim = new Sim({ arena: ARENAS[0].id, board, cardLevel: 10, powerUp: 3, hero: null, seed: 7, maxTime, scenario: { kind: "run", from: 1, to } }, { view: true });
  const events: SimEvent[] = [];
  let drums = new Set<number>();
  while (!sim.over) {
    sim.step();
    events.push(...sim.drainEvents());
    drums.add(sim.drums);
  }
  return { sim, events, drums, r: sim.result() };
}

const strong = (id: string, rank = 5): BoardUnit => ({ id, rank });
// Grunts with strong helpers so they live to wave 36.
{
  const board: (BoardUnit | null)[] = Array.from({ length: 15 }, (_, i) => (i < 5 ? strong("grunt") : strong(i % 2 ? "void_titan" : "chrono_mage")));
  const { events, r } = run(board, 36, 4000);
  const tiers = events.filter((e): e is Extract<SimEvent, { type: "berserk" }> => e.type === "berserk").map((e) => e.tier);
  console.log(`  grunt run: wave ${r.wave} ${r.outcome}, berserk tiers seen ${[...new Set(tiers)].join(",")}`);
  check(tiers.includes(1) && tiers.includes(2), "grunt berserk tier-ups emitted");
}
// Headhunter, Spirit Walker, Kodo, Peon together.
{
  const ids = ["headhunter", "spirit_walker", "kodo_beasts", "peon", "grunt"];
  const board: (BoardUnit | null)[] = Array.from({ length: 15 }, (_, i) => strong(ids[i % ids.length], 3));
  const { events, drums, r } = run(board, 25, 3000);
  const pushes = events.filter((e) => e.type === "spirit_push").length;
  const pillages = events.filter((e) => e.type === "pillage").length;
  const pulses = events.filter((e) => e.type === "mana" && e.source === "pulse").length;
  console.log(`  mixed run: wave ${r.wave} ${r.outcome}, pushes ${pushes}, pillages ${pillages}/${pulses}, drum stages ${[...drums].sort().join(",")}`);
  check(pushes > 0, "spirit walker pushes");
  // 12 other Orcs at rank 3: +72%, so every pulse pillages (capped at 100%).
  check(pillages > 0 && pillages === pulses, "peon pillage at the cap always doubles");
  check(drums.has(0), "kodo drums stage 0 seen");
}
// PvP: an Orc deck plays out and replays exactly from its log (the rules are deterministic).
{
  const deck = ["peon", "grunt", "headhunter", "spirit_walker", "kodo_beasts"];
  const loadout = (name: string): Loadout => ({ name, trophies: 0, deck, levels: Object.fromEntries(deck.map((id) => [id, 3])), hero: "young_king" });
  let exact = 0;
  for (let i = 0; i < 4; i++) {
    const seed = 500 + i;
    const arena = pvpArena(seed);
    const boards = [0, 1].map((side) => new PvpBoard({ seed, side: side as 0 | 1, arena, loadout: loadout(`orc${side}`) }));
    const bots = [0, 1].map((side) => new PvpBot(boards[side], 0.6, seed + side, (id) => boards[1 - side].apply({ t: "recv", id })));
    while (!boards[0].over && !boards[1].over) {
      bots[0].think();
      bots[1].think();
      boards[0].tick();
      boards[1].tick();
    }
    const a = boards[0];
    const r = replayBoard(a.opts, a.actions, a.ticks);
    if (r.hp === a.hp && r.mana === a.mana && r.kills === a.kills && r.wave === a.wave) exact++;
    console.log(`  pvp orc match ${i}: wave ${a.wave}, kills ${a.kills}`);
  }
  check(exact === 4, "pvp orc boards replay exactly");
}
process.exit(fail ? 1 : 0);
