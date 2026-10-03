-- Tower Rush schema (D1). Same tables as the old Node/SQLite server, plus users.rev.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  is_guest INTEGER NOT NULL DEFAULT 1,
  banned INTEGER NOT NULL DEFAULT 0,
  ban_reason TEXT,
  profile TEXT NOT NULL,
  -- Bumped on every profile save; a save only lands if nobody saved in between (see users.ts).
  rev INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX users_trophies ON users(json_extract(profile, '$.trophies'));
CREATE INDEX users_best_wave ON users(json_extract(profile, '$.bestWave'));
CREATE INDEX users_created ON users(created_at);

CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('player', 'admin')),
  subject_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_subject ON sessions(kind, subject_id);

CREATE TABLE config_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config TEXT NOT NULL,
  note TEXT,
  admin_id INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  arena TEXT NOT NULL,
  deck TEXT NOT NULL,
  hero TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  wave INTEGER,
  kills INTEGER,
  bosses INTEGER,
  coins INTEGER,
  gems INTEGER,
  trophies INTEGER
);
CREATE INDEX battles_user ON battles(user_id, started_at DESC);
CREATE INDEX battles_finished ON battles(finished_at);

CREATE TABLE mail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL: every player
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  reward TEXT, -- JSON Reward, or NULL for a plain announcement
  new_players INTEGER NOT NULL DEFAULT 0, -- to everyone: also players who join after it was sent
  admin_id INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);
CREATE INDEX mail_user ON mail(user_id);

CREATE TABLE mail_state (
  mail_id INTEGER NOT NULL REFERENCES mail(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at INTEGER,
  claimed_at INTEGER,
  deleted_at INTEGER,
  PRIMARY KEY (mail_id, user_id)
);

CREATE TABLE purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX purchases_offer ON purchases(offer);

CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);

-- Which UTC days each player was active (for retention).
CREATE TABLE activity (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL, -- "2026-10-04" (UTC)
  PRIMARY KEY (user_id, day)
) WITHOUT ROWID;
CREATE INDEX activity_day ON activity(day);
