// Renders the v1.2 "Stories" promo kit into docs/features/v1.2-stories/promo.
// Usage (from roadmap-video/): npm run promo:st [still-id]   (set REMOTION_BROWSER to use an installed Chrome)
//
// Art that doesn't exist yet is drawn as a placeholder. Once a unit, monster or boss has art
// in game/public/assets (portraits/, monsters/ or bosses/ as <id>.webp), or the Event frame
// (cards/frame_event.webp), Candy Palace arena (locations/arena_candy_palace.webp) or a Story 3
// arena (locations/<arena id>.webp) exists, re-run this script and the graphics pick it up.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const art = "../game/public/assets";
const pub = "public/st";
mkdirSync(`${pub}/portraits`, { recursive: true });

const copy = (from, to) => cpSync(`${art}/${from}`, `${pub}/${to}`);
copy("ui/logo.webp", "logo.webp");
copy("cards/frame_epic.webp", "frame_epic.webp");
copy("locations/arena_candy_land.webp", "arena_candy_land.webp");

const optional = (from, to) => {
  if (!existsSync(`${art}/${from}`)) return false;
  copy(from, to);
  return true;
};
const eventFrame = optional("cards/frame_event.webp", "frame_event.webp");
const palace = optional("locations/arena_candy_palace.webp", "arena_candy_palace.webp");
const arenas = ["arena_upside_down_village", "arena_hollow_woods", "arena_first_rift"].filter((id) => optional(`locations/${id}.webp`, `${id}.webp`));

const ids = [
  "princess_muse", "pentagonal_knight", "aegis_knight", "lance_knight", "oath_knight", "lantern_knight",
  "rogue_knight", "berserker_sellsword", "powder_grenadier", "hired_blade",
  "gummy_bear", "candy_corn_runner", "jelly_bean_blob", "cotton_candy_puff", "chocolate_golem",
  "peppermint_turtle", "licorice_medic", "candy_pinata", "sprinkle_swarm", "sour_shard", "chaos_taffy",
  "gummy_warlord", "licorice_witch", "sugar_plum_tyrant", "sour_gummy_hydra", "chaos_jawbreaker",
  "corrupted_villager", "corrupted_courier", "corrupted_farmer", "corrupted_fisherman", "corrupted_lumberjack",
  "corrupted_herbalist", "corrupted_merchant", "chaos_eye",
  "corrupted_fae", "corrupted_bear", "portal_wizard",
];
const portraits = ids.filter((id) => ["portraits", "monsters", "bosses"].some((dir) => optional(`${dir}/${id}.webp`, `portraits/${id}.webp`)));
writeFileSync("src/promo/stories-art.json", JSON.stringify({ portraits, eventFrame, palace, arenas }, null, 2) + "\n");
console.log(`Art found for ${portraits.length}/${ids.length}; event frame: ${eventFrame}; palace: ${palace}; Story 3 arenas: ${arenas.length}/3. The rest use placeholders.`);

const out = "../docs/features/v1.2-stories/promo";
mkdirSync(out, { recursive: true });
const browser = process.env.REMOTION_BROWSER ? ` --browser-executable="${process.env.REMOTION_BROWSER}"` : "";
const stills = ["st-keyart", "st-square", "st-story", "st-teaser-story", "st-banner", "st-info-path", "st-info-muse", "st-info-deck", "st-info-knights", "st-info-bestiary"];
const only = process.argv[2];
for (const id of stills) {
  if (only && only !== id) continue;
  execSync(`npx remotion still src/index.ts ${id} ${out}/${id}.png${browser}`, { stdio: "inherit" });
}
