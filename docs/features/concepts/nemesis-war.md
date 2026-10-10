# The Nemesis War (retention pitch)

> Status: **pitch**. Not on the roadmap yet.
> Pitch video: [nemesis-war/nemesis-war-pitch.mp4](nemesis-war/nemesis-war-pitch.mp4) (vertical, 61 s). Source: `roadmap-video/src/promo/Nemesis.tsx`. Render with `npm run promo:nm` from `roadmap-video/`.

## The pitch

Monsters that escape remember you. They grow, they hunt you and your friends, and every week the worst of them fuse into one Warlord that the whole server fights. The result of that fight decides the next Story chapter.

It combines three proven ideas that we haven't seen together in a tower defense game:

| Source | What we take |
|---|---|
| Shadow of Mordor (Nemesis system) | Enemies with names, ranks and memory |
| Dark Souls (invasions) | Your enemy crashes into a friend's game |
| Helldivers 2 (Galactic War) | One server-wide war whose outcome is canon |

## 1. A nemesis is born
- Some leaked monsters (not all: about 1 per run at most) survive as a **nemesis**.
- It gets a generated name and title ("Skrit the Ember-Scarred"), a **rank**, and a **scar**.
- **Scar:** the element that hurt it most becomes a resistance (for example −50% Fire).
- **Grudge:** it remembers your deck and shows up in runs where you use that deck.
- It taunts with the existing emotes.

## 2. It comes back
- It appears as a mini-boss in later runs, one rank higher for each escape.
- Its scar punishes using the same deck again, so it pushes players to vary their decks without any hard rule.
- **Revenge:** killing it drops its trophy and a bounty that grows with its rank.

## 3. It invades your friends
- You can send your nemesis into a friend's run.
- If they kill it, you split the bounty. If it escapes again, it ranks up for you.
- This is async: it uses the seeded sim, so no realtime connection is needed.

## 4. The Warlord (weekly)
- Every Sunday, the top nemeses of the week fuse into a **Warlord** boss for the whole server.
- Health is shared across all players.
- **The meta balances itself:** the Warlord resists the element that dealt the most damage that week (from the analytics we already collect).

## 5. The server writes the story
- Win: a region on the world map is freed, and the next chapter continues that story.
- Lose: corruption spreads on the map, and the next chapter is a rescue.
- This ties into the Chaos Corruption story books.

## Why players come back
- **A personal story** each player can share ("my nemesis").
- **A daily reason:** your nemesis grew, and revenge is waiting.
- **A social reason:** friends invade each other and split bounties.
- **A weekly reason:** the Warlord, and a story that depends on the community.
- **Free balance work:** the scar and Warlord resistances push against whatever deck or element is over-used.

## What we already have
Monster traits, emotes, a seeded deterministic sim, bosses with skills, the world map, D1 for state, the analytics behind the admin panel, the friend challenge codes, and Story mode.

## New build
- Nemesis records per player in D1: id, base monster, name, rank, scar, grudge, escapes.
- A name and title generator.
- Visual variants: tint, scar overlay, rank glow (no new art needed; bespoke art later).
- Invasion inbox, bounty split, Warlord event and a world map state.

## Open questions
- How often can a nemesis spawn before it feels unfair?
- Should a nemesis ever retire or die of old age?
- Does PvP get nemeses (you send yours as a send)?
