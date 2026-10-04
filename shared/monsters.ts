import type { Race } from "./races.ts";

export type Trait = "fast" | "tank" | "armored" | "healer" | "splitter" | "rich" | "dodge" | "frostproof";

export interface MonsterDef {
  id: string;
  name: string;
  race: Race;
  /** Multiplier on the wave's base HP. */
  hp: number;
  /** Pixels per second at 1x speed. */
  speed: number;
  traits: Trait[];
  /** Mana awarded on kill. */
  mana: number;
  /** Display size in px. */
  size: number;
}

const M = (id: string, name: string, race: Race, hp: number, speed: number, traits: Trait[] = [], mana = 10, size = 84): MonsterDef => ({
  id,
  name,
  race,
  hp,
  speed,
  traits,
  mana,
  size,
});

export const DEFAULT_MONSTERS: MonsterDef[] = [
  M("zombie_peasant", "Zombie Peasant", "undead", 0.9, 55),
  M("slime_blob", "Slime Blob", "elemental", 0.8, 60, ["splitter"]),
  M("goblin_runner", "Goblin Runner", "goblin", 0.55, 120, ["fast"], 8, 78),
  M("kobold_miner", "Kobold Miner", "goblin", 0.9, 70),
  M("mushroom_walker", "Mushroom Walker", "sylvan", 1.0, 60),
  M("skeleton_soldier", "Skeleton Soldier", "undead", 1.0, 70, ["armored"]),
  M("pirate_skeleton", "Pirate Skeleton", "undead", 1.0, 72),
  M("mummy_minion", "Mummy Minion", "undead", 1.1, 58),
  M("wolf_raider", "Wolf Raider", "beast", 0.7, 115, ["fast"]),
  M("boar_rider", "Boar Rider", "orc", 0.9, 105, ["fast"], 10, 92),
  M("vampire_bat", "Vampire Bat", "beast", 0.5, 130, ["fast", "dodge"], 8, 76),
  M("giant_hornet", "Giant Hornet", "beast", 0.55, 125, ["fast"], 8, 76),
  M("fire_wisp", "Fire Wisp", "elemental", 0.6, 110, ["fast", "dodge"], 8, 72),
  M("ghost_wisp", "Ghost Wisp", "undead", 0.6, 100, ["dodge"], 8, 72),
  M("lava_imp", "Lava Imp", "demon", 0.7, 100, ["fast"]),
  M("sand_scorpion", "Sand Scorpion", "beast", 0.8, 95, ["fast"]),
  M("flying_eyeball", "Flying Eyeball", "demon", 0.8, 80, ["dodge"]),
  M("yeti_cub", "Yeti Cub", "beast", 1.2, 62, ["frostproof"]),
  M("orc_brute", "Orc Brute", "orc", 2.2, 50, ["tank"], 15, 100),
  M("door_ogre", "Door Ogre", "giant", 2.8, 45, ["tank", "armored"], 18, 108),
  M("boulder_crab", "Boulder Crab", "beast", 2.4, 45, ["tank", "armored"], 15, 100),
  M("armored_beetle", "Armored Beetle", "beast", 2.0, 55, ["armored"], 15, 96),
  M("iron_snail", "Iron Snail", "beast", 3.2, 35, ["tank", "armored"], 20, 100),
  M("ice_golem_minion", "Ice Golem", "elemental", 2.4, 48, ["tank", "frostproof"], 15, 100),
  M("gargoyle", "Gargoyle", "construct", 1.6, 70, ["armored"], 12, 96),
  M("void_horror", "Void Horror", "demon", 2.6, 55, ["tank"], 18, 104),
  M("gelatinous_cube", "Gelatinous Cube", "elemental", 2.0, 45, ["tank", "splitter"], 15, 100),
  M("troll_healer", "Troll Healer", "orc", 1.5, 55, ["healer"], 15, 96),
  M("bomb_goblin", "Bomb Goblin", "goblin", 0.8, 100, ["fast"]),
  M("chest_mimic", "Chest Mimic", "construct", 1.5, 65, ["rich"], 40, 92),
];

export const TRAITS: Trait[] = ["fast", "tank", "armored", "healer", "splitter", "rich", "dodge", "frostproof"];

/** Live tables: replaced in place when a config is applied (see config.ts). */
export const MONSTERS: MonsterDef[] = structuredClone(DEFAULT_MONSTERS);
export const MONSTER_BY_ID: Record<string, MonsterDef> = {};

export type BossPower = "summon" | "heal" | "haste" | "shield" | "freeze_units" | "teleport";
export const BOSS_POWERS: BossPower[] = ["summon", "heal", "haste", "shield", "freeze_units", "teleport"];

export interface BossDef {
  id: string;
  name: string;
  race: Race;
  /** Multiplier on the wave's base HP (applied on top of the boss scaling). */
  hp: number;
  speed: number;
  /** What the boss does every few seconds. */
  power: BossPower;
  minion?: string;
}

export const DEFAULT_BOSSES: BossDef[] = [
  { id: "treant_king", name: "Treant King", race: "sylvan", hp: 1.0, speed: 34, power: "heal" },
  { id: "stone_colossus", name: "Stone Colossus", race: "construct", hp: 1.3, speed: 28, power: "shield" },
  { id: "goblin_war_machine", name: "Goblin War Machine", race: "goblin", hp: 1.1, speed: 36, power: "summon", minion: "goblin_runner" },
  { id: "mushroom_queen", name: "Mushroom Queen", race: "sylvan", hp: 1.0, speed: 34, power: "summon", minion: "mushroom_walker" },
  { id: "sand_pharaoh", name: "Sand Pharaoh", race: "undead", hp: 1.1, speed: 34, power: "summon", minion: "mummy_minion" },
  { id: "ghost_pirate_captain", name: "Ghost Pirate Captain", race: "undead", hp: 1.0, speed: 38, power: "teleport" },
  { id: "kraken", name: "Kraken", race: "beast", hp: 1.3, speed: 30, power: "freeze_units" },
  { id: "lich_king", name: "Lich King", race: "undead", hp: 1.2, speed: 32, power: "summon", minion: "skeleton_soldier" },
  { id: "frost_wyrm", name: "Frost Wyrm", race: "dragon", hp: 1.2, speed: 36, power: "freeze_units" },
  { id: "fire_dragon", name: "Fire Dragon", race: "dragon", hp: 1.3, speed: 36, power: "haste" },
  { id: "demon_lord", name: "Demon Lord", race: "demon", hp: 1.4, speed: 32, power: "summon", minion: "lava_imp" },
  { id: "void_emperor", name: "Void Emperor", race: "demon", hp: 1.6, speed: 30, power: "teleport" },
];

export const BOSSES: BossDef[] = structuredClone(DEFAULT_BOSSES);
export const BOSS_BY_ID: Record<string, BossDef> = {};

export function indexMonsters() {
  for (const k of Object.keys(MONSTER_BY_ID)) delete MONSTER_BY_ID[k];
  for (const m of MONSTERS) MONSTER_BY_ID[m.id] = m;
  for (const k of Object.keys(BOSS_BY_ID)) delete BOSS_BY_ID[k];
  for (const b of BOSSES) BOSS_BY_ID[b.id] = b;
}
indexMonsters();
