/**
 * Golden-master combat test: runs the headless Sim for every unit (ranks 1, 4, 7) plus a few
 * mixed decks on fixed seeds, with the DEFAULT config, and compares the numbers with
 * scripts/golden.json. Refactors must not change them.
 *   node scripts/golden.ts          compare, exit 1 on any difference
 *   node scripts/golden.ts --write  rewrite scripts/golden.json (only for intended balance changes)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { applyConfig, defaultConfig } from "../shared/config.ts";
import { DEFAULT_UNITS } from "../shared/units.ts";
import { ARENAS } from "../shared/arenas.ts";
import { Sim, type BoardUnit, type SimSetup, type SimFx } from "../shared/sim.ts";

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
    for (const d of diffs.slice(0, 60)) console.log("  " + d);
    if (diffs.length > 60) console.log(`  ...and ${diffs.length - 60} more`);
    process.exit(1);
  }
  console.log(`golden: ${runs} runs match`);
}
