# PvP: waves plus sends

Decided 2026-10-04. This replaces the "monsters you kill go to the opponent" idea in
[MULTIPLAYER.md](MULTIPLAYER.md). The model is **Bloons TD Battles**: both players get the same
waves, and either player can spend mana to **send** extra monsters to the other's board. A send
also raises the sender's income for the rest of the match ("eco").

## The match

- **Two boards, one clock.**
  - Both players get the same seeded waves, on a fixed timer: `waveSeconds` per wave and
    `bossWaveSeconds` for boss waves.
  - A wave starts on time whether or not the last one is cleared. Leftover monsters keep walking.
  - In solo, a wave starts when the last one is cleared. That would let the stronger board
    run ahead, so PvP doesn't do it.
- **HP instead of 3 lives.**
  - Each player starts with `hp` (20).
  - A leak costs `leakDamage` (1), `tankLeakDamage` for tanks (2) and `bossLeakDamage` (8).
  - A sent monster costs the damage of its send.
  - You lose at 0.
- **Sudden death.**
  - From `suddenDeathWave` (20), wave health grows by `suddenDeathGrowth` per wave instead of
    the normal `waveHpGrowth`, which keeps matches to about 6–8 minutes.
  - At `maxWave` (40) the player with more HP wins. With equal HP it's a draw.
- **One arena for both**, picked from the seed.
  - The arena only sets the look and the monster pool.
  - Health doesn't use the per-arena step, so every PvP arena is equally hard.
- **The hero** works as in solo, on your own board only, with the same auto-cast switch.

## Sends (same mana as summoning and power-ups)

| Send | Contents | Unlocks at wave | Role |
|---|---|---|---|
| Rabble | 6 zombie peasants | 1 | cheap, best income for its cost |
| Swarm | 10 goblin runners (fast) | 3 | tests single-target decks |
| Bats | 6 vampire bats (dodge) | 5 | tests crit and splash |
| Brute | 1 orc brute (tank, armored) | 6 | tests damage per hit |
| Healers | 3 troll healers | 8 | punishes slow kills |
| Splitters | 4 gelatinous cubes | 10 | needs splash |
| Champion | a boss at 40% health | 15 | expensive, no income |

- **Cost and income.**
  - Each send costs mana and adds `income` to the sender.
  - Income is paid out every `incomeEvery` seconds (6 s) for the rest of the match, on top of
    `baseIncome`.
  - Cheaper sends pay back more income per mana spent. The Champion is a pure attack.
- **Health** is `hpMult ×` that monster's normal health on the current wave, so an early send
  stays useful later.
- **No cooldowns: mana is the only limit** (since 2026-10-05).
  - Like Bloons TD Battles, you can spam a send as often as you can pay for it. Saving up for a
    big flood is a real strategy, and so is defending against one.
  - Each send still has a `cooldown` and `stock` (charges) in the config. A cooldown of 0
    (the default for every send) means no limit; set one above 0 on the admin page to bring
    charges back for that send.
  - **Cheat guard.** Each client runs its own board, so the room can't see a player's mana.
    Instead it caps total send spending at `startMana + 2 × (20t + 0.06t²)` by match time
    `t` seconds. That is twice the most mana strong bot boards earned (level 15, mana units:
    about 18t + 0.06t²), so honest play never reaches it.
- **Warning.**
  - Sends land `sendDelay` seconds (3) after they're bought.
  - The receiver sees an "incoming" banner with the icons first, so they can answer, for
    example with a hero ability.
- **Little reward for killing them.**
  - A sent monster pays `sentManaShare` (25%) of its normal mana to whoever kills it.
  - Otherwise sending would mostly feed the opponent.
- **Where to edit:** all numbers, and the send list itself, are in the game config (`pvp`) on
  the admin **PvP** page.

## Modes

| Mode | Deck | Card levels | Hero | Trophies | Ranked rating |
|---|---|---|---|---|---|
| **Ranked** | your deck | your real levels | yours | win `+trophyWin`, loss `−trophyLoss`, scaled by the trophy gap | Elo, see below |
| **Mirror** | one random deck, the **same for both** players | everyone at `mirrorLevel` | one random hero, the same for both | none | none |
| **Casual** | your deck | every card at level 1 | yours | none | none |

- Every mode pays gold to both players: `winCoins` to the winner, `lossCoins` to the loser.
- A match also counts toward daily quests the way a solo battle does (battles, summons,
  merges...).
- Mirror tests pure skill with an unfamiliar deck. Casual is your own deck without the
  level advantage.

## Ranked rating and tiers

Ranked has a ladder of its own, separate from trophies. Trophies also come from solo battles
and gate arenas, heroes and leagues; the ranked rating only moves in ranked PvP.

- **Rating.** Everyone starts at `ratingStart` (1000), stored in the profile as
  `ranked: { rating, peak, played, wins, losses }`.
- **Change per match (Elo).** `K × (score − expected)`, where the score is 1 for a win, 0.5 for
  a draw and 0 for a loss, and `expected = 1 / (1 + 10^((theirs − mine) / 400))`.
  - It uses both ratings as they were when the match started (`Loadout.rating`).
  - An even match moves ±K/2. Beating a higher-rated player gains more, and losing to a
    lower-rated one costs more.
  - A win is always at least +1 and a loss at least −1. The rating never goes below 0.
- **Placement.** For a player's first `ratingPlacementGames` (10) ranked matches, K is
  `ratingPlacementK` (64) instead of `ratingK` (32), so new players find their level fast.
- **Bots.** A bot match counts. The bot gets a rating near the player's (±40).
- **Not rated:** friendly, practice, Mirror and Casual matches.
- **Tiers** (`pvp.tiers`, edited on the admin PvP page): Rookie 0, Contender 1100,
  Veteran 1250, Elite 1400, Legend 1600.
  - A player's tier is the highest one whose rating they've reached, so they can drop back down.
  - Tiers have no rewards (leagues still pay the trophy promotion rewards).
- **Where it shows.**
  - PvP menu: the tier and rating on the Ranked card. Tap the badge for the ladder.
  - Versus screen: each player's tier and rating.
  - Results: the rating change, the new tier, and "RANKED UP" or "Dropped to" when the tier changes.
  - Leaderboard: the **RANKED** tab (`/api/leaderboard?by=rating`), for players with at
    least one ranked match.
  - Admin: rating changes in the match list (`pvp_matches.rating1/2`, migration 0005), and
    the rating on the user page.

## Friend challenges

- **Open a challenge.** On the PvP screen, **Challenge a friend** asks for the rules:
  - **Real levels:** both players' own decks at their real card levels.
  - **Mirror:** one random deck and hero for both.
  - **Casual:** both players' own decks, every card at level 1.
- **Share the code.** You get a 6-character code to send however you like, with a copy button.
  The code leaves out characters that are easy to mix up (0/O, 1/I/L).
- **Join.** Your friend taps **Join with code** and types it in. The match starts for both of
  you as soon as they join.
- **Rules.**
  - Challenges are friendly: no trophies are won or lost, but the usual gold is paid.
  - A code works once and expires after `challengeMinutes` (5).
  - Opening a new challenge closes your old one, and you can't join your own code.
- **Admin.** The admin match list shows these as "friendly".
- **Later:** a friends list, and challenging someone straight from the leaderboard. Both need
  online status and invites.

## Matchmaking

- **Queues.** Each mode has its own queue. Ranked pairs players by **ranked rating**, starting
  from a band of `matchBand` (100) and widening by `matchBandGrowth` (25) every second. The
  other modes just pair the closest trophies.
- **Bot fallback.**
  - After `botAfterSeconds` (10 s) without an opponent, the player gets a bot.
  - The bot plays the same rules: it summons when it can, merges pairs, buys power-ups, and
    sends when it has spare mana. How well it plays scales with the player's trophies.
  - A bot match runs entirely in the browser.
  - It still goes through the server for rewards and trophies. Its trust level is the same as a
    solo battle's.
- **VS Bot (practice).**
  - The **VS Bot** button picks a mode (Real levels / Mirror / Casual) and starts a bot match
    straight away, with no queue (`/api/pvp/queue?mode=…&bot=1`).
  - The setup is marked `practice`: no gold, no trophies and no quest progress, and walking
    away from one never counts as a loss.
  - The admin match list shows these as "practice".

## How it runs (networking)

[MULTIPLAYER.md](MULTIPLAYER.md) planned a server-run simulation. On the Workers **Free** plan a
Durable Object can't spend that much CPU, so PvP v1 uses this model instead:

- **Each client simulates its own board** with the shared `PvpBoard` (`shared/pvpsim.ts`).
  - It's built on the Playground's seeded `Sim`, adding summon, merge, power-up, hero, timed
    waves, sends and HP.
  - Your own actions are instant, so the game feels like solo.
- **The server relays.**
  - One Durable Object per match (`MatchRoom`) relays sends and a compact board snapshot about
    4 times a second.
  - Your opponent's board is drawn small from those snapshots.
  - A matchmaker Durable Object (`Matchmaker`) runs the queues.
- **The server checks sends.** It checks every send against the shared clock: the unlock
  wave, the cooldown and the stock. A send a client couldn't have made is dropped.
- **Ending a match.**
  - It ends when a client reports 0 HP, at `maxWave`, or when one player has been
    disconnected for 60 s (that player loses).
  - The room writes the result and pays rewards in D1.
- **Replays.**
  - Each client uploads its action log: the seed and every action with its tick, including
    sends received.
  - The log is stored with the match, so a disputed match can be replayed later.
  - Moving to server-side verification is just running these logs through `PvpBoard` on the
    Paid plan.
- **The known gap:** a modified client can lie about its own board. It's the same trust level
  as solo today, and the stored logs make it detectable later.

Traffic: around 5 messages a second per player. The Free plan's Durable Object request
allowance covers a few hundred matches a day.

## Code map

| Piece | Where |
|---|---|
| Rules, sends, modes, defaults | `shared/pvp.ts` (`pvp` in the game config) |
| Board simulation | `shared/pvpsim.ts` (`PvpBoard`, extends `Sim` from `shared/sim.ts`) |
| Bot | `shared/pvpbot.ts` |
| Matchmaker and match rooms | `server/src/pvp.ts` (Durable Objects), routes under `/api/pvp` |
| Match records | D1 table `pvp_matches` (migration 0003; rating changes 0005) |
| Ranked rating and tiers | `ratingChange`, `tierFor` in `shared/pvp.ts`; paid in `pay()` in `server/src/pvp.ts`; badges and ladder in `game/src/scenes/ranked.ts` |
| Game: mode select, search, friend codes, versus, the match | `game/src/scenes/PvpMenuScene.ts`, `game/src/codePrompt.ts`, `game/src/scenes/PvpScene.ts` |
| Admin | **PvP** page (rules and the send list) |

## Ideas for later

- Server-side replay of ranked matches (Paid plan), then flag mismatches.
- Emotes: 12 icons exist in the art pack.
- Spectating, and friend challenges by code.
- Ranked seasons: a soft reset of the ranked rating, with rewards for the tier reached.
- Win rate per card and per send on the admin Analytics page.
