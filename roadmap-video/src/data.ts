/** Content of the video, taken from ../../ROADMAP.md. */

export const BUILT: { icon: string; text: string; isNew?: boolean }[] = [
  { icon: "units/fox_spearman.webp", text: "Merge tower defense: 60 units, 30 monsters, 12 bosses, 16 arenas" },
  { icon: "icons/trophy.webp", text: "Accounts, server-side progress, rewards and trophies" },
  { icon: "icons/spell_book.webp", text: "Admin panel: balance every number, manage players" },
  { icon: "icons/coins.webp", text: "Widescreen desktop + phone layouts" },
  { icon: "icons/wave_horn.webp", text: "Music and sound effects" },
  { icon: "heroes/young_king.webp", text: "8 heroes with battle abilities", isNew: true },
  { icon: "units/ember_witch_awakened.webp", text: "Awakened units at max rank", isNew: true },
];

export type Status = "next" | "in progress" | "planned" | "big one" | "launch";

export interface Stage {
  title: string;
  icon: string;
  effort: "small" | "medium" | "large";
  status: Status;
  items: { text: string; done?: boolean }[];
}

export const STAGES: Stage[] = [
  {
    title: "Housekeeping",
    icon: "icons/scroll_upgrade.webp",
    effort: "small",
    status: "next",
    items: [{ text: "Put the project under git" }, { text: "Automated tests for shared rules and the server" }],
  },
  {
    title: "Use the unused art",
    icon: "heroes/elf_archmage.webp",
    effort: "medium",
    status: "in progress",
    items: [
      { text: "8 heroes with abilities", done: true },
      { text: "Awakened units at rank 7", done: true },
      { text: "HD sprites for widescreen" },
      { text: "Emotes, league icons, title-screen trailer" },
    ],
  },
  {
    title: "Reasons to come back",
    icon: "icons/icon_daily_login.webp",
    effort: "medium",
    status: "planned",
    items: [{ text: "Daily login rewards and quests" }, { text: "Leaderboard screen" }, { text: "Trophy leagues" }, { text: "Player inbox for gifts" }],
  },
  {
    title: "More admin control",
    icon: "icons/talent_rune.webp",
    effort: "medium",
    status: "planned",
    items: [{ text: "Editable ability numbers" }, { text: "Shop offers and events" }, { text: "Player activity charts" }],
  },
  {
    title: "Multiplayer",
    icon: "icons/icon_pvp.webp",
    effort: "large",
    status: "big one",
    items: [{ text: "PvP and co-op battles" }, { text: "Matchmaking" }, { text: "Server-checked battles (no cheating)" }],
  },
  {
    title: "Release",
    icon: "icons/chest_legendary.webp",
    effort: "medium",
    status: "launch",
    items: [{ text: "Hosting with HTTPS" }, { text: "App stores and installable web app" }, { text: "Smaller downloads" }],
  },
];

export const GAPS = [
  "Battles run in the browser",
  "Balance is a first pass",
  "Arena grids placed by eye",
  "A few animations skipped",
];
