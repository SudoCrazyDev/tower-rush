# API changelog

## 1.2.0
- Player email via Cloudflare Email Service (`send_email` binding `EMAIL`, from `noreply@crownnkeep.com`). Branded HTML + text messages in `src/email.ts`; the logo is `email/logo.png` on R2.
- Migration `0007_email.sql`: `users.email` (unique, case-insensitive), `email_verified_at`, `marketing_opt_in`; table `email_codes` (one hashed 6-digit code per player and purpose, 15 minutes, 5 tries, one send a minute).
- `POST /auth/register` requires `email` (accepts `marketing`); mails a confirmation code. `POST /auth/login` accepts an email as the username.
- New: `POST /auth/forgot` (same answer whether or not the email has an account), `POST /auth/reset` (code + new password; signs out every session, confirms the email, signs in).
- New: `PUT /me/email` (needs the password), `POST /me/email/resend`, `POST /me/email/verify`, `PUT /me/marketing`, `POST /me/password` (signs out other sessions).
- Turnstile: login, register and forgot require a `turnstile` token, redeemed at siteverify with action and hostname checks (`src/turnstile.ts`). Vars `TURNSTILE_SITEKEY`, `TURNSTILE_HOSTNAMES`; secret `TURNSTILE_SECRET`. `/config` sends `turnstileSiteKey`.
- `/me` and auth answers include `email`, `emailVerified`, `marketingOptIn` (only for the player themselves).
- Admin: user detail shows the email; `PATCH /admin/users/:id` can set or clear `email`; the user search matches emails.
- `MIN_CLIENT` raised to 2.5.0: older clients don't send the Turnstile token.

## 1.1.2
- Fix: config validation no longer rejects `b2s5c3` (The Great Scale) with "the last wave needs a boss". The chapter has no boss by design; new chapter flag `ChapterMechanics.noBoss`, backfilled into saved configs through `ADDED_MECHANICS`. Admin saves of the config work again. `MIN_CLIENT` stays 2.4.0.

## 1.1.1
- Hotfix `2.4.1`: `HOTFIXES` can now reset chapter mechanics in a saved config. It resets `b2s4c1` evacuation, so the first whelp dive moves from 3 s to 6 s after spawning (The Iron Oath, chapter 1). `MIN_CLIENT` stays 2.4.0.
- Hotfix `2.4.1-forge`: resets the waves of `b2s4c2` in a saved config, so the Walking Forge's minions get `minionHp: 0.1`. It also resets the `walking_forge` boss parts (broken legs stop it and double the furnace) and the chapter's `forge` lines. `HOTFIXES` can now reset boss fields too.
- Hotfix `2.4.1-forge-parts`: resets the `walking_forge` boss parts again for the new part HP (legs 0.25, cannons 0.5, furnace 0.7 of the core). A separate id, because staging had already applied `2.4.1-forge`.
- Hotfix `2.4.1-forge-speed`: resets the `walking_forge` speed in a saved config (12 to 8).
- Hotfix `2.4.1-forge-haste`: resets the `walking_forge` boss parts so broken legs speed the furnace up 3.5x instead of 2x.
- Hotfix `2.4.1-forge-repair`: resets the `walking_forge` boss parts (legs regrow, lower cannon and furnace HP) and the `b2s4c2` forge lines.
- Hotfix `2.4.1-forge-repair-55`: resets the `walking_forge` boss parts again, so the legs take 55 s to regrow instead of 30 s.
- Hotfix `2.4.1-colossus`: resets the `chaos_colossus` skills in a saved config, so each iron monster it absorbs adds 5% HP instead of 4%.

## 1.1.0
- Shared battle rules and story data for Book 2 Story 5 (the Silver Tribunal): `chapterDeck` gives trial witnesses their level, the story config validates the new chapter mechanics, new unit and monsters.
- `MIN_CLIENT` raised to 2.4.0: older clients don't know the new rules.

## 1.0.0
- First versioned release as its own Worker (api.crownnkeep.com), split from the game and admin hosting.
- CORS and WebSocket Origin checks from `ALLOWED_ORIGINS`.
- Client version gate: `MIN_CLIENT`; an older or missing `X-Client-Version` gets 426 (admin routes exempt). `/api/config` returns `minClient`.
- Non-API requests redirect (301) to `GAME_URL`.
- Staging environment with its own D1 database.
