# Tower Rush website

The game's marketing site: a static one-page site (HTML, CSS and vanilla JS, no build step).

| File | What |
|---|---|
| `index.html` | Page structure: hero, how to play, unit codex, heroes, arenas, bosses, modes, leagues, news |
| `styles.css` | All styling; rarity and element colours match `shared/units.ts` |
| `app.js` | Renders the codex, heroes, arenas, bosses and leagues from the data file; modals, filters, nav |
| `data/game.js` | Generated. Units, monsters, bosses, arenas, heroes and leagues from `shared/`. Each unit carries its card dialog (effect lines, merge-rank and power-up tables) worked out with the game's own formulas, like `DeckScene.showCard` |
| `scripts/export-data.mjs` | Writes `data/game.js` |

All art (portraits, arena backgrounds and videos, the trailer) is loaded from the game's R2
bucket at `https://assets.depedtoolkit.com`, always with `crossorigin="anonymous"`. "Play" buttons
open the live game at https://tower-rush.philiplouis0717.workers.dev.

## Update the game data

After a balance change or new units, run this from the repo root (needs Node 24+):

    node website/scripts/export-data.mjs

It also fetches the R2 `index.json`, so the "Awakens" badges and arena videos follow the uploaded art.

## Preview

Open `index.html` directly, or serve the folder:

    npx serve website        # or: python -m http.server 5190 --directory website

## Deploy

Any static host works (Cloudflare Pages, or a `/site` route on the game's Worker). The news
section in `index.html` is written by hand; add a post there with each release
(see `docs/features/ROADMAP.md`).
