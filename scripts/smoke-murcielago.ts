/**
 * v2.10 smoke test for Murcielago: Resurreccion, and the three ultimates (Dark Zero, Lanza, True Despair).
 *   node scripts/smoke-murcielago.ts
 */
import { applyConfig, defaultConfig } from "../shared/config.ts";
import { ARENAS } from "../shared/arenas.ts";
import { Sim, type BoardUnit, type SimEvent, type SimUnit } from "../shared/sim.ts";
import { ULTIMATES, type MurcVariant } from "../shared/awakened.ts";
import { PvpBoard, replayBoard } from "../shared/pvpsim.ts";
import { PvpBot } from "../shared/pvpbot.ts";
import { pvpArena, type Loadout } from "../shared/pvp.ts";

applyConfig(defaultConfig());
let fail = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) fail++;
};

const mk = (board: (BoardUnit | null)[], to: number, seed = 3, maxTime = 4000) =>
  new Sim({ arena: ARENAS[0].id, board, cardLevel: 10, powerUp: 3, hero: null, seed, maxTime, scenario: { kind: "run", from: 1, to } }, { view: true, awakens: () => true });
const murcs = (s: Sim) => s.units.filter((u): u is SimUnit => u?.def.id === "murcielago");
/** Force a variant on an awakened Murcielago (the roll is random). */
const force = (s: Sim, v: MurcVariant) => murcs(s).forEach((u) => u.awakened && (u.murc = v));
const ults = (ev: SimEvent[], variant?: string) => ev.filter((e) => e.type === "ultimate" && e.ult === "resurreccion" && (!variant || e.variant === variant));

// Resurreccion: plain Murcielagos awaken themselves (0.4% per attack) and roll a variant.
{
  const board: (BoardUnit | null)[] = Array.from({ length: 15 }, (_, i) => (i < 8 ? { id: "murcielago", rank: 1 } : null));
  const s = mk(board, 25);
  const ev: SimEvent[] = [];
  while (!s.over) {
    s.step();
    ev.push(...s.drainEvents());
  }
  const woke = ults(ev).filter((e) => e.type === "ultimate" && e.radius === 0);
  const aw = murcs(s).filter((u) => u.awakened);
  console.log(`  resurreccion run: wave ${s.result().wave} ${s.result().outcome}, releases ${woke.length}, awakened now ${aw.map((u) => `${u.murc}@r${u.rank}`).join(" ")}`);
  check(woke.length > 0, "Resurreccion awakens a Murcielago mid-fight");
  check(aw.every((u) => u.rank === 5 && !!u.murc), "released Murcielagos are rank 5 with a variant");
}

// Variants on an awakened Murcielago.
const run = (v: MurcVariant, extra: (BoardUnit | null)[] = [], to = 12) => {
  const board: (BoardUnit | null)[] = Array.from({ length: 15 }, (_, i) => (i === 0 ? { id: "murcielago", rank: 5, awakened: true } : (extra[i] ?? null)));
  const s = mk(board, to);
  s.step();
  force(s, v);
  const ev: SimEvent[] = [];
  while (!s.over) {
    s.step();
    ev.push(...s.drainEvents());
  }
  return { s, ev };
};
{
  const { s, ev } = run("zero");
  const beams = ults(ev, "zero");
  const multi = beams.filter((e) => e.type === "ultimate" && (e.targets?.length ?? 0) > 1).length;
  console.log(`  dark zero: wave ${s.result().wave} ${s.result().outcome}, beams ${beams.length}, multi-hit ${multi}, damage ${Math.round(s.result().damageBySlot?.[0] ?? 0)}`);
  check(beams.length > 0 && multi > 0, "Dark Zero beams pierce several monsters");
}
{
  const { s, ev } = run("lanza");
  const lances = ults(ev, "lanza");
  const volleys = lances.filter((e) => e.type === "ultimate" && (e.targets?.length ?? 0) >= 3).length;
  const u = murcs(s)[0];
  console.log(`  lanza: wave ${s.result().wave} ${s.result().outcome}, lances ${lances.length}, volleys ${volleys}, kills ${u?.kills}`);
  check(lances.length > 0, "Lanza del Relampago fires");
  check(volleys > 0, "Lanza rapid volleys (3-5) happen");
}
{
  // True Despair with another Murcielago and a neighbour: multipliers per the spec.
  const extra: (BoardUnit | null)[] = [];
  extra[1] = { id: "chrono_mage", rank: 3 }; // next to slot 0
  extra[14] = { id: "murcielago", rank: 5, awakened: true };
  extra[13] = { id: "chrono_mage", rank: 3 }; // not next to slot 0
  const board: (BoardUnit | null)[] = Array.from({ length: 15 }, (_, i) => (i === 0 ? { id: "murcielago", rank: 5, awakened: true } : (extra[i] ?? null)));
  const s = mk(board, 3);
  s.step();
  s.units[0]!.murc = "despair";
  s.units[14]!.murc = "zero";
  const d = (s as unknown as { despair(u: SimUnit): [number, number] }).despair.bind(s);
  const p = ULTIMATES.resurreccion.params;
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const [dd, ds] = d(s.units[0]!);
  check(close(dd, p.allyDmg * p.despairDmg * 2) && close(ds, p.allySpd * (p.despairSpd + 2)), `Despair x${dd.toFixed(2)} dmg x${ds.toFixed(2)} speed with N=2`);
  const [od, os] = d(s.units[14]!);
  check(close(od, p.allyDmg) && close(os, p.allySpd), "other awakened Murcielago gets x1.2 / x1.4");
  const [nd, ns] = d(s.units[1]!);
  check(close(nd, 1 / p.nearDmg) && close(ns, 1 / p.nearSpd), "neighbour is weakened /1.7 dmg, /1.2 speed");
  const [fd, fs] = d(s.units[13]!);
  check(fd === 1 && fs === 1, "a unit not next to Despair is untouched");
}

// PvP: a Murcielago deck replays exactly from its log.
{
  const deck = ["murcielago", "chrono_mage", "void_titan", "fox_samurai", "ember_witch"];
  const loadout = (name: string): Loadout => ({ name, trophies: 0, deck, levels: Object.fromEntries(deck.map((id) => [id, 5])), hero: "young_king" });
  let exact = 0;
  for (let i = 0; i < 3; i++) {
    const seed = 700 + i;
    const arena = pvpArena(seed);
    const boards = [0, 1].map((side) => new PvpBoard({ seed, side: side as 0 | 1, arena, loadout: loadout(`m${side}`) }));
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
  check(exact === 3, "pvp Murcielago boards replay exactly");
}
process.exit(fail ? 1 : 0);
