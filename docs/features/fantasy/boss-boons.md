# Boss Boons (fantasy feature)

Status: idea only, on hold. Captured 2026-10-18.

Endgame help for solo runs. Top players report wave 60 getting hard, wave 70 the toughest and
wave 80 a wall. In the Unit Lab, the best test deck reached wave 80 with 3 awakened Crystal
Queens, 2 awakened Vampire Countesses and 1 Star Astronomer at 212 Star Merged (supports: Lucky
Cat, Gnome Brewer). The goal is to fix this without another round of unit tuning: give players
something fun that also keeps them afloat.

## Why the wall exists

- Monster HP grows `×1.19` every wave with no cap (`shared/sim.ts` `waveBaseHp`,
  `90 * 1.19^(n-1) * (1 + arenaIdx*0.12)`). That is about ×5.7 every 10 waves.
- Player power stops growing: max rank ★5, card level 15, power-up 5, 36 monsters on the board.
- So every deck hits a wall. A unit buff of ×1.19 buys about 1 wave.
- Observed in live boards: most have only **2 awakened units by wave 50**. Rising summon cost
  and random merges slow awakening down. Lucky Cat gets some boards to 3, at the cost of a slot
  that never attacks.

## The draft

- First pick after the **wave 50** boss, then every **10 waves** (60, 70, 80, 90, ...).
- Pick 1 of 3. One free reroll per pick.
- Rarity odds: Common 60%, Rare 30%, Epic 10%. The wave 100 pick is always Epic.
- Commons can repeat; repeats stack.
- Solo runs only, not PvP.
- Damage boons multiply with `boostMult`, so they keep pace with monster HP.
- Picks are rare, so each boon must be big: about ×1.8 power on average. Three picks by wave 80
  give about ×6, which moves the wall about 10 waves (to around wave 90).

## Boons

### Damage (Common)

- **Royal Decree**: +80% damage, all units.
- **Kingslayer**: +150% damage against bosses.
- **War Drums**: +40% attack speed, all units.
- **Crowd Breaker**: +100% damage against minions and tanks.

### Merge & Rank (Rare)

- **Star Surge**: each merge has a 25% chance to jump +2 ranks.
- **Promotion**: right away, 3 random units below ★5 gain +1 rank.
- **True Blood**: each merge has a 50% chance to keep the same unit (Lucky Cat for decks
  without one).
- **Royal Mint**: summon cost rises +5 per summon instead of +10.

### Mana (Common/Rare)

- **Treasury**: mana at wave start ×3.
- **Bounty Hunter**: mana from boss kills ×2.
- **Overcharge**: unlocks power-up levels 6–8, each +25% damage, costing 1500/2200/3000 mana.

### Awakened & Ultimates (Rare)

- **Ascended Court**: awakened units deal +60% damage.
- **Swift Crown**: ultimate cooldown −35%.
- **Twin Cast**: each ultimate has a 30% chance to cast twice.

### Defense (Common)

- **Extra Keep**: +1 life, up to 5.
- **Iron Gate**: a leaked boss costs 2 lives instead of 3.
- **Frost Moat**: all monsters move 15% slower.
- **Breach Bell**: the first leak each wave costs no life.

### Pacts (Epic, with a drawback)

- **Blood Pact**: +200% damage, but lives drop to 1.
- **Glass Throne**: +150% damage, but summons cost ×2.
- **Last Stand**: +40% damage for each life lost.

### Epic

Reworked to build on awakening, since awakening at ★5 is what carries players to waves 50–60.

- **Ascension**: merge two copies of the same awakened ★5 unit into an **Ascended** unit. A
  unit can ascend once. See "Ascension math" below; the multiplier is not settled.
- **Court of Legends**: each awakened unit on the board gives all units bonus damage, no cap.
  At +10% per unit it is too weak (a typical 2-awakened board gets +20%). Raise it to about
  +40% per unit, or drop it.
- **Regicide**: ultimates also deal 1% of a boss's max HP and 3% of a minion's max HP. The only
  boon that scales with HP, so it still works at wave 100+. Test in the Lab first: a big
  awakened board could make runs endless.
- **Echo of Kings**: +15% damage for every boon held, this one included.

Dropped during discussion: Guild Hall (support effects ×2), Gold Fever (coins ×2 for +30%
monster HP), Crown Jewel (every ★5 counts as awakened, which awakening already does) and Sixth
Star (★6 merges, which mostly repeats awakening).

## Ascension math

Worked example: Void Titan, card level 3, ★5, code defaults (`units.ts` `SEED_DAMAGE`,
`awakened.ts` `void_titan`). The live D1 config may have retuned these.

| Step | Damage per hit | Attacks/s | DPS |
|---|---|---|---|
| Base (mythic 82 × heavy 1.43) | 117 | 0.49 | 57 |
| Card level 3 (×1.16 dmg, ×1.06 spd) | 136 | 0.52 | 71 |
| ★5 (×5 dmg, ×1.32 spd) | 680 | 0.69 | 467 |
| Awakened (×3 dmg, ×3 spd) | 2,041 | 2.06 | 4,199 |
| Ascended at ×2 dmg | 4,082 | 2.06 | 8,398 |

- Against bosses: Giant Slayer +40%, and the awakened execute (10% chance, ×4 on bosses) adds
  about ×1.3 on average. Ascended ×2 boss DPS is about 15,300, or about 26,700 with power-up 5.
- **Problem:** ×2 gives no gain. Ascension uses up two awakened units to make one, and two
  units at ×1 deal the same as one at ×2. The only gain is a free board slot. With most boards
  holding just 2 awakened units at wave 50, players would lose an awakened unit for nothing.
- **Proposed fix:** Ascended = ×3 damage and ×1.25 attack speed (about ×3.75 DPS from two
  units, a net ×1.9, worth about 4 waves), plus an upgraded ultimate per unit. Void Titan: 3
  black holes instead of 2, radius 180, execute 15%.

## Attempt rewards

Each run pays a milestone chest at every 10 waves from wave 50, even if the run ends right
after:

| Wave reached | Chest |
|---|---|
| 50 | Silver |
| 60 | Gold |
| 70 | Epic |
| 80 | Legendary |
| 90+ | Legendary, plus gems for every 10 waves |

## Open questions

- Ascension input: two awakened ★5 copies (rare without Lucky Cat), or an awakened ★5 plus any
  ★5 copy of the same unit (much easier)? True Blood would combo with either.
- Final Ascension multiplier (×3 damage / ×1.25 speed proposed) and each unit's upgraded
  ultimate.
- Court of Legends: +40% per awakened unit, or drop it.
- Regicide percentages after Lab testing.
- A gentler HP curve after wave 50 (`1.19` to about `1.13`) was suggested alongside the boons
  but not chosen. If it ever ships, trophy gain per wave is uncapped, so the Secret Society
  trophy math needs a cap or a lower `gainPerWave` above wave 50.
- A permanent coin-sink upgrade tree ("Keep Upgrades") was suggested and not chosen.
