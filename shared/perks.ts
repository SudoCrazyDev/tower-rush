/**
 * Unit perks: most counter a monster trait (armor, dodge, speed, tank HP...). Buff units don't
 * attack: they hand their perks to the neighbours they buff. Perks work on direct hits (splash,
 * pierce and chain included), not on poison or burn. Each perk has a value (see PERK_VALUES in
 * kit.ts, overridable per unit); in a fight a unit carries its perks with the values resolved.
 */

export type Perk = "none" | "armor_breaker" | "true_strike" | "giant_slayer" | "hunter" | "finisher" | "plunder" | "frostbite";

export const PERKS: Record<Perk, { label: string; text: string }> = {
  none: { label: "None", text: "no perk" },
  armor_breaker: { label: "Armor Breaker", text: "ignores armor" },
  true_strike: { label: "True Strike", text: "hits can't be dodged" },
  giant_slayer: { label: "Giant Slayer", text: "+40% to tanks and bosses" },
  hunter: { label: "Hunter", text: "+40% to fast monsters" },
  finisher: { label: "Finisher", text: "+50% to monsters under 30% health" },
  plunder: { label: "Plunder", text: "+3 mana for each kill" },
  frostbite: { label: "Frostbite", text: "chills frost-proof monsters, +30% to them" },
};
export const PERK_IDS = Object.keys(PERKS) as Perk[];

export interface PerkTarget {
  boss: unknown;
  hp: number;
  maxHp: number;
  has(trait: string): boolean;
}

/** A perk a unit carries in a fight, with its value(s) resolved (see perkValue in kit.ts). */
export interface ActivePerk {
  perk: Exclude<Perk, "none">;
  value: number;
  value2?: number;
}

const find = (perks: readonly ActivePerk[], p: ActivePerk["perk"]) => perks.find((x) => x.perk === p);

/** Damage multiplier from the hitting unit's perks on monster `m`. */
export function perkMult(perks: readonly ActivePerk[], m: PerkTarget) {
  let x = 1;
  for (const p of perks) {
    if (p.perk === "giant_slayer" && (m.boss || m.has("tank"))) x += p.value;
    else if (p.perk === "hunter" && m.has("fast")) x += p.value;
    else if (p.perk === "finisher" && m.hp < m.maxHp * (p.value2 ?? 0.3)) x += p.value;
    else if (p.perk === "frostbite" && m.has("frostproof")) x += p.value;
  }
  return x;
}

/** Whether an ice slow or a freeze takes hold on `m`. */
export const chills = (perks: readonly ActivePerk[], m: PerkTarget) => !m.has("frostproof") || !!find(perks, "frostbite");

/** Armor damage multiplier: 0.7 against armor, up to 1 as Armor Breaker's value reaches 1. */
export function armorMult(perks: readonly ActivePerk[]) {
  const v = find(perks, "armor_breaker")?.value ?? 0;
  return v >= 1 ? 1 : 0.7 + 0.3 * v;
}

/** The chance a dodger evades a hit: 15%, less as True Strike's value rises (0 at value 1). */
export function dodgeChance(perks: readonly ActivePerk[]) {
  const v = find(perks, "true_strike")?.value ?? 0;
  return v >= 1 ? 0 : 0.15 * (1 - v);
}

/** Mana per kill from Plunder (0 without it). */
export const plunderMana = (perks: readonly ActivePerk[]) => find(perks, "plunder")?.value ?? 0;

/** Add a perk to a unit's list. A perk it already has keeps the higher value (no double counting). */
export function addPerk(perks: ActivePerk[], p: ActivePerk) {
  const i = perks.findIndex((x) => x.perk === p.perk);
  if (i < 0) perks.push({ ...p });
  else if (p.value > perks[i].value) perks[i] = { ...p };
}
