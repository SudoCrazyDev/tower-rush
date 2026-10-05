# v1.2.0: Stories

| | |
|---|---|
| **Version** | 1.2.0 |
| **Title** | Stories |
| **Status** | Design. Stories 1 and 2 are planned here; Story 3 is still being written. Nothing is built yet (on hold until there's art). Promo graphics are rendered with placeholders. |
| **Written** | 2026-10-05 |
| **Scope** | New Story mode (menu, chapters, dialogue), Event rarity, 10 new units, candy monsters and bosses, a unit debuff system, new arenas, admin panel, simulator |
| **Promo kit** | [PROMO.md](PROMO.md) and [`promo/`](promo): key art, posts, a header banner and 5 infographics (placeholder art until the real art exists) |

> *The Candy Kingdom is falling to chaos. Save its princess, then find out who corrupted it.*

---

## 1. Summary

Tower Rush gets its first **Story mode**: three canon stories that connect, played in order.
A story stays locked until the one before it is finished.

| # | Story | Deck | Final boss | Reward |
|---|---|---|---|---|
| 1 | **Saving the Muse** | The player's own deck | Corrupted royal (see 4.4) | **Princess Muse**, the first card of the new **Event** rarity |
| 2 | **Chaorruption** | An **Event deck**: pick 5 of 9 units | **Chaos Jawbreaker** | **Pentagonal Knight** and **Rogue Knight** (Epic) |
| 3 | *(still being written)* | | | |

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
| **Bosses** (5) | Gummy Warlord · Licorice Witch · Sugar Plum Tyrant · Sour Gummy Hydra · Chaos Jawbreaker |
| **Arenas** | Candy Land (existing) · Candy Palace (new) · Corrupted Candy Kingdom (new) · Jawbreaker Core (new) |
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
   Story 1 chapter drops **1–3 Muse copies** (see 8.2).
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
- **Replays** pay a small amount of gold, plus a chance of **Event copies** for Muse (8.2).
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
  awakenable units. The simulator checks it (section 10).

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
player breaks off reveals more of the truth. The final crack opens a hook for Story 3.

| Chapter | Title | Arena | Boss |
|---|---|---|---|
| 1 | **The Violet Road** | **Corrupted Candy Kingdom** (new) | **Licorice Witch**, re-corrupted and stronger |
| 2 | **Sour Marsh** | Corrupted Candy Kingdom | **Sour Gummy Hydra** (new; splits when hit hard) |
| 3 | **The Jawbreaker's Core** | **Jawbreaker Core** (new) | **Chaos Jawbreaker** (layered phases) |

### 5.2 The Event deck
- The player **can't use their own deck**. Before each chapter they **pick 5 of the 9 Event
  units** (the normal deck size).
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
| 1 | **Pentagonal Knight**¹ | Knight | heavy single-target | Very high damage, very slow | Each hit gives adjacent units **Rally** (+100% speed for 2s). |
| 2 | **Aegis Knight** | Knight | buff (no attack) | — | Adjacent units are **immune to debuffs**, and lose any they already have. |
| 3 | **Lance Knight** | Knight | pierce | Medium damage, medium speed | Hits every monster in a line; +50% damage to corrupted bosses. |
| 4 | **Oath Knight** | Knight | single-target | Medium damage | +8% damage for each adjacent **Knight**. |
| 5 | **Lantern Knight** | Knight | mana | Low damage | Makes mana on kills, so the deck has an economy (there are no player mana units here). |
| 6 | **Rogue Knight**¹ | Mercenary | rapid | Low damage, very high speed | Every 4s, adjacent units get **Irritation** (25% miss) for 2s. |
| 7 | **Berserker Sellsword** | Mercenary | heavy | Very high damage | Adjacent units have **Fatigue** (−25% speed) while it's attacking. |
| 8 | **Powder Grenadier** | Mercenary | splash | High splash damage | Each blast has a 15% chance to **Shellshock** a random adjacent unit for 1s. |
| 9 | **Hired Blade** | Mercenary | crit | High crit damage | **Wages:** takes 10 × rank mana at the start of every wave; if it can't be paid, it sulks (no attacks) for that wave. |

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
| Effect | **Rally:** each hit gives adjacent units +100% attack speed for 2s | **Irritation:** every 4s, adjacent units miss 25% of attacks for 2s |
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

## 6. Screens and UI
- **Lobby:** a STORY button (a book icon), with a "NEW" dot until Story 1 is started.
- **Story screen:** 3 story covers, then a chapter path for the chosen story (3 nodes with
  stars and locks) and a Play button.
- **Event deck picker (Story 2):** a grid of the 9 cards; tap to pick 5. Each card shows its
  side (Knight or Mercenary) and its effect.
- **Battle HUD:** "Wave 7 / 15" instead of the endless counter, plus barks and status badges.
- **Results:** a Victory screen with stars and the first-clear reward; the unit reward gets a
  card-reveal moment (pink for Muse).
- **Deck:** Muse shows **BARKEEPER** in place of the style, plus her 3×3 area on the Stats tab.
- **What's new popup:** shown once after updating to 1.2.0.

---

## 7. PvP and other modes
- **Muse** is allowed in PvP and solo. The 3×3 area uses the same board in both.
- **Pentagonal and Rogue Knight** are allowed everywhere once earned.
- **Story 2 Event units:** story only, never in PvP.
- **PvP bot:** place Muse in the centre column, keep Rogue Knight on an edge.

---

## 8. Economy

### 8.1 First-clear rewards (starting numbers)
| | Chapter 1 | Chapter 2 | Chapter 3 |
|---|---|---|---|
| Story 1 | 500 gold | 1,000 gold, 20 gems | **Princess Muse**, 50 gems, Epic chest |
| Story 2 | 1,000 gold, 20 gems | 1,500 gold, 30 gems | **Pentagonal Knight + Rogue Knight**, 80 gems, Legendary chest |

### 8.2 Levelling Muse (Event cards)
- **First clear** of Story 1, chapter 3: **1 Muse card** (unlocks her, level 1).
- **Replays** of any Story 1 chapter: gold, plus **1–3 Muse copies** each time (3 stars makes 2–3
  more likely). These are config values.
- She uses the normal upgrade costs (`upgradeCopies`, `upgradeCoins`).
- Optional limit: copies drop only from the first 3 replays a day, so it stays a light daily
  habit rather than a grind.

---

## 9. Build plan (for later; nothing is built yet)

### 9.1 Shared logic (`shared/`)
- `units.ts`: add the `event` rarity (no drop weight) and an `area` setting for buffs (`adjacent` | `square3`). Add
  Muse, the 2 knights and the 9 Event units, with a `storyOnly` flag. Add the `role` label
  ("Barkeeper", "Knight", "Mercenary").
- `effects.ts`: Muse aura numbers and caps; the Rally, Irritation, Fatigue and Shellshock
  numbers; Lantern mana; Hired Blade wages.
- `sim.ts`: unit statuses (miss chance, speed changes, stun) built on the existing unit
  timers; area buffs; scripted waves with a win at the last wave; the Jawbreaker layers;
  the tether trait.
- New `stories.ts`: the stories, chapters, wave scripts, barks, panels, rewards and Event deck
  levels. All of it lives in the game config, so it can be edited from the admin panel.
- `profile.ts`: `profile.story` progress.

### 9.2 Server (`server/src/`)
- Story chapter start and result endpoints (`play.ts`-style checks), the server-built Event
  deck, first-clear and replay rewards.

### 9.3 Game (`game/src/`)
- `StoryScene` (covers, chapter path, panels), the Event deck picker, the HUD wave counter
  and barks, status badges, corruption tint and glow on monsters, Muse's area ring, and the
  victory and reveal screens.

### 9.4 Admin (`admin/`)
- A **Stories** page to edit chapters, wave scripts, rewards and Event deck levels. Rarity
  colours get an Event entry. Playground support for the new statuses.

### 9.5 Balance and testing
- Simulator: Story 1 with starter-level decks and with 500-trophy decks (target: chapter 3 is
  won by about 60% of typical decks on the first try); Story 2 with random 5-of-9 picks (every
  pick should be winnable; good placement should be needed for 3 stars).
- Muse vs Lute Bard in the same slot: Muse should come out ahead only with 6+ units in her area.
- PvP bot-vs-bot with Pentagonal and Rogue Knight decks: no deck above 55% win rate.

---

## 10. Art needed and Higgsfield cost

### 10.1 Prices
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

### 10.2 What to create

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

**Story mode UI and launch**
| Asset | Count | Credits |
|---|---|---|
| Story screen background | 1 | 1.5 |
| Story covers (all 3; Story 3 as a locked silhouette) | 3 | 4.5 |
| STORY lobby icon | 1 | 0.25 |
| Promo key art | 2 | 3.0 |
| **Subtotal** | | **9.25** |

### 10.3 Totals

| | Assets | Credits |
|---|---|---|
| Story 1 | 1 unit, 8 monsters, 3 bosses, 1 arena, 7 other images | 111 |
| Story 2 | 9 units, 3 monsters, 2 bosses, 2 arenas, 9 other images | 163 |
| UI and promo | 7 images | 9 |
| **Raw total** | **10 units, 11 monsters, 5 bosses, 3 arenas, about 67 images and 118 clips** | **284** |
| **+30% for retries and rejected takes** | | **≈ 370** |

Ways to change it:
- **Awakened forms for the 2 knights:** about **+17 credits**.
- **Corrupted monsters as separate art** instead of a tint in code: +11 monster sets, about
  **+90 credits**. Not recommended.
- **Animated story panels** (480p each): about **+16 credits** for all 10.
- **A launch trailer** (Seedance 2.5): **+30–90 credits** per shot.
- **Story 1 only** (ship it as 1.2.0 and Story 2 in 1.2.x): about **155 credits** with retries.

Your Higgsfield balance is **0 credits** (Free plan) right now. A **500-credit top-up** (about
**$25**, credits expire after 90 days) covers Stories 1 and 2 with room for retries.
Higgsfield shows the exact price at checkout. 370 credits is about **$19**.

### 10.4 Compared with the OpenAI API (checked 2026-10-05)

Higgsfield's image model *is* OpenAI's (GPT Image 2.5), so the question is only the price,
plus video.

| | OpenAI API | Higgsfield |
|---|---|---|
| Images (57 high, 5 medium, 5 low quality) | about $0.21 / $0.05 / $0.01 each (GPT Image 2, 1024px): **≈ $16** with retries | 1.5 / 0.5 / 0.25 credits: **≈ $5** |
| Animation clips (118) | **Not available.** The Sora video API was reported shut down on 2026-09-24. It cost at least 4s × $0.10 = $0.40 a clip, 720p only (≈ $60). | Seedance 1.5 Pro, 1.2–2.4 credits a clip: **≈ $14** |
| **Total** | Can't make the animations | **≈ 370 credits ≈ $19** |

**Decision: stay on Higgsfield.** It's about 3× cheaper for images, it's the only option for
the animations, and using the same models keeps the new art matching the existing pack.
Sources: OpenAI's pricing page, and CostGoat's OpenAI image and Sora pricing pages.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Story 1 is a wall for weak decks, or trivial for strong ones | Trophy gate, simulator tuning, stars instead of a hard pass/fail for rewards. |
| Debuffs feel unfair ("my units miss!") | Clear badges and "MISS" pops, short durations, Aegis Knight as the counter, and a one-time tip. |
| Rally +100% is too strong in PvP | 2s duration, a very slow knight, a PvP-only multiplier if needed. |
| A sixth rarity breaks code that assumes 5 | Event has no drop weight; check every `RARITIES` loop (drop weights, admin filters, PvP Mirror). |
| Art is blocked (no credits), as for v1.1 | Build the engine work first: story mode, statuses and area buffs work with placeholder art from existing monsters. |

---

## 12. Open questions
1. In Story 2, does the player keep **their own hero**, or is there a story hero?
2. Wave counts **10 / 15 / 20** per chapter: OK?
3. Order of release: **v1.1 Supporting Cast** or **v1.2 Stories** first, once there are credits?
   (Stories is about 370 credits; Supporting Cast is 8 units, about 120.)
4. **Names:** the unit, monster and boss names in sections 4 and 5 are working names.
5. **Story 3:** coming from you. The Jawbreaker's core should reveal the hook.
