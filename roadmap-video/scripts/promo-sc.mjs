// Renders the v1.1 "Supporting Cast Arrival" promo kit into docs/features/v1.1-supporting-cast-arrival/promo.
// Usage (from roadmap-video/): npm run promo:sc   (set REMOTION_BROWSER to use an installed Chrome)
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const art = "../game/public/assets";
const files = {
  "icons/logo.webp": "ui/logo.webp",
  "cards/frame_rare.webp": "cards/frame_rare.webp",
  "cards/frame_epic.webp": "cards/frame_epic.webp",
  "locations/arena_crystal_cave.webp": "locations/arena_crystal_cave.webp",
  "portraits/valkyrie.webp": "portraits/valkyrie.webp",
  "portraits/fox_samurai.webp": "portraits/fox_samurai.webp",
  "portraits/crystal_queen.webp": "portraits/crystal_queen.webp",
};
for (const [to, from] of Object.entries(files)) {
  mkdirSync(`public/${to.split("/")[0]}`, { recursive: true });
  cpSync(`${art}/${from}`, `public/${to}`);
}
// The cast's card portraits, for the units that have art so far (the rest keep their emblem).
const cast = ["mime", "portal_imp", "mirror_slime", "lucky_cat", "hourglass_owl", "echo_spirit", "banner_herald", "gnome_brewer"];
const portraits = cast.filter((id) => existsSync(`${art}/portraits/${id}.webp`));
for (const id of portraits) cpSync(`${art}/portraits/${id}.webp`, `public/portraits/${id}.webp`);
writeFileSync("src/promo/cast-art.json", JSON.stringify({ portraits }, null, 2) + "\n");
console.log(`Portraits: ${portraits.join(", ") || "none"}`);

const out = "../docs/features/v1.1-supporting-cast-arrival/promo";
mkdirSync(out, { recursive: true });
const browser = process.env.REMOTION_BROWSER ? ` --browser-executable="${process.env.REMOTION_BROWSER}"` : "";
const units = ["mime", "portal-imp", "mirror-slime", "lucky-cat", "hourglass-owl", "echo-spirit", "banner-herald", "gnome-brewer"];
const stills = ["sc-keyart", "sc-square", "sc-story", "sc-teaser-story", ...units.map((u) => `sc-card-${u}`)];
const only = process.argv[2];
for (const id of stills) {
  if (only && only !== id) continue;
  execSync(`npx remotion still src/index.ts ${id} ${out}/${id}.png${browser}`, { stdio: "inherit" });
}
if (!only || only === "sc-teaser") execSync(`npx remotion render src/index.ts sc-teaser ${out}/sc-teaser.mp4${browser}`, { stdio: "inherit" });
