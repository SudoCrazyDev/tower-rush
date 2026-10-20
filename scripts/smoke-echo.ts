/**
 * v2.10 smoke test for the Echo Spirit rework: it becomes an exact copy of a neighbour (any unit
 * when no neighbour has one), copies anew after every boss wave and merges as an Echo Spirit.
 *   node scripts/smoke-echo.ts
 */
import { applyConfig, defaultConfig } from "../shared/config.ts";
import { ARENAS } from "../shared/arenas.ts";
import { Sim, mergeable, type BoardUnit, type SimEvent } from "../shared/sim.ts";

applyConfig(defaultConfig());
let fail = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) fail++;
};

const sim = (board: (BoardUnit | null)[], to: number, maxTime = 3000) =>
  new Sim({ arena: ARENAS[0].id, board, cardLevel: 10, powerUp: 3, hero: null, seed: 7, maxTime, scenario: { kind: "run", from: 1, to } }, { view: true, awakens: () => true });
const boardOf = (units: Record<number, BoardUnit>) => Array.from({ length: 15 }, (_, i) => units[i] ?? null);

// Next to an awakened rank 5 Mythic: an exact copy (unit, rank, awakening), keeping its own rank.
{
  const s = sim(boardOf({ 0: { id: "echo_spirit", rank: 2 }, 1: { id: "void_titan", rank: 5, awakened: true }, 12: { id: "flame_adept", rank: 1 } }), 3);
  s.step();
  const u = s.units[0]!;
  check(u.def.id === "void_titan" && u.rank === 5 && u.awakened, `copies the neighbour exactly (got ${u.def.id} r${u.rank} awakened=${u.awakened})`);
  check(u.echoRank === 2, `keeps its own rank 2 (got ${u.echoRank})`);
  const real = s.units[1]!;
  check(u.stats.damage === real.stats.damage && u.stats.speed === real.stats.speed, "100% of the copied unit's stats");
}

// No neighbour: copies any unit on the board.
{
  const s = sim(boardOf({ 0: { id: "echo_spirit", rank: 1 }, 14: { id: "flame_adept", rank: 3 } }), 3);
  s.step();
  check(s.units[0]?.def.id === "flame_adept" && s.units[0]?.rank === 3, `no neighbour: copies a unit elsewhere (got ${s.units[0]?.def.id})`);
}

// Never copies another Echo Spirit; alone, it waits.
{
  const s = sim(boardOf({ 0: { id: "echo_spirit", rank: 1 }, 1: { id: "echo_spirit", rank: 1 } }), 3);
  s.step();
  check(s.units[0]?.def.id === "echo_spirit" && s.units[1]?.def.id === "echo_spirit", "two lone Echo Spirits stay Echo Spirits");
}

// Copies merge as Echo Spirits of their own rank, whatever they copied.
{
  const s = sim(boardOf({ 0: { id: "echo_spirit", rank: 2 }, 1: { id: "void_titan", rank: 5 }, 4: { id: "echo_spirit", rank: 2 }, 3: { id: "flame_adept", rank: 1 } }), 3);
  s.step();
  const [a, b] = [s.units[0]!, s.units[4]!];
  check(a.def.id !== b.def.id && mergeable(a, b), `copies of ${a.def.id} and ${b.def.id} (both Echo rank 2) can merge`);
  check(!mergeable(a, s.units[1]!), "a copy doesn't merge with the real unit it copied");
}

// After every boss wave each copy copies anew (a random neighbour).
{
  const s = sim(boardOf({ 2: { id: "echo_spirit", rank: 3 }, 1: { id: "flame_adept", rank: 4 }, 3: { id: "hooded_archer", rank: 4 }, 7: { id: "void_titan", rank: 4 }, 8: { id: "chrono_mage", rank: 4 } }), 16, 6000);
  const events: SimEvent[] = [];
  while (!s.over) {
    s.step();
    events.push(...s.drainEvents());
  }
  const echoes = events.filter((e) => e.type === "become" && e.why === "echo");
  const waves = echoes.map((e) => e.t.toFixed(0));
  console.log(`  run: wave ${s.result().wave} ${s.result().outcome}, echo copies at t=${waves.join(", ")}: ${echoes.map((e) => (e.type === "become" ? e.id : "")).join(", ")}`);
  check(echoes.length >= 3, `copies at the start and after boss waves 5 and 10 (got ${echoes.length})`);
}

console.log(fail ? `${fail} FAILED` : "all ok");
process.exit(fail ? 1 : 0);
