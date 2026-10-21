# v2.9.5 "Rising Tide" promo kit

> Design doc: [README.md](README.md). Game 2.9.5, API 1.6.2. On staging; not on prod yet.
> Rebuild the posts with `python docs/features/v2.9.5-rising-tide/promo/compose.py <LilitaOne-Regular.ttf>`
> (the raw Higgsfield art is in `promo/raw/`, not in git). Every post and both reels are also on R2:
> https://assets.crownnkeep.com/marketing/v2.9.5/<file>.

## Assets

| Asset | File | Use |
|---|---|---|
| Key art, landscape | `promo/rising_tide_16x9.jpg` (1920×1080) | X, Facebook, Discord banner, YouTube |
| Key art, vertical | `promo/rising_tide_9x16.jpg` (1080×1920) | Stories, TikTok/Reels cover |
| Key art, square | `promo/rising_tide_1x1.jpg` (1080×1080) | Facebook / Instagram feed |
| Coming soon, vertical | `promo/coming_soon_9x16.jpg` | Stories before launch |
| Coming soon, square | `promo/coming_soon_1x1.jpg` | Feed post before launch |
| Teaser reel (12s, 9:16) | https://assets.crownnkeep.com/marketing/v2.9.5/teaser_reel.mp4 (+ `teaser_reel_clean.mp4` without text; rebuild with `promo/reel.py`) | TikTok, Reels, Shorts before launch |
| Unit spotlights | `promo/unit_<id>.jpg` ×5 (1080×1080) | One a day in launch week |
| In-game What's new | `game/src/scenes/whatsNew.ts` (`RELEASE` 2.9.5) | Shows once per device |
| In-game Coming soon | Lobby "?" orb under What's new, popup with `ui/coming_soon` (`TEASER` in `whatsNew.ts`) | Teases the Sea Serpent's reveal |

The Sea Serpent stays a mystery everywhere: never post its race, element or ability. Its art is shown in shadow on the
teaser and spotlight.

## Suggested schedule

| Day | Post |
|---|---|
| Launch −3 | Coming soon square + "Something stirs below the tide." |
| Launch −2 | Teaser reel |
| Launch −1 | Coming soon vertical (Story) + "Tomorrow." |
| Launch | Key art (all ratios) + the long announcement |
| +1 | Heart Surgeon spotlight |
| +2 | Dark Spawn spotlight |
| +3 | Windrunner spotlight |
| +4 | Cursed Totem spotlight |
| +5 | Sea Serpent spotlight: "Has anyone figured it out yet?" |

## Taglines

- "Something stirs below the tide."
- "The tide is rising. Five new units."
- "Every room is her operating table." (Heart Surgeon)
- "Despair has no bottom." (Dark Spawn)
- "Her gaze roots them where they stand." (Windrunner)
- "It never strikes. It only marks who dies." (Cursed Totem)
- "Race ???. Element ???. Ability ???." (Sea Serpent)

## Hashtags

Core: `#CrownAndKeep #RisingTide`
Reach: `#TowerDefense #IndieGame #IndieDev #MobileGames #BrowserGames #FantasyGame #GameUpdate`

## Coming soon post (short)

> 🌊 Something stirs below the tide...
> Crown & Keep v2.9.5 **RISING TIDE** is coming soon. Five new units, and one of them no one can explain.
> Play free at crownnkeep.com
> #CrownAndKeep #RisingTide #TowerDefense #IndieGame

## Launch announcement (Facebook / Discord, long)

> 🌊 **Crown & Keep v2.9.5: RISING TIDE is live!**
>
> Five new units join the defense:
>
> 🩺 **Heart Surgeon** (Mythic): keeps a Room on the path that cuts harder with every death inside it.
> Awakened, she becomes the Surgeon of Death.
> 😈 **Dark Spawn** (Mythic): may awaken himself mid-fight into one of three forms: Dark Zero,
> Dark Javelin or True Despair.
> 🏹 **Windrunner** (Legendary): her arrows root monsters in place, and when a rooted monster falls, the roots jump to
> everything around it.
> 💀 **Cursed Totem** (Legendary): never attacks. Units beside it may execute any monster (bosses excepted).
> 🐍 **Sea Serpent** (Legendary): race ???, element ???, ability ???. Find it in Legendary chests and tell us what you see.
>
> Also: Echo Spirit now becomes an exact copy of its neighbour.
>
> Play free: crownnkeep.com
> #CrownAndKeep #RisingTide #TowerDefense #IndieGame #GameUpdate

## X / short launch post

> 🌊 v2.9.5 RISING TIDE is live. Two new Mythics, two new Legendaries, and a Sea Serpent no one can explain. Play free:
> crownnkeep.com #CrownAndKeep #RisingTide #TowerDefense

## Reel hook text

- 0–4s: "Something stirs below the tide..."
- 8–12s: logo, "RISING TIDE · COMING SOON", crownnkeep.com
