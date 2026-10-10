// Renders "The Nemesis War" retention pitch into docs/features/concepts/nemesis-war.
// Usage (from roadmap-video/): npm run promo:nm   (set REMOTION_BROWSER to use an installed Chrome)
// Shares public/cm with the other concept pitches, so it runs promo-cc.mjs --copy-only first.
import { cpSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

execSync("node scripts/promo-cc.mjs --copy-only", { stdio: "inherit" });
const art = "../game/public/assets";
const pub = "public/cm";
for (const d of ["bosses", "emotes"]) mkdirSync(`${pub}/${d}`, { recursive: true });
for (const m of ["orc_brute", "skeleton_soldier", "troll_healer", "lava_imp", "gargoyle", "boar_rider", "yeti_cub"]) cpSync(`${art}/monsters/${m}.webp`, `${pub}/monsters/${m}.webp`);
cpSync(`${art}/items/star_shard.webp`, `${pub}/items/star_shard.webp`);
cpSync(`${art}/bosses/demon_lord.webp`, `${pub}/bosses/demon_lord.webp`);
cpSync(`${art}/emotes/goblin_laugh.webp`, `${pub}/emotes/goblin_laugh.webp`);
cpSync(`${art}/locations/world_map.webp`, `${pub}/world_map.webp`);

if (process.argv[2] === "--copy-only") process.exit(0);
const out = "../docs/features/concepts/nemesis-war";
mkdirSync(out, { recursive: true });
const browser = process.env.REMOTION_BROWSER ? ` --browser-executable="${process.env.REMOTION_BROWSER}"` : "";
execSync(`npx remotion render src/index.ts nm-pitch ${out}/nemesis-war-pitch.mp4${browser}`, { stdio: "inherit" });
