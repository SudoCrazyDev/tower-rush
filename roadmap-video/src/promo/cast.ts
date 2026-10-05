/** The v1.1 "Supporting Cast Arrival" units, as shown in the promo graphics. */

export type CastId = "mime" | "portal_imp" | "mirror_slime" | "lucky_cat" | "hourglass_owl" | "echo_spirit" | "banner_herald" | "gnome_brewer";

export interface CastUnit {
  id: CastId;
  name: string;
  rarity: "rare" | "epic";
  element: "fire" | "ice" | "lightning" | "nature" | "poison" | "arcane";
  race: string;
  /** One-word ability name, shown big in the video. */
  verb: string;
  ability: string;
  tip: string;
  /** The effect from ★1 to ★7. */
  scale: [string, string];
  scaleLabel: string;
}

export const ELEMENT_COLOR: Record<CastUnit["element"], string> = {
  fire: "#ff6a2b",
  ice: "#5fd4ff",
  lightning: "#ffd93b",
  nature: "#6bd34a",
  poison: "#b05cff",
  arcane: "#ff7ad9",
};

export const RARITY_COLOR = { rare: "#3d8bff", epic: "#a24cff" };

export const CAST: CastUnit[] = [
  {
    id: "mime",
    name: "Mime",
    rarity: "epic",
    element: "arcane",
    race: "Fae",
    verb: "COPY",
    ability: "Drag it onto a unit of the same rank and it becomes an exact copy.",
    tip: "No matching pair? The Mime makes one.",
    scale: ["units", "units"],
    scaleLabel: "copies",
  },
  {
    id: "portal_imp",
    name: "Portal Imp",
    rarity: "rare",
    element: "fire",
    race: "Demon",
    verb: "SWAP",
    ability: "Swaps places with a unit of the same rank, or hops to an empty tile.",
    tip: "Teleport your best unit next to a Lute Bard.",
    scale: ["20s", "8s"],
    scaleLabel: "cooldown",
  },
  {
    id: "mirror_slime",
    name: "Mirror Slime",
    rarity: "rare",
    element: "poison",
    race: "Elemental",
    verb: "MIRROR",
    ability: "Every so often it turns into a neighbour of the same rank.",
    tip: "Surround it with matching ranks and it makes pairs on its own.",
    scale: ["every 25s", "every 16s"],
    scaleLabel: "transforms",
  },
  {
    id: "lucky_cat",
    name: "Lucky Cat",
    rarity: "rare",
    element: "nature",
    race: "Beast",
    verb: "FORTUNE",
    ability: "Merges next to it can keep their unit instead of rolling a random one.",
    tip: "Climb one hero all the way to ★7.",
    scale: ["21%", "57%"],
    scaleLabel: "keep chance",
  },
  {
    id: "hourglass_owl",
    name: "Hourglass Owl",
    rarity: "epic",
    element: "lightning",
    race: "Construct",
    verb: "OVERCLOCK",
    ability: "Neighbours charge their ultimate much faster.",
    tip: "Put it next to an awakened unit and watch the ultimates fly.",
    scale: ["+30%", "+90%"],
    scaleLabel: "ultimate charge",
  },
  {
    id: "echo_spirit",
    name: "Echo Spirit",
    rarity: "epic",
    element: "ice",
    race: "Undead",
    verb: "ENCORE",
    ability: "Repeats a neighbour's ultimate a moment later.",
    tip: "Owl on one side, Echo on the other.",
    scale: ["25%", "55%"],
    scaleLabel: "echo strength",
  },
  {
    id: "banner_herald",
    name: "Banner Herald",
    rarity: "rare",
    element: "fire",
    race: "Human",
    verb: "WAR CRY",
    ability: "Every awakened unit makes your whole army hit harder.",
    tip: "Awaken two heroes and let the Herald do the rest.",
    scale: ["+5%", "+11%"],
    scaleLabel: "damage per awakened unit",
  },
  {
    id: "gnome_brewer",
    name: "Gnome Brewer",
    rarity: "rare",
    element: "nature",
    race: "Gnome",
    verb: "BREW",
    ability: "Brews mana every 5 seconds and pays a bonus every wave.",
    tip: "Farm early, power up big.",
    scale: ["8 mana", "56 mana"],
    scaleLabel: "per brew",
  },
];
