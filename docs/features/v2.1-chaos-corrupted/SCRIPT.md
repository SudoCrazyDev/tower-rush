# Book 2 "Chaos Corrupted", Story 1: "The Elven Wilds" - Script

Saga: The Forsakens. Player is unnamed: addressed as "Keeper".
Format: panels are `panel("file", "line1", "line2")` (2 lines, 12 words or fewer each). Barks are `say("speaker_id", "text")` (1 line, 14 words or fewer).
Speaker ids: `queen_aelyria`, `thalmyr_half`, `thalmyr_cleansed`, `vaeltharion`, `forest_villager`. Captains have no portrait ids in the plan: `morvane`, `sylris`, `kaelen` are PROPOSED ids (need portraits, or fall back to the boss sprite).
Note: per the brief, p8 (Thalmyr kneels, mentions the Orb) sits in the c3 intro, so it bridges c2 into the summit.

---

## Chapter b2s1c1 "The Fleeing Grove" (10 waves)

### Intro (p1-p5)
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| p1 | `b2s1_p1_restored` | The village is whole again, bright and singing. | Villagers cheer and thank the Keeper. |
| p2 | `b2s1_p2_farewell` | Knights and mercenaries ride off down separate roads. | The sun sets. The Keeper walks on. |
| p3 | `b2s1_p3_runner` | A villager runs in, gasping for breath. | The elven forest is being corrupted! A rogue elf rules it! |
| p4 | `b2s1_p4_fleeing` | Elves, gnomes, fae and beasts flee through the deep forest. | Behind them, a corrupted army marches. |
| p5 | `b2s1_p5_queen_pleads` | Queen Aelyria begs: Keeper, please, help us! | Vaeltharion's army hunts my people through these woods. |

### Wave barks
| Wave | Speaker | Bark |
|------|---------|------|
| 1 | queen_aelyria | They are on our heels, Keeper! Hold the path! |
| 2 | queen_aelyria | Their elves are fast. Watch the flanks! |
| 3 | queen_aelyria | Even the gentle fae are weeping. Protect them! |
| 4 | queen_aelyria | Corrupted archers in the branches! Stay sharp! |
| 5 | queen_aelyria | Keep fighting! The little ones are almost clear. |
| 6 | queen_aelyria | Their eyes burn violet. They no longer know us. |
| 7 | queen_aelyria | Hold on, my people! The Keeper stands with us. |
| 8 | queen_aelyria | More are coming. Do not let them near the fleeing! |
| 9 | queen_aelyria | Their captain draws close. I feel the dark gather. |
| 10 (BOSS Morvane) | morvane | Give up the Queen. The Commander demands it. |

Boss wave extras:
- Queen reaction on spawn: `say("queen_aelyria", "Morvane! You once guarded my halls. Break him, Keeper!")`
- Queen reaction on defeat: `say("queen_aelyria", "He falls. The road is open, but Vaeltharion waits.")`

---

## Chapter b2s1c2 "Thalmyr, the Torn Guardian" (1 wave, boss only)

### Intro (p6-p7)
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| p6 | `b2s1_p6_the_commander` | Vaeltharion, our Commander, fell to chaos without warning. | He rules the rocky peak. Thalmyr is missing. |
| p7 | `b2s1_p7_guardian` | Thalmyr looms, half radiant, half corrupted, roaring in pain. | He fights the chaos inside him. Beware, Keeper! |

### Barks
| When | Speaker | Bark |
|------|---------|------|
| Wave 1 (boss spawn) | thalmyr_half | Run, little one... the chaos... it is inside me! |
| Entangle use (variant A) | thalmyr_half | Roots, hold them! I cannot... stop it! |
| Entangle use (variant B) | thalmyr_half | Forgive me, Keeper. The thorns obey the dark. |

Extras:
- Queen reaction on spawn: `say("queen_aelyria", "Thalmyr! Old guardian, hold on. We will free you.")`
- On defeat (p8 follows in the c3 intro): `say("thalmyr_half", "Thank you... I yield. Listen, Keeper, before I fade.")`

---

## Chapter b2s1c3 "Summit of Vaeltharion" (20 waves)

### Intro (p8-p10)
| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| p8 | `b2s1_p8_guardian_falls` | Thalmyr kneels, wounded but alive. His voice is soft. | Find the Forest Orb, or the whole forest falls. |
| p9 | `b2s1_p9_summit` | At the summit wait a hundred corrupted elves. | Three captains stand before them, blades and bows ready. |
| p10 | `b2s1_p10_orb` | Vaeltharion lifts the Forest Orb, half green, half violet. | Do not force it, Keeper. You cannot win. |

### Wave barks
| Wave | Speaker | Bark |
|------|---------|------|
| 1 | vaeltharion | Turn back. These peaks belong to the Elven race. |
| 2 | queen_aelyria | So many of my own kin. Stay strong, Keeper. |
| 3 | queen_aelyria | The rocks give no cover. Guard every tower! |
| 4 | vaeltharion | Fall back to your forest, little hero. |
| 5 | queen_aelyria | The air is thick with violet haze. Do not breathe deep. |
| 6 (BOSS Morvane) | morvane | I return, stronger than before! Kneel! |
| 7 | queen_aelyria | Morvane is beaten once more. Keep the pressure on! |
| 8 | queen_aelyria | The ranks thin, but the summit is still far. |
| 9 | vaeltharion | Every elf you strike is a brother lost. |
| 10 | queen_aelyria | Do not listen to him! That is the chaos talking. |
| 11 | queen_aelyria | I hear bowstrings. Sylris is near. |
| 12 (BOSS Sylris) | sylris | You cannot hit what you cannot see. |
| 13 | queen_aelyria | Sylris falls silent. Two captains are done. |
| 14 | vaeltharion | I was once a hero like you, Keeper. |
| 15 | queen_aelyria | Hold the line! The Commander watches from above. |
| 16 | queen_aelyria | Kaelen's blades are sharp. Prepare for a hard fight. |
| 17 | vaeltharion | Look how the world forgets us. I will not. |
| 18 (BOSS Kaelen) | kaelen | Steel against steel. Come, test my guard! |
| 19 | queen_aelyria | The last captain is down. Only Vaeltharion remains. |
| 20 (BOSS Vaeltharion) | vaeltharion | I am the Commander. The Elven race will be seen! |

### Boss extras (Queen reactions)
- w6 spawn: `say("queen_aelyria", "Morvane again! He is faster now. Brace, Keeper!")`
- w6 defeat: `say("queen_aelyria", "Good. One captain broken, two to go.")`
- w12 spawn: `say("queen_aelyria", "Sylris, my finest archer. Her arrows rarely miss. Careful!")` (boss dodges often: hint "Keep firing. Even Sylris cannot dodge forever.")
- w12 defeat: `say("queen_aelyria", "Sylris lowers her bow at last. Rest well, friend.")`
- w18 spawn: `say("queen_aelyria", "Kaelen blocks most blows. Strike again and again!")`
- w18 defeat: `say("queen_aelyria", "The captains are all beaten. Now, the Commander.")`
- w20 spawn: `say("queen_aelyria", "Vaeltharion... my oldest friend. Forgive me for what comes.")`
- w20 skill barks (optional): `say("vaeltharion", "Impale! Fall where you stand!")` and `say("vaeltharion", "Blight Root! Let the thorns take you!")`

---

## Mid-battle finale (w20, Vaeltharion at 80% of the path)

Game pauses. Ally charge pushes him back to the start and deals 50% of his current HP. Then p12. Game resumes: he is slightly faster but cannot use skills.

| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| p11 | `b2s1_p11_charge` | The Queen's staff blazes. The whole forest answers. | Nature's Attendants, Charge! |
| p12 | `b2s1_p12_mad` | Vaeltharion screams, violet fire cracking through his armor. | No! I will NOT be forgotten! |

Optional bark after resume: `say("vaeltharion", "Enough! I will crush you all myself!")`

---

## Story ending (after Vaeltharion is defeated)

| # | File | Line 1 | Line 2 |
|---|------|--------|--------|
| p13 | `b2s1_p13_broken` | Vaeltharion kneels, armor shattered. It is over; he accepts defeat. | Queen Aelyria: Old friend, this was never truly you. |
| p14 | `b2s1_p14_cleansed` | Thalmyr bends and swallows the Forest Orb whole. | Green light washes the chaos away. The guardian is healed. |
| p15 | `b2s1_p15_dust` | Vaeltharion fades into golden dust, calm and sad. | I only wished the Elven race to be acknowledged. |
| p16 | `b2s1_p16_beyond` | Thank you, Keeper. More lands are Chaos Corrupted. | To be continued. |

Beats:
- p13: Vaeltharion broken, accepts defeat; the Queen speaks, kind and grieving.
- p14: Thalmyr (now `thalmyr_cleansed`) swallows the Orb and is fully cleansed.
- p15: Vaeltharion vanishes gently, then turns to dust.
- p16: Queen thanks the Keeper and warns; ends on "To be continued."

---

## Names and lore
- Saga "The Forsakens": realms that chaos has cast aside; Book 2 follows the newly fallen lands.
- Book 2 "Chaos Corrupted": places whose guardians are twisted by violet chaos.
- Story 1 "The Elven Wilds": the mountain forest of the elves, now under a corrupted army.
- Queen Aelyria: gentle but fierce elven queen who shields her people and calls the forest to arms.
- Thalmyr: ancient stag guardian of the forest, keeper of the Forest Orb.
- Vaeltharion: the Elven Commander, once a hero, corrupted; he only wants the elves to be seen.
- Forest Orb: heart of the wilds; half-corrupted in Vaeltharion's hand until Thalmyr reclaims it.
- Captain Morvane: sword captain, first to hunt the fleeing; turned dark purple.
- Captain Sylris: archer captain whose arrows rarely miss.
- Captain Kaelen: dual-blade captain who deflects most blows.
- Nature's Attendants: elves, gnomes, fae, elementals and beasts who charge together at the Queen's call.
- The forest villager: the runner who brings the Keeper the first warning.
