# World Boss (fantasy feature)

Status: idea only, not scheduled for a release. Captured 2026-10-11.

One boss with a huge shared HP pool (e.g. 300M) that every player fights. Each try is a
single-wave, boss-only battle; the damage a player deals is taken off the shared HP when the
battle ends. The boss changes every week, with a weekly damage leaderboard and rewards paid
before the swap.

## The fight

- **Single wave, boss only.** No other monsters.
- **No timer.** The boss walks the path once. The run ends when it reaches the end.
- **Starts at the live global HP.** The battle shows the boss at the shared HP as it was when
  the run started.
- **Regenerates at 0 mid-run.** If the boss's HP hits 0 during a run, it refills to max HP and
  keeps walking. The run still ends only when the boss reaches the end of the path.
- **Crowd control works normally.** Slows, stuns and knockback all apply. A longer walk means
  more damage, so CC is countered by the boss's own skills and perks (set per week), for
  example:
  - CC resistance that builds up with each stun or slow
  - a periodic cleanse
  - enrage (faster walk) after being slowed or stunned for a while
- **5 tries per player per day.**

## Shared HP and kills (server)

- When a run finishes, the server takes the run's total damage off the global HP in one
  atomic update.
- Overkill rolls over: `kills += floor(damage / max_hp)`, and the remainder carries into the
  next life. One big run can kill the boss more than once.
- The server counts the kills (the client never does), and records the last hit for each kill
  (a "Slayer" credit).
- Two players finishing at the same time is fine: each run's damage is applied to whatever HP
  is live at that moment, not to the snapshot the run started with.

## Standings

- **Total damage per player per week.** That's the player's standing on that week's board.
- **Kill counter** for each weekly boss: how many times it was killed.
- The board resets when the boss changes (weekly). Past weeks stay viewable.

## Rewards

- Paid once per week, at the end of the boss's week, before the new boss starts.
- Paid by the player's rank or percentile on that week's damage board. Tiers are set in admin
  for each week (e.g. #1, top 10, top 100, top 10%, top 50%, everyone who hit the boss).
- No per-run or per-kill payouts in this version.

## Admin

- Schedule future weeks ahead of time. Each week sets:
  - the boss: an existing boss, or a newly created one (new art goes through the art requests
    list)
  - max HP (start at 300M, tune it from real damage data)
  - the boss's skills and perks (the CC counters above)
  - the reward table
- View the live HP, the kill count and the board for the current and past weeks.
- Flag outlier runs for review.

## Anti-cheat

Damage is reported by the client, the same way `/battle/finish` takes waves and kills today
(`server/src/player.ts`), so it must be clamped. A forged finish could otherwise post the full
300M in one go.

- Reuse the battle start/finish flow so the server knows each run's `elapsed` time.
- Clamp damage to `elapsed × maxDps(player power)`, plus a hard cap per run.
- The boss's skills keep `elapsed` bounded even with CC, so the clamp stays meaningful.
- The 5-tries-a-day limit is enforced on the server at battle start.

## Data sketch (D1)

- `world_boss_weeks(id, starts_at, ends_at, boss_id, max_hp, hp, kills, skills_json, rewards_json, paid_at)`
- `world_boss_damage(week_id, player_id, total, tries)`: the weekly board
- `world_boss_kills(week_id, kill_no, player_id, at)`: the Slayer credit for each kill
- Tries per day can come from `world_boss_damage.tries` plus a date, or from the existing
  `battles` table.

## Open questions

- How should the player see the shared HP before they enter (home-screen HP bar and kill
  counter)?
- Should a player's own record carry across weeks (an all-time total or best week)?
- What `maxDps(player power)` formula should the clamp use, given card levels, ranks and the hero?
