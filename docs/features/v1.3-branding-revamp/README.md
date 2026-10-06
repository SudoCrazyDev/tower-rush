# v1.3.0: Branding Revamp

**Status:** Live · **Version:** 1.3.0 · **Date:** 2026-10-06

Tower Rush is renamed **Crown & Keep: Tower Defense**. The name "Tower Rush" was already taken.
The colours, art style and game stay the same.

## 1. The name

- **Name:** Crown & Keep. **Store title:** Crown & Keep: Tower Defense (the genre word helps app
  store search).
- **Why this one:** short, alliterative, and it describes the game: you defend the keep and
  the crown. A search on 2026-10-06 found no game with the name. The closest are "Keep the
  Crown" (a board game and a small itch.io game) and "Crowned Control" on Steam.
- **Rejected:** "Adventure Royale: Tower Defense" ("Royale" suggests Clash Royale or a battle
  royale, and there's already an "Adventure Battle Royale"); anything with "Clash"; "TowerFall"
  (an existing game).
- Not done yet: trademark search, domain, store name reservations.

## 2. Brand assets

Source files are in [`assets/brand/`](../../../assets/brand). They were generated with GPT
Image 2.5 on Higgsfield, using the old logo as a style reference, for about 7.5 credits.

| File | What | Used in |
|---|---|---|
| `logo.png` (= `logo_b.png`) | Main logo: CROWN & KEEP with a shield "&", battlements on KEEP, the crossed sword and staff from the old logo, and a blue TOWER DEFENSE ribbon. Keyed from green. | `assets/ui/logo.png` → `ui/logo.webp` (boot screen, lobby, What's New) |
| `logo_a.png`, `logo_c.png` | Alternatives: castle tower behind the name; castle gate | Not used |
| `icon.png` (= `icon_b.png`) | App icon: gold shield with a keep, crowned, on blue rays | Favicons and the apple-touch icon (`game/src/brand/`), admin favicon |
| `icon_a.png` | Alternative icon: stone tower wearing the crown | Not used |
| `og_image.png` | 1200×630 share image (logo on the dimmed loading key art) | `og:image` meta, served from R2 at `brand/og_image.png` |
| `feature_graphic_1024x500.png` | Google Play feature graphic | Store listing |
| `key_art_1920x1080.png` | Wide key art | Store and press |
| `icon_512.png` | 512px icon | Store listing |
| `tower_rush_logo_legacy.png` | The old logo, kept for the before/after promo | Promo only |

The arena, lobby and loading backgrounds have no baked-in text, so they didn't need changes.
Their crown banners already fit the new name.

## 3. What changed in the game

- Page title, meta description, favicon, apple-touch icon and share (Open Graph / Twitter) tags in
  `game/index.html`. Admin page title and favicon.
- The new logo on the boot screen and in the lobby (same texture key, `ui:logo`).
- **What's New popup** (`game/src/scenes/whatsNew.ts`): "NEW IN 1.3.0 · BRANDING REVAMP · Tower
  Rush is now Crown & Keep!", with the new logo and a note that progress carries over.
- `game/package.json` is 1.3.0. Doc headings and code comments use the new name.

## 4. What deliberately did not change

Players never see these, and renaming them would break things:

- **Browser storage keys** (`tower-rush-token`, `-device`, `-audio`, `-whats-new`...): renaming
  them would log every player out and reset their settings.
- **The PvP WebSocket protocol** `"tower-rush"`: old and new clients must keep matching each other.
- **Cloudflare resources**: the Worker `tower-rush`, the D1 database, the R2 bucket
  `tower-rush-assets`, and the workers.dev URL. Renaming these is a migration, best done together
  with a custom domain (e.g. crownandkeep.gg) later.
- Package names in `package.json` files, and the past release docs and promo kits (v1.1, v1.2),
  which stay as they were.

## 5. Shipping checklist

1. `node scripts/upload-art.mjs ui brand` (or a wrangler bulk put) so R2 has the new `ui/logo.webp`
   and `brand/og_image.png`.
2. Build and deploy the Worker (DEPLOY.md).
3. Tag `v1.3.0`, set the status in [../README.md](../README.md) to Live.
