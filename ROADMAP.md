# Tower Rush: what's next

State as of 2026-10-03: playable merge tower-defense (Phaser 3) with widescreen and phone
layouts, synthesized music and sound effects, a Node + SQLite server (accounts, server-side
progress, versioned game config) and a React admin panel (balance editing, player
management, audit log). See [README.md](README.md) for how to run it.

## Recommended order

### 1. Housekeeping (small, do first)
- ~~The project isn't under version control yet~~ done: it's in git.
- No automated tests. Start with `shared/` (config validation, rewards, chest rolls) and the server API.

### 2. Use the art that's already generated but unused
All of this exists in `assets/` and is converted into `game/public/assets/`:
- ~~**Heroes**~~ done: 8 heroes (`shared/heroes.ts`), one picked per player in Deck > Heroes,
  bought with gems behind a trophy gate (Young King is free). In battle the hero button (or `H`)
  fires its ability, then it recharges. Balance on the admin **Heroes** page. Ideas for later:
  hero levels/upgrades, and showing the hero's victory clip on the phone results screen.
- ~~**Awakened units**~~ done: a unit merged to rank 7 awakens if it has awakened art (35 of
  60 units): awakened sprite + gold aura, more damage/speed, and an ultimate every few seconds
  (its own hit, stronger, on everything around the target). Numbers on the admin Economy page.
  The card details show the awakened form (tap to flip). Sheets are fetched mid-battle once any
  unit reaches rank 5. Idea for later: tie it to card level too (e.g. awaken at rank 6 once the
  card is max level).
- ~~**HD sprite sheets**~~ done: the wide layout now renders at the screen's pixel density
  (up to 2x), and above 1x loads HD sheets for units (288px frames), monsters (256), bosses and
  heroes (384). Clips with no clean HD source are rebuilt from the SD art at the HD size so a
  character's clips share one frame size. On a 1080p monitor nothing changes (1x, SD sheets).
  Awakened units have no HD art, so they stay at 192px frames. Idea for later: the location
  backgrounds (1344px) look soft at 2x; regenerate or upscale them.
- ~~**Ambient location loops and trailer**~~ done: the title screen plays the trailer (an animated
  version of the key art, then fades back to the still); the lobby, shop and 8 of the 16 arenas
  play their ambient loop over the static picture (same composition, so the board lines up).
  Re-encoded to about 0.6 MB per loop (8.7 MB total) with the end crossfaded into the start so
  they wrap cleanly. Off with `?novideo` or the system's reduced-motion setting. The 4 promo
  clips aren't used (two show towers that aren't in the game; they suit a store page).
- The rest of the unused art belongs to features that don't exist yet, so it's listed with them:
  the **quests / daily login** icons under section 3,
  **friends / clan / chat / PvP / co-op** icons and **emotes** (12) under Multiplayer (emotes
  only make sense with an opponent), and the **items** (essences, talent runes, potions,
  scrolls, battle pass ticket) when there's a system to spend them on.

### 3. Retention features (assets above already cover the UI)
- ~~**Daily login rewards and daily quests**~~ done (`shared/daily.ts`): a 7-day login calendar
  (missing a day doesn't reset it; pops up once per session when ready) and 3 quests a day drawn
  from a weighted pool, plus a bonus for finishing all of them. Days are UTC. Battle quests use
  counts the run reports (merges, summons, hero uses...), capped by the server; upgrades and
  chest opens are counted by the server itself. Edit both on the admin **Daily & quests** page.
  Ideas for later: a quest reroll (for gems), weekly quests, push/email reminders.
- ~~**Leaderboard screen**~~ done: lobby **RANKS** button. Top 100 by trophies or by best wave
  (ties share a rank; players with 0 aren't ranked), with each player's hero as their avatar, your
  row highlighted and scrolled into view, and your rank shown even outside the top 100. Ideas for
  later: a weekly/seasonal board (needs per-season trophy history), and per-arena best waves.
- ~~**Leagues**~~ done (`shared/leagues.ts`): 7 trophy leagues, Bronze (0) to Champion (5000). A
  player's league follows their current trophies, so they can drop back down; reaching a league
  for the first time pays a one-time promotion reward (gold, gems, maybe a chest) when the battle
  ends, shown on the results screen. The badge sits in the top-right of the top bar (tap it for
  the leagues list and progress to the next one) and on each leaderboard avatar. Icons are sliced
  from `ui/league_ranks.png` into `ui/league_<n>.webp` (re-run `npm run assets` once); until then,
  or for an icon number with no art, the game draws a shield in the league colour. Edit them on
  the admin **Leagues** page; the dashboard shows players per league. Ideas for later: seasons
  (trophy reset to the league floor, end-of-season rewards), and league-scoped leaderboards.
- ~~**Player inbox**~~ done (`shared/mail.ts`, `server/src/mail.ts`): the admin **Mail** page sends a
  message to one player (also from their page: **Send mail**) or to every player, optionally with a
  gift (gold, gems, a chest) and an expiry. "Every player" means accounts that exist when it's sent,
  unless "also players who join later" is on. In the lobby, **MAIL** (a small envelope under the
  settings gear on phones) shows a count of unread messages and unclaimed gifts; players read, claim
  (once) and delete messages there. The admin list shows reads and claims per message and can
  recall one (unclaimed gifts go with it). Ideas for later: target a segment (league, inactive for
  N days, guests), schedule a send for later, gift cards or heroes, and a pop-up for important news.

### 4. More admin control
- ~~Archetype effect numbers in the config~~ done (`shared/effects.ts`): every archetype's numbers
  (splash radius, burn, chain jumps/range/falloff, pierce, slow, freeze, stun, poison, crit, curse,
  execute, sniper bullet speed, growth, buff, mana) are in the game config and edited on the admin
  **Effects** page, which previews each one at a few ranks and rarities. The defaults are the old
  hard-coded values, so balance is unchanged until someone edits them. Card details in the deck
  show the unit's effect with its numbers. Idea for later: per-unit overrides of these numbers.
- ~~Shop offers and limited-time events~~ done (`shared/offers.ts`): the admin **Offers & events**
  page schedules events (start/end time; battle gold and gem multipliers and a chest discount while
  they run; overlapping events use the biggest of each, not the product) and bundles (gold, gems,
  N of a chest) sold for gold or gems on the shop's new SPECIALS shelf, each with a per-player
  limit, trophy gate, struck-through "was" price, and either its own sale window or an event's.
  Both live in the game config, so they're versioned with it; the server switches them on and off
  by the clock and checks every purchase, and the game syncs to the server's time for countdowns.
  A running event shows a banner in the lobby (tap for the shop) and the shop, and its boost on
  the results screen. Purchases are logged, and each offer shows its sales. Ships with one offer,
  a one-time Starter Pack. Ideas for later: real-money purchases (needs store billing), daily
  rotating deals, offers that include specific cards or heroes, event-only quests.
- ~~Charts: player retention, average wave per arena over time~~ done (`server/src/analytics.ts`): the
  admin **Analytics** page (14/30/90 days, UTC days) shows new and active players per day, day
  1/3/7/14/30 retention overall and as a table per sign-up day, average wave per arena over time
  (daily or weekly, pick which arenas), and battles and average wave per day. Charts are plain SVG
  (`admin/src/chart.tsx`), no library. Retention needs to know which days each player was around,
  so the server now records one row per player per active day (`activity` table); days before this
  were rebuilt from sign-up, battle and last-seen dates, so early retention undercounts. Ideas for
  later: retention by league or by guest vs registered, revenue (gems spent) per day, CSV export.

### 5. Multiplayer (biggest item)
- Rush Royale's core modes are PvP (two boards, monsters you kill get sent to the opponent)
  and co-op (shared waves). Needs a realtime server (WebSockets), matchmaking, and ideally a
  deterministic, server-validated simulation, which would also fix the anti-cheat gap below.
  Art waiting for it: 12 emotes, `pvp_versus_background`, and the PvP/co-op/friends/clan/chat icons.

### 6. Release prep
- ~~Hosting~~ done (2026-10-04, [DEPLOY.md](DEPLOY.md)): all on Cloudflare (Workers Free plan).
  - One Worker serves the API (Hono, ported from Express), the game and the admin panel.
  - D1 replaces SQLite, with the same schema plus a `rev` column. Requests now run
    concurrently, so a profile save only lands if nothing else saved it in between; double
    taps can't double-spend or double-claim.
  - The art is served from R2 (`assets.depedtoolkit.com`, with CORS).
  - Live at tower-rush.philiplouis0717.workers.dev. Pushes to master deploy once Workers
    Builds is connected.
  - Ideas for later: a custom domain, and the Paid plan when traffic grows (then raise the
    password hash cost).
- Mobile: wrap with Capacitor for app stores; add a PWA manifest for install-to-home-screen.
- Performance: the art is 250 MB of WebP (about 130 MB of it HD sheets). A battle only loads its
  deck, arena and hero, but packing sheets into atlases would cut the number of requests.

## Known gaps
- Battles are simulated in the browser; the server only caps the reported wave by elapsed time.
- Balance is a first pass, tuned with a quick bot. Real play data (the admin dashboard's
  "Arenas" table) should drive the next pass.
- Arena grid/path positions were measured by eye; press `D` in battle to check one, then adjust
  `shared/arenas.ts` or the Arenas page.
- 6 character animations had backgrounds that couldn't be removed cleanly; the game skips
  them (listed as `hazy` in `game/public/assets/index.json`). The awakened Tide Mermaid art
  is missing (blocked by the image generator's filter).
- The layout (wide vs phone) is picked at page load; resizing needs a refresh.
- Audio is synthesized; real recorded music/SFX could replace `game/src/audio.ts` later.
