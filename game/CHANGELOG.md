# Game changelog

Releases up to 2.3.0 are documented per release in `docs/features/` (see `docs/features/ROADMAP.md`); tags `v1.1.0` to `v2.2.0` stay as game history. From here, tags are `game-vX.Y.Z`.

## 2.4.0
- Book 2 Story 5, "The Silver Tribunal": pleas and laws, the confiscated deck and cells, chains, the Great Scale, the collapsing city, Argent. New card Argent, the Merciful and badge Unbroken. See docs/features/v2.4-the-silver-tribunal.
- New battle rules live in `shared/`, so the API ships with it and `MIN_CLIENT` is 2.4.0.

## 2.3.0
- Hosted as its own static Worker on game.crownnkeep.com; talks to the API at api.crownnkeep.com.
- Sends `X-Client-Version` (WebSockets: `v=`). When the API answers 426, or `/api/config` reports a `minClient` above this version, shows a "New version available" prompt with an Update button.
