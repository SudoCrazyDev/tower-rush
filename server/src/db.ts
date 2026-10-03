import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const DATA_DIR = resolve(process.env.DATA_DIR ?? join(import.meta.dirname, "..", "data"));
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, "tower-rush.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  is_guest INTEGER NOT NULL DEFAULT 1,
  banned INTEGER NOT NULL DEFAULT 0,
  ban_reason TEXT,
  profile TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('player', 'admin')),
  subject_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS config_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config TEXT NOT NULL,
  note TEXT,
  admin_id INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  arena TEXT NOT NULL,
  deck TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  wave INTEGER,
  kills INTEGER,
  bosses INTEGER,
  coins INTEGER,
  gems INTEGER,
  trophies INTEGER
);
CREATE INDEX IF NOT EXISTS battles_user ON battles(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS users_trophies ON users(json_extract(profile, '$.trophies'));
CREATE INDEX IF NOT EXISTS users_best_wave ON users(json_extract(profile, '$.bestWave'));
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);
`);

// Columns added after the first release.
const battleCols = (db.prepare("PRAGMA table_info(battles)").all() as { name: string }[]).map((c) => c.name);
if (!battleCols.includes("hero")) db.exec("ALTER TABLE battles ADD COLUMN hero TEXT");

export function audit(adminId: number | null, action: string, target: string | null, details?: unknown) {
  db.prepare("INSERT INTO audit (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)").run(
    adminId,
    action,
    target,
    details === undefined ? null : JSON.stringify(details),
    Date.now(),
  );
}
