# Asset Pack — Crown & Keep (formerly Tower Rush)

Original art in a flat 2D vector cartoon style (thick navy outlines, simple cel shading,
chunky badge-like characters). Generated with Higgsfield on 2026-10-03 (1,631 credits).
Style reference: `style/style_anchor_v2.png`.

## Folders

| Folder | Contents |
|---|---|
| `units/` | 60 defender unit icons (transparent PNG, 1024px) |
| `units_awakened/` | 36 max-level "awakened" versions of the original 36 units |
| `heroes/` | 8 hero/commander characters |
| `monsters/` | 30 enemy monsters |
| `bosses/` | 12 bosses |
| `cards/` | 5 rarity card frames (common → mythic) + card back |
| `cards/portraits*/` | Card bust art: 60 units, 35 awakened, 8 heroes (frame is composited in code) |
| `items/` | Currencies, chests, potions, essences, tokens |
| `ui/` | Logo, buttons, panels, HUD, banners, rank/element icons, emotes, stat icons, boss banners |
| `vfx/` | Static projectiles and impact sprites |
| `locations/` | 16 battle arenas (U-path + 5×3 grid), lobby, shop, world map, deck room, chest vault, PvP |
| `animations/` | Green-screen MP4 source clips (see below) |
| `sprites/` | Transparent PNG frames + horizontal sprite sheets built from `animations/` |
| `video/` | Main trailer (with music) + 4 promo shots |

### Animations (`animations/`)
- `units/` — idle, attack, skill for all 60 units (480p) + a few extras
- `units_awakened/` — idle, attack, ultimate skill (480p)
- `units_hd/` — 720p idle + attack for all 60 units
- `heroes/` — idle, skill, victory; `heroes_hd/` — 720p idles
- `monsters/` — walk + death for all 30, plus some hits/attacks/specials; `monsters_hd/` — 720p walks
- `bosses/` — walk, attack, death, intro; `bosses_hd/` — 720p walk + attack
- `vfx/` — explosions, lightning, ice, poison, heal, summon, merge, coins, etc.
- `locations/` — ambient loops for arenas and menu backgrounds (no keying needed)

The clips use a pure green background. `tospritesheet.py` keys it out:

    python tospritesheet.py animations/units/ember_witch_attack.mp4 sprites/units/ember_witch_attack 16 256

`build_sprites.sh` runs it over every clip (16 frames; 256px standard, 384px HD).

The VFX clips came back on a dark, vignetted green instead of pure green, so their sheets
in `sprites/vfx/` were re-keyed with `../game/tools/rekey.py` (fits the background per frame).

## Notes
- `jobs.tsv` maps each Higgsfield job ID to its local file; `manifest.json` lists everything.
- Known gaps: the awakened mermaid's animations and portrait were blocked by the
  content filter (false positive). The base mermaid has full idle/attack/skill coverage.
- `_green/` holds the green-screen copies used as animation inputs and can be deleted.

## v1.1 Supporting Cast (2026-10-05)
- `_green/<unit>.png`: green-screen stills for Mime, Portal Imp, Mirror Slime, Lucky Cat and Echo
  Spirit (GPT Image 2.5, references: `style/style_anchor_v2.png` + `_green/bee_keeper.png`).
- `keyimg.py` keys a still into `units/<unit>.png` (the same soft key as `tospritesheet.py`).
- `stillsheet.py <unit>...` builds placeholder idle/skill sheets (`sprites/units*/`) and the card
  portrait (`cards/portraits/`) from the keyed still, until real Seedance clips exist.

## v1.2 Stories, Book 1 (2026-10-06)
All art for Book 1 (*The Chosen*, Stories 1–3), about 394 credits. References: `style/style_anchor_v2.png`
plus `_green/bee_keeper.png` (units), `_green/orc_brute.png` (monsters), `_green/lich_king.png` (bosses).
- `_green/v12/`: green-screen stills (10 units, 19 monsters, 8 bosses), keyed into `units/`, `monsters/`, `bosses/`.
- Clips: units idle/attack/skill (+ HD idle/attack), monsters walk/death (+ HD walk), bosses
  walk/attack/death/intro (+ HD walk/attack). Extras: `bosses/chaos_jawbreaker_crack`, `bosses/portal_wizard_portal`.
  Muse's "attack" clip is her buff pulse; Aegis Knight's is a shield pulse.
- `cards/portraits/` (10), `cards/frame_event.png` (Event rarity), `ui/boss_banners/` (8),
  `ui/icon_story.png`, `ui/status_{irritation,fatigue,shellshock,rally}.png`.
- Arenas (image edits, so the path and grid match the base arena's layout):
  `arena_candy_palace`, `arena_corrupted_candy_kingdom`, `arena_jawbreaker_core` (base: candy_land),
  `arena_upside_down_village` (base: winter_village), `arena_hollow_woods`, `arena_first_rift`
  (base: mushroom_forest), each with a `_loop.mp4` ambient clip.
- `story/`: 15 panels (`panels/s<story>_p<n>_*.png`), 3 covers, story screen background,
  Candy King dialogue portrait, key art.
- Corrupted villagers have their tentacles and eyes drawn into the art (not a code overlay).
- Scripts: `v12get.sh`/`v12try.sh` download jobs listed in `_v12_pending.tsv`; `v12build.sh`
  keys stills and builds sheets; `v12sheet.py` makes review contact sheets.
- Weak spots worth a re-roll if they bother you: some death clips end with debris still on screen
  (jelly_bean_blob, corrupted_farmer), sprinkle_swarm's walk changes shape over the loop, and
  chaos_jawbreaker_crack ends as an open hole (better used as the final shatter).
