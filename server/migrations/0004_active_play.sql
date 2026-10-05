-- One battle at a time per player (see server/src/play.ts): which device holds it, kept
-- fresh by that device's heartbeat.
CREATE TABLE active_play (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  device TEXT NOT NULL,
  kind TEXT NOT NULL, -- battle or pvp
  battle_id INTEGER, -- the solo battle being played (kind battle)
  started_at INTEGER NOT NULL,
  seen_at INTEGER NOT NULL
);

-- A solo battle taken over by another device: progress after this time doesn't count.
ALTER TABLE battles ADD COLUMN cutoff INTEGER;
