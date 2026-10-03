# Tower Rush: what's next

State as of 2026-10-03: playable merge tower-defense (Phaser 3) with widescreen and phone
layouts, synthesized music and sound effects, a Node + SQLite server (accounts, server-side
progress, versioned game config) and a React admin panel (balance editing, player
management, audit log). See [README.md](README.md) for how to run it.

## Recommended order

### 1. Housekeeping (small, do first)
- The project isn't under version control yet: `git init`, first commit (root `.gitignore` is ready).
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
  **league rank icons** under Leagues, the **quests / daily login** icons under section 3,
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
- Leagues based on trophies (`ui/league_ranks.png` is a sheet of rank icons; slice it like the
  button atlas).
- Player inbox: admin sends gifts or announcements to players.

### 4. More admin control
- Each archetype's effect numbers (slow %, crit chance, chain jumps, freeze time...) are still
  hard-coded in `game/src/scenes/BattleScene.ts` (`applyHit`). Move them into the config.
- Shop offers and limited-time events from the admin panel.
- Charts: player retention, average wave per arena over time.

### 5. Multiplayer (biggest item)
- Rush Royale's core modes are PvP (two boards, monsters you kill get sent to the opponent)
  and co-op (shared waves). Needs a realtime server (WebSockets), matchmaking, and ideally a
  deterministic, server-validated simulation, which would also fix the anti-cheat gap below.
  Art waiting for it: 12 emotes, `pvp_versus_background`, and the PvP/co-op/friends/clan/chat icons.

### 6. Release prep
- Hosting: one Node server serves game, admin and API (`npm run build && npm start`); needs HTTPS.
  SQLite is fine to start; move to Postgres if it grows.
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
