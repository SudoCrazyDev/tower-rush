# v2.3.0 "The Iron Oath"

**Status:** Built on branch `v2.3-iron-oath`, not deployed · **Version:** `2.3.0` · **Promo kit:** [PROMO.md](PROMO.md) ·
**Story pitch:** [saga plan](../concepts/forsakens-saga.md) (section 4)

Book 2 Story 4. Three hundred years ago the human crown swore the Iron Oath to defend the dwarves of
Emberhold, then broke it when dragons came. Now the dwarves collect. The Keeper's side is in the wrong,
and the player lives the betrayal first.

## 1. What ships
- **Book 2 Story 4: The Iron Oath** (3 chapters, 17 panels). Unlocks after Story 3 (`dunewarden`). No trophy gate.
- **Mechanics:** evacuation, a boss with parts (the Walking Forge), rune shields, a hero unit, Colossus growth.
- **Cards:** Brakka Emberhold (Event, Oathsmith: an aura like Muse's), Emberhold Gunner and Runecaller (rare story rewards: chests drop them once owned), Durgrim Emberhold (story-only hero, not collectible).
- **Badge:** `oathkeeper`. Replays of any chapter can drop Brakka copies (`replayCards`).

## 2. Chapters (`b2s4`)
| # | Id | Chapter | Layout | Format | Notes |
|---|---|---|---|---|---|
| 1 | `b2s4c1` | Three Hundred Years Ago | `volcano` (sepia tint) | 10 waves, fixed Event deck (Durgrim, Thunder Dwarf, Bear Rider, Emberhold Gunner, Runecaller, level 7, no pick screen) | Win by evacuation. Bosses: Frost Wyrm (4), Fire Dragon (7), Ashmaw (10). |
| 2 | `b2s4c2` | The Walking Forge | `clockwork_city` | One wave, one boss, your own deck | Break parts in the order you choose. Rune shields. |
| 3 | `b2s4c3` | Oathbreakers | `crystal_cave` | 15 waves + Colossus, Event deck (5 of 13, at least 1 Knight and 1 dwarf, level 8), Durgrim on the board | Rune shields. Rally: Emberhold dwarves and Candy Crown knights. |

Rewards: Ch 1 2400 gold, 45 gems, Emberhold Gunner. Ch 2 3000 gold, 60 gems, Runecaller. Ch 3 150 gems, mythic chest, Brakka, badge. Replays 400 / 500 / 600 gold.

## 3. Mechanics (numbers; tune with `node scripts/story-sim.ts`)
| Mechanic | Rule | Numbers |
|---|---|---|
| **Evacuation** (Ch 1) | Monsters use path 0; dwarf families (`dwarf_family`, friendly, untargetable, no damage) use path 1 and cost no lives. Win when every family has walked out or been lost and at least `goal` got out. Lose early when the goal can't be reached. Hunters (whelps and the three dragons) dive on a family ahead of them on the road (within 15% of the path); a dive loses it. A family a hunter has already passed is safe (2.4.1). The two story dragons keep no powers (no freezing units). | 22 families (2 per wave, 4 in wave 10), goal 14, 4 s apart. Whelp first dive 6 s after spawning (2.4.1; was 3 s), then 8 s. Dragon dive every 7 s. |
| **Walking Forge** (Ch 2) | `BossDef.parts`: Legs, Cannons, Furnace, Core (the Anvil-Heart). The player taps a part bar to aim every unit at it (`Sim.focusPart`); with no pick, units hit the first unbroken non-core part. Legs broken: the Forge stops dead and its furnace fires 3.5x as often (`BossPart.haste`). Broken legs regrow (`BossPart.repair`): over 55 s they fill back to 0.6 of their last max, can't be hit meanwhile, then the Forge walks on and the furnace cools back. Cannons broken: no more impale (stun) volleys. Furnace broken: no more iron soldiers. Core takes 30% damage while another part stands (regrown legs count). Core broken: the fight ends and its iron falls. Reaching the path end loses. Brakka barks hints every 28 s, and when parts break. | Part HP (x boss HP, 2.4.1): legs 0.25, cannons 0.35, furnace 0.5, core 1. Speed 8. Furnace every 7 s, 3.5x with the legs down. Iron minions at `minionHp` 0.1 (soldier ~119 HP). Mana 4/s (one long wave). |
| **Rune shields** (Ch 2-3) | An iron monster (`iron_soldier`, `iron_crossbow`, `iron_brute`) walks in with a rune with chance 45%, of an element a unit on the board has. Only units of that element, and the Runecaller (any element), wear the rune down; the monster takes nothing from them meanwhile. Other units deal 20% of their damage. | Rune HP 30% of the monster's HP. |
| **Hero unit** (Ch 3) | `StoryChapter.hero`: Durgrim starts on slot 7 at rank 3, at the Event deck level. He is not in the deck, so never summoned, merged or powered up. His oath kit gets stronger beside Knights. | |
| **Colossus growth** (Ch 3) | Boss skill `absorb`: first use eats every iron monster alive, later ones those within 320 px. Each eaten one adds 5% HP (2.4.1; was 4%) and 1.2% speed (max 24 stacks). The HUD shows IRON xN. The rally (at 55% of the path) shoves it back and costs it 30% HP. | |

## 4. Engine work
| Area | Work |
|---|---|
| `shared/stories.ts` | `ChapterMechanics.evacuation/forge/runes`, `StoryChapter.hero`, `StoryWave.cutscene`, `EventDeck.minRaces`, story data, badge, validation, hero level in `chapterDeck`. |
| `shared/monsters.ts` | 5 monsters, 3 bosses, `BossPart`, `BossDef.parts/coreArmor`, skill kind `absorb`, `BossSkill.part`. |
| `shared/oath.ts` (new), `shared/sim.ts` | State, events (`family`, `dive`, `rune`, `part`, `absorb`), all rules above. Inert in other chapters (old golden runs unchanged). |
| `shared/units.ts` | `brakka`, `durgrim`, `emberhold_gunner`, `runecaller`. |
| Game | `battle/oathView.ts` (evacuation counter, part bars, dives), rune ring in `Monster`, Colossus stack count in the boss bar, wave cutscene, hero sprite load, fixed Event deck skips the pick screen, 4-wide pick grid, What's new, sprite stand-ins (`game/src/assets.ts`). |
| Balance | `scripts/story-sim.ts` prints families saved/lost and Colossus stacks. |

## 5. Art (ids are the contract; the art agent's names win where they differ)
Arenas: `arena_burning_emberhold`, `arena_mountain_pass`, `arena_oath_field`. Cover `book2_story4_the_iron_oath`.
Units `brakka`, `durgrim`, `emberhold_gunner`, `runecaller`. Monsters `drake_whelp`, `dwarf_family`, `iron_soldier`, `iron_crossbow`, `iron_brute`. Bosses `ashmaw`, `walking_forge`, `chaos_colossus` (+ banners).
Story portraits `durgrim`, `durgrim_young`, `brakka`, `anvil_heart`, `candy_knight_captain`. Rune icons `ui/rune_shield_<element>`.
Rally allies (not yet made; the rally falls back to circles): `ally_dwarf_guard`, `ally_dwarf_gunner`, `ally_candy_knight`, `ally_candy_lancer`.

Panels (17): `b2s4_p1_shard_north`, `p2_footprints`, `p3_young_durgrim`, `p4_iron_oath` (intro); `p5_emberhold_burns`, `p6_unanswered_horn`, `p7_walking_forge` (Ch 2 intro); `p8_knights_kneel`, `p9_durgrim_falters` (Ch 3 intro), `p10_colossus_rises` (cutscene before the Colossus wave); `p11_colossus_falls`, `p12_brakka_confronts`, `p13_anvil_heart`, `p14_new_oath`, `p15_durgrim_troubled`, `p16_broken_scales`, `p17_to_be_continued` (ending).

## 6. Open
- The Forge's damage-state stills (`bosses/walking_forge_<part>`) are not used yet.
- Balance is first-pass; playtest the evacuation dives and the Forge part order.
- Stand-ins in `assets.ts` can be dropped once the art is in the pack.
