# v2.7.0 "The Great Awakening" (working title)

**Status:** live 2026-10-14 · **Version:** game `2.7.0` + API · **MIN_CLIENT:** `2.7.0` · **Promo kit:** [PROMO.md](PROMO.md)

A revamp of every unit, done rarity by rarity. Commons come first and are fully specified below.
Rares, Epics, Legendaries, Mythics and event units are placeholders until their pass is designed.

## 1. Summary
- Card levels now raise attack speed as well as damage.
- Maximum merge rank drops from 7 to 5, so awakening is reached sooner.
- Every awakened unit gets its own permanent damage and attack speed multipliers and its own ultimate.
- The 8 awakened commons ship with bespoke awakenings. Units without art never awaken.

## 2. Card levels
- Damage still rises +8% per level.
- **New:** attack speed rises +3% per level, linear: `1 + (level - 1) × 0.03` (`ECONOMY.levelSpeedBonus = 0.03`).
  Level 15 gives `×1.42` speed.

## 3. Merge rank cap: 7 → 5
- `ECONOMY.maxRank` goes from 7 to 5. Awakening now needs 15 summons instead of 63.
- Peak rank damage is `×5` instead of `×7`. This is accepted by design: the faster path to awakening
  is worth more than the lost ceiling.
- Live configs receive the change through the HOTFIXES entry `2.7.0-max-rank` (`economy: ["maxRank"]`
  in `shared/config.ts`). This needed new economy support in `withHotfixes`.
- The Trial (`b2s5c1`) lends a witness at rank 5. At the new max rank it would awaken, so it drops to rank 4
  (HOTFIXES `2.7.0-witness-rank`).

## 4. Awakenings and ultimates
- **Definitions in code, not in the saved D1 config.**
  - `shared/awakened.ts` holds the numbers and the player-facing text.
  - `shared/ultimates.ts` holds the behavior.
- A unit awakens at max rank when the game has its awakened art (`Sim.awakensAt`).
- A unit with an entry gets its own permanent damage and speed multipliers and its own ultimate.
- A unit without an entry keeps the generic awakening: `ECONOMY.awakenDamageMult` (×1.5), `ECONOMY.awakenSpeedMult` (×1.2),
  and a radius strike every `ECONOMY.ultimateCooldown` (10 s) that deals `ECONOMY.ultimateDamageMult` (×4).
- **Timer ultimates** are cast every `every` seconds of charge.
  - Hourglass Owls charge them faster.
  - Echo Spirits repeat them at echo strength.
- **Passive ultimates** change every attack. They have no charge and cannot be echoed.
  - Hourglass Owls give attack speed instead.

## 5. Commons

Damage and speed are the awakened multipliers on the unit's base stats. Numbers are copied from `shared/awakened.ts`.

| Unit | Damage | Speed | Ultimate | Type | What it does |
|---|---|---|---|---|---|
| Hooded Archer | ×3 | ×3 | Multi-Shot | Passive | Every attack fires 3 arrows at 3 different monsters, each at full damage. |
| Fox Spearman | ×3 | ×3 | Burning Spear | Timer, 5 s | A spear pierces the 5 leading monsters for ×3 damage and sets them burning (50% of a hit per second, 3 s). |
| Goblin Bomber | ×5 | ×1 | Bomberman Mode | Timer, 6 s | Throws 4 bombs onto the path (spread 90 px), each blasting ×2 damage in a 90 px radius. |
| Flame Adept | ×3 | ×3 | Fire-o'-Wisp | Timer, 3 s | A wisp sets 3 random monsters burning (60% of a hit per second, 4 s). |
| Clockwork Turret | ×2 | ×4 | Tesla Coil | Passive | Every attack also zaps a random monster, chaining to 2 more for 50% of a hit. |
| Wolf Hunter | ×3 | ×3 | Primal Roar | Timer, 10 s | Stuns every monster for 2 s (bosses 1 s). Stunned monsters ignore the next roar for 4 s. |
| Pirate Gunner | ×3 | ×2 | Broadside | Timer, 8 s | 5 cannonballs pound the path from the front (spacing 70 px), each blasting ×2 damage in a 90 px radius. Kills pay ×2 plunder. |
| Shield Knight | ×4 | ×2 | Judgment Slam | Timer, 8 s | Slams the strongest monster for ×8 damage and curses everything within 170 px: +25% damage taken for 5 s. |

**No awakened art, so they never awaken:** Penguin Wizard, Tesla Gnome, Cactus Gunslinger, Wind Sylph.

## 6. Rares

Rule changes (numbers live in `shared/reworks.ts`; `liveDef()` applies kit changes so the Sim, card back and website agree):

- **Frog Alchemist:** never awakens. Each attack drops a poison puddle (radius 70 px) that deals his hit per second.
  - Lasts 5 s, +0.2 s per card level above 1, +0.5 s per in-battle power-up.
  - Damage rises with rank (it is his hit). Overlapping puddles don't stack.
- **Raccoon Thief:** base damage 10. A mana pulse comes every 6 s (0.1 s faster per card level above 1, min 3 s).
  - Pays 5 mana, +2 per rank above 1, +3 per power-up.
- **Vine Druid:** never attacks. Grows one prickly vine ahead of the front monster.
  - Holds monsters for 3 s (bosses 1 s) and deals her hit per second to monsters in it. Regrows 6 s after it withers.
- **Snowglobe Fairy:** base freeze chance 20% (was 12%); it still rises with rank.
- **No awakening:** Imp Hunter, Frog Alchemist, Witch Doctor, Pumpkin Scarecrow, Ogre Chef, Emberhold Gunner, Runecaller.

Awakened rares (multipliers from `shared/awakened.ts`; "field" ultimates are always on, with no charge and no echo):

| Unit | Damage | Speed | Ultimate | Type | What it does |
|---|---|---|---|---|---|
| Ember Witch | ×3 | ×3 | Scorched Earth | Timer, 45 s | Scorches the whole path for 25 s. Every monster on it burns (50% of a hit per second), new waves too. |
| Frost Sorceress | ×3 | ×3 | Winter Storm | Timer, 10 s | Slows every monster 50% for 4 s and freezes 5 random monsters for 3 s (bosses 1 s). |
| Bee Keeper | ×0 | ×0 | Bee Hives | Always on | Stops attacking. 2 hives fire swarms at any monster: base 45 damage, 1.8 attacks/s, scaled like a unit (rank, card level, power-ups). |
| Bear Rider | ×3 | ×3 | Iceborn Warmother | Passive | +150% damage to bosses. |
| Gear Engineer | ×2 | ×4 | Overheat | Timer, 25 s | Overheats for 10 s: base attack speed 2/s, shots lose their splash. Then jams for 2 s. |
| Sand Monk | ×1.5 | ×5 | Ultra Focused | Passive | Stun becomes a 65% chance to crit for ×2.5. Adds Giant Slayer on top of True Strike. |
| Spore Sage | ×3 | ×3 | Mushroom Puff | Always on | A mushroom sprouts every 2 s (max 5) and grows for 3 s, then stays until the first monster to touch it bursts it: 90 px, 90% slow for 6 s plus poison (bosses 45%). |
| Storm Totem | ×3 | ×3 | Rag Doll | Timer, 35 s | 4 rag dolls stand along the path for 15 s, then 20 s without. Monsters within 50 px are slowed 60% and zapped for a hit per second. |
| Thunder Dwarf | ×3 | ×3 | Grace of Mjolnir | Passive | Every attack also chains lightning to up to 5 more monsters for 60% of the hit. |
| Vine Druid | ×3 | ×1 | Vineyard | Always on | The whole path stays overgrown. Monsters on it take her hit per second. Vines no longer block. |

## 6b. Epics
Crystal Golem through Plague Alchemist are the user's designs. Shadow Ninja, Storm Whelp, Treant Guardian, Bone Necromancer and Tide Mermaid were suggested by Claude and accepted. The other seven epics have no awakened art and keep the generic awakening for now.

| Unit | Damage | Speed | Ultimate | Type | What it does |
|---|---|---|---|---|---|
| Crystal Golem | ×6 | ×0.2 | Crystal Throw | Timer, 10 s | Hurls a giant crystal at the thickest crowd: ×2 damage within 180 px. |
| Fox Samurai | ×3 | ×3 | Blade Dance | Passive | Crit is a fixed 70% for ×3.5; 100% while a boss is on the board. Adds True Strike and Giant Slayer. |
| Moon Oracle | ×3 | ×2 | Moonshine | Timer, 15 s | Luna's Blessing on 4 random attacking units (itself included) for 10 s: +50% damage, +50% attack speed, +5 mana per attack. Blessings stack. |
| Phoenix Chick | ×3 | ×4 | Reborn | Timer, 30 s | Waits until a monster is 85% down the path. Egg for 5 s (no attacks) while every monster burns (65% of a hit per second), then hatches: every monster stunned 10 s (bosses 5 s). |
| Plague Alchemist | ×1 | ×1 | Black Plague | Passive | Every throw lands a black puddle on a random spot of the stretch the monsters walk: 90 px, 10 s, 75% slow (bosses half), a hit per second; puddles stack. +1 puddle per throw per 25 kills (max 4). Kill tally over his head. |
| Shadow Ninja | ×3 | ×4 | Shadow Clones | Timer, 12 s | 2 clones for 8 s copy every attack at 50% damage (crits roll). |
| Storm Whelp | ×2 | ×4 | Hunting Storm | Timer, 8 s | Bolts hit the 6 fastest monsters for ×3; Shocked: +30% damage taken for 4 s (shares the Judgment Slam curse). |
| Treant Guardian | ×2 | ×3 | Forest Grasp | Timer, 10 s | Roots grab the 5 strongest monsters for ×2 and hold them 3 s (bosses 1 s). |
| Bone Necromancer | ×4 | ×2 | Raise Dead | Passive | Monsters that die under his curse rise as skeletons (max 5, 20 s) walking back up the path; the first monster they meet sets them off for ×3 within 100 px. |
| Tide Mermaid | ×3 | ×3 | Tidal Wave | Timer, 12 s | Washes every monster 120 px back (bosses 40 px) for ×1.5 and slows 40% for 3 s. |

Echo Spirits don't repeat Moonshine, Reborn, Shadow Clones or Tidal Wave. New art: Crystal Golem and Plague Alchemist awakened forms. Tide Mermaid's awakened sheets are procedural, because Higgsfield's filter blocked her clips. VFX added: crystal_boulder, crystal_shatter, phoenix_egg, black_puddle, plague_skull, tidal_wave, root_grasp, and bone_skeleton (a copy of the skeleton_soldier monster art).

## 6c. Legendaries (and two mythics)
The user's designs. Void Titan and Chrono Mage are mythics, done with this pass.

| Unit | Damage | Speed | Ultimate | Type | What it does |
|---|---|---|---|---|---|
| Vampire Countess | ×3 | ×3 | Queen's Gambit | Passive | Every monster spawns kissed; her kisses pay 3 mana (not 2) plus her Plunder when it dies. |
| Sun Priestess | ×1 | ×3 | Retribution | Passive | Still never attacks. Her buff ×3 × 2.4 (cap +300% attack speed); neighbours +30% damage, True Strike, Giant Slayer, 25% stun per hit. A neighbouring Shield Knight awakens (any rank). |
| Star Astronomer | ×3 | ×3 | Star Merger | Passive | Every other Star Astronomer on the board, and every new one, merges into her: +20% damage, +10% attack speed per absorbed rank. Star counter over her head. |
| Crystal Queen | ×2 | ×4 | Frozen Fields | Timer, 55 s | Freezes every monster 10 s (bosses 5 s); the path is iced 40 s (75% slow). She can't attack during the ice; the cooldown runs from the cast. Freeze chance 45%. |
| Void Titan | ×3 | ×3 | Black Hole | Timer, 35 s | 2 black holes (120 px, 25 s) on the thickest crowds. Monsters caught can't move and are pulled to the centre (bosses too). No damage. Execute chance 10%. |
| Chrono Mage | ×1 | ×4 | Big Ben | Timer, 45 s | 4 random attacking units ×1.8 attack speed for 12 s, then rank +1 (reaching max rank with art, they awaken). |

- **Vampire's Kiss (awakened or not):** every hit kisses the monster. A kissed monster that dies (anyone's kill) pays 2 mana plus her Plunder (`REWORKS.vampire_countess`).
- Echo Spirits don't repeat Frozen Fields, Black Hole or Big Ben.
- No new art. Black holes and the frost tint are drawn in code (`game/src/battle/fields.ts`).

## 7. Design note
- Awakened commons are intentionally stronger than the current mythics. Mythics are revamped later in 2.7.

## 8. Placeholders (TBD)
- **Epics without awakened art:** Cyclops Smith, Lava Golem, Magnet Robot, Minotaur Gladiator, Lantern Ghost, Sand Worm, Card Jester (TBD)
- **Legendaries without awakened art:** Anubis Priest, Lion Paladin, Spider Queen, Unicorn Knight, Valkyrie (TBD)
- **Mythics without awakened art:** Dragon Egg, Monkey King (TBD)
- **Event units:** TBD

## 9. Release checklist
- [x] HOTFIXES entry `2.7.0-max-rank` in `shared/config.ts` (economy: `maxRank`).
- [x] `MIN_CLIENT` bumped to `2.7.0`.
- [x] Golden rewrite: `node scripts/golden.ts --write`.
- [x] Website export.
- [x] `whatsNew` entry.
- [x] CHANGELOGs (game and API).
- [x] Game and API deployed together.

## 10. Retired supports
Mirror Slime, Banner Herald and Mime are off (`enabled: false` in `shared/units.ts`; live configs get it through the HOTFIXES entry `2.7.0-retired-supports`).
- They no longer drop, can't go in decks, and leave the Unit Lab and PvP bot pools. Saved decks drop them on load and refill from owned cards (`server/src/users.ts`).
- Owners still see the card in their collection, marked "Currently unavailable".
- The daily quest `mime_3` (copies) is no longer picked.
