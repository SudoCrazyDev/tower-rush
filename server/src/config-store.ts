import { applyConfig, defaultConfig, validateConfig, type GameConfig } from "../../shared/config.ts";
import { withEffectDefaults } from "../../shared/effects.ts";
import { db, audit } from "./db.ts";

interface VersionRow {
  id: number;
  config: string;
  note: string | null;
  admin_id: number | null;
  created_at: number;
}

let current: { id: number; config: GameConfig; createdAt: number };

/** Older saved configs may predate newer fields; fill those in from the defaults. */
function upgrade(cfg: GameConfig): GameConfig {
  const d = defaultConfig();
  return {
    ...d,
    ...cfg,
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

export function initConfig() {
  const row = db.prepare("SELECT * FROM config_versions ORDER BY id DESC LIMIT 1").get() as VersionRow | undefined;
  if (row) return load(row);
  saveConfig(defaultConfig(), null, "Initial defaults");
}

export const currentConfig = () => current;

export function saveConfig(config: GameConfig, adminId: number | null, note: string) {
  const errors = validateConfig(config);
  if (errors.length) return { errors };
  const now = Date.now();
  const r = db
    .prepare("INSERT INTO config_versions (config, note, admin_id, created_at) VALUES (?, ?, ?, ?)")
    .run(JSON.stringify(config), note, adminId, now);
  load({ id: Number(r.lastInsertRowid), config: JSON.stringify(config), note, admin_id: adminId, created_at: now });
  if (adminId !== null) audit(adminId, "config.save", `v${r.lastInsertRowid}`, { note });
  return { id: current.id };
}

export function listVersions(limit = 100) {
  return db
    .prepare(
      `SELECT v.id, v.note, v.created_at AS createdAt, a.username AS admin
       FROM config_versions v LEFT JOIN admins a ON a.id = v.admin_id
       ORDER BY v.id DESC LIMIT ?`,
    )
    .all(limit);
}

export function getVersion(id: number) {
  const row = db.prepare("SELECT * FROM config_versions WHERE id = ?").get(id) as VersionRow | undefined;
  return row ? upgrade(JSON.parse(row.config)) : null;
}
