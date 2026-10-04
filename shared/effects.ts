/**
 * Archetype effect numbers: how big a splash is, how often a freeze lands, how far chain
 * lightning jumps... One set per archetype, shared by every unit of that archetype (each
 * unit's own damage and attack speed are in its UnitDef). Editable on the admin Effects page.
 *
 * Most effects scale with the unit's merge rank (1-7) and rarity (common 0 ... mythic 4).
 * Fractions are 0-1: 0.2 is 20%.
 */
import type { Arch } from "./units.ts";

export const DEFAULT_EFFECTS = {
  splash: { radius: 85, radiusPerRank: 4, splash: 0.6 },
  burn: { radius: 85, radiusPerRank: 4, splash: 0.5, burnDps: 0.45, burnTime: 3 },
  chain: { jumps: 2, ranksPerJump: 2, legendaryJumps: 1, range: 200, falloff: 0.85 },
  pierce: { targets: 2, ranksPerTarget: 3, range: 120, damage: 0.7 },
  slow: { base: 0.2, perRank: 0.04, perRarity: 0.04, max: 0.6, bossMult: 0.5, duration: 2 },
  freeze: { chance: 0.12, perRank: 0.02, perRarity: 0.02, duration: 1.2, bossDuration: 0.4 },
  stun: { chance: 0.1, perRank: 0.02, perRarity: 0, duration: 0.8, bossDuration: 0.3 },
  poison: { dps: 0.35, duration: 4, maxStacks: 8 },
  crit: { chance: 0.25, perRank: 0.03, mult: 2.5, multPerRank: 0.1 },
  curse: { perRank: 0.03, perRarity: 0.01, max: 0.6 },
  execute: { chance: 0.03, perRank: 0.01, perRarity: 0.01, bossMult: 4 },
  sniper: { shotSpeed: 1500 },
  growth: { perSecond: 0.02, max: 2 },
  buff: { base: 0.08, perRank: 0.05, perRarity: 0.03, max: 1.5 },
  mana: { every: 6, perRank: 5, ultimateBase: 20, ultimatePerWave: 4 },
};

export type Effects = typeof DEFAULT_EFFECTS;
export type EffectArch = keyof Effects;
export const EFFECT_ARCHS = Object.keys(DEFAULT_EFFECTS) as EffectArch[];

/** Live table: replaced in place when a config is applied (see config.ts). */
export const EFFECTS: Effects = structuredClone(DEFAULT_EFFECTS);

export interface EffectField {
  label: string;
  /** Allowed range (min defaults to 0). */
  min?: number;
  max?: number;
  /** Must be a whole number. */
  int?: boolean;
  /** Admin input step. */
  step: number;
}

const F = (label: string, step: number, max?: number, int?: boolean, min?: number): EffectField => ({ label, step, max, int, min });
const PCT = (label: string, max = 1) => F(label, 0.01, max);

/** Labels and limits for the admin page and validation. */
export const EFFECT_FIELDS: { [A in EffectArch]: { [K in keyof Effects[A]]: EffectField } } = {
  splash: {
    radius: F("Splash radius in pixels", 5, 400),
    radiusPerRank: F("…plus this per rank", 1, 50),
    splash: PCT("Damage to the others (0.6 = 60% of the hit)", 2),
  },
  burn: {
    radius: F("Splash radius in pixels", 5, 400),
    radiusPerRank: F("…plus this per rank", 1, 50),
    splash: PCT("Damage to the others (0.5 = 50% of the hit)", 2),
    burnDps: PCT("Burn damage per second (0.45 = 45% of the hit)", 5),
    burnTime: F("Burn lasts (seconds)", 0.5, 20),
  },
  chain: {
    jumps: F("Monsters hit at rank 1", 1, 20, true),
    ranksPerJump: F("One more monster every N ranks", 1, 7, true, 1),
    legendaryJumps: F("Extra monsters for legendary and mythic", 1, 10, true),
    range: F("Jump range in pixels", 10, 600),
    falloff: PCT("Damage kept per jump (0.85 = −15% each)"),
  },
  pierce: {
    targets: F("Monsters behind hit at rank 1", 1, 20, true),
    ranksPerTarget: F("One more every N ranks", 1, 7, true, 1),
    range: F("Reach behind the target in pixels", 10, 600),
    damage: PCT("Damage to those behind (0.7 = 70%)", 2),
  },
  slow: {
    base: PCT("Slow at rank 1, common (0.2 = 20%)", 0.95),
    perRank: PCT("…plus this per rank", 0.5),
    perRarity: PCT("…plus this per rarity step", 0.5),
    max: PCT("Strongest slow", 0.95),
    bossMult: PCT("On bosses (0.5 = half as strong)"),
    duration: F("Slow lasts (seconds)", 0.5, 20),
  },
  freeze: {
    chance: PCT("Freeze chance at rank 1, common"),
    perRank: PCT("…plus this per rank", 0.5),
    perRarity: PCT("…plus this per rarity step", 0.5),
    duration: F("Frozen for (seconds)", 0.1, 10),
    bossDuration: F("Bosses frozen for (seconds)", 0.1, 10),
  },
  stun: {
    chance: PCT("Stun chance at rank 1, common"),
    perRank: PCT("…plus this per rank", 0.5),
    perRarity: PCT("…plus this per rarity step", 0.5),
    duration: F("Stunned for (seconds)", 0.1, 10),
    bossDuration: F("Bosses stunned for (seconds)", 0.1, 10),
  },
  poison: {
    dps: PCT("Poison damage per second per stack (0.6 = 60% of the hit)", 5),
    duration: F("Each stack lasts (seconds)", 0.5, 20),
    maxStacks: F("Most stacks on one monster", 1, 50, true),
  },
  crit: {
    chance: PCT("Crit chance at rank 1"),
    perRank: PCT("…plus this per rank", 0.5),
    mult: F("Crit damage (× the hit) at rank 1", 0.1, 20),
    multPerRank: F("…plus this per rank", 0.05, 5),
  },
  curse: {
    perRank: PCT("Extra damage taken per hit, per rank (0.03 = +3%)", 0.5),
    perRarity: PCT("…plus this per rarity step", 0.5),
    max: PCT("Most extra damage a monster can take", 5),
  },
  execute: {
    chance: PCT("Execute chance at rank 1, common"),
    perRank: PCT("…plus this per rank", 0.5),
    perRarity: PCT("…plus this per rarity step", 0.5),
    bossMult: F("Bosses can't be executed; they take this × the hit", 0.5, 50),
  },
  sniper: {
    shotSpeed: F("Bullet speed in pixels/s (others: 1100)", 50, 5000),
  },
  growth: {
    perSecond: PCT("Damage gained per second on the board (0.02 = +2%)", 1),
    max: F("Most extra damage (2 = up to 3× damage)", 0.1, 20),
  },
  buff: {
    base: PCT("Neighbours' attack speed at rank 1, common (0.08 = +8%)", 2),
    perRank: PCT("…plus this per rank", 1),
    perRarity: PCT("…plus this per rarity step", 1),
    max: F("Most a buff unit can give, after card level and power-ups (1.5 = +150%)", 0.05, 10),
  },
  mana: {
    every: F("Makes mana every N seconds", 0.5, 60, false, 0.5),
    perRank: F("Mana each time, per rank", 1, 100),
    ultimateBase: F("Awakened ultimate: mana", 1, 500),
    ultimatePerWave: F("…plus this × wave", 1, 100),
  },
};

// ---------------------------------------------------------------- formulas

/** `rarity` is the rarity's index: common 0 ... mythic 4. */
export const splashRadius = (arch: "splash" | "burn", rank: number, e = EFFECTS) => e[arch].radius + e[arch].radiusPerRank * rank;
export const chainJumps = (rank: number, rarity: number, e = EFFECTS) =>
  e.chain.jumps + Math.floor(rank / e.chain.ranksPerJump) + (rarity >= 3 ? e.chain.legendaryJumps : 0);
export const pierceTargets = (rank: number, e = EFFECTS) => e.pierce.targets + Math.floor(rank / e.pierce.ranksPerTarget);
export const slowAmount = (rank: number, rarity: number, boss: boolean, e = EFFECTS) =>
  Math.min(e.slow.max, e.slow.base + e.slow.perRank * rank + e.slow.perRarity * rarity) * (boss ? e.slow.bossMult : 1);
export const freezeChance = (rank: number, rarity: number, e = EFFECTS) => Math.min(1, e.freeze.chance + e.freeze.perRank * rank + e.freeze.perRarity * rarity);
export const stunChance = (rank: number, rarity: number, e = EFFECTS) => Math.min(1, e.stun.chance + e.stun.perRank * rank + e.stun.perRarity * rarity);
export const critChance = (rank: number, e = EFFECTS) => Math.min(1, e.crit.chance + e.crit.perRank * rank);
export const critMult = (rank: number, e = EFFECTS) => e.crit.mult + e.crit.multPerRank * rank;
export const curseStep = (rank: number, rarity: number, e = EFFECTS) => e.curse.perRank * rank + e.curse.perRarity * rarity;
export const executeChance = (rank: number, rarity: number, e = EFFECTS) =>
  Math.min(1, e.execute.chance + e.execute.perRank * rank + e.execute.perRarity * rarity);
export const growthMult = (secondsOnBoard: number, e = EFFECTS) => 1 + Math.min(e.growth.max, secondsOnBoard * e.growth.perSecond);
/**
 * Attack speed a buff unit gives its neighbours. `mult` is its card level × power-up (× awakened)
 * multiplier, the same one that scales an attacking unit's damage.
 */
export const buffBonus = (rank: number, rarity: number, mult = 1, e = EFFECTS) =>
  Math.min(e.buff.max, (e.buff.base + e.buff.perRank * rank + e.buff.perRarity * rarity) * mult);
export const manaPerPulse = (rank: number, e = EFFECTS) => e.mana.perRank * rank;

const pct = (x: number) => `${Math.round(x * 100)}%`;
const secs = (x: number) => `${+x.toFixed(2)}s`;

/** One line describing an archetype's effect for a unit at this rank and rarity (card details). */
export function effectSummary(arch: Arch, rank: number, rarity: number, e = EFFECTS, mult = 1): string | null {
  switch (arch) {
    case "splash":
      return `Splash ${Math.round(splashRadius("splash", rank, e))}px · ${pct(e.splash.splash)} damage`;
    case "burn":
      return `Burns ${pct(e.burn.burnDps)} per second for ${secs(e.burn.burnTime)}`;
    case "chain":
      return `Hits ${chainJumps(rank, rarity, e)} monsters`;
    case "pierce":
      return `Hits ${pierceTargets(rank, e)} more behind for ${pct(e.pierce.damage)}`;
    case "slow":
      return `Slows ${pct(slowAmount(rank, rarity, false, e))} for ${secs(e.slow.duration)}`;
    case "freeze":
      return `${pct(freezeChance(rank, rarity, e))} chance to freeze for ${secs(e.freeze.duration)}`;
    case "stun":
      return `${pct(stunChance(rank, rarity, e))} chance to stun for ${secs(e.stun.duration)}`;
    case "poison":
      return `Poison ${pct(e.poison.dps)} per second for ${secs(e.poison.duration)}, stacks`;
    case "crit":
      return `${pct(critChance(rank, e))} chance of ×${+critMult(rank, e).toFixed(2)} damage`;
    case "curse":
      return `Each hit: +${pct(curseStep(rank, rarity, e))} damage taken (up to ${pct(e.curse.max)})`;
    case "execute":
      return `${pct(executeChance(rank, rarity, e))} chance to execute`;
    case "growth":
      return `+${pct(e.growth.perSecond)} damage per second, up to +${pct(e.growth.max)}`;
    case "buff":
      return `Neighbours attack ${pct(buffBonus(rank, rarity, mult, e))} faster`;
    case "mana":
      return `+${manaPerPulse(rank, e)} mana every ${secs(e.mana.every)}`;
    default:
      return null;
  }
}

/** Problems with a config's effect numbers (empty if fine). */
export function effectProblems(e: Effects): string[] {
  const errs: string[] = [];
  if (!e || typeof e !== "object") return ["effects must be an object"];
  for (const a of EFFECT_ARCHS) {
    const fields = EFFECT_FIELDS[a] as Record<string, EffectField>;
    const values = (e[a] ?? {}) as Record<string, unknown>;
    for (const [k, f] of Object.entries(fields)) {
      const v = values[k];
      const where = `Effects ${a}: ${f.label.replace(/^…/, "")} (${k})`;
      const min = f.min ?? 0;
      if (typeof v !== "number" || !Number.isFinite(v) || v < min) errs.push(`${where} must be a number ≥ ${min}`);
      else if (f.max !== undefined && v > f.max) errs.push(`${where} must be at most ${f.max}`);
      else if (f.int && !Number.isInteger(v)) errs.push(`${where} must be a whole number`);
    }
  }
  return errs;
}

/** Fill in archetypes or fields a saved config is missing (it may predate them). */
export function withEffectDefaults(e: Partial<Effects> | undefined): Effects {
  const out = structuredClone(DEFAULT_EFFECTS) as Record<EffectArch, Record<string, number>>;
  for (const a of EFFECT_ARCHS) Object.assign(out[a], (e as Record<string, object> | undefined)?.[a]);
  return out as Effects;
}
