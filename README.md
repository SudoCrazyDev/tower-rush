# Crown & Keep: Tower Defense

A merge tower-defense web game (Rush Royale-style) with a server for player accounts
and an admin panel for balancing the game and managing players.

The game was called **Tower Rush** until v1.3.0 (2026-10-06). Internal ids still use
`tower-rush` (the Worker, D1 database, R2 bucket, browser storage keys and the PvP socket
protocol) so players keep their logins and settings; only the player-facing name changed.

| Folder | What | Dev URL |
|---|---|---|
| `game/` | The game: Phaser 3 + TypeScript + Vite ([game/README.md](game/README.md)) | http://localhost:5173 |
| `admin/` | Admin panel: React + Vite | http://localhost:5174/admin/ |
| `server/` | API: Cloudflare Worker (Hono) with a D1 database ([DEPLOY.md](DEPLOY.md)) | http://localhost:8787 |
| `shared/` | Game data and rules used by all three (units, monsters, arenas, economy, config validation) | |
| `assets/` | The generated art pack, source files ([assets/README.md](assets/README.md)) | |

## Quick start

Needs Node 24+ and Python 3 with Pillow/numpy (only for the asset conversion).

    npm run setup   # installs everything, creates the local database, converts the art
    npm run dev     # starts the API (wrangler dev), game and admin together

The API runs locally in `wrangler dev` with a local copy of the D1 database (in `.wrangler/`).
For the admin panel, copy `.dev.vars.example` to `.dev.vars` and pick a password. The first
sign-in at http://localhost:5174/admin/ as `admin` creates that account. In dev the art is
served from `game/public/assets`; production loads it from R2.

## How the pieces fit

- **Game config.** All balance numbers live in one JSON document: every unit's damage,
  speed, rarity, element and archetype; every monster's and boss's HP and speed; arena
  unlocks and monster pools; each archetype's effect numbers (slow %, crit chance, chain
  jumps...); hero abilities and prices; chest prices and drop odds; the daily login
  calendar and quest pool; trophy leagues and their promotion rewards; the economy (mana, wave scaling,
  rewards, upgrade costs, starter deck). Defaults come from `shared/`. The server stores
  every published version in the database, and the game downloads the live one when it starts.
- **Admin panel.** Edit anything on the balance pages; changes are highlighted and
  collected into a draft. **Publish** validates the draft and makes it live as a new
  version (players get it on their next load). **Versions** lets you restore, export or
  import any version, or reset to defaults.
- **Players.** The game signs players in as guests automatically. Guests can create an
  account (username + password) from Settings and keep their progress. All progress lives
  on the server, which also does every purchase, card upgrade and chest roll, so players
  can't edit their own gold. Battles run in the browser; the server caps the reported
  wave to what's possible in the elapsed time and calculates the rewards itself.
- **Analytics.** Daily new/active players, retention by sign-up day (day 1, 3, 7, 14, 30),
  and average wave per arena over time, for the last 14, 30 or 90 days.
- **Player management.** Search players, edit gold/gems/trophies, give or remove cards,
  ban/unban with a reason, reset progress, set a password, sign them out everywhere, or
  delete them. Every admin action is recorded in the **Audit log**.
- **Mail.** Send announcements and gifts (gold, gems, a chest) to one player or everyone;
  they arrive in the game's inbox (lobby **MAIL**). Gifts are claimed once, messages can
  expire, and a sent message can be recalled.
- **PvP.** Ranked, Mirror and Casual matches: both players get the same waves on a fixed
  clock and spend mana to send monsters to each other (Bloons TD Battles style, with income).
  Matchmaking falls back to a bot after a few seconds. Rules, sends and rewards are on the
  admin **PvP** page, with a bot-vs-bot test and the recent matches. See [PVP.md](PVP.md).
- **Offers & events.** Schedule limited-time events (battle gold/gem multipliers, a chest
  discount) and sell bundles in the shop's SPECIALS shelf, each with an optional per-player
  limit, trophy gate and sale window (its own dates or an event's). Sales per offer are
  shown next to it. Things switch on and off by themselves at the times set.

## Production

It all runs on Cloudflare: one Worker serves the API, the game (`/`) and the admin panel
(`/admin/`), with a D1 database. The art comes from an R2 bucket. Pushes to master deploy
automatically. See [DEPLOY.md](DEPLOY.md).

    npm run deploy   # build, migrate the database, deploy (by hand)

## API overview

Player endpoints (`/api`, Bearer token from the auth calls):
`GET /config` · `POST /auth/guest | /auth/login | /auth/register | /auth/logout` ·
`GET /me` · `PUT /me/deck | /me/arena | /me/name | /me/hero` · `POST /cards/:id/upgrade` ·
`POST /heroes/:id/buy` ·
`POST /shop/chests/:id/buy` · `POST /shop/gift` · `POST /daily/login` ·
`POST /daily/quests/:id/claim` · `POST /daily/bonus` · `POST /battles` ·
`POST /battles/:id/finish` · `GET /leaderboard?by=trophies|wave` ·
`GET /pvp/queue?mode=` and `GET /pvp/match/:id` (WebSockets; the token goes in the
subprotocol list) · `POST /pvp/matches/:id/finish` (bot matches)

Admin endpoints (`/api/admin`, Bearer token from `POST /login`):
`GET /stats` · `GET|PUT /config` · `GET /config/versions[/:id]` ·
`POST /config/versions/:id/restore` · `POST /config/reset` · `GET /users` ·
`GET|PATCH|DELETE /users/:id` · `PUT|DELETE /users/:id/cards/:card` ·
`POST /users/:id/ban | unban | reset | password | logout` · `GET|POST /admins` ·
`DELETE /admins/:id` · `POST /me/password` · `GET /audit` · `GET /pvp/matches`
