# v2.8.0 "Beta Release: Beta Berserker"

Status: Building (2026-10-16). Game 2.8.0.

The Beta release. It adds five Orc units, opens the Unit Lab to everyone, reworks the lobby
into a mode carousel (PvP moves into it), gives every Mythic its own projectile, and gives
every arena its own music.

## 1. New element: Normal

- New `Element` value `normal` (label "Normal"), color grey `0xc8c8c8`.
- It is neutral. No monster resists it and none is weak to it. `frostproof` and the other
  element rules don't touch it.
- Needs `ui/element_normal.webp` (icon), plus entries in every element map: `ELEMENT_COLOR`,
  `ELEMENT_CSS`, the vfx `IMPACT` and `PARTICLE` maps, DeckScene filter chips, and the admin selects.

## 2. New units (race Orc, element Normal, no awakening)

All five are in `ADDED_UNITS`, so live configs get them. They are in `NO_AWAKEN`, so they never
awaken. Witch Doctor is already an Orc and counts as one for Peon.

### 2.1 Peon: Common, Support (no attack)
- Generates +3 mana every 2 s.
- **Pillage** (passive): each pulse has a 50% chance to pay x2 (6 mana).
- Every *other* Orc on the board adds 2% x its rank to that chance (a rank 3 Orc adds 6%).
  Other Peons count. The chance is capped at 100%.
- The card back shows the current chance formula.

### 2.2 Grunt: Common, attacker
- Attacks the first monster. Base damage 35, 0.9 attacks/s. Throws an axe (weapon sprite).
- **Berserker Strength** (passive). It counts the waves the unit has stood on the board since
  it was placed. A merge places a new unit, so the count resets. Moving or swapping it keeps the count.
  - 0-9 waves: x1
  - 10+ waves: x2 damage
  - 20+ waves: x4 damage
  - 30+ waves: x7 damage
  - Beyond 30: x1.5 more for every 5 further waves, so 35 waves gives x10.5 and 40 gives x15.75.
- The axe changes with each tier: `grunt_axe_0` .. `grunt_axe_4` (tier 4 = 35+ waves).
  A tier-up shows a "BERSERK!" callout and a red flash.

### 2.3 Headhunter: Common, attacker
- Attacks a random monster. Base damage 25, 1.7 attacks/s. Throws a spear (weapon `spear`).
- **Berserker Upgrade** (passive):
  - Always on: if any monster is at 87% or more of its path, he focuses the furthest such
    monster and deals x5.2 damage to it.
  - From wave 20 on, at any rank: x3.2 attack speed.

### 2.4 Spirit Walker: Rare, attacker
- Attacks the first monster. Base damage 50, 0.6 attacks/s. Throws a spirit lantern (new projectile `lantern`).
- **Ancestral Spirit** (passive): each hit has a 76% chance to push the hit monster and up to
  4 monsters nearest to it (within 120 px) back 35 px along their path. Bosses are pushed 17.5 px.
  A push never moves a monster to before its path's start. A spirit-wisp VFX plays.

### 2.5 Kodo Beasts: Rare, Support (no attack)
- **War Drums** (passive):
  - Adjacent units: x1.2 attack speed.
  - Any monster at 50% or more of its path: adjacent units x2.4 instead.
  - Any monster at 88% or more: ALL units on the board x3 (adjacent included).
- Several Kodos don't stack. The highest bonus a unit gets wins.
- Drum-circle VFX: rings pulse from the Kodo, faster and redder at each stage. At the 88%
  stage the rings sweep the whole board.

## 3. Unit Lab for everyone

- Remove the DEV/staging gate (`LAB_ENABLED` in LabScene.ts and `LAB_ON` in LobbyScene.ts).
- Locked units are cards the player doesn't own (`profile.cards`). The Lab shows them greyed
  with a lock, and they can't be picked. Units the player owns work as today.
- Lab battles stay off the server: no rewards, no trophies, no quests.

## 4. QoL

1. **Mythic projectiles.** Each mythic gets its own projectile and impact: Void Titan `void_rift`,
   Dragon Egg `dragon_flame`, Chrono Mage `chrono_gear` (spins), and for Monkey King a golden
   cloud trail plus `monkey_impact` on his staff.
2. **Summon button shrinking.** `pressable()` in ui.ts: a second `release()` (`pointerout`
   after `pointerup`) wiped `rest`, so a tap during the grow-back tween shrank the button a
   little more each time. Fix: only take `rest` when `base` is set. PvpScene uses the same helper.
3. **Lobby carousel.** The modes are ARENA, STORIES, PVP and UNIT LAB. The neighbouring cards
   peek in at the sides, smaller and dimmed. Swipe, the arrows or a tap on a side card moves
   it. The page dots stay.
4. **PvP button removed.** PvP is a carousel card (art `story:pvp_poster`) whose CTA opens PvpMenu.
   DECK and SHOP stay in their places.
5. **Arena music.** Each of the 16 arenas gets its own battle track (`music/arena_<id>.mp3`
   on R2, about 90-120 s, looped). Tracks stream in after the battle starts and the synth
   "battle" track plays until then. Boss waves keep the synth boss track and then go back to
   the arena track. The music on/off toggle covers both. PvP uses the arena track too.

## 5. Unit balance

| Unit | Change | Where |
|---|---|---|
| Crystal Golem | Awakened speed x0.2 -> x0.4 | `shared/awakened.ts` |
| Hourglass Owl | Base ultimate charge 30% -> 40% | `effects.hourglass.charge` + HOTFIX `2.8.0-owl` |
| Sand Worm | Base damage -> 47 | `DEFAULT_UNITS` + HOTFIX `2.8.0-sand` |
| Sand Monk | Base damage -> 19 | `DEFAULT_UNITS` + HOTFIX `2.8.0-sand` |

## 6. Art (Higgsfield, cap about 300 credits)

- 5 units: card portrait, board still, idle and attack sheets (same pipeline as earlier units).
- Grunt axes `weapons/grunt_axe_0..4` (stone hatchet, iron axe, bearded war axe, double-bladed
  bloodied axe, flaming chieftain axe).
- Projectile `vfx/proj_lantern`. VFX: `vfx/drum_ring`, `vfx/spirit_wisp`, `vfx/pillage_coins`.
- Mythic projectiles and impacts: `vfx/proj_void_rift`, `vfx/proj_dragon_flame`,
  `vfx/proj_chrono_gear`, `vfx/monkey_cloud`, plus impacts.
- `ui/element_normal`, `story:pvp_poster` (carousel card).
- Music: 16 arena tracks.

## 7. Ship

Bump game to 2.8.0, update What's new, roadmap and the features table, then commit and push
to master and deploy to staging. Production waits for the user's go.
