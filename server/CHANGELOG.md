# API changelog

## 1.1.0
- Shared battle rules and story data for Book 2 Story 5 (the Silver Tribunal): `chapterDeck` gives trial witnesses their level, the story config validates the new chapter mechanics, new unit and monsters.
- `MIN_CLIENT` raised to 2.4.0: older clients don't know the new rules.

## 1.0.0
- First versioned release as its own Worker (api.crownnkeep.com), split from the game and admin hosting.
- CORS and WebSocket Origin checks from `ALLOWED_ORIGINS`.
- Client version gate: `MIN_CLIENT`; an older or missing `X-Client-Version` gets 426 (admin routes exempt). `/api/config` returns `minClient`.
- Non-API requests redirect (301) to `GAME_URL`.
- Staging environment with its own D1 database.
