# Releasing Crown & Keep

Four apps ship independently, each with its own version and changelog:

| App | Version file | Changelog | Tag |
|---|---|---|---|
| Game | `game/package.json` | `game/CHANGELOG.md` | `game-vX.Y.Z` |
| API | `server/package.json` | `server/CHANGELOG.md` | `api-vX.Y.Z` |
| Admin | `admin/package.json` | `admin/CHANGELOG.md` | `admin-vX.Y.Z` |
| Website | `website/package.json` | `website/CHANGELOG.md` | `website-vX.Y.Z` |

The old `v1.1.0` to `v2.2.0` tags stay as game history. Where things live: [DEPLOY.md](DEPLOY.md).

## Every release: staging first, then production

1. Bump the app's version in its `package.json`, add a `CHANGELOG.md` entry, commit.
2. Deploy to staging and smoke test: `npm run deploy:<app>:staging`.
   - Game: guest login, an arena battle, a story chapter, a PvP queue (WebSocket to `staging-api.`).
   - API: `/api/config` answers, a CORS preflight from `staging-game.` succeeds.
   - Admin: sign in, switch to Staging with the header button (amber bar), load the config.
3. Deploy to production: `npm run deploy:<app>` (the admin has one deploy, no staging copy).
4. Tag the commit: `git tag <app>-vX.Y.Z && git push --tags`.

Never run `wrangler deploy` from the repo root; there is no root config. Use the root npm scripts.
Production deploys of the API apply D1 migrations first; never edit a migration that has run.

## Rules

- **Shared code.** A change to `shared/` that alters battle rules or API shapes ships the API
  and the game together: deploy both (staging, then production) and bump `MIN_CLIENT` in
  `server/wrangler.jsonc` (both the top-level and `env.staging` vars) to the new game
  version. Old game tabs then get 426 and a "New version available" prompt. Deploy the API
  first only if the new game still works against the old API; otherwise deploy the game
  first and raise `MIN_CLIENT` with the API right after.
- **Raising `MIN_CLIENT`** forces every older client to update, including ones in a battle on
  their next request. Do it only when the old client would break or cheat.
- **Art goes to R2 before the code that needs it** (`node scripts/upload-art.mjs`).
- **Config changes** (balance, offers) are not releases: edit them in the admin panel. To
  promote tested staging balance, use **Versions, Copy config to Production** in the admin
  while viewing Staging.
- **Website** data tables come from `shared/`: run `node website/scripts/export-data.mjs`
  and release the website after a balance or unit change.
- Balance hotfixes still need a `HOTFIXES` entry (see `docs/features/`).

## Rolling back

Redeploy the previous tag: `git checkout <app>-vX.Y.Z`, then the same deploy script. API
data changes aren't undone by a code rollback; D1 Time Travel is in [DEPLOY.md](DEPLOY.md).
