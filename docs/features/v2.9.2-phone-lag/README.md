# 2.9.2: Deck lag on low-end phones

Patch release, game only. On staging since 2026-10-21 (Worker `6c0b2d63`, last commit `88cfeeb`).
Testers confirmed it on 2026-10-21. **Not on prod yet:** ship with `npm run deploy:game` once approved.
No API change; `MIN_CLIENT` unchanged.

## 1. The report

Players on low-end Android phones (Chrome and Brave) said the Battle Deck stuttered when they scrolled.
The other screens felt fine. The reporting tester's phone: Brave on Android, canvas 976x1640, dpr 2.8125.

## 2. What was wrong

| Cause | Effect | Fix |
|---|---|---|
| Additive (`ADD`) glows on the Deck: lantern halos, deck-slot halos, a glow under every owned card, dust particles | **The real culprit.** The tester's phone drew the Deck at 5 fps with them and 45 without. The glow texture is only 256 px, so the cost wasn't fill rate. Most likely the GPU slows down sharply when a frame switches blend modes many times: each card's additive glow sits under normal card art, so the GPU switched blend mode once per card, every frame. | The Deck's glows use normal blending (`saloonAmbience(..., additive = false)`, no `setBlendMode(ADD)` on slot and card glows). On the dark background they look almost the same. The level-up burst stays additive: it only plays for a moment. |
| Frame limit of exactly 60 (`fps.limit`, added in 2.8.1) | Phaser skips a frame whenever the smoothed frame time comes in a hair under 1000/60. 60 Hz phones ran at 30-40 fps with uneven pacing. | `limit: 62`. 60 Hz screens hold 60; 90/120 Hz screens still draw an even 45/60. |
| Phaser's Mobile Pipeline (default on Android/iOS) | Batches one texture at a time: about 550 draw calls a frame on a full Deck, against about 40 batched. It didn't fix the tester's phone on its own, but it is wasted work. | `autoMobilePipeline: false` (`?mobilepipe` turns it back on). |
| Cull margin 600 on the Deck list | Cards far off screen were still drawn. | `ScrollView(..., cullMargin)`; the Deck uses 260. |

The first two fixes (pipeline and cull) changed nothing for testers. Measuring on the phone itself found the real cause.

## 3. Tester tools

Both tools ship in every build and are harmless when off.

- **`?fps`** shows an overlay: fps drawn vs the screen's refresh rate (Hz), frame time, worst frame, hitches, CPU time per frame, draw calls, scene, canvas size, dpr, version, pipeline and GPU. It stays on (the installed app too) until `?fps=0`. A `fps@scroll` line logs fps and list scroll position every 2 s.
- **`?fps&probe=<SceneKey>`** (for example `probe=Deck`) waits 3 s after that screen opens. It then hides one part at a time for 2 s each and lists the fps: base, no list, no mask, no ADD glows, no text, no fullscreen, list only, no card art, mobile pipe, nothing, base again. The tester stays on that screen without touching it for about 40 s, then takes a screenshot when it says `done:`.

How to read it:
- **A line jumps up from base:** that part is the cost.
- **`nothing` also stays low:** the browser or phone is slow, not the game.
- **FPS equals the screen's Hz and both are low:** the GPU is the bottleneck (the browser lowers its refresh rate to match).

The tester's probe before the fix (after it, testers reported the Deck smooth; no second probe numbers recorded):

| Step | fps |
|---|---|
| base | 5 |
| no list | 30 |
| no mask | 5 |
| no ADD glows | 45 |
| no text | 5 |
| no fullscreen | 50 |
| list only | 6 |
| no card art | 5 |
| mobile pipe | 6 |
| nothing | 51 |

Low CPU time (about 3 ms) and few draw calls (about 35) with the screen's Hz also at 6 meant the slowdown was on the GPU side. The probe then pointed straight at the additive glows.

## 4. Lessons

- **Avoid many additive sprites mixed with normal ones on scrolling or busy screens.** Some phone GPUs pay heavily for every blend-mode switch. Group additive sprites together or use normal blending.
- **Measure on the reporting device before fixing.** Desktop and emulated phones didn't reproduce this.
- Shop and Lobby still use additive lantern glows. They are fine for testers (few switches, no per-item glows). If either is reported laggy, run `?fps&probe=Shop` or `?fps&probe=Lobby` first.

## 5. Files

- `game/src/main.ts`: `fps.limit` 62, `autoMobilePipeline`, `?fps` overlay hook.
- `game/src/fpsMeter.ts`: the overlay and probe.
- `game/src/saloon.ts`: `saloonAmbience(..., additive)`, `ScrollView` `cullMargin`.
- `game/src/scenes/DeckScene.ts`: normal-blend glows, cull margin 260.
- `game/CHANGELOG.md`: 2.9.2 entry.
