# Command Mode (fantasy concept)

> Status: **fantasy**. This mode is not planned and not on the roadmap. It is an idea we wrote down to look at later.
> Pitch video: [command-mode/command-mode-pitch.mp4](command-mode/command-mode-pitch.mp4) (vertical, 57 s). Source: `roadmap-video/src/promo/CommandMode.tsx`. Render it with `npm run promo:cm` from `roadmap-video/`.

## The idea

Command Mode is a placement mode in the style of Bloons TD. It drops the random summon and merge loop of Classic.

1. **Draft.** The player picks a squad of at least 10 different units before the run.
2. **Place.** In battle, the player drags a card from the hand onto a build pad, or taps a card to place it on the selected pad. Each placement costs mana.
3. **Upgrade in place.** The player taps a placed unit and spends mana to raise its rank (1 to 7). Merging does not happen in this mode.

## The balance problem

Classic gates power with luck. Awakening needs rank 7, which needs about 64 summons of the same unit (2^6) to land and merge. With free placement, that gate is gone. A player can draft Fox Samurai, place it on every pad and awaken all of them. Six awakened Fox Samurai beat almost every wave, so the best strategy becomes "spam the strongest epic".

The goal is not to forbid spam. The goal is to make a mixed squad the better choice.

## Proposed fixes (use them together)

### 1. Copy cap per rarity
Limit the copies of one unit on the board.

| Rarity | Max copies |
|---|---|
| Common | 6 |
| Rare | 4 |
| Epic | 3 |
| Legendary | 2 |
| Mythic | 1 |

Fox Samurai (epic) is capped at 3. A board with 6 pads then needs at least 2 unit types.

### 2. Rising price for duplicates
Each extra copy of the same unit costs +50%: 100, 150, 225 mana. The first copy of a different unit stays at the base price, so variety is the cheap option.

### 3. One crown each
- Ranks are bought in place (Rank 1 to 7).
- Awakening is a separate, expensive upgrade at Rank 7.
- Only **one copy of each unit** may awaken.
- The board holds at most **3 awakened units**, and they must be different units.

Six awakened Fox Samurai become one awakened Fox Samurai plus two Rank 7 copies.

### 4. Waves that counter one-unit boards
Monsters already have traits in `shared/monsters.ts`: `fast`, `tank`, `armored`, `healer`, `splitter`, `dodge`, `frostproof`, `tether`. Command Mode waves should mix them on purpose, like Bloons uses camo and lead.

- Fox Samurai is heavy, single-target and an armor breaker. It wins against armored tanks.
- It loses against fast swarms and splitters, because it hits once every 1.2 s.
- Slow, chain and splash units (Frost Sorceress, Storm Whelp, Goblin Bomber) cover that gap.

The unit perks (`armor_breaker`, `giant_slayer`, `hunter`, `true_strike`, `finisher`, `frostbite`) then become the real draft decision.

## Optional extras
- **Squad synergy:** a small bonus for 3+ elements or races on the board (Banner Herald style).
- **Draft points:** each rarity costs points (common 1 to mythic 5) and a squad has a budget, so a squad of 10 mythics is not possible.
- **Pad types:** lane-side pads for melee, high ground for ranged. This limits where heavy melee units can stand.

## Open questions
- Does the mode use card levels from the collection, or a flat level for fairness?
- Does PvP get a Command variant, or is it PvE only?
- How do support units (Lucky Cat, Mirror Slime, Echo Spirit) work without merges? Several of them depend on the merge loop and need a new effect.
