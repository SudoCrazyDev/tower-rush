# Game changelog

Releases up to 2.3.0 are documented per release in `docs/features/` (see `docs/features/ROADMAP.md`); tags `v1.1.0` to `v2.2.0` stay as game history. From here, tags are `game-vX.Y.Z`.

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
