// Uploads game/public/assets (built by `npm --prefix game run assets`) to the R2 bucket the
// production game loads its art from. Keys are paths relative to public/assets.
//   node scripts/upload-art.mjs            every file
//   node scripts/upload-art.mjs ui units   only these folders
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, relative } from "node:path";

const BUCKET = "tower-rush-assets";
const ROOT = "game/public/assets";
const TYPES = { ".webp": "image/webp", ".mp4": "video/mp4", ".json": "application/json", ".png": "image/png" };

const only = process.argv.slice(2);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(ROOT);

const tmp = mkdtempSync(join(tmpdir(), "tower-rush-art-"));
// One bulk upload per content type (wrangler sets one type per call).
for (const [ext, type] of Object.entries(TYPES)) {
  const list = files
    .filter((f) => extname(f) === ext)
    .map((f) => ({ key: relative(ROOT, f).replaceAll("\\", "/"), file: f }))
    .filter((e) => !only.length || only.some((dir) => e.key === dir || e.key.startsWith(`${dir}/`)));
  if (!list.length) continue;
  const listFile = join(tmp, `${ext.slice(1)}.json`);
  writeFileSync(listFile, JSON.stringify(list));
  console.log(`Uploading ${list.length} ${ext} files...`);
  execFileSync("npx", ["wrangler", "r2", "bulk", "put", BUCKET, "--remote", "-y", "-f", listFile, "--ct", type], { stdio: "inherit", shell: true });
}
