# v2.4 The Silver Tribunal: art prompts and pipeline

Art for Book 2 Story 5 was made with the Higgsfield MCP on 2026-10-12. The full prompt for every image is
in `shared/art-requests.ts` (`B25` rows, group "v2.4 Arts Requirements", ids `book2s5:<id>`); this file
records the style, the models and the file names. Same pipeline as Story 4 (`docs/features/v2.3-the-iron-oath/ART_PROMPTS.md`).

Aurelion is clockwork, brass and silver artifice. No angels, wings-as-divinity, halos or divine beings
anywhere (the user reserves angels for a later series).

## Style and models
- Stills: `gpt_image_2_5` (GPT Image 2.5 Flare, default quality), 0.25 credits each. 1:1 sprites, portraits and icons, 16:9 panels and banners, 4:5 cover, 3:4 card back, 9:16 arenas.
- Style prefix: "Flat 2D vector cartoon game art, thick dark navy outlines, simple two-tone cel shading, chunky rounded badge-like proportions, bright saturated colors, no gradients, no text, no watermark."
- References: `style/style_anchor_v2.png` on everything; monsters add `_green/orc_brute.png` + `_green/v12/corrupted_villager.png`; bosses add `_green/lich_king.png`; panels attach the Story 1 panel `b2s1_p15_dust.png` (the Keeper's party), the story's own boss/Scale stills (job ids work as references) and witness portraits (panel 4). The party reference contains Vaeltharion in the middle, so party panels say "no antlered elf king" (panels 1 and 11 were re-rolled for that).
- Sprites, portraits and icons sit on flat magenta (#FF00FF) and are keyed with `keyimg.py --color magenta` (no magenta in the art; all border pixels checked, 0 opaque).
- Arenas are image edits of `locations/arena_winter_village.png` (same ring path and 5x3 tiles).
- Clips: Seedance 1.5 Pro (`seedance1_5`), 4 s, 480p, 1:1, no audio, start image = the still's job id; `declined_preset_id` 24bae836-... and f1821f84-... against preset suggestions. Arena loops 720p 9:16.
  Sheets: `tospritesheet.py in.mp4 out 16 256 magenta` (death/intro clips: `magenta+`). All 25 sheets have border score <= 0.08 (hazy threshold 0.5).
- Helpers: `assets/b2s5get.sh` (url<TAB>path), `assets/b2s5pend.sh` + `assets/_b2s5_pending.tsv` (job id -> path), jobs logged in `assets/jobs.tsv`. Raw green/magenta stills live in `assets/_green/v25/`; reference uploads in `assets/_refs25/`.

## Files (raw pack path -> built game file)
| id | raw pack | notes |
|---|---|---|
| argent | `units/argent.png`, `animations/units/argent_{idle,attack,skill}.mp4`, `cards/portraits/argent.png` | redeemed, warmer light; SD sheets only. Skill sheet has a faint pink burst from the key |
| brass_warden, ledger_crossbowman, chainbearer, quill_drone, gavel_golem | `monsters/<id>.png`, `animations/monsters/<id>_{walk,death}.mp4` | quill_drone fast and flying, gavel_golem heavy |
| prosecutor, bailiff, argent_justiciar | `bosses/<id>.png`, `animations/bosses/<id>_{walk,attack,death,intro}.mp4`, `ui/boss_banners/<id>.png` | argent_justiciar is cold silver, not violet (the orb has a few faint violet-white sparks) |
| arenas | `locations/arena_{aurelion_court,aurelion_cells,great_scale,falling_aurelion}.png` + `animations/locations/<name>_loop.mp4` | stills are image edits of the winter village arena |
| cover | `story/covers/book2_story5_the_silver_tribunal.png` | |
| portraits | `story/portraits/{argent,argent_weeping,prosecutor,bailiff,great_scale,vaeltharion_dust}.png` | keyed |
| ui icons | `ui/{plea_guilty,plea_not_guilty,law_no_fire,law_only_four,law_no_merge,law_no_summon,chain,sentence,cell_locked,cell_broken}.png` | keyed; plea_guilty carries the word GUILTY |
| card back | `ui/cardback_broken_scales.png` | 3:4, broken scales, one pan white one black |
| rally allies | none | reuse existing `story/allies` art |

## Panels (`story/panels/`)
| n | slug | scene |
|---|---|---|
| 1 | `b2s5_p1_silver_light` | silver light lifts the party into the sky |
| 2 | `b2s5_p2_aurelion` | Aurelion floating above the clouds |
| 3 | `b2s5_p3_chains_in_court` | the party wakes in chains before the brass court |
| 4 | `b2s5_p4_verdict_guilty` | verdict GUILTY, witnesses in the gallery |
| 5 | `b2s5_p5_lockboxes` | deck confiscated into brass lockboxes |
| 6 | `b2s5_p6_cell_galleries` | the cell galleries |
| 7 | `b2s5_p7_escape_great_scale` | escape onto the Great Scale |
| 8 | `b2s5_p8_scale_pans` | the Scale's pans |
| 9 | `b2s5_p9_scale_level` | the Scale settles level |
| 10 | `b2s5_p10_foundation_cracks` | Aurelion's foundation cracks |
| 11 | `b2s5_p11_sentence_on_the_world` | Argent passes sentence on the world |
| 12 | `b2s5_p12_golden_dust` | Vaeltharion's golden dust speaks to Argent (mid-boss) |
| 13 | `b2s5_p13_gavel_shatters` | gavel-sword shatters, quicksilver tear |
| 14 | `b2s5_p14_orb_cleansed` | Orb cleansed, fifth shard tears free |
| 15 | `b2s5_p15_five_shards` | the Keeper and Aelyria watch five shards fly to the broken scales |
| 16 | `b2s5_p16_two_toned_voice` | the two-toned voice, broken scales |
| 17 | `b2s5_p17_violet_chaos` | violet chaos on every land |
| 18 | `b2s5_p18_argent_kneels` | Argent kneeling |
| 19 | `b2s5_p19_end_of_book_two` | End of Book 2 title card (empty centre for a title) |

Known soft spots: panel 4 witnesses are small and may be loose likenesses; the Keeper is never shown as a
single named character (the party and a hooded figure from behind stand in); the court arena still has a
snowy look from the winter-village base; death clips end with a little debris (the build fades them).
