# Deploying Crown & Keep (Cloudflare)

Four apps, each its own Cloudflare Worker with its own version, deployed on its own. Every
app has a staging copy. Release steps and rules: [RELEASING.md](RELEASING.md).

| App | Folder | Worker (prod / staging) | Prod URL | Staging URL |
|---|---|---|---|---|
| Website | `website/` | `crown-and-keep` / `crown-and-keep-staging` | https://crownnkeep.com (+ www) | https://staging.crownnkeep.com |
| Game | `game/` | `tower-rush-game` / `tower-rush-game-staging` (static) | https://game.crownnkeep.com | https://staging-game.crownnkeep.com |
| API | `server/` | `tower-rush` / `tower-rush-staging` (Hono, D1, Durable Objects) | https://api.crownnkeep.com | https://staging-api.crownnkeep.com |
| Admin | `admin/` | `tower-rush-admin` (static, one app for both environments) | https://manage.crownnkeep.com | same app: Production / Staging switch in its header |
| Art | R2 bucket `tower-rush-assets` | | https://assets.crownnkeep.com | same bucket |

The old `https://assets.depedtoolkit.com` stays alive for old game clients. The old
`tower-rush.philiplouis0717.workers.dev` now only redirects (301) to the game.

The API Worker keeps the name `tower-rush`, so the production D1 database and the PvP Durable
Objects are unchanged. Staging has its own D1 database `tower-rush-staging`. Internal ids stay
`tower-rush` (see the note at the end).

Each app has its own `wrangler.jsonc` in its folder (custom domains via `routes`, a
`staging` env). Wrangler envs don't inherit bindings, so `server/wrangler.jsonc` repeats them
under `env.staging`. **Never run `wrangler deploy` from the repo root**: there is no root
config. Use the root npm scripts below.

## How the apps talk

- Game and admin are static files. They call the API at its own origin: `__API_BASE__` in
  `game/vite.config.ts` (`""` in dev through the Vite proxy; `--mode staging` builds point at
  `staging-api.`). The admin app picks Production or Staging at runtime (`admin/src/env.ts`).
- The API allows browser origins from the `ALLOWED_ORIGINS` var (CORS and the WebSocket
  `Origin` check). Staging also allows `http://localhost:5173` and `:5174`. Both APIs allow
  `https://manage.crownnkeep.com`.
- Version gate: the game sends `X-Client-Version` (WebSockets: `v=`). The API var `MIN_CLIENT`
  is the oldest game version it serves; older or missing gets `426` and the game shows
  "New version available". `/api/admin/*` is exempt. `/api/config` returns `minClient`.
- Any non-`/api` request to the API Worker is redirected (301) to `GAME_URL`.

Plan: Workers **Free**: 100k API requests a day; static assets and art don't count. D1 Free
allows 5M rows read and 100k rows written a day. Passwords use PBKDF2 with 50k iterations to
fit the Free plan's CPU limit. On the Paid plan raise `ITERATIONS` in `server/src/auth.ts`
to 100k; existing passwords upgrade when their owners next sign in.

## Deploy commands (from the repo root)

| What | Production | Staging |
|---|---|---|
| API (applies D1 migrations first) | `npm run deploy:api` | `npm run deploy:api:staging` |
| Game (builds first) | `npm run deploy:game` | `npm run deploy:game:staging` |
| Admin (builds first) | `npm run deploy:admin` | (one app, no staging copy) |
| Website | `npm run deploy:website` | `npm run deploy:website:staging` |

Local dev: `npm run dev` starts the API (`wrangler dev` on 8787 with a local D1 copy in
`server/.wrangler/`), the game (5173) and the admin (5174). In dev the admin's Production
side is the local API; its Staging side is the real staging API.

## One-time setup

Done by the maintainer's tooling:
1. D1 databases `tower-rush` (prod) and `tower-rush-staging` (ids are in
   `server/wrangler.jsonc`). Apply new migrations with the deploy scripts or by hand
   (`npm run db:remote`, `npm run db:remote:staging`).
2. R2 bucket `tower-rush-assets` with a custom domain `assets.crownnkeep.com`, CORS allowing
   `GET`/`HEAD` from any origin (WebGL needs it) and a Response Header Transform Rule that
   always sends `Access-Control-Allow-Origin: *`. Check:
   `npx wrangler r2 bucket cors list tower-rush-assets`.

**You (dashboard and secrets):**
1. **Disconnect the old Workers Build.** Workers & Pages, `tower-rush`, Settings, Build:
   disconnect the GitHub connection. It would run the old root deploy on every push to
   master and fail or overwrite the new layout. (Optionally reconnect each Worker later with
   its own root directory and watch paths.)
2. **Admin password for staging.** In `server/`:

       npx wrangler secret put ADMIN_PASSWORD --env staging

   Sign in to Staging in the admin panel as `admin`; the first sign-in creates the account.
   Production keeps its existing admin accounts (`ADMIN_PASSWORD` is only read while no admin
   exists). Each environment has its own accounts, so the admin panel keeps a separate
   sign-in per environment.
3. **Cloudflare Access (Zero Trust, Free).** Add a self-hosted application in front of
   `manage.crownnkeep.com` allowing your email. Optionally also in front of
   `staging-game.`, `staging.` and `staging-api.` (note: Access on `staging-api.` blocks
   browser calls from the staging game unless the game sends Access credentials, so protect
   the staging game and website hosts instead if you want staging private).

## Changing the database

Add a new file, `server/migrations/0002_<what>.sql`. Never edit one that has already run.
Then:

    npm run db:local            # apply to your local database (wrangler dev)
    npm run db:remote:staging   # apply to staging (deploy:api:staging also does this)
    npm run db:remote           # apply to production (deploy:api also does this)

Look at live data in the dashboard (**Storage & Databases, D1, Console**) or:

    npx wrangler d1 execute tower-rush --remote -c server/wrangler.jsonc --command "SELECT COUNT(*) FROM users"

Backups: D1 Time Travel restores to any minute in the last 7 days (30 on Paid):

    npx wrangler d1 time-travel restore tower-rush -c server/wrangler.jsonc --timestamp <unix seconds or ISO time>

## Updating the art

The art isn't in git. Rebuild it, then upload it to R2 (before deploying code that needs it):

    npm --prefix game run assets           # build game/public/assets from assets/
    node scripts/upload-art.mjs            # upload everything, or name folders: ... ui units

Cloudflare caches art for a day. A changed file can take that long to reach players unless
its name changes. `index.json` is only cached for 5 minutes.

## Logs

    npx wrangler tail tower-rush            # or tower-rush-staging

Or the dashboard: the Worker, **Observability**.

## Name

The game was called **Tower Rush** until v1.3.0 (2026-10-06). Internal ids still use
`tower-rush` (the API Worker, D1 database, R2 bucket, browser storage keys and the PvP socket
protocol) so players keep their logins and settings; only the player-facing name changed.
