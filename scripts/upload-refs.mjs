// Uploads the raw-pack reference images that art requests point at (refs ending in .png, such as
// assets/style/style_anchor_v2.png or bosses/vaeltharion.png) to the R2 bucket under refs/, so the
// admin #/art page can show them as thumbnails to save and attach in Higgsfield.
// Keys: refs/<path without the assets/ prefix>. Refs whose file isn't on this PC yet (art still to
// be generated) are skipped; run it again once they are processed.
//   node scripts/upload-refs.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { artRequests } from "../shared/art-requests.ts";

const BUCKET = "tower-rush-assets";
const ROOT = join(import.meta.dirname, "..");

const refs = new Set(artRequests({ units_awakened: [], portraits_awakened: [] }).flatMap((r) => r.refs).filter((r) => r.endsWith(".png")));
const list = [];
const missing = [];
for (const ref of refs) {
  const rest = ref.replace(/^assets\//, "");
  const file = join(ROOT, "assets", rest);
  if (existsSync(file)) list.push({ key: `refs/${rest}`, file });
  else missing.push(ref);
}
if (missing.length) console.log(`Not on this PC yet (skipped): ${missing.join(", ")}`);
if (!list.length) process.exit(0);
const listFile = join(mkdtempSync(join(tmpdir(), "tower-rush-refs-")), "png.json");
writeFileSync(listFile, JSON.stringify(list));
console.log(`Uploading ${list.length} reference images...`);
execFileSync("npx", ["wrangler", "r2", "bulk", "put", BUCKET, "--remote", "-y", "-f", listFile, "--ct", "image/png"], { stdio: "inherit", shell: true });
