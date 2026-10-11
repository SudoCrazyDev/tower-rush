# v2.2 "Sand & Sea" - Script

Saga: The Forsakens. Player is unnamed: addressed as "Keeper". Generated from `shared/stories.ts` (the same text); edit the data, then rewrite this file.
Format: panels are `panel("file", "line1", "line2")`. Barks are `say("speaker_id", "text")`.
Panel files are the FINAL art names (see `shared/art-requests.ts`, group `v2.2 Arts Requirements`). Cover and arena art use existing images until the final art exists.
Speaker ids, Story 2: `pearl` (becomes Maren after the reveal), `corvaline`, `grell`, `lusca`, `ondrath_corrupted`, `ondrath_cleansed`, `saltmere_villager`, `queen_aelyria`.
Speaker ids, Story 3: `bako`, `nefrael`, `sefa`, `faceless_herald`, `dune_warden`. Portraits live in `story/portraits/<id>.webp`; a missing portrait just hides the face in the bark.

---

## Story b2s2: "The Drowned Coast"

The sea has stopped moving. Ride the tide, wake the sleeping isle, and reach the lantern at the world's edge.

### Chapter b2s2c1 "The Stranded Harbor" (10 waves, layout pirate_beach)
Mechanics: `{"tide":{"cycle":40,"lowSlots":[4,9],"lowSpeed":0.8,"highSpeed":1.2},"tidePools":{"at":[0.2,0.4,0.6,0.8],"bonus":0.1}}`
**Intro panels**
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s2_p1_shard` | Green light washes the Orb clean. One violet shard escapes. | It streaks west, toward the sea. |
| 2 | `b2s2_p2_queen_sends` | Queen Aelyria: Follow it, Keeper. The western sea has gone still. | No wave has broken there in a year. |
| 3 | `b2s2_p3_drained_bay` | The bay is bare mud. Ships lie beached on the flats. | Merfolk gasp in shrinking pools. |
| 4 | `b2s2_p4_pearl` | A young merfolk scout hauls herself onto the rocks. | Pearl: Help us. The lantern holds the tide still. |

**Wave barks**

| Wave | Speaker | Bark |
|------|---------|------|
| 1 | pearl | The tide swings. The glowing slots flood when it comes in! |
| 2 | pearl | Eels in the shallows. Fast and slippery. |
| 3 | saltmere_villager | The crabs are the size of cartwheels! |
| 4 | pearl | Don't let them drain the pools. We need them. |
| 5 | pearl | Barnacles on their backs. The violet is spreading. |
| 6 | saltmere_villager | Hold the line! Saltmere is right behind you! |
| 7 | pearl | The tide is rising. Mind the marked slots. |
| 8 | pearl | So many. Where is the sea in all of this? |
| 9 | saltmere_villager | A bosun's whistle! Someone is giving orders. |
| 10 (BOSS grell) | grell | No one leaves Saltmere, Keeper. The tide says so. |

Reward: 2200 gold, 45 gems. Replay: 400 gold.

### Chapter b2s2c2 "Ondrath, the Sleeping Isle" (1 wave, layout coral_reef)
**Intro panels**
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s2_p5_ondrath_found` | Ondrath, an island on a turtle's back, lies in the drained bay. | The Tide Orb was torn from his shell. Violet barnacles cover him. |
| 2 | `b2s2_p6_isle_rolls` | He rolls in pain, and the whole island shifts. | Hold your ground, Keeper! |

**Wave barks**

| Wave | Speaker | Bark |
|------|---------|------|
| 1 (BOSS ondrath) | ondrath_corrupted | The tide... stopped. I cannot... breathe. |

Reward: 2700 gold, 55 gems. Replay: 450 gold.

### Chapter b2s2c3 "The Lantern at World's Edge" (20 waves, layout pirate_beach)
Mechanics: `{"tide":{"cycle":30,"lowSlots":[4,9,14,0],"lowSpeed":0.8,"highSpeed":1.2}}`
**Intro panels**
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s2_p7_ondrath_cleansed` | The barnacles crack. Ondrath breathes, but the Orb is gone. | Ondrath: She did not steal it from greed. She stole it from grief. |
| 2 | `b2s2_p8_causeway` | A causeway runs to the lighthouse at the world's edge. | Its beam sweeps the sea, and what it touches turns violet. |
| 3 | `b2s2_p9_corvaline` | Corvaline has kept this light for forty years. | Hold the tide, and the sea takes no one ever again. |

**Wave barks**

| Wave | Speaker | Bark |
|------|---------|------|
| 1 | corvaline | Go home, Keeper. The sea is better still. |
| 2 | pearl | The tide is quicker here. Watch the water. |
| 4 | corvaline | Forty years I have kept watch. Forty years! |
| 5 | pearl | Every wave she holds back is one I miss. |
| 6 (BOSS grell) | grell | Back again, Keeper? The anchor remembers you. |
| 8 | saltmere_villager | Is that singing? It sounds so sweet... |
| 10 | pearl | Cover your ears? The song gets in anyway. |
| 12 (BOSS lusca) | lusca | Sleep, little Keeper. The tide will rock you. |
| 13 | pearl | Tap your sleepers awake! Quickly! |
| 15 | corvaline | The sea will never take another soul. |
| 17 | pearl | The lantern is close. I can feel it in my bones. |
| 19 | corvaline | You cannot know what the sea took from me. |
| 20 (BOSS corvaline) | corvaline | Hold, tide. Hold, and let no one drown. |

**Rally (wave 20): before** (allies: ally_merfolk_warrior, ally_merfolk_spear, ally_tide_spirit, ally_ondrath)
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s2_p10_tide_returns` | Ondrath rises from the bay, shaking off the last barnacles. | Pearl: The sea is coming home. Merfolk, with me! |

**Rally (wave 20): after**
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s2_p11_lantern_flares` | The lantern flares. Corvaline screams over the roar of the sea. | The tide will not hold! |

**Reveal (wave 20, at 50% boss HP, boss stunned 5 s)**
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s2_p12_mother` | Pearl pulls back her hood. She has the keeper's eyes. | Pearl: Mother! It's me. It's Maren! |
| 2 | `b2s2_p13_falter` | The beam stutters. Corvaline's hands shake on the lamp. | Corvaline: Maren? The sea took you... |

Reward: 0 gold, 130 gems, mythic chest, card maren, badge tidewarden. Replay: 500 gold.

### Ending panels
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s2_p14_cracks` | The lantern cracks. Corvaline kneels on the wet stone. | The violet light goes out. |
| 2 | `b2s2_p15_reunion` | Maren takes her mother's hand. | "The sea didn't take me, Mother. It kept me." |
| 3 | `b2s2_p16_orb_returns` | "I held the whole ocean still... and you were in it all along." | The Orb sinks back into Ondrath. Corvaline relights the lamp with plain fire. |
| 4 | `b2s2_p17_shards` | Far off, two violet shards meet in the dark. A gloved hand closes over them. | Two hearts taken. Three remain. To be continued. |

---

## Story b2s3: "The Throne of Dust"

A city of identical Faceless. Light the braziers, win the arena, and unchain a queen instead of killing her.

### Chapter b2s3c1 "The Glass Road" (10 waves, layout desert)
Mechanics: `{"faceless":{"braziers":[4,10,14],"savedBonus":0.02,"savedCap":0.2,"hitCut":0.05,"floor":0.5}}`
**Intro panels**
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s3_p1_shard_south` | The second shard flies south over the sea. | At noon, the desert sky turns violet. |
| 2 | `b2s3_p2_caravan` | Caravans walk out of the dunes in step. | Their faces are as smooth as sandstone. |
| 3 | `b2s3_p3_bako` | Bako, a gladiator with a broken chain on his wrist, begs for help. | "Somewhere in that line is my sister." |

**Wave barks**

| Wave | Speaker | Bark |
|------|---------|------|
| 1 | bako | They wear masks. Stand on a brazier to light it! |
| 2 | bako | Unmasked civilians walk free. Don't hit them! |
| 3 | bako | Splash hurts them too. Careful where you aim. |
| 5 | bako | Scarabs. The desert fights for her too. |
| 6 | bako | Same height. Same face. How do they stand it? |
| 8 | bako | Every one of them is somebody's brother. |
| 9 | bako | A herald walks ahead. He copies what he sees. |
| 10 (BOSS faceless_herald) | faceless_herald | Kneel, as all kneel. Be equal. |

Reward: 2400 gold, 50 gems. Replay: 450 gold.

### Chapter b2s3c2 "The Games of Sunspire" (arena duel, layout desert)
**Intro panels**
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s3_p4_captured` | Sefa's guards drag Bako before the throne of Sunspire. | Sefa: Fight the Keeper, old friend. Let the crowd see. |
| 2 | `b2s3_p5_arena` | The arena roars. Bako steps onto the sand. | Bako: Nothing personal, Keeper. Make it a good show. |

**Duel** vs Bako on `desert`, best of 3, deck minotaur_gladiator, shield_knight, sand_monk, fox_samurai, lion_paladin at level 8, skill 0.45 / 0.6 / 0.75

| Round | Speaker | Bark |
|---|---|---|
| 1 | bako | Round one. Don't hold back, Keeper. |
| 2 | bako | Not bad. The crowd loves you already. |
| 3 | bako | Round three... forgive me. This one is for her. |

### Chapter b2s3c3 "The Throne of Dust" (16 waves, layout desert)
Mechanics: `{"faceless":{"braziers":[4,10,14],"savedBonus":0.02,"savedCap":0.2,"hitCut":0.05,"floor":0.5},"cage":{"slot":0,"lockHp":2500,"roarStun":3}}`
**Intro panels**
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s3_p6_throw` | In the last round, Bako lowers his guard and takes the blow. | Sefa: Bury him in the sand. |
| 2 | `b2s3_p7_cage` | From her cage above the arena, Nefrael calls out. | "Free me, and I will free him." |
| 3 | `b2s3_p8_throne` | The Faceless flood the arena. Sefa waits on her throne. | Violet chains of light bind her to it. |

**Wave barks**

| Wave | Speaker | Bark |
|------|---------|------|
| 1 | nefrael | Riddle me this: who has no face, yet fills the city? |
| 2 | nefrael | Strike my lock between waves, Keeper. I am patient. |
| 4 | nefrael | Look closer. Some of them are still weeping. |
| 5 (BOSS faceless_herald) | faceless_herald | I am you. I am everyone. Kneel. |
| 7 | bako | Free the sphinx! She can stop them all. |
| 9 | nefrael | Something is waking under the sand. |
| 10 (BOSS dune_warden) | dune_warden | The sand takes all. The sand keeps all. |
| 11 | nefrael | Two captains gone. Only the throne remains. |
| 13 | bako | Sefa was never cruel. She wanted us free. |
| 15 | nefrael | Do not kill her, Keeper. Break her chains. |
| 16 (BOSS sefa) | sefa | All are equal before justice. All. Kneel. |

**Rally (wave 16): before** (allies: ally_gladiator, ally_spearwoman, ally_slinger, ally_nefrael)
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s3_p9_cage_breaks` | Nefrael bursts from her cage and roars across the sands. | The freed slaves tear off their masks. Charge! |

**Rally (wave 16): after**
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s3_p10_chains_tighten` | Sefa clutches at her chains. They glow brighter. | Sefa: I made them equal! I set them free! |

Reward: 0 gold, 140 gems, mythic chest, card bako, badge dunewarden. Replay: 550 gold.

### Ending panels
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| 1 | `b2s3_p11_last_chain` | The last chain breaks. Sefa sees the Faceless kneeling all around. | Bako, dug from the sand: "Look who is kneeling." |
| 2 | `b2s3_p12_a_name` | Nefrael asks her true riddle: "What makes all equal, yet no two the same?" | Bako: "A name." Faces return, each one different. |
| 3 | `b2s3_p13_statue` | The cracked city needs holding. Sefa becomes a sandstone statue at the gate. | "The voice said all are equal before justice. It never said whose." |
| 4 | `b2s3_p14_third_shard` | The third shard streaks north toward the mountains. The ground begins to shake. | Three hearts taken. Two remain. To be continued. |
