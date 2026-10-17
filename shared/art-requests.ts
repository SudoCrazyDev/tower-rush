/**
 * The art wish list behind the admin's Art requests page: every image still to make on
 * Higgsfield's unlimited image models, with its prompt. The admin pastes each result's link;
 * the D1 table art_requests keeps only the link, status and notes. `file` is where the image
 * goes in the raw pack (assets/), from which tools/build_assets.py builds the game files.
 */
import { ELEMENTS, UNITS, type Element, type Rarity } from "./units.ts";
import { noAttack, isSupport } from "./support.ts";
import { kitPrimary } from "./kit.ts";
import { PERKS, PERK_IDS } from "./perks.ts";
import { TRAITS } from "./monsters.ts";
import { RACES, RACE_IDS } from "./races.ts";

export type ArtModel = "Nano Banana Pro" | "Nano Banana 2" | "Seedream 4.5" | "Seedream 5.0 lite";

export interface ArtRequest {
  id: string;
  group: string;
  title: string;
  /** Raw pack path (relative to assets/) the finished image is saved to. */
  file: string;
  model: ArtModel;
  aspect: "1:1" | "16:9" | "9:16" | "4:5";
  /** Reference images to attach: game art paths (relative to the asset base), raw-pack files (assets/...) or a note. */
  refs: string[];
  prompt: string;
}

export type ArtStatus = "todo" | "ready" | "redo" | "done";
export const ART_STATUSES: ArtStatus[] = ["todo", "ready", "redo", "done"];

/** Saved per request in D1. */
export interface ArtRow {
  id: string;
  url: string;
  status: ArtStatus;
  notes: string;
  updatedAt: number;
}

/** The style reference in the raw pack; attach it to every request. */
export const STYLE_ANCHOR = "assets/style/style_anchor_v2.png";

const STYLE =
  "Flat 2D vector cartoon game art, thick dark navy outlines, simple two-tone cel shading, chunky rounded badge-like proportions, bright saturated colors, no gradients, no text, no watermark.";
const GREEN = "Centered, full body, plenty of margin, on a solid flat pure green (#00FF00) background with no shadow on the ground.";
/** Crests and emblems: a notch more polished than the characters, like the league badges (ui/league_*). */
const EMBLEM =
  "Mobile game emblem: bold chunky shapes, thick dark navy outline, glossy beveled metal with simple faceted highlights, a cut-gem accent, clean and bright. Stylized, not realistic: no scratches, no wear, no fine filigree. Front view, crisp silhouette that stays readable at 48 pixels, no text, no watermark.";
/** The approved Dragon race crest (2026-10-06): every crest and element emblem matches it. */
const EMBLEM_ANCHOR = "assets/style/emblem_anchor.png";
/** Green crests key out badly on green, so these go on magenta. */
const GREENISH_RACES = new Set<string>(["elf", "orc", "goblin", "sylvan"]);
const GREENISH_ELEMENTS = new Set<string>(["nature", "poison"]);

/** Only races that would have wings get them (the approved Dragon crest has gold wings). */
const RACE_WINGS: Partial<Record<string, string>> = {
  dragon: "Glossy gold wings spread from behind the shield, like the reference.",
  fae: "Sparkly translucent butterfly wings spread from behind the shield.",
  celestial: "Feathered white-and-gold angel wings spread from behind the shield.",
  demon: "Dark red bat wings spread from behind the shield.",
};

const ELEMENT_ART: Record<Element, string> = {
  fire: "a shield with deep red-orange enamel, a bold stylized flame symbol, a glossy gold rim and a cut ruby; instead of wings, curling flames rise from behind the shield",
  ice: "a shield with icy light-blue enamel, a bold stylized snowflake symbol, a glossy silver rim and a cut sapphire; instead of wings, ice crystal shards fan out from behind the shield",
  lightning: "a shield with electric yellow enamel, a bold stylized lightning bolt symbol, a glossy gold rim and a cut topaz; instead of wings, jagged lightning bolts spark out from behind the shield",
  nature: "a shield with forest-green enamel, a bold stylized leaf symbol, a glossy bronze-gold rim and a cut emerald; instead of wings, large leaves fan out from behind the shield",
  poison: "a shield with toxic purple enamel, a poison drop with a small skull, a glossy dark silver rim, a cut amethyst and a few lime bubbles; instead of wings, dripping toxic tendrils curl out from behind the shield",
  arcane: "a shield with deep violet enamel, a glowing star-and-rune symbol, a glossy gold rim and a cut amethyst; instead of wings, swirling magic ribbons with small stars curl out from behind the shield",
  normal: "a shield with plain steel-grey enamel, a bold stylized crossed-fists symbol, a glossy iron rim and a cut clear quartz; instead of wings, two short iron blades fan out from behind the shield",
};

const ICON ="Single centered icon, bold simple shape that stays readable at 32 pixels, on a solid flat pure green (#00FF00) background.";

const AURA: Record<Element, string> = {
  fire: "a blazing flame aura, molten-gold and ember-orange trim, glowing embers",
  ice: "a frosty crystal aura, an ice-crystal crown, silver and pale-blue trim, drifting snowflakes",
  lightning: "a crackling electric aura, storm-gold trim, small lightning arcs",
  nature: "a leafy emerald aura, curling vines and blossoms, gold trim",
  poison: "a bubbling toxic-green aura, violet and lime trim, floating bubbles",
  arcane: "swirling violet arcane runes, starry gold trim, a glowing halo",
  normal: "a dusty steel-grey war aura, iron and leather trim, drifting sparks",
};

const GRANDEUR: Record<Rarity, string> = {
  common: "noticeably upgraded",
  rare: "upgraded and more heroic",
  epic: "much grander and more powerful",
  legendary: "majestic and legendary",
  mythic: "godlike and awe-inspiring",
  event: "royal and radiant",
};

/** Attacking units (and buff units) awaken at max rank once they have awakened art. */
const canAwaken = (arch: Parameters<typeof isSupport>[0]) => !isSupport(arch);

function awakened(have: HaveArt): ArtRequest[] {
  const stills = new Set(have.units_awakened), portraits = new Set(have.portraits_awakened);
  const out: ArtRequest[] = [];
  for (const u of UNITS) {
    if (u.storyOnly || !canAwaken(kitPrimary(u))) continue;
    const needStill = !stills.has(u.id);
    const needPortrait = !portraits.has(u.id);
    if (!needStill && !needPortrait) continue;
    const who = `${u.name} (${u.blurb.replace(/\.$/, "")})`;
    if (needStill)
      out.push({
        id: `awakened:${u.id}`,
        group: "Awakened units",
        title: `${u.name}: awakened still`,
        file: `units_awakened/${u.id}.png`,
        model: "Nano Banana Pro",
        aspect: "1:1",
        refs: [`units/${u.id}.webp`, STYLE_ANCHOR],
        prompt:
          `${STYLE} The awakened, max-level form of this exact character, ${who}: keep the same face, species, colors and silhouette so it is instantly recognizable, ` +
          `but make it ${GRANDEUR[u.rarity]}: ${AURA[u.element]}, ornate armor or robes, a bigger, fancier version of its signature weapon or prop. ` +
          `${noAttack(kitPrimary(u)) ? "Confident commanding pose" : "Heroic ready-to-attack pose"}, facing slightly right. ${GREEN}`,
      });
    if (needPortrait)
      out.push({
        id: `awakened-portrait:${u.id}`,
        group: "Awakened card portraits",
        title: `${u.name}: awakened card portrait`,
        file: `cards/portraits_awakened/${u.id}.png`,
        model: "Nano Banana Pro",
        aspect: "1:1",
        refs: [needStill ? "your awakened still (row above)" : `units_awakened/${u.id}.webp`, `portraits/${u.id}.webp`],
        prompt:
          `${STYLE.replace(", no text, no watermark.", ".")} Trading-card portrait of the awakened character in the first reference, framed exactly like the second reference: ` +
          `bust from the chest up, three-quarter view, filling the square, with a dramatic ${u.element}-colored glowing background that matches ${AURA[u.element]}. ` +
          `Square 1:1, full-bleed, no card frame, no border, no text.` +
          (needStill ? " (Make the awakened still first and use it as the first reference.)" : ""),
      });
  }
  return out;
}

const icon = (group: string, idPrefix: string, folder: string, key: string, title: string, what: string, refs: string[], model: ArtModel = "Nano Banana 2"): ArtRequest => ({
  id: `${idPrefix}:${key}`,
  group,
  title,
  file: `${folder}/${key}.png`,
  model,
  aspect: "1:1",
  refs: [...refs, STYLE_ANCHOR],
  prompt: `${STYLE} ${what} ${ICON}`,
});

const TRAIT_ART: Record<string, string> = {
  fast: "a winged boot with speed lines",
  tank: "a huge heavy anvil with a big heart on it",
  armored: "a thick riveted steel shield",
  healer: "a green cross with a glowing plus sparkle",
  splitter: "a round blob splitting into two smaller blobs",
  rich: "a bulging coin pouch spilling gold coins",
  dodge: "a ghostly blurred silhouette dodging sideways with motion lines",
  frostproof: "a snowflake inside a red warm flame, frost cannot touch it",
  tether: "a stretched purple chain linking two points",
};

const PERK_ART: Record<string, string> = {
  armor_breaker: "a war hammer smashing a cracked shield",
  true_strike: "an arrow hitting the exact center of a target",
  giant_slayer: "a small sword in front of a huge giant's footprint",
  hunter: "a hunting crosshair over a running paw print",
  finisher: "a skull with a red slash across a nearly empty health bar",
  plunder: "a pirate hook grabbing a blue mana crystal",
  frostbite: "an icy blue fang biting a snowflake",
};

const RACE_ART: Record<string, string> = {
  human: "a crowned knight's helmet",
  elf: "a pointed elf ear with a leaf",
  dwarf: "a braided dwarf beard with a pickaxe",
  gnome: "a tall pointed gnome hat with a gear",
  orc: "a tusked orc skull with war paint",
  goblin: "a grinning goblin face with big ears",
  giant: "a giant stone club",
  beast: "a fierce paw print with claws",
  undead: "a cracked skull with a green ghost flame",
  demon: "curled demon horns with a flame",
  dragon: "a dragon head in profile",
  elemental: "four swirling element orbs (fire, water, air, earth)",
  construct: "a brass cog with a riveted plate",
  sylvan: "an oak leaf with acorns",
  fae: "sparkling fairy wings",
  celestial: "a golden sun with angel wings",
  candy: "a swirl lollipop and wrapped candy",
  chaos: "a cracked purple eye with chaos swirls",
};

const ARCH_ART: Record<string, string> = {
  shot: "a single arrow flying at a target",
  splash: "a round blast hitting the ground with a shockwave ring",
  burn: "a flame on a scorch mark",
  chain: "a lightning bolt jumping between three dots",
  pierce: "a spear passing through two shields",
  slow: "a snail shell with a frost swirl",
  freeze: "a block of ice with a snowflake",
  stun: "spinning stars over a dizzy swirl",
  poison: "a dripping green poison flask",
  crit: "a red exclamation burst with a sword",
  curse: "a purple hex sigil with a broken heart",
  execute: "a grim reaper scythe",
  sniper: "a scope crosshair",
  growth: "a sprout growing into a tall plant with an up arrow",
  buff: "a raised sword with gold up arrows",
  mana: "a glowing blue mana crystal",
  mime: "a white mime mask",
  portal: "a swirling purple portal ring",
  mirror: "an oval hand mirror with a reflection",
  lucky: "a four-leaf clover",
  hourglass: "an hourglass with sand and a speed arrow",
  echo: "a sound wave repeating three times",
  herald: "a waving war banner",
  brewer: "a bubbling cauldron",
  aura: "a foaming tankard with a glowing ring around it",
  aegis: "a round shield with a protective dome",
};

const AVATARS = [
  "a cute knight in a big helmet",
  "a fox mage with a pointy hat",
  "a grinning goblin",
  "a fierce orc warrior",
  "a sleepy owl wizard",
  "a cheerful dwarf with a braided beard",
  "an elf archer",
  "a baby dragon",
  "a skeleton pirate",
  "a candy princess",
  "a ninja cat",
  "a happy slime",
  "a viking girl",
  "a robot with a visor",
  "a mushroom kid",
  "a ghost with a lantern",
];

const GLYPHS: [string, string][] = [
  ["star", "a chunky gold five-point star"],
  ["star_empty", "an empty five-point star outline, dark grey-blue fill"],
  ["check", "a chunky green check mark"],
  ["cross", "a chunky red X mark"],
  ["heart", "a chunky red heart with a white shine"],
];

/** Game art paths (at the asset base) used as character references in the scenes below. */
const U = (id: string) => `units/${id}.webp`;
const P = (id: string) => `portraits/${id}.webp`;
const M = (id: string) => `monsters/${id}.webp`;
const B = (id: string) => `bosses/${id}.webp`;
const H = (id: string) => `heroes/${id}.webp`;
const A = (id: string) => `locations/arena_${id}.webp`;
const BADGES = [0, 1, 2, 3, 4, 5, 6].map((n) => `ui/league_${n}.webp`);
/** v2.9 league badges still to draw: slice number, title, what it shows. */
const LEAGUE_BADGE_ART: [number, string, string][] = [
  [7, "League badge: Mythic", "the Mythic League, a step above Champion: a radiant magenta-and-gold crest with a phoenix spreading its wings over a crown, a large cut ruby in the center"],
  [8, "League badge: Immortal", "the Immortal League, the highest public league: a pearl-white and pale-gold crest with angel wings, a laurel wreath and a glowing ever-burning flame above a diamond"],
  [9, "League badge: Secret Society", "the invite-only Secret Society League: a dark obsidian-black and antique-gold crest with an all-seeing eye inside a triangle, a hooded silhouette behind it and a wax seal ribbon, mysterious and exclusive"],
  [10, "League badge: ??? (hidden)", "a locked mystery league: a dark smoky-violet shield wrapped in shadow and chains with one big glowing gold question mark in the center"],
];

/** Scenes with our cast: the model must copy the referenced characters, not invent its own. */
const CAST =
  "Use ONLY the characters shown in the reference images, each drawn exactly as it looks there (same face, species, colors, outfit, weapon and proportions) so fans recognize them; " +
  "do not invent any other characters or creatures. If a reference shows a place, set the scene there.";
const HOLD = "Leave a calm, uncluttered band for a headline added later.";

type Scene = [group: string, key: string, title: string, aspect: ArtRequest["aspect"], model: ArtModel, refs: string[], what: string];

const SCENES: Scene[] = [
  // Website sections
  ["Website images", "hero", "Homepage hero banner", "16:9", "Nano Banana Pro",
    [U("shield_knight"), U("hooded_archer"), U("ember_witch"), U("frost_sorceress"), U("lion_paladin"), M("orc_brute"), M("slime_blob"), M("skeleton_soldier"), B("fire_dragon")],
    "Wide promotional key art for the tower defense game Crown & Keep: Shield Knight, Hooded Archer, Ember Witch, Frost Sorceress and Lion Paladin defend a castle gate on a winding path against a horde of Orc Brutes, Slime Blobs and Skeleton Soldiers led by the giant Fire Dragon, epic sunset sky. Leave calm empty space on the left third for a headline."],
  ["Website images", "merge", "Merge feature image", "16:9", "Nano Banana Pro",
    [U("hooded_archer"), "ui/rating_stars.webp"],
    "Game feature illustration: two identical Hooded Archers standing on glowing board tiles merge into one bigger, upgraded Hooded Archer in a burst of sparkles with an extra gold star, top-down board view."],
  ["Website images", "pvp", "PvP feature image", "16:9", "Nano Banana Pro",
    [H("young_king"), H("dark_knight"), M("orc_brute"), M("goblin_runner"), A("meadow")],
    "Game feature illustration: the Young King (blue side) and the Dark Knight (red side) face off across a split battlefield with a glowing VS emblem in the middle, Orc Brutes and Goblin Runners charging down both lanes."],
  ["Website images", "stories", "Stories feature image", "16:9", "Nano Banana Pro",
    [U("princess_muse"), "story/portraits/candy_king.webp", B("chaos_jawbreaker"), A("candy_palace")],
    "Game feature illustration: an open storybook with the candy palace popping out of its pages, Princess Muse and the Candy King waving from the castle, the Chaos Jawbreaker looming behind with purple corruption creeping in."],
  ["Website images", "collection", "Collection feature image", "16:9", "Nano Banana Pro",
    [P("hooded_archer"), P("ember_witch"), P("fox_samurai"), P("valkyrie"), P("monkey_king"), "cards/frame_mythic.webp", "items/coins.webp"],
    "Game feature illustration: a fan of five trading cards showing Hooded Archer (common), Ember Witch (rare), Fox Samurai (epic), Valkyrie (legendary) and Monkey King (mythic) in their rarity frames, the mythic Monkey King card glowing in the center, gold coins around."],
  ["Website images", "leagues", "Leagues feature image", "16:9", "Nano Banana Pro",
    [...BADGES, "items/trophy.webp", U("lion_paladin")],
    "Game feature illustration: a stone staircase climbing into the clouds with one league badge from the references on each step, in order from Bronze at the bottom to Champion at the top, a giant gold trophy glowing at the summit and Lion Paladin climbing toward it."],
  ["Website images", "heroes", "Heroes feature image", "16:9", "Nano Banana Pro",
    ["young_king", "orc_warchief", "panda_brewmaster", "gnome_mech", "griffin_knight", "sea_witch", "elf_archmage", "dark_knight"].map(H),
    "Game feature illustration: all eight hero commanders (Young King, Orc Warchief, Panda Brewmaster, Gnome Mech, Griffin Knight, Sea Witch, Elf Archmage, Dark Knight) posing together on a castle wall like a team poster, banners flying."],

  // Social profiles
  ["Social profiles", "discord_icon", "Discord server icon", "1:1", "Nano Banana Pro", ["assets/brand/icon_512.png", "assets/brand/logo.png"],
    "Round server icon based on the game's icon reference: a golden crown on a small chunky castle keep, bold and centered, readable at 48 pixels, on a royal-blue circle."],
  ["Social profiles", "discord_banner", "Discord server banner", "16:9", "Nano Banana Pro",
    [U("shield_knight"), U("hooded_archer"), U("ember_witch"), U("penguin_wizard"), U("hourglass_owl")],
    `Wide banner: Shield Knight, Hooded Archer, Ember Witch, Penguin Wizard and Hourglass Owl relaxing together in a cozy castle courtyard, torches and banners, evening light. ${HOLD}`],
  ["Social profiles", "youtube_banner", "YouTube channel banner", "16:9", "Nano Banana Pro",
    [U("shield_knight"), U("hooded_archer"), U("flame_adept"), U("tesla_gnome"), U("fox_spearman"), M("orc_brute"), M("goblin_runner"), M("slime_blob")],
    "Very wide channel banner (keep everything important inside a thin middle strip, about 6:1): Shield Knight, Hooded Archer, Flame Adept, Tesla Gnome and Fox Spearman on a castle wall facing Orc Brutes, Goblin Runners and Slime Blobs on the horizon, sunset sky."],
  ["Social profiles", "facebook_cover", "Facebook / X cover", "16:9", "Nano Banana Pro",
    [U("bear_rider"), U("sand_monk"), U("frost_sorceress"), U("gear_engineer"), M("wolf_raider"), M("boar_rider"), A("meadow")],
    `Wide cover image (3:1 crop safe): Bear Rider, Sand Monk, Frost Sorceress and Gear Engineer guard the path to a castle gate as Wolf Raiders and Boar Riders charge in from the right, bright daytime sky. ${HOLD}`],

  // Unit of the Day backgrounds (the unit card is placed on top later)
  ["Unit of the Day posts", "uotd_square", "Unit of the Day: square", "1:1", "Nano Banana 2", ["cards/frame_legendary.webp"],
    "Social post background with NO characters: a glowing round spotlight stage on a castle floor, royal blue and gold, sparkles, an empty pedestal in the center for a unit card, decorative corners. Leave the center empty."],
  ["Unit of the Day posts", "uotd_story", "Unit of the Day: story", "9:16", "Nano Banana 2", ["cards/frame_legendary.webp"],
    "Vertical story background with NO characters: a tall spotlight beam onto an empty pedestal, royal blue and gold, banners on both sides, sparkles. Leave the middle empty for a unit card and the top for a title."],
  ["Unit of the Day posts", "uotd_feed", "Unit of the Day: feed", "4:5", "Nano Banana 2", ["cards/frame_legendary.webp"],
    "Feed post background with NO characters: an empty card display stand on a velvet castle table, royal blue and gold, candles and coins around the edges. Leave the center empty for a unit card."],

  // Ads
  ["Ad images", "ad_merge_sq", "Ad: Merge to win (square)", "1:1", "Nano Banana Pro", [U("hooded_archer"), M("slime_blob"), M("goblin_runner")],
    `Mobile game ad image: two identical Hooded Archers on glowing tiles merge into one big powerful Hooded Archer in a burst of light, Slime Blobs and Goblin Runners blasted back. ${HOLD}`],
  ["Ad images", "ad_merge_story", "Ad: Merge to win (story)", "9:16", "Nano Banana Pro", [U("shield_knight"), U("hooded_archer"), U("ember_witch"), U("tesla_gnome"), M("zombie_peasant")],
    `Vertical mobile game ad image: a 3x3 board of Hooded Archers, Ember Witches and Tesla Gnomes where two Shield Knights merge in a burst of light into a bigger Shield Knight, Zombie Peasants on the path below. ${HOLD}`],
  ["Ad images", "ad_pvp_sq", "Ad: Beat your friend (square)", "1:1", "Nano Banana Pro", [H("young_king"), H("dark_knight"), M("orc_brute")],
    `Mobile game ad image: the Young King (blue side) and the Dark Knight (red side) glare at each other across a split battlefield, the Dark Knight hurling an Orc Brute onto the Young King's side, a glowing VS emblem. ${HOLD}`],
  ["Ad images", "ad_pvp_story", "Ad: Beat your friend (story)", "9:16", "Nano Banana Pro", [M("door_ogre"), M("goblin_runner"), H("young_king"), H("dark_knight")],
    `Vertical mobile game ad image: two stacked battlefields, the Young King's blue board on top and the Dark Knight's red board below, a Door Ogre leaping from one board to the other with Goblin Runners, a glowing VS emblem in the middle. ${HOLD}`],
  ["Ad images", "ad_champion_sq", "Ad: Climb to Champion (square)", "1:1", "Nano Banana Pro", [U("lion_paladin"), "items/trophy.webp", BADGES[6], BADGES[5], BADGES[4]],
    `Mobile game ad image: Lion Paladin raises a huge gold trophy on a mountain peak, the league badges from the references shining in the sky like stars, confetti. ${HOLD}`],
  ["Ad images", "ad_champion_story", "Ad: Climb to Champion (story)", "9:16", "Nano Banana Pro", [U("valkyrie"), ...BADGES],
    `Vertical mobile game ad image: a tall staircase of the league badges from the references rising into the clouds, Bronze at the bottom to Champion at the top, Valkyrie flying up the steps toward the Champion badge. ${HOLD}`],
  ["Ad images", "ad_boss_sq", "Ad: Stop the boss (square)", "1:1", "Nano Banana Pro", [B("demon_lord"), U("shield_knight"), U("aegis_knight"), U("hooded_archer"), U("sun_priestess")],
    `Mobile game ad image: the giant Demon Lord stomps toward a tiny castle while Shield Knight, Aegis Knight, Hooded Archer and Sun Priestess bravely block the path, dramatic red sky. ${HOLD}`],
  ["Ad images", "ad_awaken_sq", "Ad: Awaken your heroes (square)", "1:1", "Nano Banana Pro", [U("ember_witch"), "units_awakened/ember_witch.webp"],
    `Mobile game ad image: a before-and-after split of Ember Witch, her normal form (first reference) on the left and her awakened form (second reference) on the right in a burst of flame. ${HOLD}`],

  // News thumbnails
  ["Release thumbnails", "news_v1_1", "News: v1.1 Supporting Cast", "16:9", "Nano Banana Pro",
    [U("mime"), U("lucky_cat"), U("hourglass_owl"), U("banner_herald"), U("gnome_brewer"), U("portal_imp")],
    "News thumbnail: the support units Mime, Lucky Cat, Hourglass Owl, Banner Herald, Gnome Brewer and Portal Imp stepping onto a theatre stage under a spotlight."],
  ["Release thumbnails", "news_v1_2", "News: v1.2 Stories", "16:9", "Nano Banana Pro",
    [U("princess_muse"), "story/portraits/candy_king.webp", B("chaos_jawbreaker"), A("candy_palace")],
    "News thumbnail: an open glowing storybook with the candy palace rising from its pages, the Candy King and Princess Muse waving, the Chaos Jawbreaker's purple corruption creeping in at the edges."],
  ["Release thumbnails", "news_v1_3", "News: v1.3 Crown & Keep", "16:9", "Nano Banana Pro",
    ["assets/brand/logo.png", H("young_king"), U("shield_knight"), U("hooded_archer")],
    "News thumbnail: the Young King places a shining golden crown on top of a small sturdy castle keep while Shield Knight and Hooded Archer cheer, fireworks and banners behind, a grand reveal. Leave room at the top for the logo."],
  ["Release thumbnails", "news_pvp", "News: PvP", "16:9", "Nano Banana Pro", [H("young_king"), H("orc_warchief"), A("meadow")],
    "News thumbnail: the Young King (blue side) and the Orc Warchief (red side) shake hands over a split battlefield before the duel, sparks flying, a glowing VS emblem."],

  // Wallpapers
  ["Wallpapers", "wall_fire_desktop", "Wallpaper: Fire (desktop)", "16:9", "Nano Banana Pro", [U("ember_witch"), U("phoenix_chick"), U("lava_golem"), A("volcano")],
    "Desktop wallpaper: Ember Witch, Phoenix Chick and Lava Golem defend a lava path in the volcano arena at dusk, glowing embers drifting, rich detail."],
  ["Wallpapers", "wall_ice_desktop", "Wallpaper: Ice (desktop)", "16:9", "Nano Banana Pro", [U("frost_sorceress"), U("penguin_wizard"), U("crystal_queen"), B("frost_wyrm"), A("tundra")],
    "Desktop wallpaper: Frost Sorceress, Penguin Wizard and Crystal Queen stand against the Frost Wyrm on a frozen path in the tundra at night under auroras, snow falling."],
  ["Wallpapers", "wall_nature_desktop", "Wallpaper: Nature (desktop)", "16:9", "Nano Banana Pro", [U("hooded_archer"), U("treant_guardian"), U("vine_druid"), M("mushroom_walker"), A("mushroom_forest")],
    "Desktop wallpaper: Hooded Archer, Treant Guardian and Vine Druid guard a mossy path through the glowing mushroom forest as Mushroom Walkers approach, fireflies."],
  ["Wallpapers", "wall_candy_desktop", "Wallpaper: Candy (desktop)", "16:9", "Nano Banana Pro", [U("princess_muse"), M("gummy_bear"), M("cotton_candy_puff"), B("gummy_warlord"), A("candy_palace")],
    "Desktop wallpaper: Princess Muse defends the candy palace from Gummy Bears and Cotton Candy Puffs led by the Gummy Warlord, pink sky, sprinkles in the air."],
  ["Wallpapers", "wall_castle_phone", "Wallpaper: Castle (phone)", "9:16", "Nano Banana Pro", [H("young_king"), U("shield_knight"), U("hooded_archer"), U("tesla_gnome")],
    "Phone wallpaper: a tall castle keep with a golden crown on its tower, the Young King on the battlements, Shield Knight, Hooded Archer and Tesla Gnome guarding the winding path below, stars above. Keep the top quarter calm for the clock."],
  ["Wallpapers", "wall_boss_phone", "Wallpaper: Boss (phone)", "9:16", "Nano Banana Pro", [B("void_emperor"), U("lion_paladin")],
    "Phone wallpaper: the giant Void Emperor towers over Lion Paladin standing brave on a cliff, dramatic storm sky. Keep the top quarter calm for the clock."],
  ["Wallpapers", "wall_pvp_phone", "Wallpaper: PvP (phone)", "9:16", "Nano Banana Pro", [H("dark_knight"), H("young_king"), M("orc_brute"), U("shield_knight")],
    "Phone wallpaper: the Dark Knight's red army on top and the Young King's blue army below (Orc Brutes against Shield Knights) clash in the middle around a glowing VS emblem. Keep the top quarter calm for the clock."],
];

/** New chat emotes, each starring one of our characters (like the existing goblin_laugh, witch_thumbsup). */
const EMOTES: [key: string, ref: string, what: string][] = [
  ["dragon_laugh", U("storm_whelp"), "Storm Whelp laughing so hard it puffs little sparks"],
  ["yeti_shiver", M("yeti_cub"), "the Yeti Cub shivering with chattering teeth"],
  ["mermaid_wave", U("tide_mermaid"), "Tide Mermaid waving hello from a splash of water"],
  ["skeleton_shrug", M("skeleton_soldier"), "the Skeleton Soldier shrugging, its jaw dropping off"],
  ["cat_wink", U("lucky_cat"), "Lucky Cat winking and raising a paw with a gold coin"],
  ["mime_shock", U("mime"), "the Mime gasping with hands on cheeks"],
  ["orc_flex", M("orc_brute"), "the Orc Brute flexing huge arms proudly"],
  ["ghost_boo", U("lantern_ghost"), "Lantern Ghost popping out with a cheeky grin"],
];

/**
 * Static VFX sprites (vfx/<key>.png). The game tweens them (scale, fade, spin), so each is one
 * clean frame. Animated clips still need Seedance (credits), so they aren't listed here.
 * [group, key, title, what, on magenta (green subject)]
 */
const VFX_LIST: [string, string, string, string, boolean?][] = [
  // Projectiles: new shapes for future units, plus a bigger awakened version of each existing one.
  ["VFX: projectiles", "proj_spark", "Spark projectile", "a small crackling yellow-white electric spark orb with tiny jagged arcs"],
  ["VFX: projectiles", "proj_holy", "Holy bolt", "a radiant white-gold holy bolt with a soft halo and tiny sparkles"],
  ["VFX: projectiles", "proj_shadow", "Shadow bolt", "a swirling dark purple shadow orb with wispy black smoke tendrils"],
  ["VFX: projectiles", "proj_rock", "Boulder", "a chunky cracked brown boulder with small flying pebbles"],
  ["VFX: projectiles", "proj_bomb", "Bomb", "a round black cartoon bomb with a lit sparking fuse"],
  ["VFX: projectiles", "proj_dagger", "Thrown dagger", "a spinning silver throwing dagger with a short motion streak"],
  ["VFX: projectiles", "proj_shuriken", "Shuriken", "a four-pointed steel ninja star with a spin blur"],
  ["VFX: projectiles", "proj_spear", "Spear", "a flying wooden spear with a steel tip, pointing right"],
  ["VFX: projectiles", "proj_axe", "Throwing axe", "a spinning double-headed throwing axe"],
  ["VFX: projectiles", "proj_bubble", "Water bubble", "a glossy blue water bubble with a white highlight and droplets"],
  ["VFX: projectiles", "proj_leaf", "Leaf blade", "a sharp spinning green leaf blade with a small wind swirl", true],
  ["VFX: projectiles", "proj_thorn", "Thorn", "a curved sharp green thorn spike with a vine tail", true],
  ["VFX: projectiles", "proj_skull", "Cursed skull", "a small floating green-flamed skull, grinning", true],
  ["VFX: projectiles", "proj_star", "Star bolt", "a five-pointed glowing yellow star with a twinkling trail"],
  ["VFX: projectiles", "proj_note", "Music note", "a bright magical music note with a sparkly swirl, for a bard"],
  ["VFX: projectiles", "proj_feather", "Feather dart", "a sharp white-and-gold feather dart pointing right"],
  ["VFX: projectiles", "proj_wind", "Wind slash", "a crescent-shaped pale cyan wind slash"],
  ["VFX: projectiles", "proj_water", "Water jet", "a short curling blue water jet with spray"],
  ["VFX: projectiles", "proj_meteor", "Meteor", "a flaming meteor rock with a fiery tail pointing up-left"],
  ["VFX: projectiles", "proj_fireball_awakened", "Fireball (awakened)", "a huge blazing fireball with a golden core and a long flame tail, more epic than the reference"],
  ["VFX: projectiles", "proj_ice_shard_awakened", "Ice shard (awakened)", "a giant glowing crystal ice lance with frost sparkles, more epic than the reference"],
  ["VFX: projectiles", "proj_lightning_awakened", "Lightning (awakened)", "a thick golden-white lightning bolt with branching arcs, more epic than the reference"],
  ["VFX: projectiles", "proj_poison_awakened", "Poison (awakened)", "a big bubbling toxic glob with dripping venom and a skull-shaped bubble", true],
  ["VFX: projectiles", "proj_arcane_orb_awakened", "Arcane orb (awakened)", "a large swirling violet arcane orb ringed by orbiting runes, more epic than the reference"],
  ["VFX: projectiles", "proj_arrow_awakened", "Arrow (awakened)", "a glowing golden enchanted arrow with a light trail, more epic than the reference"],
  ["VFX: projectiles", "proj_cannonball_awakened", "Cannonball (awakened)", "a flaming iron cannonball with a smoke and spark trail"],
  // Impacts: a burst shown where a hit lands.
  ["VFX: impacts", "impact_fire", "Fire impact", "a round burst of orange flames and embers"],
  ["VFX: impacts", "impact_ice", "Ice impact", "a starburst of shattering ice shards and frost puffs"],
  ["VFX: impacts", "impact_lightning", "Lightning impact", "a bright yellow electric starburst with jagged arcs"],
  ["VFX: impacts", "impact_nature", "Nature impact", "a burst of green leaves and petals", true],
  ["VFX: impacts", "impact_poison", "Poison impact", "a splash of bubbling green venom droplets", true],
  ["VFX: impacts", "impact_arcane", "Arcane impact", "a violet magic starburst with tiny runes"],
  ["VFX: impacts", "impact_physical", "Physical impact", "a white comic-style hit star with speed lines"],
  ["VFX: impacts", "impact_holy", "Holy impact", "a burst of golden light rays and sparkles"],
  ["VFX: impacts", "impact_shadow", "Shadow impact", "a burst of dark purple smoke wisps"],
  ["VFX: impacts", "crit_burst", "Critical hit burst", "a big jagged red-and-gold comic impact burst, no text"],
  ["VFX: impacts", "slash_arc", "Sword slash", "a curved white crescent sword-slash arc with a light glow"],
  ["VFX: impacts", "claw_marks", "Claw marks", "three diagonal red claw scratch marks"],
  ["VFX: impacts", "explosion_big", "Big explosion", "a large round cartoon explosion cloud with orange fire and grey smoke"],
  ["VFX: impacts", "death_puff", "Death puff", "a round puff of grey cartoon smoke clouds"],
  ["VFX: impacts", "soul_wisp", "Soul wisp", "a small friendly pale-blue ghost wisp rising upward"],
  // Status effects: small overlays above a unit or monster.
  ["VFX: status", "status_burn", "Burning", "small flames licking upward, as an overlay"],
  ["VFX: status", "status_poisoned", "Poisoned", "green toxic bubbles rising with a tiny skull", true],
  ["VFX: status", "status_shocked", "Shocked", "small crackling yellow electric zigzags"],
  ["VFX: status", "status_slowed", "Slowed", "a blue snail-shell spiral with frost dust"],
  ["VFX: status", "status_stunned", "Stunned", "a ring of little yellow stars and birds circling"],
  ["VFX: status", "status_rooted", "Rooted", "green vines and roots curling up from the ground", true],
  ["VFX: status", "status_shield", "Shielded", "a translucent glossy blue hexagon bubble shield"],
  ["VFX: status", "status_haste", "Haste", "yellow speed chevrons and wind streaks"],
  ["VFX: status", "status_rage", "Rage", "a red anger vein mark with steam puffs"],
  ["VFX: status", "status_cursed", "Cursed", "a purple floating eye sigil with dark wisps"],
  ["VFX: status", "status_weakened", "Weakened", "a cracked grey sword pointing down"],
  ["VFX: status", "status_regen", "Regenerating", "small green plus signs and sparkles rising", true],
  ["VFX: status", "status_invulnerable", "Invulnerable", "a golden glowing dome with a halo"],
  ["VFX: status", "status_sleep", "Asleep", "a blue nightcap moon with small floating Z shapes"],
  // Ground: decals and rings drawn under units, seen from above at a 3/4 angle.
  ["VFX: ground", "ground_scorch", "Scorch mark", "a flat black-and-orange scorched ground patch with embers"],
  ["VFX: ground", "ground_frost", "Frost patch", "a flat icy frost patch with crystals on the ground"],
  ["VFX: ground", "ground_poison", "Poison puddle", "a flat bubbling green toxic puddle", true],
  ["VFX: ground", "ground_crater", "Crater", "a flat cracked rocky crater in the ground"],
  ["VFX: ground", "ground_holy", "Holy circle", "a flat glowing golden rune circle on the ground"],
  ["VFX: ground", "ground_shadow", "Shadow pool", "a flat swirling dark purple shadow pool"],
  ["VFX: ground", "boss_warning", "Boss warning ring", "a flat red danger ring with chevrons pointing inward, no text"],
  ...(["fire", "ice", "lightning", "nature", "poison", "arcane"] as const).map(
    (e): [string, string, string, string, boolean] => [
      "VFX: ground",
      `aura_${e}`,
      `Aura ring: ${e}`,
      `a flat glowing ${e} element aura ring seen at a 3/4 angle from above, for under an awakened unit, with ${
        { fire: "flames", ice: "ice crystals", lightning: "electric arcs", nature: "leaves and vines", poison: "toxic bubbles", arcane: "violet runes" }[e]
      } around the rim`,
      e === "nature" || e === "poison",
    ],
  ),
  // Particles: tiny sprites for particle emitters.
  ["VFX: particles", "pt_ember", "Particle: ember", "a single tiny glowing orange ember"],
  ["VFX: particles", "pt_snowflake", "Particle: snowflake", "a single white six-pointed snowflake"],
  ["VFX: particles", "pt_leaf", "Particle: leaf", "a single small green leaf", true],
  ["VFX: particles", "pt_bubble", "Particle: bubble", "a single small green toxic bubble", true],
  ["VFX: particles", "pt_rune", "Particle: rune", "a single small glowing violet rune symbol"],
  ["VFX: particles", "pt_star", "Particle: star", "a single small four-pointed white-gold sparkle star"],
  ["VFX: particles", "pt_coin", "Particle: coin", "a single shiny gold coin seen at a slight angle"],
  ["VFX: particles", "pt_gem", "Particle: gem", "a single small cut purple gem"],
  ["VFX: particles", "pt_heart", "Particle: heart", "a single small glossy red heart"],
  ["VFX: particles", "pt_smoke", "Particle: smoke", "a single soft grey cartoon smoke puff"],
  ["VFX: particles", "pt_feather", "Particle: feather", "a single small white feather"],
  ["VFX: particles", "pt_confetti", "Particle: confetti", "a small cluster of colorful confetti pieces"],
  // Rewards and UI moments.
  ["VFX: rewards", "level_up_arrow", "Level-up arrow", "a big glossy gold upward arrow with sparkles"],
  ["VFX: rewards", "light_rays", "Light rays", "a radial burst of soft golden light rays, for behind a reward"],
  ["VFX: rewards", "star_burst", "Star burst", "an explosion of gold stars and sparkles"],
  ["VFX: rewards", "chest_glow", "Chest glow", "a soft golden glow beam shooting upward with sparkles"],
  ["VFX: rewards", "merge_flash", "Merge flash", "a bright white-gold four-pointed flash with a ring"],
  ["VFX: rewards", "rarity_glow_legendary", "Legendary glow", "a radiant orange-gold glow ring with flares"],
  ["VFX: rewards", "rarity_glow_epic", "Epic glow", "a radiant purple glow ring with sparkles"],
  ["VFX: rewards", "rarity_glow_rare", "Rare glow", "a radiant blue glow ring with sparkles"],
];

/**
 * Melee weapons units throw instead of the generic spark (vfx/weapons/<key>.png). The art is
 * element-neutral: the game adds the element glow, particle trail and impact, so a future unit
 * just picks one. "spin" weapons rotate in flight, "straight" ones fly point-first, "strike" ones
 * appear at the target. [key, what, motion]
 */
const WEAPONS: [string, string, "spin" | "straight" | "strike"][] = [
  // Blades
  ["sword", "a classic steel knight's sword with a gold crossguard", "spin"],
  ["katana", "a slim curved katana with a wrapped hilt and round guard", "spin"],
  ["greatsword", "a huge two-handed steel greatsword", "spin"],
  ["dagger", "a short steel dagger with a leather grip", "spin"],
  ["twin_daggers", "two crossed steel daggers", "spin"],
  ["sabre", "a curved cavalry sabre with a brass hand guard", "spin"],
  ["scimitar", "a wide curved desert scimitar", "spin"],
  ["rapier", "a thin elegant rapier with a swept hilt", "spin"],
  ["cutlass", "a stubby pirate cutlass with a cup guard", "spin"],
  ["cleaver", "a big square butcher's cleaver", "spin"],
  // Axes and blunt
  ["axe", "a single-bladed wood-handled battle axe", "spin"],
  ["double_axe", "a big double-headed battle axe", "spin"],
  ["hammer", "a chunky steel war hammer with a wooden handle", "spin"],
  ["mace", "a flanged steel mace", "spin"],
  ["flail", "a spiked iron ball on a short chain and handle", "spin"],
  ["morning_star", "a spiked morning-star club", "spin"],
  ["club", "a knobbly wooden caveman club", "spin"],
  ["anchor", "a heavy iron ship anchor", "spin"],
  // Polearms
  ["spear", "a wooden spear with a leaf-shaped steel tip, pointing right", "straight"],
  ["lance", "a long striped jousting lance with a steel tip, pointing right", "straight"],
  ["trident", "a three-pronged steel trident, pointing right", "straight"],
  ["halberd", "a halberd with an axe blade and spike", "spin"],
  ["scythe", "a large curved reaper's scythe", "spin"],
  ["sickle", "a small curved hand sickle", "spin"],
  ["staff", "a long wooden staff with metal caps on both ends", "spin"],
  ["bo_staff", "a plain lacquered red bo staff", "spin"],
  // Thrown
  ["shuriken", "a four-pointed steel ninja star", "spin"],
  ["kunai", "a black steel kunai with a ring pommel, pointing right", "straight"],
  ["chakram", "a round steel chakram ring blade", "spin"],
  ["boomerang", "a carved wooden boomerang", "spin"],
  ["throwing_knife", "a slim balanced throwing knife, pointing right", "straight"],
  ["bola", "a bola: three stone weights tied together by cords", "spin"],
  // Body attacks
  ["palm_wave", "a glowing open-palm print shockwave", "strike"],
  ["fist_shockwave", "a big punching fist with a round shockwave ring", "strike"],
  ["claw_swipe", "three curved claw swipe arcs", "strike"],
  ["bite", "a pair of snapping cartoon jaws with sharp teeth", "strike"],
  ["tail_swipe", "a curved swoosh arc of a swinging tail", "strike"],
  ["horn_charge", "a pair of bull horns with a dust burst", "strike"],
  ["stomp_crack", "a flat cracked-ground stomp with flying rocks", "strike"],
  // Quirky
  ["frying_pan", "a black iron frying pan", "spin"],
  ["wrench", "a big steel adjustable wrench", "spin"],
  ["saw_blade", "a round toothed circular saw blade", "spin"],
  ["ladle", "a big soup ladle", "spin"],
  ["war_fan", "an open folding steel war fan", "spin"],
  ["bone", "a big cartoon bone", "spin"],
  ["pitchfork", "a three-tined farm pitchfork, pointing right", "straight"],
  // v2.8 Grunt: one axe per Berserker Strength tier (0..4).
  ["grunt_axe_0", "a crude stone hatchet lashed to a wooden handle", "spin"],
  ["grunt_axe_1", "a sturdy iron axe with a leather-wrapped handle", "spin"],
  ["grunt_axe_2", "a big bearded war axe with a curved iron blade", "spin"],
  ["grunt_axe_3", "a double-bladed battle axe with a bloodied edge", "spin"],
  ["grunt_axe_4", "a huge chieftain's axe with a flaming orange edge", "spin"],
];

/** Hand-made weapons for top-tier units, drawn from the unit's own sprite. [unit id, name, what] */
const SIGNATURE_WEAPONS: [string, string, string][] = [
  ["monkey_king", "Monkey King", "his golden staff with red bands at both ends, with a swirl of green leaves"],
  ["fox_samurai", "Fox Samurai", "his katana wreathed in violet foxfire flames"],
  ["rogue_knight", "Rogue Knight", "his two crossed daggers trailing orange embers"],
  ["pentagonal_knight", "Pentagonal Knight", "his war hammer crackling with yellow lightning"],
  ["berserker_sellsword", "Berserker Sellsword", "his huge notched greatsword trailing fire"],
  ["lance_knight", "Lance Knight", "his lance crackling with lightning, pointing right"],
];

/* ---------- Book 2 · Story 1: The Elven Wilds (v2.1) ---------- */
const MAGENTA = "Centered, full body, plenty of margin, on a solid flat pure magenta (#FF00FF) background with no shadow on the ground.";
const B2_GROUP = "v2.1 Arts Requirements";
const B2_ANCHOR = "assets/_green/v12/corrupted_villager.png";
const B2_MONSTER = "assets/_green/orc_brute.png";
const B2_BOSS = "assets/_green/lich_king.png";
const B2_VILLAGE = "assets/locations/arena_upside_down_village.png";
const B2_FARMER = "assets/_green/v12/corrupted_farmer.png";
const B2_FOLK = ["assets/_green/v12/corrupted_villager.png", B2_FARMER, "assets/_green/v12/corrupted_fisherman.png", "assets/_green/v12/corrupted_herbalist.png"];
const B2_HEROES = ["pentagonal_knight", "hired_blade", "berserker_sellsword"].map((k) => `assets/_green/v12/${k}.png`);
const PORTRAIT = "Head-and-shoulders bust portrait, three-quarter view, no frame.";
const EDIT = "Edit the reference arena image: keep the exact path shape, path position, build tiles and top-down camera unchanged; only repaint the scenery as:";

type B2Kind = "monster" | "boss" | "ally" | "portrait" | "status" | "arena" | "panel" | "cover";
/** [#, id, file, title, kind, refs (strings, or # of another item in this batch), subject / scene] */
const B2: [number, string, string, string, B2Kind, (string | number)[], string][] = [
  [1, "corrupted_elf_scout", "monsters/corrupted_elf_scout.png", "Corrupted elf scout", "monster", [],
    "Lean corrupted elf scout sprinting, dark purple skin, glowing violet eyes, small chaos tentacles curling from torn green leather armor, twin daggers, pointed ears, ragged hood."],
  [2, "corrupted_elf_warrior", "monsters/corrupted_elf_warrior.png", "Corrupted elf warrior", "monster", [],
    "Corrupted elf warrior, dark purple skin, violet eyes, cracked leaf-pattern armor oozing purple chaos, curved elven sword raised, marching pose."],
  [3, "corrupted_elf_archer", "monsters/corrupted_elf_archer.png", "Corrupted elf archer", "monster", [],
    "Corrupted elf archer drawing a thorny dark longbow, purple skin, violet eyes, chaos tendrils on the quiver, tattered green cloak."],
  [4, "corrupted_elf_warden", "monsters/corrupted_elf_warden.png", "Corrupted elf warden", "monster", [],
    "Heavy corrupted elf warden, dark purple skin, big leaf-shaped tower shield cracked with violet glow, bark-and-steel armor, slow sturdy stance."],
  [5, "corrupted_sapling", "monsters/corrupted_sapling.png", "Corrupted sapling", "monster", [],
    "Small walking corrupted treant sapling, twisted bark body, purple glowing knot-eyes, violet thorn vines for arms, a few dying leaves, stubby root legs."],
  [6, "elf_captain_morvane", "bosses/elf_captain_morvane.png", "Captain Morvane", "boss", [],
    "Corrupted elf captain, tall, fully dark-purple skin, glowing violet eyes, long silver hair streaked with black, ornate elven officer armor with a torn crimson sash, a commander's longsword, chaos tentacles from his back, intimidating boss pose."],
  [7, "elf_captain_sylris", "bosses/elf_captain_sylris.png", "Captain Sylris", "boss", [],
    "Corrupted elf captain archer, dark purple skin, one eye covered by a cracked leaf mask, huge recurve bow of black wood with violet bowstring glow, three arrows nocked, long braided hair, light ranger armor, boss pose."],
  [8, "elf_captain_kaelen", "bosses/elf_captain_kaelen.png", "Captain Kaelen", "boss", [],
    "Corrupted elf captain duelist with two curved elven swords crossed in a guard stance, dark purple skin, violet eyes, sleek dark armor with leaf-blade pauldrons, chaos energy along both blades, boss pose."],
  [9, "thalmyr_half", "bosses/thalmyr_half.png", "Thalmyr, the Torn Guardian (stag)", "boss", [],
    "Colossal ancient forest guardian stag, majestic, with huge branching antlers grown with moss, leaves and tiny glowing flowers. The LEFT half of the body is healthy (green moss, warm bark-brown fur, golden eyes). The RIGHT half is corrupted (dark purple, cracked, violet glowing veins, chaos tentacles, thorny blackened antler side). A struggling expression, side view facing right, boss scale."],
  [10, "vaeltharion", "bosses/vaeltharion.png", "Vaeltharion, the Elven Commander", "boss", [],
    "Vaeltharion the Elven Commander, corrupted. Tall regal elf general, dark purple skin, burning violet eyes, long white hair, a tall crown-like antler helm, flowing dark-green and black war cape, ornate elven plate armor with violet chaos cracks. A spear-glaive in one hand; the other hand raised with thorny blight roots coiling. Imposing final-boss pose."],
  [11, "ally_elf_spearman", "story/allies/ally_elf_spearman.png", "Ally: elf spearman", "ally", [],
    "Proud forest elf spearman charging, green and gold leaf armor, healthy fair skin, determined face, spear forward."],
  [12, "ally_gnome", "story/allies/ally_gnome.png", "Ally: gnome", "ally", [],
    "Small bearded forest gnome charging with a tiny axe, mushroom cap hat, brave shout."],
  [13, "ally_fae", "story/allies/ally_fae.png", "Ally: fae", "ally", [],
    "Glowing forest fae with dragonfly wings flying forward, trailing green sparkles."],
  [14, "ally_earth_elemental", "story/allies/ally_earth_elemental.png", "Ally: earth elemental", "ally", [],
    "Chunky moss-and-stone earth elemental rushing forward, glowing green crystal core."],
  [15, "ally_forest_beast", "story/allies/ally_forest_beast.png", "Ally: forest beast", "ally", [],
    "Great antlered forest wolf (or boar) running at full speed, leaves in its fur, friendly glowing green eyes."],
  [16, "queen_aelyria", "story/portraits/queen_aelyria.png", "Portrait: Queen Aelyria", "portrait", [],
    "Aelyria, Queen of the Elves. Breathtakingly beautiful elf queen, long flowing golden-blond hair, delicate silver leaf circlet, emerald eyes. A worn and travel-torn royal gown in green and ivory with a low V-neckline, frayed hems, small scratches, dignified but weary expression. Soft forest light. Tasteful and modest, non-explicit."],
  [17, "portrait_thalmyr_half", "story/portraits/thalmyr_half.png", "Portrait: Thalmyr (torn)", "portrait", [9],
    "Bust of the corrupted guardian stag Thalmyr from the reference, left half healthy and right half corrupted, pained noble expression."],
  [18, "thalmyr_cleansed", "story/portraits/thalmyr_cleansed.png", "Portrait: Thalmyr (cleansed)", "portrait", [9],
    "The same stag as the reference, fully healed: radiant green moss, golden glowing eyes, blossoming antlers, no purple corruption at all, calm noble expression."],
  [19, "portrait_vaeltharion", "story/portraits/vaeltharion.png", "Portrait: Vaeltharion", "portrait", [10],
    "Bust of Vaeltharion from the reference, fierce expression, burning violet eyes."],
  [20, "forest_villager", "story/portraits/forest_villager.png", "Portrait: forest villager", "portrait", [B2_FARMER],
    "Breathless young villager in a simple tunic, leaves in hair, worried face. Same character style as the reference but uncorrupted (healthy natural skin, no violet eyes, no tentacles)."],
  [21, "arena_elven_deepwood", "locations/arena_elven_deepwood.png", "Arena: Elven Deepwood", "arena", ["assets/locations/arena_mushroom_forest.png"],
    "a deep ancient elven forest: towering silver-barked trees, hanging lanterns, elven stone arches, ferns, soft god-rays. Healthy and green, no corruption."],
  [22, "arena_guardian_grove", "locations/arena_guardian_grove.png", "Arena: Guardian Grove", "arena", ["assets/locations/arena_mushroom_forest.png"],
    "a deeper, older forest heart: giant mossy roots, a ring of standing stones, a glowing sacred pool, a few faint purple cracks creeping in at the edges only."],
  [23, "arena_rocky_summit", "locations/arena_rocky_summit.png", "Arena: Rocky Summit", "arena", ["assets/locations/arena_tundra.png"],
    "a rocky mountain summit: grey cliffs, boulders, sparse twisted pines, an elven ruined watchtower at the top, wind-swept, a faint violet chaos haze in the sky."],
  [24, "b2s1_p1_restored", "story/panels/b2s1_p1_restored.png", "Panel 1: the restored village", "panel", [B2_VILLAGE, ...B2_FOLK],
    "The restored village, sunny; cheering villagers (uncorrupted, healthy and happy) thank the heroes."],
  [25, "b2s1_p2_farewell", "story/panels/b2s1_p2_farewell.png", "Panel 2: farewell", "panel", B2_HEROES,
    "Knights and mercenaries ride off down separate roads at sunset."],
  [26, "b2s1_p3_runner", "story/panels/b2s1_p3_runner.png", "Panel 3: the runner", "panel", [20],
    "A breathless villager runs in from a forested mountain, pointing back in alarm."],
  [27, "b2s1_p4_fleeing", "story/panels/b2s1_p4_fleeing.png", "Panel 4: the fleeing folk", "panel", [11, 12, 13, 14, 15],
    "Elves, gnomes, fae, elementals and forest beasts flee through a deep forest."],
  [28, "b2s1_p5_queen_pleads", "story/panels/b2s1_p5_queen_pleads.png", "Panel 5: the Queen pleads", "panel", [16, 27],
    "Queen Aelyria steps forward, hand outstretched, pleading for help; a purple glow far behind her."],
  [29, "b2s1_p6_the_commander", "story/panels/b2s1_p6_the_commander.png", "Panel 6: the commander", "panel", [16, 10],
    "The Queen, solemn; inset vision of Vaeltharion silhouetted on a rocky peak under a violet sky."],
  [30, "b2s1_p7_guardian", "story/panels/b2s1_p7_guardian.png", "Panel 7: the guardian", "panel", [9],
    "Thalmyr looms between giant trees, half radiant and half corrupted, roaring in pain."],
  [31, "b2s1_p8_guardian_falls", "story/panels/b2s1_p8_guardian_falls.png", "Panel 8: the guardian falls", "panel", [9],
    "Thalmyr kneels, wounded but alive, speaking softly; the Forest Orb is mentioned with a glowing orb motif."],
  [32, "b2s1_p9_summit", "story/panels/b2s1_p9_summit.png", "Panel 9: the summit army", "panel", [2, 3, 6, 7, 8],
    "At the summit, a vast army of corrupted elves, with the three captains in front."],
  [33, "b2s1_p10_orb", "story/panels/b2s1_p10_orb.png", "Panel 10: the Forest Orb", "panel", [10],
    "Vaeltharion holds up the Forest Orb, half green and half violet, smirking: \"Do not force it.\" (no lettering in the image)."],
  [34, "b2s1_p11_charge", "story/panels/b2s1_p11_charge.png", "Panel 11: the charge (mid-battle)", "panel", [16, 11, 12, 13, 14, 15],
    "Queen Aelyria raises a glowing staff: \"Nature's Attendants, Charge!\" (no lettering in the image). A wave of forest creatures surges behind her."],
  [35, "b2s1_p12_mad", "story/panels/b2s1_p12_mad.png", "Panel 12: mad Vaeltharion (mid-battle)", "panel", [10],
    "Close-up: Vaeltharion screaming in rage, violet energy flaring, cracks spreading."],
  [36, "b2s1_p13_broken", "story/panels/b2s1_p13_broken.png", "Panel 13: broken", "panel", [10],
    "Vaeltharion on his knees, armor shattered, head bowed, accepting defeat."],
  [37, "b2s1_p14_cleansed", "story/panels/b2s1_p14_cleansed.png", "Panel 14: cleansed", "panel", [9, 18, 33],
    "Thalmyr bends and swallows the Forest Orb; a burst of green light washes the corruption away."],
  [38, "b2s1_p15_dust", "story/panels/b2s1_p15_dust.png", "Panel 15: dust", "panel", [10],
    "Vaeltharion fades into drifting golden dust, a calm sad face: \"I only wanted the elves to be seen.\" (no lettering in the image)."],
  [39, "b2s1_p16_beyond", "story/panels/b2s1_p16_beyond.png", "Panel 16: beyond", "panel", [16, "assets/locations/world_map.png"],
    "The Queen and the player on the cliff look over a world map horizon with distant violet corruption spots."],
  [40, "book2_story1_elven_wilds", "story/covers/book2_story1_elven_wilds.png", "Cover: The Elven Wilds", "cover", [9, 10, 16],
    "Cover art: Vaeltharion on the rocky peak, Thalmyr's half-corrupted antlers framing him, Queen Aelyria in the foreground, violet sky, epic."],
  [41, "book2_chaos_corrupted", "story/covers/book2_chaos_corrupted.png", "Cover: Book 2 Chaos Corrupted", "cover", [],
    "Book-tab art: a cracked violet Chaos sigil over a forest and a mountain silhouette. No characters."],
  [42, "morvane", "story/portraits/morvane.png", "Portrait: Captain Morvane", "portrait", [6],
    "Bust of Captain Morvane from the reference (generate the boss sprite first), commanding sneer, glowing violet eyes."],
  [43, "sylris", "story/portraits/sylris.png", "Portrait: Captain Sylris", "portrait", [7],
    "Bust of Captain Sylris from the reference (generate the boss sprite first), cracked leaf mask over one eye, cold focused gaze."],
  [44, "kaelen", "story/portraits/kaelen.png", "Portrait: Captain Kaelen", "portrait", [8],
    "Bust of Captain Kaelen from the reference (generate the boss sprite first), confident duelist smirk, violet eyes."],
  [45, "status_entangled", "ui/status_entangled.png", "Status icon: entangled", "status", ["assets/ui/status_shellshock.png", "assets/ui/status_irritation.png", "ui/icon_buttons_set.webp"],
    "Status badge icon: thorny green-and-violet vines wrapped tight in a knot, inside a round dark badge, matching the reference status badges."],
];

const B2_FILE = new Map(B2.map(([n, , file]) => [n, `assets/${file}`]));

export const BOOK2_S1_REQUESTS: ArtRequest[] = B2.map(([n, id, file, title, kind, refs, what]) => {
  const own = refs.map((r) => (typeof r === "number" ? B2_FILE.get(r)! : r));
  const pre = refs.filter((r): r is number => typeof r === "number");
  const base =
    kind === "monster" ? [STYLE_ANCHOR, B2_MONSTER, B2_ANCHOR]
    : kind === "boss" ? [STYLE_ANCHOR, B2_BOSS, B2_ANCHOR]
    : kind === "arena" ? []
    : [STYLE_ANCHOR];
  const notes = pre.length ? [`NOTE: generate #${pre.join(", #")} first and attach ${pre.map((r) => B2_FILE.get(r)).join(", ")}`] : [];
  const prompt =
    kind === "monster" || kind === "boss" || kind === "ally" ? `${STYLE} ${what} ${MAGENTA}`
    : kind === "portrait" ? `${STYLE} ${PORTRAIT} ${what} ${MAGENTA}`
    : kind === "status" ? `${STYLE} ${what} ${ICON.replace("green (#00FF00)", "magenta (#FF00FF)")}`
    : kind === "panel" ? `${STYLE} ${CAST} ${what} Wide cinematic 16:9 story panel.`
    : kind === "cover" ? `${STYLE} ${CAST} ${what} ${HOLD}`
    : `${EDIT} ${what}`;
  return {
    id: `book2s1:${id}`,
    group: B2_GROUP,
    title: `#${n} ${title}`,
    file,
    model: kind === "cover" ? "Seedream 4.5" : "Nano Banana 2",
    aspect: kind === "panel" ? "16:9" : kind === "arena" ? "9:16" : kind === "cover" ? "4:5" : "1:1",
    refs: [...notes, ...(kind === "arena" || kind === "status" ? [...own, STYLE_ANCHOR] : [...base, ...own])],
    prompt,
  };
});

/* ---------- Book 2 · Stories 2 and 3: The Drowned Coast and The Throne of Dust (v2.2) ---------- */
const B22_GROUP = "v2.2 Arts Requirements";
const B22_PIRATE = "assets/locations/arena_pirate_beach.png";
const B22_REEF = "assets/locations/arena_coral_reef.png";
const B22_DESERT = "assets/locations/arena_desert.png";

type B22Kind = B2Kind | "prop" | "card" | "cardportrait";
/**
 * [id, file, title, kind, refs, subject / scene]. A ref that is another row's id means that row's finished
 * image (make it first); any other ref is a raw-pack or game path.
 */
type B22Row = [string, string, string, B22Kind, string[], string];

const B22: B22Row[] = [
  // ----- Story 2: The Drowned Coast -----
  ["reef_crab", "monsters/reef_crab.png", "Reef crab", "monster", [],
    "Hulking reef crab the size of a cartwheel, barnacle-crusted shell with cracks of violet glow, one oversized claw raised, sideways scuttling stance, seaweed hanging off its legs."],
  ["drowned_sailor", "monsters/drowned_sailor.png", "Drowned sailor", "monster", [],
    "Drowned sailor zombie in a tattered striped shirt and sailor cap, pale blue-grey skin, seaweed in the hair, glowing violet eyes, small violet barnacles on the shoulders, shambling pose, dripping."],
  ["drowned_corsair", "monsters/drowned_corsair.png", "Drowned corsair", "monster", [],
    "Drowned corsair, a stocky undead pirate with a tricorn hat full of holes, barnacle-crusted breastplate, a rusty cutlass, glowing violet eyes, coral growing from one shoulder, menacing march."],
  ["eel_swimmer", "monsters/eel_swimmer.png", "Eel swimmer", "monster", [],
    "Slim electric-green sea eel swimming upright through the air as if through water, sharp teeth, glowing violet eyes, a ribbon of violet chaos trailing from its tail, fast streamlined pose."],
  ["barnacle_spawn", "monsters/barnacle_spawn.png", "Barnacle spawn", "monster", [],
    "Small walking cluster of violet-crusted barnacles with two stubby legs and one big glowing violet eye, tiny snapping shell mouths, wet and spiky."],
  ["grell", "bosses/grell.png", "Bosun Grell", "boss", [],
    "Drowned bosun boss, broad and brutal, a ship's anchor on a heavy chain over his shoulder, barnacle-crusted bosun's coat and hat, bosun's whistle on his neck, pale blue-grey skin, glowing violet eyes, boss pose."],
  ["lusca", "bosses/lusca.png", "Lusca the Siren", "boss", [],
    "Lusca the Siren, a haunting sea-witch with long drifting teal hair, fish-fin ears, pearl jewelry, a tattered dark-blue gown that fades into tentacles, mouth open mid-song with violet sound rings around her, glowing violet eyes, boss pose."],
  ["ondrath", "bosses/ondrath.png", "Ondrath, the Sleeping Isle (corrupted)", "boss", [],
    "Colossal ancient sea turtle with a small green island on its back (a few palm trees, rocks, a tiny ruined hut), shell and flippers crusted with glowing violet barnacles and cracks, a pained expression, side view facing right, boss scale."],
  ["corvaline", "bosses/corvaline.png", "Corvaline, Keeper of the Lantern", "boss", [],
    "Corvaline, an old stern lighthouse keeper woman, weathered face, grey hair in a tight bun under a sou'wester, long oilskin coat, one hand holding a glowing violet-and-gold lantern lamp that casts a beam, glowing violet eyes, tide-wet boots, boss pose."],
  ["ondrath_cleansed", "bosses/ondrath_cleansed.png", "Ondrath, the Sleeping Isle (cleansed)", "boss", ["ondrath"],
    "The same sea turtle island as the reference, fully healed: clean teal shell, flowering island, calm golden eyes, no purple at all."],
  ["ally_merfolk_warrior", "story/allies/ally_merfolk_warrior.png", "Ally: merfolk warrior", "ally", [],
    "Proud merfolk warrior charging forward with a short coral sword, teal scales, fin crest, shell armor, determined face."],
  ["ally_merfolk_spear", "story/allies/ally_merfolk_spear.png", "Ally: merfolk spear", "ally", [],
    "Merfolk spear thrower charging with a long trident-tipped spear, blue scales, pearl necklace, battle cry."],
  ["ally_tide_spirit", "story/allies/ally_tide_spirit.png", "Ally: tide spirit", "ally", [],
    "A friendly tide spirit, a curling wave shaped like a smiling figure, foam crest, glowing aqua eyes, rushing forward."],
  ["ally_ondrath", "story/allies/ally_ondrath.png", "Ally: Ondrath", "ally", ["ondrath_cleansed"],
    "Ondrath the sea turtle isle charging forward, cleansed and radiant, waves crashing off his flippers (use the reference, smaller island on his back)."],
  ["corvaline_portrait", "story/portraits/corvaline.png", "Portrait: Corvaline", "portrait", ["corvaline"],
    "Bust of Corvaline from the reference, stern weathered face, violet-glinting eyes, wet grey strands of hair."],
  ["pearl", "story/portraits/pearl.png", "Portrait: Pearl", "portrait", [],
    "Pearl, a young merfolk scout girl with short teal hair under a hood of woven kelp, big wary brown eyes (the same eye color as an old lighthouse keeper), a small pearl earring, a shy half-smile. Same style as the other story portraits."],
  ["maren_portrait", "story/portraits/maren.png", "Portrait: Maren (Pearl unhooded)", "portrait", ["pearl"],
    "The same girl as the reference with her hood pulled back: teal-streaked dark hair, brown eyes, a hopeful tearful smile, tiny scale shimmer on her cheeks."],
  ["ondrath_corrupted", "story/portraits/ondrath_corrupted.png", "Portrait: Ondrath (corrupted)", "portrait", ["ondrath"],
    "Bust of the corrupted turtle Ondrath from the reference, pained, violet barnacles on his brow."],
  ["ondrath_cleansed_portrait", "story/portraits/ondrath_cleansed.png", "Portrait: Ondrath (cleansed)", "portrait", ["ondrath_cleansed"],
    "Bust of Ondrath, cleansed, from the reference, wise calm eyes, a little flowering moss on his brow."],
  ["grell_portrait", "story/portraits/grell.png", "Portrait: Bosun Grell", "portrait", ["grell"],
    "Bust of Bosun Grell from the reference, scowling, hat low, bosun's whistle between his teeth."],
  ["lusca_portrait", "story/portraits/lusca.png", "Portrait: Lusca", "portrait", ["lusca"],
    "Bust of Lusca the Siren from the reference, eyes half closed, singing."],
  ["saltmere_villager", "story/portraits/saltmere_villager.png", "Portrait: Saltmere villager", "portrait", [B2_FARMER],
    "A worried fishing-village woman in a knitted cap and shawl, windblown hair, uncorrupted, wide anxious eyes. Same style as the reference but a different, healthy character."],
  ["status_submerged", "ui/status_submerged.png", "Status icon: submerged", "status", ["assets/ui/status_shellshock.png", "assets/ui/status_irritation.png", "ui/icon_buttons_set.webp"],
    "Status badge icon: a small unit shape under rippling blue water with rising bubbles, inside a round dark badge, matching the reference status badges."],
  ["status_asleep", "ui/status_asleep.png", "Status icon: asleep", "status", ["assets/ui/status_shellshock.png", "assets/ui/status_irritation.png", "ui/icon_buttons_set.webp"],
    "Status badge icon: a blue crescent moon with three small Zs and a tiny musical note, inside a round dark badge, matching the reference status badges."],
  ["status_glimmered", "ui/status_glimmered.png", "Status icon: glimmered", "status", ["assets/ui/status_shellshock.png", "assets/ui/status_irritation.png", "ui/icon_buttons_set.webp"],
    "Status badge icon: a dazzling violet-and-gold lantern light burst with a downward arrow, inside a round dark badge, matching the reference status badges."],
  ["tide_pool", "props/tide_pool.png", "Prop: tide pool", "prop", [],
    "A small round tidal pool seen from above at a slight angle: a ring of wet rocks, shimmering teal water, a tiny starfish and a few small fish, plus a faded violet crust at one edge."],
  ["tide_meter", "ui/tide_meter.png", "UI: tide meter", "prop", ["ui/hud_elements.webp"],
    "A horizontal tide meter bar: a rounded dark frame with a wave-shaped blue fill, a small moon marker at the high end and a small sun marker at the low end, matching the reference HUD elements."],
  ["arena_stranded_harbor", "locations/arena_stranded_harbor.png", "Arena: The Stranded Harbor (low tide)", "arena", [B22_PIRATE],
    "a drained harbor at low tide: wide wet mudflats, beached sailing ships tilted on their sides, stranded fishing boats, gasping merfolk in small shining pools, a faint violet shimmer on the horizon, dusky sky. Keep the sand strip where the path runs."],
  ["arena_ondrath_isle", "locations/arena_ondrath_isle.png", "Arena: Ondrath's back", "arena", [B22_REEF],
    "the mossy shell-ridged back of a giant sea turtle seen from above: grassy shell plates, rock pools, driftwood, glowing violet barnacle patches, the sea all around. Keep the ring path shape."],
  ["arena_lantern_causeway", "locations/arena_lantern_causeway.png", "Arena: The Lantern Causeway (low tide)", "arena", [B22_PIRATE],
    "a long stone causeway across a still, glassy sea toward a tall lighthouse at the world's edge, wet black rocks, still water like a mirror, violet beam light on the clouds, stormy dusk."],
  ["arena_stranded_harbor_high", "locations/arena_stranded_harbor_high.png", "Arena: The Stranded Harbor (high tide)", "arena", ["arena_stranded_harbor"],
    "the same harbor with the tide in: the mudflats flooded with shallow blue water, beached ships floating level, the low tiles under rippling water."],
  ["arena_ondrath_isle_high", "locations/arena_ondrath_isle_high.png", "Arena: Ondrath's back (thrashing)", "arena", ["arena_ondrath_isle"],
    "the same turtle back mid-roll: heaving tilted shell plates, spray and foam crashing over the edges, cracks glowing violet."],
  ["arena_lantern_causeway_high", "locations/arena_lantern_causeway_high.png", "Arena: The Lantern Causeway (high tide)", "arena", ["arena_lantern_causeway"],
    "the same causeway with the tide surging in: big waves washing over the low stones, white foam, the lighthouse beam blazing."],
  ["b2s2_p1_shard", "story/panels/b2s2_p1_shard.png", "Panel S2-1: the escaping shard", "panel", ["assets/story/panels/b2s1_p14_cleansed.png"],
    "Green Orb light washes outward, and one violet shard slips out and streaks west toward the sea across a dusky sky."],
  ["b2s2_p2_queen_sends", "story/panels/b2s2_p2_queen_sends.png", "Panel S2-2: the Queen sends the Keeper", "panel", ["assets/story/portraits/queen_aelyria.png"],
    "Queen Aelyria points west toward a faint violet streak in the sky, concerned, a cliff-top overlook, sea in the distance."],
  ["b2s2_p3_drained_bay", "story/panels/b2s2_p3_drained_bay.png", "Panel S2-3: the drained bay", "panel", ["arena_stranded_harbor", "reef_crab", "drowned_sailor"],
    "A wide drained bay of mud, beached ships, merfolk gasping in small shrinking pools; far off in the mud a few crabs crawl toward a village."],
  ["b2s2_p4_pearl", "story/panels/b2s2_p4_pearl.png", "Panel S2-4: Pearl", "panel", ["pearl"],
    "Pearl, hooded, hauls herself onto the rocks and points at a far lighthouse; she looks frightened of it."],
  ["b2s2_p5_ondrath_found", "story/panels/b2s2_p5_ondrath_found.png", "Panel S2-5: Ondrath found", "panel", ["ondrath", "arena_stranded_harbor"],
    "Ondrath, the island-turtle, lies in the drained bay, crusted with violet barnacles; tiny figures at his feet."],
  ["b2s2_p6_isle_rolls", "story/panels/b2s2_p6_isle_rolls.png", "Panel S2-6: the isle rolls", "panel", ["ondrath"],
    "Ondrath rolls in pain, the whole island heaving and tilting, rocks and trees sliding."],
  ["b2s2_p7_ondrath_cleansed", "story/panels/b2s2_p7_ondrath_cleansed.png", "Panel S2-7: Ondrath cleansed", "panel", ["ondrath_cleansed", "pearl"],
    "The barnacles crack and fall away; Ondrath breathes again, eyes gold, a small figure (Pearl) at his flipper listening to him."],
  ["b2s2_p8_causeway", "story/panels/b2s2_p8_causeway.png", "Panel S2-8: the causeway", "panel", ["arena_lantern_causeway"],
    "A long causeway to a tall lighthouse; its violet-and-gold beam sweeps the sea, turning what it touches violet."],
  ["b2s2_p9_corvaline", "story/panels/b2s2_p9_corvaline.png", "Panel S2-9: Corvaline", "panel", ["corvaline"],
    "Corvaline in the lamp room, one hand on the great lamp, a small framed portrait of a little girl on the shelf behind her; a glowing Orb in the lamp."],
  ["b2s2_p10_tide_returns", "story/panels/b2s2_p10_tide_returns.png", "Panel S2-10: the tide returns (mid-battle)", "panel", ["ondrath_cleansed", "ally_merfolk_warrior", "ally_merfolk_spear", "pearl"],
    "Ondrath rises from the bay shaking off barnacles; a wave of merfolk rides in on the returning tide, Pearl in front."],
  ["b2s2_p11_lantern_flares", "story/panels/b2s2_p11_lantern_flares.png", "Panel S2-11: the lantern flares (mid-battle)", "panel", ["corvaline"],
    "The lantern flares violet-white; Corvaline screams, wind whipping her coat, waves crashing against the lighthouse."],
  ["b2s2_p12_mother", "story/panels/b2s2_p12_mother.png", "Panel S2-12: Mother! (mid-battle)", "panel", ["maren_portrait", "corvaline"],
    "Pearl pulls back her hood and cries out; she and the lighthouse keeper have the same brown eyes."],
  ["b2s2_p13_falter", "story/panels/b2s2_p13_falter.png", "Panel S2-13: the beam falters (mid-battle)", "panel", ["corvaline", "maren_portrait"],
    "The beam stutters; Corvaline's hands tremble on the lamp, tears in her eyes, staring at the girl below."],
  ["b2s2_p14_cracks", "story/panels/b2s2_p14_cracks.png", "Panel S2-14: the lantern cracks", "panel", ["corvaline"],
    "The great lamp cracks; Corvaline kneels on the wet stone, the violet light dying."],
  ["b2s2_p15_reunion", "story/panels/b2s2_p15_reunion.png", "Panel S2-15: reunion", "panel", ["maren_portrait", "corvaline"],
    "Maren takes her mother's hand; both crying and smiling, dawn light on the sea."],
  ["b2s2_p16_orb_returns", "story/panels/b2s2_p16_orb_returns.png", "Panel S2-16: the Orb returns", "panel", ["ondrath_cleansed", "corvaline"],
    "The glowing Tide Orb sinks back into Ondrath's shell; waves breathe in and out again; Corvaline relights the lamp with a plain orange flame."],
  ["b2s2_p17_shards", "story/panels/b2s2_p17_shards.png", "Panel S2-17: two shards meet", "panel", [],
    "In pure darkness, two glowing violet shards drift together, and a gloved hand (no face visible, no body) closes over them."],
  ["book2_story2_drowned_coast", "story/covers/book2_story2_drowned_coast.png", "Cover: The Drowned Coast", "cover", ["corvaline", "pearl", "ondrath"],
    "Cover art: the lighthouse at the world's edge under a violet-and-gold beam, Ondrath's shell rising from the sea, Pearl in the foreground reaching toward the light."],
  ["maren", "units/maren.png", "Story card: Maren, the Tide-Born (still)", "card", ["maren_portrait", "units/tide_mermaid.webp"],
    "Maren, the Tide-Born: a young woman grown from Pearl, teal-streaked dark hair, a flowing blue-and-white tide-silk dress with a wave-crest cape, bare feet with a faint scale shimmer, a pearl-tipped staff, a gentle healing wave swirling around her. Confident supportive pose, facing slightly right."],
  ["maren_card", "cards/portraits/maren.png", "Story card: Maren (card portrait)", "cardportrait", ["maren"],
    "Trading-card portrait of Maren from the first reference, bust from the chest up, three-quarter view, filling the square, with a soft pearly aqua tide background. Square 1:1, full-bleed, no card frame, no border, no text."],

  // ----- Story 3: The Throne of Dust -----
  ["faceless_soldier", "monsters/faceless_soldier.png", "Faceless soldier (masked)", "monster", [],
    "Faceless soldier, a desert city guard with a smooth blank sandstone-colored mask over the whole face (no eyes, no mouth), identical plain sand-colored armor and short spear, marching in step, a faint violet glow along the cracks of the mask."],
  ["faceless_archer", "monsters/faceless_archer.png", "Faceless archer (masked)", "monster", ["faceless_soldier"],
    "The same faceless mask and plain sand-colored uniform as the reference, but holding a short recurve bow, a quiver on the back, drawing an arrow."],
  ["faceless_civilian", "monsters/faceless_civilian.png", "Faceless civilian (masked)", "monster", ["faceless_soldier"],
    "The same smooth blank sandstone mask as the reference, on a plain unarmed townsperson in a long sand-colored robe, hands clasped, shuffling in step, a faint violet glow in the cracks of the mask."],
  ["faceless_soldier_unmasked", "monsters/faceless_soldier_unmasked.png", "Faceless soldier (unmasked)", "monster", ["faceless_soldier"],
    "The same soldier as the reference but the mask has cracked and fallen away: a real, angry human face (dark skin, scarred brow, glowing violet eyes), same armor."],
  ["faceless_civilian_unmasked", "monsters/faceless_civilian_unmasked.png", "Faceless civilian (unmasked)", "monster", ["faceless_civilian"],
    "The same townsperson as the reference but the mask has fallen away: a frightened, kind human face, no violet glow, same robe, stumbling toward freedom."],
  ["scarab", "monsters/scarab.png", "Scarab", "monster", [],
    "Big armored desert scarab beetle, glossy gold-and-blue shell with hieroglyph markings, violet glow in the shell cracks, six strong legs, scuttling pose."],
  ["jackal", "monsters/jackal.png", "Jackal", "monster", [],
    "Lean desert jackal sprinting, sand-colored fur, a gold collar, glowing violet eyes, a ragged ribbon of violet chaos trailing from the ears."],
  ["faceless_herald", "bosses/faceless_herald.png", "The Faceless Herald", "boss", ["faceless_soldier"],
    "The Faceless Herald, tall and thin, the same blank sandstone mask as the reference but gilded, a long white-and-gold herald's robe, a tall staff with a mirror disc on top, a ghostly mirrored copy of a warrior shimmering at his side, boss pose."],
  ["dune_warden", "bosses/dune_warden.png", "The Dune Warden (with wyrm)", "boss", [],
    "The Dune Warden, a veiled desert rider in a wind-torn indigo cloak with a curved spear, riding a huge sand wyrm bursting out of a dune, sand streaming off its armored segments, violet eyes glowing through the veil, boss pose."],
  ["sefa", "bosses/sefa.png", "Sefa the Chainbreaker", "boss", [],
    "Sefa the Chainbreaker, a tall powerful gladiator queen seated half-risen from a sand-and-bone throne, a sun-gold circlet, battle scars, broken old manacles on both wrists, glowing violet chains of light wrapped around her body and anchored to the throne (six chains), a mournful proud expression, boss pose."],
  ["sefa_statue", "bosses/sefa_statue.png", "Sefa (sandstone statue)", "boss", ["sefa"],
    "The same queen as the reference turned into a calm sandstone statue standing at an arena gate, one hand raised as if holding up the wall, no chains, soft gold light."],
  ["nefrael_caged", "props/nefrael_caged.png", "Nefrael in her cage", "prop", [],
    "A proud riddle sphinx (lioness body, feathered wings, a calm wise woman's face with a gold headdress) crouched in a hanging golden cage with a heavy glowing padlock, the cage seen at a slight angle."],
  ["nefrael_free", "bosses/nefrael_free.png", "Nefrael (freed)", "boss", ["nefrael_caged"],
    "The same sphinx as the reference, freed and roaring, the cage open and broken behind her, wings spread wide."],
  ["ally_gladiator", "story/allies/ally_gladiator.png", "Ally: freed gladiator", "ally", [],
    "A freed gladiator charging, bare face unmasked and proud, a broken chain on one wrist, a round shield and short sword."],
  ["ally_spearwoman", "story/allies/ally_spearwoman.png", "Ally: freed spearwoman", "ally", [],
    "A freed townswoman spearwoman charging, her mask thrown aside, a headscarf, a long spear, fierce face."],
  ["ally_slinger", "story/allies/ally_slinger.png", "Ally: freed slinger", "ally", [],
    "A freed young slinger swinging a sling overhead, mask thrown aside, scrappy and brave."],
  ["ally_nefrael", "story/allies/ally_nefrael.png", "Ally: Nefrael", "ally", ["nefrael_free"],
    "Nefrael the sphinx charging forward with a mighty roar, wings spread, shock rings spreading from her mouth."],
  ["sefa_portrait", "story/portraits/sefa.png", "Portrait: Sefa", "portrait", ["sefa"],
    "Bust of Sefa from the reference, proud, tired eyes, violet chain-light around her shoulders."],
  ["bako", "story/portraits/bako.png", "Portrait: Bako", "portrait", [],
    "Bako, a broad cheerful gladiator with a short beard, a shaved head, a leather arena harness, a broken iron manacle on one wrist, a rueful half-smile. Same style as the other story portraits."],
  ["nefrael", "story/portraits/nefrael.png", "Portrait: Nefrael", "portrait", ["nefrael_caged"],
    "Bust of Nefrael from the reference, serene and amused, a riddle in her eyes."],
  ["faceless_herald_portrait", "story/portraits/faceless_herald.png", "Portrait: the Faceless Herald", "portrait", ["faceless_herald"],
    "Bust of the Faceless Herald from the reference, blank gilded mask, mirror-staff at the shoulder."],
  ["dune_warden_portrait", "story/portraits/dune_warden.png", "Portrait: the Dune Warden", "portrait", ["dune_warden"],
    "Bust of the Dune Warden from the reference, indigo veil, only the glowing violet eyes visible."],
  ["status_masked", "ui/status_masked.png", "Status icon: masked", "status", ["assets/ui/status_shellshock.png", "assets/ui/status_irritation.png", "ui/icon_buttons_set.webp"],
    "Status badge icon: a smooth blank sandstone mask with a faint violet glow in a crack, inside a round dark badge, matching the reference status badges."],
  ["icon_civilian", "ui/icon_civilian.png", "Icon: civilian saved", "status", ["assets/ui/status_shellshock.png", "assets/ui/status_irritation.png", "ui/icon_buttons_set.webp"],
    "Icon: a small unmasked smiling person with a small green check mark, inside a round dark badge, matching the reference status badges."],
  ["prop_brazier", "props/brazier.png", "Prop: brazier (unlit and lit)", "prop", [],
    "A tall bronze desert brazier on a stone base, shown twice side by side on one image: left unlit (cold dark coals), right lit (a bright orange-gold flame and sparks)."],
  ["crowd_meter", "ui/crowd_meter.png", "UI: crowd favor meter", "prop", ["ui/hud_elements.webp"],
    "A horizontal crowd-favor meter bar: a rounded dark frame with a gold-and-orange fill, a small cheering crowd silhouette icon at the left end and a gold star at the right end, matching the reference HUD elements."],
  ["arena_glass_road", "locations/arena_glass_road.png", "Arena: The Glass Road", "arena", [B22_DESERT],
    "a desert road of fused green-black glass running between towering dunes under a violet-tinged noon sky, a sandstorm wall far away, lone oasis palms, columns of identical standing silhouettes on the horizon. Keep the ring path shape."],
  ["arena_sunspire", "locations/arena_sunspire.png", "Arena: Sunspire arena", "arena", [B22_DESERT],
    "a grand sandstone gladiator arena seen from above: tiered stands full of cheering identical silhouettes, banners, a sun-spire tower, a sand floor, torches. Keep the ring path shape."],
  ["arena_throne_end", "locations/arena_throne_end.png", "Arena: The Throne of Dust", "arena", [B22_DESERT],
    "the arena's far end: a vast throne of piled sand and bones at the top, rows of kneeling identical figures, a hanging golden cage above the arena wall, cracked ground glowing violet. Keep the ring path shape."],
  ["b2s3_p1_shard_south", "story/panels/b2s3_p1_shard_south.png", "Panel S3-1: the shard flies south", "panel", [],
    "A violet shard streaks south over a dark sea toward a desert coast; at the horizon, a noon sky turning violet."],
  ["b2s3_p2_caravan", "story/panels/b2s3_p2_caravan.png", "Panel S3-2: the caravan", "panel", ["faceless_soldier", "faceless_civilian", "arena_glass_road"],
    "A long caravan of identical masked figures walking out of the dunes in perfect step, all the same height."],
  ["b2s3_p3_bako", "story/panels/b2s3_p3_bako.png", "Panel S3-3: Bako", "panel", ["bako", "arena_glass_road"],
    "Bako holds up his broken manacle and points at the masked column; a haunted pleading look."],
  ["b2s3_p4_captured", "story/panels/b2s3_p4_captured.png", "Panel S3-4: Bako captured", "panel", ["bako", "sefa"],
    "Masked guards drag Bako in chains before Sefa's sand throne; Sefa sits above, chains of violet light across her."],
  ["b2s3_p5_arena", "story/panels/b2s3_p5_arena.png", "Panel S3-5: the arena roars", "panel", ["bako", "arena_sunspire"],
    "Bako steps onto the arena sand, the stands roaring behind him, a rueful smile."],
  ["b2s3_p6_throw", "story/panels/b2s3_p6_throw.png", "Panel S3-6: Bako throws the match", "panel", ["bako", "sefa"],
    "Bako lowers his guard and takes the blow, kneeling on the sand; above, Sefa on her throne points down."],
  ["b2s3_p7_cage", "story/panels/b2s3_p7_cage.png", "Panel S3-7: the cage", "panel", ["nefrael_caged", "arena_sunspire"],
    "From her hanging cage above the arena wall, Nefrael calls down, one paw through the bars."],
  ["b2s3_p8_throne", "story/panels/b2s3_p8_throne.png", "Panel S3-8: the throne", "panel", ["sefa", "faceless_soldier", "arena_throne_end"],
    "The Faceless flood the arena in a sea of identical masks; Sefa waits on her throne, violet chains binding her."],
  ["b2s3_p9_cage_breaks", "story/panels/b2s3_p9_cage_breaks.png", "Panel S3-9: the cage breaks (mid-battle)", "panel", ["nefrael_free", "ally_gladiator", "ally_spearwoman", "ally_slinger"],
    "Nefrael bursts from her cage with a roar; freed people tear off their masks and charge."],
  ["b2s3_p10_chains_tighten", "story/panels/b2s3_p10_chains_tighten.png", "Panel S3-10: the chains tighten (mid-battle)", "panel", ["sefa"],
    "Close-up: Sefa clutching at her glowing violet chains as they tighten, anguished."],
  ["b2s3_p11_last_chain", "story/panels/b2s3_p11_last_chain.png", "Panel S3-11: the last chain", "panel", ["sefa", "bako", "faceless_soldier"],
    "The last chain breaks into light; Sefa looks down at the masked crowd kneeling all around her throne, Bako, dusty, climbing out of the sand."],
  ["b2s3_p12_a_name", "story/panels/b2s3_p12_a_name.png", "Panel S3-12: a name", "panel", ["nefrael_free", "bako", "faceless_civilian_unmasked"],
    "Masks fade from the crowd, revealing many different faces; Nefrael holds the glowing Sun Orb; Bako smiles through tears."],
  ["b2s3_p13_statue", "story/panels/b2s3_p13_statue.png", "Panel S3-13: the statue", "panel", ["sefa_statue", "arena_sunspire"],
    "Sefa, now a sandstone statue at the arena gate, hand raised, holding the cracked walls together; citizens look up at her."],
  ["b2s3_p14_third_shard", "story/panels/b2s3_p14_third_shard.png", "Panel S3-14: the third shard", "panel", ["arena_glass_road"],
    "A third violet shard streaks north over the dunes toward distant dark mountains; the ground begins to crack and shake."],
  ["book2_story3_throne_of_dust", "story/covers/book2_story3_throne_of_dust.png", "Cover: The Throne of Dust", "cover", ["sefa", "bako", "nefrael_free"],
    "Cover art: Sefa on her sand throne bound in violet chains, a sea of identical masks below, Bako in the foreground, Nefrael's cage above."],
  ["bako_card", "units/bako.png", "Story card: Bako, Chainbreaker (still)", "card", ["bako", "units/minotaur_gladiator.webp"],
    "Bako, Chainbreaker: the gladiator from the reference in full gear, a leather-and-bronze arena harness, a spiked iron flail on a long chain in one hand, a broken manacle on the other wrist, a rallying grin, facing slightly right."],
  ["bako_card_portrait", "cards/portraits/bako.png", "Story card: Bako (card portrait)", "cardportrait", ["bako_card"],
    "Trading-card portrait of Bako from the first reference, bust from the chest up, three-quarter view, filling the square, with a warm sunset-gold arena background. Square 1:1, full-bleed, no card frame, no border, no text."],
];

/** Turns rows into Art requests (shared by the v2.2 and v2.3 lists). */
function mapB2Rows(rows: B22Row[], group: string, idPrefix: string): ArtRequest[] {
  const B22_FILE = new Map(rows.map(([id, file]) => [id, `assets/${file}`]));
  return rows.map(([id, file, title, kind, refs, what], i) => {
  const own = refs.map((r) => B22_FILE.get(r) ?? r);
  const pre = refs.filter((r) => B22_FILE.has(r));
  const base =
    kind === "monster" ? [STYLE_ANCHOR, B2_MONSTER, B2_ANCHOR]
    : kind === "boss" ? [STYLE_ANCHOR, B2_BOSS, B2_ANCHOR]
    : kind === "arena" ? []
    : [STYLE_ANCHOR];
  const notes = pre.length ? [`NOTE: generate ${pre.map((r) => `#${rows.findIndex((x) => x[0] === r) + 1}`).join(", ")} first and attach ${pre.map((r) => B22_FILE.get(r)).join(", ")}`] : [];
  const prompt =
    kind === "monster" || kind === "boss" || kind === "ally" ? `${STYLE} ${what} ${MAGENTA}`
    : kind === "portrait" ? `${STYLE} ${PORTRAIT} ${what} ${MAGENTA}`
    : kind === "status" ? `${STYLE} ${what} ${ICON.replace("green (#00FF00)", "magenta (#FF00FF)")}`
    : kind === "prop" ? `${STYLE} ${what} Single object (or the one pair described), centered with margin, on a solid flat pure magenta (#FF00FF) background.`
    : kind === "card" ? `${STYLE} ${what} ${GREEN}`
    : kind === "cardportrait" ? `${STYLE.replace(", no text, no watermark.", ".")} ${what}`
    : kind === "panel" ? `${STYLE} ${CAST} ${what} Wide cinematic 16:9 story panel.`
    : kind === "cover" ? `${STYLE} ${CAST} ${what} ${HOLD}`
    : `${EDIT} ${what}`;
  return {
    id: `${idPrefix}:${id}`,
    group,
    title: `#${i + 1} ${title}`,
    file,
    model: kind === "cover" ? "Seedream 4.5" : kind === "card" || kind === "cardportrait" ? "Nano Banana Pro" : "Nano Banana 2",
    aspect: kind === "panel" ? "16:9" : kind === "arena" ? "9:16" : kind === "cover" ? "4:5" : "1:1",
    refs: [...notes, ...(kind === "arena" || kind === "status" ? [...own, STYLE_ANCHOR] : [...base, ...own])],
    prompt,
  };
});
}

export const BOOK2_S23_REQUESTS: ArtRequest[] = mapB2Rows(B22, B22_GROUP, "book2s23");

// ----- v2.3 Book 2 Story 4: The Iron Oath (made with the Higgsfield MCP, see docs/features/v2.3-the-iron-oath/ART_PROMPTS.md) -----
const B24_GROUP = "v2.3 Arts Requirements";
const B24_WINTER = "assets/locations/arena_winter_village.png";
const B24: B22Row[] = [
  ["brakka", "units/brakka.png", "Story card: Brakka Emberhold (still)", "card", [],
    "Brakka Emberhold, a young dwarf master smith woman, Durgrim's daughter: short sturdy build, braided copper-red hair with iron beads, soot-smudged freckled face, leather smith apron over a rune-stitched tunic, heavy gauntlets, a big glowing ember-gold forge hammer over her shoulder, confident determined grin, facing slightly right."],
  ["durgrim", "units/durgrim.png", "Hero: Thane Durgrim Emberhold (still)", "card", [],
    "Thane Durgrim Emberhold, an armored dwarf king: very broad and stocky, long braided grey-black beard with iron rings, heavy black-iron plate armor with a horned crown-helm, a huge forge-hammer in both hands, glowing violet chaos veins and violet glowing eyes, grim and proud, hero pose facing slightly right."],
  ["emberhold_gunner", "units/emberhold_gunner.png", "Emberhold gunner", "card", [],
    "Emberhold dwarf fire gunner: stocky dwarf with a red-orange beard tucked in a belt, smoke-stained goggles on a leather cap, a short brass-and-iron blunderbuss cannon-rifle aimed forward spitting a puff of flame, ammo bandolier and powder horn, ember-red tabard. Facing right."],
  ["runecaller", "units/runecaller.png", "Emberhold runecaller", "card", [],
    "Emberhold dwarf runecaller: a wise stocky dwarf rune-caster with a long white braided beard, hooded grey-blue robe stitched with glowing orange runes, one hand raised conjuring floating glowing rune stones, a short iron-capped staff in the other, calm focused face. Facing right."],
  ["iron_soldier", "monsters/iron_soldier.png", "Iron soldier", "monster", [],
    "Iron soldier: a hollow animated suit of dark riveted iron armor in the shape of a dwarf soldier, no body inside, glowing violet chaos light leaking from the helmet slit and joints, a short iron sword and round iron shield, stiff marching pose."],
  ["iron_crossbow", "monsters/iron_crossbow.png", "Iron crossbow", "monster", [],
    "Iron crossbow: a small walking iron-plated crossbow construct on two stubby iron legs, a big riveted crossbow with a violet-glowing bolt loaded, a single violet eye-lens, gears on its back, kneeling-ready stance."],
  ["iron_brute", "monsters/iron_brute.png", "Iron brute", "monster", [],
    "Iron brute: a hulking iron golem built from anvils and plates, huge anvil-block fists, a furnace grate on its chest glowing orange with violet chaos cracks, rivets, tiny glowing violet eyes, heavy slow stomping stance."],
  ["drake_whelp", "monsters/drake_whelp.png", "Drake whelp", "monster", [],
    "Drake whelp: a small angry young dragon hatchling with ember-red scales, stubby wings flapping, a charcoal-grey belly, tiny curved horns, smoke curling from its nostrils, a spark of fire in its mouth, flying low."],
  ["dwarf_family", "monsters/dwarf_family.png", "Dwarf family (friendly evacuees)", "monster", [],
    "Friendly dwarf family evacuees walking right together: a stocky dwarf father with a bushy brown beard, a mother in a shawl carrying a bundle, two small dwarf children, and a little wooden hand cart piled with pots, blankets and a hammer, worried but brave faces, soot on their clothes."],
  ["ashmaw", "bosses/ashmaw.png", "Ashmaw the Dragon Mother", "boss", [],
    "Ashmaw the Dragon Mother, a colossal matriarch dragon boss: charcoal-black and ember-red scales with glowing lava cracks, huge spread leathery wings, curved ivory horns, scarred jaw with a mouth full of fire, glowing gold slit eyes, a broken old dwarf-forged chain on one claw, boss pose, side-front view facing right."],
  ["walking_forge", "bosses/walking_forge.png", "The Walking Forge", "boss", [],
    "The Walking Forge, a huge iron fortress on two massive articulated iron legs: riveted black-iron hull with a tall smoking furnace chimney spewing sparks, two large cannons on the shoulders, a glowing orange furnace-mouth in the belly and a chained golden forge-spirit core visible behind iron bars, a violet chaos orb crackling on top, ember-lit windows, boss scale, side view facing right."],
  ["walking_forge_legs", "bosses/walking_forge_legs.png", "Walking Forge: legs damaged", "boss", ["walking_forge"],
    "The same Walking Forge as the reference, but its legs badly damaged: one iron leg buckled and cracked with sparks and bent plates, leaning to one side, smoke."],
  ["walking_forge_cannons", "bosses/walking_forge_cannons.png", "Walking Forge: cannons destroyed", "boss", ["walking_forge"],
    "The same Walking Forge as the reference, but both shoulder cannons blown off and hanging as twisted wrecks with smoke, scorched mounts, everything else the same."],
  ["walking_forge_furnace", "bosses/walking_forge_furnace.png", "Walking Forge: furnace burst", "boss", ["walking_forge"],
    "The same Walking Forge as the reference, but its furnace belly burst open: the furnace door blown off, flames and molten sparks pouring out, the chimney cracked and leaking, everything else the same."],
  ["walking_forge_core", "bosses/walking_forge_core.png", "Walking Forge: core exposed", "boss", ["walking_forge"],
    "The same Walking Forge as the reference, but its hull plating torn open to expose the glowing chained Anvil-Heart golden core, the violet orb on top cracked, heavily damaged and ready to fall, everything else the same."],
  ["chaos_colossus", "bosses/chaos_colossus.png", "The Chaos-Iron Colossus", "boss", [],
    "The Chaos-Iron Colossus, a towering giant fused from scrap: cannons, anvils, shields, armor plates, gears and chains welded into a hulking humanoid, held together by crackling violet chaos energy seams, a burning violet core in its chest, a huge anvil-fist raised, glowing violet eye slits, boss scale, front-three-quarter view."],
  ["arena_burning_emberhold", "locations/arena_burning_emberhold.png", "Arena: Burning Emberhold (Ch 1, sepia-tinted in code)", "arena", [B24_WINTER],
    "the burning dwarven mountain city of Emberhold seen from above, carved stone halls and bridges and forge-chimneys all aflame, dragon-fire glowing orange, falling embers, black smoke, cracked stone streets, dwarf-built stone arches, dark red-orange sky. Keep the ring path shape."],
  ["arena_mountain_pass", "locations/arena_mountain_pass.png", "Arena: The Mountain Pass (Ch 2)", "arena", [B24_WINTER],
    "a rocky mountain pass in the dwarven highlands at dusk, grey cliffs, old dwarf-built stone road markers and rune-carved pillars, patches of snow, pine trees, a huge deep iron footprint crater and drifting smoke from far up the valley, cold blue sky with ember-orange sunset on the peaks. Keep the ring path shape."],
  ["arena_oath_field", "locations/arena_oath_field.png", "Arena: The Oath Field (Ch 3)", "arena", [B24_WINTER],
    "an open field before the colossal carved stone gate of the dwarven mountain Emberhold, the gate's huge anvil-and-crown relief at the top, rows of old oath-stones with iron rings, scattered abandoned cannons and shields, scorched grass, violet-tinged storm clouds, a faint gold ember glow from the gate. Keep the ring path shape."],
  ["book2_story4_the_iron_oath", "story/covers/book2_story4_the_iron_oath.png", "Cover: The Iron Oath", "cover", ["brakka", "durgrim", "walking_forge"],
    "Cover art: Brakka with her glowing forge hammer in the foreground, Thane Durgrim behind her with violet chaos glowing in his armor, the huge Walking Forge iron fortress on legs stomping down a mountain pass behind them with smoke and cannons, ember-gold and violet light."],
  ["durgrim_portrait", "story/portraits/durgrim.png", "Portrait: Durgrim", "portrait", ["durgrim"],
    "Thane Durgrim as in the reference, grim and weary stare, violet chaos glow in his eyes and beard braids."],
  ["durgrim_young_portrait", "story/portraits/durgrim_young.png", "Portrait: young Durgrim (flashback)", "portrait", ["durgrim"],
    "Young Durgrim 300 years ago: the same dwarf as the reference but young, a short dark-brown beard with a single braid, a bright proud face, a plain bronze helm with a gold rim, no violet glow at all."],
  ["brakka_portrait", "story/portraits/brakka.png", "Portrait: Brakka", "portrait", ["brakka"],
    "Brakka Emberhold as in the reference, determined and a little worried, soot on her cheek."],
  ["anvil_heart_portrait", "story/portraits/anvil_heart.png", "Portrait: Anvil-Heart", "portrait", ["walking_forge"],
    "Anvil-Heart, an ancient forge-spirit: a noble face-like helm shaped from a black anvil, glowing ember-gold flame eyes, molten gold seams across the iron, broken chain links hanging from its shoulders, a wise sorrowful expression."],
  ["candy_knight_captain_portrait", "story/portraits/candy_knight_captain.png", "Portrait: Candy Crown knight captain", "portrait", ["assets/_green/v12/pentagonal_knight.png", "assets/_green/shield_knight.png"],
    "The Candy Crown knight captain, same armor design and candy-crown crest as the reference knights but with a captain's plumed helm and a red cape, scarred, steady and stern."],
  ["brakka_card", "cards/portraits/brakka.png", "Story card: Brakka (card portrait)", "cardportrait", ["brakka"],
    "Trading-card portrait of Brakka from the reference, bust from the chest up, three-quarter view, filling the square, with a warm forge-glow background of sparks. Square 1:1, full-bleed, no card frame, no border."],
  ["durgrim_card", "cards/portraits/durgrim.png", "Hero card: Durgrim (card portrait)", "cardportrait", ["durgrim"],
    "Trading-card portrait of Thane Durgrim from the reference, bust from the chest up, three-quarter view, filling the square, with a stormy violet-and-ember mountain background. Square 1:1, full-bleed, no card frame, no border."],
  ["gunner_card", "cards/portraits/emberhold_gunner.png", "Emberhold gunner (card portrait)", "cardportrait", ["emberhold_gunner"],
    "Trading-card portrait of the dwarf fire gunner from the reference, bust from the chest up, three-quarter view, filling the square, with a smoky ember-orange background. Square 1:1, full-bleed, no card frame, no border."],
  ["runecaller_card", "cards/portraits/runecaller.png", "Emberhold runecaller (card portrait)", "cardportrait", ["runecaller"],
    "Trading-card portrait of the dwarf runecaller from the reference, bust from the chest up, three-quarter view, filling the square, with glowing floating runes on a deep blue stone-hall background. Square 1:1, full-bleed, no card frame, no border."],
  ["rune_shield_fire", "ui/rune_shield_fire.png", "Rune shield icon: fire", "status", [],
    "A small game icon: a round dwarven iron shield with rivets and carved runes, a glowing red-orange flame rune symbol in the center, ember glow around it."],
  ["rune_shield_ice", "ui/rune_shield_ice.png", "Rune shield icon: ice", "status", [],
    "A small game icon: a round dwarven iron shield with rivets and carved runes, a glowing icy-blue snowflake rune symbol in the center, frost glow around it."],
  ["rune_shield_lightning", "ui/rune_shield_lightning.png", "Rune shield icon: lightning", "status", [],
    "A small game icon: a round dwarven iron shield with rivets and carved runes, a glowing yellow lightning-bolt rune symbol in the center, crackling sparks around it."],
  ["rune_shield_nature", "ui/rune_shield_nature.png", "Rune shield icon: nature", "status", [],
    "A small game icon: a round dwarven iron shield with rivets and carved runes, a glowing green leaf-and-branch rune symbol in the center, green glow around it."],
  ["rune_shield_poison", "ui/rune_shield_poison.png", "Rune shield icon: poison", "status", [],
    "A small game icon: a round dwarven iron shield with rivets and carved runes, a glowing toxic-lime droplet-and-skull rune symbol in the center, poison glow around it."],
  ["rune_shield_arcane", "ui/rune_shield_arcane.png", "Rune shield icon: arcane (use a green screen: arcane pink keys out on magenta)", "status", [],
    "A small game icon: a round dwarven iron shield with rivets and carved runes, a glowing deep-blue and gold star-swirl arcane rune symbol in the center, blue arcane glow around it (no pink, no green)."],
  ["ally_dwarf_guard", "story/allies/ally_dwarf_guard.png", "Ally: Emberhold dwarf guard", "ally", ["brakka"],
    "Emberhold shield dwarf guard charging forward: a stocky dwarf with a braided brown beard, a big round iron tower shield with a glowing ember-gold anvil crest raised in front, a short hammer in the other hand, black-iron helm with a gold rim, battle cry."],
  ["ally_dwarf_gunner", "story/allies/ally_dwarf_gunner.png", "Ally: Emberhold dwarf gunner", "ally", ["emberhold_gunner"],
    "Emberhold dwarf gunner charging forward, firing a short brass-and-iron fire gun with a burst of flame, red-orange beard, goggles on a leather cap, ember-red tabard, determined shout."],
  ["ally_candy_knight", "story/allies/ally_candy_knight.png", "Ally: Candy Crown knight", "ally", ["assets/_green/v12/pentagonal_knight.png", "assets/_green/shield_knight.png"],
    "A Candy Crown knight charging forward with a sword raised and a shield, drawn exactly in the armor design, colors and candy-crown crest of the reference knights, battle cry."],
  ["ally_candy_lancer", "story/allies/ally_candy_lancer.png", "Ally: Candy Crown lancer", "ally", ["assets/_green/v12/pentagonal_knight.png", "assets/_green/shield_knight.png"],
    "A Candy Crown knight lancer charging forward with a long lance levelled ahead, a red-and-white pennant on the lance, drawn exactly in the armor design, colors and candy-crown crest of the reference knights, plumed helm."],
  // Panels: p3-p6 are the sepia flashback.
  ["b2s4_p1_shard_north", "story/panels/b2s4_p1_shard_north.png", "Panel S4-1: the shard flies north", "panel", [],
    "A glowing violet crystal shard streaks north through a dusk sky over green hills toward a range of snow-capped jagged mountains, a thin trail of violet sparks behind it, a tiny forge-smoke plume rising from a distant mountain peak."],
  ["b2s4_p2_footprints", "story/panels/b2s4_p2_footprints.png", "Panel S4-2: giant iron footprints", "panel", ["assets/_green/v12/corrupted_villager.png"],
    "A few frightened villagers in simple farm clothes with a lantern gather around a single enormous iron footprint, as big as a house, pressed deep into a muddy road at dawn, more giant footprints trailing off toward misty mountains, a crushed barn in the distance."],
  ["b2s4_p3_young_durgrim", "story/panels/b2s4_p3_young_durgrim.png", "Panel S4-3: young Durgrim on the walls (sepia flashback)", "panel", ["durgrim_young_portrait"],
    "FLASHBACK in warm sepia-brown monochrome tones. Young Durgrim standing proud on the carved stone walls of the mountain city Emberhold 300 years ago, hand on a battlement, looking out over a vast stone-and-forge city of chimneys and bridges at golden hour, a dwarf banner with an anvil emblem fluttering."],
  ["b2s4_p4_iron_oath", "story/panels/b2s4_p4_iron_oath.png", "Panel S4-4: the Iron Oath sworn (sepia flashback)", "panel", ["assets/story/portraits/candy_king.png", "durgrim_young_portrait"],
    "FLASHBACK in warm sepia-brown monochrome tones. A human crowned king in knight's armor kneels before the young dwarf lord Durgrim and presses his hand to a giant glowing anvil in the great hall of Emberhold, swearing the Iron Oath, runes glowing in the anvil, dwarf elders and a few knights looking on, firelit."],
  ["b2s4_p5_emberhold_burns", "story/panels/b2s4_p5_emberhold_burns.png", "Panel S4-5: Emberhold burns (sepia flashback)", "panel", ["ashmaw", "dwarf_family"],
    "FLASHBACK in warm sepia-brown monochrome tones with orange fire accents. The mountain city Emberhold burning at night, huge dragons circling above spitting fire onto stone halls and bridges, the great dragon mother among them, dwarf families with carts and bundles streaming down a mountain road to escape, ash falling."],
  ["b2s4_p6_unanswered_horn", "story/panels/b2s4_p6_unanswered_horn.png", "Panel S4-6: the horn no one answers (sepia flashback)", "panel", ["durgrim_young_portrait"],
    "FLASHBACK in warm sepia-brown monochrome tones. On a smoky mountain parapet, the young dwarf lord Durgrim blows a great curved horn into an empty ash-filled sky, no one answering, a far horizon with no riders; at his feet a torn and half-burned parchment scroll with a broken wax seal lies in the cinders, the burning city below."],
  ["b2s4_p7_walking_forge", "story/panels/b2s4_p7_walking_forge.png", "Panel S4-7: the Walking Forge (present)", "panel", ["walking_forge", "iron_soldier"],
    "The huge Walking Forge crawling down a snowy mountain pass at dusk, smoke pouring from its chimney, cannons swinging, a violet orb crackling on top, rows of small iron soldiers marching behind its legs, the pass trees flattened beneath its footprints."],
  ["b2s4_p8_knights_kneel", "story/panels/b2s4_p8_knights_kneel.png", "Panel S4-8: the knights kneel", "panel", ["durgrim", "candy_knight_captain_portrait", "assets/_green/v12/pentagonal_knight.png", "assets/_green/shield_knight.png"],
    "The Candy Crown knights and their captain kneel on one knee on a stone road before the armored dwarf king Thane Durgrim, who stands stiff with his forge-hammer, a faint violet glow in his eyes, the oath-stones around them, the mountain gate behind, a tense solemn mood."],
  ["b2s4_p9_durgrim_falters", "story/panels/b2s4_p9_durgrim_falters.png", "Panel S4-9: Durgrim falters (mid-battle)", "panel", ["durgrim", "brakka", "assets/_green/v12/pentagonal_knight.png"],
    "Thane Durgrim, exhausted, staggers to one knee gripping his hammer, the violet glow flickering in his eyes and cracks of violet light running over his armor, his daughter Brakka rushing toward him with her hand out, the knights stepping back in alarm."],
  ["b2s4_p10_colossus_rises", "story/panels/b2s4_p10_colossus_rises.png", "Panel S4-10: the Colossus rises (mid-battle)", "panel", ["durgrim", "chaos_colossus"],
    "A column of violet chaos energy tears out of the armored dwarf king Durgrim's chest and streams into a huge heap of scrap iron, cannons, anvils and shields on the battlefield, which is rising and fusing into the towering Chaos-Iron Colossus, lightning cracking, knights and dwarves shielding their eyes."],
  ["b2s4_p11_colossus_falls", "story/panels/b2s4_p11_colossus_falls.png", "Panel S4-11: the Colossus falls", "panel", ["chaos_colossus", "assets/_green/v12/pentagonal_knight.png"],
    "The Chaos-Iron Colossus collapses into a huge avalanche of scrap iron, cannons, anvils and plates, the violet glow dying, a cloud of dust and sparks, Candy Crown knights and dwarf warriors raising weapons in the foreground in relief."],
  ["b2s4_p12_brakka_confronts", "story/panels/b2s4_p12_brakka_confronts.png", "Panel S4-12: Brakka confronts her father", "panel", ["brakka", "durgrim"],
    "In the heap of scrap, Brakka kneels beside her father Thane Durgrim who sits dazed and unarmored with his horned helm in his hands, his violet glow gone, she confronts him with tears and anger, her forge hammer lowered, dust and drifting embers."],
  ["b2s4_p13_anvil_heart", "story/panels/b2s4_p13_anvil_heart.png", "Panel S4-13: Anvil-Heart reclaims the Orb", "panel", ["anvil_heart_portrait", "walking_forge"],
    "Anvil-Heart, the ancient forge-spirit made of a black anvil and ember-gold flame, steps up out of the broken Walking Forge and gently takes the violet-cracked Forge Orb into its hands, the orb cooling from violet to warm ember-gold, golden light washing over the dwarves and knights, chains falling away from the spirit."],
  ["b2s4_p14_new_oath", "story/panels/b2s4_p14_new_oath.png", "Panel S4-14: the new oath", "panel", ["brakka", "emberhold_gunner", "runecaller", "candy_knight_captain_portrait"],
    "On the oath field at golden dusk, dwarves (Brakka with her glowing hammer, a dwarf gunner, a runecaller) and Candy Crown knights with their captain strike a glowing anvil together, forging a new Iron Oath, the human captain and Brakka clasping hands over the anvil, sparks flying, Thane Durgrim standing apart watching."],
  ["b2s4_p15_durgrim_troubled", "story/panels/b2s4_p15_durgrim_troubled.png", "Panel S4-15: Durgrim troubled", "panel", ["durgrim"],
    "Thane Durgrim alone and troubled at the edge of the celebration, helm under his arm, the violet glow gone but a single faint violet vein still under his skin, looking down at his own hand, the new-forged oath anvil glowing far behind him, evening sky."],
  ["b2s4_p16_broken_scales", "story/panels/b2s4_p16_broken_scales.png", "Panel S4-16: four shards over broken scales", "panel", [],
    "Four glowing violet crystal shards hover in a dark night sky above a pair of broken golden balance scales lying on a stone floor, the scales' two pans tilted, one pan pure white and one pan pure black, a crack between them, violet light on the stone, ominous mood."],
  ["b2s4_p17_to_be_continued", "story/panels/b2s4_p17_to_be_continued.png", "Panel S4-17: to be continued", "panel", ["brakka", "emberhold_gunner", "assets/_green/v12/pentagonal_knight.png"],
    "A quiet closing shot: Brakka, a Candy Crown knight and a dwarf gunner walk side by side along a road leading away from the mountain gate toward a dark horizon where a faint violet storm glows, the forged oath anvil glowing small and gold behind them, one violet shard glimmering in the far sky."],
];

export const BOOK2_S4_REQUESTS: ArtRequest[] = mapB2Rows(B24, B24_GROUP, "book2s4");

// ----- v2.4 Book 2 Story 5: The Silver Tribunal (made with the Higgsfield MCP, see docs/features/v2.4-the-silver-tribunal/ART_PROMPTS.md) -----
// Aurelion is clockwork, brass and silver artifice: no angels, halos or divine beings anywhere.
const B25_GROUP = "v2.4 Arts Requirements";
const B25_NOANG = "No angels, no wings, no halo.";
const B25_PARTY = "assets/story/panels/b2s1_p15_dust.png";
const B25: B22Row[] = [
  ["argent", "units/argent.png", "Story card: Argent, the Merciful (still)", "card", [],
    "Argent, the Merciful: an ancient clockwork judge, a feminine brass automaton with a calm gentle painted-metal face, judge's robes of silver-plated overlapping plates, small visible gears at the shoulders and neck, warm soft golden-silver light from her chest and eyes (redeemed, kind), a short gavel-sword pointed down in one hand and a small glowing Orb of Verdicts in the other, facing slightly right. " + B25_NOANG],
  ["brass_warden", "monsters/brass_warden.png", "Brass warden", "monster", [],
    "Brass warden: a clockwork guard automaton of polished brass plates and silver trim with a tall helm, a single glowing cold-silver eye slit, a long brass halberd and a round brass shield engraved with a scale of justice, gears at the joints, stiff marching pose."],
  ["ledger_crossbowman", "monsters/ledger_crossbowman.png", "Ledger crossbowman", "monster", [],
    "Ledger crossbowman: a small clockwork archer automaton of brass with silver trim, a rolled parchment ledger scroll strapped to its back, a big brass-and-silver crossbow loaded with a quill-shaped bolt, a single cold-silver eye lens, kneeling-ready stance."],
  ["chainbearer", "monsters/chainbearer.png", "Chainbearer", "monster", [],
    "Chainbearer: a sturdy clockwork prison-guard automaton of dark brass and grey iron wrapped in heavy chains, an iron shackle on each fist, a cold-silver glowing eye slit, a padlock at its chest, slow heavy stomping stance."],
  ["quill_drone", "monsters/quill_drone.png", "Quill drone (fast, flying)", "monster", [],
    "Quill drone: a small fast flying clockwork owl of brass and silver, spread brass feather-blade wings, a giant quill pen for a tail, round glowing cold-silver eyes, tiny gears, a scrap of charge scroll in its talons, flying fast."],
  ["gavel_golem", "monsters/gavel_golem.png", "Gavel golem (heavy)", "monster", [],
    "Gavel golem: a hulking clockwork golem of brass and dark iron with a giant brass courtroom gavel for a right fist, a barrel body with a clock face on its chest, silver plates, small cold-silver eyes, heavy slow stomping stance."],
  ["prosecutor", "bosses/prosecutor.png", "The Prosecutor", "boss", [],
    "The Prosecutor, a colossal clockwork reading-automaton: a tall brass figure in a black-and-brass lawyer's gown with a stiff high collar, a mask-like brass face with a single huge cold-silver eye and a thin pointing finger, an endless charge scroll of parchment unrolling from both hands to the ground, gears in its chest, silver chains, boss pose facing right. " + B25_NOANG],
  ["bailiff", "bosses/bailiff.png", "The Bailiff", "boss", [],
    "The Bailiff, a colossal heavy chain construct: a hulking brass-and-iron jailer automaton built from giant interlocking chain links and padlocks, a barrel chest with a cage door, a locked iron mask-helm with cold-silver eye slits, massive chain-wrapped fists dragging chains, a giant key at its belt, boss pose facing right."],
  ["argent_justiciar", "bosses/argent_justiciar.png", "High Justiciar Argent (boss form)", "boss", ["argent"],
    "High Justiciar Argent, the oldest clockwork judge, boss form corrupted by cold perfect silver light (NOT violet): a tall feminine brass automaton with a stern masked brass face and glowing cold white-silver eyes, judge's robes of heavy silver-plated plates, cracked seams leaking cold silver light, gears at the shoulders, a huge gavel-sword and the floating Orb of Verdicts crackling with cold silver light, imposing boss pose facing right. " + B25_NOANG],
  ["arena_aurelion_court", "locations/arena_aurelion_court.png", "Arena: Aurelion court (courtroom floor)", "arena", [B24_WINTER],
    "the marble courtroom floor of the floating clockwork city Aurelion seen from above, a huge circular brass-inlaid court floor with silver-and-brass tile patterns, brass gear mechanisms and law-engine consoles, rows of empty brass judge's benches and witness stands, parchment scrolls and chains scattered, tall brass pillars, cold silver light, a ring of clouds beyond the edge. Keep the ring path shape. " + B25_NOANG],
  ["arena_aurelion_cells", "locations/arena_aurelion_cells.png", "Arena: Aurelion cells (prison galleries)", "arena", [B24_WINTER],
    "the prison galleries of the floating clockwork city Aurelion seen from above, grey stone and brass floor with rows of barred brass cell doors lining both sides, iron gantries, hanging chains, brass lantern lamps with cold silver light, brass gears in the walls, scattered keys and parchment sentences, dim blue-grey shadows. Keep the ring path shape. " + B25_NOANG],
  ["arena_great_scale", "locations/arena_great_scale.png", "Arena: the Great Scale", "arena", [B24_WINTER],
    "the Great Scale of Aurelion seen from above: the arena is a huge brass board standing on two giant brass weighing pans, one on the left and one on the right, each hanging from massive chains, gears, brass beams, clock dials, silver light, clouds and sky far below at the edges. Keep the ring path shape. " + B25_NOANG],
  ["arena_falling_aurelion", "locations/arena_falling_aurelion.png", "Arena: Aurelion falling", "arena", [B24_WINTER],
    "the floating clockwork city Aurelion breaking apart: the brass court platform cracked and tilting with gaps of open sky and clouds far below, chunks of brass floor, gears, pillars and chains drifting away, cold silver light spilling through the cracks, falling parchment scrolls. Keep the ring path shape. " + B25_NOANG],
  ["book2_story5_the_silver_tribunal", "story/covers/book2_story5_the_silver_tribunal.png", "Cover: The Silver Tribunal", "cover", ["argent_justiciar", "great_scale_portrait", B25_PARTY],
    "Cover art: the corrupted clockwork judge High Justiciar Argent towering over the Keeper's small party (no antlered elf king) on a vast brass courtroom floor of the floating city Aurelion, the colossal brass Great Scale rising behind her, cold silver light, chains, parchment charge scrolls drifting, clouds below. " + B25_NOANG],
  ["argent_portrait", "story/portraits/argent.png", "Portrait: Argent", "portrait", ["argent"],
    "Argent, the Merciful: a feminine clockwork judge automaton, brass face with a painted gentle expression and kind warm golden eyes, silver-plated judge's collar, small gears at the neck, warm gold-silver glow. " + B25_NOANG],
  ["argent_weeping_portrait", "story/portraits/argent_weeping.png", "Portrait: Argent weeping", "portrait", ["argent"],
    "Argent weeping: a feminine brass automaton face, a cracked gavel-sword handle clutched at her chest, one single liquid quicksilver tear on her brass cheek, sorrowful eyes dimmed to soft grey-gold. " + B25_NOANG],
  ["prosecutor_portrait", "story/portraits/prosecutor.png", "Portrait: the Prosecutor", "portrait", ["prosecutor"],
    "The Prosecutor: a clockwork reading-automaton, mask-like brass face with a single huge cold-silver eye, stiff high black-and-brass collar, a parchment charge scroll unrolling past its shoulder, thin pointing brass finger."],
  ["bailiff_portrait", "story/portraits/bailiff.png", "Portrait: the Bailiff", "portrait", ["bailiff"],
    "The Bailiff: a heavy brass-and-iron chain construct, locked iron mask-helm with cold-silver eye slits, thick chain links wound round the neck and shoulders, a padlock at the collar."],
  ["great_scale_portrait", "story/portraits/great_scale.png", "Portrait: the Great Scale", "portrait", [],
    "The Great Scale: a colossal brass law-engine set of balance scales, front view, a thick brass beam on a tall geared pillar, two wide brass pans on chains, one with a white glowing weight and the other a black weight, a big clock dial at the pivot, silver light. Single object centered. " + B25_NOANG],
  ["vaeltharion_dust_portrait", "story/portraits/vaeltharion_dust.png", "Portrait: Vaeltharion as golden dust", "portrait", ["assets/story/portraits/vaeltharion.png"],
    "Vaeltharion as a swirl of golden dust: the same antlered dark elf king as the reference (antler crown, long white hair, stern face) dissolving into drifting golden sand-like dust that holds his silhouette, glowing white eyes, ghostly and sad."],
  ["plea_guilty", "ui/plea_guilty.png", "UI icon: plea guilty", "status", [],
    "A small game icon: a round silver court-seal medal stamped with a raised open hand in surrender and a downward check, glowing silver-white, a black cracked ring around it, the word GUILTY below."],
  ["plea_not_guilty", "ui/plea_not_guilty.png", "UI icon: plea not guilty", "status", [],
    "A small game icon: a round brass court-seal medal stamped with a bold upright fist holding up a small balance scale, glowing gold and white, defiant."],
  ["law_no_fire", "ui/law_no_fire.png", "UI icon: law, no fire", "status", [],
    "A small game icon: a round brass law-plaque badge showing a flame symbol crossed out by a thick red diagonal bar, silver gears around the rim."],
  ["law_only_four", "ui/law_only_four.png", "UI icon: law, only four units", "status", [],
    "A small game icon: a round brass law-plaque badge showing four small shield-and-sword pawn tokens in a row and a fifth crossed out by a thick red diagonal bar, silver gears around the rim, no text."],
  ["law_no_merge", "ui/law_no_merge.png", "UI icon: law, no merging", "status", [],
    "A small game icon: a round brass law-plaque badge showing two identical gear tokens merging with an arrow, crossed out by a thick red diagonal bar, silver gears around the rim, no text."],
  ["law_no_summon", "ui/law_no_summon.png", "UI icon: law, no summoning", "status", [],
    "A small game icon: a round brass law-plaque badge showing a summoning sigil circle with a tiny figure in it, crossed out by a thick red diagonal bar, silver gears around the rim, no text."],
  ["chain", "ui/chain.png", "UI icon: chain", "status", [],
    "A small game icon: a heavy brass chain link pair with a glowing cold-silver spark."],
  ["sentence", "ui/sentence.png", "UI icon: sentence", "status", [],
    "A small game icon: a brass judge's gavel striking a round sound-block, a rolled parchment verdict scroll beside it."],
  ["cell_locked", "ui/cell_locked.png", "UI icon: cell locked", "status", [],
    "A small game icon: a round brass-barred prison cell door, closed, with a heavy padlock and chains, silver gear rim."],
  ["cell_broken", "ui/cell_broken.png", "UI icon: cell broken", "status", [],
    "A small game icon: a round brass-barred prison cell door, swung open and broken, snapped chain and smashed padlock, warm light spilling out, silver gear rim."],
  ["cardback_broken_scales", "ui/cardback_broken_scales.png", "Card back: broken scales", "cardportrait", [],
    "Trading-card back design, full-bleed portrait: an ornate brass-and-navy frame with gear corners, in the center a broken pair of brass balance scales, the beam snapped and tilted, one pan pure white and glowing, the other pan pure black, a crack of cold silver light between them. Portrait 3:4, no text."],
  ["argent_card", "cards/portraits/argent.png", "Story card: Argent (card portrait)", "cardportrait", ["argent"],
    "Trading-card portrait of Argent, the Merciful, bust from the chest up, three-quarter view, filling the square, warm gold-silver light, a softly glowing Orb of Verdicts in her hand, warm golden brass courtroom background of gears. Square 1:1, full-bleed, no card frame, no border. " + B25_NOANG],
  ["prosecutor_banner", "ui/boss_banners/prosecutor.png", "Boss banner: the Prosecutor", "cardportrait", ["prosecutor"],
    "Boss intro banner: the Prosecutor towering in a vast brass courtroom of Aurelion, an endless charge scroll unrolling across the marble floor, chains of silver light, tall brass law-engine pillars behind, cold silver light and deep navy shadows, dramatic low angle. Wide 16:9."],
  ["bailiff_banner", "ui/boss_banners/bailiff.png", "Boss banner: the Bailiff", "cardportrait", ["bailiff"],
    "Boss intro banner: the Bailiff looming in the stone prison galleries of Aurelion, rows of locked brass cell doors, heavy chains swinging from the ceiling, cold silver lantern light and deep navy shadows, dramatic low angle. Wide 16:9."],
  ["argent_justiciar_banner", "ui/boss_banners/argent_justiciar.png", "Boss banner: High Justiciar Argent", "cardportrait", ["argent_justiciar"],
    "Boss intro banner: the corrupted High Justiciar Argent raising her gavel-sword with the Orb of Verdicts blazing cold perfect silver light (not violet), on a huge brass balance platform above the clouds of Aurelion, great gears around her, dramatic low angle. Wide 16:9. " + B25_NOANG],
  // Panels. The Keeper's party reference is the Story 1 panel b2s1_p15_dust (do not draw its central antlered elf king).
  ["b2s5_p1_silver_light", "story/panels/b2s5_p1_silver_light.png", "Panel S5-1: silver light pulls the Keeper into the sky", "panel", [B25_PARTY],
    "A beam of cold silver light shoots down from a sea of clouds at dusk and lifts the small party (fox-mask warrior, dwarf engineer, fire mage, ice mage, goblin, plague doctor, skeleton mage, totem; NOT the tall antlered elf king) off a grassy hilltop, grass and dust spiraling. " + B25_NOANG],
  ["b2s5_p2_aurelion", "story/panels/b2s5_p2_aurelion.png", "Panel S5-2: Aurelion above the clouds", "panel", ["great_scale_portrait", B25_PARTY],
    "Aurelion, a floating city of clockwork law high above a sea of clouds: brass courts, domed law-halls, huge slowly turning gears and brass towers held up by a colossal brass balance scale hanging beneath it, silver light, chains and fluttering parchment scrolls; the small party drifts in on a silver light beam. " + B25_NOANG],
  ["b2s5_p3_chains_in_court", "story/panels/b2s5_p3_chains_in_court.png", "Panel S5-3: the Keeper wakes in chains", "panel", ["argent_justiciar", "prosecutor", B25_PARTY],
    "The small party wakes kneeling in heavy silver chains on the marble floor of a huge brass courtroom, High Justiciar Argent on a towering brass judge's bench, brass clockwork jurors in the gallery, the Prosecutor with a long charge scroll to one side, cold silver light. " + B25_NOANG],
  ["b2s5_p4_verdict_guilty", "story/panels/b2s5_p4_verdict_guilty.png", "Panel S5-4: verdict, GUILTY", "panel", ["argent_justiciar", B25_PARTY, "assets/story/portraits/queen_aelyria.png", "assets/story/portraits/corvaline.png", "assets/story/portraits/maren.png", "assets/story/portraits/bako.png", "assets/story/portraits/durgrim.png", "assets/story/portraits/brakka.png"],
    "Argent slams her gavel-sword down and cold silver light bursts out, the party chained and bowed below, witnesses in the gallery (Queen Aelyria, Corvaline, Maren, Bako, Durgrim, Brakka) with grim faces, a huge round brass clock-dial above the bench. " + B25_NOANG],
  ["b2s5_p5_lockboxes", "story/panels/b2s5_p5_lockboxes.png", "Panel S5-5: the deck confiscated", "panel", ["bailiff", B25_PARTY],
    "Brass clockwork bailiffs sweep the party's battle cards, deck and weapons into rows of brass lockboxes with heavy padlocks in a vaulted brass evidence room, the chained party watching helpless, drifting playing cards. " + B25_NOANG],
  ["b2s5_p6_cell_galleries", "story/panels/b2s5_p6_cell_galleries.png", "Panel S5-6: the cell galleries", "panel", ["chainbearer", B25_PARTY],
    "The prison galleries of Aurelion, tiers of barred brass cells up into the dark with cold silver lantern light, the party in their cells reaching through the bars toward each other, a chain-bound clockwork guard on the walkway, parchment sentences on every door. " + B25_NOANG],
  ["b2s5_p7_escape_great_scale", "story/panels/b2s5_p7_escape_great_scale.png", "Panel S5-7: escape onto the Great Scale", "panel", ["great_scale_portrait", "brass_warden", B25_PARTY],
    "The freed party runs across a vast brass board out onto the colossal brass Great Scale, cell doors broken behind them, chains snapped, brass wardens chasing, giant gears all around, clouds far below. " + B25_NOANG],
  ["b2s5_p8_scale_pans", "story/panels/b2s5_p8_scale_pans.png", "Panel S5-8: the Scale's pans", "panel", ["great_scale_portrait", B25_PARTY],
    "The two huge brass pans of the Great Scale hanging from giant chains, the small party standing in one pan, the other pan empty and rising, huge gears turning, a vast sky beyond. " + B25_NOANG],
  ["b2s5_p9_scale_level", "story/panels/b2s5_p9_scale_level.png", "Panel S5-9: the Scale settles level", "panel", ["great_scale_portrait", B25_PARTY],
    "The Great Scale settles perfectly level, both pans balanced, the party in one pan and a pile of their confiscated deck cards in the other, warm golden-and-silver light across the gears, awed faces, a glowing gear dial at the pivot pointing to the exact middle (the verdict: neither guiltless nor guilty, human). " + B25_NOANG],
  ["b2s5_p10_foundation_cracks", "story/panels/b2s5_p10_foundation_cracks.png", "Panel S5-10: Aurelion's foundation cracks", "panel", ["great_scale_portrait", B25_PARTY],
    "Aurelion's foundation cracks: the huge brass beam and pivot of the Great Scale under the floating city splits with a jagged line of cold silver light, gears popping off, towers tilting, chains snapping, scrolls and brass debris falling into the clouds, the party clinging on. " + B25_NOANG],
  ["b2s5_p11_sentence_on_the_world", "story/panels/b2s5_p11_sentence_on_the_world.png", "Panel S5-11: Argent passes sentence on the world", "panel", ["argent_justiciar", B25_PARTY],
    "Argent, corrupted by cold silver light, stands on the cracking court platform and raises her gavel-sword and the blazing Orb of Verdicts to pass sentence on the whole world, tiny villages and cities of every land far below the clouds, the party small in front of her (no antlered elf king). " + B25_NOANG],
  ["b2s5_p12_golden_dust", "story/panels/b2s5_p12_golden_dust.png", "Panel S5-12: Vaeltharion's dust speaks to Argent (mid-boss)", "panel", ["vaeltharion_dust_portrait", "argent_justiciar", B25_PARTY],
    "Vaeltharion's golden dust swirls in the courtroom in the shape of his antlered silhouette and speaks to High Justiciar Argent, who stands frozen on her bench with the Orb of Verdicts, the party watching below, cold silver light meeting warm gold dust. " + B25_NOANG],
  ["b2s5_p13_gavel_shatters", "story/panels/b2s5_p13_gavel_shatters.png", "Panel S5-13: the gavel-sword shatters", "panel", ["argent_justiciar"],
    "Close-up: Argent's huge gavel-sword shatters into shards of silver steel and brass and a single quicksilver tear runs down her brass face, cracks of silver light spreading over her robes. " + B25_NOANG],
  ["b2s5_p14_orb_cleansed", "story/panels/b2s5_p14_orb_cleansed.png", "Panel S5-14: the Orb cleansed, the fifth shard", "panel", ["argent", B25_PARTY],
    "The Orb of Verdicts, cleansed from cold silver to a warm clear golden-white glow, floats in the hands of the redeemed Argent, and a fifth glowing violet crystal shard tears free and bursts upward, the party shielding their eyes, golden light on the brass courtroom. " + B25_NOANG],
  ["b2s5_p15_five_shards", "story/panels/b2s5_p15_five_shards.png", "Panel S5-15: five shards fly to the broken scales", "panel", ["assets/story/portraits/queen_aelyria.png", B25_PARTY],
    "On the edge of the broken brass platform of Aurelion, a hooded Keeper seen from behind and Queen Aelyria watch five glowing violet crystal shards streak through a vast twilight sky toward a pair of broken balance scales hanging in the distance, one pan white, one black. " + B25_NOANG],
  ["b2s5_p16_two_toned_voice", "story/panels/b2s5_p16_two_toned_voice.png", "Panel S5-16: the two-toned voice (broken scales)", "panel", ["cardback_broken_scales"],
    "A huge pair of broken balance scales floating in a dark star-filled sky, the beam snapped in the middle, the left pan pure glowing white and the right pan pure black, five violet crystal shards orbiting between them, a two-toned shimmer of half white half black light radiating outward like a voice. " + B25_NOANG],
  ["b2s5_p17_violet_chaos", "story/panels/b2s5_p17_violet_chaos.png", "Panel S5-17: violet chaos on every land", "panel", [B25_PARTY],
    "Violet chaos pours onto every land at once: a split panorama of rolling violet clouds and glowing violet crystals falling onto a green farm village, a snowy mountain, a desert city, a coast with ships and forests, tiny villagers looking up in fear. " + B25_NOANG],
  ["b2s5_p18_argent_kneels", "story/panels/b2s5_p18_argent_kneels.png", "Panel S5-18: Argent kneeling", "panel", ["argent", B25_PARTY],
    "Argent, the redeemed clockwork judge, kneeling alone in the wrecked brass courtroom among broken gears and fallen parchment scrolls, her shattered gavel-sword hilt in her lap, a single quicksilver tear on her brass cheek, warm gold-silver light, the party a respectful distance behind her. " + B25_NOANG],
  ["b2s5_p19_end_of_book_two", "story/panels/b2s5_p19_end_of_book_two.png", "Panel S5-19: End of Book 2 title card", "panel", [B25_PARTY],
    "Title-card illustration for the end of a book: a dramatic dark twilight sky over a sea of clouds, five glowing violet crystal shards forming a ring above a pair of broken brass balance scales (one pan white, one black), the small party in silhouette on a cliff in the foreground, calm empty space in the center and bottom for a title added later, no text. " + B25_NOANG],
];

export const BOOK2_S5_REQUESTS: ArtRequest[] = mapB2Rows(B25, B25_GROUP, "book2s5");

// ----- v2.8 Beta Berserker: Orc units, grunt axes, Mythic projectiles (made with the Higgsfield MCP, see docs/features/v2.8-beta-berserker/ART_PROMPTS.md) -----
const B28_GROUP = "v2.8 Arts Requirements";
const B28_VFX = "Single game sprite, centered with margin, no ground shadow.";
const B28: B22Row[] = [
  ["peon", "units/peon.png", "Orc unit: Peon (still)", "ally", ["units/witch_doctor.webp"],
    "Peon, a humble green-skinned orc worker, short and hunched with small tusks and a goofy tired grin, ragged brown vest and patched trousers, a chipped pickaxe over one shoulder and a bulging burlap sack of loot (a few gold coins spilling out) in the other hand, facing slightly right."],
  ["grunt", "units/grunt.png", "Orc unit: Grunt (still)", "ally", ["units/witch_doctor.webp"],
    "Grunt, a muscular green-skinned orc warrior, broad shoulders, heavy jaw with two upward tusks, red war paint, studded leather pauldrons and an iron-banded belt, a big single-bladed battle axe in a ready pose, fierce scowl, facing slightly right."],
  ["headhunter", "units/headhunter.png", "Orc unit: Headhunter (still)", "ally", ["units/witch_doctor.webp"],
    "Headhunter, a lean agile green-skinned orc spear thrower with long tusks, a black mohawk, tribal tattoos, a necklace of small trophy skulls and feathers, fur loincloth and bone bracers, raising a long wooden spear with a stone tip, a quiver of spears on his back, cunning grin, facing slightly right."],
  ["spirit_walker", "units/spirit_walker.png", "Orc unit: Spirit Walker (still)", "ally", ["units/witch_doctor.webp"],
    "Spirit Walker, a wise green-skinned orc shaman with a white braided beard and small tusks, feathered headdress, blue-teal ceremonial cloak with glowing white runes, one hand holding up a carved wooden lantern with a ghostly cyan spirit flame and a faint smiling ghost wisp inside, a gnarled staff in the other hand, facing slightly right."],
  ["kodo_beasts", "units/kodo_beasts.png", "Orc unit: Kodo Beasts (still)", "ally", ["units/witch_doctor.webp"],
    "Kodo Beasts, a huge armored tusked war beast (giant shaggy rhino-elephant) with thick grey-brown hide, bronze plate armor, two big curved tusks, a pair of large taut war drums with bone-and-hide straps on its back, a small green-skinned orc drummer on top beating the drums with two mallets, three-quarter view facing slightly right."],
  ["peon_card", "cards/portraits/peon.png", "Orc card portrait: Peon", "cardportrait", ["peon"], "Trading-card portrait of the Peon orc from the first reference, bust from the chest up, three-quarter view, warm golden mine-cave background with glints of gold. Square 1:1, full-bleed, no card frame, no border, no text."],
  ["grunt_card", "cards/portraits/grunt.png", "Orc card portrait: Grunt", "cardportrait", ["grunt"], "Trading-card portrait of the Grunt orc from the first reference, bust from the chest up, three-quarter view, fiery red-orange battlefield sky background. Square 1:1, full-bleed, no card frame, no border, no text."],
  ["headhunter_card", "cards/portraits/headhunter.png", "Orc card portrait: Headhunter", "cardportrait", ["headhunter"], "Trading-card portrait of an original orc spear thrower (lean face, long tusks, black mohawk, tribal tattoos, holding a spear, feather and wooden-bead necklace), bust from the chest up, three-quarter view, dark jungle-green dusk background. Square 1:1, full-bleed, no card frame, no border, no text. (With the still as a reference and a skull necklace the content filter blocked it twice; the done image was made from text only.)"],
  ["spirit_walker_card", "cards/portraits/spirit_walker.png", "Orc card portrait: Spirit Walker", "cardportrait", ["spirit_walker"], "Trading-card portrait of the Spirit Walker orc shaman from the first reference, bust from the chest up, three-quarter view, mystical deep blue and cyan ghostly spirit-mist background. Square 1:1, full-bleed, no card frame, no border, no text."],
  ["kodo_beasts_card", "cards/portraits/kodo_beasts.png", "Orc card portrait: Kodo Beasts", "cardportrait", ["kodo_beasts"], "Trading-card portrait of the Kodo Beasts from the first reference (armored kodo head and shoulders, tusks, orc drummer and war drums on top), three-quarter view, dusty orange savanna sunset background. Square 1:1, full-bleed, no card frame, no border, no text."],
  ["grunt_axe_0", "vfx/weapons/grunt_axe_0.png", "Grunt axe tier 0: stone hatchet", "prop", ["vfx/weapons/axe.webp"], "Same style, size and orientation as the reference axe (horizontal, head on the left, handle to the right). A crude STONE HATCHET: chipped grey stone blade lashed with leather cords to a short rough wooden handle with bark."],
  ["grunt_axe_1", "vfx/weapons/grunt_axe_1.png", "Grunt axe tier 1: iron axe", "prop", ["vfx/weapons/axe.webp"], "Same style, size and orientation as the reference axe. A sturdy IRON AXE: plain steel single-bladed head, dark wood handle with leather grip wrap."],
  ["grunt_axe_2", "vfx/weapons/grunt_axe_2.png", "Grunt axe tier 2: bearded war axe", "prop", ["vfx/weapons/axe.webp"], "Same style, size and orientation as the reference axe. A BEARDED WAR AXE: big wide crescent steel blade with a hooked lower beard, rune-etched, bronze trim, long dark haft with iron rings."],
  ["grunt_axe_3", "vfx/weapons/grunt_axe_3.png", "Grunt axe tier 3: double-bladed bloodied axe", "prop", ["vfx/weapons/axe.webp"], "Same style, size and orientation as the reference axe. A DOUBLE-BLADED battle axe, two big crescent blades back to back, dark steel stained with dripping red blood, spikes on top, black haft wrapped in red cloth."],
  ["grunt_axe_4", "vfx/weapons/grunt_axe_4.png", "Grunt axe tier 4: flaming chieftain axe", "prop", ["vfx/weapons/axe.webp"], "Same style, size and orientation as the reference axe. A legendary FLAMING CHIEFTAIN AXE: huge double-bladed black-iron head with glowing molten orange cracks, wreathed in orange and yellow flames, skull-and-horn ornaments, gold-banded haft."],
  ["proj_lantern", "vfx/proj_lantern.png", "Projectile: spirit lantern", "prop", [], "Game projectile: a small carved wooden spirit lantern with glowing cyan-white flame and a tiny ghostly wisp inside, tilted as if thrown, a short trailing wisp of cyan ghost smoke. " + B28_VFX],
  ["drum_ring", "vfx/drum_ring.png", "VFX: drum ring", "prop", [], "VFX: a war-drum shockwave ring, a thick round ring of orange and gold energy with a red outer edge and little sound-wave arcs radiating outward, centre empty. " + B28_VFX],
  ["spirit_wisp", "vfx/spirit_wisp.png", "VFX: spirit wisp", "prop", [], "VFX: a friendly ancestral spirit wisp, glowing cyan and white teardrop ghost flame with a wavy tail, calm closed-eye face, cyan sparkle droplets. " + B28_VFX],
  ["pillage_coins", "vfx/pillage_coins.png", "VFX: pillage coins", "prop", [], "VFX: a burst of shiny gold coins flying up and outward in a fountain, gold sparkle stars, a puff of gold dust. " + B28_VFX],
  ["proj_void_rift", "vfx/proj_void_rift.png", "Mythic projectile: void rift (green screen)", "prop", [], "Game projectile: a small swirling black-hole vortex orb, deep black centre, violet and indigo spiral arms, purple rim, tiny stars, short violet trail to the left. Made on pure GREEN (#00FF00), keyed with keyimg.py (default colour). " + B28_VFX],
  ["proj_dragon_flame", "vfx/proj_dragon_flame.png", "Mythic projectile: dragon flame", "prop", [], "Game projectile: a roaring teardrop fireball shaped like a dragon head breathing flame, orange, red and yellow with a golden core, flame tail to the left. " + B28_VFX],
  ["proj_chrono_gear", "vfx/proj_chrono_gear.png", "Mythic projectile: chrono gear", "prop", [], "Game projectile: a spinning brass and gold clockwork cog with eight teeth, glowing cyan clock-hand and hourglass-blue gem hub, cyan time sparkles; round, flat front view so it can spin. " + B28_VFX],
  ["monkey_cloud", "vfx/monkey_cloud.png", "Mythic trail: monkey king gold cloud", "prop", [], "VFX: a golden magic flying-cloud trail puff, fluffy swirly ruyi cloud in bright gold and cream yellow with spirals and tiny gold sparkles. " + B28_VFX],
  ["impact_void_rift", "vfx/impact_void_rift.png", "Mythic impact: void rift (green screen)", "prop", [], "Impact burst: collapsing violet and black implosion, swirling arms, dark centre, purple shards and white sparkles. Made on pure GREEN (#00FF00). " + B28_VFX],
  ["impact_dragon_flame", "vfx/impact_dragon_flame.png", "Mythic impact: dragon flame", "prop", [], "Impact burst: roaring orange, red and golden fire blast with a faint dragon-head silhouette, embers and gold scale sparks. " + B28_VFX],
  ["impact_chrono_gear", "vfx/impact_chrono_gear.png", "Mythic impact: chrono gear", "prop", [], "Impact burst: flying brass gears and cogs, cyan clock-face ripples, pocket-watch fragments, cyan and gold sparkles. " + B28_VFX],
  ["monkey_impact", "vfx/monkey_impact.png", "Mythic impact: monkey king staff", "prop", [], "Impact burst: golden shockwave with a crossed pair of golden staff-strike lines, gold stars, a puff of golden cloud, orange-red sparks. " + B28_VFX],
  ["element_normal", "ui/elements/normal.png", "Element emblem: Normal", "prop", ["ui/element_fire.webp"], "Element emblem for NORMAL matching the fire emblem in shape (round beveled medallion ring, gem on top, small wings) but neutral: silver-grey metal ring, white and light-grey centre with a white four-point star, clear white-grey gem, silver wings. Readable at 48 px."],
  ["pvp_poster", "story/pvp_poster.png", "Lobby carousel card: PvP poster (4:3, not 16:9)", "panel", ["assets/story/lab_poster.png"],
    "Versus-style PvP battle poster in the style of the lab poster: two armies clash head-on on a wide grassy battlefield, a blue-and-gold human kingdom army (knights, archer, wizard) on the left and a red-and-green rival army (orc warrior with axe, fox samurai, skeleton mage) on the right, a white-gold lightning flash splitting the middle, banners, castles in the background. Aspect 4:3."],
];

export const BOOK2_S28_REQUESTS: ArtRequest[] = mapB2Rows(B28, B28_GROUP, "v28");

/** The awakened art the game already has: index.json from the asset base. */
export interface HaveArt {
  units_awakened: string[];
  portraits_awakened: string[];
}

export function artRequests(have: HaveArt): ArtRequest[] {
  return [
    ...BOOK2_S1_REQUESTS,
    ...BOOK2_S23_REQUESTS,
    ...BOOK2_S4_REQUESTS,
    ...BOOK2_S5_REQUESTS,
    ...BOOK2_S28_REQUESTS,
    ...awakened(have),
    ...TRAITS.map((t) => icon("Monster trait icons", "trait", "ui/traits", t, `Trait: ${t}`, `Monster trait badge icon: ${TRAIT_ART[t]}, inside a round dark badge.`, ["ui/icon_buttons_set.webp"])),
    ...PERK_IDS.filter((p) => p !== "none").map((p) =>
      icon("Perk icons", "perk", "ui/perks", p, `Perk: ${PERKS[p].label}`, `Unit perk icon for "${PERKS[p].label}" (${PERKS[p].text}): ${PERK_ART[p]}, inside a round gold-rimmed badge.`, ["ui/icon_buttons_set.webp"]),
    ),
    ...ELEMENTS.map((e) => ({
      id: `element:${e}`,
      group: "Element emblems",
      title: `Element: ${e}`,
      file: `ui/elements/${e}.png`,
      model: "Nano Banana Pro" as const,
      aspect: "1:1" as const,
      refs: [EMBLEM_ANCHOR],
      prompt:
        `An element emblem for ${e.toUpperCase()}, in exactly the same style, outline thickness, glossy shading and proportions as the reference crest: ${ELEMENT_ART[e]}. ` +
        `${EMBLEM} Single emblem, centered with margin, on a solid flat pure ${GREENISH_ELEMENTS.has(e) ? "magenta (#FF00FF)" : "green (#00FF00)"} background.`,
    })),
    ...RACE_IDS.map((r) => ({
      id: `race:${r}`,
      group: "Race crests",
      title: `Race: ${RACES[r].label}`,
      file: `ui/races/${r}.png`,
      model: "Nano Banana Pro" as const,
      aspect: "1:1" as const,
      refs: [EMBLEM_ANCHOR],
      prompt:
        `A heraldic crest for the ${RACES[r].label} race, in exactly the same style, outline thickness, glossy shading and proportions as the reference crest: ${RACE_ART[r]}, set on a shield with ` +
        `enamel in #${RACES[r].color.toString(16).padStart(6, "0")} and a glossy metal rim. ${RACE_WINGS[r] ?? "No wings: the shield alone, maybe with a small race-themed ornament on top."} ` +
        `${EMBLEM} Single emblem, centered with margin, on a solid flat pure ${GREENISH_RACES.has(r) ? "magenta (#FF00FF)" : "green (#00FF00)"} background.`,
    })),
    // v2.9 league revamp: badges after Champion (league_ranks_extra_<n>.png follow the atlas, see build_assets.py).
    ...LEAGUE_BADGE_ART.map(([n, title, what]) => ({
      id: `league:${n}`,
      group: "League badges",
      title,
      file: `ui/league_ranks_extra_${n}.png`,
      model: "Nano Banana Pro" as const,
      aspect: "1:1" as const,
      refs: [BADGES[6], BADGES[5], BADGES[4]],
      prompt:
        `A league rank badge in exactly the same style, outline thickness, glossy beveled shading and proportions as the reference badges: ${what}. ` +
        `${EMBLEM} Single badge, centered with margin, on a solid flat pure green (#00FF00) background.`,
    })),
    ...Object.keys(ARCH_ART).map((a) =>
      icon("Archetype icons", "arch", "ui/archs", a, `Archetype: ${a}`, `Unit fighting-style icon: ${ARCH_ART[a]}, inside a rounded-square dark badge.`, ["ui/icon_buttons_set.webp"]),
    ),
    ...AVATARS.map((what, i) => ({
      id: `avatar:${i + 1}`,
      group: "Player avatars",
      title: `Avatar ${i + 1}`,
      file: `ui/avatars/avatar_${i + 1}.png`,
      model: "Nano Banana 2" as const,
      aspect: "1:1" as const,
      refs: ["ui/avatar_frame.webp", STYLE_ANCHOR],
      prompt: `${STYLE} Round player avatar portrait of ${what}, head and shoulders, big friendly eyes, centered, filling a circle, on a plain soft single-color background. Square 1:1.`,
    })),
    ...GLYPHS.map(([k, what]) => icon("UI glyphs", "glyph", "ui/glyphs", k, `Glyph: ${k}`, `Game UI glyph: ${what}.`, ["ui/hud_elements.webp"])),
    ...VFX_LIST.map(([group, key, title, what, magenta]) => ({
      // proj_spark keeps its original id so any saved row still matches.
      id: key === "proj_spark" ? "vfx:spark" : `vfx:${key}`,
      group,
      title,
      file: `vfx/${key}.png`,
      model: "Nano Banana 2" as const,
      aspect: "1:1" as const,
      refs: [key.endsWith("_awakened") ? `vfx/${key.replace("_awakened", "")}.webp` : "vfx/proj_fireball.webp", "vfx/hit_spark.webp", STYLE_ANCHOR],
      prompt:
        `${STYLE} Game visual effect sprite: ${what}, matching the reference effects. Bright glowing colors, one single frame, ` +
        `centered with margin, nothing else in frame, on a solid flat pure ${magenta ? "magenta (#FF00FF)" : "green (#00FF00)"} background.`,
    })),
    ...WEAPONS.map(([key, what, motion]) => ({
      id: `weapon:${key}`,
      group: "Weapons (generic)",
      title: `Weapon: ${key.replace(/_/g, " ")} (${motion})`,
      file: `vfx/weapons/${key}.png`,
      model: "Nano Banana 2" as const,
      aspect: "1:1" as const,
      refs: ["vfx/proj_arrow.webp", "vfx/hit_spark.webp", STYLE_ANCHOR],
      prompt:
        `${STYLE} Game weapon sprite for a thrown attack: ${what}. Plain neutral materials (steel, wood, gold, leather), no elemental glow, no fire, no magic, ` +
        `${motion === "strike" ? "drawn as a bold white-and-grey effect shape" : "seen flat from the side, the whole weapon visible"}. ` +
        `One single object, centered with margin, nothing else in frame, on a solid flat pure green (#00FF00) background.`,
    })),
    ...SIGNATURE_WEAPONS.map(([id, name, what]) => ({
      id: `weapon-sig:${id}`,
      group: "Weapons (signature)",
      title: `Signature weapon: ${name}`,
      file: `vfx/weapons/sig_${id}.png`,
      model: "Nano Banana Pro" as const,
      aspect: "1:1" as const,
      refs: [U(id), STYLE_ANCHOR],
      prompt:
        `${STYLE} Game weapon sprite: the ${name}'s weapon from the reference character, ${what}. Same colors and design as the weapon the character holds, ` +
        `but on its own with no character, seen flat from the side, the whole weapon visible, bright and glowing. ` +
        `One single object, centered with margin, nothing else in frame, on a solid flat pure ${id === "monkey_king" ? "magenta (#FF00FF)" : "green (#00FF00)"} background.`,
    })),
    ...SCENES.map(([group, k, title, aspect, model, refs, what]) => {
      const site = group === "Website images";
      return {
        id: `${site ? "website" : "marketing"}:${k}`,
        group,
        title,
        file: `${site ? "website" : "marketing"}/${k}.png`,
        model,
        aspect,
        refs: [...refs, STYLE_ANCHOR],
        prompt: `${STYLE} ${what.includes("NO characters") ? "" : `${CAST} `}${what}`,
      };
    }),
    ...EMOTES.map(([k, ref, what]) => ({
      id: `emote:${k}`,
      group: "Extra emotes",
      title: `Emote: ${k.replace("_", " ")}`,
      file: `ui/emotes/${k}.png`,
      model: "Nano Banana Pro" as const,
      aspect: "1:1" as const,
      refs: [ref, "emotes/goblin_laugh.webp", "emotes/witch_thumbsup.webp", STYLE_ANCHOR],
      prompt:
        `${STYLE} Chat emote sticker of the character in the first reference, drawn exactly as it looks there (same face, colors and outfit): ${what}. ` +
        `Big expressive face, exaggerated emotion, head and upper body, framed like the other reference emotes. ${ICON}`,
    })),
  ];
}
