import { applyConfig, defaultConfig, validateConfig, type GameConfig } from "../../shared/config.ts";
import { withEffectDefaults } from "../../shared/effects.ts";
import { withRaces } from "../../shared/races.ts";
import { withStyles } from "../../shared/units.ts";
import { all, audit, one, run } from "./db.ts";

interface VersionRow {
  id: number;
  config: string;
  note: string | null;
  admin_id: number | null;
  created_at: number;
}

/**
 * The live config, cached per Worker instance. Each instance checks the newest version id
 * at most every CHECK_MS, so a publish reaches every instance within a few seconds.
 */
let current: { id: number; config: GameConfig; createdAt: number } | null = null;
let checkedAt = 0;
const CHECK_MS = 5_000;

/** Older saved configs may predate newer fields; fill those in from the defaults. */
function upgrade(cfg: GameConfig): GameConfig {
  const d = defaultConfig();
  return {
    ...d,
    ...cfg,
    units: withStyles(withRaces(cfg.units, d.units), d.units),
    monsters: withRaces(cfg.monsters, d.monsters),
    bosses: withRaces(cfg.bosses, d.bosses),
    heroes: withRaces(cfg.heroes ?? d.heroes, d.heroes),
    economy: { ...d.economy, ...cfg.economy },
    effects: withEffectDefaults(cfg.effects),
    dropWeights: { ...d.dropWeights, ...cfg.dropWeights },
  };
}

function load(row: VersionRow) {
  const config = upgrade(JSON.parse(row.config));
  applyConfig(config);
  current = { id: row.id, config, createdAt: row.created_at };
}

/** Make sure the shared tables hold the live config. Runs before every API request. */
export async function ensureConfig(db: D1Database) {
  const now = Date.now();
  if (current && now - checkedAt < CHECK_MS) return;
  const top = await one<{ id: number }>(db, "SELECT id FROM config_versions ORDER BY id DESC LIMIT 1");
  checkedAt = now;
  if (!top) {
    await saveConfig(db, defaultConfig(), null, "Initial defaults");
    return;
  }
  if (current?.id !== top.id) load((await one<VersionRow>(db, "SELECT * FROM config_versions WHERE id = ?", top.id))!);
}

export const currentConfig = () => current!;

export async function saveConfig(db: D1Database, config: GameConfig, adminId: number | null, note: string) {
  const errors = validateConfig(config);
  if (errors.length) return { errors };
  const now = Date.now();
  const json = JSON.stringify(config);
  const r = await run(db, "INSERT INTO config_versions (config, note, admin_id, created_at) VALUES (?, ?, ?, ?)", json, note, adminId, now);
  const id = r.meta.last_row_id;
  load({ id, config: json, note, admin_id: adminId, created_at: now });
  checkedAt = now;
  if (adminId !== null) await audit(db, adminId, "config.save", `v${id}`, { note });
  return { id };
}

export function listVersions(db: D1Database, limit = 100) {
  return all(
    db,
    `SELECT v.id, v.note, v.created_at AS createdAt, a.username AS admin
     FROM config_versions v LEFT JOIN admins a ON a.id = v.admin_id
     ORDER BY v.id DESC LIMIT ?`,
    limit,
  );
}

export async function getVersion(db: D1Database, id: number) {
  const row = await one<VersionRow>(db, "SELECT * FROM config_versions WHERE id = ?", id);
  return row ? upgrade(JSON.parse(row.config)) : null;
}
