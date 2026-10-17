# v2.9.0 "League Revamp"

Status: on staging 2026-10-17 (commit 483cf97; game 2.9.0, API 1.6.0, admin 1.5.0, website 1.6.0, MIN_CLIENT 2.9.0, migration 0011 applied to staging D1). Not on production yet. Promo kit: [PROMO.md](PROMO.md).

Trophies were too easy to earn. Every run past wave 6 gained trophies in any league and any arena,
and the most a run could lose was 15. This release makes trophies something you earn.

## 1. Per-league trophy rules (solo arena runs)

Each league (`shared/leagues.ts`, `LeagueDef`) now has its own rules:

- `minWave`: the wave a run must reach to gain trophies.
- `gainPerWave`: trophies per wave past `minWave`. **No cap**, so strong decks and good play climb faster.
- `lossPerWave`: trophies lost per wave short of `minWave`.
- `maxLoss`: most trophies one run can lose.

Formula (`runTrophies`, `TROPHY_BASE` = 5):

```
wave >= minWave:  +(5 + (wave - minWave) * gainPerWave)
wave <  minWave:  -min(maxLoss, 5 + (minWave - wave) * lossPerWave)
```

The league is the one the player is in when the run is scored. The old `ECONOMY.trophiesPerWave`,
`trophyOffset` and `trophyMaxLoss` are gone.

| League | Gate | Min wave | Gain/wave | Loss/wave | Max loss | Promotion reward |
|---|---|---|---|---|---|---|
| Bronze | 0 | 5 | 3 | 1 | 5 | none |
| Silver | 500 | 8 | 3 | 2 | 12 | 300 gold, 20 gems |
| Gold | 1,200 | 12 | 2 | 3 | 18 | 600 gold, 40 gems, Wooden Chest |
| Platinum | 2,200 | 16 | 2 | 3 | 22 | 1,000 gold, 60 gems, Silver Chest |
| Diamond | 3,500 | 20 | 2 | 4 | 26 | 1,500 gold, 100 gems, Silver Chest |
| Master | 5,000 | 25 | 1 | 4 | 30 | 2,500 gold, 150 gems, Royal Chest |
| Champion | 7,000 | 30 | 1 | 5 | 35 | 4,000 gold, 250 gems, Mythic Chest |
| **Mythic** (new) | 10,000 | 36 | 1 | 6 | 40 | 6,000 gold, 400 gems, Mythic Chest |
| **Immortal** (new) | 15,000 | 42 | 1 | 7 | 45 | 10,000 gold, 600 gems, Mythic Chest |
| **Secret Society** (new, hidden) | 30,000 + invitation | 50 | 1 | 8 | 50 | none |

Examples: Gold wave 40 = +61, Gold wave 8 = -17, Master wave 60 = +40.

Ranked PvP trophies are unchanged (`PVP.rules.trophyWin` / `trophyLoss`).

## 2. Longer gates and demotion

The gates went up (Silver 300 to 500, up to Champion 5,000 to 7,000). Players keep their trophy
count, so some drop a league on their first load. Promotion rewards already paid stay paid
(`profile.leagues`), so climbing back pays nothing twice. Arena and hero trophy gates are unchanged.

Saved configs get the new league table through the `2.9.0-leagues` hotfix (`shared/config.ts`),
which replaces the saved leagues with `DEFAULT_LEAGUES` once. Admin edits after that stick.

## 3. Arena lock

A solo run wins or loses trophies only in the player's **two highest unlocked arenas**
(`trophyArena` in `shared/arenas.ts`). Lower arenas still pay gold and gems, but trophies stay at 0.
This stops strong players farming trophies in Royal Meadow. The arena card and the arena info
dialog say which case applies.

## 4. Rage-quit penalty

A solo run that was started but never finished (game closed mid-run, or another device took over)
is settled when the player starts their next run (`settleAbandoned` in `server/src/player.ts`): it
counts as a wave-0 loss under their league, which is that league's max loss in practice. Story
chapters are not affected. Migration `0011_close_abandoned_battles.sql` closes runs abandoned
before this release (older than one hour) without a penalty. The "Playing elsewhere" takeover box
now warns that a run that never saves counts as a trophy loss.

Known edge: a run whose finish request fails (no connection) is also settled as a loss.

## 5. Secret Society League (invite-only)

- **Requirements:** 30,000 trophies, 5,000,000 gold and 10,000 gems held at once.
- **Hidden:** until a player joins, the league list shows it as "???" with "By invitation only"
  and the mystery badge (`MYSTERY_ICON` = 10). The website shows it as "??? League, Invite only".
- **Recruitment:** when a player meets every requirement, the lobby shows "YOU HAVE BEEN
  RECRUITED" (once per session, after any other popup). "Not now" leaves the invitation open from
  an INVITATION button in the league list.
- **Entry fee:** joining (`POST /api/society/join`) takes 5,000,000 gold and 10,000 gems, once.
- **Monthly dues:** 30,000 gold and 1,000 gems every 30 days (`settleSociety` in
  `shared/profile.ts`, run on every profile load). Dues that came due while the player was away
  are all taken on their next visit. Each payment sends an inbox note.
- **Losing membership:** if the player can't pay the dues, or drops below 30,000 trophies, they are
  out (inbox note says why). To come back they need a new invitation and pay the entry fee again.
- Stored as `profile.society = { league, joined, paidUntil }`. The leaderboard sends each row's
  `society` so members show the Society badge.
- All of it is configurable per league on the admin Leagues page (`society` rules: entry gold and
  gems, dues gold and gems, dues days).

Gems cannot be bought or earned through donations (no pay-to-win), so the Society is pure grind.

## 6. Art

Four new league badges, made with Higgsfield Nano Banana Pro on 2026-10-17 from the Champion,
Master and Diamond badges as style references (prompts: `LEAGUE_BADGE_ART` in
`shared/art-requests.ts`):

- 7 Mythic: magenta phoenix wings, gold crown, ruby.
- 8 Immortal: white angel wings, halo, laurel, flame over a diamond.
- 9 Secret Society: obsidian shield, bat wings, all-seeing eye, red wax seal.
- 10 "???" (hidden league): violet shield in chains with a padlock and a gold question mark.

Sources are `assets/ui/league_ranks_extra_<n>.png` (keyed with `keyimg.py`, trimmed to the badge).
`tools/build_assets.py` turns them into `ui/league_<n>.webp` and raises `atlas.leagues` to 11.
They are on R2 with `index.json`, so every build already shows them. Without the art, the game
falls back to a shield in the league colour.

## 7. Leagues list redesign

The leagues list (tap the badge in the lobby's top bar) was rebuilt in `scenes/leagues.ts`.
The old one had overlapping parts: the reward labels ran three lines tall and overflowed their
rows, the footer sat on the frame's bottom rim, and the frame's side gems covered the row ends.

- **Size:** the panel is 720 wide and `min(H - 110, 1270)` tall. Row height comes from the
  space left between the header and the footer, so all 11 leagues fit in both layouts.
- **Header card:** your badge, league name, trophies, a "next: <league>" hint, the progress
  bar and "N more trophies to promote", on a card in your league's colour. Your league's
  trophy rule (or Society dues) sits under the card.
- **Rows in league colour:** each row is filled with its league's colour (`tintPanel`): full
  strength for leagues you've reached, muted above. Rows are 160 px narrower than the panel,
  so the frame's side gems no longer cover them.
- **Your league:** its row gets a rim in the league's colour over a navy outline, and wings on
  both ends. The wings are cut from that league's own badge art (`badgeWings` adds a `wing`
  frame from the outer 30% of the badge texture and mirrors it for the right end). If the art
  is missing, `rowWings` draws three feathers in the league colour instead.
- **Rewards:** the chest icon, then gold and gems as icon + amount on two lines. A green check
  marks rewards already paid; "next battle" shows when a reward is owed. Bronze says
  "Start here".
- Hidden Society rows still show "???", "By invitation only" and the INVITATION button.

Gotcha: adding a frame to a single-frame texture makes it the texture's `firstFrame`, so a plain
`add.image(key)` would show the wing instead of the badge. `badgeWings` resets
`firstFrame = "__BASE"` after adding it.

## 8. Player profiles

A character page for any player, in the spirit of an AQWorlds character page.

- **Open it:** tap a row on the leaderboard (any tab) or in an arena's top list. Tap your own avatar
  in the lobby for your profile; it has an AVATAR button for the avatar picker that tap used to open.
- **Header:** avatar with league badge, name, league, "Playing since <month year>", then trophies,
  best wave, ranked rating and tier, and ranked W-L.
- **Stage (CURRENT DECK):** the player's hero idles large in the back; the 5 deck units idle in a
  shallow arc in front, each with a rarity-coloured shadow and a "Lv N" pill.
  The backdrop is the arena the player last picked (`profile.arena`, else their highest unlocked
  arena), cropped to cover the stage, dimmed, and faded into the dialog's navy on every edge (no frame). The dialog fills nearly the whole screen. Sheets load on demand
  (`loadSheet`); units start on staggered frames so they don't breathe in lockstep. A unit with no
  idle sheet bobs its static art instead. Tap a unit for its name and level.
- **Badges (n):** earned only: every league reached (promotions paid, plus the current league),
  the peak ranked tier once placement is done, and story badges (`BADGES`, drawn as a gold medal
  until they get art). A Society league the player has left shows as "???" unless the viewer is a
  member. The grid shrinks to fit.
- **API:** `GET /api/players/:id` returns `PublicProfile` (`shared/profile.ts`). Signed-in only;
  banned or unknown ids are 404. No migration, no `MIN_CLIENT` change.
- **Files:** `game/src/scenes/profileView.ts` (new), `LeaderboardScene.ts`, `arenaInfo.ts`,
  `LobbyScene.ts`, `server/src/player.ts`.

## 9. Files

- `shared/leagues.ts`: rules, `runTrophies`, `playerLeague`, `societyInvite`, new leagues.
- `shared/profile.ts`: `society`, `settleSociety`, `joinSociety`; promotions respect membership.
- `shared/economy.ts`: `battleRewards(wave, bosses, arenaIndex, league | null)`.
- `shared/arenas.ts`: `trophyArena`.
- `shared/config.ts`: league validation, `2.9.0-leagues` hotfix.
- `server/src/player.ts`: finish scoring, arena lock, `settleAbandoned`, dues in `me()`, `/society/join`, leaderboard `society`.
- `server/migrations/0011_close_abandoned_battles.sql`.
- Game: `scenes/leagues.ts` (rules line, ??? row, invitation, list redesign, badge wings), `LobbyScene` (arena card hint, invitation), `BattleScene` (result note), `arenaInfo`, `LeaderboardScene`, `play.ts`, `whatsNew.ts`.
- Admin: Leagues page columns (min wave, gain, loss, max loss, society), Economy page trophy fields removed.
- Website: trophy cards, ladder and wiki text use the new rules; the Society stays hidden.

## 10. Later

- Anti-cheat: the server only clamps the reported wave to one wave per 3 s. With no gain cap, a
  forged wave is worth more, so tighten the clamp per arena or flag outliers on the admin page.
