# v2.7.0 "The Great Awakening" (working title)

**Status:** in progress · **Version:** game `2.7.0` + API · **MIN_CLIENT:** `2.7.0` · **Promo kit:** [PROMO.md](PROMO.md)

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

## 6. Design note
- Awakened commons are intentionally stronger than the current mythics. Mythics are revamped later in 2.7.

## 7. Placeholders (TBD)
- **Rares:** TBD
- **Epics:** TBD
- **Legendaries:** TBD
- **Mythics:** TBD (revamp follows the commons)
- **Event units:** TBD

## 8. Release checklist
- [ ] HOTFIXES entry `2.7.0-max-rank` in `shared/config.ts` (economy: `maxRank`).
- [ ] `MIN_CLIENT` bumped to `2.7.0`.
- [ ] Golden rewrite: `node scripts/golden.ts --write`.
- [ ] Website export.
- [ ] `whatsNew` entry.
- [ ] CHANGELOGs (game and API).
- [ ] Game and API deployed together.
