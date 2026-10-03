# Asset Pack — Tower Rush (working title)

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
