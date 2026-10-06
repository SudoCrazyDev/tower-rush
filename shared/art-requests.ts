/**
 * The art wish list behind the admin's Art requests page: every image still to make on
 * Higgsfield's unlimited image models, with its prompt. The admin pastes each result's link;
 * the D1 table art_requests keeps only the link, status and notes. `file` is where the image
 * goes in the raw pack (assets/), from which tools/build_assets.py builds the game files.
 */
import { UNITS, type Element, type Rarity } from "./units.ts";
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
  aspect: "1:1" | "16:9" | "9:16";
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
const ICON = "Single centered icon, bold simple shape that stays readable at 32 pixels, on a solid flat pure green (#00FF00) background.";

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
    ...RACE_IDS.map((r) =>
      icon(
        "Race crests",
        "race",
        "ui/races",
        r,
        `Race: ${RACES[r].label}`,
        `Small heraldic crest for the ${RACES[r].label} race: ${RACE_ART[r]} on a shield shape tinted #${RACES[r].color.toString(16).padStart(6, "0")}.`,
        ["ui/element_fire.webp"],
      ),
    ),
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
    {
      id: "vfx:spark",
      group: "VFX",
      title: "Spark projectile",
      file: "vfx/proj_spark.png",
      model: "Nano Banana 2",
      aspect: "1:1",
      refs: ["vfx/proj_lightning.webp", "vfx/proj_arcane_orb.webp", STYLE_ANCHOR],
      prompt: `${STYLE} Game projectile: a small crackling yellow-white electric spark orb with tiny jagged arcs, seen from above, matching the reference projectiles. ${ICON}`,
    },
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
  ];
}
