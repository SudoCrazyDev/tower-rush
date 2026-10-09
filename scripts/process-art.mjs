// Turns "ready" art requests (Higgsfield links pasted in admin #/art) into keyed PNGs in assets/.
//   node scripts/process-art.mjs [--dry-run] [--force] [--only <group-or-id-prefix>] [--mark-done]
// Reads D1 (read-only SELECT), downloads each in-scope image to assets/<file> (skipped when present
// unless --force) and keys the flat green or magenta background (colour read from the prompt) with
// assets/keyimg.py. Never touches R2. --mark-done is the only write: it sets the processed ids to
// status "done" in the remote D1 (run it only after the R2 upload).
// In scope: perk/archetype icons, element emblems, race crests, all VFX groups, weapons.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { artRequests } from "../shared/art-requests.ts";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const dry = flag("--dry-run"), force = flag("--force"), markDone = flag("--mark-done");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? (args[onlyIdx + 1] ?? "").toLowerCase() : "";
const ROOT = join(import.meta.dirname, "..");
const DB = "tower-rush";
const SCOPE = /^(Monster trait icons|Perk icons|Archetype icons|Element emblems|Race crests|VFX: .*|Weapons \((generic|signature)\)|v2.1 Arts Requirements)$/;

const wrangler = (cmd) =>
  JSON.parse(execFileSync("npx", ["wrangler", "d1", "execute", DB, "--remote", "--json", "--command", `"${cmd}"`], { cwd: ROOT, shell: true, encoding: "utf8", maxBuffer: 1 << 26 }))[0].results;

const reqs = new Map(artRequests({ units_awakened: [], portraits_awakened: [] }).filter((r) => SCOPE.test(r.group)).map((r) => [r.id, r]));
const rows = wrangler("SELECT id,url,status FROM art_requests WHERE status='ready'");
const todo = [];
let skippedScope = 0;
for (const row of rows) {
  const r = reqs.get(row.id);
  if (!r) { skippedScope++; continue; }
  const s = only;
  if (s && !(r.group.toLowerCase().includes(s) || r.id.toLowerCase().startsWith(s))) continue;
  todo.push({ ...r, url: row.url });
}

const stats = {}; // group -> {done, skipped, failed}
const failures = [], processed = [];
const bump = (g, k) => ((stats[g] ??= { done: 0, skipped: 0, failed: 0 })[k]++);
for (const r of todo) {
  const out = join(ROOT, "assets", r.file);
  // Panels, covers and arenas have no flat key background: saved as-is (converted to PNG).
  const color = !/#00FF00|#FF00FF/i.test(r.prompt) ? "none" : /magenta \(#FF00FF\)/i.test(r.prompt) ? "magenta" : "green";
  if (existsSync(out) && !force) { bump(r.group, "skipped"); processed.push(r.id); continue; }
  if (dry) { console.log(`[dry] ${r.id} -> assets/${r.file} (${color}) ${r.url}`); bump(r.group, "done"); continue; }
  try {
    const res = await fetch(r.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) throw new Error(`not an image (${type})`);
    mkdirSync(dirname(out), { recursive: true });
    const raw = out + ".raw";
    writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    if (color === "none") execFileSync("python", ["-I", "-c", "import sys; from PIL import Image; im = Image.open(sys.argv[1]); (im if im.mode in ('RGB', 'RGBA') else im.convert('RGBA')).save(sys.argv[2])", raw, out], { stdio: "pipe" });
    else execFileSync("python", ["-I", join(ROOT, "assets/keyimg.py"), raw, out, "--color", color], { stdio: "pipe" });
    rmSync(raw, { force: true });
    console.log(`ok   ${r.id} (${color})`);
    bump(r.group, "done"); processed.push(r.id);
  } catch (e) {
    console.log(`FAIL ${r.id}: ${e.message}`);
    failures.push(r.id); bump(r.group, "failed");
  }
}

console.log(`\nready rows: ${rows.length}, out of scope: ${skippedScope}, selected: ${todo.length}${dry ? " (dry run)" : ""}`);
for (const [g, s] of Object.entries(stats)) console.log(`  ${g}: ${s.done} processed, ${s.skipped} already present, ${s.failed} failed`);
if (failures.length) console.log("failures:", failures.join(", "));

if (markDone) {
  if (dry) console.log("--dry-run: not marking done");
  else if (failures.length) console.log("failures present: not marking done");
  else if (processed.length) {
    const ids = processed.map((i) => `'${i.replaceAll("'", "''")}'`).join(",");
    wrangler(`UPDATE art_requests SET status='done', updated_at=${Date.now()} WHERE status='ready' AND id IN (${ids})`);
    console.log(`marked ${processed.length} requests done in D1`);
  }
}
