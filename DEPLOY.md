# Deploying Crown & Keep (Cloudflare)

Everything runs on Cloudflare:

| Piece | Where | Config |
|---|---|---|
| API (`server/src`, Hono) | Worker `tower-rush` | `wrangler.jsonc` |
| Game and admin panel (built files) | The same Worker's static assets: game at `/`, admin at `/admin/` | `npm run build` → `dist/` |
| Database | D1 database `tower-rush` | `server/migrations/*.sql` |
| PvP rooms | Durable Objects `Matchmaker` (one) and `MatchRoom` (one per match), in the same Worker | `wrangler.jsonc` (`durable_objects`, `migrations`); [PVP.md](PVP.md) |
| Art (250 MB) | R2 bucket `tower-rush-assets` at `https://assets.depedtoolkit.com/` | `game/vite.config.ts`, `admin/vite.config.ts` |

Live: **https://tower-rush.philiplouis0717.workers.dev** (admin: `/admin/`).

Plan: Workers **Free**. That's 100k API requests a day; the game and admin files and the art
don't count toward it. D1 Free allows 5M rows read and 100k rows written a day. Passwords
use PBKDF2 with 50k iterations to fit the Free plan's CPU limit. On the Paid plan, raise
`ITERATIONS` in `server/src/auth.ts` to 100k; existing passwords are upgraded when their
owners next sign in.

## One-time setup (done, except where marked)

1. D1 database `tower-rush` created, and its id is in `wrangler.jsonc`.
2. CORS on the R2 bucket allows `GET`/`HEAD` from any origin. The game draws the art with
   WebGL, which needs CORS for files from another domain. To check it:
   `npx wrangler r2 bucket cors list tower-rush-assets`.
3. **You: first admin password.** The live admin panel has no account until this is set.
   Run the command below and type a password. Then sign in at `/admin/` as `admin`; the
   first sign-in creates the account. After that, manage admins on the **Admins** page. The
   secret is only read while no admin exists.

       npx wrangler secret put ADMIN_PASSWORD

4. **You: automatic deploys (Workers Builds).** In the Cloudflare dashboard:
   - Go to **Workers & Pages → tower-rush → Settings → Build → Connect**, pick GitHub, and
     choose `SudoCrazyDev/tower-rush`.
   - Set:
     - **Branch:** `master`
     - **Root directory:** `/` (leave empty)
     - **Build command:** `npm run build:ci`
     - **Deploy command:** `npm run db:remote && npx wrangler deploy`
   - Save. From then on every push to master builds and deploys on its own.
   - If the deploy step fails on the database migration, the build's API token lacks D1
     access. Edit that token under **My Profile → API Tokens** to add *D1: Edit*, or drop
     `npm run db:remote &&` and run migrations by hand (below).

## Deploying by hand

    npm run deploy   # build, apply new database migrations, upload the Worker

## Changing the database

Add a new file, `server/migrations/0002_<what>.sql`. Never edit one that has already run.
Then:

    npm run db:local    # apply to your local database (wrangler dev)
    npm run db:remote   # apply to the live database (the deploy commands also do this)

To look at live data, use the dashboard (**Storage & Databases → D1 → tower-rush → Console**) or:

    npx wrangler d1 execute tower-rush --remote --command "SELECT COUNT(*) FROM users"

Backups: D1 Time Travel can restore the database to any minute in the last 7 days (30 on Paid):

    npx wrangler d1 time-travel restore tower-rush --timestamp <unix seconds or ISO time>

## Updating the art

The art isn't in git. Rebuild it, then upload it to R2:

    npm --prefix game run assets           # build game/public/assets from assets/
    node scripts/upload-art.mjs            # upload everything, or name folders: ... ui units

Cloudflare caches art for a day. A changed file can take that long to reach players unless
its name changes. `index.json` is only cached for 5 minutes.

## Logs

    npx wrangler tail   # live request logs and errors

Or use the dashboard: **tower-rush → Observability**.
