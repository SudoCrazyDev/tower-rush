# Game changelog

Releases up to 2.3.0 are documented per release in `docs/features/` (see `docs/features/ROADMAP.md`); tags `v1.1.0` to `v2.2.0` stay as game history. From here, tags are `game-vX.Y.Z`.

## 2.4.1
- Hotfix: in The Throne of Dust (Book 2 Story 3, chapter 3) any unit can be dragged onto an empty tile, so you can reach the braziers. Driven by a new chapter flag, `ChapterMechanics.freeMove`; `ADDED_MECHANICS` copies it into saved configs, which would otherwise hide it. Only the game changed; the API did not, and `MIN_CLIENT` stays 2.4.0.
- Hotfix: in The Iron Oath (Book 2 Story 4, chapter 1) families no longer die at the start of the road. Hunters dive only on a family ahead of them, within 15% of the path (it was 30% in either direction), and only 6 s after spawning (it was 3 s). Ships with API 1.1.1, which resets the saved chapter.
- Fix: the Walking Forge part bars (The Iron Oath, chapter 2) can now be tapped on desktop. In the wide layout their tap targets had been offset by the camera scroll.
- Balance: the Walking Forge's iron minions (The Iron Oath, chapter 2) have a tenth of their old HP. A new wave option, `StoryWave.minionHp: 0.1`, brings the soldier from about 1188 to 119 HP; the Forge keeps 243,000.
- Balance: breaking the Walking Forge's legs now stops it dead, where before it only slowed. In return its furnace spawns iron soldiers twice as often, every 3.5 s instead of 7 s. New `BossPart.haste`; Brakka's lines updated to match.
- Balance: the Walking Forge's parts are rebalanced. The legs drop from 109,350 to 60,750 HP (0.45 to 0.25 of the core), the cannons rise from 97,200 to 121,500 (0.4 to 0.5) and the furnace from 97,200 to 170,100 (0.4 to 0.7), so it keeps spawning longer. The core keeps 243,000.
- Balance: the Walking Forge walks slower, at speed 8 instead of 12.
- Balance: once its legs break, the Walking Forge's furnace spawns every 2 s (it was every 3.5 s), so a stuck Forge can't simply be waited out.
- Balance: the Walking Forge's broken legs regrow. Over 30 s they fill back to 0.6 of their last max HP, then it walks on and the furnace cools back. New `BossPart.repair`. The cannons drop to 0.35 of the core (85,050 HP) and the furnace to 0.5 (121,500).

## 2.4.0
- Book 2 Story 5, "The Silver Tribunal": pleas and laws, the confiscated deck and cells, chains, the Great Scale, the collapsing city, Argent. New card Argent, the Merciful and badge Unbroken. See docs/features/v2.4-the-silver-tribunal.
- New battle rules live in `shared/`, so the API ships with it and `MIN_CLIENT` is 2.4.0.

## 2.3.0
- Hosted as its own static Worker on game.crownnkeep.com; talks to the API at api.crownnkeep.com.
- Sends `X-Client-Version` (WebSockets: `v=`). When the API answers 426, or `/api/config` reports a `minClient` above this version, shows a "New version available" prompt with an Update button.
