-- PvP matches (see PVP.md). A bot match has p2 NULL; its bot is in setup.
CREATE TABLE pvp_matches (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  p1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  p2 INTEGER REFERENCES users(id) ON DELETE SET NULL,
  setup TEXT NOT NULL, -- JSON MatchSetup
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  winner INTEGER, -- 0 or 1 (index in setup.players); NULL for a draw or while running
  reason TEXT, -- hp, maxWave, left, disconnect
  trophies1 INTEGER,
  trophies2 INTEGER,
  coins1 INTEGER,
  coins2 INTEGER,
  log1 TEXT, -- JSON action log from each player's board, for replays
  log2 TEXT
);
CREATE INDEX pvp_matches_p1 ON pvp_matches(p1, started_at DESC);
CREATE INDEX pvp_matches_p2 ON pvp_matches(p2, started_at DESC);
CREATE INDEX pvp_matches_finished ON pvp_matches(finished_at);
