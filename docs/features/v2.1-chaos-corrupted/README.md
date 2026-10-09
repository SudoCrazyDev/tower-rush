# v2.1.0 "Chaos Corrupted"

**Status:** Live (commit `6cec3d3` on `master`, 2026-10-10) · **Version:** `2.1.0` (tag `v2.1.0`) ·
**Promo kit:** [PROMO.md](PROMO.md) · **Script:** [SCRIPT.md](SCRIPT.md) · **Art prompts:** [ART_PROMPTS.md](ART_PROMPTS.md)

Book 2 of the saga "The Forsakens" begins. Story mode now holds several books under one saga
title. Book 1 is "The Chosen". Book 2 is "Chaos Corrupted". Its first story, **"The Elven
Wilds"**, unlocks after the player finishes Book 1.

---

## 1. What shipped

- **Books under a saga.** Story mode shows the saga title "The Forsakens" and a list of books.
  Book 2 stays locked until Book 1 is finished.
- **Story 1: The Elven Wilds**, with 3 chapters, 16 story panels, a full script with wave barks
  and boss reactions from Queen Aelyria.
- **5 new bosses** and **5 new corrupted monsters.**
- **New boss skills:** entangle, impale, sapling trail, arrow volley, block.
- **A scripted mid-battle rally** in the last fight.
- **New badge:** Wilds Warden, for finishing Book 2, Story 1.
- **New art:** see section 4.

## 2. Chapters

| # | Chapter | Waves | Boss | Notes |
|---|---|---|---|---|
| 1 | The Fleeing Grove | 10 | Captain Morvane | Corrupted elves chase the fleeing forest folk. Morvane arrives on wave 10. |
| 2 | Thalmyr, the Torn Guardian | 1 (boss only) | Thalmyr | The half-corrupted forest stag. He entangles up to 3 times and drops corrupted saplings. |
| 3 | Summit of Vaeltharion | 20 | Morvane (wave 6), Sylris (wave 12), Kaelen (wave 18), Vaeltharion (wave 20) | Three captains, then the Elven Commander. Ends the story. |

## 3. New mechanics

| Mechanic | Who uses it | What it does |
|---|---|---|
| **Entangle** | Thalmyr, Vaeltharion | Units are entangled and cannot attack until the wave ends. Thalmyr can do this up to 3 times. A new "entangled" status icon shows it. |
| **Sapling trail** | Thalmyr | Drops corrupted saplings (a new monster) as he moves. |
| **Impale** | Vaeltharion | Every 7s, stuns 1 random unit for 5s. |
| **Arrow volley** | Captain Sylris | Fires volleys of arrows. She also dodges often. |
| **Block** | Captain Kaelen | Dual-blade captain who blocks hits (block 0.35). |
| **Captain minions** | Morvane, Sylris | Summon corrupted elf warriors and archers. |
| **Mid-battle rally** | Vaeltharion, wave 20 | At 80% of the path the game pauses. Queen Aelyria's army charges ("Nature's Attendants, Charge!"), pushes him back to the start of the path and takes 50% of his HP. Two story panels play (the charge, then his rage). When play resumes he is faster but has lost his skills. |

Boss stats (from `shared/monsters.ts`): Morvane hp 1.1, speed 34. Sylris hp 1.2, speed 36.
Kaelen hp 1.3, speed 34, block 0.35. Thalmyr hp 6.0, speed 15. Vaeltharion hp 7.0, speed 22.
Wave-level HP multipliers are set per wave in `shared/stories.ts` (for example, Morvane's second
appearance on wave 6 is 1.3, and Kaelen's wave is 0.45).

## 4. Art

All art is live on R2 at `https://assets.depedtoolkit.com/` and also under `game/public/assets/`.

| Group | Count | Path on R2 |
|---|---|---|
| Corrupted monsters (scout, warrior, archer, warden, sapling) | 5 | monsters |
| Bosses (Morvane, Sylris, Kaelen, Thalmyr, Vaeltharion) | 5 | `bosses/` |
| Ally sprites (elf spearman, gnome, fae, earth elemental, forest beast) | 5 | allies |
| Portraits (Queen Aelyria, Thalmyr torn, Thalmyr cleansed, Vaeltharion, Morvane, Sylris, Kaelen, forest villager) | 8 | `story/portraits/` |
| Arenas (Elven Deepwood, Guardian Grove, Rocky Summit) | 3 | `locations/arena_*.webp` |
| Story panels `b2s1_p1_restored` to `b2s1_p16_beyond` | 16 | `story/panels/` |
| Covers (The Elven Wilds, Book 2 Chaos Corrupted) | 2 | `story/covers/` |
| Entangled status icon | 1 | UI |

## 5. Files touched (high level)

- `shared/stories.ts`: saga and books, Book 2 data, Story 1 chapters, waves and barks, the
  Wilds Warden badge.
- `shared/monsters.ts`: 5 corrupted monsters and 5 bosses with their skills.
- Shared sim and battle scene: entangle, impale, sapling trail, arrow volley, block and the
  scripted rally.
- Story UI: book and saga list, locked-book state, panel and portrait handling.
- Assets and build: new art entries, plus the docs in this folder and the roadmap entry.

## 6. Known follow-ups

- **Balance:** the Summit chapter may be too hard. Simulation gave 0% clears with a mid deck and
  45% with a strong deck. Plan a balance pass after player QA.
- **Boss banners:** banners for the 5 new bosses are not made yet.
- **Animation:** monster and boss animations are still-based (bob and topple). Real animation
  clips come later.
- **Next:** more stories in Book 2 and later books (not designed yet).
