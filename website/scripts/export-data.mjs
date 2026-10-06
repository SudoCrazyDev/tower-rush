// Dumps the game's default data (shared/) into website/data/game.js for the site
// (a plain script, so index.html also works when opened straight from disk).
// Run from the repo root: node website/scripts/export-data.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { DEFAULT_UNITS, ARCHETYPES } from "../../shared/units.ts";
import { DEFAULT_MONSTERS, DEFAULT_BOSSES } from "../../shared/monsters.ts";
import { DEFAULT_ARENAS } from "../../shared/arenas.ts";
import { DEFAULT_LEAGUES } from "../../shared/leagues.ts";
import { PERKS } from "../../shared/perks.ts";
import { DEFAULT_HEROES, heroAbilityText } from "../../shared/heroes.ts";

// Which art exists (awakened portraits, arena videos) comes from the live asset index on R2.
const index = await (await fetch("https://assets.depedtoolkit.com/index.json")).json();

const out = {
  units: DEFAULT_UNITS.map((u) => ({ ...u, archLabel: ARCHETYPES[u.arch]?.label, perkLabel: PERKS[u.perk]?.label, perkText: PERKS[u.perk]?.text })),
  monsters: DEFAULT_MONSTERS,
  bosses: DEFAULT_BOSSES,
  arenas: DEFAULT_ARENAS,
  heroes: DEFAULT_HEROES.map((h) => ({ ...h, ability: heroAbilityText(h) })),
  leagues: DEFAULT_LEAGUES,
  awakened: index.portraits_awakened,
  videos: index.videos,
};
mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/game.js", import.meta.url), `window.GAME_DATA = ${JSON.stringify(out)};
`);
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
