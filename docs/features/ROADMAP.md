# Tower Rush feature roadmap

The release timeline: what shipped, when, and what's next. Each feature release has a design doc
and promo kit (see [README.md](README.md) for the conventions); the smaller quality-of-life (QoL)
changes between releases are listed with them. For the longer backlog of ideas, see the root
[ROADMAP.md](../../ROADMAP.md).

```
 v1.0.0            v1.1.0                   QoL          v1.2.0           next
 Launch build ───► Supporting Cast ───────► polish ────► Stories ───────► balance, then
 Oct 3–5           Arrival, Oct 6           Oct 6        Oct 6            Books 2–4 (TBD)
```

| Version | Title | Shipped | Git | Design doc |
|---|---|---|---|---|
| v1.0.0 | Launch build | 2026-10-03 → 05 | (untagged) | — |
| v1.1.0 | **Supporting Cast Arrival** | 2026-10-06 | tag `v1.1.0` (`e1d0153`) | [v1.1](v1.1-supporting-cast-arrival/README.md) |
| — | QoL between v1.1 and v1.2 | 2026-10-06 | (untagged) | — |
| v1.2.0 | **Stories** | 2026-10-06 | tag `v1.2.0` | [v1.2](v1.2-stories/README.md) |
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

## Next

- **v1.2.x balance pass:** run the simulator over the story chapters (wave HP is first-guess),
  add the "win a story chapter" quest to the live config, and teach the PvP bot where to place
  Muse and the Rogue Knight.
- **Books 2–4:** more of Story mode (not designed yet).
- Ideas waiting for a release are in the root [ROADMAP.md](../../ROADMAP.md).
