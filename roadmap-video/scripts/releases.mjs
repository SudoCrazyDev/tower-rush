// Renders the release timeline video (docs/features/ROADMAP.md) to out/tower-rush-releases.mp4.
// Usage (from roadmap-video/): node scripts/releases.mjs   (set REMOTION_BROWSER to use an installed Chrome)
// Copies the art it uses from game/public/assets into public/rl/ first.
import { cpSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { execSync } from "node:child_process";
import { ART } from "../src/release-data.ts";

for (const p of new Set(ART)) {
  mkdirSync(dirname(`public/rl/${p}`), { recursive: true });
  cpSync(`../game/public/assets/${p}`, `public/rl/${p}`);
}
console.log(`Copied ${new Set(ART).size} images into public/rl.`);

const browser = process.env.REMOTION_BROWSER ? ` --browser-executable="${process.env.REMOTION_BROWSER}"` : "";
execSync(`npx remotion render src/index.ts Releases out/tower-rush-releases.mp4${browser}`, { stdio: "inherit" });
