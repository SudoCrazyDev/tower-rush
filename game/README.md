# Tower Rush (web)

A merge tower-defense game for the browser, built with Phaser 3 + TypeScript + Vite,
using the generated art in `../assets`. It needs the server in `../server` for accounts,
progress and the live game config. See the [root README](../README.md).

## Run

From the repo root, `npm run dev` starts the server, the game and the admin panel together.
To work on the game alone:

    npm install
    npm run assets   # converts ../assets into public/assets (WebP); only needed once
    npm run dev      # http://localhost:5173 (proxies /api to the server on :8787)
    npm run build    # typecheck + production build into dist/

The layout is picked when the page loads: **wide** for landscape screens (arena in the
middle, HUD and menus spread across the sides) and **portrait** for phones. Add
`?layout=wide` or `?layout=portrait` to force one.

In the wide layout the canvas is drawn at the screen's real pixel density (up to 2x; game
coordinates stay the same, the cameras zoom), and above 1x the units, monsters, bosses and
heroes use the HD sprite sheets (`sheets/<folder>_hd`). `?res=1.5` forces a render scale,
`?hd=1` / `?hd=0` forces the HD sheets on or off.

The title, lobby, shop and 8 arenas play muted ambient videos (`public/assets/video/`) over
their static pictures (`src/backdrop.ts`). `?novideo` turns them off, as does the system's
reduced-motion setting.

Add `?timer` to the URL to drive the game loop with timers instead of
requestAnimationFrame (useful when testing in a background tab).

## How it plays

- 5-card deck, 5×3 board. **Summon** places a random deck unit on an empty tile. The cost rises by 10 each time.
- **Drag** a unit onto another with the same type and rank to merge them into a random deck unit one rank higher (max 7).
- Tap a deck card in battle to **power up** that unit type for the rest of the match.
- Monsters walk in at the top gate, take the left or right half of the ring, and leave at the bottom gate. A leak costs a life (a boss costs all of them).
- Every 5th wave is a boss with a special power (summon, heal, rage, shield, teleport, freeze your units).
- Rewards after a run: gold, gems (from bosses) and trophies, calculated by the server. Trophies unlock the 16 arenas.
- Meta: chests in the Shop give cards, and copies plus gold upgrade a card's level.
- Daily: a login reward calendar and 3 daily quests (lobby buttons, top left), reset at 00:00 UTC.
- Leagues: trophies put you in a league (badge in the top-right corner; tap it for the list). The first time you reach one, the battle's results pay its promotion reward.
- Mail: news and gifts from the admins (lobby **MAIL** button, with a count of unread messages and unclaimed gifts).
- Players start as guests; Settings (gear icon in the lobby) lets them create an account to keep their progress.

All the numbers (damage, HP, prices, rewards...) come from the live game config, which is
edited in the admin panel. The defaults are in `../shared/`.

Keys in battle: `SPACE` summons, `D` toggles the path/grid overlay (for arena calibration).

## Code map

| Path | What |
|---|---|
| `../shared/units.ts` | 60 units: rarity, element, archetype, damage/speed, stat formulas |
| `../shared/monsters.ts` | 30 monsters (traits) and 12 bosses (powers) |
| `../shared/arenas.ts` | 16 arenas: board grid and path ring measured on the art, monster pools, bosses |
| `../shared/effects.ts` | Archetype effect numbers (slow, freeze, chain...) and the formulas battles use |
| `../shared/economy.ts` | Economy numbers, chests, battle rewards |
| `../shared/daily.ts` | Login calendar, quest pool, quest progress and UTC-day helpers |
| `../shared/leagues.ts` | Trophy leagues, promotion rewards, which league a trophy count is in |
| `../shared/mail.ts` | Inbox message type and the limits/checks for sending one |
| `src/data/*` | Re-exports of the shared tables |
| `src/api.ts`, `src/save.ts` | Server client; player profile and every action that changes it |
| `src/authOverlay.ts` | Sign-in / create-account screen (HTML over the canvas) |
| `src/scenes/LeaderboardScene.ts` | Top players by trophies or best wave, plus your own rank |
| `src/scenes/daily.ts` | Daily login calendar, quests list and reward popup (opened from the lobby) |
| `src/scenes/leagues.ts` | League badge (atlas icon or drawn shield) and the leagues list |
| `src/scenes/inbox.ts` | Inbox list, message view with gift claim, and the drawn envelope icon |
| `src/scenes/BattleScene.ts` | Waves, summon/merge, targeting, hit effects, HUD, results |
| `src/battle/` | `Unit`, `Monster`, path geometry |
| `src/scenes/{Boot,Lobby,Deck,Shop,Hero}Scene.ts` | Menus |
| `src/backdrop.ts` | Ambient videos over the static backgrounds |
| `src/display.ts` | Layout (wide/portrait), render scale and HD switch, picked at startup |
| `src/ui.ts` | Buttons, cards, modals, text style |
| `src/audio.ts` | Sound effects and music, synthesized with Web Audio (no audio files). Settings or Pause toggles them |
| `tools/build_assets.py` | Asset pipeline → `public/assets` + `index.json` |
| `tools/rekey.py` | Re-keys the VFX clips (their backgrounds weren't pure green) |

`index.json` lists a few `hazy` character animations whose backgrounds couldn't be keyed
cleanly. The game skips those and uses the idle animation with a squash instead.
