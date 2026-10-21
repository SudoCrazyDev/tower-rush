# Crown & Keep feature roadmap

The release timeline: what shipped, when, and what's next. Each feature release has a design doc
and promo kit (see [README.md](README.md) for the conventions); the smaller quality-of-life (QoL)
changes between releases are listed with them. For the longer backlog of ideas, see the root
[ROADMAP.md](../../ROADMAP.md).

```
 v1.0.0            v1.1.0                   QoL          v1.2.0       v1.2.1          v1.3.0            v2.0.0
 Launch build ───► Supporting Cast ───────► polish ────► Stories ───► Knights ──────► Branding ────────► The Grand ───┐
 Oct 3–5           Arrival, Oct 6           Oct 6        Oct 6        hotfix, Oct 6   Revamp, Oct 6     Revamp, Oct 9  │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
│ v2.1.0           v2.2.0      v2.3.0       v2.4.0           v2.5.0        v2.6.0        v2.7.0          v2.8.0           v2.9.0          next
└► Chaos ────────► Sand & ───► The Iron ──► The Silver ────► Email + ────► Install ───► The Great ────► Beta ─────────► League ───────► balance, then
   Corrupted,      Sea,        Oath,        Tribunal,        Turnstile,    (PWA),        Awakening,      Berserker,       Revamp,         Book 3
   Oct 10          Oct 11      Oct 11       Oct 12           Oct 13        Oct 13        Oct 14          Oct 17           Oct 17
```

| Version | Title | Shipped | Git | Design doc |
|---|---|---|---|---|
| v1.0.0 | Launch build | 2026-10-03 → 05 | (untagged) | — |
| v1.1.0 | **Supporting Cast Arrival** | 2026-10-06 | tag `v1.1.0` (`e1d0153`) | [v1.1](v1.1-supporting-cast-arrival/README.md) |
| — | QoL between v1.1 and v1.2 | 2026-10-06 | (untagged) | — |
| v1.2.0 | **Stories** | 2026-10-06 | tag `v1.2.0` | [v1.2](v1.2-stories/README.md) |
| v1.2.1 | Knights hotfix | 2026-10-06 | tag `v1.2.1` | [v1.2](v1.2-stories/README.md) (5.4) |
| v1.2.2 | Story card unlocks hotfix | 2026-10-06 | tag `v1.2.2` | [v1.2](v1.2-stories/README.md) (5.7) |
| v1.3.0 | **Branding Revamp** | 2026-10-06 | tag `v1.3.0` | [v1.3](v1.3-branding-revamp/README.md) |
| v1.3.2 | Element emblems hotfix | 2026-10-09 | (art only, on R2) | — |
| v2.0.0 | **The Grand Revamp** | 2026-10-09 | tag `v2.0.0` | [v2.0](v2.0-the-grand-revamp/README.md) |
| v2.1.0 | **Chaos Corrupted** | 2026-10-10 | tag `v2.1.0` | [v2.1](v2.1-chaos-corrupted/README.md) |
| v2.2.0 | **Sand & Sea** | 2026-10-11 | tag `v2.2.0` | [v2.2](v2.2-sand-and-sea/README.md) |
| v2.3.0 | **The Iron Oath** | 2026-10-11 | tag `v2.3.0` / `game-v2.3.0` | [v2.3](v2.3-the-iron-oath/README.md) |
| v2.4.0 | **The Silver Tribunal** (Book 2 finale) | 2026-10-12 | tag `game-v2.4.0` (API `api-v1.1.0`) | [v2.4](v2.4-the-silver-tribunal/README.md) |
| v2.4.1 | Story hotfixes: Throne of Dust free move, Iron Oath families, Walking Forge rework (legs stop it and regrow, faster furnace), Colossus 5% absorb | 2026-10-12 | tag `game-v2.4.1` (API `api-v1.1.1`) | [game CHANGELOG](../../game/CHANGELOG.md) |
| v2.5.0 | Email, password recovery and Turnstile (2.5.1–2.5.3: art for the sign-in panels) | 2026-10-13 | (API `api-v1.2.0`, `MIN_CLIENT` 2.5.0) | [game CHANGELOG](../../game/CHANGELOG.md) |
| v2.6.0 | Installable app (PWA); 2.6.1 Install app buttons; 2.6.2 button shrink fix | 2026-10-13 | tags `game-v2.6.0` to `game-v2.6.2` | [game CHANGELOG](../../game/CHANGELOG.md) |
| v2.7.0 | **The Great Awakening** | 2026-10-14 | tag `game-v2.7.0` (API `api-v1.3.0`) | [v2.7](v2.7-the-great-awakening/README.md) |
| v2.7.1 | Portal under a locked board | 2026-10-14 | tag `game-v2.7.1` | [game CHANGELOG](../../game/CHANGELOG.md) |
| v2.7.2 | Vampire's Kiss pays on hit, Queen's Gambit drains for mana (2.7.3: GROUP: RACE in the deck) | 2026-10-15 | tag `game-v2.7.2` (API `api-v1.3.1`, `MIN_CLIENT` 2.7.2) | [game CHANGELOG](../../game/CHANGELOG.md) |
| v2.8.0 | **Beta Release: Beta Berserker** (QoL 2.8.1 to 2.8.5) | 2026-10-17 | tag `game-v2.8.5` (API `api-v1.4.0`, website `website-v1.4.0`, `MIN_CLIENT` 2.8.0) | [v2.8](v2.8-beta-berserker/README.md) |
| — | Community funding, Wiki, Stories and Support pages | 2026-10-17 | API `api-v1.5.0` / `api-v1.5.1`, admin `admin-v1.4.0`, website `website-v1.5.0` | — |
| v2.8.6 | Unit Lab TEST ★5 in every build | 2026-10-17 | tag `game-v2.8.6` | [game CHANGELOG](../../game/CHANGELOG.md) |
| — | API 1.5.2: CORS allows PATCH (admin player edits) | 2026-10-17 | tag `api-v1.5.2` | — |
| v2.9.0 | **League Revamp**, player profiles, scrolling leagues list | 2026-10-17 | tag `game-v2.9.0` (API `api-v1.6.0`, admin `admin-v1.5.0`, website `website-v1.6.0`, `MIN_CLIENT` 2.9.0) | [v2.9](v2.9-league-revamp/README.md) |
| v2.9.2 | Deck lag fix for low-end phones, `?fps` tester overlay | staging 2026-10-21 (prod pending) | `88cfeeb` | [v2.9.2](v2.9.2-phone-lag/README.md) |
| v2.9.3 | Offline Arena (practice runs), Debug mode setting for the `?fps` overlay | staging 2026-10-21 (prod pending) | `573d97a` | [v2.9.3](v2.9.3-offline-arena/README.md) |
| v2.9.4 | Five new units: Heart Surgeon and Dark Spawn (gift Mythics), Windrunner, Cursed Totem and Sea Serpent (teaser) Legendaries, Echo Spirit rework, original art, card dialog fixes | staging 2026-10-21 (prod pending) | API 1.6.2, `MIN_CLIENT` 2.9.4 on prod | [v2.9.4](v2.9.4-new-mythics/README.md) |
| next | Balance pass, Book 3 | — | — | — |

---

## v1.0.0: Launch build (2026-10-03 → 05)

The game as it first shipped, before numbered feature releases.

- **Core game:** merge tower defense with 60 units, monsters, bosses and 16 arenas; heroes,
  awakened units, phone and widescreen layouts, music and sound.
- **Collection and economy:** Deck and Shop "saloon" redesigns, buying several chests at once,
  races, fighting styles and signature perks, level-up animations, buffed-unit markers and crit
  callouts.
- **Retention:** daily login and quests, leaderboard, trophy leagues with promotion rewards,
  player inbox with gifts, shop offers and limited-time events, best wave per arena.
- **PvP:** Ranked, Mirror and Casual matches with sends, friend challenge codes, VS Bot practice,
  and a ranked rating with tiers separate from trophies.
- **Onboarding:** a tutorial (summon, merge, power up, then a deck tour).
- **Platform:** moved to Cloudflare (Workers API, D1, art on R2), one battle at a time per
  player, the admin panel with analytics and the Playground simulator.

## v1.1.0: Supporting Cast Arrival (2026-10-06)

**8 Rare/Epic support units** that buff, heal and slow instead of attacking, with new art and
clips. Launch gift: Portal Imp and Gnome Brewer.
[Design doc](v1.1-supporting-cast-arrival/README.md) · [Promo kit](v1.1-supporting-cast-arrival/PROMO.md)

## QoL between v1.1 and v1.2 (2026-10-06)

Small patches, not tagged (by the convention they'd be `v1.1.1`):

- A **What's new** icon in the lobby to reopen the release popup.
- **Element badges** on cards instead of coloured dots.
- New art shows up on phones straight away (the asset index is always fetched fresh).

## v1.2.0: Stories (2026-10-06)

**Story mode, Book 1 "The Chosen":** 3 stories of 3 chapters, each chapter a scripted battle
with intro panels and boss fights.

- **Story 1, Saving the Muse:** rewards **Princess Muse**, the first Event card.
- **Story 2, Chaorruption:** an Event deck of Knights and Mercenaries (pick 5, at least 1
  Mercenary), unit statuses (Rally, Irritation, Fatigue, Shellshock), rewards the Pentagonal
  and Rogue Knights.
- **Story 3, The Beginning:** your own deck with rules (both knights, no Legendary/Mythic) and a
  cliffhanger ending.
- 19 new monsters and 8 bosses with new powers (charm, roar, split, layers, portal).
- Admin **Stories** page to edit chapters, waves, barks and rewards.

Shipped with a **lobby redesign**: ARENA and STORIES mode cards (swipe between them, tap to flip
one open), a carousel of books, then a carousel of chapters, all in ornate gold card frames.

[Design doc](v1.2-stories/README.md) · [Promo kit](v1.2-stories/PROMO.md)

## v1.2.1: Knights hotfix (2026-10-06)

A balance patch for the Story 2 Knights and Mercenaries:

| Unit | Change |
|---|---|
| Pentagonal Knight | Rally lasts **4s** (was 2s) |
| Rogue Knight | **Double attack speed** (2.4 → 4.8/s); its own blows crit **95%** of the time for **×3** |
| Lance Knight | Each hit also **chains to up to 5 more monsters** (chain falloff per jump) |
| Oath Knight | **+10% damage** (was +8%) and **+5% attack speed** for each adjacent Knight |
| Lantern Knight | New pulse: **+5 mana every 5s, +3 more per Knight on the field** (on top of its usual mana) |
| Berserker Sellsword | **+15% damage per Mercenary on the field** (itself included) |
| Hired Blade | Damage **46 → 60**, attack speed **×1.25** |

All numbers are editable on the admin Effects and Units pages. Saved live configs pick these up
once on load (`hotfixes` in the config, see `withHotfixes` in shared/config.ts).

## v1.2.2: Story card unlocks hotfix (2026-10-06)

- **Rogue Knight and Pentagonal Knight stay out of chests until unlocked.** Chests only roll a
  story reward card once the player owns it (checked: 20,000 mythic chests on an empty
  collection gave none). A locked story card's details now say **"Unlock it in Story 2:
  Chaorruption"** with a STORIES button that opens that book, instead of "Find this card in
  chests!" and a SHOP button. Princess Muse points to Story 1 the same way.

## v1.3.0: Branding Revamp (2026-10-06)

**Tower Rush is now Crown & Keep: Tower Defense.** "Tower Rush" was already taken. A new logo
in the same style, a new app icon and favicon, share images, and a What's New popup announcing
the name. Same colours, same game; logins, settings and progress carry over.
[Design doc](v1.3-branding-revamp/README.md) · [Promo kit](v1.3-branding-revamp/PROMO.md)

## v1.3.2: Element emblems hotfix (2026-10-09)

- **Element emblems no longer show squashed flat.** The v2.0 emblems (tall 9:16 art) were
  uploaded to R2 under the same `ui/element_<e>.webp` names the live v1.3 game draws at a square
  size. `build_assets.py` now trims each emblem and centres it on a square 128x128 canvas, so
  both v1.3 and v2.0 draw it undistorted. The fire emblem's background, never keyed out, is
  removed too. Art only: no game code or config change, so no `withHotfixes` entry.

## v2.0.0: The Grand Revamp (2026-10-09)

**One unified combat engine, composable units with multiple archetypes and perks, and a visual
refresh.** Solo battles now run on the same engine as PvP. A unit (built in the admin kit editor) can have
multiple archetypes, each with its own numbers, and any number of perks. New art: archetype icons,
perk icons, element emblems, race crests, all VFX groups, and generic and signature weapons with
melee strike effects. Shipped with a UI polish pass: labelled card details, race crest on the
card corner, a framed boss intro card, livelier lobby mode cards and buttons without the gloss
streak.
[Design doc](v2.0-the-grand-revamp/README.md) · [Promo kit](v2.0-the-grand-revamp/PROMO.md)

## v2.1.0: Chaos Corrupted (2026-10-10)

**Book 2 of "The Forsakens" begins.** Story mode now holds several books under the saga title;
Book 2 unlocks after finishing Book 1 ("The Chosen" badge). Story 1 "The Elven Wilds" has 3
chapters: The Fleeing Grove (10 waves, Captain Morvane), Thalmyr, the Torn Guardian (a boss-only
fight with the half-corrupted forest stag) and Summit of Vaeltharion (20 waves, three captains and
the Elven Commander). New boss skills: entangle (units can't attack until the wave ends), impale,
sapling trail, Sylris's arrow volley and Kaelen's block, plus a scripted mid-battle rally where Queen
Aelyria's army charges Vaeltharion. New art: 5 corrupted elf monsters, 5 bosses, 5 ally sprites,
8 portraits, 3 arenas, 16 story panels, 2 covers and the entangled status icon.
[Design doc](v2.1-chaos-corrupted/README.md) · [Promo kit](v2.1-chaos-corrupted/PROMO.md)

## Shipped since v2.1 (short notes)

- **v2.2.0 "Sand & Sea" (live 2026-10-11):** Book 2 Story 2 "The Drowned Coast" and Story 3 "The Throne of
  Dust", pitched in the [saga plan](concepts/forsakens-saga.md). Art budget: about 350 Higgsfield
  credits (about 450 with retries), stills and in-game animation clips included. Promo reuses game
  footage and panel zooms, with no generated trailer video.
- **v2.3.0 "The Iron Oath" (live 2026-10-11):** Book 2 Story 4, see [v2.3](v2.3-the-iron-oath/README.md).
- **v2.4.0 "The Silver Tribunal" (live 2026-10-12, with hotfix 2.4.1):** Book 2 Story 5, the finale, see [v2.4](v2.4-the-silver-tribunal/README.md).
- **v2.7.0 "The Great Awakening" (live 2026-10-14):** every unit with awakened art gets its own awakening and ultimate (commons to legendaries, plus Void Titan and Chrono Mage), max rank 5, card levels add speed, Unit Lab, Mirror Slime / Banner Herald / Mime retired. See [v2.7](v2.7-the-great-awakening/README.md). Supports and the units still without awakened art are next.
- **v2.8.0 "Beta Release: Beta Berserker" (live 2026-10-17, game 2.8.5, API 1.4.0, website 1.4.0):** five Orc units and the Normal element, the Unit Lab for everyone, a lobby mode carousel with PvP in it, Mythic projectiles and a balance pass. Arena music is coded but has no tracks yet. See [v2.8](v2.8-beta-berserker/README.md).
- **v2.8.1 QoL (2026-10-16):** new Slow and Frozen status art, a new Headhunter portrait, and a fix for late-wave lag and phone heat. Shots no longer run a glow shader each, a budget caps hit effects, trails and floating numbers, the War Drums sweep is one ring per board, HP labels redraw at most about 8 times a second, and the game draws at most 60 fps.
- **v2.8.2 (2026-10-16):** 17 particle and weapon sprites (the Normal smoke trail, leaf, rune, snowflake and others, plus axe, double axe, swords) were re-keyed: their old background showed as a square behind them.
- **v2.8.3 (2026-10-16):** Orc ability effects. A Grunt stands in a fire ring that grows with each Berserker tier, and every new multiplier (x2, x4, x7, then each 5 waves past 30) shows a red burst and "BERSERK xN!". A frenzied Headhunter (wave 20+) stands in a lightning ring and calls "FRENZY!", and his focus spears fly red and snap a reticle onto the target. Units sped up by War Drums show the attack-speed ring and badge in drum orange, red at the board-wide stage.
- **v2.8.4 (2026-10-16):** the five Orcs were redrawn as chibi busts (big head, waist-up) like every other unit, with new idle and attack animations. The first full-body art read too small on the board.
- **v2.8.5 (2026-10-16):** the Grunt was redrawn with a rounded silhouette inside the frame (he read as a square tile), and new units now follow a written board-art style guide ([assets/UNIT_ART_STYLE.md](../../assets/UNIT_ART_STYLE.md)).
- **v2.9.0 "League Revamp" (live 2026-10-17; game 2.9.0, API 1.6.0, admin 1.5.0, website 1.6.0):** per-league minimum waves with uncapped gains and real losses, longer gates, Mythic and Immortal leagues, a two-highest-arenas trophy lock, a rage-quit loss and the hidden Secret Society League with an entry fee and monthly dues. See [v2.9](v2.9-league-revamp/README.md).
- **v2.9.2 (staging 2026-10-21, prod pending):** the Deck scrolls smoothly on low-end phones. Additive glows (one per card) ran a tester's phone at 5 fps; they now use normal blending. Also a frame limit of 62 (60 dropped frames on 60 Hz screens), the batched pipeline on phones, a tighter Deck cull and the `?fps` / `&probe=<Scene>` tester overlay. See [v2.9.2](v2.9.2-phone-lag/README.md).
- **v2.9.3 (staging 2026-10-21, prod pending):** Offline Arena. When boot can't reach the server, players who signed in on the device before can run Arena battles as practice (no saves, no rewards) from the last profile saved on the device. Settings also gets a DEBUG switch for the `?fps` overlay. See [v2.9.3](v2.9.3-offline-arena/README.md).
- **v2.9.4 (staging 2026-10-21, prod pending; game 2.9.4, API 1.6.2):** two gift Mythics, Heart Surgeon (Rooms, Surgeon of Death, Scalpel) and Dark Spawn (Dark Rebirth and three awakened forms). Echo Spirit now becomes an exact copy of a neighbour and re-rolls after boss waves. Both Mythics got original art, and the awakened card back scrolls. Three Legendaries join the chests: Windrunner (roots that jump on death), Cursed Totem (neighbours execute) and the teaser Sea Serpent (card shows ???). See [v2.9.4](v2.9.4-new-mythics/README.md).
- **v2.9.0 also shipped player profiles** (tap a leaderboard row or your own avatar: hero and 5 deck units on a stage, stats and badges) and a **scrolling leagues list** with each league's top player.

## Next

- **v1.2.x balance pass:** run the simulator over the story chapters (wave HP is first-guess),
  add the "win a story chapter" quest to the live config, and teach the PvP bot where to place
  Muse and the Rogue Knight.
- **Awakenings for the rest:** supports and the units still without awakened art.
- **Arena music:** the v2.8 music player is coded but has no tracks yet.
- **Later:** Book 3 (pitched in the saga plan; the Book 3 finale reveals the mastermind).
- Ideas waiting for a release are in the root [ROADMAP.md](../../ROADMAP.md).
- Parked for later: [battle recording and replay checks](concepts/battle-recording.md).
