# 2.9.4: Five new units and the Echo Spirit rework

Patch release. Game 2.9.4 and API 1.6.2, on staging since 2026-10-21; not on prod yet.
Before prod, raise `MIN_CLIENT` to 2.9.4: the battle Sim changed (Echo Spirit, the new Mythics). An older client would
replay PvP and lab boards differently.

## 1. Two new Mythics (gift units)

Every player owns both, given at **card level 1**. Neither drops from chests (`GIFT_UNITS` in `shared/units.ts`).
`giveGiftUnits()` adds them on profile load for players who joined before them. It only raises a level, never lowers one.
Accounts on staging that got them at level 3 (the first gift level) keep level 3.

### Heart Surgeon (arcane, heavy, True Strike)

- **Attack:** sword slash at the leading monster.
- **Room:** keeps a 90 px Room on the path (between 5% and 40% of it). Monsters inside take 100% of her hit per second,
  +5% per monster that ever died in the Room (anyone's kill). Tuned in `REWORKS.heart_surgeon.room`.
- **Awakened, Surgeon of Death (always on):** there can only be one. Every other Heart Surgeon on the board, and every
  new one, merges into her with its Room kills. She opens 4 Rooms that share one kill count. **Scalpel:** a boss
  entering a Room takes her hit × Surgeons merged × Room kills, through its shield (once per Room).

### Dark Spawn (arcane, balanced, True Strike)

Id `murcielago`; the ultimate id stays `resurreccion`.

- **Attack:** green cero at the leading monster.
- **Dark Rebirth:** each attack has a **0.4%** chance to awaken him at once, at max rank (`REWORKS.murcielago`). It was
  1.08% on staging before this release.
- **Awakened, he rolls one of three forms:**
  - **Dark Zero:** every attack is a beam through the whole line, for his hit × seconds since summoned.
  - **Dark Javelin:** 45% per attack, a lance for his hit × seconds × his kills (18% of those: 3-5 lances in a row).
  - **True Despair:** ×6N damage and ×(4+N) speed (N = Dark Spawns on the board). Awakened Dark Spawns get ×1.2
    damage and ×1.4 speed per Despair. Other neighbours deal ÷1.7 damage and attack ÷1.2 as fast. True Despair
    has its own art.
- **Live numbers in battle:** under the form's name over his head, Dark Zero shows the seconds since he was summoned,
  Dark Javelin shows the seconds and his kills, and True Despair shows his current damage and speed multipliers
  (`Sim.despair()`, public now). The card text gives an example of each formula (a 60s-old Dark Zero hits ×60; two
  Dark Spawns make True Despair ×12 damage and ×6 speed).

## 1b. Three new Legendaries

They drop from Legendary chests like any other Legendary, and none of them awakens (`NO_AWAKEN`). They are in
`ADDED_UNITS`, so saved configs get them with the default numbers. Numbers live in `REWORKS` (`shared/reworks.ts`).

### Windrunner (Sylvan, Nature, rapid archer)

- **Attack:** arrow at the leading monster, Rapid style (faster attacks, smaller hits).
- **Nature's Gaze:** each hit has an 85% chance to root the target for 5s (bosses 1s). A rooted monster doesn't move
  (`SimMonster.rootedUntil`). Re-rooting only extends the time.
- **Spread:** a monster that dies rooted roots every monster within 150px for 2s (bosses 1s). Those can pass it on again.
- Rooted monsters show the `status_rooted` overlay and a green tint; a fresh root plays `root_grasp` and "ROOTED".

### Cursed Totem (Undead, Arcane, support)

- **Never attacks** (in `BETA_SUPPORT`, so it gives no generic buff either).
- **Death Mark:** hits by adjacent units may execute a monster, never a boss: 1.4% at rank 1, +0.4% per rank above 1
  (3.0% at rank 5), +0.05% per card level above 1 (`totemChance()`). Several Totems don't stack: the best one counts.
  The chance is only rolled next to a Totem, so other boards replay exactly as before.

### Sea Serpent (teaser)

- A plain Legendary attacker: DMG 97, one attack every 0.8s (heavy style, water projectile). No ability.
- Its card is a teaser (`TEASER_UNITS` in `shared/units.ts`): race, element, style, attack, damage, speed and the STATS
  tab read ???, the element badge is a "?" and the race crest is hidden. Under the hood it is Dragon / Ice; the
  website wiki still lists those.
- The art is original: an armoured tide warrior with a serpent-head pauldron.

Smoke test: `node scripts/smoke-legendaries.ts`.

## 2. Echo Spirit rework

Before, Echo Spirit repeated its neighbours' ultimates. Now it **becomes a copy of a unit**:

- It copies a random adjacent unit, or any unit on the board if none is adjacent. It never copies another Echo Spirit.
  Alone (or only next to Echo Spirits), it waits.
- The copy is exact: the unit, its rank and its awakening, with 100% of its stats.
- After every boss wave each copy re-rolls (a new random neighbour).
- A copy keeps its own Echo rank (`SimUnit.echoRank`). It merges only with other Echo Spirits of that rank, whatever
  they copied, and becomes an Echo Spirit one rank up. It never merges with the real unit it copied.
- Copies show a pale ice tint and Echo pips.
- `DEFAULT_EFFECTS.echo` is unused now. It is kept so saved configs still load.
- Smoke test: `node scripts/smoke-echo.ts`.

## 3. Original art

The first art for the two Mythics looked too much like existing anime characters. All of it is replaced:

| Unit | Base | Awakened |
|---|---|---|
| Heart Surgeon | silver-haired woman with round spectacles and a brass head-mirror | Surgeon of Death: dark teal robe, spectral heart, teal flame aura |
| Dark Spawn | purple hooded imp with green fel runes | Dark Rebirth: gold-armoured horned demon with a fel javelin. True Despair: three-eyed, four-winged shadow demon with a void orb |

- New stills, card portraits and idle, attack (and Heart Surgeon's skill) sheets are on R2.
- True Despair has its own card portrait, `portraits_awakened/murcielago_despair`.
- Art replaced under the same key loads with `?v=2.10.0` (`REFRESHED` in `game/src/assets.ts`). Sheets bust the
  cache by content hash.
- The old art is kept in `assets/_old_v210_lookalike/`.
- New key mode `magdist` (distance to magenta) in `assets/keyimg.py` and `assets/tospritesheet.py`. The plain magenta
  key turned purple skin green. `magdist+` also flood-clears a backdrop that drifts during the clip.

## 4. Card dialog fixes

- **Awakened card back:** the ultimate description scrolls inside its box (drag or mouse wheel). Long texts no longer
  run out of the dialog. It applies to every awakened unit.
- **Dark Spawn's card back** lists each form (Dark Zero, Dark Javelin, True Despair) with its art and its own text
  (`murcText()` in `shared/awakened.ts`).
- **DETAILS tab:** Heart Surgeon's and Dark Spawn's rows overlapped the blurb and the damage/speed row. Their lines are
  shorter now, and the awakened line points to the card back. A card whose rows still don't fit drops its blurb.

## 5. Renames

- Murciélago is shown as **Dark Spawn**.
- Resurrección is now **Dark Rebirth**.
- Lanza del Relámpago is now **Dark Javelin**.
- Ids are unchanged (`murcielago`, `resurreccion`, `lanza`).

## 6. Config hotfix `2.9.4-units`

A saved config keeps its own unit fields. The hotfix copies these fields from the defaults once:

- `murcielago.name` (Dark Spawn)
- `echo_spirit.blurb` ("Wears the face of whoever stands beside it.")
- `heart_surgeon.blurb` ("Every room is her operating table.")

## 7. Files

- `shared/sim.ts`: Echo copy (`echoCopy`, `echoRank`, `mergeId` / `mergeRank` / `mergeable`), boss-wave re-roll.
  Room, Scalpel, Dark Rebirth and `despair()`.
- `shared/units.ts`: the two Mythics, `GIFT_UNITS` (level 1), the three Legendaries, `TEASER_UNITS`.
- `shared/sim.ts`: Windrunner's root (`gaze`, `rootSpread`) and the Cursed Totem's execute (`totemChance`).
- `shared/awakened.ts`: `surgeon_of_death`, `resurreccion`, `MURC_NAMES`, `murcText()`.
- `shared/reworks.ts`: Room and Dark Rebirth numbers and card lines.
- `shared/config.ts`: hotfix `2.9.4-units`.
- `server/src/users.ts`: `giveGiftUnits()` on profile load.
- `game/src/scenes/DeckScene.ts`: scrolling ultimate box, Dark Spawn forms, DETAILS overflow fix.
- `game/src/battle/Unit.ts`, `ultFx.ts`, `vfx.ts`: Echo tint and pips, Surgeon and Dark Spawn effects, True Despair art.
- `game/src/assets.ts`: `REFRESHED` entries for the replaced art.
