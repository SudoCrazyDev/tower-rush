// Renders the "Crown Chess" fantasy concept pitch into docs/features/concepts/crown-chess.
// Usage (from roadmap-video/): npm run promo:cc   (set REMOTION_BROWSER to use an installed Chrome)
// Shares public/cm with the Command Mode pitch, so it runs promo-cm.mjs --copy-only first.
import { cpSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

execSync("node scripts/promo-cm.mjs --copy-only", { stdio: "inherit" });
const art = "../game/public/assets";
const pub = "public/cm";
for (const d of ["items", "heroes"]) mkdirSync(`${pub}/${d}`, { recursive: true });

const units = ["flame_adept", "ember_witch", "penguin_wizard", "wolf_hunter", "phoenix_chick", "goblin_bomber", "magnet_robot"];
for (const u of units) {
  cpSync(`${art}/units/${u}.webp`, `${pub}/units/${u}.webp`);
  cpSync(`${art}/portraits/${u}.webp`, `${pub}/portraits/${u}.webp`);
}
for (const i of ["coins", "essence_fire", "essence_arcane"]) cpSync(`${art}/items/${i}.webp`, `${pub}/items/${i}.webp`);
for (const h of ["young_king", "dark_knight", "elf_archmage", "gnome_mech", "griffin_knight", "orc_warchief", "panda_brewmaster", "sea_witch"]) {
  cpSync(`${art}/heroes/${h}.webp`, `${pub}/heroes/${h}.webp`);
}

if (process.argv[2] === "--copy-only") process.exit(0);
const out = "../docs/features/concepts/crown-chess";
mkdirSync(out, { recursive: true });
const browser = process.env.REMOTION_BROWSER ? ` --browser-executable="${process.env.REMOTION_BROWSER}"` : "";
execSync(`npx remotion render src/index.ts cc-pitch ${out}/crown-chess-pitch.mp4${browser}`, { stdio: "inherit" });
