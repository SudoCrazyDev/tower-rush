# v2.3 The Iron Oath: art prompts and pipeline

Art for Book 2 Story 4 was made with the Higgsfield MCP on 2026-10-11 (not on the website). The full
prompt for every image is in `shared/art-requests.ts` (`B24` rows, group "v2.3 Arts Requirements", ids
`book2s4:<id>`); this file records the style, the models and the file names.

## Style and models
- Stills: `gpt_image_2_5` (GPT Image 2.5), 1:1 for sprites and portraits, 16:9 for panels and banners, 4:5 cover, 9:16 arenas.
- Style prefix: "Flat 2D vector cartoon game art, thick dark navy outlines, simple two-tone cel shading, chunky rounded badge-like proportions, bright saturated colors, no gradients, no text, no watermark."
- References (`image_references`): `style/style_anchor_v2.png`; units add `_green/v12/pentagonal_knight.png`; monsters add `_green/orc_brute.png` + `_green/v12/corrupted_villager.png`; bosses add `_green/lich_king.png`; panels attach the cast stills.
- Sprites sit on flat magenta (#FF00FF) and are keyed with `keyimg.py --color magenta`. Arcane-coloured art must not use magenta (the arcane rune shield was re-rolled on green).
- Arenas are image edits of `locations/arena_winter_village.png` (same ring path and 5x3 tiles).
- Clips: Seedance 1.5 Pro (`seedance1_5`), 4 s, 480p, 1:1, no audio, start image = the keyed-still job id. Arena loops 720p 9:16.
  Sheets: `tospritesheet.py in.mp4 out 16 256 magenta` (death/intro clips: `magenta+` so the drifting backdrop is flooded away).
- Sepia flashback (panels 3 to 6) is painted into the panel prompts; arena Ch 1 is tinted in code.

## Files (raw pack path -> built game file)
| id | raw pack | notes |
|---|---|---|
| brakka, durgrim, emberhold_gunner, runecaller | `units/<id>.png`, `animations/units/<id>_{idle,attack,skill}.mp4`, `cards/portraits/<id>.png` | SD sheets only (no `units_hd`; the build falls back to SD) |
| iron_soldier, iron_crossbow, iron_brute, drake_whelp | `monsters/<id>.png`, `animations/monsters/<id>_{walk,death}.mp4` | |
| dwarf_family | `monsters/dwarf_family.png`, `_walk` clip only | friendly evacuees |
| ashmaw, walking_forge, chaos_colossus | `bosses/<id>.png`, `animations/bosses/<id>_{walk,attack,death,intro}.mp4`, `ui/boss_banners/<id>.png` | |
| walking_forge_{legs,cannons,furnace,core} | `bosses/walking_forge_<part>.png` | static damaged-state stills (no clips); built to `bosses/` webp |
| arenas | `locations/arena_{burning_emberhold,mountain_pass,oath_field}.png` + `animations/locations/<name>_loop.mp4` | Ch 1 / 2 / 3. Stills are 752x1344 |
| cover | `story/covers/book2_story4_the_iron_oath.png` | |
| portraits | `story/portraits/{durgrim,durgrim_young,brakka,anvil_heart,candy_knight_captain}.png` | |
| rally allies | `story/allies/ally_{dwarf_guard,dwarf_gunner,candy_knight,candy_lancer}.png` | static keyed stills (no clips), like the v2.2 allies; built to `story/allies/` |
| rune shields | `ui/rune_shield_{fire,ice,lightning,nature,poison,arcane}.png` | built to `ui/` |

## Panels (`story/panels/`)
| n | slug | scene |
|---|---|---|
| 1 | `b2s4_p1_shard_north` | shard flies north into the mountains |
| 2 | `b2s4_p2_footprints` | villagers find house-sized iron footprints |
| 3 | `b2s4_p3_young_durgrim` | sepia: young Durgrim on the walls |
| 4 | `b2s4_p4_iron_oath` | sepia: the human crown swears the Iron Oath |
| 5 | `b2s4_p5_emberhold_burns` | sepia: Emberhold burns, families evacuate |
| 6 | `b2s4_p6_unanswered_horn` | sepia: the horn no one answers, broken oath scroll |
| 7 | `b2s4_p7_walking_forge` | the Walking Forge in the present |
| 8 | `b2s4_p8_knights_kneel` | Candy Crown knights kneel to Durgrim |
| 9 | `b2s4_p9_durgrim_falters` | Durgrim falters |
| 10 | `b2s4_p10_colossus_rises` | chaos tears out of him into the iron: the Colossus |
| 11 | `b2s4_p11_colossus_falls` | Colossus falls to scrap |
| 12 | `b2s4_p12_brakka_confronts` | Brakka confronts her father |
| 13 | `b2s4_p13_anvil_heart` | Anvil-Heart takes the Orb back, it cools to ember-gold |
| 14 | `b2s4_p14_new_oath` | a new oath forged by dwarves and knights |
| 15 | `b2s4_p15_durgrim_troubled` | Durgrim troubled |
| 16 | `b2s4_p16_broken_scales` | four shards over broken scales, one pan white, one black |
| 17 | `b2s4_p17_to_be_continued` | to be continued |

Known soft spots: panels 10 and 11 show a few Book 1 cast members in the foreground (fine as extras);
arena stills are lower resolution than the v2.2 ones; death clips end with a little debris (the build fades them).
