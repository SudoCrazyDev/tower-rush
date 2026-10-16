# v2.8 Beta Berserker: art prompts and pipeline

Made with the Higgsfield MCP on 2026-10-16. The full prompt for every image is in `shared/art-requests.ts`
(`B28` rows, group "v2.8 Arts Requirements", ids `v28:<id>`). This file records the models, settings and file names.

## Models and settings
- Stills: `gpt_image_2_5`. Quality `high` (1.5 credits) for units, card portraits and the PvP poster; `medium` (0.5) for weapons, projectiles, VFX and the element emblem.
- Style prefix: "Flat 2D vector cartoon game art, thick dark navy outlines, simple two-tone cel shading, chunky rounded badge-like proportions, bright saturated colors, no gradients, no text, no watermark."
- References (`image_references`): `style/style_anchor_v2.png` + `units/witch_doctor` (units); `vfx/weapons/axe` (axes); `ui/elements/fire` (element); `story/lab_poster` (PvP poster); the unit's own job id (card portraits).
- Orcs are green, so sprites sit on flat magenta (#FF00FF) and are keyed with `keyimg.py --color magenta`. Void Rift art is violet, so it sits on green and is keyed with the default colour.
- Clips: Seedance 1.5 Pro (`seedance1_5`), 4 s, 480p, 1:1, no audio, start image = the still's job id. 2.4 credits each. Sheets: `tospritesheet.py in.mp4 out 16 256 magenta <keep>`, framed bust-up like the other units (keep = top share of the body kept: Grunt, Peon, Spirit Walker 0.82; Headhunter 0.7; Kodo Beasts 0.8). The first cut was full body and read small on the board; the five Orc units were redone as chibi busts (see Orc bust redo). No keep argument is used for them any more. Idle + attack only (no skill clip, no HD).
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

## Orc bust redo (2026-10-16)
The first Orc stills and clips were full body with small heads. Redone as chibi busts (big head, waist up, ~92-99% fill, bottom edge cuts the body, magenta #FF00FF background) to match witch_doctor / ogre_chef / hooded_archer / bear_rider. Old stills, mp4s and sheets are in `assets/_green/v28/old_fullbody/`; raw new stills in `assets/_green/v28/new_bust/`; comparison image `orc_bust_compare.png` in this folder.
- Stills: `gpt_image_2_5`, quality high, 1:1, refs = the unit's card portrait + `units/witch_doctor` (Kodo: portrait + `units/bear_rider`). Prompt template: style prefix + "CHIBI BUST framing ...: <unit> with a HUGE head about half the image height, shown only from the waist up, centred, filling about 92% of the square frame, bottom edge cuts the body at the hips, no legs, no feet. Same character as the first reference portrait: <design>. Flat solid pure magenta #FF00FF background, no ground, no shadow."
  - Peon: pickaxe on shoulder, burlap sack with gold coins spilling out. Grunt: black topknot, red war paint, studded fur pauldrons, big battle axe. Headhunter: mohawk, tattoos, wooden-bead and bone-white charm necklace with feathers, spear quiver, one spear raised. Spirit Walker: white braided beard, feather headdress, blue-teal runic cloak, ghost lantern and gnarled staff. Kodo Beasts: chunky armored tusked beast head and front body, two war drums, small orc drummer on top.
- Clips: `seedance1_5`, 4 s, 480p, 1:1, no audio, start image = the new still. Idle: gentle breathing/bobbing, static camera, same size, fully in frame. Attack: Peon pickaxe chop, Grunt axe chop, Headhunter spear thrust, Spirit Walker lantern thrust with blue flash, Kodo drummer beats drums and beast stomps; all with "static camera, stays the same size, centred and fully in frame, never walks away or shrinks". Grunt attack was redone once (first take zoomed out mid-swing); the second adds "close-up bust shot, camera locked, no zoom out".
- Sheets: `tospritesheet.py ... 16 256 magenta` with no keep argument. Credits: balance went 78.55 -> 57.85 (20.7 spent for 5 stills + 11 clips).
- Soft spots: Grunt and Peon attacks drift a little and the axe/pick leaves the top edge briefly; Kodo's beast face is mostly hidden behind its armor plate.

## Grunt board art redo 2 (2026-10-16)
The bust redo left the Grunt's shoulders, arms and belt cut flat by the left, right and bottom frame edges, so he read as a square tile. Redone with a smaller, tapering body that sits inside the frame. Old still, clips and sheets are in `assets/_green/v28/old_bust/`; raw new still in `assets/_green/v28/new_bust2/grunt.png`; comparison image `grunt_redo_compare.png` in this folder (yellow box = 12px band inset).
- Still: `gpt_image_2_5`, quality high, 1:1, refs = the previous magenta Grunt still + `cards/portraits/grunt` + `units/witch_doctor`. Prompt: style prefix + "COMPACT CHIBI BUST of an orc Grunt: a HUGE head about half the image height, with a SMALL narrow body below it, shown from the waist up, centred. The body is small and tapers inward like a rounded egg or the witch doctor's robe: narrow sloped shoulders, small fur shoulder pads, both arms tucked in close to the torso, torso narrowing down to a rounded bottom edge that sits fully INSIDE the frame (a visible rounded curved bottom with magenta empty space beneath it, NOT cut off by the frame). The whole character occupies only about 80% of the frame width and about 85% of its height, with wide empty magenta margins on the left, right and bottom corners. Only the big battle axe handle may poke slightly past one side. Same character as the first two references ... green orc, black topknot, red war paint, studded fur pauldrons, round belt buckle, big battle axe held close. Silhouette style and proportions like the third reference (witch doctor): rounded, tapering bottom. Flat solid pure magenta #FF00FF background, no ground, no shadow."
- Clips: `seedance1_5`, 4 s, 480p, 1:1, no audio, start image = the still. Idle: "Gentle idle: slow breathing, chest and shoulders rise and fall slightly, head bobs a little, topknot sways, axe stays held close. Static locked camera, no zoom, no pan, no drift. Same size and position, centred and fully inside the frame with magenta margins at the sides and bottom." Attack: "Short axe chop: he lifts the axe slightly then swings it down and across in front of his body once, then returns to the ready pose. Close-up bust shot, camera locked, static, no zoom, no pan ... axe never leaves the frame, never walks away or shrinks." (Wording "zoom out" triggered an "Earth zoom out" preset suggestion; retried without it.)
- Sheets: `tospritesheet.py` crops every frame to the union bounding box of the clip and rescales it to fill 256px, so with no padding the character always touches the frame edge, whatever the still looks like. A scratchpad copy with the box widened 16% (`side = max(w,h)*1.16 + 8`) was used: `tospritesheet 16 256 magenta`, no keep argument. The shared script is unchanged; other units' sheets (Peon, Headhunter, Spirit Walker) still fill the frame the old way.
- Soft spot: in attack frames around the chop the axe head dips low and one frame has it clipped by the video edge.

## Margin re-cut (2026-10-16)

Peon, Headhunter, Spirit Walker and Kodo Beasts sheets re-cut from the same clips with `PAD=1.16 tospritesheet.py ... 16 256 magenta`, so every Orc sits inside the frame like the Grunt redo (left, right and bottom 12px bands empty on all 16 frames). No credits.
