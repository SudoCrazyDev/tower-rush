/**
 * Unit perks: every unit has one, and most counter a monster trait (armor, dodge, speed,
 * tank HP...). Buff units don't attack: they hand their perk to the neighbours they buff.
 * Perks work on direct hits (splash, pierce and chain included), not on poison or burn.
 */

export type Perk = "none" | "armor_breaker" | "true_strike" | "giant_slayer" | "hunter" | "finisher" | "plunder" | "frostbite";

/** Perk numbers. Fractions are 0-1: 0.4 is +40%. */
export const PERK = {
  giantSlayer: 0.4,
  hunter: 0.4,
  finisher: 0.5,
  /** Finisher bonus applies below this share of max HP. */
  finisherBelow: 0.3,
  /** Extra mana for each kill. */
  plunder: 3,
  frostbite: 0.3,
};

export const PERKS: Record<Perk, { label: string; text: string }> = {
  none: { label: "None", text: "no perk" },
  armor_breaker: { label: "Armor Breaker", text: "ignores armor" },
  true_strike: { label: "True Strike", text: "hits can't be dodged" },
  giant_slayer: { label: "Giant Slayer", text: `+${PERK.giantSlayer * 100}% to tanks and bosses` },
  hunter: { label: "Hunter", text: `+${PERK.hunter * 100}% to fast monsters` },
  finisher: { label: "Finisher", text: `+${PERK.finisher * 100}% to monsters under ${PERK.finisherBelow * 100}% health` },
  plunder: { label: "Plunder", text: `+${PERK.plunder} mana for each kill` },
  frostbite: { label: "Frostbite", text: `chills frost-proof monsters, +${PERK.frostbite * 100}% to them` },
};
export const PERK_IDS = Object.keys(PERKS) as Perk[];

export interface PerkTarget {
  boss: unknown;
  hp: number;
  maxHp: number;
  has(trait: string): boolean;
}

/** Damage multiplier from the hitting unit's perks on monster `m`. */
export function perkMult(perks: readonly Perk[], m: PerkTarget) {
  let x = 1;
  for (const p of perks) {
    if (p === "giant_slayer" && (m.boss || m.has("tank"))) x += PERK.giantSlayer;
    else if (p === "hunter" && m.has("fast")) x += PERK.hunter;
    else if (p === "finisher" && m.hp < m.maxHp * PERK.finisherBelow) x += PERK.finisher;
    else if (p === "frostbite" && m.has("frostproof")) x += PERK.frostbite;
  }
  return x;
}

/** Whether an ice slow or a freeze takes hold on `m`. */
export const chills = (perks: readonly Perk[], m: PerkTarget) => !m.has("frostproof") || perks.includes("frostbite");

/** A unit's own perk plus those handed over by neighbouring buff units. */
export function withPerk(perks: Perk[], p: Perk) {
  if (p !== "none" && !perks.includes(p)) perks.push(p);
}
