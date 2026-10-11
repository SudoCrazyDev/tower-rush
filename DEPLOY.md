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

## Infrastructure inventory

All set up on 2026-10-11/12 (Cloudflare account `6f48a95301b0c84f452b64d990b8fa60`, Free plans).

| Resource | Id / value | Notes |
|---|---|---|
| Zone `crownnkeep.com` | `c78f208e0e0f2a4bf41cb1deebeb528c` | Registered at Cloudflare. DNS records for the app hosts are created by the Workers' custom domains; don't edit them by hand. |
| Zone `depedtoolkit.com` | `933bc3273fd6d7e59fe156fbd2f5d62b` | Only for the legacy art host `assets.depedtoolkit.com`. |
| D1 `tower-rush` (prod) | `8633ac1c-c935-448e-9473-05d5554e6df3` | Bound as `DB` in `server/wrangler.jsonc`. |
| D1 `tower-rush-staging` | `7a9cd407-6eb7-415e-8367-d00309e64e97` | Bound as `DB` under `env.staging`. |
| R2 `tower-rush-assets` | custom domains `assets.crownnkeep.com`, `assets.depedtoolkit.com` | Shared by prod and staging (art is append-only). `npx wrangler r2 bucket domain list tower-rush-assets` |
| Transform Rule (crownnkeep.com) | ruleset `e00c7ae06dd746b2b518d03d3207c9de` | `http_response_headers_transform`: host `assets.crownnkeep.com` always gets `Access-Control-Allow-Origin: *`, so a non-CORS cached copy can't break WebGL loads. |
| Transform Rule (depedtoolkit.com) | ruleset `885317fede324cc99c5a30745f9bb349` | Same rule for the legacy art host. |
| Durable Objects | `Matchmaker`, `MatchRoom` (migration tag `v1`) | Owned by the `tower-rush` / `tower-rush-staging` Workers. |
| Rate limits | prod `1001` (auth), `1002` (admin); staging `1003`, `1004` | `ratelimits` in `server/wrangler.jsonc`. |
| workers.dev | `tower-rush.philiplouis0717.workers.dev` | Kept on (`workers_dev: true`) only to 301 old bookmarks to the game. |
| Cloudflare Access | team `crimson-bread-3137.cloudflareaccess.com` | Self-hosted app on `manage.crownnkeep.com`, policy `Owner` (Allow, emails), one-time PIN login. Add admins in Zero Trust, Access, Applications. |
| Workers Builds | not connected | Deploys are run by hand with the scripts above. |

Secrets (never in the repo):
- `ADMIN_PASSWORD` on `tower-rush` and on `tower-rush-staging`. Set or change from the repo root:

      npx wrangler secret put ADMIN_PASSWORD -c server/wrangler.jsonc
      npx wrangler secret put ADMIN_PASSWORD -c server/wrangler.jsonc --env staging

  It is only read while an environment has no admin account; the first sign-in as `admin`
  creates the account. Each environment has its own accounts, so the admin panel keeps a
  separate sign-in per environment.

Access only guards the admin's pages. Its API calls (`api.crownnkeep.com/api/admin`) are
protected by the admin sign-in. Putting Access on `staging-api.` would break the staging game,
so to make staging private, protect `staging-game.` and `staging.` instead.

To recreate from scratch: create both D1 databases (`npx wrangler d1 create ...`, update the
ids in `server/wrangler.jsonc`), attach the R2 custom domain
(`npx wrangler r2 bucket domain add tower-rush-assets --domain assets.crownnkeep.com --zone-id <zone>`),
add the Transform Rule, set the secrets, run every deploy script (custom domains are created on
first deploy), then add the Access application.

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
