import { ECONOMY } from "./economy.ts";
import type { Race } from "./races.ts";
import type { Perk } from "./perks.ts";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type Element = "fire" | "ice" | "lightning" | "nature" | "poison" | "arcane";

/**
 * How a unit fights. Every unit uses exactly one archetype; the special-effect numbers
 * (slow %, crit chance, ...) are per archetype in effects.ts, while each unit's own damage
 * and attack speed are in its UnitDef. Both are editable in the admin panel.
 */
export type Arch =
  | "shot" // single target
  | "splash" // area damage around the target
  | "burn" // splash + damage over time
  | "chain" // lightning that jumps between monsters
  | "pierce" // hits the target and the monsters right behind it
  | "slow" // slows on hit
  | "freeze" // chance to freeze in place
  | "stun" // chance to stun
  | "poison" // stacking damage over time
  | "crit" // high critical chance
  | "curse" // hits make the target take more damage
  | "execute" // chance to instantly kill a non-boss
  | "sniper" // slow, heavy shots at the healthiest monster
  | "growth" // damage keeps increasing while on the board
  | "buff" // no attack, speeds up neighbours
  | "mana"; // weak attack, produces mana

export type Proj = "arrow" | "fireball" | "ice_shard" | "lightning" | "poison" | "cannonball" | "arcane_orb" | "spark";

export const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary", "mythic"];
export const ELEMENTS: Element[] = ["fire", "ice", "lightning", "nature", "poison", "arcane"];
export const PROJECTILES: Proj[] = ["arrow", "fireball", "ice_shard", "lightning", "poison", "cannonball", "arcane_orb", "spark"];

export interface UnitDef {
  id: string;
  name: string;
  rarity: Rarity;
  element: Element;
  race: Race;
  arch: Arch;
  proj: Proj;
  blurb: string;
  /** Damage per hit at rank 1, card level 1, no power-ups. */
  damage: number;
  /** Attacks per second at rank 1. */
  speed: number;
  /** Fighting style: trades hit size for attack speed (seeds damage and speed). */
  style: Style;
  /** Signature perk (see perks.ts). */
  perk: Perk;
  /** Disabled units don't drop from chests and can't be put in a deck. */
  enabled: boolean;
}

export const RARITY_ORDER: Rarity[] = RARITIES;

/** Chest drop weight per rarity (editable); colors are fixed. */
export const RARITY_STATS: Record<Rarity, { color: number; dropWeight: number }> = {
  common: { color: 0x9aa5b8, dropWeight: 60 },
  rare: { color: 0x3d8bff, dropWeight: 26 },
  epic: { color: 0xa24bff, dropWeight: 10 },
  legendary: { color: 0xffb21e, dropWeight: 3.5 },
  mythic: { color: 0xff3b6b, dropWeight: 0.5 },
};

export const ELEMENT_COLOR: Record<Element, number> = {
  fire: 0xff6a2b,
  ice: 0x5fd4ff,
  lightning: 0xffd93b,
  nature: 0x6bd34a,
  poison: 0xb05cff,
  arcane: 0xff7ad9,
};

/** Defaults used to seed each unit's damage/speed: speed = attacks/s, dmg = multiplier on rarity damage. */
export const ARCHETYPES: Record<Arch, { speed: number; dmg: number; label: string }> = {
  shot: { speed: 1.25, dmg: 1.0, label: "Rapid shots at the leading monster" },
  splash: { speed: 0.8, dmg: 1.1, label: "Area damage around the target" },
  burn: { speed: 0.8, dmg: 0.8, label: "Area damage that keeps burning" },
  chain: { speed: 0.8, dmg: 0.9, label: "Lightning jumps between monsters" },
  pierce: { speed: 0.9, dmg: 1.0, label: "Hits the target and those behind it" },
  slow: { speed: 1.0, dmg: 0.6, label: "Slows monsters on hit" },
  freeze: { speed: 0.9, dmg: 0.6, label: "Chance to freeze monsters solid" },
  stun: { speed: 0.9, dmg: 0.9, label: "Chance to stun on hit" },
  poison: { speed: 1.0, dmg: 0.5, label: "Stacking poison damage" },
  crit: { speed: 1.0, dmg: 0.9, label: "Big critical hits" },
  curse: { speed: 1.0, dmg: 0.6, label: "Cursed monsters take extra damage" },
  execute: { speed: 0.7, dmg: 1.0, label: "Chance to instantly destroy a monster" },
  sniper: { speed: 0.4, dmg: 3.2, label: "Heavy shots at the toughest monster" },
  growth: { speed: 0.9, dmg: 0.7, label: "Gets stronger the longer it stays" },
  buff: { speed: 0, dmg: 0, label: "Speeds up neighbouring units" },
  mana: { speed: 0.6, dmg: 0.4, label: "Generates mana over time" },
};
export const ARCHS = Object.keys(ARCHETYPES) as Arch[];

export type Style = "heavy" | "balanced" | "rapid";

/**
 * Styles keep a unit's damage per second the same but change how it is dealt: heavy hits
 * suit tanks and armor, rapid ones suit fast monsters and crowds and land more on-hit effects.
 */
export const STYLES: Record<Style, { label: string; text: string; speed: number; dmg: number }> = {
  heavy: { label: "Heavy", text: "Slow, heavy hits", speed: 0.7, dmg: 1.43 },
  balanced: { label: "Balanced", text: "Steady hits", speed: 1, dmg: 1 },
  rapid: { label: "Rapid", text: "Fast, light hits", speed: 1.6, dmg: 0.625 },
};
export const STYLE_IDS = Object.keys(STYLES) as Style[];

const round = (v: number, step: number) => Math.round(v / step) * step;
/** Damage and speed for `u` after switching it from style `from` to `to`. */
export function restyle(u: Pick<UnitDef, "damage" | "speed">, from: Style, to: Style) {
  return {
    damage: +round((u.damage * STYLES[to].dmg) / STYLES[from].dmg, 0.1).toFixed(1),
    speed: +round((u.speed * STYLES[to].speed) / STYLES[from].speed, 0.01).toFixed(2),
  };
}

/** Saved configs from before styles and perks: take both from the defaults and restyle the unit. */
export function withStyles(list: UnitDef[], defaults: UnitDef[]): UnitDef[] {
  return list.map((u) => {
    if (STYLES[u.style]) return u;
    const d = defaults.find((x) => x.id === u.id);
    const style = d?.style ?? "balanced";
    return { ...u, ...restyle(u, "balanced", style), style, perk: d?.perk ?? "none" };
  });
}

const SEED_DAMAGE: Record<Rarity, number> = { common: 20, rare: 28, epic: 40, legendary: 58, mythic: 82 };

const U = (id: string, name: string, rarity: Rarity, element: Element, arch: Arch, proj: Proj, blurb: string, race: Race, style: Style, perk: Perk): UnitDef => ({
  id,
  name,
  rarity,
  element,
  race,
  arch,
  proj,
  blurb,
  ...restyle({ damage: SEED_DAMAGE[rarity] * ARCHETYPES[arch].dmg, speed: ARCHETYPES[arch].speed }, "balanced", arch === "buff" ? "balanced" : style),
  style: arch === "buff" ? "balanced" : style,
  perk,
  enabled: true,
});

export const DEFAULT_UNITS: UnitDef[] = [
  // common
  U("hooded_archer", "Hooded Archer", "common", "nature", "shot", "arrow", "Never misses, not even a flitting bat.", "human", "balanced", "true_strike"),
  U("fox_spearman", "Fox Spearman", "common", "nature", "pierce", "spark", "One thrust finishes what others started.", "beast", "balanced", "finisher"),
  U("goblin_bomber", "Goblin Bomber", "common", "fire", "splash", "cannonball", "Lobs bombs faster than goblins can run.", "goblin", "rapid", "hunter"),
  U("flame_adept", "Flame Adept", "common", "fire", "burn", "fireball", "Burns the stragglers down to ash.", "human", "balanced", "finisher"),
  U("penguin_wizard", "Penguin Wizard", "common", "ice", "slow", "ice_shard", "Cold enough to chill even a yeti.", "beast", "balanced", "frostbite"),
  U("tesla_gnome", "Tesla Gnome", "common", "lightning", "chain", "lightning", "Pocket thunder that never misses.", "gnome", "rapid", "true_strike"),
  U("cactus_gunslinger", "Cactus Gunslinger", "common", "nature", "crit", "cannonball", "Heavy slugs punch through plate.", "sylvan", "heavy", "armor_breaker"),
  U("clockwork_turret", "Clockwork Turret", "common", "lightning", "shot", "cannonball", "Slow to reload. Cracks any shell.", "construct", "heavy", "armor_breaker"),
  U("wind_sylph", "Wind Sylph", "common", "nature", "shot", "arrow", "Faster than the fastest runner.", "elemental", "rapid", "hunter"),
  U("shield_knight", "Shield Knight", "common", "arcane", "curse", "spark", "Cracks the biggest brutes like eggs.", "human", "heavy", "giant_slayer"),
  U("wolf_hunter", "Wolf Hunter", "common", "nature", "crit", "arrow", "Runs down anything with legs.", "human", "rapid", "hunter"),
  U("pirate_gunner", "Pirate Gunner", "common", "fire", "splash", "cannonball", "Every kill pays. Fire in the hole!", "human", "heavy", "plunder"),
  // rare
  U("ember_witch", "Ember Witch", "rare", "fire", "burn", "fireball", "Her flames finish off the weak.", "human", "balanced", "finisher"),
  U("frost_sorceress", "Frost Sorceress", "rare", "ice", "slow", "ice_shard", "Her frost bites even the frost-proof.", "elf", "balanced", "frostbite"),
  U("frog_alchemist", "Frog Alchemist", "rare", "poison", "poison", "poison", "Ribbit. Bubble. Melt the weakened.", "beast", "balanced", "finisher"),
  U("bee_keeper", "Bee Keeper", "rare", "nature", "poison", "poison", "The bees catch whatever runs.", "human", "rapid", "hunter"),
  U("bear_rider", "Bear Rider", "rare", "nature", "stun", "spark", "The bear wrestles giants for fun.", "dwarf", "heavy", "giant_slayer"),
  U("gear_engineer", "Gear Engineer", "rare", "lightning", "splash", "cannonball", "Twin gear cannons shred armor.", "gnome", "rapid", "armor_breaker"),
  U("imp_hunter", "Imp Hunter", "rare", "fire", "crit", "fireball", "Hunts down the quick little things.", "demon", "balanced", "hunter"),
  U("lute_bard", "Lute Bard", "rare", "arcane", "buff", "arcane_orb", "Plays fast. Neighbours chase the quick.", "elf", "balanced", "hunter"),
  U("raccoon_thief", "Raccoon Thief", "rare", "nature", "mana", "spark", "Picks the pockets of every fallen foe.", "beast", "rapid", "plunder"),
  U("sand_monk", "Sand Monk", "rare", "nature", "stun", "spark", "A palm strike no one can dodge.", "human", "rapid", "true_strike"),
  U("snowglobe_fairy", "Snowglobe Fairy", "rare", "ice", "freeze", "ice_shard", "Her snow freezes even the yetis.", "fae", "balanced", "frostbite"),
  U("spore_sage", "Spore Sage", "rare", "poison", "poison", "poison", "Big spores for big monsters.", "sylvan", "heavy", "giant_slayer"),
  U("storm_totem", "Storm Totem", "rare", "lightning", "chain", "lightning", "Its lightning never misses.", "construct", "balanced", "true_strike"),
  U("thunder_dwarf", "Thunder Dwarf", "rare", "lightning", "stun", "lightning", "Hammer meets armor. Hammer wins.", "dwarf", "heavy", "armor_breaker"),
  U("vine_druid", "Vine Druid", "rare", "nature", "slow", "poison", "Roots grab the fastest ankles.", "elf", "rapid", "hunter"),
  U("witch_doctor", "Witch Doctor", "rare", "poison", "curse", "poison", "Hexes the weak into the grave.", "orc", "balanced", "finisher"),
  U("pumpkin_scarecrow", "Pumpkin Scarecrow", "rare", "poison", "stun", "fireball", "Scares them stiff, keeps their mana.", "sylvan", "balanced", "plunder"),
  U("ogre_chef", "Ogre Chef", "rare", "fire", "splash", "cannonball", "Big pots for big appetites.", "giant", "heavy", "giant_slayer"),
  // epic
  U("crystal_golem", "Crystal Golem", "epic", "arcane", "splash", "arcane_orb", "Crystal shards split any armor.", "elemental", "heavy", "armor_breaker"),
  U("cyclops_smith", "Cyclops Smith", "epic", "fire", "buff", "fireball", "Forges neighbours blades that cut armor.", "giant", "balanced", "armor_breaker"),
  U("fox_samurai", "Fox Samurai", "epic", "arcane", "crit", "spark", "One cut. Through any armor.", "beast", "heavy", "armor_breaker"),
  U("lava_golem", "Lava Golem", "epic", "fire", "burn", "fireball", "Melts down the biggest brutes.", "elemental", "heavy", "giant_slayer"),
  U("magnet_robot", "Magnet Robot", "epic", "lightning", "curse", "lightning", "Pulls armor right off. Fast.", "construct", "rapid", "armor_breaker"),
  U("minotaur_gladiator", "Minotaur Gladiator", "epic", "nature", "stun", "spark", "Lives to fight giants.", "beast", "heavy", "giant_slayer"),
  U("moon_oracle", "Moon Oracle", "epic", "arcane", "mana", "arcane_orb", "Every fallen foe feeds the moon.", "elf", "heavy", "plunder"),
  U("lantern_ghost", "Lantern Ghost", "epic", "arcane", "mana", "arcane_orb", "Its light finds whatever hides.", "undead", "rapid", "true_strike"),
  U("phoenix_chick", "Phoenix Chick", "epic", "fire", "burn", "fireball", "Small bird, fast fire, no survivors.", "beast", "rapid", "finisher"),
  U("plague_alchemist", "Plague Alchemist", "epic", "poison", "poison", "poison", "Finishes the ones still coughing.", "human", "balanced", "finisher"),
  U("sand_worm", "Sand Worm", "epic", "nature", "splash", "cannonball", "Bursts up under the runners.", "beast", "balanced", "hunter"),
  U("shadow_ninja", "Shadow Ninja", "epic", "poison", "crit", "spark", "Nothing dodges the shadow.", "human", "rapid", "true_strike"),
  U("storm_whelp", "Storm Whelp", "epic", "lightning", "chain", "lightning", "Baby dragon, faster than its prey.", "dragon", "rapid", "hunter"),
  U("tide_mermaid", "Tide Mermaid", "epic", "ice", "slow", "ice_shard", "Her tide chills even ice-born foes.", "fae", "balanced", "frostbite"),
  U("treant_guardian", "Treant Guardian", "epic", "nature", "stun", "spark", "Old roots trip the quickest feet.", "sylvan", "balanced", "hunter"),
  U("bone_necromancer", "Bone Necromancer", "epic", "poison", "curse", "poison", "Marks the dying for the grave.", "undead", "heavy", "finisher"),
  U("card_jester", "Card Jester", "epic", "arcane", "crit", "arcane_orb", "Always holds the ace. And your mana.", "human", "balanced", "plunder"),
  // legendary
  U("anubis_priest", "Anubis Priest", "legendary", "arcane", "execute", "arcane_orb", "Weighs every soul. Takes the weak.", "celestial", "balanced", "finisher"),
  U("crystal_queen", "Crystal Queen", "legendary", "ice", "freeze", "ice_shard", "Even the frost-born fall still.", "elf", "balanced", "frostbite"),
  U("lion_paladin", "Lion Paladin", "legendary", "arcane", "buff", "arcane_orb", "Leads the charge against giants.", "beast", "balanced", "giant_slayer"),
  U("spider_queen", "Spider Queen", "legendary", "poison", "slow", "poison", "Her webs snare the swiftest.", "beast", "balanced", "hunter"),
  U("star_astronomer", "Star Astronomer", "legendary", "arcane", "sniper", "arcane_orb", "Falling stars for the biggest foes.", "human", "balanced", "giant_slayer"),
  U("sun_priestess", "Sun Priestess", "legendary", "fire", "buff", "fireball", "Her light leaves nowhere to hide.", "celestial", "balanced", "true_strike"),
  U("unicorn_knight", "Unicorn Knight", "legendary", "arcane", "pierce", "arcane_orb", "Charges through armor and line.", "fae", "balanced", "armor_breaker"),
  U("valkyrie", "Valkyrie", "legendary", "lightning", "chain", "lightning", "Chooses who falls.", "celestial", "balanced", "finisher"),
  U("vampire_countess", "Vampire Countess", "legendary", "poison", "growth", "poison", "Every bite feeds her power.", "undead", "balanced", "plunder"),
  // mythic
  U("void_titan", "Void Titan", "mythic", "arcane", "execute", "arcane_orb", "Erases giants with a touch.", "giant", "heavy", "giant_slayer"),
  U("dragon_egg", "Dragon Egg", "mythic", "fire", "growth", "fireball", "Hatching fire melts any armor.", "dragon", "balanced", "armor_breaker"),
  U("chrono_mage", "Chrono Mage", "mythic", "arcane", "slow", "arcane_orb", "Time bends. No one dodges.", "human", "rapid", "true_strike"),
  U("monkey_king", "Monkey King", "mythic", "nature", "chain", "spark", "His staff outruns any runner.", "beast", "rapid", "hunter"),
];

/** Live tables: replaced in place when a config is applied (see config.ts). */
export const UNITS: UnitDef[] = structuredClone(DEFAULT_UNITS);
export const UNIT_BY_ID: Record<string, UnitDef> = {};

export function indexUnits() {
  for (const k of Object.keys(UNIT_BY_ID)) delete UNIT_BY_ID[k];
  for (const u of UNITS) UNIT_BY_ID[u.id] = u;
}
indexUnits();

export const MAX_RANK = 7;
export const maxCardLevel = () => ECONOMY.upgradeCopies.length + 1;
export const maxPowerUp = () => ECONOMY.powerUpCosts.length;

/** Permanent card level bonus. */
export const levelMult = (level: number) => 1 + (level - 1) * ECONOMY.levelBonus;
/** In-battle power-up bonus. */
export const powerUpMult = (lvl: number) => 1 + lvl * ECONOMY.powerUpBonus;
/** Merge rank 1..7 multiplies damage. */
export const rankMult = (rank: number) => 1 + (rank - 1) * ECONOMY.rankDamageStep;
/** Mana cost of the next in-battle power-up. */
export const powerUpCost = (lvl: number) => ECONOMY.powerUpCosts[lvl] ?? Infinity;

/** Copies needed and coin cost to raise a card to the next permanent level. */
export function upgradeCost(level: number, rarity: Rarity) {
  const copies = ECONOMY.upgradeCopies[level - 1] ?? Infinity;
  const coins = ECONOMY.upgradeCoins[level - 1] ?? Infinity;
  const r = RARITY_ORDER.indexOf(rarity);
  return {
    copies: Math.max(1, Math.ceil(copies / (1 + r * ECONOMY.rarityCopyDiscount))),
    coins: Math.round(coins * (1 + r * ECONOMY.rarityCoinMarkup)),
  };
}

export function unitStats(def: UnitDef, rank: number, level: number, powerUp: number) {
  const damage = def.damage * rankMult(rank) * levelMult(level) * powerUpMult(powerUp);
  const speed = def.speed * (1 + (rank - 1) * ECONOMY.rankSpeedStep);
  return { damage, speed };
}
