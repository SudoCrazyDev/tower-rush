/**
 * v2.7 unit revamp: per-unit rules that live in code, on top of the saved D1 config.
 *
 * - liveDef(): the unit as it fights. Code-defined kit and perk changes (Snowglobe Fairy's freeze
 *   chance, an awakened Sand Monk's Ultra Focused) are applied here, so the Sim, the card back and
 *   the website all read the same numbers.
 * - REWORKS: units whose attack itself changed (Frog Alchemist's puddles, Raccoon Thief's mana,
 *   Vine Druid's vines). The Sim reads these; the text helpers describe them.
 */
import type { UnitDef } from "./units.ts";
import { AWAKENINGS, ULTIMATES } from "./awakened.ts";

export const REWORKS = {
  /** Frog Alchemist: every attack drops a poison puddle on the path. Overlapping puddles don't stack. */
  frog_alchemist: { puddle: { radius: 70, duration: 5, perLevel: 0.2, perPowerUp: 0.5, dps: 1 } },
  /** Raccoon Thief: a mana pulse that comes faster with card level and pays more with rank and power-ups. */
  raccoon_thief: { mana: { every: 6, perLevel: 0.1, minEvery: 3, base: 5, perRank: 2, perPowerUp: 3 } },
  /** Vine Druid: never attacks. Grows one prickly vine ahead of the front monster that holds monsters back and hurts them. */
  vine_druid: { vine: { regrow: 6, hold: 3, bossHold: 1, ahead: 70, radius: 60, dps: 1, life: 12 } },
  /** Snowglobe Fairy: higher base freeze chance (it still rises with rank). */
  snowglobe_fairy: { freezeChance: 0.2 },
  /** Vampire Countess: every monster she hits pays this mana (plus her Plunder) on the hit, and again when it dies. */
  vampire_countess: { kiss: { mana: 2 } },
} as const;

export const puddleTime = (level: number, powerUp: number) => {
  const p = REWORKS.frog_alchemist.puddle;
  return p.duration + p.perLevel * (level - 1) + p.perPowerUp * powerUp;
};
export const raccoonEvery = (level: number) => {
  const m = REWORKS.raccoon_thief.mana;
  return Math.max(m.minEvery, +(m.every - m.perLevel * (level - 1)).toFixed(2));
};
export const raccoonMana = (rank: number, powerUp: number) => {
  const m = REWORKS.raccoon_thief.mana;
  return m.base + m.perRank * (rank - 1) + m.perPowerUp * powerUp;
};

/** Units that never attack on their own (vines, or an awakened Bee Keeper's hives, do the work). */
export const noOwnAttack = (id: string, awakened: boolean) => id === "vine_druid" || (awakened && id === "bee_keeper");

/** The unit as it fights: code-defined kit and perk changes applied (a fresh object when anything changed). */
export function liveDef(def: UnitDef, awakened = false): UnitDef {
  if (def.id === "snowglobe_fairy") {
    return { ...def, kit: def.kit.map((s) => (s.arch === "freeze" ? { ...s, tune: { ...s.tune, chance: REWORKS.snowglobe_fairy.freezeChance } } : s)) };
  }
  if (awakened && AWAKENINGS[def.id]?.ult === "ultra_focused") {
    const p = ULTIMATES.ultra_focused.params;
    const crit = { arch: "crit" as const, tune: { chance: p.crit, perRank: 0, mult: p.critMult, multPerRank: 0 } };
    const kit = def.kit.some((s) => s.arch === "stun") ? def.kit.map((s) => (s.arch === "stun" ? crit : s)) : [...def.kit, crit];
    const perks = def.perks.some((s) => s.perk === "giant_slayer") ? def.perks : [...def.perks, { perk: "giant_slayer" as const }];
    return { ...def, kit, perks };
  }
  if (awakened && AWAKENINGS[def.id]?.ult === "blade_dance") {
    // Fox Samurai: a fixed 70% / ×3.5 crit (Blade Dance makes it 100% while a boss is out; the Sim rolls that).
    const p = ULTIMATES.blade_dance.params;
    const kit = def.kit.map((s) => (s.arch === "crit" ? { arch: "crit" as const, tune: { chance: p.crit, perRank: 0, mult: p.critMult, multPerRank: 0 } } : s));
    const perks = [...def.perks];
    for (const perk of ["true_strike", "giant_slayer"] as const) if (!perks.some((s) => s.perk === perk)) perks.push({ perk });
    return { ...def, kit, perks };
  }
  if (awakened && AWAKENINGS[def.id]?.ult === "retribution") {
    // Sun Priestess: Giant Slayer joins her True Strike (her neighbours get both).
    return def.perks.some((s) => s.perk === "giant_slayer") ? def : { ...def, perks: [...def.perks, { perk: "giant_slayer" as const }] };
  }
  if (awakened && AWAKENINGS[def.id]?.ult === "frozen_fields") {
    const chance = ULTIMATES.frozen_fields.params.chance;
    return { ...def, kit: def.kit.map((s) => (s.arch === "freeze" ? { ...s, tune: { ...s.tune, chance, perRank: 0, perRarity: 0 } } : s)) };
  }
  if (awakened && AWAKENINGS[def.id]?.ult === "black_hole") {
    const chance = ULTIMATES.black_hole.params.execute;
    return { ...def, kit: def.kit.map((s) => (s.arch === "execute" ? { ...s, tune: { ...s.tune, chance, perRank: 0, perRarity: 0 } } : s)) };
  }
  return def;
}
