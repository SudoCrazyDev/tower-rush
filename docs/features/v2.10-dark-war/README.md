# v2.10 "Dark War"

**Status:** built, on staging (2026-10-28) as game 2.10.0 / API 1.7.0 (staging `MIN_CLIENT` 2.10.0). Not on prod. **Inspiration:** AdventureQuest Worlds' Dage vs Nulgath wars (the 2012 Evil War and
the 2022 Dark War). Reference page with the original gear and monsters: https://claude.ai/artifact/2EHy7ikUjGAfx1EWuAkuRi.
All names, designs and art here are original; nothing is copied from AQW.

A new series, **The Dark War**, not part of The Forsakens. Its Book 1, **Legends**, has no Keeper, no shards, no Voice, so it
cannot break Book 3 canon. The player is an unpledged warrior who answers the call and chooses a side.

## 1. The world

- **Vorthrax, the Archfiend.** Master of the **Abyssal Nation**, a demon empire of void storms and blood-red
  diamonds. Old, proud, patient. His currency and his chains are the same thing: Abyssal Diamonds.
- **Malgrave, the Dreadforger.** Lord of the **Undying Legion**. Once a young smith who died on one of
  Vorthrax's battlefields. The Archfiend raised him as a lich and made him his apprentice: every famous blade
  of the Nation was Malgrave's work. Malgrave wanted to create for himself, not forge chains for a master. He
  built the **SoulForge**, a forge that burns on sacrifice, raised his own army from the dead of every war,
  and rebelled. That rebellion was the first war. This is the tenth.
- **The Underworld Throne** sits between their lands. Whoever holds it rules the dead and the damned.

## 2. Story

**As built:** the pledge branch is four stories played in order (no new save state): `dws1` The Apprentice (Ch 0 and Ch 1
below), `dws2` The Legion's War (L1-L3), `dws3` The Nation's War (N1-N3), `dws4` The Throne Below (a new "Ten Wars" chapter
with Vorthrax as boss, then the finale). The Pledge perk, SoulForge sacrifice, Abyssal Diamonds and The Traitor are **not
built** yet; bosses use existing skill kinds (see shared/monsters.ts). The table below is the original pitch.

| # | Chapter | Layout | Arenas (front shifts) | Format | Beat |
|---|---|---|---|---|---|
| 0 | **The Apprentice** (flashback) | `hell_fortress` | Abyss Citadel → Void Storm → Rebel Forge | 10 waves + boss Grumbok, Event deck (Nation units) | You are the Archfiend's soldier. At the last shift Malgrave lights the SoulForge inside the citadel and the board burns: the betrayal, played live. |
| 1 | **The Call to War** | `volcano` | Underworld Gate → Blood Moon | 12 waves, boss War, your deck | Ten years later both lords call every warrior. Both armies attack the gate. Ends with the **Pledge**. |
| L1 | **The SoulForge** | `graveyard` | Bone Fields → SoulForge | 12 waves, boss Gravelgut | Legion route. Commander Rhask holds the forge; the Nation sends fiends to put it out. |
| L2 | **Embers and Oaths** | `graveyard` | SoulForge → Dread Citadel | 14 waves, boss Kaelith (ally turns), Event deck mixed | Kaelith the Blade Master swears to bring Malgrave the Archfiend's head and asks you to prove you are worthy. |
| L3 | **Wings of Oblivion** | `graveyard` | Dread Citadel → Bone Fields | 15 waves, boss Oblivax | The Archfiend's void wyrm burns the Legion's lands. |
| N1 | **The Diamond Debt** | `hell_fortress` | Abyss Citadel → Diamond Mines | 12 waves, boss War | Nation route. Vesk the quartermaster pays in diamonds; the Legion raids the mines. |
| N2 | **The Worshippers' Rite** | `hell_fortress` | Diamond Mines → Void Storm | 14 waves, boss Kaelith | The Blade Master hunts the Archfiend's worshippers; his essence is what their rite needs. |
| N3 | **The Traitor** | `hell_fortress` | Void Storm → Abyss Citadel | 15 waves, boss Malgrave's champion "the Traitor" | One of the Nation's generals sold the gate to the Legion. Mid-battle one of your own units defects. |
| F | **The Throne Below** | `volcano` | Blood Moon → Underworld Gate → The Hunger Below | 20 waves, then the Hunger Below; rally of both armies | Both routes end here. Ten wars of dead have woken something under the throne. Master and apprentice fight back to back. |

**Ending.** The Hunger Below is sealed under the throne. The throne is left empty: whoever sits on it feeds
the Hunger. Vorthrax: "Ten wars, and you still hold the hammer like I taught you." Malgrave: "Next year, old
man." Vorthrax: "Next year, boy." Each side returns home; the war meter resets. Title card: *The Dark War
never ends.*

A player who pledged one side can replay Chapter 1 and pledge the other to play its route.

## 3. Mechanics

| Mechanic | Where | Rule |
|---|---|---|
| **Shifting Front** (headline) | every chapter | A **war meter** (tug of war) sits at the top. Kills push it toward your side, leaks push it back. When it crosses a threshold the **front shifts**: a cinematic transition video plays, the arena art changes for good (same path and tiles), and the arena's **field rule** changes. 2-3 fronts per chapter. |
| **Field rules** | per arena | Bone Fields: undead units +20% damage. SoulForge: fire units +30% damage, forge bursts burn a random path stretch every 10 s. Dread Citadel: monsters +15% HP, kills give +1 mana. Abyss Citadel: arcane units +20%. Diamond Mines: kills drop diamonds (tap: mana). Void Storm: lightning strikes stun a random monster every 6 s, lightning units chain +1. Blood Moon: everything attacks and moves 20% faster. Rebel Forge: fire and burn everywhere. Underworld Gate: neutral. The Hunger Below: one tile is devoured every 4 waves. |
| **Pledge** | end of Ch 1 | Choose Legion or Nation. The story branches. Your faction's units cost 20% less mana in this book and start at +1 rank in the first wave. |
| **SoulForge sacrifice** | Legion route | The forge tile: drag a unit onto it to sacrifice it. Every unit gains Soulfire for 10 s (+50% damage, fire). Gravelgut eats the forge flame (no sacrifices while he lives). |
| **Abyssal Diamonds** | Nation route | Elite monsters drop diamonds; tap to collect. 3 diamonds empower a unit (+1 rank in this battle). |
| **The Traitor** | N3 | At the boss wave one of your units defects: it stops attacking and slows its neighbours until you tap it 6 times. |
| Boss skills | | Kaelith **duel** (marks your strongest unit and stuns it while he lives), War **herald** (raises a skeleton escort), Gravelgut **devour** (eats a unit's attacks), Oblivax **oblivion breath** (sweeps a row), Vorthrax **diamond prison** (encases 2 units; tap to free), Malgrave **soul harvest** (takes your weakest unit and sends it down the path as a monster), the Hunger Below **devour** (eats tiles). |

## 4. New units (all Legendary, two Mythic warlords)

Each unit has its own projectile and impact (`DARKWAR_PROJ`, like `FANTASY_PROJ`). Already-shipped units that
fit the factions are cast as story allies: Hollow Revenant (Legion), Void Sovereign and Pit Archfiend (Nation).

### Undying Legion
| id | Name | Element | Arch | Style | Race | Projectile | Inspiration |
|---|---|---|---|---|---|---|---|
| soulforge_blademaster | Soulforge Blademaster | fire | crit | rapid | undead | soul_odachi | Soulfire Blademaster |
| pyre_warmonger | Pyre Warmonger | fire | burn | heavy | undead | pyre_tonfa | Flaming Soulfire Warmonger |
| dread_artisan | Dread Artisan | arcane | curse | balanced | undead | ink_skull | Dark Artist |
| grimgate_dreadknight | Grimgate Dread Knight | normal | execute | heavy | undead | dread_dagger | Legion Dread Knight |
| underworld_electromancer | Underworld Electromancer | lightning | chain | balanced | undead | conductor_bolt | Underworld ElectroMage |
| abyss_blademaster | Abyss Blademaster | normal | pierce | rapid | human | twin_katana | Legion BladeMaster Assassin / Assassins of the Abyss |
| prismatic_paragon | Prismatic Paragon | arcane | splash | heavy | undead | prism_shard | Prismatic Paragon Plate |
| fenrir_legionnaire | Fenrir Legionnaire | normal | stun | balanced | beast | wolf_fang | Fenrir Legion / War Lycan |
| dreadsaw_fiend | Dreadsaw Fiend | normal | splash | heavy | demon | dread_saw | Fiend of the Underworld |
| ascended_blademaster | Ascended Blademaster | normal | sniper | heavy | undead | blade_crescent | Evolved BladeMaster |

### Abyssal Nation
| id | Name | Element | Arch | Style | Race | Projectile | Inspiration |
|---|---|---|---|---|---|---|---|
| naraka_fiend | Naraka Fiend | poison | poison | rapid | demon | fiend_armblade | Narakan Fiend |
| tempest_voidcaller | Tempest Voidcaller | lightning | chain | balanced | demon | tempest_orb | Tempest Void |
| midnight_stormvoid | Midnight Stormvoid | ice | freeze | balanced | demon | storm_piercer | Midnight Storm Void |
| abyss_recruit | Abyss Recruit | normal | stun | heavy | human | shield_throw | Void Recruit |
| archfiend_worshipper | Archfiend Worshipper | arcane | curse | balanced | human | worship_sigil | Worshipper of Nulgath |
| infernalfiend | Infernalfiend | fire | splash | heavy | demon | infernal_skull | Infernalfiend of Nulgath |
| abyssal_vampire | Abyssal Vampire | arcane | crit | rapid | undead | blood_bat | Vampire of Nulgath |
| oblivion_dragoon | Oblivion Dragoon | arcane | pierce | heavy | dragon | oblivion_spear | Oblivion of Revontheus |
| golden_hanzo | Golden Hanzo | normal | crit | rapid | human | golden_shuriken | Golden Hanzo Void |
| deathfiend | Deathfiend | poison | slow | heavy | demon | death_scythe | Deathfiend of Nulgath |

### Warlords (Mythic, story rewards)
| id | Name | Element | Arch | Projectile | Reward |
|---|---|---|---|---|---|
| malgrave_dreadforger | Malgrave, the Dreadforger | fire | burn | soulforge_hammer | Legion route + finale |
| vorthrax_archfiend | Vorthrax, the Archfiend | arcane | curse | abyssal_diamond | Nation route + finale |

## 5. Monsters and bosses (fantasy redesigns)

**Legion monsters** (fought on the Nation route): `bone_fiendrider` (skeletal knight on a winged fiend, fast),
`doom_legionnaire` (skeleton knight), `grave_inquisitor` (winged skeleton, flying), `dreadmarcher` (undead
soldier), `undead_bruiser` (huge brute, tank), `legion_fenrir` (undead wolf, fast), `skull_infantry` (small,
swarm).
**Nation monsters** (fought on the Legion route): `dreadfiend` (four-legged breath demon), `hellstomper`
(horned stomping fiend), `bloodfiend` (winged blood demon, flying), `manslayer_fiend` (armored, tank),
`void_fiend` (void brawler), `dark_makai` (small imp, swarm).
**Bosses:** `kaelith_blademaster`, `war_bone_herald`, `gravelgut`, `grumbok`, `oblivax_void_wyrm`,
`snivelfiend` (rare joke boss: a goblin in an archfiend costume), `malgrave_boss`, `vorthrax_boss`,
`hunger_below`.

## 6. Art (ids are the contract)

- Units: still, card portrait, idle/attack/skill clips (Seedance 1.5 Pro 480p), sheets, projectile + impact.
- Monsters: still, walk/death clips. Bosses: still, walk/attack/death/intro clips, banner.
- Arenas (`locations/arena_dw_*`, image edits of the layout's base arena so path and tiles match):
  `graveyard` base: `dw_bone_fields`, `dw_soulforge`, `dw_dread_citadel`.
  `hell_fortress` base: `dw_abyss_citadel`, `dw_void_storm`, `dw_diamond_mines`, `dw_rebel_forge`.
  `volcano` base: `dw_underworld_gate`, `dw_blood_moon`, `dw_hunger_below`.
  Each has a `_loop.mp4`. **Front-shift transitions:** Seedance 2.5 start/end-frame morphs, 9:16
  (`animations/locations/dw_<from>__<to>.mp4`).
- **Video story panels** (new): every panel is a Seedance 2.5 clip (16:9, ~5 s) made from a still; the panel
  viewer plays the clip and falls back to the still. Panel list in [PANELS.md](PANELS.md).
- Job ids: `assets/_darkwar_jobs.tsv`. Raw stills: `assets/_green/darkwar/`.

## 7. As built: art and pipeline (2026-10-28, ~1,590 Higgsfield credits)

- Unit stills: `gpt_image_2_5` high, refs = style anchor + `units/witch_doctor` + the AQW armor image (imported by URL) as a
  loose costume reference. v1 read "too common" (user, 2026-10-28): v2 adds a LEGENDARY-tier ornate look and auras; six v2
  stills with skull faces were rerolled with living faces (v3). Rejects in `assets/_green/darkwar/old_v1`, `old_v2`.
- Clips: Seedance 1.5 Pro 480p 4 s (1.2 credits each). Sheets: `assets/dwbuild.py` (`PAD=1.04` units).
- Arenas: image edits of `graveyard`, `hell_fortress`, `volcano`; loops Seedance 1.5 720p 9:16.
- Front transitions: Seedance 2.5 `omni_reference` start + end frame, 720p 9:16 4 s (28 credits; 5 s = 35).
- Panels: 28 stills (`gpt_image_2_5` high 16:9) animated with Seedance 2.5 720p 4 s. Played by `clipImage`
  (backdrop.ts): the clip is drawn into a canvas texture every frame, because Phaser's video texture waits on
  `requestVideoFrameCallback`, which stalled for clips started mid-scene in testing.
- Teaser: `assets/video/darkwar_teaser.mp4` (Seedance 2.5, 12 s, 720p, no audio).
- Story portraits: `rhask`, `vesk` cropped from panels 7-8; `kaelith`, `gravelgut`, `grumbok`, `oblivax`, `snivelfiend`
  cropped from keyed boss stills. Rally allies `ally_malgrave`, `ally_vorthrax`, `ally_legion`, `ally_nation`.
- Scripts: `assets/dwget.py`, `dwprobe.py` (downloads by probing result-url timestamps), `dwbuild.py`, `dwsheet.py`.
  Job ids: `assets/_darkwar_jobs.tsv`; reference media ids: `assets/_darkwar_refs.tsv`.

## 8. Open
- Balance is first-pass (`node scripts/story-sim.ts dws2c3 ...`): story bosses' HP were lowered once.
- Pledge perk, SoulForge sacrifice, Abyssal Diamonds, The Traitor and the new boss skills (duel, diamond prison, soul harvest).
- Ascended Blademaster's chest plate has text-like marks; reroll if it bothers.
- Front transitions end on a frame close to, not identical to, the next arena still (a short crossfade hides it).
