// Puts the built game (game/dist) and admin panel (admin/dist) together in dist/, which
// the Worker serves as static assets (wrangler.jsonc): game at /, admin at /admin/.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";

for (const dir of ["game/dist", "admin/dist"]) {
  if (!existsSync(dir)) throw new Error(`${dir} is missing; build it first`);
}
// Empty dist/ rather than deleting it: `wrangler dev` keeps a watch on the folder.
mkdirSync("dist", { recursive: true });
for (const f of readdirSync("dist")) rmSync(`dist/${f}`, { recursive: true, force: true });
cpSync("game/dist", "dist", { recursive: true });
cpSync("admin/dist", "dist/admin", { recursive: true });
console.log("dist/ ready: game at /, admin at /admin/");
