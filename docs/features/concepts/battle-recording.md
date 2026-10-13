# Battle recording and replay checks (feature for later)

> Status: **parked** (2026-10-13). Not scheduled. The user wants it documented now and built later.

## Why

Leaderboards and rewards trust what the client reports. A player who reaches wave 50 in an arena
with ease, or who deals huge damage in a PvP match, can't be reviewed today: we know the result
but not how it happened. Recording runs lets us check suspicious records and later watch them.

## What is recorded today

| Mode | Stored | Missing |
|---|---|---|
| Arena (`battles` table) | deck, hero, arena, wave, kills, bosses, rewards, start/finish time (`server/src/player.ts:485-580`) | card levels, seed (client picks it with `Math.random()` in `game/src/scenes/BattleScene.ts`), placements or any action log |
| Story (`battles`, `arena = 'story:<chapterId>'`) | same as arena | levels (computed at start, not stored), stars, objectives, win flag (only in `profile.story`), seed, log |
| PvP (`pvp_matches`) | both loadouts (deck, levels, hero), seed, winner, reason, trophies, ratings, plus each player's action log in `log1`/`log2` (`server/src/pvp.ts`) | damage, final HP and waves as columns (only inside the log); logs over 200k characters are dropped |
| Leaderboards | trophies, best wave, rating, per-arena best wave (from `users.profile`) | the deck used and a link to the run that set the record |

Checks today are caps only: arena wave is capped by elapsed time (`floor(elapsed/3)+1`), kills
and bosses by wave; PvP sends are checked against mana and the clock, but reported HP is trusted.
`replayBoard` in `shared/pvpsim.ts` can re-run a PvP log, but only `scripts/pvp-sim.ts` uses it;
the server never does. The admin shows a user's last 50 battles (without the deck column); the
`GET /admin/pvp/matches` endpoint exists but no admin page uses it.

## Plan, in three steps

1. **Record (light).** For arena and story runs, store the seed, card levels and an action log
   (placements, merges, summons, hero casts with their tick). The client sends the seed to the
   server at start or at finish and the log at finish; the server stores both on the `battles` row
   (new columns), or in R2 if logs get large. Add an admin page listing PvP matches and showing
   the deck on the user's battle list.
2. **Check flagged runs (medium).** Re-run only suspicious results: a new top-leaderboard wave,
   very short runs, unusual PvP damage. Run the check from the admin, a script or a Cron job,
   not inside the finish request (see cost below). First confirm the arena sim is fully
   deterministic from its seed; PvP already is.
3. **Replay viewer (heavy).** Drive `BattleScene` / `PvpScene` from a stored log instead of input,
   so an admin (or players, for top records) can watch a run. Client-side only.

## Cost

- **Storage:** a few KB per run. 100 players × 10 runs a day is about 5 MB a day, far under D1's
  5 GB limit. Move logs to R2 if that changes.
- **CPU:** the Workers Free plan allows 10 ms of CPU per request. Re-running a 50-wave battle takes
  far longer, so checking every run on the server isn't possible on that plan. Check only flagged
  runs, offline.
- **Timing:** runs played before step 1 can never be reviewed, so step 1 is worth doing before the
  player count grows, even if steps 2 and 3 wait.
