/**
 * v2.10 smoke test for the Heart Surgeon: Rooms, kill counts, Surgeon of Death's merge and Scalpel.
 *   node scripts/smoke-surgeon.ts
 */
import { applyConfig, defaultConfig } from "../shared/config.ts";
import { ARENAS } from "../shared/arenas.ts";
import { Sim, type BoardUnit, type SimEvent } from "../shared/sim.ts";
import { PvpBoard, replayBoard } from "../shared/pvpsim.ts";
import { PvpBot } from "../shared/pvpbot.ts";
import { pvpArena, type Loadout } from "../shared/pvp.ts";

applyConfig(defaultConfig());
let fail = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) fail++;
};

const sim = (board: (BoardUnit | null)[], to: number, maxTime = 3000) =>
  new Sim({ arena: ARENAS[0].id, board, cardLevel: 10, powerUp: 3, hero: null, seed: 11, maxTime, scenario: { kind: "run", from: 1, to } }, { view: true, awakens: () => true });

const rooms = (s: Sim) => s.fields.filter((f) => f.kind === "room");
const surgeons = (s: Sim) => s.units.filter((u) => u?.def.id === "heart_surgeon");

// Three plain Surgeons: one Room each, spread out, and kills inside them count.
{
  const board: (BoardUnit | null)[] = Array.from({ length: 15 }, (_, i) => (i < 3 ? { id: "heart_surgeon", rank: 3 } : i < 9 ? { id: "chrono_mage", rank: 4 } : null));
  const s = sim(board, 12);
  s.step();
  const r0 = rooms(s);
  check(r0.length === 3, `3 plain Surgeons keep 3 Rooms (got ${r0.length})`);
  const gaps = r0.flatMap((a, i) => r0.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y)));
  console.log(`  room gaps: ${gaps.map((g) => g.toFixed(0)).join(", ")}`);
  while (!s.over) s.step();
  const kills = surgeons(s).map((u) => u!.roomKills);
  console.log(`  plain run: wave ${s.result().wave} ${s.result().outcome}, room kills ${kills.join(", ")}`);
  check(kills.some((k) => k > 0), "monsters dying inside a Room count");
}

// Surgeon of Death: an awakened Surgeon merges every other one (with their kills), opens 4 Rooms, Scalpels bosses.
{
  const board: (BoardUnit | null)[] = Array.from({ length: 15 }, (_, i) =>
    i === 0 ? { id: "heart_surgeon", rank: 5, awakened: true } : i < 5 ? { id: "heart_surgeon", rank: 2 } : i < 11 ? { id: "chrono_mage", rank: 4 } : null,
  );
  const s = sim(board, 21, 5000);
  const events: SimEvent[] = [];
  s.step();
  events.push(...s.drainEvents());
  const left = surgeons(s);
  check(left.length === 1, `only one Surgeon left after the merge (got ${left.length})`);
  check(left[0]?.surgeons === 5, `merged count 5 (got ${left[0]?.surgeons})`);
  for (let i = 0; i < 3; i++) s.step();
  check(rooms(s).length === 4, `awakened Surgeon keeps 4 Rooms (got ${rooms(s).length})`);
  check(events.some((e) => e.type === "ultimate" && e.ult === "surgeon_of_death" && e.radius === 0), "merge event emitted");
  while (!s.over) {
    s.step();
    events.push(...s.drainEvents());
  }
  const cuts = events.filter((e) => e.type === "ultimate" && e.ult === "surgeon_of_death" && e.radius > 0);
  const u = surgeons(s)[0];
  console.log(`  awakened run: wave ${s.result().wave} ${s.result().outcome}, kills ${u?.roomKills}, scalpels ${cuts.length}, bosses killed ${s.result().counts?.bossesKilled ?? "?"}`);
  check(cuts.length > 0, "Scalpel cuts bosses");
  // Each boss is cut at most once per Room.
  const per = new Map<string, number>();
  for (const e of cuts) if (e.type === "ultimate") {
    const k = `${e.targets?.[0]}@${e.points?.[0].x},${e.points?.[0].y}`;
    per.set(k, (per.get(k) ?? 0) + 1);
  }
  check([...per.values()].every((n) => n === 1), "Scalpel triggers once per Room per boss");
}

// A Surgeon summoned after the awakening merges in too.
{
  const board: (BoardUnit | null)[] = Array.from({ length: 15 }, (_, i) => (i === 0 ? { id: "heart_surgeon", rank: 5, awakened: true } : null));
  const s = sim(board, 3);
  s.step();
  s.units[7] = null;
  // Reuse the Sim's own placement through a test board: put a plain Surgeon on a free tile.
  (s as unknown as { place(id: string, rank: number, slot: number): unknown }).place("heart_surgeon", 1, 7);
  s.step();
  check(surgeons(s).length === 1 && surgeons(s)[0]!.surgeons === 2, "a later Surgeon merges into the awakened one");
}

// PvP: a Surgeon deck plays out and replays exactly from its log.
{
  const deck = ["heart_surgeon", "chrono_mage", "void_titan", "fox_samurai", "ember_witch"];
  const loadout = (name: string): Loadout => ({ name, trophies: 0, deck, levels: Object.fromEntries(deck.map((id) => [id, 5])), hero: "young_king" });
  let exact = 0;
  for (let i = 0; i < 3; i++) {
    const seed = 900 + i;
    const arena = pvpArena(seed);
    const boards = [0, 1].map((side) => new PvpBoard({ seed, side: side as 0 | 1, arena, loadout: loadout(`hs${side}`) }));
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
    console.log(`  pvp match ${i}: wave ${a.wave}, kills ${a.kills}`);
  }
  check(exact === 3, "pvp Surgeon boards replay exactly");
}
process.exit(fail ? 1 : 0);
