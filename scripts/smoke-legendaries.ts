/**
 * v2.9.4 smoke test for the new Legendaries: Windrunner roots (and the root jumps on a rooted death),
 * Cursed Totem lends its neighbours an execute chance (never on bosses), Sea Serpent fights plain.
 *   node scripts/smoke-legendaries.ts
 */
import { applyConfig, defaultConfig } from "../shared/config.ts";
import { ARENAS } from "../shared/arenas.ts";
import { Sim, type BoardUnit, type SimEvent } from "../shared/sim.ts";
import { UNIT_BY_ID, canDrop } from "../shared/units.ts";
import { totemChance } from "../shared/reworks.ts";

applyConfig(defaultConfig());
let fail = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) fail++;
};

const sim = (board: (BoardUnit | null)[], to: number, maxTime = 3000) =>
  new Sim({ arena: ARENAS[0].id, board, cardLevel: 1, powerUp: 0, hero: null, seed: 11, maxTime, scenario: { kind: "run", from: 1, to } }, { view: true });
const boardOf = (units: Record<number, BoardUnit>) => Array.from({ length: 15 }, (_, i) => units[i] ?? null);
const run = (s: Sim) => {
  const events: SimEvent[] = [];
  while (!s.over) {
    s.step();
    events.push(...s.drainEvents());
  }
  return events;
};

// Windrunner roots monsters, and bosses only briefly.
{
  const s = sim(boardOf({ 7: { id: "windrunner", rank: 3 } }), 5);
  let rooted = 0;
  let bossMax = 0;
  let moving = 0;
  const events: SimEvent[] = [];
  while (!s.over) {
    s.step();
    events.push(...s.drainEvents());
    for (const m of s.monsters) {
      if (m.dead || m.gone || s.now >= m.rootedUntil) continue;
      rooted++;
      if (m.boss) bossMax = Math.max(bossMax, m.rootedUntil - s.now);
      if (m.speed(s.now) !== 0) moving++;
    }
  }
  const roots = events.filter((e) => e.type === "proc" && e.kind === "root").length;
  console.log(`  run: wave ${s.result().wave} ${s.result().outcome}, ${roots} fresh roots`);
  check(rooted > 0 && roots > 0, "Windrunner roots monsters");
  check(moving === 0, "rooted monsters don't move");
  check(bossMax <= 1.0001, `boss roots last 1s at most (got ${bossMax.toFixed(2)}s)`);
}

// A rooted death passes the root to the monsters around it.
{
  const s = sim(boardOf({ 7: { id: "sea_serpent", rank: 1 } }), 1);
  for (let i = 0; i < 400 && s.monsters.filter((m) => !m.dead && !m.gone && m.intro <= 0).length < 3; i++) s.step();
  const live = s.monsters.filter((m) => !m.dead && !m.gone);
  const [a, ...rest] = live;
  for (const o of rest) o.dist = a.dist + 10;
  a.rootedUntil = s.now + 5;
  (s as unknown as { kill(m: unknown, src: number): void }).kill(a, 7);
  check(rest.length > 0 && rest.every((o) => o.rootedUntil > s.now + 1.9), `the root jumps to ${rest.length} monsters nearby`);
}

// Cursed Totem: its neighbours execute; it never attacks; units away from it don't.
{
  check(Math.abs(totemChance(1, 1) - 0.014) < 1e-9 && Math.abs(totemChance(5, 1) - 0.03) < 1e-9, "Totem chance 1.4% at rank 1, 3.0% at rank 5");
  const s = sim(boardOf({ 6: { id: "cursed_totem", rank: 5 }, 7: { id: "sea_serpent", rank: 1 }, 1: { id: "hooded_archer", rank: 1 } }), 12, 4000);
  const events = run(s);
  const execs = events.filter((e) => e.type === "proc" && e.kind === "execute").length;
  console.log(`  run: wave ${s.result().wave} ${s.result().outcome}, ${execs} executes`);
  check(execs > 0, "a Totem neighbour executes monsters");
  check(s.units[6]!.kills === 0, "the Totem never attacks");
}

// Sea Serpent: DMG 97, one attack every 0.8s; it drops from chests.
{
  const d = UNIT_BY_ID.sea_serpent;
  check(d.damage === 97 && Math.abs(1 / d.speed - 0.8) < 1e-9 && d.rarity === "legendary", "Sea Serpent: Legendary, DMG 97, 0.8s");
  check(canDrop(d, () => false), "Sea Serpent drops from chests");
}

console.log(fail ? `${fail} FAILED` : "all ok");
process.exit(fail ? 1 : 0);
