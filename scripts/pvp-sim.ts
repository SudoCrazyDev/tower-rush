/**
 * Bot vs bot PvP matches, headless: how long matches last, what ends them, and whether a
 * board replays exactly from its log. Run: node scripts/pvp-sim.ts [matches] [skillA] [skillB]
 */
import { PvpBoard, replayBoard } from "../shared/pvpsim.ts";
import { PvpBot } from "../shared/pvpbot.ts";
import { PVP, pvpArena, type Loadout } from "../shared/pvp.ts";
import { indexUnits } from "../shared/units.ts";
import { indexMonsters } from "../shared/monsters.ts";
import { indexArenas } from "../shared/arenas.ts";
import { indexHeroes } from "../shared/heroes.ts";

indexUnits();
indexMonsters();
indexArenas();
indexHeroes();

const [n = 20, skillA = 0.6, skillB = 0.6] = process.argv.slice(2).map(Number);
const deck = ["hooded_archer", "goblin_bomber", "penguin_wizard", "tesla_gnome", "flame_adept"];
const loadout = (name: string): Loadout => ({ name, trophies: 0, deck, levels: Object.fromEntries(deck.map((id) => [id, 3])), hero: "young_king" });

let total = 0;
const ends: Record<string, number> = {};
const waves: number[] = [];
const sends = [0, 0];
const wins = [0, 0, 0];
let replayOk = 0;
for (let i = 0; i < n; i++) {
  const seed = 1000 + i;
  const arena = pvpArena(seed);
  const boards = [0, 1].map((side) => new PvpBoard({ seed, side: side as 0 | 1, arena, loadout: loadout(`bot${side}`) }));
  const bots = [0, 1].map((side) => new PvpBot(boards[side], side ? skillB : skillA, seed + side, (id) => boards[1 - side].apply({ t: "recv", id })));
  while (!boards[0].over && !boards[1].over) {
    bots[0].think();
    bots[1].think();
    boards[0].tick();
    boards[1].tick();
  }
  const [a, b] = boards;
  const winner = a.outcome === "lost" && b.outcome === "lost" ? 2 : a.outcome === "lost" ? 1 : b.outcome === "lost" ? 0 : a.hp > b.hp ? 0 : b.hp > a.hp ? 1 : 2;
  wins[winner]++;
  const why = a.outcome === "done" || b.outcome === "done" ? "maxWave" : "hp";
  ends[why] = (ends[why] ?? 0) + 1;
  total += a.now;
  waves.push(Math.max(a.wave, b.wave));
  sends[0] += a.counts.sends;
  sends[1] += b.counts.sends;
  const r = replayBoard(a.opts, a.actions, a.ticks);
  if (r.hp === a.hp && r.mana === a.mana && r.kills === a.kills && r.wave === a.wave) replayOk++;
  else console.log(`replay mismatch in match ${i}: hp ${r.hp}/${a.hp} mana ${r.mana}/${a.mana} kills ${r.kills}/${a.kills}`);
}
console.log(`${n} matches, skill ${skillA} vs ${skillB}`);
console.log(`avg length ${(total / n / 60).toFixed(1)} min, waves ${Math.min(...waves)}-${Math.max(...waves)} (avg ${(waves.reduce((x, y) => x + y, 0) / n).toFixed(1)})`);
console.log(`ended by`, ends, `wins A/B/draw`, wins, `avg sends`, sends.map((s) => (s / n).toFixed(1)));
console.log(`replays exact: ${replayOk}/${n}`);
console.log(`sudden death from wave ${PVP.rules.suddenDeathWave}, max ${PVP.rules.maxWave}`);
if (replayOk !== n) process.exitCode = 1;
