/**
 * Races: who a unit, hero, monster or boss is (Human, Orc, Undead...). Shown on cards and
 * banners; editable per entry in the admin panel.
 */
export type Race =
  | "human"
  | "elf"
  | "dwarf"
  | "gnome"
  | "orc"
  | "goblin"
  | "giant"
  | "beast"
  | "undead"
  | "demon"
  | "dragon"
  | "elemental"
  | "construct"
  | "sylvan"
  | "fae"
  | "celestial";

export const RACES: Record<Race, { label: string; color: number }> = {
  human: { label: "Human", color: 0xf2c79b },
  elf: { label: "Elf", color: 0x9be37a },
  dwarf: { label: "Dwarf", color: 0xd99a5b },
  gnome: { label: "Gnome", color: 0xffc65c },
  orc: { label: "Orc", color: 0x7fc24a },
  goblin: { label: "Goblin", color: 0xb8d94a },
  giant: { label: "Giant", color: 0xc9a27a },
  beast: { label: "Beast", color: 0xe0a05a },
  undead: { label: "Undead", color: 0xa8b8c8 },
  demon: { label: "Demon", color: 0xff6a5a },
  dragon: { label: "Dragon", color: 0xff8f3b },
  elemental: { label: "Elemental", color: 0x6fd8ff },
  construct: { label: "Construct", color: 0xc0c8d8 },
  sylvan: { label: "Sylvan", color: 0x6bd34a },
  fae: { label: "Fae", color: 0xff9ae6 },
  celestial: { label: "Celestial", color: 0xffe27a },
};
export const RACE_IDS = Object.keys(RACES) as Race[];

export const raceLabel = (r: Race | undefined) => RACES[r as Race]?.label ?? "Unknown";
export const raceCss = (r: Race | undefined) => "#" + (RACES[r as Race]?.color ?? 0xffffff).toString(16).padStart(6, "0");

/** Saved configs from before races existed: take each entry's race from the defaults. */
export function withRaces<T extends { id: string; race: Race }>(list: T[], defaults: T[]): T[] {
  return list.map((x) => (RACES[x.race] ? x : { ...x, race: defaults.find((d) => d.id === x.id)?.race ?? "human" }));
}
