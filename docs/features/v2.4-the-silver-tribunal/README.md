# v2.4.0 "The Silver Tribunal"

**Status:** Built on branch `v2.4-silver-tribunal`, not deployed · **Version:** `2.4.0` (API `1.1.0`, `MIN_CLIENT` `2.4.0`) · **Promo kit:** [PROMO.md](PROMO.md) ·
**Story pitch:** [saga plan](../concepts/forsakens-saga.md) (section 5) · **Art prompts:** [ART_PROMPTS.md](ART_PROMPTS.md) (written by the art agent)

Book 2 Story 5, the Book 2 finale. Aurelion is a floating city of clockwork law: a vanished artificer
people built brass judges, they have ruled a thousand years, and the judge is incorruptible, which is
exactly what the chaos used. **No angels or divine beings anywhere** (reserved for a later series).

## 1. What ships
- **Book 2 Story 5: The Silver Tribunal** (4 chapters, 19 panels). Unlocks after Story 4 (`oathkeeper`). No trophy gate.
- **Mechanics:** pleas and laws with witnesses, a confiscated deck with cells, chains, the Great Scale's pans, a collapsing city, Argent's sentence and silver light.
- **Card:** Argent, the Merciful (Event card, role Justiciar). Replays of any chapter can drop Argent copies (`replayCards`).
- **Badge:** `unbroken` (finished Book 2). **Chest:** mythic, from the last chapter.
- **Open:** a card back showing the broken scales (`ui/cardback_broken_scales`, art exists): the game has no card-back system, so it is not wired.

## 2. Chapters (`b2s5`)
| # | Id | Chapter | Layout | Format | Notes |
|---|---|---|---|---|---|
| 1 | `b2s5c1` | The Trial | `sky_temple` | 8 counts, your own deck | Plea before each count. Counts 1-2 Elven Wilds, 3-4 Drowned Coast, 5-6 Sunspire, 7-8 Emberhold; count 8 brings the Prosecutor. |
| 2 | `b2s5c2` | Cells of Aurelion | `clockwork_city` | 12 waves, boss the Bailiff, your own deck (only the first card is in hand) | Break cells to get the other four cards back. |
| 3 | `b2s5c3` | The Great Scale | `candy_land` | 12 waves, no boss, your own deck | Build evenly on the left and right pans. Last wave: "Neither guiltless nor guilty. Human." |
| 4 | `b2s5c4` | Verdict | `sky_temple` | 20 waves + Argent, Event deck (pick 5 of 7 Book 2 cards, level 9) | Collapsing board, Vaeltharion's dust at wave 11, rally of every Book 2 ally, Argent. |

Rewards: Ch 1 2600 gold, 55 gems. Ch 2 3200 gold, 65 gems. Ch 3 3600 gold, 70 gems. Ch 4 200 gems, mythic chest, Argent, badge. Replays 450 / 550 / 650 / 800 gold.

## 3. Mechanics (numbers in `shared/tribunal.ts` and the chapter data; tune with `node scripts/story-sim.ts`)
| Mechanic | Rule | Numbers |
|---|---|---|
| **Pleas** (Ch 1) | `StoryWave.charge` (land, title, text, witness, law) and `mechanics.trial`. Before each count the Sim raises a `plea` event and holds until `Sim.plead(guilty)`. **Guilty:** the count's monsters have x`guiltyHp` HP and the land's witness (a story card: Muse, Maren, Bako, Brakka) fights beside you until the count ends; it takes a free tile, else the weakest unit's tile (that unit returns after). **Not guilty:** the charge's law is declared. The bell rings `prep` seconds after the plea. A count ends when every monster is gone (no 20 s skip here). | guiltyHp 1.2, witness rank 5 at level 8, prep 8 s. |
| **Laws** | A unit that breaks the law is jailed (no attacks, grey, bars) until the count ends. `no_fire`: fire-element units. `only_four`: all but the four highest-ranked fighters. `no_merge` / `no_summon`: a unit born of a merge / summon after the bell. Support units (no attack) are never jailed. The Prosecutor's skill `decree` and Argent's add a timed law on top. | Decree every 16 s (Prosecutor), 18 s (Argent), lasts 8-9 s. |
| **Mercy** | Argent, and any unit beside a `Justiciar`, is never jailed, chained, crushed or condemned. | |
| **Confiscated deck** (Ch 2) | `mechanics.cells`: only `deck[0]` is in the Sim's deck; the other cards sit in cells at shares of the path (alternating the two routes). A kill within `reach` of a cell wears it down; a broken cell pushes its card into the deck (power-ups work again). The HUD shows locked cards dimmed. | 4 cells at 20/40/60/80% of the path, 4/6/8/10 kills, reach 180 px. |
| **Chains** (Bailiff) | Skill `chain`: chains `n` units (links = `amount`). A chained unit cannot be dragged, merged, copied or swapped. Each of its attacks breaks a link, and so does a tap (`Sim.shake`). | 1-2 units every 11 s, 12 links. |
| **Balance** (Ch 3) | `mechanics.scale`: columns 0-1 are the left pan, 3-4 the right, 2 the pivot. Every `every` s while monsters are alive, if one pan has `gap` more total ranks, 1-3 of its units are stunned (`CRUSHED`). Waves alternate the two routes. | every 6 s, gap 4 ranks, stun 2.2 s. |
| **Collapsing city** (Ch 4) | `mechanics.collapse`: at the start of waves 5, 9, 13, 17 tiles (10,14), (0,4), (5,9), (1,3) fall; 6 s before, the floor trembles and the tiles flash. A unit on a falling tile moves to the nearest free standing tile, else it is returned as mana (40% of summon cost x rank). 7 tiles remain. Wave HP eases off as the city shrinks (`FALLING` in the story data). | |
| **Sentence and silver light** (Argent) | Skill `sentence` adds one every 3 s; at 9 the strongest unit (not under mercy) is condemned and refunded 40%. `BossDef.silver`: she is not corrupted, so the Lance Knight's bane does nothing. | |

## 4. Engine work
| Area | Work |
|---|---|
| `shared/tribunal.ts` (new) | Laws, constants, rule types, `panOf`. |
| `shared/stories.ts` | `StoryWave.charge`, `ChapterMechanics.trial/cells/scale/collapse`, `b2s5` data, badge `unbroken`, witness levels in `chapterDeck`, validation, `ADDED_STORIES`. |
| `shared/monsters.ts` | 5 monsters, 4 bosses (`prosecutor`, `bailiff`, `vaeltharion_dust`, `argent_justiciar`), skills `decree`, `chain`, `sentence`, `BossDef.silver`. |
| `shared/units.ts` | `argent`. |
| `shared/sim.ts` | `plead`, laws and jail, witness, cells, chains and `shake`, scale tick, collapse, sentence. Inert elsewhere (old golden runs unchanged). Events: `plea`, `pleaed`, `law`, `jail`, `unit_gone`, `shackle`, `cell`, `crush`, `collapse`, `sentence`. |
| Game | `battle/tribunalView.ts` (plea screen, law bar, jail and chain markers, cell markers, pan overlay and meter, fallen tiles, sentence meter), `BattleScene` hooks, locked deck cards, chained units can't be dragged, `Unit` jailed look, stand-ins in `assets.ts`, What's new, story card text. |
| Balance | `scripts/story-sim.ts`: `--plea=guilty|not|alt`, `--play` greedy player, tuning env knobs, tallies (crush, cells, condemned, jail). |
| Releases | Game 2.4.0, API 1.1.0 and `MIN_CLIENT` 2.4.0 (shared battle rules and `chapterDeck` changed: see RELEASING.md). |

## 5. Art (ids are the contract)
Arenas: `arena_aurelion_court`, `arena_aurelion_cells`, `arena_great_scale`, `arena_falling_aurelion` (layouts above). Cover `book2_story5_the_silver_tribunal`.
Unit `argent`. Monsters `brass_warden`, `ledger_crossbowman`, `chainbearer`, `quill_drone`, `gavel_golem`. Bosses `prosecutor`, `bailiff`, `vaeltharion_dust` (the golden dust, a boss of its own; art id added to the contract), `argent_justiciar` (+ banners).
Story portraits `argent`, `argent_weeping`, `prosecutor`, `bailiff`, `great_scale`, `vaeltharion_dust`. UI icons `plea_guilty`, `plea_not_guilty`, `law_no_fire`, `law_only_four`, `law_no_merge`, `law_no_summon`, `chain`, `sentence`, `cell_locked`, `cell_broken` (the view draws its own shapes and uses the plea and law icons when present).
Card back `ui/cardback_broken_scales` (not wired).
Panels (19): `b2s5_p1_silver_light`, `p2_aurelion`, `p3_chains_in_court` (intro); `p4_verdict_guilty`, `p5_lockboxes`, `p6_cell_galleries` (Ch 2 intro); `p7_escape_great_scale`, `p8_scale_pans` (Ch 3 intro); `p9_scale_level`, `p10_foundation_cracks`, `p11_sentence_on_the_world` (Ch 4 intro); `p12_golden_dust` (cutscene, wave 11); `p13_gavel_shatters`, `p14_orb_cleansed`, `p15_five_shards`, `p16_two_toned_voice`, `p17_violet_chaos`, `p18_argent_kneels`, `p19_end_of_book_two` (ending; the title card has an empty centre).

## 6. Open
- Card back / frame for the broken scales: no card-back system exists.
- Balance is first-pass (headless numbers below); playtest the plea trade-off, the Bailiff's chains and Argent's sentence.
- Sentence meter and cell markers are drawn in code; the `sentence`, `chain` and `cell_*` icons are not used yet.
