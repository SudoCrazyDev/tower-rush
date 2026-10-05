# Promo kit: v1.2.0 Stories

Everything needed to announce the release on social media. Rendered graphics are in
[`promo/`](promo). Their source is `roadmap-video/src/promo/Stories.tsx`, with the data in
`storyCast.ts` and the placeholder emblems in `StoryGlyphs.tsx` (see
[How to re-render](#how-to-re-render)).

> **Placeholders:** none of the new units, monsters or bosses has art yet. The graphics draw a
> simple emblem in their place (a heart mug for Muse, a pentagon shield for Pentagonal Knight,
> and so on) with a dashed **ART TBD** tag. When the art exists, re-run the render: each
> placeholder is swapped for the real portrait and its tag disappears. **Don't post
> anything that still shows an ART TBD tag**, except the teaser, which is meant to look
> mysterious.

---

## Key messages

- **Headline:** *Stories*
- **Tagline:** *The Candy Kingdom is falling to chaos.*
- **Alt taglines:**
  - *Save the princess. Find the source. Break the chaos.*
  - *Your first story begins in Candy Land.*
  - *Knights fight for each other. Mercenaries fight for themselves.*
  - *A round on the house, from Princess Muse.*
- **What's new in one line:** Story mode is here. Fight through two connected stories, save
  Princess Muse, and lead a band of knights and mercenaries against the Chaos Jawbreaker.
- **Hashtags:** #TowerRush #TowerRushStories #TowerDefense #MergeGame #IndieGame

## Store "What's new" text (v1.2.0)

> **Stories are here!**
> The Candy Kingdom's people have been corrupted by violet chaos.
> - **Story 1, Saving the Muse:** fight from the candy gates to the palace with your own deck
>   and earn **Princess Muse**, the first **Event** card. She's a Barkeeper whose drinks boost
>   every ally around her.
> - **Story 2, Chaorruption:** lead a story-only band of **Knights and Mercenaries** to the
>   source of the chaos, and earn the **Pentagonal Knight** and the **Rogue Knight**.
> - New candy monsters, new bosses and three new arenas.

---

## Graphics

| File | Size | Use |
|---|---|---|
| [`st-keyart.png`](promo/st-keyart.png) | 1920×1080 | Store feature graphic, YouTube thumbnail, Discord and website announcement |
| [`st-square.png`](promo/st-square.png) | 1080×1080 | Instagram, Facebook and X feed post |
| [`st-story.png`](promo/st-story.png) | 1080×1920 | Instagram and Facebook stories, TikTok cover (launch day) |
| [`st-teaser-story.png`](promo/st-teaser-story.png) | 1080×1920 | Teaser story, about a week before launch (no names, monsters only) |
| [`st-banner.png`](promo/st-banner.png) | 1500×500 | X and Facebook profile header during the release |
| [`st-info-path.png`](promo/st-info-path.png) | 1080×1350 | Infographic: the 3 stories, 9 chapters, waves, bosses and rewards |
| [`st-info-muse.png`](promo/st-info-muse.png) | 1080×1350 | Infographic: Princess Muse and her 3×3 Last Call area |
| [`st-info-deck.png`](promo/st-info-deck.png) | 1080×1350 | Infographic: Story 2's Event deck (Knights vs Mercenaries) and the new status effects |
| [`st-info-knights.png`](promo/st-info-knights.png) | 1080×1350 | Infographic: the two Epic reward knights, Rally and Irritation |
| [`st-info-bestiary.png`](promo/st-info-bestiary.png) | 1080×1350 | Infographic: the 8 candy folk, 3 chaos-born monsters and 5 bosses |

**Video:** not made yet. The 30-second script is below. It needs the unit and boss
animations to look good, so it waits for the art.

---

## Posting plan and captions

| When | Graphic | Caption |
|---|---|---|
| Launch −7 days | `st-teaser-story` | Something's wrong in Candy Land… 💜 #TowerRushStories, coming soon. |
| Launch −5 days | `st-info-bestiary` | The candy folk have been corrupted. 8 candy monsters, 3 chaos-born and 5 bosses are coming in v1.2. Which one scares you most? |
| Launch −3 days | `st-info-muse` | Meet Princess Muse 💖 She's the Candy Kingdom's Barkeeper and the first Event card. She never swings a sword, but every ally around her fights harder. Save her in *Saving the Muse*. |
| Launch −2 days | `st-info-deck` | In *Chaorruption* your deck stays home. Pick 5 of 9 knights and mercenaries, all at the same level. Knights fight for each other; mercenaries fight for themselves. Placement is the puzzle. |
| Launch −1 day | `st-info-knights` | Fight beside them, then keep them. ⚔️ The Pentagonal Knight rallies its neighbours to double speed. The Rogue Knight is fast, but its neighbours start to miss. |
| **Launch day** | `st-keyart`, `st-square`, `st-story`, `st-banner` (header) | **Stories is LIVE!** Two connected stories, 9 chapters and 3 new cards. The Candy Kingdom needs you. Update now. |
| Launch +2 days | `st-info-path` | How Stories works: 3 canon stories, played in order. Finish one to unlock the next, and win chapters for up to 3 stars. |

---

## Video script (30s, once the art exists)

| Time | Shot | Text on screen |
|---|---|---|
| 0–4s | Candy Land, bright and sweet; a violet crack spreads across the sky | *The Candy Kingdom…* |
| 4–8s | Corrupted gummy bears and candy corn pour through the gate | *…is falling to chaos.* |
| 8–13s | Battle montage; the Sugar Plum Tyrant's intro | *Story 1: Saving the Muse* |
| 13–17s | Princess Muse card reveal, pink hearts | *New Event card: Princess Muse* |
| 17–23s | Knights and mercenaries on the board; Rally flash, "MISS" pops | *Story 2: Chaorruption* |
| 23–27s | The Chaos Jawbreaker cracks, violet core | *Break the chaos.* |
| 27–30s | Logo | *Tower Rush v1.2: Stories* |

---

## How to re-render

From `roadmap-video/`:

```bash
npm install
```

```bash
npm run promo:st
```

- Set `REMOTION_BROWSER` to an installed Chrome (for example
  `C:/Program Files/Google/Chrome/Application/chrome.exe`) if Remotion can't download its own.
- To render one graphic only, pass its id: `npm run promo:st st-info-muse`.
- To preview and edit: `npm run studio`, then pick an `st-…` composition.

**When the art arrives,** put it in `game/public/assets/` the usual way (`npm run assets`),
then re-run `npm run promo:st`. The script looks for:

| Art | Where it looks | Replaces |
|---|---|---|
| Unit portraits | `portraits/<id>.webp` (for example `princess_muse.webp`, `rogue_knight.webp`) | The unit's emblem and ART TBD tag |
| Monster and boss art | `monsters/<id>.webp`, `bosses/<id>.webp` (for example `gummy_bear.webp`, `chaos_jawbreaker.webp`) | The token's emblem |
| Event card frame | `cards/frame_event.webp` | The drawn pink frame with hearts |
| Candy Palace arena | `locations/arena_candy_palace.webp` | The Candy Land background |

The ids are listed in `roadmap-video/scripts/promo-st.mjs`, and they match the names in
[README.md](README.md) (lower case, with underscores). The script prints how many pieces of
art it found.
