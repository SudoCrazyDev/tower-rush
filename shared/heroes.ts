/**
 * Heroes: one per player, picked in the deck screen. A hero doesn't fight; it has one
 * active ability the player fires during battle, which then recharges.
 */

export type HeroPower =
  | "meteor" // damage every monster on the field
  | "storm" // bolts hit random monsters for a while
  | "freeze" // freeze every monster in place
  | "slow" // slow every monster for a while
  | "mana" // instant mana
  | "haste" // all units attack faster for a while
  | "rage" // all units deal more damage for a while
  | "knockback"; // push monsters back along the path

/** What `amount` and `duration` mean for each power (shown in the admin panel). */
export const HERO_POWERS: Record<HeroPower, { label: string; amount: string; duration: string }> = {
  meteor: { label: "Damage every monster", amount: "Damage, in normal-monster HPs for the current wave", duration: "—" },
  storm: { label: "Bolts hit random monsters", amount: "Damage per bolt, in normal-monster HPs", duration: "Seconds (4 bolts per second)" },
  freeze: { label: "Freeze every monster", amount: "Damage on cast, in normal-monster HPs", duration: "Seconds frozen (bosses: a third)" },
  slow: { label: "Slow every monster", amount: "Slow, 0–0.9 (bosses: half)", duration: "Seconds" },
  mana: { label: "Instant mana", amount: "Mana, +10% per wave reached", duration: "—" },
  haste: { label: "Units attack faster", amount: "Attack speed bonus (0.5 = +50%)", duration: "Seconds" },
  rage: { label: "Units deal more damage", amount: "Damage bonus (0.5 = +50%)", duration: "Seconds" },
  knockback: { label: "Push monsters back", amount: "Distance in pixels (bosses: a third)", duration: "Seconds stunned after landing" },
};
export const HERO_POWER_IDS = Object.keys(HERO_POWERS) as HeroPower[];

export interface HeroDef {
  id: string;
  name: string;
  /** Name of the ability shown on the button. */
  ability: string;
  power: HeroPower;
  blurb: string;
  /** Seconds between uses (game time, so 2x speed recharges twice as fast). */
  cooldown: number;
  amount: number;
  duration: number;
  /** Gem price; 0 means every player owns it. */
  price: number;
  /** Trophies needed before it can be bought. */
  trophies: number;
  /** Disabled heroes can't be bought or used. */
  enabled: boolean;
}

const H = (id: string, name: string, ability: string, power: HeroPower, blurb: string, cooldown: number, amount: number, duration: number, price: number, trophies: number): HeroDef => ({
  id,
  name,
  ability,
  power,
  blurb,
  cooldown,
  amount,
  duration,
  price,
  trophies,
  enabled: true,
});

export const DEFAULT_HEROES: HeroDef[] = [
  H("young_king", "Young King", "Royal Treasury", "mana", "Pays his army in advance.", 30, 60, 0, 0, 0),
  H("orc_warchief", "Orc Warchief", "War Cry", "rage", "Loud enough to sharpen swords.", 40, 0.6, 8, 150, 0),
  H("panda_brewmaster", "Panda Brewmaster", "Sticky Brew", "slow", "Spills on purpose.", 35, 0.5, 6, 150, 50),
  H("gnome_mech", "Gnome Mech", "Overclock", "haste", "Pushes every gear past the red line.", 40, 0.6, 8, 250, 150),
  H("griffin_knight", "Griffin Knight", "Gale Dive", "knockback", "One wingbeat and they're back at the gate.", 45, 260, 1, 250, 300),
  H("sea_witch", "Sea Witch", "Tidal Prison", "freeze", "The tide comes in. Nobody moves.", 50, 0.5, 4, 400, 500),
  H("elf_archmage", "Elf Archmage", "Arcane Storm", "storm", "Picks targets at random. Misses none.", 45, 0.9, 5, 400, 800),
  H("dark_knight", "Dark Knight", "Doom Strike", "meteor", "Darkness falls on everyone at once.", 55, 1.5, 0, 600, 1200),
];

/** Live tables: replaced in place when a config is applied (see config.ts). */
export const HEROES: HeroDef[] = structuredClone(DEFAULT_HEROES);
export const HERO_BY_ID: Record<string, HeroDef> = {};

export function indexHeroes() {
  for (const k of Object.keys(HERO_BY_ID)) delete HERO_BY_ID[k];
  for (const h of HEROES) HERO_BY_ID[h.id] = h;
}
indexHeroes();

/** Short player-facing description of what the ability does with its current numbers. */
export function heroAbilityText(h: HeroDef) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  switch (h.power) {
    case "meteor":
      return `Strikes every monster for ${pct(h.amount)} of a monster's health.`;
    case "storm":
      return `${Math.round(h.duration * 4)} bolts hit random monsters for ${pct(h.amount)} of a monster's health each.`;
    case "freeze":
      return `Freezes every monster for ${h.duration}s and deals ${pct(h.amount)} of a monster's health.`;
    case "slow":
      return `Slows every monster by ${pct(h.amount)} for ${h.duration}s.`;
    case "mana":
      return `Grants ${Math.round(h.amount)} mana, plus 10% per wave reached.`;
    case "haste":
      return `All units attack ${pct(h.amount)} faster for ${h.duration}s.`;
    case "rage":
      return `All units deal ${pct(h.amount)} more damage for ${h.duration}s.`;
    case "knockback":
      return `Pushes every monster back and stuns them for ${h.duration}s.`;
  }
}
