# Tower Rush feature releases

Every player-facing feature ships as a numbered release with its own title, a design
document and a promo kit for social media.

| Version | Title | Status | Design doc | Promo kit |
|---|---|---|---|---|
| v1.1.0 | **Supporting Cast Arrival** | Live (2026-10-06) | [README.md](v1.1-supporting-cast-arrival/README.md) | [PROMO.md](v1.1-supporting-cast-arrival/PROMO.md) |

## Conventions

- **Version:** the game shipped as `1.0.0`. Each feature release bumps the minor number
  (`1.1.0`, `1.2.0`...). Fixes and balance patches on top of a release bump the patch number
  (`1.1.1`). A release changes `game/package.json` and is tagged `v1.1.0` in git when it ships.
- **Title:** a short, promotable name ("Supporting Cast Arrival"). It's used in the game's
  "What's new" popup, the store listing and every social post.
- **Folder:** `docs/features/v<major>.<minor>-<title-in-kebab-case>/` holds:
  - `README.md`: the design document (what it is, rules, numbers, art, build plan, open questions).
  - `PROMO.md`: taglines, post captions, the video script and the graphics list.
  - `promo/`: the rendered social graphics (PNG) and the promo video (MP4).
- **Promo graphics** are Remotion compositions in [`roadmap-video/`](../../roadmap-video), so
  they use the game's own art, fonts and colours and can be re-rendered when numbers or art
  change. Each release has its own source file (`roadmap-video/src/promo/<Release>.tsx`).
- **Status** moves Design → Building → Testing → Live. Update this table when it changes.
