# v2.8 Beta Berserker: art prompts and pipeline

Made with the Higgsfield MCP on 2026-10-16. The full prompt for every image is in `shared/art-requests.ts`
(`B28` rows, group "v2.8 Arts Requirements", ids `v28:<id>`). This file records the models, settings and file names.

## Models and settings
- Stills: `gpt_image_2_5`. Quality `high` (1.5 credits) for units, card portraits and the PvP poster; `medium` (0.5) for weapons, projectiles, VFX and the element emblem.
- Style prefix: "Flat 2D vector cartoon game art, thick dark navy outlines, simple two-tone cel shading, chunky rounded badge-like proportions, bright saturated colors, no gradients, no text, no watermark."
- References (`image_references`): `style/style_anchor_v2.png` + `units/witch_doctor` (units); `vfx/weapons/axe` (axes); `ui/elements/fire` (element); `story/lab_poster` (PvP poster); the unit's own job id (card portraits).
- Orcs are green, so sprites sit on flat magenta (#FF00FF) and are keyed with `keyimg.py --color magenta`. Void Rift art is violet, so it sits on green and is keyed with the default colour.
- Clips: Seedance 1.5 Pro (`seedance1_5`), 4 s, 480p, 1:1, no audio, start image = the still's job id. 2.4 credits each. Sheets: `tospritesheet.py in.mp4 out 16 256 magenta`. Idle + attack only (no skill clip, no HD).
- Raw stills live in `assets/_green/v28/`.

## Files (raw pack -> built game file)
| id | raw pack | notes |
|---|---|---|
| peon, grunt, headhunter, spirit_walker, kodo_beasts | `units/<id>.png`, `animations/units/<id>_{idle,attack}.mp4`, `sprites/units/<id>_{idle,attack}_sheet.png`, `cards/portraits/<id>.png` | idle + attack; the build falls back to SD for the HD sheets |
| grunt_axe_0..4 | `vfx/weapons/grunt_axe_<n>.png` | 160 px, same format as `axe` (head left, handle right) |
| proj_lantern, drum_ring, spirit_wisp, pillage_coins | `vfx/<id>.png` | 128 px |
| proj_void_rift, proj_dragon_flame, proj_chrono_gear, monkey_cloud | `vfx/<id>.png` | 128 px |
| impact_void_rift, impact_dragon_flame, impact_chrono_gear, monkey_impact | `vfx/<id>.png` | 128 px |
| element_normal | `ui/elements/normal.png` -> `ui/element_normal.webp` | `build_assets.py` `ELEMENT_ORDER` now includes `normal` |
| pvp_poster | `story/pvp_poster.png` -> `story/pvp_poster.webp` | 1168x880, built at 1344 like `lab_poster`; job line added to `build_assets.py` |

Built with `python game/tools/build_assets.py` (only missing outputs rebuild); `index.json` now lists all of the above.
Not uploaded to R2.

## Prompts (short form)
- Peon: humble orc worker, pickaxe on the shoulder, burlap sack of loot with coins spilling out.
- Grunt: muscular orc warrior, red war paint, studded pauldrons, big battle axe.
- Headhunter: lean orc spear thrower, mohawk, tribal tattoos, skull-and-feather trophy necklace, quiver of spears.
- Spirit Walker: orc shaman, white braided beard, feather headdress, blue-teal runic cloak, glowing ghost lantern, gnarled staff.
- Kodo Beasts: huge armored tusked war beast with two war drums and a small orc drummer on top.
- Axes: stone hatchet / iron axe / bearded war axe / double-bladed bloodied axe / flaming chieftain axe.
- Projectiles and VFX: see the `B28` rows.
- PvP poster: two armies clash under a white-gold lightning flash, in the style of the lab poster.

## Known soft spots
- Headhunter's card portrait was blocked twice by the content filter (a skull necklace plus the still as a reference). It was re-made from text only with "wooden-bead necklace", so it is a look-alike, not an exact copy of the still.
- `drum_ring` and the Void Rift pieces keyed cleanly in a quick check, but look at them in game on a light arena.
- No music: Higgsfield's only music model (`sonilo_music`) is restricted to its game-generation pipeline and cannot be used here. The 16 arena tracks are not made.
