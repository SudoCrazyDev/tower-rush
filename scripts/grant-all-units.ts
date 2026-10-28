/**
 * Staging helper: build SQL that gives a player every unit they don't own yet (level 1, 0 copies).
 * Input: `wrangler d1 execute ... --json --command "SELECT profile, rev FROM users WHERE id = N"` output.
 * node scripts/grant-all-units.ts <dump.json> <userId> > grant.sql
 * The UPDATE only applies if the profile wasn't saved in between (rev guard).
 */
import { readFileSync } from "node:fs";
import { DEFAULT_UNITS } from "../shared/units.ts";

const [file, id] = process.argv.slice(2);
const row = JSON.parse(readFileSync(file, "utf8"))[0].results[0] as { profile: string; rev: number };
const profile = JSON.parse(row.profile);
const added = DEFAULT_UNITS.filter((u) => !u.storyOnly && !profile.cards[u.id]).map((u) => u.id);
for (const u of added) profile.cards[u] = { level: 1, copies: 0 };
console.error(`adding ${added.length}: ${added.join(", ")}`);
console.log(`UPDATE users SET profile = '${JSON.stringify(profile).replaceAll("'", "''")}', rev = rev + 1 WHERE id = ${Number(id)} AND rev = ${row.rev};`);
