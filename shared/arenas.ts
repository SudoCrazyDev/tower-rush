/**
 * Arena layouts, measured in the 752x1344 background image's pixels.
 *
 * Monsters walk in at the top gate (cx, entryY), down to the ring's top edge, around
 * either the left or right half of the ring, and out through the bottom gate.
 * The 5x3 board is the grid of tiles in the middle. Press D in battle to overlay
 * both on the art when tweaking these numbers.
 */
export interface ArenaDef {
  id: string;
  name: string;
  trophies: number;
  grid: { x0: number; dx: number; y0: number; dy: number };
  ring: { left: number; right: number; top: number; bottom: number; radius: number };
  cx: number;
  entryY: number;
  exitY: number;
  monsters: string[];
  bosses: string[];
}

const A = (
  id: string,
  name: string,
  trophies: number,
  grid: [number, number, number, number],
  ring: [number, number, number, number],
  monsters: string[],
  bosses: string[],
): ArenaDef => ({
  id,
  name,
  trophies,
  grid: { x0: grid[0], dx: grid[1], y0: grid[2], dy: grid[3] },
  ring: { left: ring[0], right: ring[1], top: ring[2], bottom: ring[3], radius: 70 },
  cx: 375,
  entryY: 40,
  exitY: 1320,
  monsters,
  bosses,
});

export const DEFAULT_ARENAS: ArenaDef[] = [
  A("meadow", "Royal Meadow", 0, [185, 95.5, 568, 111], [85, 665, 290, 1040],
    ["zombie_peasant", "slime_blob", "goblin_runner", "kobold_miner", "wolf_raider", "orc_brute", "boar_rider", "troll_healer"],
    ["treant_king", "goblin_war_machine", "stone_colossus"]),
  A("cherry_temple", "Cherry Temple", 60, [182, 96, 570, 108], [76, 674, 254, 1024],
    ["zombie_peasant", "slime_blob", "goblin_runner", "giant_hornet", "mushroom_walker", "orc_brute", "gargoyle", "troll_healer"],
    ["stone_colossus", "treant_king", "mushroom_queen"]),
  A("jungle_temple", "Jungle Temple", 150, [184, 95, 570, 110], [70, 660, 300, 1040],
    ["giant_hornet", "boar_rider", "mushroom_walker", "kobold_miner", "armored_beetle", "troll_healer", "gelatinous_cube", "goblin_runner"],
    ["treant_king", "mushroom_queen", "goblin_war_machine"]),
  A("mushroom_forest", "Mushroom Forest", 300, [198, 88.5, 516, 132], [64, 690, 190, 1080],
    ["mushroom_walker", "slime_blob", "giant_hornet", "flying_eyeball", "gelatinous_cube", "troll_healer", "armored_beetle", "ghost_wisp"],
    ["mushroom_queen", "treant_king", "lich_king"]),
  A("candy_land", "Candy Land", 500, [184, 95, 566, 102], [50, 700, 286, 1060],
    ["slime_blob", "gelatinous_cube", "goblin_runner", "chest_mimic", "bomb_goblin", "flying_eyeball", "boar_rider", "door_ogre"],
    ["goblin_war_machine", "mushroom_queen", "stone_colossus"]),
  A("desert", "Scorching Desert", 750, [208, 86, 566, 97], [100, 650, 195, 1050],
    ["sand_scorpion", "mummy_minion", "kobold_miner", "armored_beetle", "goblin_runner", "boulder_crab", "chest_mimic", "troll_healer"],
    ["sand_pharaoh", "stone_colossus", "goblin_war_machine"]),
  A("pirate_beach", "Pirate Beach", 1000, [210, 89.5, 556, 99], [76, 670, 160, 1140],
    ["pirate_skeleton", "boulder_crab", "vampire_bat", "chest_mimic", "slime_blob", "skeleton_soldier", "door_ogre", "bomb_goblin"],
    ["ghost_pirate_captain", "kraken", "goblin_war_machine"]),
  A("coral_reef", "Coral Reef", 1300, [194, 93, 570, 113], [64, 690, 236, 1050],
    ["boulder_crab", "slime_blob", "ghost_wisp", "pirate_skeleton", "gelatinous_cube", "flying_eyeball", "iron_snail", "troll_healer"],
    ["kraken", "ghost_pirate_captain", "frost_wyrm"]),
  A("graveyard", "Haunted Graveyard", 1650, [196, 95, 570, 113], [76, 700, 290, 990],
    ["zombie_peasant", "skeleton_soldier", "ghost_wisp", "vampire_bat", "mummy_minion", "gargoyle", "void_horror", "door_ogre"],
    ["lich_king", "ghost_pirate_captain", "void_emperor"]),
  A("winter_village", "Winter Village", 2000, [186, 95, 570, 108], [86, 666, 280, 1040],
    ["yeti_cub", "wolf_raider", "ice_golem_minion", "kobold_miner", "goblin_runner", "gargoyle", "chest_mimic", "troll_healer"],
    ["frost_wyrm", "lich_king", "stone_colossus"]),
  A("tundra", "Frozen Tundra", 2400, [204, 86, 554, 108], [90, 660, 240, 1000],
    ["yeti_cub", "ice_golem_minion", "wolf_raider", "iron_snail", "armored_beetle", "ghost_wisp", "door_ogre", "troll_healer"],
    ["frost_wyrm", "kraken", "lich_king"]),
  A("crystal_cave", "Crystal Cave", 2800, [184, 95, 570, 108], [60, 690, 300, 1060],
    ["kobold_miner", "boulder_crab", "armored_beetle", "iron_snail", "flying_eyeball", "gargoyle", "gelatinous_cube", "void_horror"],
    ["stone_colossus", "void_emperor", "goblin_war_machine"]),
  A("clockwork_city", "Clockwork City", 3300, [196, 95, 570, 110], [70, 690, 280, 1040],
    ["bomb_goblin", "goblin_runner", "iron_snail", "armored_beetle", "kobold_miner", "door_ogre", "chest_mimic", "gargoyle"],
    ["goblin_war_machine", "stone_colossus", "fire_dragon"]),
  A("volcano", "Molten Volcano", 3800, [202, 86.5, 600, 98], [72, 680, 200, 1040],
    ["lava_imp", "fire_wisp", "boulder_crab", "orc_brute", "gargoyle", "void_horror", "door_ogre", "troll_healer"],
    ["fire_dragon", "demon_lord", "stone_colossus"]),
  A("hell_fortress", "Hell Fortress", 4400, [194, 93, 570, 108], [50, 694, 300, 1040],
    ["lava_imp", "fire_wisp", "void_horror", "gargoyle", "skeleton_soldier", "door_ogre", "vampire_bat", "orc_brute"],
    ["demon_lord", "fire_dragon", "lich_king"]),
  A("sky_temple", "Sky Temple", 5000, [194, 93, 570, 100], [54, 694, 240, 1080],
    ["ghost_wisp", "flying_eyeball", "gargoyle", "void_horror", "vampire_bat", "giant_hornet", "iron_snail", "troll_healer"],
    ["void_emperor", "demon_lord", "frost_wyrm"]),
];

/** Live tables: replaced in place when a config is applied (see config.ts). */
export const ARENAS: ArenaDef[] = structuredClone(DEFAULT_ARENAS);
export const ARENA_BY_ID: Record<string, ArenaDef> = {};

export function indexArenas() {
  for (const k of Object.keys(ARENA_BY_ID)) delete ARENA_BY_ID[k];
  for (const a of ARENAS) ARENA_BY_ID[a.id] = a;
}
indexArenas();

export function arenaForTrophies(trophies: number): ArenaDef {
  // Highest unlocked arena (admins may reorder or retune the trophy gates).
  let best = ARENAS[0];
  for (const a of ARENAS) if (a.trophies <= trophies && (best.trophies > trophies || a.trophies >= best.trophies)) best = a;
  return best;
}
