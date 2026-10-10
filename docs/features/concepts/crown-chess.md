# Crown Chess (fantasy concept)

> Status: **fantasy**. Not planned, not on the roadmap.
> Pitch video: [crown-chess/crown-chess-pitch.mp4](crown-chess/crown-chess-pitch.mp4) (vertical, 59 s). Source: `roadmap-video/src/promo/CrownChess.tsx`. Render with `npm run promo:cc` from `roadmap-video/`.

## The idea

An auto-chess mode in the style of Mobile Legends Magic Chess, Dota Auto Chess and TFT, fitted to a tower defense board.

1. **Shop.** Each round shows 5 random units. Price = rarity: Common 1 gold up to Mythic 5. Reroll costs 2, and buying XP raises your level, which raises how many pads you can fill.
2. **Three of a kind.** 3 copies make a 2★ unit. Three 2★ make a 3★, and 3★ is the awakened form.
3. **Synergies.** The element is the origin trait (6 elements). The perk is the class trait (`armor_breaker`, `giant_slayer`, `hunter` ...). Bonuses at 2 / 4 / 6.
4. **Duel rounds.** Units don't fight units in a TD. Instead you and your paired opponent defend the same seeded wave. The player with fewer leaks (tie: faster clear) wins. The loser loses HP = base + the winner's surviving stars.
5. **Creep rounds** (PvE) drop gold and items between duels.
6. **8-player lobby.** Last keep standing wins. The 8 heroes act as player avatars.

## Why it fits

| We already have | It becomes |
|---|---|
| 5 rarities | 5 shop prices |
| 6 elements, well spread (fire 17, arcane 17, nature 16, poison 11, lightning 11, ice 6) | origin traits |
| Perks | class traits |
| Merge system | 3-of-a-kind stars |
| Seeded deterministic sim (`shared/sim.ts`) | async ghost duels |
| PvP server, bot (`shared/pvpbot.ts`) | lobbies and bot fill |
| 78 units | a full set (TFT sets are about 60) |

Races are too uneven for traits (24 Human, 1 Orc, 1 Goblin), so use elements and perks instead.

**Shared pool.** Each unit has a fixed number of copies per lobby. If 3 players chase Fox Samurai, nobody finds enough. This also answers the spam problem from [Command Mode](command-mode.md).

## New build
- Shop, gold, interest and win/loss streaks, XP levels with rarity odds per level.
- Trait bonuses and their UI.
- Lobby flow: rounds, pairing, HP, elimination.
- **Async ghosts first:** store a board snapshot per round in D1 and duel it with the seeded sim. No realtime server needed. Realtime 8-player lobbies can come later or never.

## Open questions
- Ice has only 6 units; it needs more or a lower trait breakpoint.
- How do support units (Lucky Cat, Mirror Slime) work in a shop economy?
- Does collection card level apply, or is everything flat for fairness?
