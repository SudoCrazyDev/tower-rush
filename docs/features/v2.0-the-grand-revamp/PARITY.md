# v2.0 engine merge: solo vs Sim parity audit (P1a, 2026-10-07)

| Short name | File |
|---|---|
| BS | `game/src/scenes/BattleScene.ts` |
| U | `game/src/battle/Unit.ts` |
| M | `game/src/battle/Monster.ts` |
| sim | `shared/sim.ts` |
| PB | `shared/pvpsim.ts` (`PvpBoard extends Sim`) |

Line numbers are as of commit `690d160`.

**Headline:** the base `Sim` has no summon, merge, copy, swap, hop, power-up or on-demand
hero cast. They exist only in `PvpBoard.act` (PB:312-405).

## 1. Behaviours

| Behaviour | Solo | Sim | Status |
|---|---|---|---|
| Fixed vs variable step | BS:1977-1980 (dt = min(delta, 50 ms) × speed) | sim:55 (1/30 fixed) | Differs: the scene needs an accumulator (precedent: `PvpScene.ts:595-607`). |
| RNG | `Math.random` | seeded `rand` (sim:142, 424) | Differs, acceptable: seed it from `Math.random`. |
| Wave state machine (intro, spawn, clear, 20 s force-advance) | BS:1984-2006 | sim:651-682 (`run`) | Same: use `run` with `to: Infinity` and `maxTime: Infinity` (the default is 3600 s, sim:462). |
| Wave mana, brewer harvest, wages | BS:1633-1673 | sim:595-605 | Same. |
| Wave size, bosses, escorts, spawn interval, weights | BS:1678-1704 | sim:606-628 | Same. |
| HP curve | BS:1625-1630 (arena or story `hpScale`) | sim:154-158, 586 | Differs: no story `hpScale`. |
| Boss/monster HP, mana, boss intro | BS:1762-1785; M:93-96 (intro only if it has art) | sim:631-649 (intro always 1.4 s) | Differs: no `×waveHp`; intro doesn't depend on art. |
| Splitters, healers, boss HP stages | BS:1800-1854, 2009-2027 | sim:693-710, 867-875, 928-944 | Same. |
| Boss powers (all except below) | BS:1876-1964 | sim:946-1011 | Same. |
| Boss power: portal | BS:1918-1929 (minions after 600 ms) | sim:971-974 (immediate) | Differs (timing). |
| Boss targeting excludes dragged units | BS:1055 | sim:894 | Missing (no drag concept). |
| Chaos Taffy `tether` (Fatigue on the nearest unit once past `targetFrom`) | BS:1857-1874 | — | **Missing.** |
| Traits, DoT, kills, plunder, leaks, lives | M:121-197, BS:1787-1973 | sim:807-891 | Same. |
| Bosses-killed counter | BS:111, 1792 | only the `bossKilled` flag | Missing. |
| Targeting, unit update, pulses, ultimates, haste, statuses, damage mults, chain, projectiles, applyHit | U:312-374, BS:843-1618 | sim:1087-1429 | Same. If the target is gone, solo plays an impact; Sim drops the shot. |
| A dragged unit skips its whole update and neighbour pulses | U:313, BS:1046, 1392 | — | **Missing.** |
| Awakening needs art (`canAwaken`) | U:17, 73 | PB:408 `awakens` callback | Differs: move `awakens` into Sim. |
| Echo when the caster is gone | BS:1212 (skipped) | sim:1213-1223 (still hits) | Differs (edge case). |
| Owl exclusion | solo `noAttack` | Sim `buff\|\|isSupport` | Differs, no gameplay effect. |
| Brewer bubbles (tap = +`tapBonus`, else auto-collect after `tapWindow`) | BS:1109-1115, 1170-1188 | sim:1189-1198 (instant) | **Missing: tap bonus.** |
| Summon (tutorial forced pick), merge, lucky, mime, power-up | BS:685-1279 | PB:314-382 | Same, but PvpBoard only. No forced pick. |
| Portal swap with the same `def.id` at max rank | BS:946-949 (allowed) | PB:347-371 (refused) | Differs (edge case). |
| Hero needs `hero.enabled` | BS:206-209 | sim:431 | Differs. |
| Manual haste/rage cast with no monsters | BS:561 (allowed) | sim:1027 (refused) | Differs. |
| Hero auto-cast default | localStorage, default off | default on | Differs: set it explicitly. |
| Story: scripted waves, shuffle, boss-first queue, per-wave `hp`, `hpScale`, layout arena | BS:176-181, 1628, 1667, 1709-1736 | — | **Missing.** |
| Story win (last wave cleared), stars from lives | BS:1999-2001, 2073 | — | **Missing.** |
| Per-card levels | from the profile or story | `levelOf` overridable (sim:471) | Differs: use a per-id map. |
| End stats (summons, merges, awakens, heroCasts, copies, swaps, brewed, bosses) | BS:2051-2155 | `SimResult` lacks them (PB.counts has them) | Missing in the base Sim. |
| Forced end (`onPlayLost`, surrender) | BS:284-290 | `finish` is protected | Needs a public `end(why)`. |
| Tutorial: hold the intro timer, forced pick, mana top-ups, tutorial events | BS:168-170, 698-704, 732-801, 1985 | — | **Missing.** |
| HUD, speed, pause, banners, barks, tips, rewards modal, server calls | various | — | View-only. |

## 2. Inputs the scene must send to Sim

| Action | Sim today |
|---|---|
| Summon (optional forced id/slot), merge, copy, swap, hop, power-up, hero cast, auto-cast toggle | `PvpBoard.apply` only → **promote to Sim** |
| Ready checks (`mimeReady`, `portalReady`, `supportProgress`) | PvpBoard only → promote |
| Drag start/end | Missing |
| Tap a brew bubble | Missing |
| Surrender or forced end | not public |
| Tutorial hold, mana top-up | `gainMana` is public; hold is missing |

## 3. What the renderer needs from Sim

- **Stable unit uids.** `become` replaces the object in its slot (sim:553). Monsters already have a `uid`.
- **A structured event stream** drained each frame. It replaces the 400-line text `log` for:
  - kill and leak (uid, id, position, boss flag)
  - wave start (boss id, banner)
  - boss stage, boss power (name, position)
  - split and minion spawn, portal opening
  - story bark
  - mana change (position, source), wages paid or unpaid
  - unit callouts (miss, block, dodge, rally, lucky, rush, copy, mirror)
  - hero cast (power id; today a text mark at a hard-coded 375,640, sim:1069)
  - awaken, merge, herald war cry
  - a shot reaching a target that is gone
- **Public wave state** (wave number, story total, banner pending) and the hero timer. Summon
  cost and power-up levels (PvpBoard only today).
- **Brew bubble state.**
- **Cap the `timeline`** (it grows every 0.25 s forever in endless runs).

## 4. Solo vs PvP differences to keep

| Setting | Solo | PvP |
|---|---|---|
| Waves | start when the field is clear (+20 s force) | fixed clock (PB:191-196) |
| Wave HP | arena or story `hpScale` | `baseHp` ignores the arena; sudden death |
| Lives | 3 hearts, a boss takes all | HP pool, damage per leaked monster |
| Income and sends | none | yes |
| Brewer mana | full | × `pvpMult` |
| Wages | paid | not paid |
| Auto-cast default | localStorage, off | set by the scene |
| Hero availability | needs `hero.enabled` | no check |

Recommended Sim options: `mode: "solo" | "pvp"`, `hpScale?`, `story?`, `levels?`, `awakens?`,
`bossIntro?`, `autoHero`, `tutorialHold`.
