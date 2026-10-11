/**
 * v1.2 Story mode (docs/features/v1.2-stories). Book 1 "The Chosen": three stories of three
 * chapters, played in order. A chapter is one battle with a fixed, hand-made list of waves
 * (no random picks) and a boss at the end; clearing the last wave with lives left wins it.
 *
 * Everything here is part of the game config, so the admin Stories page can edit it.
 */
import type { Reward } from "./daily.ts";
import { UNIT_BY_ID, deckable, type Rarity } from "./units.ts";

/** `n` monsters of one kind. */
export interface StorySpawn {
  id: string;
  n: number;
}

export interface StoryWave {
  spawns: StorySpawn[];
  /** Boss of this wave (it walks in first, the spawns follow). */
  boss?: string;
  /** Multiplier on this wave's monster HP (1 = the chapter's normal curve). */
  hp: number;
  /** A speech bubble when the wave starts. */
  bark?: StoryLine;
  /**
   * v2.1: the cutscene of the boss's rally (BossRally): `before` panels, then the allies (story/allies/<id>)
   * charge down the path, then the `after` panels; the battle resumes.
   */
  rally?: { before: StoryPanel[]; allies: string[]; after: StoryPanel[] };
  /**
   * v2.2: a scripted reveal during the boss fight. When the boss drops to `at` of its HP, the
   * battle pauses for `panels`, then the boss is stunned for `stun` seconds (Pearl's cry in Story 2).
   */
  reveal?: { at: number; panels: StoryPanel[]; stun: number };
}

/**
 * v2.2 board mechanics a chapter turns on (docs/features/v2.2-sand-and-sea). All optional:
 * a chapter without them plays exactly as before. Slots are board tiles 0-14 (5 per row).
 */
export interface ChapterMechanics {
  /**
   * The tide swings low, then high, every `cycle` seconds (half each). At low tide monsters move at
   * x `lowSpeed`. Each low tide marks `flood` random slots; at high tide units on them are submerged
   * (no attacks) and monsters move at x `highSpeed`.
   */
  tide?: { cycle: number; flood: number; lowSpeed: number; highSpeed: number };
  /**
   * Pools beside the path, at these shares (0-1) of the path. Each pool runs dry after `sips` monsters
   * walk past it (a boss drains it at once). Each pool left at the win adds `bonus` to the first-clear reward.
   */
  tidePools?: { at: number[]; bonus: number; sips: number };
  /** Story 3: Faceless rules. Units on `braziers` light them; Faceless passing a lit brazier lose their mask. */
  faceless?: {
    braziers: number[];
    /** Each civilian saved (reached the exit unhurt) adds this to the first-clear reward, up to `savedCap`. */
    savedBonus: number;
    savedCap: number;
    /** Each civilian hit (any damage, splash included) takes this off the first-clear reward, down to `floor`. */
    hitCut: number;
    floor: number;
  };
  /**
   * Story 2 Ch 2: Ondrath's shell. The boss lies still at the path's start and can't be hurt. Barnacle
   * clusters grow on the path in `stages` (how many at a time), at these shares (0-1) of the path, in
   * order, with HP x `hp[stage]` of a normal monster's. Each cluster breeds Barnacle Spawn every
   * `brood` seconds (one per stage reached: 1, then 2, then 3), up to `cap` of its brood alive at once.
   * The fight is one long wave with no wave income, so the shell pays `mana` per second instead.
   * Breaking all of them cleanses Ondrath: the chapter's win.
   */
  shell?: { at: number[]; stages: number[]; hp: number[]; brood: number; cap: number; mana: number };
  /** Story 3: the sphinx's cage. Units next to `slot` hit the lock between waves; open before the boss wave, the sphinx roars (stuns every monster for `roarStun` seconds). */
  cage?: { slot: number; lockHp: number; roarStun: number };
}

/** v2.2: an arena duel chapter (Story 3): a best-of PvP match against the bot with a fixed deck. */
export interface StoryDuel {
  /** PvP arena id the match is played on. */
  arena: string;
  /** Portrait (story portrait or unit id) and name of the rival. */
  rival: string;
  rivalName: string;
  /** The rival's deck (5 unit ids) and card level. */
  deck: string[];
  level: number;
  /** Round wins needed (2 = best of 3); bot skill (0-1) per round. */
  rounds: number;
  skill: number[];
  /** Lines the rival says before each round. */
  barks: StoryLine[];
}

/** v2.2: a won chapter's optional objectives, which scale its first-clear reward. */
export interface StoryObjectives {
  poolsLeft: number;
  civiliansSaved: number;
  civiliansHit: number;
  cageOpen: boolean;
}

/** A line of dialogue: `who` is a unit id (its card portrait) or a story portrait (candy_king). */
export interface StoryLine {
  who: string;
  text: string;
}

/** A full-screen illustrated panel (story/panels/<image>) with 1-3 lines of text. */
export interface StoryPanel {
  image: string;
  lines: string[];
  /** Optional looping boss sheet (sheets/bosses/<anim>) shown over the panel's corner. */
  anim?: string;
}

/** What a chapter needs from the player's own deck (Story 3). */
export interface DeckRules {
  /** Units that must be in the deck. */
  requiredUnits: string[];
  /** Rarities that may not be in the deck. */
  bannedRarities: Rarity[];
  /** Required units below this card level fight at it instead (0 = off). */
  levelFloor: number;
}

/** A fixed deck the story hands out (Story 2): pick `pick` of `units`, all at `level`. */
export interface EventDeck {
  units: string[];
  pick: number;
  level: number;
  /** The pick needs at least this many units of each role, e.g. { Mercenary: 1 }. */
  minRoles?: Record<string, number>;
}

/** What's wrong with an Event deck pick so far, or null when it's ready. */
export function eventPickProblem(ed: EventDeck, pick: string[]): string | null {
  for (const [role, n] of Object.entries(ed.minRoles ?? {})) {
    const have = pick.filter((id) => UNIT_BY_ID[id]?.role === role).length;
    if (have < n) return `Pick at least ${n} ${role}${n > 1 ? "s" : ""}`;
  }
  return pick.length === ed.pick ? null : `Pick ${ed.pick} units`;
}

/** A first-clear reward: gold, gems, a chest, plus cards and a profile badge. */
export interface StoryReward extends Reward {
  cards: string[];
  badge: string | null;
}

export interface StoryChapter {
  id: string;
  title: string;
  /** Arena whose path and board the chapter uses (story arenas are image edits of these). */
  layout: string;
  /** Background art: locations/<art>.webp (and its ambient loop, if any). */
  art: string;
  /** 0-1: how strongly monsters are tinted violet by the corruption (drawn in code). */
  corruption: number;
  /** Tint over the arena art (a corrupted look), or null. */
  tint: string | null;
  /** Monster HP multiplier for the whole chapter (like a later arena's). */
  hpScale: number;
  waves: StoryWave[];
  /** Panels shown before the battle. */
  intro: StoryPanel[];
  reward: StoryReward;
  /** Paid for every win after the first. */
  replay: Reward;
  eventDeck: EventDeck | null;
  rules: DeckRules | null;
  /** v2.2: board mechanics (tide, pools, Faceless, cage). */
  mechanics?: ChapterMechanics;
  /** v2.2: an arena duel instead of a scripted battle; `waves` is then ignored (keep one boss wave for the validator). */
  duel?: StoryDuel;
}

/** v2.2: the first-clear reward multiplier for a chapter's objectives (1 = unchanged). */
export function objectiveMult(c: StoryChapter, o: StoryObjectives): number {
  let m = 1;
  const mech = c.mechanics;
  if (mech?.tidePools) m += o.poolsLeft * mech.tidePools.bonus;
  const f = mech?.faceless;
  if (f) m = Math.max(f.floor, m + Math.min(f.savedCap, o.civiliansSaved * f.savedBonus) - o.civiliansHit * f.hitCut);
  return m;
}

export interface StoryDef {
  id: string;
  title: string;
  /** One line under the cover. */
  blurb: string;
  /** story/covers/<cover>.webp */
  cover: string;
  /** Trophies needed to start it (the story before it must be finished too). */
  trophies: number;
  chapters: StoryChapter[];
  /** Panels after the final chapter is won. */
  ending: StoryPanel[];
  /** Replays of any chapter drop 1-3 copies of these cards (Princess Muse), up to `replayCardsPerDay` replays a day. */
  replayCards: string[];
}

export interface BookDef {
  title: string;
  stories: StoryDef[];
  /** Cover art path (optional). */
  cover?: string;
  /** Badge a player needs before the first story of this book opens (Book 2: "the_chosen"). */
  unlockBadge?: string;
  /** How many stories the book will have; the lobby shows "Coming soon" pages for the ones not out yet. */
  planned?: number;
}

// ---------------------------------------------------------------- helpers for the defaults

/** "gummy_bear 6, candy_corn_runner 3" → spawns. */
function spawns(list: string): StorySpawn[] {
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [id, n] = s.split(/\s+/);
      return { id, n: Number(n ?? 1) };
    });
}
const w = (list: string, opts: Partial<Omit<StoryWave, "spawns">> = {}): StoryWave => ({ spawns: spawns(list), hp: 1, ...opts });
const say = (who: string, text: string): StoryLine => ({ who, text });
const reward = (coins: number, gems: number, chest: string | null = null, cards: string[] = [], badge: string | null = null): StoryReward => ({ coins, gems, chest, cards, badge });
const replay = (coins: number): Reward => ({ coins, gems: 0, chest: null });
const panel = (image: string, ...lines: string[]): StoryPanel => ({ image, lines });

const KNIGHTS = ["pentagonal_knight", "rogue_knight", "aegis_knight", "lance_knight", "oath_knight", "lantern_knight", "berserker_sellsword", "powder_grenadier", "hired_blade"];
const THE_CHOSEN: DeckRules = { requiredUnits: ["pentagonal_knight", "rogue_knight"], bannedRarities: ["legendary", "mythic"], levelFloor: 6 };

const chapter = (c: Omit<StoryChapter, "eventDeck" | "rules" | "tint"> & Partial<Pick<StoryChapter, "eventDeck" | "rules" | "tint">>): StoryChapter => ({
  eventDeck: null,
  rules: null,
  tint: null,
  ...c,
});

// ---------------------------------------------------------------- Book 1: The Chosen

const SAVING_THE_MUSE: StoryDef = {
  id: "saving_the_muse",
  title: "Saving the Muse",
  blurb: "The Candy Kingdom is falling to chaos. Save its princess.",
  cover: "story1_saving_the_muse",
  trophies: 500,
  replayCards: ["princess_muse"],
  chapters: [
    chapter({
      id: "s1c1",
      title: "The Candy Gates",
      layout: "candy_land",
      art: "arena_candy_land",
      corruption: 0.45,
      hpScale: 1.4,
      intro: [
        panel("s1_p1_attack", "The Candy Kingdom is under attack.", "Its own people pour over the walls: violet-eyed, crackling with chaos."),
        panel("s1_p2_taken", "In the chaos, Princess Muse is dragged from her Sugar Saloon", "and carried off to the palace by the corrupted royal guard."),
      ],
      waves: [
        w("gummy_bear 8", { bark: say("candy_king", "They're coming through the gate! Hold them!") }),
        w("gummy_bear 7, candy_corn_runner 4"),
        w("gummy_bear 6, jelly_bean_blob 4, candy_corn_runner 3"),
        w("candy_corn_runner 8, cotton_candy_puff 5", { bark: say("candy_king", "Those puffs float! Keep your aim true.") }),
        w("gummy_bear 4, candy_corn_runner 2", { boss: "gummy_warlord", hp: 0.55, bark: say("candy_king", "The Gummy Warlord! He was our finest general…") }),
        w("gummy_bear 8, chocolate_golem 2, candy_corn_runner 5"),
        w("jelly_bean_blob 6, cotton_candy_puff 5, candy_corn_runner 6"),
        w("gummy_bear 8, licorice_medic 2, chocolate_golem 3", { bark: say("candy_king", "Medics! Bring the healers down first.") }),
        w("candy_corn_runner 10, candy_pinata 2, jelly_bean_blob 8"),
        w("gummy_bear 6, chocolate_golem 2, candy_corn_runner 4", { boss: "gummy_warlord", bark: say("candy_king", "He's back, and angrier. Break him and the gate is ours!") }),
      ],
      reward: reward(500, 0),
      replay: replay(150),
    }),
    chapter({
      id: "s1c2",
      title: "Sugar Streets",
      layout: "candy_land",
      art: "arena_candy_land",
      tint: "#c9a0ff",
      corruption: 0.6,
      hpScale: 1.5,
      intro: [panel("s1_p3_charge", "Through the gate and into the town.", "The sugar streets are already turning violet.")],
      waves: [
        w("gummy_bear 8, candy_corn_runner 4", { bark: say("candy_king", "The streets are worse. Stay together.") }),
        w("jelly_bean_blob 6, cotton_candy_puff 5"),
        w("peppermint_turtle 4, gummy_bear 8", { bark: say("candy_king", "Peppermint shells! Hit them hard.") }),
        w("candy_corn_runner 12, cotton_candy_puff 4"),
        w("gummy_bear 5, cotton_candy_puff 3", { boss: "licorice_witch", hp: 0.55, bark: say("candy_king", "The Licorice Witch! Don't let her whips catch you.") }),
        w("chocolate_golem 3, licorice_medic 2, gummy_bear 10"),
        w("jelly_bean_blob 8, candy_corn_runner 8, candy_pinata 2"),
        w("peppermint_turtle 5, licorice_medic 2, cotton_candy_puff 6"),
        w("gummy_bear 12, chocolate_golem 4, candy_corn_runner 6"),
        w("candy_corn_runner 6, peppermint_turtle 3", { boss: "gummy_warlord", hp: 0.7, bark: say("candy_king", "The Warlord again? Corruption won't let him fall.") }),
        w("cotton_candy_puff 10, jelly_bean_blob 8, licorice_medic 2"),
        w("chocolate_golem 5, peppermint_turtle 4, gummy_bear 10"),
        w("candy_corn_runner 14, candy_pinata 3, cotton_candy_puff 8", { bark: say("candy_king", "Almost through the market square!") }),
        w("jelly_bean_blob 10, chocolate_golem 4, licorice_medic 3, gummy_bear 10"),
        w("peppermint_turtle 4, licorice_medic 2, gummy_bear 6", { boss: "licorice_witch", bark: say("candy_king", "She blocks the palace road. Through her!") }),
      ],
      reward: reward(1000, 20),
      replay: replay(200),
    }),
    chapter({
      id: "s1c3",
      title: "The Muse's Palace",
      layout: "candy_land",
      art: "arena_candy_palace",
      corruption: 0.75,
      hpScale: 1.6,
      intro: [panel("s1_p4_palace", "The palace of the Candy Kingdom.", "Somewhere inside, Princess Muse is waiting.")],
      waves: [
        w("gummy_bear 10, candy_corn_runner 4", { bark: say("candy_king", "The palace guard. Once our bravest…") }),
        w("peppermint_turtle 4, jelly_bean_blob 6"),
        w("cotton_candy_puff 8, candy_corn_runner 8"),
        w("chocolate_golem 4, licorice_medic 2, gummy_bear 8"),
        w("gummy_bear 6, candy_corn_runner 4", { boss: "gummy_warlord", hp: 0.6 }),
        w("jelly_bean_blob 10, candy_pinata 2, cotton_candy_puff 6"),
        w("peppermint_turtle 6, chocolate_golem 3, gummy_bear 8", { bark: say("princess_muse", "Hello? Is someone out there? Please hurry!") }),
        w("candy_corn_runner 16, cotton_candy_puff 6"),
        w("licorice_medic 3, chocolate_golem 5, jelly_bean_blob 8"),
        w("cotton_candy_puff 6, peppermint_turtle 4", { boss: "licorice_witch", hp: 0.7 }),
        w("gummy_bear 14, chocolate_golem 4, licorice_medic 2"),
        w("candy_corn_runner 12, jelly_bean_blob 10, candy_pinata 3"),
        w("peppermint_turtle 6, cotton_candy_puff 10, licorice_medic 2", { bark: say("candy_king", "The throne room is close. Don't stop now!") }),
        w("chocolate_golem 6, gummy_bear 14, candy_corn_runner 6"),
        w("gummy_bear 6, chocolate_golem 3", { boss: "gummy_warlord", hp: 0.85 }),
        w("jelly_bean_blob 12, licorice_medic 3, peppermint_turtle 6"),
        w("candy_corn_runner 16, cotton_candy_puff 10, candy_pinata 3"),
        w("chocolate_golem 7, peppermint_turtle 6, licorice_medic 3", { bark: say("princess_muse", "The captain of the guard has the key. He's… not himself.") }),
        w("gummy_bear 16, jelly_bean_blob 10, candy_corn_runner 8, chocolate_golem 4"),
        w("peppermint_turtle 4, licorice_medic 3, gummy_bear 8", { boss: "sugar_plum_tyrant", bark: say("candy_king", "The Sugar Plum Tyrant. Free our princess!") }),
      ],
      reward: reward(0, 50, "royal", ["princess_muse"]),
      replay: replay(250),
    }),
  ],
  ending: [panel("s1_p5_freed", "Princess Muse is free!", "\"A round on the house, and the whole bar fights harder.\"", "She joins your army.")],
};

const CHAORRUPTION: StoryDef = {
  id: "chaorruption",
  title: "Chaorruption",
  blurb: "Find out who corrupted the kingdom. Your deck: 5 of 9 Knights and Mercenaries.",
  cover: "story2_chaorruption",
  trophies: 500,
  replayCards: [],
  chapters: [
    chapter({
      id: "s2c1",
      title: "The Violet Road",
      layout: "candy_land",
      art: "arena_corrupted_candy_kingdom",
      corruption: 0.85,
      hpScale: 1.7,
      eventDeck: { units: KNIGHTS, pick: 5, level: 6, minRoles: { Mercenary: 1 } },
      intro: [panel("s2_p1_road", "Muse is safe, but the corruption keeps spreading.", "The Knights of the Candy Crown ride out with a band of hired swords.")],
      waves: [
        w("gummy_bear 10, candy_corn_runner 4", { bark: say("pentagonal_knight", "Form up! Mercenaries on the edges.") }),
        w("sprinkle_swarm 6, jelly_bean_blob 4", { bark: say("rogue_knight", "Sprinkles. Great. They split, you know.") }),
        w("peppermint_turtle 4, gummy_bear 8, cotton_candy_puff 4"),
        w("sour_shard 4, candy_corn_runner 10"),
        w("gummy_bear 6, sprinkle_swarm 4", { boss: "licorice_witch", hp: 0.6, bark: say("pentagonal_knight", "The Witch survived? She's stronger now…") }),
        w("chocolate_golem 3, licorice_medic 2, sprinkle_swarm 8"),
        w("chaos_taffy 3, gummy_bear 10", { bark: say("rogue_knight", "Taffy's grabbing our people! Cut it loose!") }),
        w("sour_shard 6, cotton_candy_puff 8, candy_pinata 2"),
        w("jelly_bean_blob 10, sprinkle_swarm 8, chocolate_golem 3"),
        w("sprinkle_swarm 6, chaos_taffy 2, peppermint_turtle 4", { boss: "licorice_witch", bark: say("pentagonal_knight", "She won't stop us twice!") }),
      ],
      reward: reward(1000, 20),
      replay: replay(200),
    }),
    chapter({
      id: "s2c2",
      title: "Sour Marsh",
      layout: "candy_land",
      art: "arena_corrupted_candy_kingdom",
      tint: "#b8ffb0",
      corruption: 0.9,
      hpScale: 1.85,
      eventDeck: { units: KNIGHTS, pick: 5, level: 7, minRoles: { Mercenary: 1 } },
      intro: [panel("s2_p2_marsh", "The road sinks into the Sour Marsh.", "Something huge stirs under the sour green water.")],
      waves: [
        w("sprinkle_swarm 8, gummy_bear 6", { bark: say("pentagonal_knight", "Watch your footing. This marsh eats boots.") }),
        w("sour_shard 5, jelly_bean_blob 6"),
        w("chaos_taffy 3, candy_corn_runner 10"),
        w("peppermint_turtle 5, licorice_medic 2, sprinkle_swarm 6"),
        w("sour_shard 4, jelly_bean_blob 4", { boss: "sour_gummy_hydra", hp: 0.5, bark: say("rogue_knight", "Is that… a hydra? Made of gummies?!") }),
        w("chocolate_golem 4, chaos_taffy 3, gummy_bear 10"),
        w("sprinkle_swarm 12, cotton_candy_puff 8"),
        w("sour_shard 8, licorice_medic 3, candy_pinata 2"),
        w("jelly_bean_blob 12, chaos_taffy 3, peppermint_turtle 4", { bark: say("pentagonal_knight", "Keep the Aegis close to the sellswords!") }),
        w("sprinkle_swarm 8, sour_shard 4", { boss: "licorice_witch", hp: 0.75 }),
        w("chocolate_golem 6, sprinkle_swarm 10, licorice_medic 2"),
        w("sour_shard 8, chaos_taffy 4, candy_corn_runner 10"),
        w("peppermint_turtle 6, jelly_bean_blob 12, cotton_candy_puff 8", { bark: say("rogue_knight", "It's coming back up. Bigger.") }),
        w("sprinkle_swarm 14, chocolate_golem 5, chaos_taffy 4, licorice_medic 3"),
        w("sour_shard 6, chaos_taffy 3, jelly_bean_blob 6", { boss: "sour_gummy_hydra", bark: say("pentagonal_knight", "Every head we cut, two more grow. Hit it hard!") }),
      ],
      reward: reward(1500, 30),
      replay: replay(250),
    }),
    chapter({
      id: "s2c3",
      title: "The Jawbreaker's Core",
      layout: "candy_land",
      art: "arena_jawbreaker_core",
      corruption: 1,
      hpScale: 2,
      eventDeck: { units: KNIGHTS, pick: 5, level: 8, minRoles: { Mercenary: 1 } },
      intro: [panel("s2_p3_crater", "At the heart of the chaos: the Chaos Jawbreaker.", "Its core is cracking with violet light.")],
      waves: [
        w("sprinkle_swarm 10, sour_shard 4", { bark: say("pentagonal_knight", "There it is. The source of it all.") }),
        w("chaos_taffy 4, gummy_bear 10"),
        w("sour_shard 6, jelly_bean_blob 8"),
        w("chocolate_golem 4, licorice_medic 3, sprinkle_swarm 8"),
        w("sour_shard 4, sprinkle_swarm 6", { boss: "licorice_witch", hp: 0.7 }),
        w("peppermint_turtle 6, chaos_taffy 4, cotton_candy_puff 8"),
        w("sprinkle_swarm 14, candy_pinata 3", { bark: say("rogue_knight", "Feels like the ground is humming.") }),
        w("sour_shard 10, licorice_medic 3, chocolate_golem 4"),
        w("jelly_bean_blob 14, chaos_taffy 4, candy_corn_runner 10"),
        w("sprinkle_swarm 8, chaos_taffy 3", { boss: "sour_gummy_hydra", hp: 0.7 }),
        w("chocolate_golem 7, peppermint_turtle 6, licorice_medic 3"),
        w("sour_shard 10, sprinkle_swarm 14"),
        w("chaos_taffy 6, cotton_candy_puff 10, gummy_bear 12", { bark: say("pentagonal_knight", "Hold the line. It's waking up.") }),
        w("chocolate_golem 8, sour_shard 8, licorice_medic 3"),
        w("sprinkle_swarm 8, sour_shard 6", { boss: "licorice_witch", hp: 0.9 }),
        w("jelly_bean_blob 16, chaos_taffy 5, candy_pinata 3"),
        w("peppermint_turtle 8, sprinkle_swarm 16, licorice_medic 3"),
        w("sour_shard 12, chocolate_golem 6, chaos_taffy 5", { bark: say("rogue_knight", "If anyone's got a plan, now's the time.") }),
        w("sprinkle_swarm 18, jelly_bean_blob 12, sour_shard 8, licorice_medic 4"),
        w("sour_shard 6, chaos_taffy 4", { boss: "chaos_jawbreaker", bark: say("pentagonal_knight", "Break it, layer by layer!") }),
      ],
      reward: reward(0, 80, "mythic", ["pentagonal_knight", "rogue_knight"]),
      replay: replay(300),
    }),
  ],
  ending: [
    panel("s2_p4_victory", "The Chaos Jawbreaker shatters.", "Pentagonal Knight and Rogue Knight join your army."),
    panel("s2_p5_vision", "In the last crack of its core: a quiet human village, far away.", "This is where it began."),
  ],
};

const THE_BEGINNING: StoryDef = {
  id: "the_beginning",
  title: "The Beginning",
  blurb: "Follow the vision to the first corruption. Only the Chosen may lead.",
  cover: "story3_the_beginning",
  trophies: 500,
  replayCards: [],
  chapters: [
    chapter({
      id: "s3c1",
      title: "The Upside-Down Village",
      layout: "winter_village",
      art: "arena_upside_down_village",
      corruption: 0.3,
      hpScale: 1.9,
      rules: { ...THE_CHOSEN, levelFloor: 6 },
      intro: [panel("s3_p1_village", "The village hangs upside down. Houses dangle from the sky.", "Its people are violet-eyed and wrapped in tentacles.")],
      waves: [
        w("corrupted_villager 10", { bark: say("pentagonal_knight", "These were farmers. Fishermen. Families.") }),
        w("corrupted_villager 8, corrupted_courier 5"),
        w("corrupted_farmer 5, chaos_eye 4"),
        w("corrupted_fisherman 4, corrupted_villager 8", { bark: say("rogue_knight", "Barnacles. On a man. I hate this place.") }),
        w("corrupted_villager 6, chaos_eye 3", { boss: "corrupted_fae", hp: 0.55, bark: say("pentagonal_knight", "A fae, corrupted too. Don't let her charm you!") }),
        w("corrupted_lumberjack 3, corrupted_herbalist 2, corrupted_villager 8"),
        w("corrupted_courier 12, chaos_eye 6"),
        w("corrupted_fisherman 5, corrupted_merchant 2, corrupted_farmer 6"),
        w("corrupted_lumberjack 4, corrupted_herbalist 3, corrupted_courier 10"),
        w("chaos_eye 6, corrupted_fisherman 4", { boss: "corrupted_fae", bark: say("rogue_knight", "She's back. And she's angry.") }),
      ],
      reward: reward(1500, 30),
      replay: replay(250),
    }),
    chapter({
      id: "s3c2",
      title: "The Hollow Woods",
      layout: "mushroom_forest",
      art: "arena_guardian_grove",
      corruption: 0.35,
      hpScale: 2.05,
      rules: { ...THE_CHOSEN, levelFloor: 7 },
      intro: [panel("s3_p2_woods", "Beyond the village, the woods are hollow.", "Eyes open along the bark as the knights pass.")],
      waves: [
        w("corrupted_villager 10, chaos_eye 4", { bark: say("pentagonal_knight", "Quiet. Something big lives here.") }),
        w("corrupted_courier 10, corrupted_farmer 4"),
        w("corrupted_lumberjack 4, corrupted_villager 8"),
        w("chaos_eye 10, corrupted_herbalist 2"),
        w("corrupted_lumberjack 3, corrupted_courier 5", { boss: "corrupted_fae", hp: 0.65 }),
        w("corrupted_fisherman 6, corrupted_farmer 6"),
        w("corrupted_courier 14, corrupted_merchant 3", { bark: say("rogue_knight", "Did that tree just blink?") }),
        w("corrupted_lumberjack 5, corrupted_herbalist 3, chaos_eye 8"),
        w("corrupted_fisherman 6, corrupted_villager 14"),
        w("corrupted_lumberjack 4, chaos_eye 6", { boss: "corrupted_bear", hp: 0.6, bark: say("pentagonal_knight", "Bear! Eyes all along its back!") }),
        w("corrupted_farmer 10, corrupted_courier 12, corrupted_herbalist 2"),
        w("corrupted_lumberjack 7, corrupted_fisherman 5, corrupted_herbalist 3"),
        w("chaos_eye 14, corrupted_merchant 3, corrupted_villager 12", { bark: say("rogue_knight", "It's coming back. I can hear it.") }),
        w("corrupted_lumberjack 8, corrupted_fisherman 6, corrupted_farmer 8, corrupted_herbalist 3"),
        w("corrupted_fisherman 5, corrupted_herbalist 3, chaos_eye 6", { boss: "corrupted_bear", bark: say("pentagonal_knight", "When it roars, hold steady!") }),
      ],
      reward: reward(2000, 40),
      replay: replay(300),
    }),
    chapter({
      id: "s3c3",
      title: "The First Rift",
      layout: "mushroom_forest",
      art: "arena_first_rift",
      corruption: 0.4,
      hpScale: 2.2,
      rules: { ...THE_CHOSEN, levelFloor: 8 },
      intro: [panel("s3_p3_rift", "At the centre of the woods: a portal, torn open.", "The Portal Wizard waits.")],
      waves: [
        w("corrupted_villager 12, chaos_eye 4", { bark: say("pentagonal_knight", "The first rift. This is where it all began.") }),
        w("corrupted_courier 12, corrupted_farmer 4"),
        w("corrupted_fisherman 5, chaos_eye 6"),
        w("corrupted_lumberjack 4, corrupted_herbalist 3, corrupted_villager 8"),
        w("chaos_eye 6, corrupted_courier 6", { boss: "corrupted_fae", hp: 0.75 }),
        w("corrupted_farmer 8, corrupted_merchant 3, corrupted_courier 8"),
        w("corrupted_lumberjack 6, corrupted_fisherman 5"),
        w("chaos_eye 16, corrupted_herbalist 3", { bark: say("rogue_knight", "More eyes. Always more eyes.") }),
        w("corrupted_villager 16, corrupted_lumberjack 5, corrupted_herbalist 2"),
        w("corrupted_lumberjack 4, corrupted_fisherman 4", { boss: "corrupted_bear", hp: 0.75 }),
        w("corrupted_courier 16, corrupted_farmer 8, chaos_eye 6"),
        w("corrupted_fisherman 8, corrupted_lumberjack 6, corrupted_herbalist 3"),
        w("chaos_eye 12, corrupted_merchant 3, corrupted_villager 14", { bark: say("pentagonal_knight", "The portal is pulsing. He knows we're here.") }),
        w("corrupted_lumberjack 8, corrupted_fisherman 8, corrupted_herbalist 3"),
        w("chaos_eye 8, corrupted_courier 8", { boss: "corrupted_fae", hp: 0.95 }),
        w("corrupted_farmer 12, corrupted_courier 14, corrupted_merchant 3"),
        w("corrupted_lumberjack 9, chaos_eye 12, corrupted_herbalist 4"),
        w("corrupted_fisherman 10, corrupted_villager 16, corrupted_herbalist 3", { bark: say("rogue_knight", "Whatever happens in there… it was an honour. Mostly.") }),
        w("corrupted_lumberjack 10, corrupted_fisherman 8, chaos_eye 12, corrupted_courier 12"),
        w("corrupted_lumberjack 4, chaos_eye 6, corrupted_herbalist 3", { boss: "portal_wizard", bark: say("pentagonal_knight", "The Portal Wizard. End this!") }),
      ],
      reward: reward(0, 100, "mythic", [], "the_chosen"),
      replay: replay(350),
    }),
  ],
  ending: [
    panel("s3_p4_wizard_falls", "The wizard falls, but he laughs as he goes:", "\"You're too late. The Chaos Corruption has already begun.\""),
    panel("s3_p5_cliffhanger", "The portal closes on many more violet eyes.", "To be continued."),
  ],
};

export const DEFAULT_BOOK: BookDef = { title: "Book 1: The Chosen", stories: [SAVING_THE_MUSE, CHAORRUPTION, THE_BEGINNING] };

// ---------------------------------------------------------------- Book 2: Chaos Corrupted

const Q = "queen_aelyria";
const SC = "corrupted_elf_scout";
const WR = "corrupted_elf_warrior";
const AR = "corrupted_elf_archer";
const WD = "corrupted_elf_warden";

const THE_ELVEN_WILDS: StoryDef = {
  id: "b2s1",
  title: "The Elven Wilds",
  blurb: "The elven forest is falling to chaos. Guard the fleeing, free the guardian, face the Commander.",
  cover: "book2_story1_elven_wilds",
  trophies: 600,
  replayCards: [],
  chapters: [
    chapter({
      id: "b2s1c1",
      title: "The Fleeing Grove",
      layout: "mushroom_forest",
      art: "arena_elven_deepwood",
      corruption: 0,
      hpScale: 3.65,
      intro: [
        panel("b2s1_p1_restored", "The village is whole again, bright and singing.", "Villagers cheer and thank the Keeper."),
        panel("b2s1_p2_farewell", "Knights and mercenaries ride off down separate roads.", "The sun sets. The Keeper walks on."),
        panel("b2s1_p3_runner", "A villager runs in, gasping for breath.", "The elven forest is being corrupted! A rogue elf rules it!"),
        panel("b2s1_p4_fleeing", "Elves, gnomes, fae and beasts flee through the deep forest.", "Behind them, a corrupted army marches."),
        panel("b2s1_p5_queen_pleads", "Queen Aelyria begs: Keeper, please, help us!", "Vaeltharion's army hunts my people through these woods."),
      ],
      waves: [
        w(`${SC} 6, ${WR} 2`, { bark: say(Q, "They are on our heels, Keeper! Hold the path!") }),
        w(`${SC} 8, ${WR} 3`, { bark: say(Q, "Their elves are fast. Watch the flanks!") }),
        w(`${WR} 5, ${AR} 3`, { bark: say(Q, "Even the gentle fae are weeping. Protect them!") }),
        w(`${SC} 6, ${AR} 4, ${WR} 3`, { bark: say(Q, "Corrupted archers in the branches! Stay sharp!") }),
        w(`${WD} 2, ${WR} 5, ${SC} 6`, { bark: say(Q, "Keep fighting! The little ones are almost clear.") }),
        w(`${AR} 5, ${WR} 5, ${SC} 8`, { bark: say(Q, "Their eyes burn violet. They no longer know us.") }),
        w(`${WD} 3, ${AR} 4, ${WR} 6`, { bark: say(Q, "Hold on, my people! The Keeper stands with us.") }),
        w(`${SC} 12, ${WR} 6, ${AR} 4`, { bark: say(Q, "More are coming. Do not let them near the fleeing!") }),
        w(`${WD} 4, ${AR} 5, ${SC} 10, ${WR} 6`, { bark: say(Q, "Their captain draws close. I feel the dark gather.") }),
        w(`${WR} 4, ${AR} 3, ${WD} 2`, { boss: "elf_captain_morvane", bark: say("morvane", "Give up the Queen. The Commander demands it.") }),
      ],
      reward: reward(2000, 40),
      replay: replay(350),
    }),
    chapter({
      id: "b2s1c2",
      title: "Thalmyr, the Torn Guardian",
      layout: "mushroom_forest",
      art: "arena_guardian_grove",
      corruption: 0.15,
      hpScale: 9,
      intro: [
        panel("b2s1_p6_the_commander", "Vaeltharion, our Commander, fell to chaos without warning.", "He rules the rocky peak. Thalmyr is missing."),
        panel("b2s1_p7_guardian", "Thalmyr looms, half radiant, half corrupted, roaring in pain.", "He fights the chaos inside him. Beware, Keeper!"),
      ],
      waves: [w("", { boss: "thalmyr", bark: say("thalmyr_half", "Run, little one... the chaos... it is inside me!") })],
      reward: reward(2500, 50),
      replay: replay(400),
    }),
    chapter({
      id: "b2s1c3",
      title: "Summit of Vaeltharion",
      layout: "tundra",
      art: "arena_rocky_summit",
      corruption: 0.3,
      hpScale: 1.46,
      intro: [
        panel("b2s1_p8_guardian_falls", "Thalmyr kneels, wounded but alive. His voice is soft.", "Find the Forest Orb, or the whole forest falls."),
        panel("b2s1_p9_summit", "At the summit wait a hundred corrupted elves.", "Three captains stand before them, blades and bows ready."),
        panel("b2s1_p10_orb", "Vaeltharion lifts the Forest Orb, half green, half violet.", "Do not force it, Keeper. You cannot win."),
      ],
      waves: [
        w(`${SC} 8, ${WR} 4`, { bark: say("vaeltharion", "Turn back. These peaks belong to the Elven race.") }),
        w(`${WR} 6, ${AR} 4, ${SC} 6`, { bark: say(Q, "So many of my own kin. Stay strong, Keeper.") }),
        w(`${WD} 3, ${WR} 6, ${AR} 4`, { bark: say(Q, "The rocks give no cover. Guard every tower!") }),
        w(`${SC} 14, ${AR} 6`, { bark: say("vaeltharion", "Fall back to your forest, little hero.") }),
        w(`${WD} 4, ${WR} 8, ${AR} 5`, { bark: say(Q, "The air is thick with violet haze. Do not breathe deep.") }),
        w(`${WR} 4, ${AR} 3`, { boss: "elf_captain_morvane", hp: 1.3, bark: say("morvane", "I return, stronger than before! Kneel!") }),
        w(`${SC} 12, ${WR} 8, ${WD} 3`, { bark: say(Q, "Morvane is beaten once more. Keep the pressure on!") }),
        w(`${AR} 8, ${WR} 8, ${WD} 4`, { bark: say(Q, "The ranks thin, but the summit is still far.") }),
        w(`${SC} 16, ${WR} 8, ${AR} 6`, { bark: say("vaeltharion", "Every elf you strike is a brother lost.") }),
        w(`${WD} 6, ${WR} 10, ${AR} 6`, { bark: say(Q, "Do not listen to him! That is the chaos talking.") }),
        w(`${AR} 10, ${SC} 12, ${WD} 4`, { bark: say(Q, "I hear bowstrings. Sylris is near.") }),
        w(`${AR} 5, ${WR} 4, ${WD} 2`, { boss: "elf_captain_sylris", bark: say("sylris", "You cannot hit what you cannot see.") }),
        w(`${WR} 12, ${WD} 6, ${SC} 10`, { bark: say(Q, "Sylris falls silent. Two captains are done.") }),
        w(`${AR} 10, ${WR} 10, ${WD} 6`, { bark: say("vaeltharion", "I was once a hero like you, Keeper.") }),
        w(`${SC} 20, ${WD} 6, ${WR} 8`, { bark: say(Q, "Hold the line! The Commander watches from above.") }),
        w(`${WD} 8, ${AR} 10, ${WR} 10`, { bark: say(Q, "Kaelen's blades are sharp. Prepare for a hard fight.") }),
        w(`${SC} 16, ${WR} 12, ${AR} 8`, { bark: say("vaeltharion", "Look how the world forgets us. I will not.") }),
        w(`${WR} 6, ${AR} 4, ${WD} 3`, { boss: "elf_captain_kaelen", hp: 0.45, bark: say("kaelen", "Steel against steel. Come, test my guard!") }),
        w(`${WD} 8, ${WR} 12, ${AR} 10, ${SC} 10`, { bark: say(Q, "The last captain is down. Only Vaeltharion remains.") }),
        w("", {
          boss: "vaeltharion",
          bark: say("vaeltharion", "I am the Commander. The Elven race will be seen!"),
          rally: {
            before: [panel("b2s1_p11_charge", "The Queen's staff blazes. The whole forest answers.", "Nature's Attendants, Charge!")],
            allies: ["ally_elf_spearman", "ally_gnome", "ally_fae", "ally_earth_elemental", "ally_forest_beast"],
            after: [panel("b2s1_p12_mad", "Vaeltharion screams, violet fire cracking through his armor.", "No! I will NOT be forgotten!")],
          },
        }),
      ],
      reward: reward(0, 120, "mythic", [], "wilds_warden"),
      replay: replay(450),
    }),
  ],
  ending: [
    panel("b2s1_p13_broken", "Vaeltharion kneels, armor shattered. It is over; he accepts defeat.", "Queen Aelyria: Old friend, this was never truly you."),
    { ...panel("b2s1_p14_cleansed", "Thalmyr bends and swallows the Forest Orb whole.", "Green light washes the chaos away. The guardian is healed."), anim: "thalmyr_cleansed_idle" },
    panel("b2s1_p15_dust", "Vaeltharion fades into golden dust, calm and sad.", "I only wished the Elven race to be acknowledged."),
    panel("b2s1_p16_beyond", "Thank you, Keeper. More lands are Chaos Corrupted.", "To be continued."),
  ],
};

// ---------------------------------------------------------------- Book 2 · Story 2: The Drowned Coast (v2.2)

const CR = "reef_crab";
const DS = "drowned_sailor";
const CO = "drowned_corsair";
const EE = "eel_swimmer";
const BS = "barnacle_spawn";
/** Chapter 1's tide pools sit at these shares of the path; chapter 3 has none. */
const POOLS = { at: [0.4, 0.6, 0.75, 0.9], bonus: 0.1, sips: 8 };

const THE_DROWNED_COAST: StoryDef = {
  id: "b2s2",
  title: "The Drowned Coast",
  blurb: "The sea has stopped moving. Ride the tide, wake the sleeping isle, and reach the lantern at the world's edge.",
  cover: "book2_story2_drowned_coast",
  trophies: 0,
  replayCards: ["maren"],
  chapters: [
    chapter({
      id: "b2s2c1",
      title: "The Stranded Harbor",
      layout: "pirate_beach",
      art: "arena_stranded_harbor",
      corruption: 0.2,
      hpScale: 3.7,
      mechanics: { tide: { cycle: 40, flood: 2, lowSpeed: 0.8, highSpeed: 1.2 }, tidePools: POOLS },
      intro: [
        panel("b2s2_p1_shard", "Green light washes the Orb clean. One violet shard escapes.", "It streaks west, toward the sea."),
        panel("b2s2_p2_queen_sends", "Queen Aelyria: Follow it, Keeper. The western sea has gone still.", "No wave has broken there in a year."),
        panel("b2s2_p3_drained_bay", "The bay is bare mud. Ships lie beached on the flats.", "Merfolk gasp in shrinking pools."),
        panel("b2s2_p4_pearl", "A young merfolk scout hauls herself onto the rocks.", "Pearl: Help us. The lantern holds the tide still."),
      ],
      waves: [
        w(`${DS} 8, ${CR} 2`, { bark: say("pearl", "The tide swings. The glowing slots flood when it comes in!") }),
        w(`${DS} 8, ${EE} 4`, { bark: say("pearl", "Eels in the shallows. Fast and slippery.") }),
        w(`${CR} 4, ${DS} 6`, { bark: say("saltmere_villager", "The crabs are the size of cartwheels!") }),
        w(`${EE} 8, ${CO} 2`, { bark: say("pearl", "Don't let them drain the pools. We need them.") }),
        w(`${CO} 3, ${DS} 8, ${BS} 4`, { bark: say("pearl", "Barnacles on their backs. The violet is spreading.") }),
        w(`${CR} 5, ${EE} 6`, { bark: say("saltmere_villager", "Hold the line! Saltmere is right behind you!") }),
        w(`${CO} 4, ${CR} 3, ${DS} 8`, { bark: say("pearl", "The tide is rising. Mind the marked slots.") }),
        w(`${EE} 10, ${BS} 6, ${DS} 6`, { bark: say("pearl", "So many. Where is the sea in all of this?") }),
        w(`${CR} 6, ${CO} 5, ${DS} 8`, { bark: say("saltmere_villager", "A bosun's whistle! Someone is giving orders.") }),
        w(`${DS} 4, ${CO} 3`, { boss: "grell", bark: say("grell", "No one leaves Saltmere, Keeper. The tide says so.") }),
      ],
      reward: reward(2200, 45),
      replay: replay(400),
    }),
    chapter({
      id: "b2s2c2",
      title: "Ondrath, the Sleeping Isle",
      layout: "coral_reef",
      art: "arena_ondrath_isle",
      corruption: 0.3,
      hpScale: 10,
      mechanics: { shell: { at: [0.45, 0.5, 0.55, 0.42, 0.5], stages: [2, 2, 1], hp: [6, 8, 14], brood: 6, cap: 3, mana: 4 } },
      intro: [
        panel("b2s2_p5_ondrath_found", "Ondrath, an island on a turtle's back, lies in the drained bay.", "The Tide Orb was torn from his shell. Violet barnacles cover him."),
        panel("b2s2_p6_isle_rolls", "He rolls in pain, and the whole island shifts.", "Break the barnacles, Keeper. Free him, don't fight him!"),
      ],
      waves: [w("", { boss: "ondrath", bark: say("ondrath_corrupted", "The tide... stopped. I cannot... breathe.") })],
      reward: reward(2700, 55),
      replay: replay(450),
    }),
    chapter({
      id: "b2s2c3",
      title: "The Lantern at World's Edge",
      layout: "pirate_beach",
      art: "arena_lantern_causeway",
      corruption: 0.4,
      hpScale: 1.3,
      mechanics: { tide: { cycle: 30, flood: 4, lowSpeed: 0.8, highSpeed: 1.2 } },
      intro: [
        panel("b2s2_p7_ondrath_cleansed", "The barnacles crack. Ondrath breathes, but the Orb is gone.", "Ondrath: She did not steal it from greed. She stole it from grief."),
        panel("b2s2_p8_causeway", "A causeway runs to the lighthouse at the world's edge.", "Its beam sweeps the sea, and what it touches turns violet."),
        panel("b2s2_p9_corvaline", "Corvaline has kept this light for forty years.", "Hold the tide, and the sea takes no one ever again."),
      ],
      waves: [
        w(`${DS} 10, ${CR} 3`, { bark: say("corvaline", "Go home, Keeper. The sea is better still.") }),
        w(`${EE} 10, ${CO} 3, ${DS} 6`, { bark: say("pearl", "The tide is quicker here. Watch the water.") }),
        w(`${CR} 5, ${CO} 4, ${BS} 6`),
        w(`${DS} 12, ${EE} 8`, { bark: say("corvaline", "Forty years I have kept watch. Forty years!") }),
        w(`${CO} 5, ${CR} 4, ${DS} 8`, { bark: say("pearl", "Every wave she holds back is one I miss.") }),
        w(`${DS} 4, ${CO} 3`, { boss: "grell", hp: 0.8, bark: say("grell", "Back again, Keeper? The anchor remembers you.") }),
        w(`${EE} 12, ${CR} 5, ${BS} 6`),
        w(`${CO} 6, ${DS} 12, ${CR} 4`, { bark: say("saltmere_villager", "Is that singing? It sounds so sweet...") }),
        w(`${EE} 14, ${CO} 5, ${BS} 8`),
        w(`${CR} 7, ${CO} 6, ${DS} 10`, { bark: say("pearl", "Cover your ears? The song gets in anyway.") }),
        w(`${DS} 14, ${EE} 10, ${BS} 8`),
        w(`${EE} 6, ${DS} 4`, { boss: "lusca", hp: 0.8, bark: say("lusca", "Sleep, little Keeper. The tide will rock you.") }),
        w(`${CR} 8, ${CO} 7, ${DS} 10`, { bark: say("pearl", "Tap your sleepers awake! Quickly!") }),
        w(`${EE} 16, ${CO} 6, ${BS} 8`),
        w(`${DS} 16, ${CR} 6, ${CO} 6`, { bark: say("corvaline", "The sea will never take another soul.") }),
        w(`${CO} 7, ${CR} 5, ${BS} 10`),
        w(`${EE} 18, ${DS} 12, ${CO} 6`, { bark: say("pearl", "The lantern is close. I can feel it in my bones.") }),
        w(`${CR} 6, ${CO} 7, ${DS} 14`),
        w(`${DS} 14, ${EE} 12, ${BS} 10, ${CO} 6`, { bark: say("corvaline", "You cannot know what the sea took from me.") }),
        w("", {
          boss: "corvaline",
          bark: say("corvaline", "Hold, tide. Hold, and let no one drown."),
          rally: {
            before: [panel("b2s2_p10_tide_returns", "Ondrath rises from the bay, shaking off the last barnacles.", "Pearl: The sea is coming home. Merfolk, with me!")],
            allies: ["ally_merfolk_warrior", "ally_merfolk_spear", "ally_tide_spirit", "ally_ondrath"],
            after: [panel("b2s2_p11_lantern_flares", "The lantern flares. Corvaline screams over the roar of the sea.", "The tide will not hold!")],
          },
          reveal: {
            at: 0.5,
            panels: [
              panel("b2s2_p12_mother", "Pearl pulls back her hood. She has the keeper's eyes.", "Pearl: Mother! It's me. It's Maren!"),
              panel("b2s2_p13_falter", "The beam stutters. Corvaline's hands shake on the lamp.", "Corvaline: Maren? The sea took you..."),
            ],
            stun: 5,
          },
        }),
      ],
      reward: reward(0, 130, "mythic", ["maren"], "tidewarden"),
      replay: replay(500),
    }),
  ],
  ending: [
    panel("b2s2_p14_cracks", "The lantern cracks. Corvaline kneels on the wet stone.", "The violet light goes out."),
    panel("b2s2_p15_reunion", "Maren takes her mother's hand.", "\"The sea didn't take me, Mother. It kept me.\""),
    panel("b2s2_p16_orb_returns", "\"I held the whole ocean still... and you were in it all along.\"", "The Orb sinks back into Ondrath. Corvaline relights the lamp with plain fire."),
    panel("b2s2_p17_shards", "Far off, two violet shards meet in the dark. A gloved hand closes over them.", "Two hearts taken. Three remain. To be continued."),
  ],
};

// ---------------------------------------------------------------- Book 2 · Story 3: The Throne of Dust (v2.2)

const FS = "faceless_soldier";
const FA = "faceless_archer";
const FC = "faceless_civilian";
const SB = "scarab";
const JK = "jackal";
/** The three brazier slots (and the faceless rules) of the Glass Road and the Throne. */
const FACELESS = { braziers: [4, 10, 14], savedBonus: 0.03, savedCap: 0.3, hitCut: 0.015, floor: 0.6 };

const THE_THRONE_OF_DUST: StoryDef = {
  id: "b2s3",
  title: "The Throne of Dust",
  blurb: "A city of identical Faceless. Light the braziers, win the arena, and unchain a queen instead of killing her.",
  cover: "book2_story3_throne_of_dust",
  trophies: 0,
  replayCards: ["bako"],
  chapters: [
    chapter({
      id: "b2s3c1",
      title: "The Glass Road",
      layout: "desert",
      art: "arena_glass_road",
      corruption: 0.3,
      hpScale: 4.4,
      mechanics: { faceless: FACELESS },
      intro: [
        panel("b2s3_p1_shard_south", "The second shard flies south over the sea.", "At noon, the desert sky turns violet."),
        panel("b2s3_p2_caravan", "Caravans walk out of the dunes in step.", "Their faces are as smooth as sandstone."),
        panel("b2s3_p3_bako", "Bako, a gladiator with a broken chain on his wrist, begs for help.", "\"Somewhere in that line is my sister.\""),
      ],
      waves: [
        w(`${FS} 5, ${FC} 2`, { bark: say("bako", "They wear masks. Stand on a brazier to light it!") }),
        w(`${FS} 4, ${FA} 2, ${FC} 3`, { bark: say("bako", "Unmasked civilians walk free. Don't hit them!") }),
        w(`${JK} 6, ${FS} 4, ${FC} 3`, { bark: say("bako", "Splash hurts them too. Careful where you aim.") }),
        w(`${FA} 5, ${FS} 4, ${FC} 3`),
        w(`${SB} 4, ${FS} 5, ${FC} 3`, { bark: say("bako", "Scarabs. The desert fights for her too.") }),
        w(`${FS} 6, ${FA} 3, ${FC} 4`, { bark: say("bako", "Same height. Same face. How do they stand it?") }),
        w(`${JK} 8, ${FA} 4, ${FC} 4`),
        w(`${SB} 5, ${FS} 6, ${FA} 3, ${FC} 5`, { bark: say("bako", "Every one of them is somebody's brother.") }),
        w(`${FS} 7, ${FA} 4, ${FC} 5`, { bark: say("bako", "A herald walks ahead. He copies what he sees.") }),
        w(`${FS} 4, ${FA} 3, ${FC} 3`, { boss: "faceless_herald", bark: say("faceless_herald", "Kneel, as all kneel. Be equal.") }),
      ],
      reward: reward(2400, 50),
      replay: replay(450),
    }),
    chapter({
      id: "b2s3c2",
      title: "The Games of Sunspire",
      layout: "desert",
      art: "arena_sunspire",
      corruption: 0.2,
      hpScale: 1,
      intro: [
        panel("b2s3_p4_captured", "Sefa's guards drag Bako before the throne of Sunspire.", "Sefa: Fight the Keeper, old friend. Let the crowd see."),
        panel("b2s3_p5_arena", "The arena roars. Bako steps onto the sand.", "Bako: Nothing personal, Keeper. Make it a good show."),
      ],
      // The duel replaces the waves; one boss wave stays so the chapter validates.
      waves: [w("", { boss: "faceless_herald" })],
      duel: {
        arena: "desert",
        rival: "bako",
        rivalName: "Bako",
        deck: ["minotaur_gladiator", "shield_knight", "sand_monk", "fox_samurai", "lion_paladin"],
        level: 8,
        rounds: 2,
        skill: [0.45, 0.6, 0.75],
        barks: [
          say("bako", "Round one. Don't hold back, Keeper."),
          say("bako", "Not bad. The crowd loves you already."),
          say("bako", "Round three... forgive me. This one is for her."),
        ],
      },
      reward: reward(2900, 60),
      replay: replay(500),
    }),
    chapter({
      id: "b2s3c3",
      title: "The Throne of Dust",
      layout: "desert",
      art: "arena_throne_end",
      corruption: 0.5,
      hpScale: 3.4,
      mechanics: { faceless: FACELESS, cage: { slot: 0, lockHp: 2500, roarStun: 3 } },
      intro: [
        panel("b2s3_p6_throw", "In the last round, Bako lowers his guard and takes the blow.", "Sefa: Bury him in the sand."),
        panel("b2s3_p7_cage", "From her cage above the arena, Nefrael calls out.", "\"Free me, and I will free him.\""),
        panel("b2s3_p8_throne", "The Faceless flood the arena. Sefa waits on her throne.", "Violet chains of light bind her to it."),
      ],
      waves: [
        w(`${FS} 8, ${FC} 3`, { bark: say("nefrael", "Riddle me this: who has no face, yet fills the city?") }),
        w(`${JK} 8, ${FA} 4, ${FC} 4`, { bark: say("nefrael", "Strike my lock between waves, Keeper. I am patient.") }),
        w(`${SB} 5, ${FS} 6, ${FC} 4`),
        w(`${FA} 6, ${FS} 6, ${FC} 5`, { bark: say("nefrael", "Look closer. Some of them are still weeping.") }),
        w(`${FS} 5, ${FC} 3`, { boss: "faceless_herald", hp: 0.8, bark: say("faceless_herald", "I am you. I am everyone. Kneel.") }),
        w(`${JK} 10, ${FS} 6, ${FC} 5`),
        w(`${SB} 6, ${FA} 6, ${FS} 6, ${FC} 6`, { bark: say("bako", "Free the sphinx! She can stop them all.") }),
        w(`${FS} 9, ${FA} 5, ${FC} 6`),
        w(`${JK} 12, ${SB} 6, ${FC} 6`, { bark: say("nefrael", "Something is waking under the sand.") }),
        w(`${SB} 4, ${FS} 5, ${FC} 3`, { boss: "dune_warden", hp: 0.8, bark: say("dune_warden", "The sand takes all. The sand keeps all.") }),
        w(`${FS} 10, ${FA} 6, ${FC} 7`, { bark: say("nefrael", "Two captains gone. Only the throne remains.") }),
        w(`${JK} 12, ${SB} 8, ${FC} 7`),
        w(`${FA} 8, ${FS} 10, ${FC} 8`, { bark: say("bako", "Sefa was never cruel. She wanted us free.") }),
        w(`${SB} 8, ${FS} 10, ${FA} 6, ${FC} 8`),
        w(`${JK} 14, ${FS} 10, ${FC} 8`, { bark: say("nefrael", "Do not kill her, Keeper. Break her chains.") }),
        w("", {
          boss: "sefa",
          bark: say("sefa", "All are equal before justice. All. Kneel."),
          rally: {
            before: [panel("b2s3_p9_cage_breaks", "Nefrael bursts from her cage and roars across the sands.", "The freed slaves tear off their masks. Charge!")],
            allies: ["ally_gladiator", "ally_spearwoman", "ally_slinger", "ally_nefrael"],
            after: [panel("b2s3_p10_chains_tighten", "Sefa clutches at her chains. They glow brighter.", "Sefa: I made them equal! I set them free!")],
          },
        }),
      ],
      reward: reward(0, 140, "mythic", ["bako"], "dunewarden"),
      replay: replay(550),
    }),
  ],
  ending: [
    panel("b2s3_p11_last_chain", "The last chain breaks. Sefa sees the Faceless kneeling all around.", "Bako, dug from the sand: \"Look who is kneeling.\""),
    panel("b2s3_p12_a_name", "Nefrael asks her true riddle: \"What makes all equal, yet no two the same?\"", "Bako: \"A name.\" Faces return, each one different."),
    panel("b2s3_p13_statue", "The cracked city needs holding. Sefa becomes a sandstone statue at the gate.", "\"The voice said all are equal before justice. It never said whose.\""),
    panel("b2s3_p14_third_shard", "The third shard streaks north toward the mountains. The ground begins to shake.", "Three hearts taken. Two remain. To be continued."),
  ],
};

/** Book 2: its stories can be edited by the admin. */
export const DEFAULT_BOOK2: BookDef = { title: "Book 2: Chaos Corrupted", stories: [THE_ELVEN_WILDS, THE_DROWNED_COAST, THE_THRONE_OF_DUST], unlockBadge: "the_chosen", planned: 5 };

/** The saga title shown above the books. */
export const SAGA = "The Forsakens";

/** Live tables: replaced in place when a config is applied (see config.ts). */
export const BOOK: BookDef = structuredClone(DEFAULT_BOOK);
/** Every book, in order. BOOKS[0] is BOOK (same object). */
export const BOOKS: BookDef[] = [BOOK, structuredClone(DEFAULT_BOOK2)];

/** Replace the live books in place (BOOK stays BOOKS[0]). */
export function setBooks(books: BookDef[]) {
  const list = books.length ? books : [DEFAULT_BOOK];
  list.forEach((b, i) => {
    const t = i === 0 ? BOOK : (BOOKS[i] ??= { title: "", stories: [] });
    for (const k of Object.keys(t)) delete (t as unknown as Record<string, unknown>)[k];
    Object.assign(t, structuredClone(b));
    // Configs saved before `planned` existed keep the default's count.
    t.planned ??= [DEFAULT_BOOK, DEFAULT_BOOK2][i]?.planned;
  });
  BOOKS.length = list.length;
}

/** How many story pages a book shows: its stories, plus "Coming soon" ones up to its planned count. */
export const bookSlots = (b: BookDef) => Math.max(b.stories.length, b.planned ?? 0);

/** The saved books of a config: `books`, or a legacy single `book` followed by the Book 2 placeholder. */
export function booksOf(c: { books?: BookDef[]; book?: BookDef }): BookDef[] {
  return withAddedStories(c.books?.length ? c.books : [c.book ?? DEFAULT_BOOK, DEFAULT_BOOK2]);
}

/**
 * Stories added to the defaults after configs were saved (like ADDED_MONSTERS): appended by id to the
 * saved book that holds the story's neighbours (its default book's index), unless a saved book already has it.
 */
export const ADDED_STORIES = ["b2s2", "b2s3"];
function withAddedStories(books: BookDef[]): BookDef[] {
  const have = new Set(books.flatMap((b) => b.stories.map((s) => s.id)));
  let out = books;
  [DEFAULT_BOOK, DEFAULT_BOOK2].forEach((d, i) => {
    const missing = d.stories.filter((s) => ADDED_STORIES.includes(s.id) && !have.has(s.id));
    if (!missing.length || !out[i]) return;
    if (out === books) out = [...books];
    out[i] = { ...out[i], stories: [...out[i].stories, ...structuredClone(missing)] };
  });
  return out;
}

/** Replays of a chapter that may drop Event cards, per player per UTC day. */
export const REPLAY_CARDS_PER_DAY = 3;

/** Profile badges, by id. */
export const BADGES: Record<string, { label: string; text: string }> = {
  the_chosen: { label: "The Chosen", text: "Finished Book 1" },
  wilds_warden: { label: "Wilds Warden", text: "Finished Book 2 · Story 1" },
  tidewarden: { label: "Tidewarden", text: "Finished Book 2 · Story 2" },
  dunewarden: { label: "Dunewarden", text: "Finished Book 2 · Story 3" },
};

// ---------------------------------------------------------------- progress

/** A player's story progress (profile.story). */
export interface StoryProgress {
  /** Best stars and first-clear time per chapter id. */
  chapters: Record<string, { stars: number; clearedAt: number }>;
  /** Stories whose first chapter has been started (for the lobby's NEW dot). */
  started: string[];
  /** Profile badges earned. */
  badges: string[];
  /** Replays that dropped Event cards today: UTC day and count. */
  replays: { day: string; n: number };
}

export const newStoryProgress = (): StoryProgress => ({ chapters: {}, started: [], badges: [], replays: { day: "", n: 0 } });

/** The story whose chapter rewards unlock this card (Princess Muse, the reward Knights), if any. */
export function storyUnlocking(unitId: string, book?: BookDef): { story: StoryDef; number: number } | null {
  for (const b of book ? [book] : BOOKS) {
    const i = b.stories.findIndex((s) => s.chapters.some((c) => c.reward.cards.includes(unitId)));
    if (i >= 0) return { story: b.stories[i], number: i + 1 };
  }
  return null;
}

export function findChapter(id: string): { story: StoryDef; chapter: StoryChapter; index: number } | null {
  for (const book of BOOKS) {
    for (const story of book.stories) {
      const index = story.chapters.findIndex((c) => c.id === id);
      if (index >= 0) return { story, chapter: story.chapters[index], index };
    }
  }
  return null;
}

export const storyById = (id: string) => {
  for (const book of BOOKS) {
    const s = book.stories.find((x) => x.id === id);
    if (s) return s;
  }
  return undefined;
};

/** The book (and its index) that holds a story. */
export function bookOfStory(s: StoryDef): { book: BookDef; index: number } | null {
  const index = BOOKS.findIndex((b) => b.stories.includes(s));
  return index >= 0 ? { book: BOOKS[index], index } : null;
}

/** Why a book can't be opened yet ("Finish Book 1 to unlock"), or null. */
export function bookLock(p: StoryProgress, bookIndex: number): string | null {
  const b = BOOKS[bookIndex];
  if (b?.unlockBadge && !p.badges.includes(b.unlockBadge)) return `Finish Book ${bookIndex} to unlock`;
  return null;
}

export const chapterWon = (p: StoryProgress, id: string) => !!p.chapters[id];
export const storyFinished = (p: StoryProgress, s: StoryDef) => s.chapters.length > 0 && chapterWon(p, s.chapters[s.chapters.length - 1].id);

/** Why a story can't be played yet, or null if it can. */
export function storyLock(p: StoryProgress, trophies: number, s: StoryDef): string | null {
  const where = bookOfStory(s);
  const i = where ? where.book.stories.indexOf(s) : 0;
  const prev = where?.book.stories[i - 1];
  if (where && i === 0) {
    const lock = bookLock(p, where.index);
    if (lock) return lock;
  }
  if (prev && !storyFinished(p, prev)) return `Finish ${prev.title} first`;
  if (trophies < s.trophies) return `Unlocks at ${s.trophies} trophies`;
  return null;
}

/** Why a chapter can't be played yet, or null if it can. */
export function chapterLock(p: StoryProgress, trophies: number, id: string): string | null {
  const f = findChapter(id);
  if (!f) return "Unknown chapter";
  const lock = storyLock(p, trophies, f.story);
  if (lock) return lock;
  const prev = f.story.chapters[f.index - 1];
  if (prev && !chapterWon(p, prev.id)) return `Win ${prev.title} first`;
  return null;
}

/** Stars for a win: 3 with no leaks, 2 with one life lost, 1 otherwise. */
export const starsFor = (livesLeft: number, lives: number) => (livesLeft >= lives ? 3 : livesLeft >= lives - 1 ? 2 : 1);

// ---------------------------------------------------------------- decks

export interface DeckCheck {
  ok: boolean;
  text: string;
}

/** The deck-rule checklist for a chapter (Story 3); every line must pass before Play. */
export function deckChecks(deck: string[], rules: DeckRules): DeckCheck[] {
  const checks: DeckCheck[] = rules.requiredUnits.map((id) => ({ ok: deck.includes(id), text: `${UNIT_BY_ID[id]?.name ?? id} equipped` }));
  if (rules.bannedRarities.length) {
    const banned = deck.filter((id) => rules.bannedRarities.includes(UNIT_BY_ID[id]?.rarity));
    const names = rules.bannedRarities.map((r) => r[0].toUpperCase() + r.slice(1)).join(" or ");
    checks.push({ ok: !banned.length, text: `No ${names}${banned.length ? ` (${banned.map((id) => UNIT_BY_ID[id]?.name ?? id).join(", ")})` : ""}` });
  }
  return checks;
}

/**
 * The deck and card levels a chapter is played with. Event deck chapters take the player's
 * pick of the story units at the story level; others take the equipped deck, with required
 * units raised to the level floor. Returns a problem instead when the deck isn't allowed.
 */
export function chapterDeck(
  chapter: StoryChapter,
  own: { deck: string[]; level: (id: string) => number },
  pick?: string[],
): { deck: string[]; levels: Record<string, number> } | { problem: string } {
  const ed = chapter.eventDeck;
  if (ed) {
    const p = pick ?? [];
    if (p.length !== ed.pick || new Set(p).size !== ed.pick || !p.every((id) => ed.units.includes(id) && UNIT_BY_ID[id]?.enabled)) {
      return { problem: `Pick ${ed.pick} different units from the Event deck` };
    }
    const why = eventPickProblem(ed, p);
    if (why) return { problem: why };
    return { deck: [...p], levels: Object.fromEntries(p.map((id) => [id, ed.level])) };
  }
  const deck = [...own.deck];
  if (deck.length !== 5 || !deck.every((id) => deckable(UNIT_BY_ID[id]))) return { problem: "Your deck needs 5 cards" };
  const levels = Object.fromEntries(deck.map((id) => [id, own.level(id)]));
  const rules = chapter.rules;
  if (rules) {
    const failed = deckChecks(deck, rules).find((c) => !c.ok);
    if (failed) return { problem: `Deck rule: ${failed.text}` };
    for (const id of rules.requiredUnits) levels[id] = Math.max(levels[id], rules.levelFloor);
  }
  return { deck, levels };
}

// ---------------------------------------------------------------- config

/** Problems with the book (empty if fine). Ids are checked against the config's lists. */
export function storyProblems(book: BookDef, ids: { units: Set<string>; monsters: Set<string>; bosses: Set<string>; arenas: Set<string>; chests: Set<string> }, seenIds?: Set<string>): string[] {
  const errs: string[] = [];
  if (!book || !Array.isArray(book.stories)) return ["stories must have a list of stories"];
  const seen = seenIds ?? new Set<string>();
  const num = (v: unknown, where: string, min = 0) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min) errs.push(`${where} must be a number ≥ ${min}`);
  };
  const rew = (r: Partial<StoryReward> | undefined, where: string) => {
    num(r?.coins, `${where} gold`);
    num(r?.gems, `${where} gems`);
    if (r?.chest != null && !ids.chests.has(r.chest)) errs.push(`${where}: unknown chest "${r.chest}"`);
    for (const id of r?.cards ?? []) if (!ids.units.has(id)) errs.push(`${where}: unknown card "${id}"`);
  };
  for (const s of book.stories) {
    const ws = `Story ${s.id}`;
    if (seen.has(s.id)) errs.push(`Duplicate story id "${s.id}"`);
    seen.add(s.id);
    num(s.trophies, `${ws} trophies`);
    if (!s.chapters?.length) errs.push(`${ws}: needs at least one chapter`);
    for (const id of s.replayCards ?? []) if (!ids.units.has(id)) errs.push(`${ws}: unknown replay card "${id}"`);
    for (const c of s.chapters ?? []) {
      const wc = `Chapter ${c.id}`;
      if (seen.has(c.id)) errs.push(`Duplicate chapter id "${c.id}"`);
      seen.add(c.id);
      if (!ids.arenas.has(c.layout)) errs.push(`${wc}: unknown layout arena "${c.layout}"`);
      num(c.hpScale, `${wc} HP scale`, 0.01);
      num(c.corruption, `${wc} corruption`);
      if (!c.waves?.length) errs.push(`${wc}: needs at least one wave`);
      c.waves?.forEach((wv, i) => {
        const ww = `${wc} wave ${i + 1}`;
        num(wv.hp, `${ww} HP`, 0.01);
        if (!wv.spawns?.length && !wv.boss) errs.push(`${ww}: needs monsters or a boss`);
        for (const sp of wv.spawns ?? []) {
          if (!ids.monsters.has(sp.id)) errs.push(`${ww}: unknown monster "${sp.id}"`);
          num(sp.n, `${ww} ${sp.id} count`, 1);
        }
        if (wv.boss && !ids.bosses.has(wv.boss)) errs.push(`${ww}: unknown boss "${wv.boss}"`);
      });
      if (c.waves?.length && !c.waves[c.waves.length - 1].boss) errs.push(`${wc}: the last wave needs a boss`);
      rew(c.reward, `${wc} reward`);
      rew(c.replay, `${wc} replay reward`);
      if (c.eventDeck) {
        if (c.eventDeck.units.length < c.eventDeck.pick) errs.push(`${wc}: Event deck has fewer units than it picks`);
        for (const id of c.eventDeck.units) if (!ids.units.has(id)) errs.push(`${wc}: unknown Event deck unit "${id}"`);
        num(c.eventDeck.level, `${wc} Event deck level`, 1);
        for (const [role, n] of Object.entries(c.eventDeck.minRoles ?? {})) {
          num(n, `${wc} Event deck minimum ${role}`, 0);
          if (c.eventDeck.units.filter((id) => UNIT_BY_ID[id]?.role === role).length < n) errs.push(`${wc}: Event deck has fewer ${role} units than it requires`);
        }
        if (Object.values(c.eventDeck.minRoles ?? {}).reduce((a, b) => a + b, 0) > c.eventDeck.pick) errs.push(`${wc}: Event deck requires more units than it picks`);
      }
      if (c.rules) for (const id of c.rules.requiredUnits) if (!ids.units.has(id)) errs.push(`${wc}: unknown required unit "${id}"`);
      c.waves?.forEach((wv, i) => {
        const r = wv.reveal;
        if (!r) return;
        const rw = `${wc} wave ${i + 1} reveal`;
        if (!wv.boss) errs.push(`${rw}: needs a boss on the wave`);
        if (typeof r.at !== "number" || !(r.at > 0 && r.at < 1)) errs.push(`${rw}: "at" must be between 0 and 1`);
        num(r.stun, `${rw} stun`);
      });
      const mech = c.mechanics;
      if (mech) {
        const slots = (list: unknown, where: string) => {
          if (!Array.isArray(list) || !list.every((v) => Number.isInteger(v) && v >= 0 && v <= 14)) errs.push(`${wc}: ${where} must be slots 0-14`);
        };
        if (mech.tide) {
          num(mech.tide.cycle, `${wc} tide cycle`, 1);
          num(mech.tide.lowSpeed, `${wc} tide low-tide speed`, 0.01);
          num(mech.tide.highSpeed, `${wc} tide high-tide speed`, 0.01);
          num(mech.tide.flood, `${wc} tide flooded slots`, 1);
          if (mech.tide.flood > 14) errs.push(`${wc}: tide can flood at most 14 slots`);
        }
        if (mech.tidePools) {
          if (!Array.isArray(mech.tidePools.at) || !mech.tidePools.at.every((v) => typeof v === "number" && v >= 0 && v <= 1)) errs.push(`${wc}: tide pools must sit at shares 0-1 of the path`);
          num(mech.tidePools.bonus, `${wc} tide pool bonus`);
          num(mech.tidePools.sips, `${wc} tide pool sips`, 1);
        }
        if (mech.faceless) {
          slots(mech.faceless.braziers, "brazier slots");
          num(mech.faceless.savedBonus, `${wc} civilian saved bonus`);
          num(mech.faceless.savedCap, `${wc} civilian saved cap`);
          num(mech.faceless.hitCut, `${wc} civilian hit cut`);
          num(mech.faceless.floor, `${wc} reward floor`);
        }
        if (mech.shell) {
          const sh = mech.shell;
          if (!Array.isArray(sh.at) || !sh.at.every((v) => typeof v === "number" && v > 0 && v < 1)) errs.push(`${wc}: shell clusters must sit at shares 0-1 of the path`);
          if (!Array.isArray(sh.stages) || !sh.stages.length || !sh.stages.every((v) => Number.isInteger(v) && v >= 1)) errs.push(`${wc}: shell stages must be counts of 1 or more`);
          else {
            if (sh.stages.reduce((a, b) => a + b, 0) !== sh.at?.length) errs.push(`${wc}: shell stages must add up to the number of cluster spots`);
            if (!Array.isArray(sh.hp) || sh.hp.length !== sh.stages.length) errs.push(`${wc}: shell needs one hp value per stage`);
            else for (const v of sh.hp) num(v, `${wc} shell cluster hp`, 0.01);
          }
          num(sh.brood, `${wc} shell brood`, 1);
          num(sh.cap, `${wc} shell brood cap`, 1);
          num(sh.mana, `${wc} shell mana per second`);
        }
        if (mech.cage) {
          slots([mech.cage.slot], "cage slot");
          num(mech.cage.lockHp, `${wc} cage lock HP`, 1);
          num(mech.cage.roarStun, `${wc} cage roar stun`);
        }
      }
      const duel = c.duel;
      if (duel) {
        const dw = `${wc} duel`;
        if (!ids.arenas.has(duel.arena)) errs.push(`${dw}: unknown arena "${duel.arena}"`);
        if (!Array.isArray(duel.deck) || duel.deck.length !== 5 || new Set(duel.deck).size !== 5) errs.push(`${dw}: the deck needs 5 different units`);
        for (const id of duel.deck ?? []) if (!ids.units.has(id)) errs.push(`${dw}: unknown deck unit "${id}"`);
        num(duel.level, `${dw} level`, 1);
        num(duel.rounds, `${dw} rounds`, 1);
        if (!Array.isArray(duel.skill) || duel.skill.length < 2 * duel.rounds - 1 || !duel.skill.every((v) => typeof v === "number" && v >= 0 && v <= 1)) errs.push(`${dw}: needs a bot skill (0-1) for each of up to ${2 * duel.rounds - 1} rounds`);
        if (!duel.rival || !duel.rivalName) errs.push(`${dw}: needs a rival and a rival name`);
      }
    }
  }
  return errs;
}

/** Problems across every book; story and chapter ids must be unique across all of them. */
export function booksProblems(books: BookDef[], ids: Parameters<typeof storyProblems>[1]): string[] {
  const seen = new Set<string>();
  return books.flatMap((b) => storyProblems(b, ids, seen));
}
