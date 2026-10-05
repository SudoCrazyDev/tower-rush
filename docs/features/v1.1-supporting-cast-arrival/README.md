# v1.1.0: Supporting Cast Arrival

| | |
|---|---|
| **Version** | 1.1.0 (first feature release after launch, 1.0.0) |
| **Title** | Supporting Cast Arrival |
| **Status** | Live since 2026-10-06. All 8 units are built, with art and animations. See [section 14](#14-implementation-2026-10-05). |
| **Written** | 2026-10-05 |
| **Scope** | Solo battles and PvP, Deck screen, admin panel, simulator, new art |
| **Promo kit** | [PROMO.md](PROMO.md) and [`promo/`](promo) |

> *Not every hero swings a sword.*
> Eight new support units join Tower Rush. They never attack. Instead they copy, swap, brew,
> charge and rally, and they change how your board grows.

---

## 1. Summary

Supporting Cast Arrival adds a new kind of card: **support units**. Most units in Tower Rush
attack. The four buff units (Lute Bard, Cyclops Smith, Lion Paladin, Sun Priestess) make their
neighbours attack faster. The new support units go further: they bend the game's rules. They
help the player:

- **get to an awakening**, instead of hoping the random merges line up;
- **place units well**, now that neighbours matter (buffs, perks, auras);
- **make more of an awakened unit** once they have one;
- **build an economy**, trading early strength for more mana later.

The release adds **8 support units**: 5 Rare and 3 Epic. None are Legendary or Mythic, so
every player can collect them early and they don't become a pay-to-win wall.

| | Unit | Rarity | Element | Race | Job | One-line pitch |
|---|---|---|---|---|---|---|
| 1 | **Mime** | Epic | Arcane | Fae | Copy | Becomes a copy of a unit of the same rank. |
| 2 | **Portal Imp** | Rare | Fire | Demon | Move | Swaps places with a unit of the same rank, or hops to an empty tile. |
| 3 | **Mirror Slime** | Rare | Poison | Elemental | Copy (passive) | Every so often turns into a neighbour of the same rank. |
| 4 | **Lucky Cat** | Rare | Nature | Beast | Steer merges | Neighbours' merges can keep their unit instead of rolling a random one. |
| 5 | **Hourglass Owl** | Epic | Lightning | Construct | Charge ultimates | Neighbours charge their ultimate much faster. |
| 6 | **Echo Spirit** | Epic | Ice | Undead | Repeat ultimates | Repeats a neighbour's ultimate at reduced strength. |
| 7 | **Banner Herald** | Rare | Fire | Human | Reward awakenings | Every unit hits harder for each awakened unit on the board. |
| 8 | **Gnome Brewer** | Rare | Nature | Gnome | Mana farm | Brews mana and pays a bonus at the end of every wave. |

---

## 2. Why this feature

### The problem
- **Merging is random.** Two matching units merge into a *random* deck unit one rank higher.
  Reaching ★7 and awakening a chosen unit is mostly luck. A strong plan can lose to bad rolls,
  and a player can't commit to a main damage dealer.
- **Decks are mostly damage.** After the styles-and-perks update, attackers are distinct, but
  nearly every slot still answers the same question: "how much damage does this do?"
- **Positions barely matter** outside buff units, and there's no way to move a unit once it lands.
- **Mana has one source** besides waves: the three mana units, which also attack and make
  only a little mana.

### The goal
Give players real **deck-building choices**: a slot spent on a support unit is a slot not spent
on damage. Good players should win with a plan (a Mime-and-Owl awakening deck, a Brewer
power-up deck, a Portal Imp positioning deck), not only with luck and card levels.

### Design pillars
1. **Every support unit costs something.** It never attacks, so it weakens the board until its
   effect pays off.
2. **Easy to read.** One clear job per unit, shown on the board with a badge or visual effect.
3. **Rank matters.** Supporters grow with merges like any other unit, and their reach grows too.
4. **Collectible by everyone.** Rare and Epic only.
5. **Same rules in solo and PvP.** Numbers can differ per mode, but the mechanics are the same.

---

## 3. Rules for all support units

### 3.1 What makes a unit a "support unit"
- A new archetype, **support**, next to the existing `buff` and `mana`. Each support unit
  has a **support kind** (mime, portal, mirror, lucky, hourglass, echo, herald, brewer).
- **It never attacks.** It has no damage, speed, style or perk (shown as "—" on the card).
- It still takes a deck slot, gets summoned like any unit, and can be powered up in battle.

### 3.2 Merging
- Two copies of the **same support unit at the same rank** merge, exactly like any other unit:
  the result is a **random unit from the deck**, one rank higher. A merge can turn a support
  unit into an attacker, and an attacker merge can roll a support unit.
- Support units go up to the max rank (★7 today; an Economy setting).
- **Support units never awaken.** At ★7 they get no aura, no awakened art and no ultimate.
  Instead their effect reaches its strongest value.

### 3.3 The Rank Match rule
Support units with a **hands-on effect** (one that copies or moves a specific unit) only work
with units of the **same rank**:

- A ★2 Mime copies ★2 units only.
- A ★4 Portal Imp swaps with ★4 units only.
- A ★3 Mirror Slime only turns into ★3 neighbours.

Merging the support unit up is how it reaches stronger units. This keeps them from skipping
the merge ladder: a Mime can never turn a ★1 into a copy of your ★6.

Support units with an **aura** (Lucky Cat, Hourglass Owl, Echo Spirit) affect neighbours of
**any** rank, and their **strength** grows with their own rank. Banner Herald and Gnome Brewer
work across the whole board.

### 3.4 Neighbours
"Neighbours" means the up-to-four tiles touching it (up, down, left, right), as with buff units.

### 3.5 Card level and power-ups
- Support units level up in the Deck like any card. Their **effect** scales with the same
  card-level × power-up multiplier as damage and the buff bonus (`boostMult` in
  `shared/units.ts`).
  - Percentages (chance, charge rate, echo strength, damage, mana) are **multiplied** by it.
  - Timers (Portal Imp cooldown, Mirror Slime interval, Mime prep time) are **divided** by it.
- Every effect has a **cap** (or a floor, for timers) so a maxed card can't break the game.
- Powering up a support unit costs the same mana as any other unit.

### 3.6 Interactions with existing systems
- **Buff units** speed up support units too. Haste shortens the support unit's timers (Imp
  cooldown, Slime interval, Brewer brew time) instead of its attack rate. Buff units don't hand
  their perk to a support unit, since it never hits anything.
- **Monster abilities** (freeze, stun) affect support units like any unit: a frozen support
  unit's timers stop, and its active ability can't be used.
- **Ultimates** from Echo Spirit count as ultimates (they trigger Banner Herald's tracking etc.).
- **Heroes** that boost "all units" boost support effects only where noted (none for now).
- **Daily quests:** add "Use the Mime 3 times", "Swap units 5 times", "Brew 500 mana" to the
  quest pool.

### 3.7 Deck limit
- **Launch rule:** no limit. A support unit takes a normal slot. Not attacking is the cost.
- **Watch:** if decks with 3+ support units dominate (stall with Brewers, or loop Mime plus
  Lucky Cat), add a **max 2 support units per deck** rule as an Economy setting.

---

## 4. The cast

Starting numbers. All are config values (admin **Effects** page), to be tuned with the
simulator before release. "Lv" is the card level and "PU" the in-battle power-ups.

### 4.1 Mime (Epic · Arcane · Fae)
*"A silent performer who becomes whoever stands across from it."*

**Ability: Copy (active).** Drag the Mime onto a unit of the **same rank**: the Mime becomes an
exact copy of that unit, same unit, same rank. Now you have a matching pair to merge.

- **Stage fright:** a Mime must be on the board for a few seconds before it can copy. Prep time:
  12s at Lv 1, divided by the card multiplier, floor 4s. A curtain icon on the tile shows when
  it's ready.
- Dragging a Mime onto **another Mime of the same rank** merges them as usual.
- It **can't copy** another support unit or an **awakened** unit.
- Dropping it on a unit of another rank does nothing: the Mime shakes and shows "Needs ★N".
- The copy is a real unit of that card. It uses that card's level and power-ups.

| Rank | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 |
|---|---|---|---|---|---|---|---|
| Copies units at | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 (only units that can't awaken) |

**Strategy:** it saves a board with no matching pairs, and makes the climb to ★7 far more
reliable. It's the main card for an "awakening deck".
**Counter-balance:** it's the most powerful support unit, so it's Epic, has the prep time, and
can't copy awakened units.

**Art brief:** a small, white-faced mime in a striped shirt and beret, white gloves.
*Idle:* pretending to be stuck in an invisible box. *Attack (copy):* pulls a mask off its face
and throws it; puff of confetti. *Skill:* takes a bow. *Portrait:* the mime peeking around a
theatre curtain.

---

### 4.2 Portal Imp (Rare · Fire · Demon)
*"A mischievous imp who rearranges the battlefield."*

**Ability: Swap (active).** Drag the Portal Imp onto a unit of the **same rank** and they swap
places through a portal. Or drag it onto an **empty tile** and it hops there.

- **Cooldown:** after a swap or hop it needs to recharge (a ring fills around its feet).
- **Portal rush:** the unit that came through the portal attacks +25% faster for 5s.
- Dragging an Imp onto another Imp of the same rank merges them as usual.
- While cooling down, dragging it onto a same-rank unit does nothing (shake + timer).

| Rank | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 |
|---|---|---|---|---|---|---|---|
| Cooldown | 20s | 18s | 16s | 14s | 12s | 10s | 8s |

Cooldown is divided by the card multiplier, with a floor of 4s.

**Strategy:** move your best unit next to a buff unit, an Hourglass Owl or a Lucky Cat. Put two
matching units side by side. Fill an empty tile in the right spot.
**Counter-balance:** cooldown and the Rank Match rule.

**Art brief:** a red imp with tiny bat wings and a swirling purple-orange portal ring on a
stick. *Idle:* spinning the ring on one finger. *Attack (swap):* jumps through the ring and
vanishes in sparks. *Skill:* pops back out of a portal, grinning. *Portrait:* peeking through
the portal ring.

---

### 4.3 Mirror Slime (Rare · Poison · Elemental)
*"It wobbles, it watches, and then it's suddenly someone else."*

**Ability: Mirror (passive).** Every so often, the Mirror Slime **turns into a copy of a random
neighbour of the same rank**. If no neighbour matches, it waits and tries again as soon as one
does.

- It never copies support units or awakened units.
- A wobble and a mirror-shine warn 2s before it transforms.

| Rank | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 |
|---|---|---|---|---|---|---|---|
| Mirror every | 25s | 23.5s | 22s | 20.5s | 19s | 17.5s | 16s |

Interval is divided by the card multiplier, with a floor of 8s.

**Strategy:** the hands-off Mime. Surround it with same-rank units and it makes pairs on its
own. Pairs well with the Portal Imp (move a target next to it).
**Counter-balance:** you don't choose which neighbour it copies, and it's slow.

**Art brief:** a jelly slime with a shiny mirror-like surface, little crown of bubbles.
*Idle:* wobbling, reflections shifting. *Attack (mirror):* stretches up into a mirror shape and
flashes. *Skill:* splits into sparkles. *Portrait:* the slime holding a hand mirror.

---

### 4.4 Lucky Cat (Rare · Nature · Beast)
*"Wave the paw, keep the luck."*

**Ability: Fortune (aura).** When **two neighbours of the Lucky Cat merge** (or a neighbour is
merged into), there's a chance the result is **the same unit that went in** instead of a
random deck unit. A gold coin bursts out when it triggers.

- Merges *of the Lucky Cat itself* follow the normal random rule.
- If two Lucky Cats both neighbour a merge, only the best chance counts (no stacking).

| Rank | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 |
|---|---|---|---|---|---|---|---|
| Keep chance | 21% | 27% | 33% | 39% | 45% | 51% | 57% |

The chance is multiplied by the card multiplier and capped at **60%**.

**Strategy:** commit to one main damage dealer and climb it to ★7. Set up merges next to the
cat with the Portal Imp.
**Counter-balance:** it's a chance, never a certainty, and only next to the cat.

**Art brief:** a beckoning-cat style figure (white and gold, red collar with a bell) holding a
gold coin, one paw waving. *Idle:* paw waving slowly. *Attack:* tosses the coin and catches it.
*Skill:* coin shower. *Portrait:* winking cat with a coin. Keep it original (not a copy of a
specific real mascot).

---

### 4.5 Hourglass Owl (Epic · Lightning · Construct)
*"A clockwork owl that makes time run faster for its friends."*

**Ability: Overclock (aura).** Neighbours **charge their ultimate faster**. Neighbours that
can't use an ultimate yet (not awakened) attack a little faster instead.

| Rank | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 |
|---|---|---|---|---|---|---|---|
| Ultimate charge | +30% | +40% | +50% | +60% | +70% | +80% | +90% |
| Attack speed (non-awakened) | +10% | +13% | +17% | +20% | +23% | +27% | +30% |

Both are multiplied by the card multiplier. Ultimate charge caps at **+150%**, attack speed at
**+50%**. The attack-speed part stacks with buff units.

- Shown on neighbours with the same kind of badge as buff units, in **teal** with a clock icon
  ("+50% ⏱").

**Strategy:** the partner for awakened units. Stand it next to an awakened unit and its
ultimate fires far more often.
**Counter-balance:** weak until something awakens, and it takes a tile next to your carry.

**Art brief:** a brass clockwork owl with gear wings and an hourglass in its chest, blue
lightning glints. *Idle:* head tilting, hourglass sand falling. *Attack:* hourglass flips with
a lightning crackle. *Skill:* wings spread, clock-face halo. *Portrait:* owl face with a clock
dial behind it.

---

### 4.6 Echo Spirit (Epic · Ice · Undead)
*"Every great move deserves an encore."*

**Ability: Encore (aura).** When a **neighbour casts its ultimate**, the Echo Spirit **repeats
it** 0.6s later on the same spot, at reduced strength. Mana ultimates echo too (they give a
share of the mana again).

| Rank | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 |
|---|---|---|---|---|---|---|---|
| Echo strength | 25% | 30% | 35% | 40% | 45% | 50% | 55% |

Multiplied by the card multiplier, capped at **75%**. One echo per ultimate, even with two Echo
Spirits next to it.

**Strategy:** an all-in awakening card. With an Hourglass Owl on the other side, an awakened
unit's ultimate fires often *and* twice.
**Counter-balance:** does nothing until a neighbour awakens.

**Art brief:** a translucent blue ghost with a frosty wisp tail and a little ice bell.
*Idle:* drifting up and down. *Attack:* rings the bell, frosty sound rings. *Skill:* splits
into a ghostly double. *Portrait:* ghost holding the bell close.

---

### 4.7 Banner Herald (Rare · Fire · Human)
*"When a hero awakens, the whole army rallies."*

**Ability: War Cry (board-wide).**
- **Banner:** every attacking unit on the board deals **+X% damage for each awakened unit** on
  the board.
- **Battle shout:** whenever any unit awakens, all units attack **+30% faster for 6s**.
- With two Banner Heralds on the board, only the highest-rank one counts.

| Rank | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 |
|---|---|---|---|---|---|---|---|
| Damage per awakened unit | +5% | +6% | +7% | +8% | +9% | +10% | +11% |

Multiplied by the card multiplier. Total bonus caps at **+60%**.

**Strategy:** rewards decks that awaken several units. Doesn't care where it stands.
**Counter-balance:** worthless with no awakened units, and only one counts.

**Art brief:** a young squire with a huge red-and-gold war banner and a horn. *Idle:* banner
waving in the wind. *Attack:* plants the banner, it flares. *Skill:* blows the horn (war cry).
*Portrait:* proud squire with the banner behind.

---

### 4.8 Gnome Brewer (Rare · Nature · Gnome): the mana farm
*"Slow and steady fills the cauldron."*

The pure economy unit, in the spirit of Rush Royale's cauldron and the Bloons TD Banana Farm.

**Ability: Brew (passive).**
- **Brews mana** every 5s.
- **Harvest:** at the end of every wave it survives, it pays a bonus that grows with the wave
  number, so the farm stays useful late in the game.
- **Bubble tap (optional bonus):** each brew pops a mana bubble over the pot. Tapping it gives
  **+25%**. If you don't tap, it collects itself after 2s, so tapping is a reward, never a chore.
- **Buff units speed up its brewing** (haste shortens the 5s timer).

| Rank | ★1 | ★2 | ★3 | ★4 | ★5 | ★6 | ★7 |
|---|---|---|---|---|---|---|---|
| Mana per brew (every 5s) | 8 | 16 | 24 | 32 | 40 | 48 | 56 |
| Harvest at end of wave | 1 × wave | 2 × wave | 3 × wave | 4 × wave | 5 × wave | 6 × wave | 7 × wave |

Both are multiplied by the card multiplier. For comparison, a Raccoon Thief (which also attacks)
makes 5 × rank mana every 6s, so the Brewer makes about twice as much at the same rank.

**Strategy:**
- **Greed or safety:** one or two Brewers early means fast power-ups but weaker first waves.
- **Powering up the farm** is an investment: it costs mana now and pays it back over time.
- **The merge dilemma:** merging two Brewers trades a farm for a random, stronger unit.
**Counter-balance:** a tile that never fights, and the board has only 15 tiles.

**Art brief:** a round-bellied gnome with a pointy green hat stirring a bubbling copper
cauldron with a ladle; blue mana bubbles. *Idle:* stirring. *Attack (brew):* lifts the ladle,
a mana bubble rises. *Skill:* harvest dance, coins and bubbles. *Portrait:* gnome tasting the
brew, steam rising.

---

## 5. Example decks

| Deck | Cards | Plan |
|---|---|---|
| **The Understudy** | Mime, Lucky Cat, Fox Samurai, Valkyrie, Hooded Archer | Copy and steer merges until Valkyrie awakens. |
| **Clockwork Encore** | Hourglass Owl, Echo Spirit, Mime, Crystal Queen, Lava Golem | Awaken one unit, flank it with the Owl and Echo for constant double ultimates. |
| **Gold Rush** | Gnome Brewer, Portal Imp, Lute Bard, Star Astronomer, Storm Totem | Farm early, power up hard, and Imp the carry next to the Bard. |
| **Hall of Heroes** | Banner Herald, Mime, Mirror Slime, Valkyrie, Phoenix Chick | Awaken two or three units and let the Herald multiply them. |

---

## 6. PvP

Support units work in PvP with the same rules.

- **Mime, Portal Imp, Mirror Slime** only touch your own board. They become new player actions
  in the PvP protocol (`copy`, `swap`, `hop`), checked by the server like summon and merge.
- **Lucky Cat:** the "keep" roll comes from the match's seeded random numbers on the server, so
  both players see the same result and it can't be faked.
- **Gnome Brewer:** mana also pays for monster sends in PvP, so a farm is worth more there.
  - The PvP send-spending cap (by match time) already limits how much farm mana can become sends.
  - Add a PvP multiplier for brew mana (`pvp.supportManaMult`, start **0.6**) and simulate.
- **Echo Spirit and Banner Herald** add to ultimates and damage like in solo.
- The **PvP bot** (`shared/pvpbot.ts`) needs simple rules: use the Mime when a copy completes a
  pair, swap the best unit next to a buff unit, keep at most one Brewer.

---

## 7. Screens and UI

- **Card and Details tab:** a new "SUPPORT" label in place of the style, the ability in one
  line ("Copies a unit of the same rank"), and the blurb.
- **Stats tab:** the effect per card level, per power-up and per rank, as for buff units (the
  table rows show chance, charge, cooldown or mana instead of damage).
- **Board:**
  - Ready / cooling-down ring at the feet of active units (Mime, Portal Imp).
  - While dragging a Mime or Imp, valid targets (same rank) glow green and the rest dim.
  - Teal badge on Owl neighbours, frost ring on Echo neighbours, banner icon on the Herald's
    damage bonus in the HUD, mana bubbles over the Brewer.
- **Tutorial:** the first time a support unit is summoned, a one-line tip ("Drag the Mime onto
  a unit of the same rank to copy it").
- **What's new popup:** shown once after updating to 1.1.0, with the key art and the 8 cards.

---

## 8. Getting the cards

- Added to the card pool like other Rare and Epic cards: chests, shop and card packs.
- **Launch gift:** every player gets one **Gnome Brewer** and one **Portal Imp** on first login
  after the update, so everyone can try the feature right away.
- **Launch event (optional):** "Cast Call", a week where daily quests reward support-unit
  cards and the epic chest shows the Mime.

---

## 9. Build plan (done except where section 14 says otherwise)

### 9.1 Shared logic (`shared/`)
- `units.ts`: new `support` archetype and a `support` kind field. 8 new unit entries with
  rarity, element, race, blurb. Style and perk not used.
- `effects.ts`: a `support` block with every number in section 4, caps and floors, and
  `effectSummary` lines for the cards.
- `sim.ts`: each support effect, plus bot logic for Mime, Imp and Brewer, so the simulator and
  the Playground can balance them.
- `pvpsim.ts` / `pvp.ts`: `copy`, `swap` and `hop` actions; seeded Lucky Cat rolls; PvP brew
  multiplier.
- `config.ts` / `server/src/config-store.ts`: fill defaults for older configs (`withSupport`).

### 9.2 Game (`game/src/`)
- `battle/Unit.ts`: support behaviour, timers, rings, badges, bubbles.
- `scenes/BattleScene.ts`: drag rules (copy, swap, hop, merge) and valid-target highlights;
  Lucky Cat merge hook; Echo replay of ultimates; Herald war cry; Brewer harvest at wave end.
- `scenes/DeckScene.ts`: SUPPORT label, Details and Stats tabs.
- Tutorial tips, "What's new" popup.

### 9.3 Admin (`admin/`)
- Units page: Support column. Effects page: support numbers. Playground: support effect lines.

### 9.4 Art
- 8 units × **idle, attack, skill** sprite sheets (16 frames, SD and HD), a card portrait each.
  No awakened art.
- Effect art: mask confetti, portal ring, mirror flash, coin burst, clock halo, frost echo,
  banner flare, mana bubble.
- Upload to R2 and add to `assets/` like the existing units.

### 9.5 Balance and testing
- Simulator runs: each support unit vs a plain attacker in the same slot, waves 1–80 on 3
  arenas, card levels 1/8/15. **Target:** a well-used support deck gains **+1 to +3 waves**,
  never +10. A misused one loses waves (that's the cost).
- PvP: bot-vs-bot matches with and without Brewer and Mime; neither should win over 55%.
- Playtest the drag rules on phone (precision of dropping a Mime on a ★2).

---

## 10. Success metrics

Track after release (needs the battle report counts the server already gets):

- **Pick rate:** at least 30% of active decks include a support unit after two weeks, but no
  single support unit is in more than 40% of decks.
- **Awakenings per run:** up for decks with Mime / Lucky Cat (counts.awakens is already
  reported).
- **Average best wave:** within +1 to +3 waves of before for top players.
- **PvP:** win rate of decks with a Brewer between 45% and 55%.
- **Retention:** day-7 return rate for players who opened the update.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Mime + Lucky Cat makes awakening trivial | Mime prep time, Lucky Cat cap 60%, simulate first; deck limit as a backup. |
| Brewer stacking stalls PvP or snowballs | PvP brew multiplier, send-spend cap, possibly max 1 Brewer per deck in PvP. |
| Drag mistakes on phone (copying the wrong unit) | Valid-target highlights; Mime only copies same rank so mistakes are limited. |
| Players feel support units are "useless" early | Owl gives attack speed before awakening; launch gift; clear tips. |
| Art cost: 8 new units | Ship in two waves if needed (see below). |

---

## 12. Rollout

- **Option A (recommended): one release, all 8.** One big "Arrival" moment for marketing.
- **Option B: two waves.**
  - 1.1.0: Mime, Portal Imp, Hourglass Owl, Gnome Brewer (copy, move, charge, economy).
  - 1.1.x: Mirror Slime, Lucky Cat, Echo Spirit, Banner Herald ("The cast grows").

---

## 13. Open questions

1. **Deck limit:** no limit at launch, or max 2 support units per deck from day one?
2. **Mime prep time:** is "stage fright" fun, or should the Mime instead flash for a second so a
   wrong drop can be cancelled?
3. **Bubble tap** on the Brewer: keep it (more engaging) or drop it (less to explain)?
4. **Launch gift:** which two cards, if any?
5. **Rollout:** all 8 at once, or two waves?
6. **Element vs race matchups** (still being studied separately): if they ship, do support units
   take part (their element would matter only for bonuses they give)?

---

## 14. Implementation (2026-10-05)

### What shipped in the code
- **One archetype per job** instead of one `support` archetype with a kind field: `mime`, `portal`,
  `mirror`, `lucky`, `hourglass`, `echo`, `herald`, `brewer` (`shared/units.ts`). That way
  each job has its own block on the admin Effects page and its own line in `effectSummary`.
  `isSupport()` and `noAttack()` in `shared/support.ts` group them.
- **Rules** shared by solo and PvP: `shared/support.ts` (formulas, neighbours, the Rank Match rule
  `canBecome`). Numbers: `shared/effects.ts` (`mime` ... `brewer` blocks, all editable).
- **Solo battle:** `BattleScene.ts` + `Unit.ts` (drag rules, rings, Lucky Cat merges, Echo
  encores, Herald damage and war cry, Brewer bubbles and harvest, one-time tips).
- **Playground and PvP:** `shared/sim.ts` (auras, timers, echoes, harvest) and `shared/pvpsim.ts`
  (new actions `copy`, `swap`, `hop`; Lucky Cat rolls from the board's seeded random numbers, so
  replays match). The PvP bot copies with a ready Mime. `PvpScene.ts` handles the drags and moves
  a swapped unit's view instead of re-summoning it.
- **Older live configs** get the 8 units appended (`withAddedUnits`) and the effect blocks filled
  in (`withEffectDefaults`).
- **Daily quests:** new goals `copies`, `swaps`, `brewed` and quests `mime_3`, `swap_5`,
  `brew_500` (weight 0.3; only in the default quest list, so add them to the live config on the
  admin Quests page).
- **Launch gift:** `RELEASE_GIFTS` in `shared/profile.ts` gives every account a **Portal Imp** and
  a **Gnome Brewer** once (on the next profile load). The profile records it in `releases`.
- **What's new popup:** `game/src/scenes/whatsNew.ts`, once per device, from the lobby.
- **Version:** `game/package.json` is 1.1.0.

### Decisions on the open questions
1. **Deck limit:** none at launch (as recommended).
2. **Mime prep time:** kept ("stage fright", 12s at Lv 1, floor 4s). A green ring shows when it's ready.
3. **Bubble tap:** kept in solo (+25% if tapped within 2s, else it collects itself). In PvP the
   mana is collected automatically (a tap would need a new network action).
4. **Launch gift:** Portal Imp + Gnome Brewer (as planned).
5. **Rollout:** all 8 at once.
6. **Element vs race matchups:** not part of this release.

### Art
- **Done (2026-10-06):** all 8 units have a still, a card portrait and real Seedance 1.5 Pro clips
  (idle, attack, skill at 480p; idle and attack at 720p), keyed with `tospritesheet.py`.
  About 10 credits per unit. The notes below are the history.
- Generated on Higgsfield (GPT Image 2.5, style anchor + a green-screen unit as references):
  Mime, Portal Imp, Mirror Slime, Lucky Cat, Echo Spirit (`assets/_green/`, keyed into `assets/units/`
  with `assets/keyimg.py`). The account then hit a **daily generation limit** ("grace period"), so
  Hourglass Owl, Banner Herald and Gnome Brewer have no art yet.
- **Placeholder animation:** `assets/stillsheet.py` builds idle and skill sheets (a bob and a hop)
  and the card portrait from each still, so the 5 units work in game now. Replace with Seedance clips
  later: idle, attack, skill at 480p and idle + attack at 720p (about 6 credits per unit), then run
  `tospritesheet.py` and `game/tools/build_assets.py`.
- **To finish the last 3:** generate their stills with the prompts in the art briefs above, key them,
  run `stillsheet.py` (or the Seedance clips), build the assets, upload to R2, then enable the units
  on the admin Units page and re-render the promo kit.
