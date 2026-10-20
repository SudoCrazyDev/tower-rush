# Game changelog

Releases up to 2.3.0 are documented per release in `docs/features/` (see `docs/features/ROADMAP.md`); tags `v1.1.0` to `v2.2.0` stay as game history. From here, tags are `game-vX.Y.Z`.

## 2.9.2
- Fix: smooth frame pacing on phones, most visible when scrolling the Deck. 2.8.1's frame limit of exactly 60 made Phaser skip a frame whenever the smoothed frame time came in a hair under 1000/60, so 60 Hz phones ran at 30-40 fps with uneven pacing (90 Hz ones at 45). The limit is now 62: 60 Hz screens hold a steady 60, and 90/120 Hz screens still draw at an even 45/60.
- Fix: the Deck page scrolls smoothly on low-end phones. Phaser's Mobile Pipeline (on by default for Android and iOS) batched one texture at a time, so every card frame, portrait and label was its own draw call: about 550 a frame on a full collection, against about 40 now. `?mobilepipe` turns it back on for comparison. Battles and other screens draw with the batched pipeline on phones too.
- The Deck collection only draws cards near the visible area (cull margin 260, was 600).
- Game only; no API change, `MIN_CLIENT` unchanged.

## 2.9.1
- Hotfix: every unlocked arena wins or loses trophies again, by your league's minimum wave. 2.9.0 limited trophies to your two highest arenas. Arena card, arena info and What's new text updated.
- Needs API 1.6.1.

## 2.9.0 "League Revamp"
- Each league has a minimum wave for solo runs: reach it to win trophies (no cap), fall short and you lose them. Longer league gates (some players drop a league), plus the new Mythic (10,000) and Immortal (15,000) leagues. Details in `docs/features/v2.9-league-revamp/`.
- Trophies only count in your two highest arenas; lower arenas pay gold only. The arena card, arena info and the run result say which rule applied.
- A run left unfinished counts as a trophy loss when you start the next one.
- Secret Society League: hidden as "???" until a player with 30,000 trophies, 5M gold and 10,000 gems is recruited by a lobby popup. Entry fee once, then 30,000 gold + 1,000 gems every 30 days.
- Leagues list: every league is now a scrolling card that shows the player on top of it right now; tap them for their profile. The list opens on your league.
- Player profiles: tap a leaderboard or arena top-list row (or your own avatar in the lobby) for a character page with the player's hero and 5 deck units idling on a stage, their levels, trophies, best wave, ranked record, and every badge earned (leagues reached, peak ranked tier, story badges). Your own profile has the AVATAR button that used to open from the lobby avatar.
- Needs API 1.6.0.

## 2.8.6
- Unit Lab: the TEST ★5 button (every board unit to max rank) now shows in every build, not only dev and staging. On phones it sits in the summon button's free spot instead of on top of the deck cards.

## 2.8.5
- Grunt redrawn with a rounded silhouette, so he no longer reads as a square tile. Unit art rules written down in `assets/UNIT_ART_STYLE.md`.

## 2.8.4
- The Orcs are redrawn as chibi busts, the same size and framing as the other board units.

## 2.8.3
- Orc ability effects: Grunt's rage ring and a BERSERK callout at every tier, Headhunter's FRENZY from wave 20 and red focus spears with a reticle, and a War Drums badge on every sped-up unit.

## 2.8.2
- The square backgrounds behind 17 particle and weapon sprites are removed.

## 2.8.1
- Late-wave lag fix: an effect budget, capped floating text, throttled HP labels and a 60 fps limit keep battles past wave 20 smooth (and phones cooler).
- New Slow and Frozen status art and a new Headhunter portrait.

## 2.8.0 "Beta Release: Beta Berserker"
- Five Orc units with the new neutral Normal element: Peon, Grunt, Headhunter, Spirit Walker and Kodo Beasts. They never awaken. Details in `docs/features/v2.8-beta-berserker/`.
- Unit Lab for everyone (unowned cards are locked), lobby mode carousel with PvP in it (the PvP button is gone), Mythic projectiles, and the Summon button shrink fix.
- Balance: Crystal Golem awakened speed x0.4, Hourglass Owl charge 40%, Sand Worm damage 47, Sand Monk damage 19.

## 2.7.3
- Battle Deck: new GROUP: RACE mode (after Role) shelves the collection by race (`shared/races.ts`), each with its race colour and an owned/total count. Races with no cards (Candy, Chaos) are skipped.

## 2.7.2
- Vampire's Kiss reads as a bite now: every monster the Vampire Countess hits pays 2 mana plus her Plunder on the hit (`REWORKS.vampire_countess`), and still pays again when it dies.
- Queen's Gambit (awakened Countess): every monster still walks in kissed, and the kiss is now a drain. It deals 30% of her hit per second and pays 3 mana plus her Plunder every second while she is on the board (`ULTIMATES.queens_gambit` `drain`, `tick`), plus 3 on death. Code values, no HOTFIXES entry.

## 2.7.1
- Portal: when the board is locked (every tile taken and no two units can merge), a portal opens under the board. Drag a unit into it and it leaves the board, refunding 40% of its worth (summon cost x rank, `ECONOMY.portalRefund`) as mana. Awakened units, chapter heroes and witnesses can't go through. The portal closes as soon as a tile is free or a merge is possible. Solo battles and PvP (new `banish` action); not in the Unit Lab. Art: `ui/board_portal` (a ring of rune stones around a violet vortex, GPT Image 2.5), with the arcane vortex spinning on top; a drawn rim stands in if the art is missing.

## 2.7.0 "The Great Awakening"
Full design: `docs/features/v2.7-the-great-awakening/README.md`.
- Max merge rank 7 to 5 (HOTFIXES `2.7.0-max-rank`): awakening needs 15 summons instead of 63. The Trial's witness drops to rank 4 (`2.7.0-witness-rank`).
- Card levels add attack speed: +3% per level (`ECONOMY.levelSpeedBonus`), on top of +8% damage.
- Awakenings defined in code (`shared/awakened.ts`, behaviour in `shared/ultimates.ts`): each awakened unit has its own damage and speed multipliers and its own ultimate (timer, passive or always-on field). Commons (8), rares (10), epics (10), legendaries (4) and mythics Void Titan and Chrono Mage. Units without an entry keep the generic awakening.
- Rare reworks (`shared/reworks.ts`): Frog Alchemist poison puddles, Raccoon Thief mana pulse, Vine Druid prickly vine, Snowglobe Fairy 20% freeze. Vampire Countess: Vampire's Kiss on every hit (2 mana plus Plunder when the monster dies).
- Retired: Mirror Slime, Banner Herald and Mime (`enabled: false`, HOTFIXES `2.7.0-retired-supports`); the daily copies quest is no longer picked.
- Unit Lab: a lobby mode to place any units anywhere on the meadow and pick the next wave.
- Awakened card back panel (boosts, ultimate, readable cooldown pill); ultimate VFX, fields (puddles, mushrooms, dolls, vines, hives, black holes, skeletons), frost and scorch overlays; new awakened art for Crystal Golem (no legs) and Plague Alchemist, procedural Tide Mermaid sheets.
- What's New popup: 2.7.0.

## 2.6.2
- Buttons no longer shrink a little more with each quick tap (seen on PvP send buttons). The press animation read the button's scale mid bounce-back as its normal size; a press during that bounce-back now snaps back to the full size first.

## 2.6.1
- Lobby: an INSTALL THE APP pill (ADD TO HOME SCREEN on iPhone/iPad) in the event strip's spot, above the buttons on phones and in the top bar on wide screens. It shows only where the game can be installed and isn't yet, gives way to a live event, and its close button hides it for a week. It appears late if the browser offers the install after the lobby is up.
- Install dialog (`scenes/installApp.ts`): the logo, what the app gives, and INSTALL (the browser's own prompt), or the Share steps on iPhone/iPad, or the browser-menu steps elsewhere (switching to INSTALL if the browser offers it meanwhile).
- `?install` (the website's Install app buttons) opens that dialog once the lobby is up, even for new players mid-tutorial; that visit skips the What's New popup.

## 2.6.0
- Installable app (PWA). The game has a web manifest (fullscreen, portrait, Crown & Keep icons including a maskable one) and a service worker, so Android Chrome, Edge and Samsung Internet can install it to the home screen. Settings shows INSTALL APP where the browser offers it (in place of the keyboard tips); on iPhone and iPad Safari it says to use Share, then Add to Home Screen.
- Service worker (`game/pwa/sw.js`, filled in by the `pwa()` plugin in `vite.config.ts` at build time; production builds only). The page is fetched from the network first, so a deploy reaches players on their next load; the cached copy answers only offline. The build's JS, CSS and icons are precached and swapped on every build. Art from `assets.crownnkeep.com` and Google Fonts is served from the cache and refreshed in the background, so re-uploaded art under the same file name shows one load later. The API, the asset index (`?t=`), videos and non-GET requests are never cached.
- Phones: the menus now fill the screen's width. The portrait layout is as wide as the screen allows (752 to 1000, still 1640 tall) instead of a fixed 752 with bars at the sides. Battles and PvP narrow it back to the arena's 752 while they run. The lobby's coin, gem and trophy pills spread across the extra width.

## 2.5.3
- Sign-in panels: the dark fill now comes from the panel art itself, so its square corners no longer show past the rounded frame.

## 2.5.2
- Sign-in panels: the first line under the title no longer touches the panel's top frame (14 px more room; the title stays on the ribbon).

## 2.5.1
- Welcome, sign in, create account, forgot/reset password and the other HTML panels now use the game's art: the logo above, the gold-framed dialog panel with the title on its ribbon, the 9-slice yellow and green buttons, dark inset fields with a gold focus ring, and a gold checkbox. The backdrop behind is blurred.

## 2.5.0
- Email and password recovery. Creating an account now asks for an email (guests still play without one), with an optional newsletter checkbox. A 6-digit code is mailed to confirm the address.
- Forgot password: Sign in, "Forgot password?", enter the account email, then type the 6-digit code from the email (valid 15 minutes) and a new password. Other devices are signed out.
- Sign in with your username or your email.
- Settings, ACCOUNT (registered players): confirm the email, add or change it (needs the password), change the password, newsletter on or off. Settings nudges players who have no email or haven't confirmed it.
- Cloudflare Turnstile bot check on sign in, create account and forgot password. It stays invisible unless Cloudflare wants a click; then the form says "Tick the box above to continue" and goes on by itself once ticked. The sitekey comes from `/api/config` (`turnstileSiteKey`).
- Needs API 1.2.0 (`MIN_CLIENT` 2.5.0): older clients can't send the bot check.
- Invites: the link in an invitation email (`?invite=`) opens a "You're invited!" sign-up with the invited email filled in and locked; the account starts with that email confirmed. Where the server is invite only (staging), the start screen offers only SIGN IN, and a used or expired link says so.

## 2.4.1
- Hotfix: in The Throne of Dust (Book 2 Story 3, chapter 3) any unit can be dragged onto an empty tile, so you can reach the braziers. Driven by a new chapter flag, `ChapterMechanics.freeMove`; `ADDED_MECHANICS` copies it into saved configs, which would otherwise hide it. Only the game changed; the API did not, and `MIN_CLIENT` stays 2.4.0.
- Hotfix: in The Iron Oath (Book 2 Story 4, chapter 1) families no longer die at the start of the road. Hunters dive only on a family ahead of them, within 15% of the path (it was 30% in either direction), and only 6 s after spawning (it was 3 s). Ships with API 1.1.1, which resets the saved chapter.
- Fix: on the Event deck pick screen (The Iron Oath) a dwarf's info line showed "(undefined)" in place of its role; it now shows its race, like the card label.
- Fix: the Walking Forge part bars (The Iron Oath, chapter 2) can now be tapped on desktop. In the wide layout their tap targets had been offset by the camera scroll.
- Balance: the Walking Forge's iron minions (The Iron Oath, chapter 2) have a tenth of their old HP. A new wave option, `StoryWave.minionHp: 0.1`, brings the soldier from about 1188 to 119 HP; the Forge keeps 243,000.
- Balance: breaking the Walking Forge's legs now stops it dead, where before it only slowed. In return its furnace spawns iron soldiers twice as often, every 3.5 s instead of 7 s. New `BossPart.haste`; Brakka's lines updated to match.
- Balance: the Walking Forge's parts are rebalanced. The legs drop from 109,350 to 60,750 HP (0.45 to 0.25 of the core), the cannons rise from 97,200 to 121,500 (0.4 to 0.5) and the furnace from 97,200 to 170,100 (0.4 to 0.7), so it keeps spawning longer. The core keeps 243,000.
- Balance: the Walking Forge walks slower, at speed 8 instead of 12.
- Balance: the Chaos-Iron Colossus (The Iron Oath, chapter 3) grows more with each iron monster it eats, 5% HP instead of 4% (up to 24 stacks).
- Balance: once its legs break, the Walking Forge's furnace spawns every 2 s (it was every 3.5 s), so a stuck Forge can't simply be waited out.
- Balance: the Walking Forge's broken legs regrow. Over 55 s they fill back to 0.6 of their last max HP, then it walks on and the furnace cools back. New `BossPart.repair`. The cannons drop to 0.35 of the core (85,050 HP) and the furnace to 0.5 (121,500).

## 2.4.0
- Book 2 Story 5, "The Silver Tribunal": pleas and laws, the confiscated deck and cells, chains, the Great Scale, the collapsing city, Argent. New card Argent, the Merciful and badge Unbroken. See docs/features/v2.4-the-silver-tribunal.
- New battle rules live in `shared/`, so the API ships with it and `MIN_CLIENT` is 2.4.0.

## 2.3.0
- Hosted as its own static Worker on game.crownnkeep.com; talks to the API at api.crownnkeep.com.
- Sends `X-Client-Version` (WebSockets: `v=`). When the API answers 426, or `/api/config` reports a `minClient` above this version, shows a "New version available" prompt with an Update button.
