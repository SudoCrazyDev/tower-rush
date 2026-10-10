// Renders the "Command Mode" fantasy concept pitch into docs/features/concepts/command-mode.
// Usage (from roadmap-video/): npm run promo:cm   (set REMOTION_BROWSER to use an installed Chrome)
import { cpSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const art = "../game/public/assets";
const pub = "public/cm";
for (const d of ["units", "units_awakened", "portraits", "monsters"]) mkdirSync(`${pub}/${d}`, { recursive: true });

const units = ["fox_samurai", "hooded_archer", "frost_sorceress", "thunder_dwarf", "storm_whelp", "lava_golem", "tide_mermaid", "shadow_ninja", "valkyrie", "chrono_mage"];
for (const u of units) {
  cpSync(`${art}/units/${u}.webp`, `${pub}/units/${u}.webp`);
  cpSync(`${art}/portraits/${u}.webp`, `${pub}/portraits/${u}.webp`);
}
cpSync(`${art}/units_awakened/fox_samurai.webp`, `${pub}/units_awakened/fox_samurai.webp`);
const monsters = ["goblin_runner", "wolf_raider", "armored_beetle", "door_ogre", "iron_snail", "boulder_crab", "vampire_bat", "fire_wisp"];
for (const m of monsters) cpSync(`${art}/monsters/${m}.webp`, `${pub}/monsters/${m}.webp`);
cpSync(`${art}/locations/arena_meadow.webp`, `${pub}/arena.webp`);
cpSync("../assets/brand/logo.png", `${pub}/logo.png`);

if (process.argv[2] === "--copy-only") process.exit(0);
const out = "../docs/features/concepts/command-mode";
mkdirSync(out, { recursive: true });
const browser = process.env.REMOTION_BROWSER ? ` --browser-executable="${process.env.REMOTION_BROWSER}"` : "";
execSync(`npx remotion render src/index.ts cm-pitch ${out}/command-mode-pitch.mp4${browser}`, { stdio: "inherit" });
