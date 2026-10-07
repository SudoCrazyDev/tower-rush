/**
 * v2.0 "The Grand Revamp": unit kits (docs/features/v2.0-the-grand-revamp, section 2).
 *
 * A unit's kit is a list of archetypes: kit[0] is how it attacks (or its whole job, for solo
 * archetypes), the rest are riders applied to every monster a hit lands on and signature
 * specials (the v1.2 Knight and Mercenary effects). Each slot can override ("tune") any number of
 * that archetype's effect block. Perks work the same way: a list, each with its own value.
 *
 * The kit is the source of truth. A unit from a v1 saved config has none, so withKits derives it
 * from the legacy `arch`, `effect` and `perk` fields (kitFromLegacy). P3 moves combat onto the kit.
 */
import { EFFECTS, EFFECT_FIELDS, effectSummary, unitEffectSummary, type Effects, type EffectArch, type EffectField } from "./effects.ts";
import { PERKS, PERK_IDS, type Perk } from "./perks.ts";
// Type-only: units.ts imports this module, so a runtime import back would be circular.
import type { Arch, Rarity, UnitDef, UnitEffect } from "./units.ts";

const RARITY_INDEX: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4, event: 2 };

/** Anything that can sit in a kit slot: an archetype or a signature special. */
export type KitArch = Arch | UnitEffect;
export type ArchKind = "attack" | "rider" | "signature" | "solo";

export interface ArchSlot {
  arch: KitArch;
  /** Overrides for this archetype's effect numbers, by field name (see EFFECT_FIELDS). */
  tune?: Record<string, number>;
}
export interface PerkSlot {
  perk: Exclude<Perk, "none">;
  /** Overrides the perk's default value (see PERK_VALUES). */
  value?: number;
  value2?: number;
}

export const ARCH_KIND: Record<KitArch, ArchKind> = {
  shot: "attack",
  sniper: "attack",
  pierce: "attack",
  splash: "attack",
  chain: "attack",
  slow: "rider",
  freeze: "rider",
  stun: "rider",
  poison: "rider",
  burn: "rider",
  curse: "rider",
  crit: "rider",
  execute: "rider",
  growth: "rider",
  rally: "signature",
  irritate: "signature",
  fatigue: "signature",
  shellshock: "signature",
  wages: "signature",
  oath: "signature",
  bane: "signature",
  lantern: "signature",
  mana: "solo",
  buff: "solo",
  aura: "solo",
  aegis: "solo",
  mime: "solo",
  portal: "solo",
  mirror: "solo",
  lucky: "solo",
  hourglass: "solo",
  echo: "solo",
  herald: "solo",
  brewer: "solo",
};
export const KIT_ARCHS = Object.keys(ARCH_KIND) as KitArch[];

/** Solo archetypes that may still carry riders and signatures (they attack). */
const SOLO_WITH_RIDERS: KitArch[] = ["mana"];

// ---------------------------------------------------------------- perk values

/** Default value of each perk; a unit's PerkSlot can override it. Live table (see config.ts). */
export const DEFAULT_PERK_VALUES: Record<Exclude<Perk, "none">, { value: number; value2?: number }> = {
  armor_breaker: { value: 1 }, // share of armor ignored
  true_strike: { value: 1 }, // share of dodges ignored
  giant_slayer: { value: 0.4 },
  hunter: { value: 0.4 },
  finisher: { value: 0.5, value2: 0.3 }, // bonus, below this share of max HP
  plunder: { value: 3 }, // mana per kill
  frostbite: { value: 0.3 },
};
export type PerkValues = typeof DEFAULT_PERK_VALUES;
export const PERK_VALUES: PerkValues = structuredClone(DEFAULT_PERK_VALUES);
export const KIT_PERKS = PERK_IDS.filter((p): p is Exclude<Perk, "none"> => p !== "none");

/** A perk slot's value and value2, with the defaults filled in. */
export const perkValue = (s: PerkSlot, v = PERK_VALUES) => ({ value: s.value ?? v[s.perk].value, value2: s.value2 ?? v[s.perk].value2 });

/** Fill in perks a saved config is missing. */
export function withPerkDefaults(p: Partial<PerkValues> | undefined): PerkValues {
  const out = structuredClone(DEFAULT_PERK_VALUES);
  for (const k of KIT_PERKS) Object.assign(out[k], p?.[k]);
  return out;
}

// ---------------------------------------------------------------- migration

type LegacyUnit = Pick<UnitDef, "arch" | "perk" | "effect">;

/**
 * The kit that plays exactly like a v1 unit. A rider archetype on its own (old `freeze`) needs an
 * attack in front of it: a single-target shot. Old `burn` was its own splash, so it becomes a
 * splash tuned to burn's splash numbers plus the burn rider.
 */
export function kitFromLegacy(u: LegacyUnit, e: Effects = EFFECTS): { kit: ArchSlot[]; perks: PerkSlot[] } {
  const kit: ArchSlot[] = [];
  const kind = ARCH_KIND[u.arch];
  if (u.arch === "burn") {
    const tune: Record<string, number> = {};
    for (const f of ["radius", "radiusPerRank", "splash"] as const) if (e.burn[f] !== e.splash[f]) tune[f] = e.burn[f];
    kit.push(Object.keys(tune).length ? { arch: "splash", tune } : { arch: "splash" }, { arch: "burn" });
  } else if (kind === "rider") kit.push({ arch: "shot" }, { arch: u.arch });
  else kit.push({ arch: u.arch });
  if (u.effect) kit.push({ arch: u.effect });
  const perks: PerkSlot[] = u.perk && u.perk !== "none" ? [{ perk: u.perk }] : [];
  return { kit, perks };
}

/**
 * Give every unit its kit. A unit that has a kit keeps it (the kit is the source of truth); a unit
 * from a v1 saved config has none, so it is derived from the legacy `arch`, `effect` and `perk`.
 */
export function withKits<T extends UnitDef>(list: T[], e: Effects = EFFECTS): T[] {
  return list.map((u) => (Array.isArray(u.kit) && u.kit.length ? u : { ...u, ...kitFromLegacy(u, e) }));
}

// ---------------------------------------------------------------- numbers

const hasBlock = (a: KitArch): a is EffectArch => a in EFFECT_FIELDS;

/** The unit's own effect numbers: the global blocks with each kit slot's overrides applied. */
export function unitEffects(def: Pick<UnitDef, "kit">, e: Effects = EFFECTS): Effects {
  if (!def.kit?.some((s) => s.tune)) return e;
  const out = { ...e } as Record<string, object>;
  for (const s of def.kit) if (s.tune && hasBlock(s.arch)) out[s.arch] = { ...(e[s.arch] as object), ...s.tune };
  return out as Effects;
}

/** One archetype's numbers for this unit (`fx(def, "pierce").targets`). */
export const fx = <A extends EffectArch>(def: Pick<UnitDef, "kit">, arch: A, e: Effects = EFFECTS): Effects[A] => unitEffects(def, e)[arch];

export const kitHas = (def: Pick<UnitDef, "kit">, arch: KitArch) => !!def.kit?.some((s) => s.arch === arch);
export const kitPrimary = (def: Pick<UnitDef, "kit">) => def.kit[0].arch;

// ---------------------------------------------------------------- text

/** One line per kit slot describing it with this unit's numbers (card details, website). */
export function kitSummary(def: UnitDef, rank: number, mult = 1, e: Effects = EFFECTS): string[] {
  const ue = unitEffects(def, e);
  const lines: string[] = [];
  for (const s of def.kit) {
    const line = ARCH_KIND[s.arch] === "signature" ? unitEffectSummary(s.arch as UnitEffect, rank, ue) : effectSummary(s.arch as Arch, rank, RARITY_INDEX[def.rarity], ue, mult);
    if (line) lines.push(line);
  }
  return lines;
}

/** One line per perk with this unit's values. */
export function perkSummary(def: Pick<UnitDef, "perks">, v = PERK_VALUES): string[] {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return def.perks.map((s) => {
    const { value, value2 } = perkValue(s, v);
    const label = PERKS[s.perk].label;
    switch (s.perk) {
      case "armor_breaker":
        return value >= 1 ? `${label}: ignores armor` : `${label}: ignores ${pct(value)} of armor`;
      case "true_strike":
        return value >= 1 ? `${label}: hits can't be dodged` : `${label}: ignores ${pct(value)} of dodges`;
      case "giant_slayer":
        return `${label}: +${pct(value)} to tanks and bosses`;
      case "hunter":
        return `${label}: +${pct(value)} to fast monsters`;
      case "finisher":
        return `${label}: +${pct(value)} to monsters under ${pct(value2 ?? 0)} health`;
      case "plunder":
        return `${label}: +${value} mana for each kill`;
      case "frostbite":
        return `${label}: chills frost-proof monsters, +${pct(value)} to them`;
    }
  });
}

// ---------------------------------------------------------------- validation

function fieldProblem(where: string, v: unknown, f: EffectField): string | null {
  const min = f.min ?? 0;
  if (typeof v !== "number" || !Number.isFinite(v) || v < min) return `${where} must be a number ≥ ${min}`;
  if (f.max !== undefined && v > f.max) return `${where} must be at most ${f.max}`;
  if (f.int && !Number.isInteger(v)) return `${where} must be a whole number`;
  return null;
}

/** Problems with a unit's kit and perks (empty if fine). There are no size limits (decision D2). */
export function kitProblems(u: Pick<UnitDef, "kit" | "perks">, w: string): string[] {
  const errs: string[] = [];
  if (!Array.isArray(u.kit) || !u.kit.length) return [`${w} needs at least one archetype`];
  const seen = new Set<string>();
  u.kit.forEach((s, i) => {
    const kind = ARCH_KIND[s?.arch];
    if (!kind) return errs.push(`${w} kit slot ${i + 1}: unknown archetype "${s?.arch}"`);
    if (seen.has(s.arch)) errs.push(`${w} has ${s.arch} twice`);
    seen.add(s.arch);
    if (i === 0 && kind !== "attack" && kind !== "solo") errs.push(`${w} must start with an attack or a solo archetype, not ${kind} "${s.arch}"`);
    if (i > 0 && (kind === "attack" || kind === "solo")) errs.push(`${w}: ${s.arch} can only be the first archetype`);
    if (s.tune !== undefined) {
      if (!hasBlock(s.arch)) errs.push(`${w}: ${s.arch} has no numbers to tune`);
      else {
        const fields = EFFECT_FIELDS[s.arch] as Record<string, EffectField>;
        for (const [k, v] of Object.entries(s.tune)) {
          const f = fields[k];
          if (!f) errs.push(`${w}: ${s.arch} has no field "${k}"`);
          else {
            const p = fieldProblem(`${w} ${s.arch} ${k}`, v, f);
            if (p) errs.push(p);
          }
        }
      }
    }
  });
  const first = u.kit[0]?.arch;
  if (first && ARCH_KIND[first] === "solo" && !SOLO_WITH_RIDERS.includes(first) && u.kit.length > 1) errs.push(`${w}: ${first} units can't have extra archetypes`);
  if (!Array.isArray(u.perks)) errs.push(`${w} perks must be a list`);
  else {
    const have = new Set<string>();
    for (const p of u.perks) {
      if (!KIT_PERKS.includes(p?.perk)) errs.push(`${w}: unknown perk "${p?.perk}"`);
      else if (have.has(p.perk)) errs.push(`${w} has the ${p.perk} perk twice`);
      have.add(p?.perk);
      for (const k of ["value", "value2"] as const) {
        const v = p?.[k];
        if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0)) errs.push(`${w} ${p.perk} ${k} must be a number ≥ 0`);
      }
    }
  }
  return errs;
}

/** Problems with the perk defaults (empty if fine). */
export function perkValueProblems(v: PerkValues): string[] {
  const errs: string[] = [];
  for (const k of KIT_PERKS) {
    const p = v?.[k];
    if (!p || typeof p.value !== "number" || !Number.isFinite(p.value) || p.value < 0) errs.push(`Perks ${k}: value must be a number ≥ 0`);
    if (p?.value2 !== undefined && (typeof p.value2 !== "number" || p.value2 < 0)) errs.push(`Perks ${k}: value2 must be a number ≥ 0`);
  }
  return errs;
}

export const isKitArch = (a: string): a is KitArch => a in ARCH_KIND;
