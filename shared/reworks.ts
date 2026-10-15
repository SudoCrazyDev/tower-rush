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
  // v2.8 "Beta Berserker" Orcs (docs/features/v2.8-beta-berserker).
  /** Peon: never attacks. +mana every few seconds; Pillage may double a pulse (+perOrcRank × rank of every OTHER Orc on the board). */
  peon: { pillage: { every: 2, mana: 3, chance: 0.5, perOrcRank: 0.02, max: 1, mult: 2 } },
  /** Grunt: Berserker Strength. Damage multiplier by waves on the board since it was placed (beyond the last step: ×grow every `growEvery` waves). */
  grunt: { berserk: { steps: [{ waves: 10, mult: 2 }, { waves: 20, mult: 4 }, { waves: 30, mult: 7 }], growEvery: 5, grow: 1.5 } },
  /** Headhunter: random targets; a monster at `at` of its path or further draws his focus (the furthest) for ×`mult`; from wave `fastWave`, ×`speed` attack speed. */
  headhunter: { upgrade: { at: 0.87, mult: 5.2, fastWave: 20, speed: 3.2 } },
  /** Spirit Walker: each hit may push the target and up to `extra` monsters near it (within `radius`) back along the path. */
  spirit_walker: { spirit: { chance: 0.76, extra: 4, radius: 120, push: 35, bossPush: 17.5 } },
  /** Kodo Beasts: never attack. War Drums attack speed (added to haste: ×1.2 = +0.2); the best one a unit gets counts. */
  kodo_beasts: { drums: { near: 0.2, midAt: 0.5, mid: 1.4, farAt: 0.88, far: 2 } },
} as const;

/** v2.8: Peon and Kodo Beasts. Their kit is "buff" (no attack of their own), but they give no generic buff: the Sim runs their own rules. */
export const BETA_SUPPORT: ReadonlySet<string> = new Set(["peon", "kodo_beasts"]);

/** Peon's Pillage chance with `orcRanks` = the summed ranks of the OTHER Orcs on the board. */
export const pillageChance = (orcRanks: number) => {
  const p = REWORKS.peon.pillage;
  return Math.min(p.max, p.chance + p.perOrcRank * orcRanks);
};

/** Grunt: Berserker Strength tier (0..4) after standing `waves` waves on the board. Tier 4 is 35+ waves. */
export const gruntTier = (waves: number) => {
  const st = REWORKS.grunt.berserk.steps;
  if (waves < st[0].waves) return 0;
  if (waves < st[1].waves) return 1;
  if (waves < st[2].waves) return 2;
  return waves < st[2].waves + REWORKS.grunt.berserk.growEvery ? 3 : 4;
};

/** Grunt: Berserker Strength damage multiplier after `waves` waves (×1, ×2, ×4, ×7, then ×1.5 per 5 more waves). */
export const gruntMult = (waves: number) => {
  const b = REWORKS.grunt.berserk;
  let mult = 1;
  for (const s of b.steps) if (waves >= s.waves) mult = s.mult;
  const last = b.steps[b.steps.length - 1];
  if (waves >= last.waves) mult *= Math.pow(b.grow, Math.floor((waves - last.waves) / b.growEvery));
  return mult;
};

/** Kodo War Drums stage from the furthest monster's path progress: 0 (adjacent ×1.2), 1 (adjacent ×2.4), 2 (everyone ×3). */
export const drumStage = (progress: number) => {
  const d = REWORKS.kodo_beasts.drums;
  return progress >= d.farAt ? 2 : progress >= d.midAt ? 1 : 0;
};

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

const pct = (x: number) => `${+(x * 100).toFixed(1)}%`;

/**
 * v2.8 Orcs: what the card back (and the admin) says in place of the kit lines: the attack or job name,
 * the lines under it, and the stat pair shown instead of damage and speed for the two that never attack.
 */
export function orcText(id: string): { arch: string; lines: string[]; stat?: [string, string] } | null {
  switch (id) {
    case "peon": {
      const p = REWORKS.peon.pillage;
      return {
        arch: "Mana pulse",
        lines: [
          `Never attacks. +${p.mana} mana every ${p.every}s.`,
          `Pillage: ${pct(p.chance)} chance a pulse pays ×${p.mult} (${p.mana * p.mult} mana), +${pct(p.perOrcRank)} × rank for every other Orc on the board (up to ${pct(p.max)}).`,
        ],
        stat: ["item:mana_orb", `+${p.mana} / ${p.every}s`],
      };
    }
    case "grunt": {
      const b = REWORKS.grunt.berserk;
      return {
        arch: "Thrown axe at the leading monster",
        lines: [
          `Berserker Strength: ${b.steps.map((s) => `${s.waves}+ waves ×${s.mult}`).join(", ")} damage, then ×${b.grow} for every ${b.growEvery} more waves. Counts the waves since it was placed: a merge starts over, moving keeps it.`,
        ],
      };
    }
    case "headhunter": {
      const h = REWORKS.headhunter.upgrade;
      return {
        arch: "Spear at a random monster",
        lines: [`Berserker Upgrade: a monster at ${pct(h.at)}+ of its path draws his aim (the furthest one) for ×${h.mult} damage. From wave ${h.fastWave}: ×${h.speed} attack speed.`],
      };
    }
    case "spirit_walker": {
      const s = REWORKS.spirit_walker.spirit;
      return {
        arch: "Spirit lantern at the leading monster",
        lines: [`Ancestral Spirit: ${pct(s.chance)} per hit to push the target and up to ${s.extra} monsters near it (${s.radius}px) back ${s.push}px (bosses ${s.bossPush}px).`],
      };
    }
    case "kodo_beasts": {
      const d = REWORKS.kodo_beasts.drums;
      return {
        arch: "War Drums",
        lines: [
          `Never attacks. Adjacent units ×${1 + d.near} attack speed; ×${1 + d.mid} once a monster reaches ${pct(d.midAt)} of its path; ALL units ×${1 + d.far} once one reaches ${pct(d.farAt)}. Several Kodos don't stack: the best bonus counts.`,
        ],
        stat: ["stat:attack_speed", `neighbours ×${1 + d.near}+`],
      };
    }
  }
  return null;
}

/** Units that never attack on their own (vines, or an awakened Bee Keeper's hives, do the work). */
export const noOwnAttack = (id: string, awakened: boolean) => id === "vine_druid" || BETA_SUPPORT.has(id) || (awakened && id === "bee_keeper");

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
