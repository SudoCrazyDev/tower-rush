-- Ranked PvP rating, separate from trophies (see PVP.md). The rating itself lives in the
-- profile JSON ($.ranked); matches record each player's rating change.
ALTER TABLE pvp_matches ADD COLUMN rating1 INTEGER;
ALTER TABLE pvp_matches ADD COLUMN rating2 INTEGER;

-- The ranked leaderboard.
CREATE INDEX users_ranked_rating ON users(json_extract(profile, '$.ranked.rating'));
