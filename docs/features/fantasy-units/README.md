# Fantasy units (game 2.9.7 / API 1.6.4, staging)

This release adds 18 new Legendaries, listed in `FANTASY_UNITS` in `shared/units.ts`.
- Their looks are inspired by AdventureQuest Worlds classes, armors and sets. The designs, names and art are original.
- They drop from chests like any other Legendary.
- They use the standard archetypes; none has a custom mechanic.
- None of them awakens yet (`NO_AWAKEN`).
- Each unit throws its own projectile (`FANTASY_PROJ`) and has its own impact art.

| id | Name | Element | Archetype | Projectile | Race | Style | Perk | Inspiration |
|---|---|---|---|---|---|---|---|---|
| hollow_revenant | Hollow Revenant | arcane | chain | revenant_burst | undead | balanced | finisher | Legion Revenant |
| veyr_doomblade | Veyr the Doomblade | normal | execute | doom_rune | human | heavy | giant_slayer | Verus DoomKnight |
| reapmarshal | Reapmarshal | arcane | curse | reap_axe | undead | heavy | armor_breaker | ShadowScythe General |
| void_sovereign | Void Sovereign | arcane | splash | void_orb | demon | heavy | true_strike | Void Highlord |
| chronodrake_warden | Chronodrake Warden | arcane | slow | time_scythe | dragon | balanced | hunter | Dragon of Time |
| storm_empress | Storm Empress | lightning | chain | storm_bolt | human | balanced | finisher | Sovereign of Storms |
| starforged_titan | Starforged Titan | normal | growth | star_core | giant | heavy | plunder | Infinity Titan |
| hellforged_overlord | Hellforged Overlord | fire | burn | hellfire | demon | heavy | armor_breaker | DoomKnight Overlord |
| dawnblade_goddess | Dawnblade Goddess | fire | splash | sun_disc | celestial | balanced | true_strike | Radiant Goddess of War |
| clockwork_stalker | Clockwork Stalker | normal | crit | gear_hook | human | rapid | hunter | Chrono ShadowHunter |
| riftbreaker | Riftbreaker | arcane | stun | chaos_claw | chaos | heavy | armor_breaker | Chaos Slayer |
| dusk_ronin | Dusk Ronin | normal | pierce | ronin_slash | human | rapid | true_strike | Yami no Ronin |
| frostbound_berserker | Frostbound Berserker | ice | freeze | frost_shard | human | heavy | frostbite | Glacial Berserker |
| crimson_chronomancer | Crimson Chronomancer | arcane | freeze | time_sand | human | balanced | none | Nechronomancer |
| wyrmbane_general | Wyrmbane General | normal | sniper | dragon_lance | human | heavy | giant_slayer | DragonSlayer General |
| pit_archfiend | Pit Archfiend | poison | poison | nightmare_flame | demon | balanced | finisher | ArchFiend |
| card_clasher | Card Clasher | arcane | crit | razor_card | human | rapid | plunder | Arcana Invoker |
| neo_necromancer | Neo Necromancer | poison | curse | raven_hex | human | balanced | finisher | Neo Metal Necro |

## Art

Made with the Higgsfield MCP on 2026-10-22. The whole set cost 148.9 credits, rejected takes included.
- **Board stills:** `gpt_image_2_5`, quality high, 1:1. Each still uses two references: `style/style_anchor_v2.png` and `units/witch_doctor.png`. The prompt follows the compact-chibi-bust template in `docs/features/v2.8-beta-berserker/ART_PROMPTS.md`.
- **Backgrounds and keying:** chronodrake_warden, starforged_titan, clockwork_stalker, frostbound_berserker and neo_necromancer sit on magenta. All the others sit on green.
- **Raw files:** raw stills are in `assets/_green/fantasy/`. Rejected first takes are in `old_v1/` and `old_v2/`. The job ids are in `assets/_fantasy_jobs.tsv`.
- **Clips:** `seedance1_5`, 4 s, 480p, 1:1, no audio, idle and attack. The start image is the still's job id.
  - Batches often get a preset suggestion instead of a job. Retry with `declined_preset_id`: IN THE DARK, DROWN IN MUSIC, or Sword and Sorcery.
- **Sheets:** `PAD=1.16 tospritesheet.py ... 16 256 <green|magenta>`. On every frame, the left and right 12px bands are under 5% opaque.
- **Card portraits:** `gpt_image_2_5`, quality high. References are the unit's still and the style anchor, with a full-bleed themed background.
- **Projectiles and impacts:** `gpt_image_2_5`, quality medium. References are `vfx/proj_tide_wave` and `vfx/impact_tide_wave`, keyed into `vfx/`. Projectiles draw at 80px (`PROJ_SIZE`).

### Review round (user feedback)
These were redrawn:
- Hollow Revenant: too close to Bone Necromancer.
- Chronodrake Warden: now holds the dragon scythe.
- Hellforged Overlord: looked like Veyr.
- Radiant Valkyrie: renamed Dawnblade Goddess; it looked like the existing Valkyrie.
- Riftbreaker, Void Sovereign and Bone Chronicler: renamed Crimson Chronomancer; too repetitive.
- Wyrmbane General: legendary lance; purple helm removed.
- Pit Archfiend: made nightmarish.
- Tarot Seer: renamed Card Clasher; made intimidating.
- Chrome Necrobard: renamed Neo Necromancer. A second pass removed a Green Lantern look.
- Veyr the Doomblade: second pass, because the first read as comedic.

## Soft spots
- Attack clips change the character's height by up to 22% (Chronodrake Warden, Wyrmbane General), because weapons are raised.
- Veyr's sword tip reaches the bottom edge of the frame.
