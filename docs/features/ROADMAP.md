# Crown & Keep feature roadmap

The release timeline: what shipped, when, and what's next. Each feature release has a design doc
and promo kit (see [README.md](README.md) for the conventions); the smaller quality-of-life (QoL)
changes between releases are listed with them. For the longer backlog of ideas, see the root
[ROADMAP.md](../../ROADMAP.md).

```
 v1.0.0            v1.1.0                   QoL          v1.2.0       v1.2.1          v1.3.0            v2.0.0              next
 Launch build ───► Supporting Cast ───────► polish ────► Stories ───► Knights ──────► Branding ────────► The Grand ────────► balance, then
 Oct 3–5           Arrival, Oct 6           Oct 6        Oct 6        hotfix, Oct 6   Revamp, Oct 6     Revamp (testing)    Books 2–4 (TBD)
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
| v2.0.0 | **The Grand Revamp** | In testing | (not yet tagged) | [v2.0](v2.0-the-grand-revamp/README.md) |
| next | Balance pass, Books 2–4 | — | — | — |

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

## v2.0.0: The Grand Revamp (in testing)

**One unified combat engine, composable units with multiple archetypes and perks, and a visual
refresh.** Solo battles now run on the same engine as PvP. Every unit can be built your way with
multiple archetypes, each with its own numbers, and any number of perks. New art: archetype icons,
perk icons, element emblems, race crests, all VFX groups, and generic and signature weapons with
melee strike effects.
[Design doc](v2.0-the-grand-revamp/README.md) · [Promo kit](v2.0-the-grand-revamp/PROMO.md)

## Next

- **v1.2.x balance pass:** run the simulator over the story chapters (wave HP is first-guess),
  add the "win a story chapter" quest to the live config, and teach the PvP bot where to place
  Muse and the Rogue Knight.
- **Books 2–4:** more of Story mode (not designed yet).
- Ideas waiting for a release are in the root [ROADMAP.md](../../ROADMAP.md).
