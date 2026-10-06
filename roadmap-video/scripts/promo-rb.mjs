// Renders the v1.3 "Branding Revamp" promo kit into docs/features/v1.3-branding-revamp/promo.
// Usage (from roadmap-video/): npm run promo:rb [id]   (set REMOTION_BROWSER to use an installed Chrome)
import { cpSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const pub = "public/rb";
mkdirSync(pub, { recursive: true });
cpSync("../assets/brand/logo.png", `${pub}/logo.png`);
cpSync("../assets/brand/icon.png", `${pub}/icon.png`);
cpSync("public/icons/logo.webp", `${pub}/logo_old.webp`); // the Tower Rush logo, kept for the before/after
cpSync("../game/public/assets/locations/loading_keyart.webp", `${pub}/keyart.webp`);

const out = "../docs/features/v1.3-branding-revamp/promo";
mkdirSync(out, { recursive: true });
const browser = process.env.REMOTION_BROWSER ? ` --browser-executable="${process.env.REMOTION_BROWSER}"` : "";
const only = process.argv[2];
for (const id of ["rb-keyart", "rb-square", "rb-story", "rb-banner", "rb-icon"]) {
  if (only && only !== id) continue;
  execSync(`npx remotion still src/index.ts ${id} ${out}/${id}.png${browser}`, { stdio: "inherit" });
}
if (!only || only === "rb-reveal") execSync(`npx remotion render src/index.ts rb-reveal ${out}/rb-reveal.mp4${browser}`, { stdio: "inherit" });
