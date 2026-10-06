/** Content of the release timeline video, taken from ../../docs/features/ROADMAP.md. Art paths are under public/rl/. */

export type Kind = "release" | "qol" | "next";

export interface Release {
  version: string;
  title: string;
  date: string;
  kind: Kind;
  /** The icon on the timeline node. */
  icon: string;
  points: { icon: string; text: string }[];
}

export const RELEASES: Release[] = [
  {
    version: "v1.0",
    title: "Launch Build",
    date: "Oct 3 – 5",
    kind: "release",
    icon: "portraits/fox_spearman.webp",
    points: [
      { icon: "portraits/fox_spearman.webp", text: "Merge tower defense: 60 units, 16 arenas, heroes" },
      { icon: "ui/icon_pvp.webp", text: "PvP: Ranked, Mirror, Casual and VS Bot" },
      { icon: "ui/league_3.webp", text: "Trophy leagues and the leaderboard" },
      { icon: "ui/icon_quests.webp", text: "Daily login, quests and a player inbox" },
      { icon: "items/chest_epic.webp", text: "Shop offers and limited-time events" },
      { icon: "items/spell_book.webp", text: "Tutorial, admin panel and the Playground" },
    ],
  },
  {
    version: "v1.1",
    title: "Supporting Cast Arrival",
    date: "Oct 6",
    kind: "release",
    icon: "portraits/portal_imp.webp",
    points: [
      { icon: "portraits/gnome_brewer.webp", text: "8 Rare & Epic support units" },
      { icon: "portraits/banner_herald.webp", text: "They buff, heal and slow instead of attacking" },
      { icon: "items/gift_box.webp", text: "Launch gift: Portal Imp + Gnome Brewer" },
    ],
  },
  {
    version: "QoL",
    title: "Polish Patch",
    date: "Oct 6",
    kind: "qol",
    icon: "items/scroll_upgrade.webp",
    points: [
      { icon: "items/spell_book.webp", text: "What's new icon to reopen the release popup" },
      { icon: "ui/element_fire.webp", text: "Element badges on every card" },
      { icon: "items/star_shard.webp", text: "New art shows up on phones straight away" },
    ],
  },
  {
    version: "v1.2",
    title: "Stories",
    date: "Oct 6",
    kind: "release",
    icon: "portraits/princess_muse.webp",
    points: [
      { icon: "ui/icon_story.webp", text: "Book 1 \"The Chosen\": 3 stories × 3 chapters" },
      { icon: "portraits/princess_muse.webp", text: "Princess Muse, the first EVENT card" },
      { icon: "portraits/rogue_knight.webp", text: "Knights & Mercenaries with unit statuses" },
      { icon: "bosses/chaos_jawbreaker.webp", text: "19 monsters and 8 bosses with new powers" },
      { icon: "items/card_pack.webp", text: "New lobby: mode cards, books and chapters" },
    ],
  },
  {
    version: "Next",
    title: "Books 2 – 4",
    date: "Coming soon",
    kind: "next",
    icon: "ui/padlock.webp",
    points: [
      { icon: "items/hourglass_speedup.webp", text: "v1.2.x balance pass for the story chapters" },
      { icon: "ui/icon_quests.webp", text: "A \"win a story chapter\" daily quest" },
      { icon: "ui/padlock.webp", text: "Books 2 – 4 of Story mode" },
    ],
  },
];

export const CAST_V11 = ["mime", "portal_imp", "mirror_slime", "lucky_cat", "hourglass_owl", "echo_spirit", "banner_herald", "gnome_brewer"];
export const COVERS = ["story1_saving_the_muse", "story2_chaorruption", "story3_the_beginning"];
export const STORY_HEROES = ["pentagonal_knight", "princess_muse", "rogue_knight"];

/** Every file the video uses, relative to game/public/assets (copied to public/rl/ by scripts/releases.mjs). */
export const ART = [
  "ui/logo.webp",
  "locations/loading_keyart.webp",
  "locations/lobby_landscape.webp",
  "locations/arena_crystal_cave.webp",
  "locations/arena_meadow.webp",
  "locations/arena_corrupted_candy_kingdom.webp",
  "locations/world_map.webp",
  ...RELEASES.flatMap((r) => [r.icon, ...r.points.map((p) => p.icon)]),
  ...CAST_V11.map((id) => `portraits/${id}.webp`),
  ...COVERS.map((c) => `story/covers/${c}.webp`),
  ...STORY_HEROES.map((id) => `portraits/${id}.webp`),
  ...["fire", "ice", "lightning", "nature", "poison", "arcane"].map((e) => `ui/element_${e}.webp`),
];
