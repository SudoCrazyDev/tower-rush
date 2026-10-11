# v2.2.0 "Sand & Sea"

**Status:** Live (2026-10-11) · **Version:** `2.2.0` · **Promo kit:** [PROMO.md](PROMO.md) ·
**Story pitches:** [saga plan](../concepts/forsakens-saga.md) (sections 2-3)

Book 2 "Chaos Corrupted" continues with two stories in one release. **Story 2, "The Drowned
Coast":** a grieving lighthouse keeper holds the tide still with a stolen Orb. **Story 3, "The
Throne of Dust":** a freed gladiator grinds her desert city into identical Faceless in the name of
equality. Each story brings new board mechanics, and Story 3 breaks the chapter pattern used so far
(guardian boss, then a 20-wave gauntlet).

---

## 1. What ships

- **Book 2 Story 2: The Drowned Coast** (3 chapters).
- **Book 2 Story 3: The Throne of Dust** (3 chapters).
- **New board mechanics:** tide cycle, tide pools, rolling isle, masks and braziers, arena duel,
  crowd favor, purify (a boss with a chains bar instead of HP), the sphinx's cage.
- **New boss skills:** anchor hook, siren song, lantern beam, mimic, burrow, equal ground.
- **2 Event rarity story cards:** Maren, the Tide-Born (Story 2) and Bako, Chainbreaker (Story 3).
  Not in chests. Replays drop copies (section 9).
- **2 badges:** Tidewarden and Dunewarden.
- **Art:** about 350 Higgsfield credits (section 6).

The Book 2 placeholder already has `planned: 5`, so the lobby shows these two as "Coming soon" until
they ship.

## 2. Story 2: "The Drowned Coast" (`b2s2`)

Unlocks after finishing Book 2 Story 1 (`wilds_warden`). No trophy gate.

| # | Id | Chapter | Layout | Waves | Bosses | Notes |
|---|---|---|---|---|---|---|
| 1 | `b2s2c1` | The Stranded Harbor | `pirate_beach` | 10 | Bosun Grell (wave 10) | Tide cycle at low strength. Tide pools side objective. |
| 2 | `b2s2c2` | Ondrath, the Sleeping Isle | `coral_reef` | 1 (boss only) | Ondrath | **Cleanse the shell:** Ondrath lies still at the path start and cannot be hurt. Barnacle clusters grow on the path beside the board in 3 stages (2, 2, 1); each breeds Barnacle Spawn (max 3 alive per cluster). Breaking all 5 cleanses him (the win). The shell pays 4 mana/s (one long wave, no wave income). His thrash still speeds monsters. |
| 3 | `b2s2c3` | The Lantern at World's Edge | `pirate_beach` | 20 | Grell (6), Lusca (12), Corvaline (20) | Full tide cycle. Lanterns (2026-10-11): Corvaline walks slowly. Every 20 s a lantern lights at a random spot on a random path (none while one still stands). While a lantern stands she takes no damage and can't be targeted; break it to hurt her. The Pearl reveal stuns her at 50%. No ally rally. |

**Cast and speaker ids (proposed):** `corvaline`, `pearl` (becomes `maren` after the reveal),
`ondrath_corrupted`, `ondrath_cleansed`, `grell`, `lusca`, `saltmere_villager`.

**Ending:** Corvaline lives and is reunited with Maren. The Tide Orb returns to Ondrath. Cliffhanger:
"Two hearts taken. Three remain."

## 3. Story 3: "The Throne of Dust" (`b2s3`)

Unlocks after finishing Story 2 (`tidewarden`). No trophy gate.

| # | Id | Chapter | Layout | Format | Bosses | Notes |
|---|---|---|---|---|---|---|
| 1 | `b2s3c1` | The Glass Road | `desert` | 10 waves | Faceless Herald (wave 10) | Masks and braziers. Civilians walk among soldiers. |
| 2 | `b2s3c2` | The Games of Sunspire | `desert` | Arena duel, best of 3 | Bako (AI deck) | Built on the PvP mode and `shared/pvpbot.ts`. Crowd favor meter. |
| 3 | `b2s3c3` | The Throne of Dust | `desert` | 15 waves + Sefa | Herald (5), Dune Warden (10), Sefa (16) | Free Nefrael from the cage, then purify Sefa. Rally: Nefrael and the freed slaves. |

**Cast and speaker ids (proposed):** `sefa`, `bako`, `nefrael`, `faceless_herald`, `dune_warden`.

**Ending:** Sefa chooses to become a sandstone statue holding the city together. Cliffhanger: "Three
hearts taken. Two remain."

## 4. New mechanics (first numbers, tune with the simulator)

### Story 2
| Mechanic | Rule | First numbers |
|---|---|---|
| **Tide cycle** | A tide meter swings low → high → low. At **low tide**, mudflat slots open and monsters are slowed. Each low tide marks random slots; at **high tide** those flood: units on them are *submerged* (no attacks, cannot be hit), and monsters move faster. | Cycle 40 s (Ch 1), 30 s (Ch 3). Low tide: monster speed ×0.8. High tide: ×1.2. Ch 1: 2 random slots flood, Ch 3: 4 (new picks each low tide). |
| **Tide pools** | Pools sit beside the path. Each runs dry after 8 monsters walk past it (a boss drains it at once). | 4 pools at 40/60/75/90% of the path. Each pool left: +10% first-clear reward. |
| **Rolling isle** | When Ondrath thrashes, the path flips or shifts for a short time. | Every 25 s, lasts 6 s. |
| **Anchor hook** (Grell) | Moves one unit to a random free slot. | Every 10 s. |
| **Siren song** (Lusca) | 1-2 units fall *asleep* (no attacks) until the player taps them. | Every 12 s. Auto-wakes after 8 s if not tapped. |
| **Lantern beam** (Corvaline) | A visible beam sweeps the board. Units in it are *glimmered*. | Sweep 6 s. Glimmered: attack ×0.6 for 4 s. |
| **Reveal stun** | At 50% HP, a scripted panel plays (Pearl cries "Mother!"), then Corvaline is stunned. | Stun 5 s. Reuses the rally panel pause. |

### Story 3
| Mechanic | Rule | First numbers |
|---|---|---|
| **Masks and braziers** | Faceless are *masked*: units cannot target them. A unit standing on a **brazier slot** lights it, and every Faceless that passes a lit brazier is unmasked. Unmasked soldiers can be hit. Unmasked civilians walk to the exit and cost no lives. Each civilian who reaches the exit unhurt is *saved* and earns a bonus. Any hit on a civilian, splash included, cuts the reward. | 3 brazier slots per board. ~30% of Faceless are civilians. Unmasked civilians run 1.6× faster. Each civilian saved: +3% first-clear reward (cap +30%). Each civilian hit: -1.5% (floor 60%). |
| **Arena duel** | A PvP match against the bot with a fixed deck (Bako's). Best of 3 rounds. | Reuses PvP timed waves and sends. Bot difficulty rises per round. |
| **Crowd favor** | Multi-kills and rounds with no leaks fill a meter. A full meter drops gold or a free unit. | Multi-kill = 3+ kills in 1 s. Rewards TBD. |
| **Purify** (Sefa) | Sefa has no HP bar, only a **Chains** bar. Her body takes no damage. Chains appear on her one at a time as targets. Breaking all chains wins. | 6 chains. Each chain has HP like a captain. |
| **The cage** | Nefrael's cage sits beside the path. Units next to it damage the lock between waves. If it opens before Sefa's wave, Nefrael joins the rally with a stunning roar. | Lock HP TBD. Roar: stun all monsters 3 s. |
| **Equal ground** (Sefa) | Every unit fights at the board's average level for a short time. | Every 15 s, lasts 5 s. |
| **Mimic** (Faceless Herald) | Spawns a faceless copy of the strongest unit on the board, as a monster with that unit's attack. | Every 14 s, max 2 alive. |
| **Burrow** (Dune Warden) | Swallows monsters and brings them up farther along the path. | Up to 3 monsters, moved forward 25% of the path. |

## 5. Engine work

| Area | Work | Size |
|---|---|---|
| Sim (`shared/sim.ts`, `statuses.ts`) | New statuses: submerged, asleep, glimmered, masked. Tide speed modifiers. Chains-bar boss. Burrow, mimic, anchor hook, equal ground. | Large |
| Board | Tide-dependent slots (low slots, mudflat slots), brazier slots, cage prop, tide pools, path shift for the rolling isle. | Large |
| Story data (`shared/stories.ts`) | `b2s2` and `b2s3` stories, chapters, waves, barks, panels, rewards. A new chapter type for the arena duel, plus optional objectives (pools, civilians, cage). | Medium |
| Arena duel | Start a PvP-style match from a story chapter against `pvpbot` with a fixed deck. Best-of-3 wrapper. Crowd meter UI. | Medium-large |
| Monsters (`shared/monsters.ts`) | About 10 monsters and 7 bosses with skills (section 6). | Medium |
| Battle UI | Tide meter, tap-to-wake on sleeping units, chains bar, brazier light, beam telegraph, civilian count. | Medium |
| Cards and badges | Maren and Bako story cards with their passives. `tidewarden` and `dunewarden` badges. | Small |

**Suggested build order:** Story 2 data and tide cycle first (it is closest to Story 1's format), then
the Story 2 bosses, then Story 3's masks and purify, and the arena duel last (the biggest unknown).

## 6. Art and budget

Rates from past releases (Higgsfield): monster 6.3, boss 11.6, story card unit 11.4, arena 3.9 (still
+ ambient loop), still 1.5, banner 0.5, icon 0.25, panel loop 2.4. Totals include stills and in-game
animation clips (clips are about 60% of the cost).

| Group | Story 2 | Story 3 |
|---|---|---|
| Monsters | 5: crab, drowned sailor, corsair, eel swimmer, barnacle spawn | 7: Faceless soldier, archer, civilian, scarab, jackal, plus unmasked soldier and civilian |
| Bosses | 4: Grell, Lusca, Ondrath, Corvaline | 4: Herald, Dune Warden (with wyrm), Sefa, Nefrael (cage and freed) |
| Rally allies | 4: merfolk warrior, merfolk spear, tide spirit, sea beast | 3: gladiator, spearwoman, slinger |
| Story card | Maren | Bako |
| Arenas | 3, plus 3 high-tide variants | 3: Glass Road, Sunspire arena, Throne end |
| Story panels | ~16 | ~18 |
| Portraits | 7 | 6 |
| Other | Cover, 4 boss banners, 3 status icons, Ondrath cleansed loop | Cover, 3 boss banners, 2 icons, brazier and cage props, crowd meter, Sefa statue loop |
| **Credits** | **~172** | **~176** |

**Total: ~350 credits, ~450 with 30% retries.** Making the stills on the Higgsfield website
(unlimited Nano Banana Pro on the user's plan) cuts the MCP spend to ~215 (~280 with retries).
Not included: Seedance 2.5 trailer shots. The promo reuses game footage and panel zooms.

Art goes through the usual flow: prompts in `shared/art-requests.ts` (admin `#/art`), then
`ART_PROMPTS.md` in this folder, then key, build and upload to R2.

## 7. Build notes

- Balance check: `node scripts/story-sim.ts [chapter ids]` runs Book 2 chapters headless (fixed board, card levels 6/8/10, 5 seeds) for comparison with Story 1. Its fixed board can't beat the final bosses of Story 1 or Story 2, so final-boss tuning needs playtesting.
- Art made with the Higgsfield MCP (2026-10-11): 99 stills (186 credits) and 99 Seedance clips (162 credits) for monsters, bosses, Maren, Bako and the 6 arena loops. Boss banners for the 7 new bosses, flooded arena art that fades in at high tide (Ch 1 and 3), and fixes (5 panels and the Story 3 cover re-rolled, death clips fade out, walk fringe trimmed) for 22.5 more credits.

## 8. Docs still to write

- `SCRIPT.md`: written (panels, wave barks and boss lines for both stories).
- `ART_PROMPTS.md`: the Higgsfield prompts and refs.
- `PROMO.md`: filled in once the art exists (started with the plan).

## 9. Decisions (2026-10-10)

- **No trophy gates.** Each story unlocks when the previous story is finished.
- **Both stories ship together** in v2.2.0.
- **Civilians:** a bonus for each civilian saved, and a reward cut for each civilian hit.
- **Arena duel uses the PvP bot.** `PvpScene` already runs bot matches locally (`PvpBot` plays its
  own `PvpBoard` from a loadout), so Bako's deck is just a fixed loadout. Work left: a story entry
  point that skips trophies and the ranked result screen, the best-of-3 wrapper, a per-round
  `skill`, and the crowd meter. No fallback chapter planned.
- **Siren song tap:** build task. Tap on a sleeping unit wakes it; it must not open the
  sell/upgrade selection.
- **Sefa in Book 3:** she can wake. Keep the statue ending, and leave room for Book 3 to bring her
  back.
- **Story cards are Event rarity.** Maren and Bako use `rarity: "event"` (drop weight 0, never in
  chests, as `canDrop` already enforces), like Princess Muse. The first clear gives the card, and
  chapter replays drop 1-3 copies through `replayCards` (`["maren"]`, `["bako"]`), up to
  `replayCardsPerDay`. Grinding is the only way to level them.
