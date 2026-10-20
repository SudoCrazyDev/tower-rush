# 2.9.3: Offline Arena and the Debug mode setting

Patch release, game only. Not deployed yet (not on staging or prod).
No API change; `MIN_CLIENT` unchanged.

## 1. Offline Arena

Before 2.9.3 the game couldn't be played without a connection. Boot stopped at "Can't reach the server" with only RETRY.

Now a player who has signed in on this device before can play **Arena runs as practice** while offline:

1. Boot can't reach the server. Under RETRY, the blocker shows **Play offline (practice Arena)**.
2. The game loads the config, account, profile and asset index it last saw online.
3. The lobby opens on the arena picker. Only Arena is offered.
4. BATTLE runs a normal solo arena battle on the device.
5. The result screen shows the wave and stats with "Offline practice: not saved, no rewards".
6. **GO ONLINE** in the lobby reloads the page and boots online.

### Rules

- **Practice only.** Offline runs give no gold, gems, trophies, quest progress or best-wave records. Rewards stay server-authoritative, so offline play can't be used to cheat (the game is not pay-to-win).
- The offline link only shows when the device has a token and a full saved copy (config, account, profile, index).
- Offline, the lobby hides the other modes (Stories, PvP, Lab), DECK, SHOP, the daily, quests, ranks and mail tiles, the profile/avatar button, event and install strips, popups and the What's new book.
- The arena card says "Offline practice: no trophies or gold" instead of the trophy rule.
- Battles skip the play-slot claim (`claimPlay`) and the server run (`startBattle` / `finishBattle`).

### The saved copy

`game/src/offline.ts` keeps one localStorage key per part, so saving the small profile doesn't rewrite the big ones:

| Key | Saved when | Size (dev account) |
|---|---|---|
| `tower-rush-offline-config` | `loadConfig()` | ~140 KB |
| `tower-rush-offline-index` | Boot loads `index.json` | ~100 KB |
| `tower-rush-offline-account` | `loadMe()` | ~0.1 KB |
| `tower-rush-offline-profile` | every `setProfile()` (each server reply) | ~1 KB |

- Nothing is saved while offline, so practice never overwrites real progress.
- Signing out (`signOut`) clears all four keys.

### Limits

- **Art:** the service worker only has art the player loaded online before (stale-while-revalidate in `ck-art`). Arenas or units never seen online may show blank art offline.
- **Tutorial:** if the battle tutorial isn't done yet, it can't be saved offline (`/me/tutorial` fails quietly), so it plays again in each offline session.
- Not yet tested on a real phone in airplane mode with the installed app. Tested in the dev build by making every `/api` and `index.json` request fail.

## 2. Debug mode setting

Settings has a **DEBUG: ON/OFF** button at the bottom. It turns the `?fps` tester overlay (2.9.2) on and off.

- Same switch as `?fps` / `?fps=0`: both write localStorage `tower-rush:fps`.
- It takes effect at once: ON mounts the overlay if needed, OFF hides it (and stops its text refresh).
- Off by default. It only shows for testers who used `?fps` or turned it on.
- Battles are unchanged: the path overlay is still the D key only.

## 3. Files

- `game/src/offline.ts` (new): `offline` flag, saved copy read/save/clear, `canPlayOffline()`.
- `game/src/save.ts`: saves the copy from `loadConfig`, `loadMe` and `setProfile`; `loadOffline()`; `signOut` clears it.
- `game/src/authOverlay.ts`: `showBlocker(..., alt)` second (link) button.
- `game/src/scenes/BootScene.ts`: index fallback, the Play offline link.
- `game/src/scenes/LobbyScene.ts`: Arena-only offline lobby, `offlineBar` (GO ONLINE), Debug mode button in Settings (modal 780 to 900 tall).
- `game/src/scenes/BattleScene.ts`: no server run offline, offline result text.
- `game/src/fpsMeter.ts`: `debugMode()`, `setDebugMode()`.
- `game/src/main.ts`: overlay starts from `debugMode()`.
