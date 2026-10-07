/**
 * Golden-master combat test: runs the headless Sim for every unit (ranks 1, 4, 7) plus a few
 * mixed decks on fixed seeds, with the DEFAULT config, and compares the numbers with
 * scripts/golden.json. Refactors must not change them.
 *   node scripts/golden.ts          compare, exit 1 on any difference
 *   node scripts/golden.ts --write  rewrite scripts/golden.json (only for intended balance changes)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { applyConfig, defaultConfig } from "../shared/config.ts";
import { DEFAULT_UNITS, UNITS, indexUnits, type UnitDef } from "../shared/units.ts";
import type { ArchSlot, PerkSlot } from "../shared/kit.ts";
import { ARENAS } from "../shared/arenas.ts";
import { Sim, type BoardUnit, type SimSetup, type SimFx, type SimOptions, type SimResult } from "../shared/sim.ts";
import { ECONOMY } from "../shared/economy.ts";
import { findChapter } from "../shared/stories.ts";

applyConfig(defaultConfig());

const FILE = new URL("./golden.json", import.meta.url);
const SEED = 4242;
const WAVES = 10;
const MAX_TIME = 300;

/** Sim that also hashes every mark() call (FNV-1a), uncapped by the fx list limit. */
class GoldenSim extends Sim {
  hash = 2166136261;
  marks = 0;
  protected override mark(kind: SimFx["kind"], x: number, y: number, color: string, extra: Partial<SimFx> = {}) {
    const s = `${kind}|${x.toFixed(2)}|${y.toFixed(2)}|${color}|${extra.text ?? ""}|${this.now.toFixed(3)}`;
    for (let i = 0; i < s.length; i++) this.hash = Math.imul(this.hash ^ s.charCodeAt(i), 16777619) >>> 0;
    this.marks++;
    super.mark(kind, x, y, color, extra);
  }
}

const sig = (n: number) => (Number.isFinite(n) ? Number(n.toPrecision(6)) : n);

function run(board: (BoardUnit | null)[], hero: string | null, seed = SEED) {
  const setup: SimSetup = {
    arena: ARENAS[0].id,
    board,
    cardLevel: 5,
    powerUp: 0,
    hero,
    heroCharged: true,
    seed,
    maxTime: MAX_TIME,
    scenario: { kind: "run", from: 1, to: WAVES },
  };
  const sim = new GoldenSim(setup);
  const r = sim.run();
  return summary(sim, r);
}

function summary(sim: GoldenSim, r: SimResult) {
  return {
    damage: sig(r.totalDamage),
    heroDamage: sig(r.heroDamage),
    kills: r.kills,
    leaks: r.leaks,
    mana: sig(r.manaGained),
    wave: r.wave,
    outcome: r.outcome,
    time: sig(r.time),
    marks: sig(sim.marks),
    markHash: sim.hash.toString(16),
    slotDamage: r.damageBySlot.map(sig).join(","),
    slotKills: r.killsBySlot.join(","),
  };
}

const out: Record<string, Record<string, unknown>> = {};

for (const u of DEFAULT_UNITS) {
  for (const rank of [1, 4, 7]) {
    out[`unit:${u.id}:r${rank}`] = run(Array.from({ length: 15 }, () => ({ id: u.id, rank })), null);
  }
}

const decks: Record<string, string[]> = {
  buffs: ["banner_herald", "lute_bard", "moon_oracle", "sun_priestess", "hooded_archer", "flame_adept", "penguin_wizard", "tesla_gnome"],
  aegis: ["aegis_knight", "oath_knight", "hooded_archer", "goblin_bomber", "cactus_gunslinger", "wind_sylph"],
  knights: ["pentagonal_knight", "lance_knight", "oath_knight", "lantern_knight", "aegis_knight", "rogue_knight", "hired_blade", "powder_grenadier", "berserker_sellsword"],
  mana: ["princess_muse", "lucky_cat", "star_astronomer", "echo_spirit", "mime", "portal_imp", "mirror_slime", "chrono_mage", "storm_totem"],
  supports: ["gear_engineer", "bee_keeper", "snowglobe_fairy", "frog_alchemist", "spore_sage", "witch_doctor", "bone_necromancer", "hourglass_owl", "anubis_priest"],
  mixed: ["banner_herald", "aegis_knight", "lance_knight", "princess_muse", "lute_bard", "valkyrie", "crystal_queen", "void_titan", "ember_witch", "dragon_egg"],
};
const ranks = [1, 3, 5, 2, 4, 6, 7];
for (const [name, ids] of Object.entries(decks)) {
  for (const hero of [null, "young_king"]) {
    if (hero && name !== "mixed" && name !== "knights") continue;
    const board = Array.from({ length: 15 }, (_, i) => ({ id: ids[(i * 7 + 3) % ids.length], rank: ranks[i % ranks.length] }));
    out[`deck:${name}${hero ? ":hero" : ""}`] = run(board, hero);
  }
}

// ---------------------------------------------------------------- v2 P1b: whole-battle runs

/** Run a sim to the end, calling `hook` before every step and counting the structured events. */
function drive(sim: GoldenSim, hook?: (s: GoldenSim) => void) {
  const events: Record<string, number> = {};
  let tetherSteps = 0;
  let guard = 0;
  while (!sim.over && guard++ < 1e6) {
    hook?.(sim);
    sim.step();
    if (sim.tethers.length) tetherSteps++;
    for (const e of sim.drainEvents()) events[e.type] = (events[e.type] ?? 0) + 1;
  }
  const r = sim.result();
  return {
    ...summary(sim, r),
    stars: r.stars,
    counts: Object.entries(r.counts).map(([k, v]) => `${k}=${sig(v)}`).join(","),
    events: Object.keys(events).sort().map((k) => `${k}=${events[k]}`).join(","),
    tetherSteps,
    lives: sim.lives,
    bubbles: sim.bubbles.length,
  };
}

const mixedIds = decks.mixed;
const mixedBoard = (): BoardUnit[] => Array.from({ length: 15 }, (_, i) => ({ id: mixedIds[(i * 7 + 3) % mixedIds.length], rank: ranks[i % ranks.length] }));
const levels = Object.fromEntries([...mixedIds, "gnome_brewer", "hooded_archer", "goblin_bomber", "penguin_wizard", "tesla_gnome", "flame_adept", "aegis_knight", "berserker_sellsword", "princess_muse", "lucky_cat", "mime", "portal_imp"].map((id) => [id, 5]));

// Story chapters: scripted waves, shuffle, boss first, per-wave hp, hpScale, win and stars. Chapters with
// bosses on most waves (boss-first queues), Chaos Taffy tethers, a split boss, layers, charm and a portal boss.
const storyDeck = ["aegis_knight", "berserker_sellsword", "hooded_archer", "goblin_bomber", "penguin_wizard", "tesla_gnome", "flame_adept", "princess_muse"];
for (const id of ["s1c1", "s2c2", "s2c3", "s3c3"]) {
  const f = findChapter(id);
  if (!f) throw new Error(`golden: story chapter ${id} missing`);
  const board: BoardUnit[] = Array.from({ length: 15 }, (_, i) => ({ id: storyDeck[(i * 5 + 1) % storyDeck.length], rank: ranks[(i + 2) % ranks.length] }));
  const setup: SimSetup = {
    arena: f.chapter.layout,
    board,
    cardLevel: 5,
    powerUp: 0,
    hero: "young_king",
    seed: SEED,
    maxTime: 2400,
    scenario: { kind: "run", from: 1, to: Infinity },
  };
  out[`story:${id}`] = drive(new GoldenSim(setup, { story: f.chapter, deck: storyDeck, levels, startMana: ECONOMY.startMana }));
}

// Boss powers that changed in P1b: the portal boss (minions step out 0.6 s later) and layers (pulse skips dragged units).
for (const boss of ["portal_wizard", "chaos_jawbreaker", "sour_gummy_hydra"]) {
  const setup: SimSetup = { arena: ARENAS[2].id, board: mixedBoard(), cardLevel: 5, powerUp: 1, hero: "young_king", heroCharged: true, seed: SEED, maxTime: 400, scenario: { kind: "boss", boss, wave: 10, escort: true } };
  out[`boss:${boss}`] = drive(new GoldenSim(setup, { levels }), boss === "chaos_jawbreaker" ? (s) => s.setDragging(4, s.now > 5 && s.now < 60) : undefined);
}

// A unit dragged for 25 seconds across a boss wave: it freezes, and boss powers and neighbour effects skip it.
for (const slot of [7, 8]) {
  const setup: SimSetup = { arena: ARENAS[0].id, board: mixedBoard(), cardLevel: 5, powerUp: 0, hero: "young_king", heroCharged: true, seed: SEED, maxTime: MAX_TIME, scenario: { kind: "run", from: 1, to: WAVES } };
  out[`drag:slot${slot}`] = drive(new GoldenSim(setup), (s) => {
    if (s.now >= 15 && s.now < 40) s.setDragging(slot, true);
    else s.setDragging(slot, false);
  });
}

// Brewers with bubbles: tapped as soon as they appear (+tapBonus) against left alone (they pop by themselves).
{
  const board: BoardUnit[] = Array.from({ length: 15 }, (_, i) => ({ id: i % 3 === 0 ? "gnome_brewer" : "hooded_archer", rank: 2 + (i % 4) }));
  for (const taps of [false, true]) {
    const setup: SimSetup = { arena: ARENAS[0].id, board, cardLevel: 5, powerUp: 0, hero: null, seed: SEED, maxTime: MAX_TIME, scenario: { kind: "run", from: 1, to: WAVES } };
    out[`brew:${taps ? "taps" : "notaps"}`] = drive(new GoldenSim(setup, { bubbles: true }), taps ? (s) => s.bubbles.filter((b) => s.now - b.at >= 0.3).forEach((b) => s.collectBrew(b.id)) : undefined);
  }
}

// A scripted player: summon, merge, copy, swap, hop, power-ups and a manual hero cast on a growing board,
// with a tutorial pick for the first two summons.
{
  const deck = ["hooded_archer", "goblin_bomber", "penguin_wizard", "lucky_cat", "mime", "portal_imp", "gnome_brewer", "aegis_knight"];
  const setup: SimSetup = { arena: ARENAS[1].id, board: new Array(15).fill(null), cardLevel: 5, powerUp: 0, hero: "young_king", seed: SEED, maxTime: 600, scenario: { kind: "run", from: 1, to: Infinity } };
  const sim = new GoldenSim(setup, { deck, levels, startMana: ECONOMY.startMana, autoHero: false, bubbles: true, awakens: (id) => id === "hooded_archer" });
  sim.tutorialPick = { id: "hooded_archer", slot: 6 };
  let tick = 0;
  out["actions:scripted"] = drive(sim, (s) => {
    tick++;
    if (tick % 15 === 0) s.summon();
    if (tick % 45 === 0) for (let a = 0; a < 15; a++) for (let b = a + 1; b < 15; b++) if (s.merge(a, b)) return;
    if (tick % 90 === 0) for (let a = 0; a < 15; a++) { if (s.mimeReady(a)) for (let b = 0; b < 15; b++) if (s.copy(a, b)) return; }
    if (tick % 100 === 0) for (let a = 0; a < 15; a++) if (s.portalReady(a)) { const free = s.units.findIndex((u) => !u); if (free >= 0 && s.hop(a, free)) return; }
    if (tick % 120 === 0) s.powerUp(deck[(tick / 120) % deck.length]);
    if (tick % 300 === 0) s.useHero();
    s.bubbles.forEach((b) => s.now - b.at >= 0.5 && s.collectBrew(b.id));
  });
}

// ---------------------------------------------------------------- v2 P3: combat reads the kit

/** Register a copy of a default unit with a new kit and/or perks, built programmatically. */
function kitUnit(id: string, base: string, kit: ArchSlot[] | null, perks: PerkSlot[] | null): string {
  const b = DEFAULT_UNITS.find((u) => u.id === base);
  if (!b) throw new Error(`golden: unit ${base} missing`);
  const u: UnitDef = structuredClone(b);
  u.id = id;
  if (kit) u.kit = kit;
  if (perks) u.perks = perks;
  UNITS.push(u);
  indexUnits();
  return id;
}
const kitRun = (id: string, rank = 4) => run(Array.from({ length: 15 }, () => ({ id, rank })), null);
const kitRuns: Record<string, [string, ArchSlot[] | null, PerkSlot[] | null]> = {
  lance_t3: ["lance_knight", [{ arch: "pierce", tune: { targets: 3 } }, { arch: "bane" }], null],
  pierce_t5: ["fox_spearman", [{ arch: "pierce", tune: { targets: 5 } }], null],
  sniper_execute: ["star_astronomer", [{ arch: "sniper" }, { arch: "execute", tune: { chance: 0.05 } }], null],
  splash_freeze: ["goblin_bomber", [{ arch: "splash" }, { arch: "freeze" }], null],
  chain_poison: ["tesla_gnome", [{ arch: "chain" }, { arch: "poison" }], null],
  shot_crit_execute_slow: ["wolf_hunter", [{ arch: "shot" }, { arch: "crit" }, { arch: "execute" }, { arch: "slow" }], null],
  two_perks: ["wind_sylph", null, [{ perk: "hunter", value: 0.8 }, { perk: "giant_slayer", value: 0.6 }]],
  armor_breaker_half: ["clockwork_turret", null, [{ perk: "armor_breaker", value: 0.5 }]],
  true_strike_half: ["hooded_archer", null, [{ perk: "true_strike", value: 0.5 }]],
};
for (const [name, [base, kit, perks]] of Object.entries(kitRuns)) out[`kit:${name}`] = kitRun(kitUnit(`kit_${name}`, base, kit, perks));

// A buff unit hands its perk to a neighbour that has the same perk: the higher value wins either way.
for (const [name, handed, own] of [["buff_high", 0.8, 0.2], ["buff_low", 0.2, 0.8]] as const) {
  const buff = kitUnit(`kit_${name}_bard`, "lute_bard", null, [{ perk: "hunter", value: handed }]);
  const shooter = kitUnit(`kit_${name}_shooter`, "wind_sylph", null, [{ perk: "hunter", value: own }]);
  out[`kit:${name}`] = run(Array.from({ length: 15 }, (_, i) => ({ id: i % 2 ? shooter : buff, rank: 4 })), null);
}

// Training dummies of one monster, standing in a row: pierce reach, armor and dodges show up in the damage.
function dummyRun(unit: string, monster: string, rank = 4, wave = 3) {
  const setup: SimSetup = { arena: ARENAS[0].id, board: Array.from({ length: 15 }, () => ({ id: unit, rank })), cardLevel: 5, powerUp: 0, hero: null, seed: SEED, maxTime: 40, scenario: { kind: "dummies", count: 8, wave, duration: 30, monster } };
  const sim = new GoldenSim(setup);
  return summary(sim, sim.run());
}
const noBreaker = kitUnit("kit_no_breaker", "clockwork_turret", null, []);
const noStrike = kitUnit("kit_no_strike", "hooded_archer", null, []);
for (const id of ["lance_knight", "kit_lance_t3", "fox_spearman", "kit_pierce_t5"]) out[`dummies:${id}`] = dummyRun(id, "skeleton_soldier");
for (const id of [noBreaker, "kit_armor_breaker_half", "clockwork_turret"]) out[`dummies:armored:${id}`] = dummyRun(id, "armored_beetle", 1, 12);
for (const id of [noStrike, "kit_true_strike_half", "hooded_archer"]) out[`dummies:dodge:${id}`] = dummyRun(id, "flying_eyeball", 1);

const sorted = (o: Record<string, Record<string, unknown>>) =>
  Object.fromEntries(Object.keys(o).sort().map((k) => [k, Object.fromEntries(Object.keys(o[k]).sort().map((m) => [m, o[k][m]]))]));
const golden = sorted(out);
const text = JSON.stringify(golden, null, 1) + "\n";
const runs = Object.keys(golden).length;

if (process.argv.includes("--write")) {
  writeFileSync(FILE, text);
  console.log(`golden: wrote ${runs} runs to scripts/golden.json`);
} else {
  if (!existsSync(FILE)) {
    console.log("golden: scripts/golden.json missing, run with --write");
    process.exit(1);
  }
  const old = JSON.parse(readFileSync(FILE, "utf8")) as typeof golden;
  const diffs: string[] = [];
  for (const k of new Set([...Object.keys(old), ...Object.keys(golden)])) {
    if (!old[k]) { diffs.push(`${k}: new run`); continue; }
    if (!golden[k]) { diffs.push(`${k}: run missing`); continue; }
    for (const m of new Set([...Object.keys(old[k]), ...Object.keys(golden[k])])) {
      if (JSON.stringify(old[k][m]) !== JSON.stringify(golden[k][m])) diffs.push(`${k} ${m}: ${old[k][m]} -> ${golden[k][m]}`);
    }
  }
  if (diffs.length) {
    console.log(`golden: ${diffs.length} differences`);
    for (const d of process.argv.includes("--all") ? diffs : diffs.slice(0, 60)) console.log("  " + d);
    if (diffs.length > 60) console.log(`  ...and ${diffs.length - 60} more`);
    process.exit(1);
  }
  console.log(`golden: ${runs} runs match`);
}
