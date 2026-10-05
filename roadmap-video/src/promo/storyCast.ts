/**
 * The v1.2 "Stories" cast, as shown in the promo graphics. Numbers and names follow
 * docs/features/v1.2-stories/README.md.
 *
 * Art: `promo-st.mjs` writes `stories-art.json` with the ids that have a portrait in
 * game/public/assets/portraits, monsters or bosses (copied to public/st/), plus the Event frame
 * and the new arenas. Anything missing is drawn as a
 * placeholder glyph, so the graphics re-render with real art as soon as it exists.
 */
import ART from "./stories-art.json";

export const HAS_ART = new Set<string>(ART.portraits);
export const HAS_EVENT_FRAME: boolean = ART.eventFrame;
export const HAS_PALACE: boolean = ART.palace;
/** Story 3 arenas with real art (arena_upside_down_village, arena_hollow_woods, arena_first_rift). */
export const HAS_ARENA = new Set<string>(ART.arenas);

export const PINK = "#ff6fb5";
export const PINK_LIGHT = "#ffc2e2";
export const VIOLET = "#8b3dff";
export const VIOLET_DARK = "#3a0f73";
export const KNIGHT = "#4f8dff";
export const MERC = "#e8344a";

export type Side = "barkeeper" | "knight" | "mercenary";
export type Glyph =
  | "heart_mug"
  | "pentagon"
  | "daggers"
  | "aegis"
  | "lance"
  | "oath"
  | "lantern"
  | "axe"
  | "bomb"
  | "coin_blade"
  | "gummy"
  | "corn"
  | "bean"
  | "cotton"
  | "choco"
  | "mint"
  | "licorice"
  | "pinata"
  | "sprinkles"
  | "shard"
  | "taffy"
  | "warlord"
  | "witch"
  | "plum"
  | "hydra"
  | "jawbreaker"
  | "villager"
  | "courier"
  | "farmer"
  | "fisherman"
  | "lumberjack"
  | "herbalist"
  | "merchant"
  | "chaos_eye"
  | "fae"
  | "bear"
  | "portal_wizard"
  | "upside_village";

export interface StoryUnit {
  id: string;
  name: string;
  rarity: "event" | "epic" | "story";
  side: Side;
  glyph: Glyph;
  /** Short stat line, e.g. "Very high damage · very slow". */
  stats: string;
  effect: string;
  /** Status it applies, shown as a chip. */
  status?: string;
}

export const MUSE: StoryUnit = {
  id: "princess_muse",
  name: "Princess Muse",
  rarity: "event",
  side: "barkeeper",
  glyph: "heart_mug",
  stats: "Never attacks",
  effect: "Allies in the 3×3 around her attack faster and hit harder.",
  status: "LAST CALL",
};

/** Story 2's Event deck: pick 5 of these 9. The first two become Epic cards. */
export const EVENT_DECK: StoryUnit[] = [
  { id: "pentagonal_knight", name: "Pentagonal Knight", rarity: "epic", side: "knight", glyph: "pentagon", stats: "Huge damage · very slow", effect: "Each hit gives adjacent allies Rally: +100% attack speed for 2s.", status: "RALLY" },
  { id: "aegis_knight", name: "Aegis Knight", rarity: "story", side: "knight", glyph: "aegis", stats: "Never attacks", effect: "Adjacent allies are immune to debuffs.", status: "CLEANSE" },
  { id: "lance_knight", name: "Lance Knight", rarity: "story", side: "knight", glyph: "lance", stats: "Pierce · medium speed", effect: "Hits a whole line. +50% damage to corrupted bosses." },
  { id: "oath_knight", name: "Oath Knight", rarity: "story", side: "knight", glyph: "oath", stats: "Single target", effect: "+8% damage for each adjacent Knight." },
  { id: "lantern_knight", name: "Lantern Knight", rarity: "story", side: "knight", glyph: "lantern", stats: "Mana", effect: "Makes mana on kills: the deck's economy." },
  { id: "rogue_knight", name: "Rogue Knight", rarity: "epic", side: "mercenary", glyph: "daggers", stats: "Low damage · very fast", effect: "Every 4s, adjacent allies miss 25% of attacks for 2s.", status: "IRRITATION" },
  { id: "berserker_sellsword", name: "Berserker Sellsword", rarity: "story", side: "mercenary", glyph: "axe", stats: "Very high damage", effect: "Adjacent allies attack 25% slower while it fights.", status: "FATIGUE" },
  { id: "powder_grenadier", name: "Powder Grenadier", rarity: "story", side: "mercenary", glyph: "bomb", stats: "Splash", effect: "15% of blasts stun an adjacent ally for 1s.", status: "SHELLSHOCK" },
  { id: "hired_blade", name: "Hired Blade", rarity: "story", side: "mercenary", glyph: "coin_blade", stats: "Big crits", effect: "Takes mana every wave. Unpaid, it sulks.", status: "WAGES" },
];

export const PENTAGONAL = EVENT_DECK[0];
export const ROGUE = EVENT_DECK[5];

export interface Foe {
  id: string;
  name: string;
  glyph: Glyph;
  trait: string;
  color: string;
  boss?: boolean;
  story: 1 | 2 | 3;
}

export const CANDY_FOLK: Foe[] = [
  { id: "gummy_bear", name: "Gummy Bear", glyph: "gummy", trait: "Basic", color: "#ff5a5a", story: 1 },
  { id: "candy_corn_runner", name: "Candy Corn Runner", glyph: "corn", trait: "Fast", color: "#ffb02e", story: 1 },
  { id: "jelly_bean_blob", name: "Jelly Bean Blob", glyph: "bean", trait: "Splits in 3", color: "#5fd46a", story: 1 },
  { id: "cotton_candy_puff", name: "Cotton Candy Puff", glyph: "cotton", trait: "Dodges", color: "#ff9ad5", story: 1 },
  { id: "chocolate_golem", name: "Chocolate Golem", glyph: "choco", trait: "Tank", color: "#8a5a3c", story: 1 },
  { id: "peppermint_turtle", name: "Peppermint Turtle", glyph: "mint", trait: "Armored", color: "#ff4d6a", story: 1 },
  { id: "licorice_medic", name: "Licorice Medic", glyph: "licorice", trait: "Heals", color: "#33263f", story: 1 },
  { id: "candy_pinata", name: "Candy Piñata", glyph: "pinata", trait: "Extra mana", color: "#3fc6ff", story: 1 },
];

export const CHAOS_BORN: Foe[] = [
  { id: "sprinkle_swarm", name: "Sprinkle Swarm", glyph: "sprinkles", trait: "Fast · splits", color: VIOLET, story: 2 },
  { id: "sour_shard", name: "Sour Shard", glyph: "shard", trait: "Armored · dodges", color: "#b6ff3b", story: 2 },
  { id: "chaos_taffy", name: "Chaos Taffy", glyph: "taffy", trait: "Tethers: Fatigue", color: "#c24dff", story: 2 },
];

/** Story 3's chaos-corrupted villagers (humans, not candy). */
export const VILLAGERS: Foe[] = [
  { id: "corrupted_villager", name: "Villager", glyph: "villager", trait: "Basic", color: "#c9a26b", story: 3 },
  { id: "corrupted_courier", name: "Courier", glyph: "courier", trait: "Fast", color: "#4f8dff", story: 3 },
  { id: "corrupted_farmer", name: "Farmer", glyph: "farmer", trait: "Splits: 3 crows", color: "#ffd93b", story: 3 },
  { id: "corrupted_fisherman", name: "Fisherman", glyph: "fisherman", trait: "Armored", color: "#ffb02e", story: 3 },
  { id: "corrupted_lumberjack", name: "Lumberjack", glyph: "lumberjack", trait: "Tank", color: "#e8344a", story: 3 },
  { id: "corrupted_herbalist", name: "Herbalist", glyph: "herbalist", trait: "Heals", color: "#5fd46a", story: 3 },
  { id: "corrupted_merchant", name: "Merchant", glyph: "merchant", trait: "Extra mana", color: "#ffd93b", story: 3 },
  { id: "chaos_eye", name: "Chaos Eye", glyph: "chaos_eye", trait: "Dodges", color: VIOLET, story: 3 },
];

export const BOSSES: Foe[] = [
  { id: "gummy_warlord", name: "Gummy Warlord", glyph: "warlord", trait: "Summons gummies", color: "#ff5a5a", boss: true, story: 1 },
  { id: "licorice_witch", name: "Licorice Witch", glyph: "witch", trait: "Binds 2 units", color: "#33263f", boss: true, story: 1 },
  { id: "sugar_plum_tyrant", name: "Sugar Plum Tyrant", glyph: "plum", trait: "Shield, then haste", color: "#9b3dcc", boss: true, story: 1 },
  { id: "sour_gummy_hydra", name: "Sour Gummy Hydra", glyph: "hydra", trait: "Splits when hit hard", color: "#b6ff3b", boss: true, story: 2 },
  { id: "chaos_jawbreaker", name: "Chaos Jawbreaker", glyph: "jawbreaker", trait: "4 layers · chaos core", color: VIOLET, boss: true, story: 2 },
  { id: "corrupted_fae", name: "Chaos Corrupted Fae", glyph: "fae", trait: "Dodges · Charm", color: "#ff9ad5", boss: true, story: 3 },
  { id: "corrupted_bear", name: "Chaos Corrupted Bear", glyph: "bear", trait: "Tank · roar", color: "#8a5a3c", boss: true, story: 3 },
  { id: "portal_wizard", name: "Chaos Corrupted Portal Wizard", glyph: "portal_wizard", trait: "Portals · blinks", color: "#3fc6ff", boss: true, story: 3 },
];

export interface Chapter {
  title: string;
  waves: number;
  boss: string;
  /** Arena asset id, used as the chapter's background once its art exists. */
  arena?: string;
}

export interface StoryDef {
  n: 1 | 2 | 3;
  title: string;
  blurb: string;
  deck: string;
  reward: string;
  /** The story's last line, shown instead of the reward on its cover. */
  cliffhanger?: string;
  color: string;
  chapters: Chapter[];
}

export const STORIES: StoryDef[] = [
  {
    n: 1,
    title: "Saving the Muse",
    blurb: "The candy folk are corrupted. Fight from the gates to the palace and free the princess.",
    deck: "Your own deck",
    reward: "Princess Muse",
    color: PINK,
    chapters: [
      { title: "The Candy Gates", waves: 10, boss: "Gummy Warlord" },
      { title: "Sugar Streets", waves: 15, boss: "Licorice Witch" },
      { title: "The Muse's Palace", waves: 20, boss: "Sugar Plum Tyrant" },
    ],
  },
  {
    n: 2,
    title: "Chaorruption",
    blurb: "Knights and mercenaries march on the source of the chaos.",
    deck: "Event deck: pick 5 of 9",
    reward: "Pentagonal + Rogue Knight",
    color: VIOLET,
    chapters: [
      { title: "The Violet Road", waves: 10, boss: "Licorice Witch" },
      { title: "Sour Marsh", waves: 15, boss: "Sour Gummy Hydra" },
      { title: "The Jawbreaker's Core", waves: 20, boss: "Chaos Jawbreaker" },
    ],
  },
  {
    n: 3,
    title: "The Beginning",
    blurb: "A human village turned upside down: the first case of corruption.",
    deck: "Own deck + rules",
    reward: "Gems, Legendary chest, \"The Chosen\" badge",
    cliffhanger: "The Chaos Corruption has already begun.",
    color: "#c24dff",
    chapters: [
      { title: "The Upside-Down Village", waves: 10, boss: "Chaos Corrupted Fae", arena: "arena_upside_down_village" },
      { title: "The Hollow Woods", waves: 15, boss: "Chaos Corrupted Bear", arena: "arena_hollow_woods" },
      { title: "The First Rift", waves: 20, boss: "Chaos Corrupted Portal Wizard", arena: "arena_first_rift" },
    ],
  },
];

/** The set of stories in v1.2. */
export const BOOK = "Book 1: The Chosen";

/** Story 3's deck rules (the player's own deck must pass them). */
export const STORY3_RULES = {
  required: ["Pentagonal Knight", "Rogue Knight"],
  banned: ["Legendary", "Mythic"],
};

/** Muse's Last Call bonus from ★1 to ★7. */
export const MUSE_SCALE = { speed: ["+5%", "+17%"], damage: ["+3%", "+9%"] };
