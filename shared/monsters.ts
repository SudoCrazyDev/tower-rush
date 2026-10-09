import type { Race } from "./races.ts";

/** `tether` (v1.2): stretches to the nearest unit and gives it Fatigue until killed. */
export type Trait = "fast" | "tank" | "armored" | "healer" | "splitter" | "rich" | "dodge" | "frostproof" | "tether";

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
  // v1.2 Stories, Story 1: candy folk (each mirrors an existing trait). Corruption is drawn in code.
  M("gummy_bear", "Gummy Bear", "candy", 0.9, 55),
  M("candy_corn_runner", "Candy Corn Runner", "candy", 0.55, 120, ["fast"], 8, 78),
  M("jelly_bean_blob", "Jelly Bean Blob", "candy", 0.8, 60, ["splitter"]),
  M("cotton_candy_puff", "Cotton Candy Puff", "candy", 0.6, 100, ["dodge"], 8, 72),
  M("chocolate_golem", "Chocolate Golem", "candy", 2.2, 50, ["tank"], 15, 100),
  M("peppermint_turtle", "Peppermint Turtle", "candy", 2.0, 55, ["armored"], 15, 96),
  M("licorice_medic", "Licorice Medic", "candy", 1.5, 55, ["healer"], 15, 96),
  M("candy_pinata", "Candy Piñata", "candy", 1.5, 65, ["rich"], 40, 92),
  // Story 2: chaos-born.
  M("sprinkle_swarm", "Sprinkle Swarm", "chaos", 0.5, 125, ["fast", "splitter"], 8, 76),
  M("sour_shard", "Sour Shard", "chaos", 1.6, 70, ["armored", "dodge"], 12, 92),
  M("chaos_taffy", "Chaos Taffy", "chaos", 1.4, 50, ["tether"], 14, 96),
  // Story 3: chaos-corrupted villagers (tentacles and eyes are in the art).
  M("corrupted_villager", "Corrupted Villager", "human", 0.9, 55),
  M("corrupted_courier", "Corrupted Courier", "human", 0.55, 120, ["fast"], 8, 78),
  M("corrupted_farmer", "Corrupted Farmer", "human", 0.9, 60, ["splitter"]),
  M("corrupted_fisherman", "Corrupted Fisherman", "human", 2.0, 55, ["armored"], 15, 96),
  M("corrupted_lumberjack", "Corrupted Lumberjack", "human", 2.4, 48, ["tank"], 16, 104),
  M("corrupted_herbalist", "Corrupted Herbalist", "human", 1.5, 55, ["healer"], 15, 96),
  M("corrupted_merchant", "Corrupted Merchant", "human", 1.5, 65, ["rich"], 40, 92),
  M("chaos_eye", "Chaos Eye", "chaos", 0.7, 95, ["dodge"], 8, 76),
  // v2.1 Book 2 "Chaos Corrupted", Story 1: the corrupted elven army and Thalmyr's saplings.
  M("corrupted_elf_scout", "Corrupted Elf Scout", "elf", 0.6, 125, ["fast"], 8, 78),
  M("corrupted_elf_warrior", "Corrupted Elf Warrior", "elf", 1.1, 65),
  M("corrupted_elf_archer", "Corrupted Elf Archer", "elf", 0.9, 75, ["dodge"], 10, 82),
  M("corrupted_elf_warden", "Corrupted Elf Warden", "elf", 2.2, 50, ["armored"], 16, 100),
  M("corrupted_sapling", "Corrupted Sapling", "sylvan", 0.5, 70, [], 4, 70),
];

/** Monsters added after configs were already saved: appended to an older saved list. */
export const ADDED_MONSTERS = [
  "gummy_bear", "candy_corn_runner", "jelly_bean_blob", "cotton_candy_puff", "chocolate_golem", "peppermint_turtle", "licorice_medic", "candy_pinata",
  "sprinkle_swarm", "sour_shard", "chaos_taffy",
  "corrupted_villager", "corrupted_courier", "corrupted_farmer", "corrupted_fisherman", "corrupted_lumberjack", "corrupted_herbalist", "corrupted_merchant", "chaos_eye",
  "corrupted_elf_scout", "corrupted_elf_warrior", "corrupted_elf_archer", "corrupted_elf_warden", "corrupted_sapling",
];

/** What a splitter breaks into: a smaller copy of itself unless listed here. */
export const SPLITS_INTO: Record<string, string> = { gelatinous_cube: "slime_blob", corrupted_farmer: "chaos_eye" };
/** Splitters that break into three instead of two. */
export const SPLIT_COUNT: Record<string, number> = { jelly_bean_blob: 3, corrupted_farmer: 3 };

export const TRAITS: Trait[] = ["fast", "tank", "armored", "healer", "splitter", "rich", "dodge", "frostproof", "tether"];

/** Live tables: replaced in place when a config is applied (see config.ts). */
export const MONSTERS: MonsterDef[] = structuredClone(DEFAULT_MONSTERS);
export const MONSTER_BY_ID: Record<string, MonsterDef> = {};

/**
 * v1.2 Stories adds:
 * - charm: gives a few units Irritation (their attacks can miss)
 * - roar: below half HP, one roar that Shellshocks (stuns) a few units; after that it rages (haste)
 * - split: every quarter of its HP lost, minions burst out
 * - layers: 4 layers (HP bars); each one that breaks stuns units, sheds, speeds the boss up and
 *   releases minions; the last layer (the core) gives every unit Irritation in pulses
 * - portal: opens portals along the path that minions step out of, and blinks forward once a phase
 * v2.1 adds "none" (a boss that only uses its `skills`).
 */
export type BossPower = "summon" | "heal" | "haste" | "shield" | "freeze_units" | "teleport" | "charm" | "roar" | "split" | "layers" | "portal" | "none";
export const BOSS_POWERS: BossPower[] = ["summon", "heal", "haste", "shield", "freeze_units", "teleport", "charm", "roar", "split", "layers", "portal", "none"];

/**
 * v2.1 Book 2 skills: extra timed abilities a boss uses on top of its power, each on its own timer.
 * - entangle: roots `n` random units (no attacks) until the wave ends
 * - impale: stuns `n` random units (Shellshock) for `dur` seconds
 * - sapling_trail: drops `n` minions behind the boss while it walks
 * - volley: shoots `n` arrows at random units; each misses with chance `miss`, a hit stuns for `dur`
 */
export type BossSkillKind = "entangle" | "impale" | "sapling_trail" | "volley";
export const BOSS_SKILLS: BossSkillKind[] = ["entangle", "impale", "sapling_trail", "volley"];
export interface BossSkill {
  kind: BossSkillKind;
  /** Seconds between uses (the first use comes after `first`, default `every`). */
  every: number;
  first?: number;
  /** At most this many uses (default unlimited). */
  uses?: number;
  /** Targets or minions per use: a fixed number, or [min, max] picked at random. */
  n: number | [number, number];
  dur?: number;
  miss?: number;
}

/**
 * v2.1 Rally: a scripted story moment. When the boss walks `at` of the path, allies charge it back
 * to the start, it loses `damage` of its current HP, speeds up by `speed` and stops using its power
 * and skills; entangled units are freed. Happens once. The story wave holds the panels.
 */
export interface BossRally {
  at: number;
  damage: number;
  speed: number;
}
/** Powers that need a minion. */
export const MINION_POWERS: BossPower[] = ["summon", "split", "layers", "portal"];

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
  /** Below half HP it uses this power instead (v1.2). */
  rage?: BossPower;
  /** Units hit by freeze_units, charm and roar (default 3). */
  targets?: number;
  /** Monster traits the boss has too, such as dodge (v1.2). */
  traits?: Trait[];
  /** A corrupted story boss: the Lance Knight's bane hits it harder, and it glows violet. */
  corrupted?: boolean;
  /** v2.1: extra timed skills. */
  skills?: BossSkill[];
  /** v2.1: chance (0-1) that a hit deals no damage ("BLOCK"). */
  block?: number;
  /** v2.1: chance (0-1) that a hit misses ("MISS"), on top of the dodge trait. */
  evade?: number;
  /** v2.1: the story charge (see BossRally). */
  rally?: BossRally;
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
  // v1.2 Stories, Book 1 "The Chosen".
  { id: "gummy_warlord", name: "Gummy Warlord", race: "candy", hp: 1.0, speed: 34, power: "summon", minion: "gummy_bear", corrupted: true },
  { id: "licorice_witch", name: "Licorice Witch", race: "candy", hp: 1.1, speed: 34, power: "freeze_units", targets: 2, corrupted: true },
  { id: "sugar_plum_tyrant", name: "Sugar Plum Tyrant", race: "candy", hp: 1.3, speed: 32, power: "shield", rage: "haste", corrupted: true },
  { id: "sour_gummy_hydra", name: "Sour Gummy Hydra", race: "chaos", hp: 1.3, speed: 30, power: "split", minion: "jelly_bean_blob", corrupted: true },
  { id: "chaos_jawbreaker", name: "Chaos Jawbreaker", race: "chaos", hp: 1.6, speed: 26, power: "layers", minion: "sprinkle_swarm", targets: 3, corrupted: true },
  { id: "corrupted_fae", name: "Chaos Corrupted Fae", race: "fae", hp: 1.1, speed: 38, power: "charm", targets: 2, traits: ["dodge"], corrupted: true },
  { id: "corrupted_bear", name: "Chaos Corrupted Bear", race: "beast", hp: 1.5, speed: 30, power: "roar", targets: 3, corrupted: true },
  { id: "portal_wizard", name: "Chaos Corrupted Portal Wizard", race: "human", hp: 1.6, speed: 30, power: "portal", minion: "chaos_eye", corrupted: true },
  // v2.1 Book 2 "Chaos Corrupted", Story 1 "The Elven Wilds".
  { id: "elf_captain_morvane", name: "Captain Morvane", race: "elf", hp: 1.1, speed: 34, power: "summon", minion: "corrupted_elf_warrior", corrupted: true },
  {
    id: "elf_captain_sylris", name: "Captain Sylris", race: "elf", hp: 1.2, speed: 36, power: "summon", minion: "corrupted_elf_archer", corrupted: true,
    skills: [{ kind: "volley", every: 5, first: 3, n: 3, miss: 0.7, dur: 2 }],
  },
  { id: "elf_captain_kaelen", name: "Captain Kaelen", race: "elf", hp: 1.3, speed: 34, power: "haste", block: 0.35, corrupted: true },
  {
    id: "thalmyr", name: "Thalmyr, the Torn Guardian", race: "beast", hp: 6.0, speed: 15, power: "none", minion: "corrupted_sapling", corrupted: true,
    skills: [
      { kind: "sapling_trail", every: 4, first: 2, n: [1, 2] },
      { kind: "entangle", every: 14, first: 8, uses: 3, n: [1, 3] },
    ],
  },
  {
    id: "vaeltharion", name: "Vaeltharion, the Elven Commander", race: "elf", hp: 7.0, speed: 22, power: "none", corrupted: true,
    skills: [
      { kind: "impale", every: 7, first: 4, n: 1, dur: 5 },
      { kind: "entangle", every: 15, first: 10, n: [2, 4] },
    ],
    rally: { at: 0.8, damage: 0.5, speed: 1.25 },
  },
];

/** Bosses added after configs were already saved: appended to an older saved list. */
export const ADDED_BOSSES = ["gummy_warlord", "licorice_witch", "sugar_plum_tyrant", "sour_gummy_hydra", "chaos_jawbreaker", "corrupted_fae", "corrupted_bear", "portal_wizard",
  "elf_captain_morvane", "elf_captain_sylris", "elf_captain_kaelen", "thalmyr", "vaeltharion"];

export const BOSSES: BossDef[] = structuredClone(DEFAULT_BOSSES);
export const BOSS_BY_ID: Record<string, BossDef> = {};

export function indexMonsters() {
  for (const k of Object.keys(MONSTER_BY_ID)) delete MONSTER_BY_ID[k];
  for (const m of MONSTERS) MONSTER_BY_ID[m.id] = m;
  for (const k of Object.keys(BOSS_BY_ID)) delete BOSS_BY_ID[k];
  for (const b of BOSSES) BOSS_BY_ID[b.id] = b;
}
indexMonsters();
