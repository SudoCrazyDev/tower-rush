-- v2.9 league revamp: a solo run left unfinished now counts as a wave-0 loss when the player
-- starts their next one (player.ts settleAbandoned). Runs abandoned before this release are
-- closed here without a penalty, so nobody loses trophies for a run from the old rules.
-- Runs started in the last hour may still be in progress, so they are left alone.
UPDATE battles
SET finished_at = started_at, wave = COALESCE(wave, 0), trophies = 0
WHERE finished_at IS NULL AND arena NOT LIKE 'story:%' AND started_at < (unixepoch() * 1000 - 3600000);
