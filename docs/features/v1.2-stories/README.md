# v1.2.0: Stories

| | |
|---|---|
| **Version** | 1.2.0 |
| **Title** | Stories |
| **Status** | Book 1 (*The Chosen*): all 3 stories. **Art is done** (2026-10-06, 394 credits; see `assets/README.md`). **Code is built** (2026-10-06, see section 10); not balanced or released yet. |
| **Written** | 2026-10-05 |
| **Scope** | New Story mode (menu, chapters, dialogue), Event rarity, 10 new units, candy monsters and bosses, a unit debuff system, new arenas, admin panel, simulator |
| **Promo kit** | [PROMO.md](PROMO.md) and [`promo/`](promo): key art, posts, a header banner and 5 infographics (placeholder art until the real art exists) |

> *The Candy Kingdom is falling to chaos. Save its princess, then find out who corrupted it.*

---

## 1. Summary

Tower Rush gets its first **Story mode**: **Book 1, *The Chosen***, three canon stories that
connect, played in order. A story stays locked until the one before it is finished.

| # | Story | Deck | Final boss | Reward |
|---|---|---|---|---|
| 1 | **Saving the Muse** | The player's own deck | Corrupted royal (see 4.4) | **Princess Muse**, the first card of the new **Event** rarity |
| 2 | **Chaorruption** | An **Event deck**: pick 5 of 9 units | **Chaos Jawbreaker** | **Pentagonal Knight** and **Rogue Knight** (Epic) |
| 3 | **The Beginning** | Own deck with **rules**: both Story 2 knights required, no Legendary or Mythic | **Chaos Corrupted Portal Wizard** | Gems, Legendary chest, "The Chosen" badge, and a cliffhanger |

**Corruption** is the series' enemy. It's shown as **violet** chaos: a purple tint, a dark
violet glow and crackling sparks on corrupted candy people.

### 1.1 The cast at a glance

Working names; the asset id (for art files) is the name in lower case with underscores, for
example `princess_muse`.

| Group | Names |
|---|---|
| **Reward units** (3) | Princess Muse (Event, Barkeeper) · Pentagonal Knight (Epic, Knight) · Rogue Knight (Epic, Mercenary) |
| **Story-only Knights** (4) | Aegis Knight · Lance Knight · Oath Knight · Lantern Knight |
| **Story-only Mercenaries** (3) | Berserker Sellsword · Powder Grenadier · Hired Blade |
| **Candy folk** (8) | Gummy Bear · Candy Corn Runner · Jelly Bean Blob · Cotton Candy Puff · Chocolate Golem · Peppermint Turtle · Licorice Medic · Candy Piñata |
| **Chaos-born** (3) | Sprinkle Swarm · Sour Shard · Chaos Taffy |
| **Corrupted villagers** (8) | Villager · Courier · Farmer · Fisherman · Lumberjack · Herbalist · Merchant · Chaos Eye |
| **Bosses** (8) | Gummy Warlord · Licorice Witch · Sugar Plum Tyrant · Sour Gummy Hydra · Chaos Jawbreaker · Chaos Corrupted Fae · Chaos Corrupted Bear · Chaos Corrupted Portal Wizard |
| **Arenas** | Candy Land (existing) · Candy Palace (new) · Corrupted Candy Kingdom (new) · Jawbreaker Core (new) · Upside-Down Village (new) · Hollow Woods (new) · The First Rift (new) |
| **Statuses** | Last Call (Muse) · Rally · Irritation · Fatigue · Shellshock · Wages |

---

## 2. My thoughts (read this first)

What works well:
- **It's a natural fit.** Candy Land (500 trophies) is already an arena, so the setting is
  ready-made. The shop is already a saloon, so a **Barkeeper** princess suits the world.
- **Story 2's fixed deck is the strongest idea here.** Everyone plays the same units at the same
  level, so it's a skill puzzle rather than a test of card levels. It also lets us try out
  "drawback" units (strong, but they hurt their neighbours) without putting them into PvP.
- **Story 2 teaches the reward cards.** Rogue Knight's Irritation is the example you gave for an
  event mercenary, so the player masters it in the story and then earns it.

Decisions (2026-10-05):
1. **Muse's buff area: 3×3.** The board is 5×3, so "9x9" means the **9 tiles** of a 3×3 square:
   Muse plus the 8 tiles around her, about 60% of the board.
2. **"Rally" stays with the Pentagonal Knight.** Banner Herald's ability (v1.1) is renamed
   **War Cry**, and the v1.1 docs are updated.
3. **The reward knights are 2 of the 9 Event units.** The player fights alongside Pentagonal
   Knight and Rogue Knight for the whole story, then keeps them. The other 7 are story-only.
4. **Story 1 unlocks at 500 trophies** (Candy Land), tuned for a typical deck at that point.
5. **Levelling Muse:** the first clear gives **1 card** (Muse herself). Every **replay** of a
   Story 1 chapter drops **1–3 Muse copies** (see 9.2).
6. **Names:** **Rogue** Knight and **Chaorruption** (chaos + corruption) are confirmed.

**No dependency on v1.1.** Muse builds on the existing `buff` archetype (no attack, boosts
nearby units) with a bigger area and an added damage boost. She doesn't need v1.1's support
system. The new **unit debuff system** (Irritation, etc.) is new engine work in either case.

---

## 3. Story mode: rules for all stories

### 3.1 Structure
- The lobby gets a **STORY** button. It opens a storybook screen with the 3 story covers. The
  locked ones show a padlock and "Finish *Saving the Muse* first."
- Each story has **3 chapters**. Each chapter is one battle with a fixed number of waves and a
  boss at the end.
- A chapter is **won** by clearing its last wave with lives left (normal battles are endless,
  so this is new). It's **lost** when lives run out, as now.
- **Stars:** a win earns 1–3 stars by lives left (3 = no leaks). Stars are for bragging and
  replay rewards only. They never block progress.
- Chapters unlock in order. Each story is "finished" when its chapter 3 is won.

### 3.2 Wave plan (starting numbers, all config values)

| Chapter | Waves | Bosses | About |
|---|---|---|---|
| 1 | 10 | Mini-boss at 5, chapter boss at 10 | 6–8 min |
| 2 | 15 | Mini-bosses at 5 and 10, chapter boss at 15 | 10–12 min |
| 3 | 20 | Mini-bosses at 5, 10 and 15, story boss at 20 | 14–16 min |

That's **45 waves per story**, about 30–35 minutes in total. Each story's waves are hand-made:
a list per chapter of which monsters come, how many, and their HP multiplier. Unlike solo,
waves aren't drawn at random from the arena pool. This uses the sim's existing wave queue
with a fixed script instead of `pick()`.

### 3.3 Dialogue and story beats
- **Story panels:** a full-screen illustrated panel with 1–3 lines of text, before chapter 1,
  between chapters and after the final boss (about 5 per story). Tap to continue; Skip is
  always available.
- **In-battle barks:** short speech bubbles at fixed waves ("They're coming through the gate!").
  These are text over existing portraits, so they need no new art.
- **Boss intro:** reuses the boss intro clip and boss banner, the same as solo boss waves.

### 3.4 Rewards
- **First clear** of each chapter pays a one-time reward. Chapter 3 of each story pays the
  story's unit reward.
- **Replays** pay a small amount of gold, plus a chance of **Event copies** for Muse (9.2).
- **Trophies:** story battles don't change trophies or count for leaderboards.
- **Daily quests:** "Win a story chapter" is added to the quest pool.

### 3.5 Server
- Story progress is saved in the profile JSON as `profile.story`, with each chapter's best
  stars and first-clear date. No new table is needed.
- A chapter result goes through the same checks as a solo run: the server caps the wave by the
  time elapsed, checks that the chapter is unlocked, and grants the rewards itself.
- For Story 2, the server builds the Event deck itself (fixed units and levels), so the client
  can't send a different one.

---

## 4. Story 1: Saving the Muse

### 4.1 Plot
The Candy Kingdom is under attack. Its own people, the candy folk, are pouring over the
walls, **corrupted**: violet-eyed, crackling with chaos and furious. Princess Muse runs the
kingdom's Sugar Saloon, where her drinks have kept the knights' spirits up for years. She has
been taken to the palace by the corrupted royal guard. The player's army fights from the
candy gates through the town to the palace and frees her. To thank them, she joins the army.

| Chapter | Title | Arena | Boss |
|---|---|---|---|
| 1 | **The Candy Gates** | Candy Land (existing) | **Gummy Warlord** (summons gummy bears) |
| 2 | **Sugar Streets** | Candy Land, corrupted look (tint in code) | **Licorice Witch** (lashes freeze 2 units) |
| 3 | **The Muse's Palace** | **Candy Palace** (new) | **Sugar Plum Tyrant**, the corrupted captain of the guard (shield phases) |

### 4.2 Deck and difficulty
- The player's **own equipped deck and hero**, at their own card levels.
- Unlocks at **500 trophies**, the same as the Candy Land arena.
- Monster HP is tuned for a typical deck at 500–750 trophies: about card level 5 and 2–3
  awakenable units. The simulator checks it (section 10.5).

### 4.3 Candy monsters (new)
Each candy monster mirrors one of the existing **traits**, so players can read them without a
tutorial. They are generated **clean**. **Corruption is drawn in code** (violet tint, glow
and sparks), so the same art can later appear uncorrupted or rescued.

| Monster | Trait | Like the existing… |
|---|---|---|
| **Gummy Bear** | none (basic) | Zombie Peasant |
| **Candy Corn Runner** | fast | Goblin Runner |
| **Jelly Bean Blob** | splitter (splits into 3 beans) | Slime Blob |
| **Cotton Candy Puff** | dodge (floats) | Ghost Wisp |
| **Chocolate Golem** | tank | Orc Brute |
| **Peppermint Turtle** | armored | Armored Beetle |
| **Licorice Medic** | healer | Troll Healer |
| **Candy Piñata** | rich (pays extra mana) | Chest Mimic |

### 4.4 Bosses (new)
| Boss | Power | Notes |
|---|---|---|
| **Gummy Warlord** | `summon` (Gummy Bears) | A huge gummy bear in a candy-wrapper cape. |
| **Licorice Witch** | `freeze_units` (licorice whips bind 2 units) | Reused in Story 2 as a mini-boss. |
| **Sugar Plum Tyrant** | `shield`, then `haste` below 50% HP | The fallen captain of the guard; candy armour with violet cracks. |

### 4.5 Reward: Princess Muse

| | |
|---|---|
| **Rarity** | **Event** (new, see 4.6) |
| **Role** | **Barkeeper** |
| **Race** | Human |
| **Element** | Arcane (pink-arcane effects) |
| **Archetype** | `buff`, with a new **area** setting (3×3) |
| **Attacks** | Never. No damage, speed, style or perk on her card ("—"). |
| **Awakening** | Never. At ★7 her buff simply reaches its strongest. |

*"A round on the house, and the whole bar fights harder."*

**Ability: Last Call (aura).** Every unit in the **3×3 square around Muse** attacks faster and
hits harder. The bonus is deliberately **small** because it reaches so many tiles.

| Rank | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 |
|---|---|---|---|---|---|---|---|
| Attack speed | +5% | +7% | +9% | +11% | +13% | +15% | +17% |
| Damage | +3% | +4% | +5% | +6% | +7% | +8% | +9% |

- Both are multiplied by the card multiplier (`boostMult`). Caps: **+40%** speed, **+25%** damage.
- **Comparison:** a Rare buff unit (Lute Bard) at ★1 gives **+16%** speed to 4 tiles. Muse gives
  +5% speed and +3% damage to up to 8. She's better when the board is full and her position is
  good, and worse otherwise.
- **Stacking:** her speed bonus stacks with buff units. Two Muses don't stack: a unit takes the
  highest Muse bonus that reaches it.
- Unlike buff units, she **doesn't pass on a perk**. Her bonus is speed and damage only.
- **On the board:** a soft pink ring marks her 3×3 area while she's being dragged or selected,
  and boosted units show a small heart badge.

**Art brief:** a cheerful candy-kingdom princess in a pink-and-cream barmaid dress with a tiny
tiara and a heart-shaped apron, carrying a tray of glowing pink drinks.
*Idle:* polishing a glass and winking. *"Attack" (buff pulse):* raises the tray and pink hearts
burst outward. *Skill:* pours a round; hearts shower the area. *Portrait:* leaning on the
saloon bar with a heart-shaped mug.

### 4.6 The Event rarity
- A **sixth rarity**, `event`, after Mythic in the list but **outside** the drop system. It has
  no drop weight, so it never appears in chests, the shop or card packs.
- **Card frame:** a new **pink frame with hearts** (one new frame image), plus pink rarity
  colours for the card text and badge.
- **Stats:** Event units use Epic's base numbers wherever a formula needs a rarity value.
- Event cards can be used in solo battles, stories and PvP (Muse is a normal card once earned).

---

## 5. Story 2: Chaorruption

### 5.1 Plot
Muse is safe, but the corruption keeps spreading. The kingdom's surviving **Knights of the
Candy Crown** and a band of hired **mercenaries** set out to find the source. They cross a
kingdom gone violet, through the rotten Sour Marsh, to the heart of the chaos: the **Chaos
Jawbreaker**, an ancient jawbreaker whose core is cracking with violet light. Each layer the
player breaks off reveals more of the truth. The final crack shows a human village far away:
the hook for Story 3 (6.1).

| Chapter | Title | Arena | Boss |
|---|---|---|---|
| 1 | **The Violet Road** | **Corrupted Candy Kingdom** (new) | **Licorice Witch**, re-corrupted and stronger |
| 2 | **Sour Marsh** | Corrupted Candy Kingdom | **Sour Gummy Hydra** (new; splits when hit hard) |
| 3 | **The Jawbreaker's Core** | **Jawbreaker Core** (new) | **Chaos Jawbreaker** (layered phases) |

### 5.2 The Event deck
- The player **can't use their own deck**. Before each chapter they **pick 5 of the 9 Event
  units** (the normal deck size), with **at least 1 Mercenary** (`minRoles` in the config;
  the server rejects a pick without one).
- **Fixed levels:** every Event unit is at a set story level (chapter 1: Lv 6, chapter 2:
  Lv 7, chapter 3: Lv 8, all config values). Card levels and gems don't matter here.
- The player's **hero** still comes along. (Open question: lock this to one story hero too?)
- The other 7 units are **story-only**. They never enter the collection, chests or PvP.
  Pentagonal Knight and Rogue Knight become normal cards once Story 2 is finished (5.7).
- Monsters are the Story 1 candy cast with **heavier corruption** (a darker tint and more HP),
  plus 3 new chaos-born monsters (5.4).

### 5.3 New mechanic: unit debuffs ("drawbacks")
Story 2 adds **negative effects on the player's own units**. They're the price of the
mercenaries' power. All are short timed statuses, like the existing `frozenUntil`/`stunUntil`
on units.

| Status | Effect | Shown as |
|---|---|---|
| **Irritation** | The unit's attacks have a % chance to **miss** | Red scribble over its head; "MISS" pops, as for monster dodges |
| **Fatigue** | The unit attacks slower | Grey sweat-drop |
| **Shellshock** | The unit is stunned briefly | Stars, like the existing stun |
| **Rally** *(positive)* | The unit attacks **+100%** faster for a short time | Gold banner flash |

"Adjacent" means the up-to-4 tiles touching it (up, down, left, right), as for buff units.

### 5.4 The 9 Event units: Knights and Mercenaries
**Knights** play for the team: their effects help neighbours. **Mercenaries** play for
themselves: high power with a drawback on neighbours. The puzzle is the placement: keep
mercenaries away from your carries, or next to an **Aegis Knight**.

| # | Unit | Side | Archetype | Stats | Effect |
|---|---|---|---|---|---|
| 1 | **Pentagonal Knight**¹ | Knight | heavy single-target | Very high damage, very slow | Each hit gives adjacent units **Rally** (+100% speed for 4s; 2s before v1.2.1). |
| 2 | **Aegis Knight** | Knight | buff (no attack) | — | Adjacent units are **immune to debuffs**, and lose any they already have. |
| 3 | **Lance Knight** | Knight | pierce | Medium damage, medium speed | Hits every monster in a line, and (v1.2.1) each hit chains on to up to 5 more monsters; +50% damage to corrupted bosses. |
| 4 | **Oath Knight** | Knight | single-target | Medium damage | +10% damage and +5% attack speed for each adjacent **Knight** (v1.2.1; was +8% damage). |
| 5 | **Lantern Knight** | Knight | mana | Low damage | Makes mana, so the deck has an economy (there are no player mana units here). v1.2.1: also +5 mana every 5s, plus 3 per Knight on the field. |
| 6 | **Rogue Knight**¹ | Mercenary | rapid | Low damage, very high speed (v1.2.1: double speed, 95% crit ×3) | Every 4s, adjacent units get **Irritation** (25% miss) for 2s. |
| 7 | **Berserker Sellsword** | Mercenary | heavy | Very high damage | Adjacent units have **Fatigue** (−25% speed) while it's attacking. v1.2.1: +15% damage per Mercenary on the field (itself included). |
| 8 | **Powder Grenadier** | Mercenary | splash | High splash damage | Each blast has a 15% chance to **Shellshock** a random adjacent unit for 1s. |
| 9 | **Hired Blade** | Mercenary | crit | High crit damage (v1.2.1: damage 46 → 60, speed ×1.25) | **Wages:** takes 10 × rank mana at the start of every wave; if it can't be paid, it sulks (no attacks) for that wave. |

¹ *Pentagonal Knight and Rogue Knight are the story reward. Their story versions are the same
units the player earns at the end, so only 7 units are story-only.*

All Event units are **Human**, wearing candy-kingdom armour (peppermint pauldrons, caramel
leather, gumdrop gems), so they look like they belong to this world.

### 5.5 New chaos-born monsters
| Monster | Trait | Pitch |
|---|---|---|
| **Sprinkle Swarm** | fast + splitter | A buzzing cloud of violet sprinkles. |
| **Sour Shard** | armored + dodge | A crystallised sour candy that flickers in and out. |
| **Chaos Taffy** | new: **tether** | Stretches to the nearest unit and gives it Fatigue until killed. |

### 5.6 Final boss: Chaos Jawbreaker
- A giant jawbreaker made of **4 coloured layers**, with a violet chaos core glowing through
  the cracks.
- **Layered phases:** each layer is a HP bar. When a layer breaks, the boss stuns 3 units,
  sheds that layer (new colour, faster) and releases a burst of chaos-born monsters.
- **Final layer (the core):** it gives every unit **Irritation** in pulses, so the player
  needs Aegis Knights or a layout that copes with misses.
- Art: one boss model plus a **crack** clip and a **shatter** clip; the layer colours are tints
  in code.

### 5.7 Rewards: Pentagonal Knight and Rogue Knight
Both are **Epic** and **Human**, and from then on are **normal collectible cards**. The first
copy comes from the story. After that they drop from chests like any Epic, so they can be
levelled the usual way. Their numbers are the same as in 5.4, scaled by card level like any unit.

| | Pentagonal Knight | Rogue Knight |
|---|---|---|
| Style | heavy | rapid |
| Damage / speed | High damage, very slow (about 2× a heavy unit's time between attacks) | Low damage, very high speed |
| Effect | **Rally:** each hit gives adjacent units +100% attack speed for 4s (v1.2.1) | **Irritation:** every 4s, adjacent units miss 25% of attacks for 2s |
| Strategy | The rhythm unit: surround it with fast attackers. | Isolate it on an edge tile, or pair it with an Aegis-style unit later. |
| Awakening | Optional (needs awakened art; see costs) | Optional |

- **PvP:** both are allowed. Their effects touch only their own board, so no protocol change
  is needed beyond the new status timers in the shared sim.
- **Watch:** Rally at +100% is huge on a fast neighbour. The 2s duration and the knight's slow
  attack are the limit. Simulate it before release.

**Art briefs:**
- *Pentagonal Knight:* a broad knight in angular, five-sided plate armour with a pentagon
  shield and a great hammer. *Idle:* hammer resting on the shoulder. *Attack:* a slow overhead
  smash with a gold shockwave. *Skill:* raises the shield and a golden pentagon flares.
- *Rogue Knight:* a lean knight in a torn crimson cloak with a cracked visor and twin
  daggers. *Idle:* spinning a dagger, smirking. *Attack:* a flurry of quick stabs. *Skill:* a
  taunting flourish with red scribble lines.

---

## 6. Story 3: The Beginning

### 6.1 Plot
The Jawbreaker's shattered core holds one last image: a quiet **human village** far beyond the
Candy Kingdom. The knights follow it there and find the village **turned upside down**.
Houses hang from the sky, trees grow into the clouds, and purple chaos tentacles and staring
eyes push up through the ground. This is the **first case of corruption**, from before it
reached the candy folk. The villagers have been corrupted: fishermen, farmers and lumberjacks,
violet-eyed and wrapped in tentacles. The knights fight through the village and the woods to
a portal at its centre, where the **Portal Wizard** waits.

**Ending (cliffhanger):** the wizard falls, but he laughs as he goes: *"You're too late. The
Chaos Corruption has already begun."* The last panel shows the portal closing on many more
violet eyes. **To be continued.**

| Chapter | Title | Arena | Boss |
|---|---|---|---|
| 1 | **The Upside-Down Village** | **Upside-Down Village** (new) | **Chaos Corrupted Fae** |
| 2 | **The Hollow Woods** | **Hollow Woods** (new) | **Chaos Corrupted Bear** |
| 3 | **The First Rift** | **The First Rift** (new) | **Chaos Corrupted Portal Wizard** |

### 6.2 Deck rules (new feature: story deck rules)
The player uses **their own deck and hero**, but the deck must pass two rules before Play
unlocks:
1. **Required:** **Pentagonal Knight** and **Rogue Knight** (the Story 2 rewards) are both
   equipped.
2. **Banned:** no **Legendary** or **Mythic** units. Common, Rare, Epic and Event (Muse) are
   allowed.

- **Story reason:** the rift's chaos wards turn legends away. Only the **Chosen**, the two
  knights who broke the Jawbreaker, can lead the way in. That's where Book 1's name comes from.
- **Level floor:** the two knights are earned at the end of Story 2, so they're about level 1.
  In Story 3 they fight at **at least** the story level (chapter 1: Lv 6, chapter 2: Lv 7,
  chapter 3: Lv 8, the same as Story 2's Event deck). If the player has levelled them higher,
  their own level is used. Every other card uses the player's own level.
- **Built as a general system:** a chapter can have `requiredUnits`, `bannedRarities` and
  `levelFloor` settings in `stories.ts`, so later stories can use their own deck rules without
  new code.
- **Server check:** the server checks the equipped deck against the chapter's rules at chapter
  start and rejects a deck that fails, the same way it builds the Event deck in Story 2.

### 6.3 Chaos-corrupted villagers (new)
Humans this time, not candy. Unlike the candy folk, their purple tentacles and staring eyes
are **drawn into the art**, so the corruption looks heavier than in the Candy Kingdom. Code can
still add the violet glow and sparks on top.

| Monster | Trait | Pitch |
|---|---|---|
| **Corrupted Villager** | none (basic) | A farmhand in a smock, staggering. |
| **Corrupted Courier** | fast | A messenger boy still clutching his satchel. |
| **Corrupted Farmer** | splitter (3 crows burst out) | Pitchfork and straw hat; crows nest in his coat. |
| **Corrupted Fisherman** | armored | Oilskin coat crusted with barnacles, dragging a net. |
| **Corrupted Lumberjack** | tank | A huge woodsman with an axe; tentacles in his beard. |
| **Corrupted Herbalist** | healer | Carries a basket of violet glowing herbs. |
| **Corrupted Merchant** | rich (pays extra mana) | A pedlar with a pack full of coins. |
| **Chaos Eye** | dodge (floats) | A single huge floating eye with a tentacle tail: pure chaos. |

### 6.4 Bosses (new)
| Boss | Power | Notes |
|---|---|---|
| **Chaos Corrupted Fae** | `dodge` + **Charm**: every few seconds, 2 units get **Irritation** | A woodland fairy with torn violet wings. Reuses the Story 2 debuff system. |
| **Chaos Corrupted Bear** | Tank; a **roar** below 50% HP that **Shellshocks** 3 units, then `haste` | A giant bear with eyes along its back and tentacles from its jaw. |
| **Chaos Corrupted Portal Wizard** | **Portals:** opens a portal partway along the path that monsters step out of (`summon` mid-path), and **blinks** forward along the path once per phase | Three phases. Needs one extra **portal** clip. The final boss of Book 1. |

### 6.5 Reward
Story 3 doesn't give a new unit. Its ending is the cliffhanger. The final chapter pays gems, a
**Legendary chest** and a **"The Chosen" badge** on the profile for finishing Book 1 (9.1).

---

## 7. Screens and UI
- **Lobby:** the middle of the lobby is a carousel of two mode cards, ARENA (the current arena's board) and STORIES (the book covers fanned out), switched by swipe or arrows with page dots. Tapping a mode card flips it over to its options: the arena card (arrows through the arenas, BATTLE) or the books card (one story cover at a time, PLAY / CONTINUE / REPLAY); an ✕ flips it back. The STORIES card has a "!" until Story 1 is started. PLAY opens that story's chapters as a second carousel (swipe, arrows or tap a neighbour; page dots turn gold as chapters are won).
- **Story screen:** titled **Book 1: The Chosen**, with 3 story covers, then a chapter path for the chosen story (3 nodes with
  stars and locks) and a Play button.
- **Event deck picker (Story 2):** a grid of the 9 cards; tap to pick 5. Each card shows its
  side (Knight or Mercenary) and its effect.
- **Deck check (Story 3):** before Play, a checklist: "Pentagonal Knight equipped ✓", "Rogue
  Knight equipped ✗", "No Legendary or Mythic ✗ (Dragon Lord)". Play stays greyed out until
  every line passes, and an **Edit deck** button jumps to the deck screen. Knights raised by the
  level floor show "Lv 6 (story)".
- **Battle HUD:** "Wave 7 / 15" instead of the endless counter, plus barks and status badges.
- **Results:** a Victory screen with stars and the first-clear reward; the unit reward gets a
  card-reveal moment (pink for Muse).
- **Deck:** Muse shows **BARKEEPER** in place of the style, plus her 3×3 area on the Stats tab.
- **What's new popup:** shown once after updating to 1.2.0.

---

## 8. PvP and other modes
- **Muse** is allowed in PvP and solo. The 3×3 area uses the same board in both.
- **Pentagonal and Rogue Knight** are allowed everywhere once earned.
- **Story 2 Event units:** story only, never in PvP.
- **PvP bot:** place Muse in the centre column, keep Rogue Knight on an edge.

---

## 9. Economy

### 9.1 First-clear rewards (starting numbers)
| | Chapter 1 | Chapter 2 | Chapter 3 |
|---|---|---|---|
| Story 1 | 500 gold | 1,000 gold, 20 gems | **Princess Muse**, 50 gems, Epic chest |
| Story 2 | 1,000 gold, 20 gems | 1,500 gold, 30 gems | **Pentagonal Knight + Rogue Knight**, 80 gems, Legendary chest |
| Story 3 | 1,500 gold, 30 gems | 2,000 gold, 40 gems | 100 gems, Legendary chest, **"The Chosen"** profile badge |

### 9.2 Levelling Muse (Event cards)
- **First clear** of Story 1, chapter 3: **1 Muse card** (unlocks her, level 1).
- **Replays** of any Story 1 chapter: gold, plus **1–3 Muse copies** each time (3 stars makes 2–3
  more likely). These are config values.
- She uses the normal upgrade costs (`upgradeCopies`, `upgradeCoins`).
- Optional limit: copies drop only from the first 3 replays a day, so it stays a light daily
  habit rather than a grind.

---

## 10. Build

### 10.0 What was built (2026-10-06)
The plan below is done, with these differences:
- **Muse** is her own archetype, `aura` (Last Call over the 3×3 square, `auraBonus` in `effects.ts`),
  rather than `buff` with an area setting. The **Aegis Knight** is the `aegis` archetype.
- Knight and Mercenary effects are a `UnitDef.effect` (`rally`, `irritate`, `fatigue`, `shellshock`,
  `wages`, `oath`, `bane`); their numbers are Effects blocks of the same names (admin Effects page).
  Unit statuses are in `shared/statuses.ts`, used by both `BattleScene` and the headless `Sim` (PvP, Playground).
- **Story arenas aren't arena entries.** A chapter has a `layout` (an existing arena whose path and board
  it uses: candy_land, winter_village, mushroom_forest) and an `art` image, so they never show in the
  trophy road. Story battles are stored in `battles` with `arena = "story:<chapter id>"`.
- New boss powers: `charm`, `roar`, `split`, `layers`, `portal`, plus a `rage` power below half HP
  (Sugar Plum Tyrant: shield, then haste), `targets`, boss `traits` (the Fae dodges) and `corrupted`.
- New monster trait `tether` (Chaos Taffy). The Corrupted Farmer splits into 3 Chaos Eyes (no crow art).
- New races: Candy and Chaos. New quest goal `stories` ("Win a story chapter", quest `story_1`; add it
  to a live config's quest list on the Daily page, as saved quest lists aren't topped up).
- Open questions answered with the defaults: Story 2 keeps the player's own hero; 10 / 15 / 20 waves;
  Story 3 level floor 6 / 7 / 8; Muse is allowed in Story 3.
- Admin: a **Stories** page (chapters, wave scripts, barks, rewards, Event deck level, level floor).
- Not done yet: the simulator balance pass (10.5), the PvP bot's Muse/Rogue placement, and the R2 upload
  of the story art (`story/` folder in `game/public/assets`).

The original plan:

### 10.1 Shared logic (`shared/`)
- `units.ts`: add the `event` rarity (no drop weight) and an `area` setting for buffs (`adjacent` | `square3`). Add
  Muse, the 2 knights and the 9 Event units, with a `storyOnly` flag. Add the `role` label
  ("Barkeeper", "Knight", "Mercenary").
- `effects.ts`: Muse aura numbers and caps; the Rally, Irritation, Fatigue and Shellshock
  numbers; Lantern mana; Hired Blade wages.
- `sim.ts`: unit statuses (miss chance, speed changes, stun) built on the existing unit
  timers; area buffs; scripted waves with a win at the last wave; the Jawbreaker layers;
  the tether trait; the Story 3 boss powers (Charm, roar, mid-path portals and blink).
- New `stories.ts`: the stories, chapters, wave scripts, barks, panels, rewards, Event deck
  levels and deck rules (`requiredUnits`, `bannedRarities`, `levelFloor`). All of it lives in the game config, so it can be edited from the admin panel.
- `profile.ts`: `profile.story` progress.

### 10.2 Server (`server/src/`)
- Story chapter start and result endpoints (`play.ts`-style checks), the server-built Event
  deck, the Story 3 deck-rule check and level floor, first-clear and replay rewards.

### 10.3 Game (`game/src/`)
- `StoryScene` (covers, chapter path, panels), the Event deck picker, the Story 3 deck check, the HUD wave counter
  and barks, status badges, corruption tint and glow on monsters, Muse's area ring, and the
  victory and reveal screens.

### 10.4 Admin (`admin/`)
- A **Stories** page to edit chapters, wave scripts, rewards and Event deck levels. Rarity
  colours get an Event entry. Playground support for the new statuses.

### 10.5 Balance and testing
- Simulator: Story 1 with starter-level decks and with 500-trophy decks (target: chapter 3 is
  won by about 60% of typical decks on the first try); Story 2 with random 5-of-9 picks (every
  pick should be winnable; good placement should be needed for 3 stars); Story 3 with legal
  decks of Epics and below plus both knights at the floor level.
- Muse vs Lute Bard in the same slot: Muse should come out ahead only with 6+ units in her area.
- PvP bot-vs-bot with Pentagonal and Rogue Knight decks: no deck above 55% win rate.

---

## 11. Art needed and Higgsfield cost

### 11.1 Prices
These come from your own Higgsfield transactions for the original pack (2026-10-02), using the
same pipeline (`assets/README.md`):

| Item | Model | Credits |
|---|---|---|
| Character, portrait, background or story panel (high quality) | GPT Image 2.5 Flare | 1.5 |
| UI art (banner, cover icon) | GPT Image 2.5 Flare | 0.5 |
| Small icon (status badge) | GPT Image 2.5 Flare | 0.25 |
| Animation clip, 480p (SD sprite sheet source) | Seedance 1.5 Pro | 1.2 |
| Animation clip, 720p (HD sheet source, ambient loop) | Seedance 1.5 Pro | 2.4 |
| Trailer shot (optional) | Seedance 2.5 | 30–90 |

What each asset needs, to match the existing art:

| Asset | Contents | Credits each |
|---|---|---|
| **Unit** | image + portrait + idle, attack, skill (480p) + idle, attack (720p) | **11.4** |
| Awakened form (optional) | image + portrait + idle, attack, ultimate (480p) | 6.6 |
| **Monster** | image + walk, death (480p) + walk (720p) | **6.3** |
| **Boss** | image + walk, attack, death, intro (480p) + walk, attack (720p) + banner | **11.6** |
| **Arena** | 752×1344 background + ambient loop (720p) | **3.9** |

### 11.2 What to create

**Story 1: Saving the Muse**
| Asset | Count | Credits |
|---|---|---|
| Princess Muse (unit, no awakening) | 1 | 11.4 |
| Event card frame (pink, hearts) | 1 | 1.5 |
| Candy monsters | 8 | 50.4 |
| Bosses (Gummy Warlord, Licorice Witch, Sugar Plum Tyrant) | 3 | 34.8 |
| Arena: Candy Palace (chapters 1–2 reuse Candy Land) | 1 | 3.9 |
| Story panels | 5 | 7.5 |
| NPC portrait (Candy King, for dialogue) | 1 | 1.5 |
| **Subtotal** | | **111.0** |

**Story 2: Chaorruption**
| Asset | Count | Credits |
|---|---|---|
| Event units (7 story-only + Pentagonal Knight + Rogue Knight) | 9 | 102.6 |
| Chaos-born monsters (the Story 1 candy cast is reused) | 3 | 18.9 |
| Bosses: Sour Gummy Hydra, Chaos Jawbreaker (+ crack and shatter clips) | 2 | 25.6 |
| Arenas: Corrupted Candy Kingdom¹, Jawbreaker Core | 2 | 7.8 |
| Story panels | 5 | 7.5 |
| Status icons (Irritation, Fatigue, Shellshock, Rally) | 4 | 1.0 |
| **Subtotal** | | **163.4** |

¹ *Made as an **image edit of the Candy Land background**, so the board and path stay in the
same place and the arena measurements carry over.*

**Story 3: The Beginning**
| Asset | Count | Credits |
|---|---|---|
| Corrupted villagers | 8 | 50.4 |
| Bosses: Corrupted Fae, Corrupted Bear, Portal Wizard (+ portal clip) | 3 | 36.0 |
| Arenas: Upside-Down Village², Hollow Woods², The First Rift² | 3 | 11.7 |
| Story panels (including the cliffhanger) | 5 | 7.5 |
| **Subtotal** | | **107.1** |

² *Image edits of an existing background, like the Corrupted Candy Kingdom, so the path stays
in the same place.*

**Story mode UI and launch**
| Asset | Count | Credits |
|---|---|---|
| Story screen background | 1 | 1.5 |
| Story covers (all 3) | 3 | 4.5 |
| STORY lobby icon | 1 | 0.25 |
| Promo key art | 2 | 3.0 |
| **Subtotal** | | **9.25** |

### 11.3 Totals

| | Assets | Credits |
|---|---|---|
| Story 1 | 1 unit, 8 monsters, 3 bosses, 1 arena, 7 other images | 111 |
| Story 2 | 9 units, 3 monsters, 2 bosses, 2 arenas, 9 other images | 163 |
| Story 3 | 8 monsters, 3 bosses, 3 arenas, 6 other images | 107 |
| UI and promo | 7 images | 9 |
| **Raw total** | **10 units, 19 monsters, 8 bosses, 6 arenas, about 90 images and 164 clips** | **391** |
| **+30% for retries and rejected takes** | | **≈ 510** |

Ways to change it:
- **Awakened forms for the 2 knights:** about **+17 credits**.
- **Corrupted monsters as separate art** instead of a tint in code: +11 monster sets, about
  **+90 credits**. Not recommended.
- **Animated story panels** (480p each): about **+16 credits** for all 10.
- **A launch trailer** (Seedance 2.5): **+30–90 credits** per shot.
- **Story 1 only** (ship it as 1.2.0 and Stories 2–3 in 1.2.x): about **155 credits** with retries.
- **Story 3 alone:** about **140 credits** with retries.

**Actual (2026-10-06):** all of Book 1 was generated for **394 credits** (balance 1,731 → 1,337),
under the estimate because no retries were needed. Arena bases, for the path layout: Candy Palace,
Corrupted Candy Kingdom and Jawbreaker Core use **Candy Land**; Upside-Down Village uses **Winter
Village**; Hollow Woods and The First Rift use **Mushroom Forest**.

### 11.4 Compared with the OpenAI API (checked 2026-10-05)

Higgsfield's image model *is* OpenAI's (GPT Image 2.5), so the question is only the price,
plus video.

| | OpenAI API | Higgsfield |
|---|---|---|
| Images (Stories 1–2: 57 high, 5 medium, 5 low quality) | about $0.21 / $0.05 / $0.01 each (GPT Image 2, 1024px): **≈ $16** with retries | 1.5 / 0.5 / 0.25 credits: **≈ $5** |
| Animation clips (118) | **Not available.** The Sora video API was reported shut down on 2026-09-24. It cost at least 4s × $0.10 = $0.40 a clip, 720p only (≈ $60). | Seedance 1.5 Pro, 1.2–2.4 credits a clip: **≈ $14** |
| **Total (Stories 1–2)** | Can't make the animations | **≈ 370 credits ≈ $19** |

**Decision: stay on Higgsfield.** It's about 3× cheaper for images, it's the only option for
the animations, and using the same models keeps the new art matching the existing pack.
Sources: OpenAI's pricing page, and CostGoat's OpenAI image and Sora pricing pages.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Story 1 is a wall for weak decks, or trivial for strong ones | Trophy gate, simulator tuning, stars instead of a hard pass/fail for rewards. |
| Debuffs feel unfair ("my units miss!") | Clear badges and "MISS" pops, short durations, Aegis Knight as the counter, and a one-time tip. |
| Rally +100% is too strong in PvP | 2s duration, a very slow knight, a PvP-only multiplier if needed. |
| A sixth rarity breaks code that assumes 5 | Event has no drop weight; check every `RARITIES` loop (drop weights, admin filters, PvP Mirror). |
| Story 3's deck rules feel bad with level 1 knights, or force players to drop their best cards | Cards can't be sold, so everyone who reaches Story 3 owns both knights; the level floor makes level 1 copies usable; the deck check shows exactly what to change. |
| Art is blocked (no credits), as for v1.1 | Build the engine work first: story mode, statuses and area buffs work with placeholder art from existing monsters. |

---

## 13. Open questions
1. In Story 2, does the player keep **their own hero**, or is there a story hero?
2. Wave counts **10 / 15 / 20** per chapter: OK?
3. Order of release: **v1.1 Supporting Cast** or **v1.2 Stories** first, once there are credits?
   (Stories is about 510 credits; Supporting Cast is 8 units, about 120.)
4. **Names:** the unit, monster and boss names in sections 4 and 5 are working names.
5. **Story 3 level floor:** run the two knights at story levels (Lv 6/7/8) when they're lower,
   or tune the monsters for level 1 knights instead?
6. **Story 3 reward:** gems, chest and the "The Chosen" badge, or should it also give a unit?
7. **Muse in Story 3:** allowed (she's Event, not Legendary or Mythic). OK?
