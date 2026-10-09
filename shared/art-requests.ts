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
};

const ICON ="Single centered icon, bold simple shape that stays readable at 32 pixels, on a solid flat pure green (#00FF00) background.";

const AURA: Record<Element, string> = {
  fire: "a blazing flame aura, molten-gold and ember-orange trim, glowing embers",
  ice: "a frosty crystal aura, an ice-crystal crown, silver and pale-blue trim, drifting snowflakes",
  lightning: "a crackling electric aura, storm-gold trim, small lightning arcs",
  nature: "a leafy emerald aura, curling vines and blossoms, gold trim",
  poison: "a bubbling toxic-green aura, violet and lime trim, floating bubbles",
  arcane: "swirling violet arcane runes, starry gold trim, a glowing halo",
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

/** The awakened art the game already has: index.json from the asset base. */
export interface HaveArt {
  units_awakened: string[];
  portraits_awakened: string[];
}

export function artRequests(have: HaveArt): ArtRequest[] {
  return [
    ...BOOK2_S1_REQUESTS,
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
