import { ECONOMY } from "./economy.ts";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type Element = "fire" | "ice" | "lightning" | "nature" | "poison" | "arcane";

/**
 * How a unit fights. Every unit uses exactly one archetype; the special-effect numbers
 * (slow %, crit chance, ...) live in the battle code, while each unit's own damage and
 * attack speed are editable in the admin panel.
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
  arch: Arch;
  proj: Proj;
  blurb: string;
  /** Damage per hit at rank 1, card level 1, no power-ups. */
  damage: number;
  /** Attacks per second at rank 1. */
  speed: number;
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

const SEED_DAMAGE: Record<Rarity, number> = { common: 20, rare: 26, epic: 34, legendary: 44, mythic: 56 };

const U = (id: string, name: string, rarity: Rarity, element: Element, arch: Arch, proj: Proj, blurb: string): UnitDef => ({
  id,
  name,
  rarity,
  element,
  arch,
  proj,
  blurb,
  damage: Math.round(SEED_DAMAGE[rarity] * ARCHETYPES[arch].dmg * 10) / 10,
  speed: ARCHETYPES[arch].speed,
  enabled: true,
});

export const DEFAULT_UNITS: UnitDef[] = [
  // common
  U("hooded_archer", "Hooded Archer", "common", "nature", "shot", "arrow", "Never misses a heartbeat."),
  U("fox_spearman", "Fox Spearman", "common", "nature", "pierce", "spark", "One thrust, three goblins."),
  U("goblin_bomber", "Goblin Bomber", "common", "fire", "splash", "cannonball", "Loves loud noises."),
  U("flame_adept", "Flame Adept", "common", "fire", "burn", "fireball", "Still learning not to singe allies."),
  U("penguin_wizard", "Penguin Wizard", "common", "ice", "slow", "ice_shard", "Cold hands, colder spells."),
  U("tesla_gnome", "Tesla Gnome", "common", "lightning", "chain", "lightning", "Pocket-sized thunderstorm."),
  U("cactus_gunslinger", "Cactus Gunslinger", "common", "nature", "crit", "cannonball", "Prickly and precise."),
  U("clockwork_turret", "Clockwork Turret", "common", "lightning", "shot", "cannonball", "Tick, tock, pop."),
  U("wind_sylph", "Wind Sylph", "common", "nature", "shot", "arrow", "Fast as a breeze."),
  U("shield_knight", "Shield Knight", "common", "arcane", "curse", "spark", "Cracks armor like eggshells."),
  U("wolf_hunter", "Wolf Hunter", "common", "nature", "crit", "arrow", "Aims for the weak spot."),
  U("pirate_gunner", "Pirate Gunner", "common", "fire", "splash", "cannonball", "Fire in the hole!"),
  // rare
  U("ember_witch", "Ember Witch", "rare", "fire", "burn", "fireball", "Her cauldron never cools."),
  U("frost_sorceress", "Frost Sorceress", "rare", "ice", "slow", "ice_shard", "Turns marches into crawls."),
  U("frog_alchemist", "Frog Alchemist", "rare", "poison", "poison", "poison", "Ribbit. Bubble. Melt."),
  U("bee_keeper", "Bee Keeper", "rare", "nature", "poison", "poison", "The bees know what to do."),
  U("bear_rider", "Bear Rider", "rare", "nature", "stun", "spark", "The bear does most of the work."),
  U("gear_engineer", "Gear Engineer", "rare", "lightning", "splash", "cannonball", "Twin gear cannons, zero patience."),
  U("imp_hunter", "Imp Hunter", "rare", "fire", "crit", "fireball", "Knows exactly where it hurts."),
  U("lute_bard", "Lute Bard", "rare", "arcane", "buff", "arcane_orb", "Neighbours fight to the beat."),
  U("raccoon_thief", "Raccoon Thief", "rare", "nature", "mana", "spark", "Pockets full of stolen mana."),
  U("sand_monk", "Sand Monk", "rare", "nature", "stun", "spark", "Palm strike, sand storm."),
  U("snowglobe_fairy", "Snowglobe Fairy", "rare", "ice", "freeze", "ice_shard", "Shakes things up. Then freezes them."),
  U("spore_sage", "Spore Sage", "rare", "poison", "poison", "poison", "Mushrooms are friends."),
  U("storm_totem", "Storm Totem", "rare", "lightning", "chain", "lightning", "Calls lightning from a clear sky."),
  U("thunder_dwarf", "Thunder Dwarf", "rare", "lightning", "stun", "lightning", "Hammer meets thunder."),
  U("vine_druid", "Vine Druid", "rare", "nature", "slow", "poison", "Roots grab every ankle."),
  U("witch_doctor", "Witch Doctor", "rare", "poison", "curse", "poison", "Hexes stack. So does the damage."),
  U("pumpkin_scarecrow", "Pumpkin Scarecrow", "rare", "poison", "stun", "fireball", "Scares monsters stiff."),
  U("ogre_chef", "Ogre Chef", "rare", "fire", "splash", "cannonball", "Today's special: flying pots."),
  // epic
  U("crystal_golem", "Crystal Golem", "epic", "arcane", "splash", "arcane_orb", "Shatters on purpose."),
  U("cyclops_smith", "Cyclops Smith", "epic", "fire", "buff", "fireball", "Forges sharper neighbours."),
  U("fox_samurai", "Fox Samurai", "epic", "arcane", "crit", "spark", "One cut. Clean."),
  U("lava_golem", "Lava Golem", "epic", "fire", "burn", "fireball", "Leaves only ashes."),
  U("magnet_robot", "Magnet Robot", "epic", "lightning", "curse", "lightning", "Pulls armor right off."),
  U("minotaur_gladiator", "Minotaur Gladiator", "epic", "nature", "stun", "spark", "The crowd loves him."),
  U("moon_oracle", "Moon Oracle", "epic", "arcane", "mana", "arcane_orb", "Moonlight becomes mana."),
  U("lantern_ghost", "Lantern Ghost", "epic", "arcane", "mana", "arcane_orb", "Its lantern burns pure mana."),
  U("phoenix_chick", "Phoenix Chick", "epic", "fire", "burn", "fireball", "Small bird, big fire."),
  U("plague_alchemist", "Plague Alchemist", "epic", "poison", "poison", "poison", "Brews the worst cough."),
  U("sand_worm", "Sand Worm", "epic", "nature", "splash", "cannonball", "Bursts from below."),
  U("shadow_ninja", "Shadow Ninja", "epic", "poison", "crit", "spark", "You will not see it coming."),
  U("storm_whelp", "Storm Whelp", "epic", "lightning", "chain", "lightning", "Baby dragon, grown-up thunder."),
  U("tide_mermaid", "Tide Mermaid", "epic", "ice", "slow", "ice_shard", "Drags monsters into the tide."),
  U("treant_guardian", "Treant Guardian", "epic", "nature", "stun", "spark", "Old roots, heavy branches."),
  U("bone_necromancer", "Bone Necromancer", "epic", "poison", "curse", "poison", "Marks the living for death."),
  U("card_jester", "Card Jester", "epic", "arcane", "crit", "arcane_orb", "Always holds the ace."),
  // legendary
  U("anubis_priest", "Anubis Priest", "legendary", "arcane", "execute", "arcane_orb", "Weighs every soul."),
  U("crystal_queen", "Crystal Queen", "legendary", "ice", "freeze", "ice_shard", "Her court is forever still."),
  U("lion_paladin", "Lion Paladin", "legendary", "arcane", "buff", "arcane_orb", "Leads from the front."),
  U("spider_queen", "Spider Queen", "legendary", "poison", "slow", "poison", "Webs everywhere."),
  U("star_astronomer", "Star Astronomer", "legendary", "arcane", "sniper", "arcane_orb", "Calls down falling stars."),
  U("sun_priestess", "Sun Priestess", "legendary", "fire", "buff", "fireball", "Blessed by the noon sun."),
  U("unicorn_knight", "Unicorn Knight", "legendary", "arcane", "pierce", "arcane_orb", "Charges through the line."),
  U("valkyrie", "Valkyrie", "legendary", "lightning", "chain", "lightning", "Chooses who falls."),
  U("vampire_countess", "Vampire Countess", "legendary", "poison", "growth", "poison", "Grows stronger with every bite."),
  // mythic
  U("void_titan", "Void Titan", "mythic", "arcane", "execute", "arcane_orb", "Erases what it touches."),
  U("dragon_egg", "Dragon Egg", "mythic", "fire", "growth", "fireball", "Something huge is hatching."),
  U("chrono_mage", "Chrono Mage", "mythic", "arcane", "slow", "arcane_orb", "Time bends to his staff."),
  U("monkey_king", "Monkey King", "mythic", "nature", "chain", "spark", "His staff bounces between foes."),
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
