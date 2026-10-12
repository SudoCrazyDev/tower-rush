# Game changelog

Releases up to 2.3.0 are documented per release in `docs/features/` (see `docs/features/ROADMAP.md`); tags `v1.1.0` to `v2.2.0` stay as game history. From here, tags are `game-vX.Y.Z`.

## 2.4.1
- Hotfix: in The Throne of Dust (Book 2 Story 3, chapter 3) any unit can be dragged onto an empty tile, so you can reach the braziers. Driven by a new chapter flag, `ChapterMechanics.freeMove`; `ADDED_MECHANICS` copies it into saved configs, which would otherwise hide it. Only the game changed; the API did not, and `MIN_CLIENT` stays 2.4.0.
- Hotfix: in The Iron Oath (Book 2 Story 4, chapter 1) families no longer die at the start of the road. Hunters dive only on a family ahead of them, within 15% of the path (it was 30% in either direction), and only 6 s after spawning (it was 3 s). Ships with API 1.1.1, which resets the saved chapter.
- Fix: the Walking Forge part bars (The Iron Oath, chapter 2) can now be tapped on desktop. In the wide layout their tap targets had been offset by the camera scroll.

## 2.4.0
- Book 2 Story 5, "The Silver Tribunal": pleas and laws, the confiscated deck and cells, chains, the Great Scale, the collapsing city, Argent. New card Argent, the Merciful and badge Unbroken. See docs/features/v2.4-the-silver-tribunal.
- New battle rules live in `shared/`, so the API ships with it and `MIN_CLIENT` is 2.4.0.

## 2.3.0
- Hosted as its own static Worker on game.crownnkeep.com; talks to the API at api.crownnkeep.com.
- Sends `X-Client-Version` (WebSockets: `v=`). When the API answers 426, or `/api/config` reports a `minClient` above this version, shows a "New version available" prompt with an Update button.
