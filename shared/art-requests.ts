/**
 * The art wish list behind the admin's Art requests page: every image still to make on
 * Higgsfield's unlimited image models, with its prompt. The admin pastes each result's link;
 * the D1 table art_requests keeps only the link, status and notes. `file` is where the image
 * goes in the raw pack (assets/), from which tools/build_assets.py builds the game files.
 */
import { ELEMENTS, UNITS, type Element, type Rarity } from "./units.ts";
import { noAttack, isSupport } from "./support.ts";
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
    if (u.storyOnly || !canAwaken(u.arch)) continue;
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
          `${noAttack(u.arch) ? "Confident commanding pose" : "Heroic ready-to-attack pose"}, facing slightly right. ${GREEN}`,
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

const WEBSITE: [string, string, string, string][] = [
  ["hero", "Homepage hero banner", "16:9", "Wide promotional key art for a fantasy tower defense game called Crown & Keep: a line of cute hero units (an archer, a knight, a fire witch, a frost yeti) defending a castle gate on a winding path against a monster horde (orcs, slimes, skeletons) led by a giant boss, epic sunset sky. Leave calm empty space on the left third for a headline. 1920x1080."],
  ["merge", "Merge feature image", "16:9", "Game feature illustration: two identical cute archer units on glowing board tiles merging into one bigger, upgraded archer with a burst of sparkles and a +1 star, top-down board view."],
  ["pvp", "PvP feature image", "16:9", "Game feature illustration: two rival players' armies face each other across a split battlefield, a glowing VS emblem in the middle, red side versus blue side, monsters charging down both lanes."],
  ["stories", "Stories feature image", "16:9", "Game feature illustration: an open storybook with a candy kingdom castle popping out of the pages, a princess waving from a tower, corrupted purple vines creeping in."],
  ["collection", "Collection feature image", "16:9", "Game feature illustration: a fan of trading cards with cute fantasy heroes in common, rare, epic, legendary and mythic frames, the mythic card glowing in the center, gold coins and chests around."],
  ["leagues", "Leagues feature image", "16:9", "Game feature illustration: a tall stone staircase climbing into the clouds, a shiny league badge on each step (bronze, silver, gold, crystal, master), a giant gold champion trophy glowing at the top, a tiny hero climbing it."],
  ["heroes", "Heroes feature image", "16:9", "Game feature illustration: eight cute fantasy commanders (a knight queen, a wizard, a pirate captain, a druid, a necromancer, an engineer, a dragon rider, a monk) posing together on a castle wall like a team poster, banners flying."],
];

/** Marketing images: social, ads and downloads (not used by the game itself). */
const HOLD = "Leave a calm, uncluttered band for a headline added later.";
const MARKETING: [string, string, string, ArtRequest["aspect"], ArtModel, string][] = [
  // [group, key, title, aspect, model, what]
  ["Social profiles", "discord_icon", "Discord server icon", "1:1", "Nano Banana Pro", "Round server icon: a golden crown sitting on top of a small chunky castle keep, bold and centered, readable at 48 pixels, on a royal-blue circle."],
  ["Social profiles", "discord_banner", "Discord server banner", "16:9", "Nano Banana Pro", `Wide banner: a cozy castle courtyard where cute hero units hang out (an archer, a knight, a fire witch, a frost yeti, an owl wizard), torches and banners, evening light. ${HOLD}`],
  ["Social profiles", "youtube_banner", "YouTube channel banner", "16:9", "Seedream 4.5", "Very wide channel banner (2560x1440, keep everything important inside the middle 1546x423 strip): a row of cute hero units on a castle wall facing a monster horde on the horizon, epic sunset sky."],
  ["Social profiles", "facebook_cover", "Facebook / X cover", "16:9", "Seedream 4.5", `Wide cover image (3:1 crop safe): a winding path to a castle gate guarded by cute hero units, monsters marching in from the right, bright daytime sky. ${HOLD}`],
  ["Unit of the Day posts", "uotd_square", "Unit of the Day: square", "1:1", "Nano Banana 2", "Social post background: a glowing round spotlight stage on a castle floor, royal blue and gold, sparkles, an empty pedestal in the center for a unit card to be placed on, decorative corners. Leave the center empty."],
  ["Unit of the Day posts", "uotd_story", "Unit of the Day: story", "9:16", "Nano Banana 2", "Vertical story background: a tall glowing spotlight beam onto an empty pedestal, royal blue and gold, banners on both sides, sparkles. Leave the middle empty for a unit card and the top for a title."],
  ["Unit of the Day posts", "uotd_feed", "Unit of the Day: feed", "4:5", "Nano Banana 2", "Feed post background: an empty card display stand on a velvet castle table, royal blue and gold, candles and coins around the edges. Leave the center empty for a unit card."],
  ["Ad images", "ad_merge_sq", "Ad: Merge to win (square)", "1:1", "Nano Banana 2", `Mobile game ad image: two identical cute archers on glowing tiles merging into one big powerful archer in a burst of light, monsters blasted back. ${HOLD}`],
  ["Ad images", "ad_merge_story", "Ad: Merge to win (story)", "9:16", "Nano Banana 2", `Vertical mobile game ad image: a 3x3 board of cute fantasy units with two matching knights merging in a burst of light into a bigger knight, monsters on the path below. ${HOLD}`],
  ["Ad images", "ad_pvp_sq", "Ad: Beat your friend (square)", "1:1", "Nano Banana 2", `Mobile game ad image: two cute rival heroes glaring at each other across a split battlefield, blue side versus red side, one sending a giant monster at the other, a glowing VS emblem. ${HOLD}`],
  ["Ad images", "ad_pvp_story", "Ad: Beat your friend (story)", "9:16", "Nano Banana 2", `Vertical mobile game ad image: two stacked battlefields, blue on top and red below, a giant monster leaping from one to the other, a glowing VS emblem in the middle. ${HOLD}`],
  ["Ad images", "ad_champion_sq", "Ad: Climb to Champion (square)", "1:1", "Nano Banana 2", `Mobile game ad image: a cute knight raising a huge gold champion trophy on a mountain peak, league badges shining like stars in the sky, confetti. ${HOLD}`],
  ["Ad images", "ad_champion_story", "Ad: Climb to Champion (story)", "9:16", "Nano Banana 2", `Vertical mobile game ad image: a tall staircase of league badges rising into the clouds, a cute hero leaping up the steps toward a giant glowing gold champion trophy. ${HOLD}`],
  ["Ad images", "ad_boss_sq", "Ad: Stop the boss (square)", "1:1", "Nano Banana 2", `Mobile game ad image: a giant angry boss monster stomping toward a tiny castle, a line of brave cute hero units blocking the path, dramatic red sky. ${HOLD}`],
  ["Ad images", "ad_awaken_sq", "Ad: Awaken your heroes (square)", "1:1", "Nano Banana Pro", `Mobile game ad image: split before-and-after of the same cute fire witch, plain on the left and awakened on the right with a blazing flame aura, golden armor and a huge staff. ${HOLD}`],
  ["Release thumbnails", "news_v1_1", "News: v1.1 Supporting Cast", "16:9", "Nano Banana Pro", "News thumbnail: a group of cute support characters (a mime, a lucky cat, an owl with an hourglass, a bard with a war banner, a brewer with a cauldron) stepping onto a theatre stage under a spotlight."],
  ["Release thumbnails", "news_v1_2", "News: v1.2 Stories", "16:9", "Nano Banana Pro", "News thumbnail: an open glowing storybook with a candy kingdom castle rising from its pages, a candy king waving, purple corruption creeping at the edges."],
  ["Release thumbnails", "news_v1_3", "News: v1.3 Crown & Keep", "16:9", "Nano Banana Pro", "News thumbnail: a shining golden crown placed on top of a small sturdy castle keep, fireworks and banners behind it, a grand reveal."],
  ["Release thumbnails", "news_pvp", "News: PvP", "16:9", "Nano Banana Pro", "News thumbnail: two cute rival commanders shaking hands over a split battlefield, sparks flying, blue versus red, a glowing VS emblem."],
  ["Wallpapers", "wall_fire_desktop", "Wallpaper: Fire (desktop)", "16:9", "Seedream 4.5", "Desktop wallpaper: a volcano arena at dusk, a cute fire witch and a phoenix defending a lava path, glowing embers drifting, rich detail."],
  ["Wallpapers", "wall_ice_desktop", "Wallpaper: Ice (desktop)", "16:9", "Seedream 4.5", "Desktop wallpaper: a snowy tundra village at night under auroras, a cute frost yeti and an ice mage guarding a frozen path, snow falling."],
  ["Wallpapers", "wall_nature_desktop", "Wallpaper: Nature (desktop)", "16:9", "Seedream 4.5", "Desktop wallpaper: a giant glowing mushroom forest, a cute elf archer and a treant guarding a mossy path, fireflies."],
  ["Wallpapers", "wall_candy_desktop", "Wallpaper: Candy (desktop)", "16:9", "Seedream 4.5", "Desktop wallpaper: a candy palace on a hill of sweets under a pink sky, a candy princess and gummy guards, sprinkles in the air."],
  ["Wallpapers", "wall_castle_phone", "Wallpaper: Castle (phone)", "9:16", "Seedream 4.5", "Phone wallpaper: a tall castle keep with a golden crown on its tower, a winding path below guarded by cute heroes, monsters far away, stars above. Keep the top quarter calm for the clock."],
  ["Wallpapers", "wall_boss_phone", "Wallpaper: Boss (phone)", "9:16", "Seedream 4.5", "Phone wallpaper: a giant boss monster towering over a tiny brave knight on a cliff, dramatic storm sky. Keep the top quarter calm for the clock."],
  ["Wallpapers", "wall_pvp_phone", "Wallpaper: PvP (phone)", "9:16", "Seedream 4.5", "Phone wallpaper: a red army on top and a blue army below clashing in the middle with a glowing VS emblem. Keep the top quarter calm for the clock."],
];

const EMOTES: [string, string][] = [
  ["dragon_laugh", "a baby dragon laughing so hard it puffs smoke"],
  ["yeti_shiver", "a frost yeti shivering with chattering teeth"],
  ["mermaid_wave", "a mermaid waving hello from a splash of water"],
  ["skeleton_shrug", "a skeleton shrugging, its jaw dropping off"],
  ["cat_wink", "a lucky cat winking and raising a paw with a gold coin"],
  ["mime_shock", "a mime gasping with hands on cheeks"],
  ["orc_flex", "an orc flexing huge arms proudly"],
  ["ghost_boo", "a ghost popping out with a cheeky grin"],
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

/** The awakened art the game already has: index.json from the asset base. */
export interface HaveArt {
  units_awakened: string[];
  portraits_awakened: string[];
}

export function artRequests(have: HaveArt): ArtRequest[] {
  return [
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
    ...WEBSITE.map(([k, title, aspect, what]) => ({
      id: `website:${k}`,
      group: "Website images",
      title,
      file: `website/${k}.png`,
      model: (k === "hero" ? "Seedream 4.5" : "Seedream 5.0 lite") as ArtModel,
      aspect: aspect as "16:9",
      refs: ["brand/og_image.png", STYLE_ANCHOR],
      prompt: `${STYLE} ${what}`,
    })),
    ...MARKETING.map(([group, k, title, aspect, model, what]) => ({
      id: `marketing:${k}`,
      group,
      title,
      file: `marketing/${k}.png`,
      model,
      aspect,
      refs: ["assets/brand/key_art_1920x1080.png", STYLE_ANCHOR],
      prompt: `${STYLE} ${what}`,
    })),
    ...EMOTES.map(([k, what]) => ({
      id: `emote:${k}`,
      group: "Extra emotes",
      title: `Emote: ${k.replace("_", " ")}`,
      file: `ui/emotes/${k}.png`,
      model: "Nano Banana 2" as const,
      aspect: "1:1" as const,
      refs: ["emotes/goblin_laugh.webp", "emotes/witch_thumbsup.webp", STYLE_ANCHOR],
      prompt: `${STYLE} Chat emote sticker: ${what}. Big expressive face, exaggerated emotion, head and upper body, matching the reference emotes. ${ICON}`,
    })),
  ];
}
