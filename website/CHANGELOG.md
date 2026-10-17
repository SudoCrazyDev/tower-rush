# Website changelog

## 1.6.1
- Game 2.9.1 hotfix: the trophy card and wiki say every unlocked arena counts; release notes get a v2.9.1 hotfix block and mark the arena lock as lifted. Cache queries on `app.js` and `wiki.js` bumped to `?v=2.9.1`.

## 1.6.0
- v2.9 player profiles and the new leagues list: new sections on `v2-9.html` (Player profiles, The leagues list, in the jump nav), an "Also new" list in the v2.9.0 release notes, a line in the home page news post, and a wiki section "Player profiles and badges" (what a profile shows, every story badge). Cache query on `wiki.js` bumped to `?v=2.9.0`.
- Trailer: "Watch trailer" plays the new 30-second trailer (`video/trailer_v2.mp4`, 1080p re-encoded to 18 MB with faststart) with its own poster frame (`video/trailer_v2.webp`). The old `video/trailer.mp4` stays in R2.
- Leagues: the trophy card, home ladder and wiki explain the v2.9 rules (each league's min wave, no gain cap, two highest arenas only), with Mythic and Immortal added. The Secret Society shows only as "??? League, Invite only".
- New release page `v2-9.html` (League Revamp: trophy rules, the league ladder table, arena lock, leaving a run, and a "???" teaser that never names the Society). Release notes get v2.9.0 as the latest (v2.3 moves to the history), and the home page gets a v2.9 news post and live pill. Cache queries on `data/game.js` and `app.js` bumped to `?v=2.9.0`.

## 1.5.0
- New page `support.html` ("Support us", in the top menu and footer of every page): totals, monthly running costs, each goal category with progress bars, rollover and donor names, the general fund and the latest supporters, all from the API's `/api/funding`. Donate opens a dialog: amount (with a "finish it" amount), wall name or Anonymous, then a `CK-XXXX` code with the GCash QR and peso amount (or a Ko-fi link once a handle is set). Needs API 1.5.0.
- New page `wiki.html` (Wiki, in the top menu and footer): every unit with filters and full info, rarities and elements, awakening, PvP modes, leagues (same tinted card frames as the home page ladder), chests, the daily login calendar and every race. Data from `data/game.js` through the shared `wiki-kit.js`.
- New page `stories.html` (Stories): each saga, book, story and chapter with the story bosses, foes, unlockable cards and badges, so new sagas get their own tab.
- Gold gauntlet mouse cursor on every page (`brand/cursor_point.png`, and `brand/cursor_press.png` over links and buttons). Cache query on `styles.css` bumped to `?v=2.8.3`.

## 1.4.2
- Hero: Discord and Facebook buttons under the Play / Trailer / Install row. Cache query on `styles.css` bumped to `?v=2.8.2`.
- Top menu shows only News and Release notes on every page. The section links (How to play, Units, Heroes, Arenas, Bosses, Modes, PvP, Leagues) are commented out in the HTML, not deleted, so they can come back.

## 1.4.1
- Footer on every page has Discord and Facebook buttons (discord.gg/q7wq9DCfE and the Crown & Keep Facebook page), in their brand colours. Cache query on `styles.css` bumped to `?v=2.8.1`.

## 1.4.0
- New page `v2-8.html`: the full v2.8.0 "Beta Berserker" list. The five Orcs (Peon, Grunt, Headhunter, Spirit Walker, Kodo Beasts) with their stats and abilities, the Normal element, the Unit Lab for everyone, the mode carousel, Mythic projectiles, balance changes and fixes.
- Release notes: v2.8.0 is the latest (with a button to the new page). v2.2 "Sand & Sea" moves into the History panel, so the page keeps the latest five.
- Latest news: v2.8.0 is the featured post (Grunt portrait); the v2.7 post joins the regular ones and the v2.2 post is dropped to keep five. Hero pill says v2.8 Beta Berserker is live.
- Unit data re-exported from `shared/`: the Orcs' card text comes from `orcText` (shared/reworks.ts), so the codex shows Pillage, Berserker Strength, Berserker Upgrade, Ancestral Spirit and War Drums. The codex has a Normal element shelf ("House pour"). Cache query on `styles.css`, `app.js` and `data/game.js` bumped to `?v=2.8.0`.

## 1.3.1
- Vampire Countess text follows game 2.7.2: Vampire's Kiss pays 2 mana plus Plunder on every hit (and again on death); Queen's Gambit drains every monster and pays 3 mana each second. `data/game.js` re-exported and the `v2-7.html` note updated.

## 1.3.0
- New page `v2-7.html`: the full v2.7.0 "The Great Awakening" list. Every awakened unit (commons, rares, epics, legendaries and mythics) with its damage and speed multipliers, ultimate, type and effect; the four rare reworks; card levels (+3% attack speed), max rank 5; the Unit Lab; and the retired supports.
- Release notes: v2.7.0 is the latest (with a button to the new page). v2.1 "Chaos Corrupted" moves into the History panel, so the page keeps the latest five.
- Latest news: v2.7.0 is the featured post; the v2.6 post joins the regular ones and the v2.1 post is dropped to keep five. Hero pill says v2.7 The Great Awakening is live.
- Unit data re-exported from `shared/` (awakened numbers, reworks, retired supports). Cache query on `styles.css`, `app.js` and `data/game.js` bumped to `?v=2.7.0`.

## 1.2.1
- Install app buttons in the hero and the closing call to action. They open `game.crownnkeep.com/?install`, where the game offers the install (a page can only install its own site).
- Hero pill says v2.6 Install & Play is live (it still said v2.1); the note under the buttons mentions installing.
- Release notes: v2.6.1 hotfix block for the install buttons. Cache query `?v=2.6.1`.

## 1.2.0
- Release notes: v2.6.0 "Install & Play" (installable app, faster loading, full-width menus on phones) is now the latest. v2.0 "The Grand Revamp" moves into the History panel, so the page keeps the latest five.
- Latest news: v2.6.0 is the featured post; the v2.4 post joins the regular ones and the v2.0 post is dropped to keep five.
- Cache query on `styles.css` and `app.js` bumped to `?v=2.6.0`.

## 1.1.3
- Trophy leagues: every league wears an ornate frame (the legendary one recoloured bronze, silver, gold, platinum and diamond; the flaming mythic one for Master and Champion) with a glow that grows each step. The frame's own backdrop now fills the card, so the lighter square behind the content is gone.
- PvP: the toy duel demo is replaced by a 48-second recording of a real Mirror match (sends, merges, boss waves, a leak, the victory screen). It plays muted on a loop while on screen, from `assets.crownnkeep.com/video/pvp_highlights.mp4` with a poster frame. The rules and mode cards below it stay.

## 1.1.2
- Latest news on the home page shows only the latest five releases (v2.4 featured, then v2.3, v2.2, v2.1, v2.0) in two columns; older posts are left to the release notes. Adds the missing v2.2.0 and v2.0.0 posts.

## 1.1.1
- Release notes show only the latest five releases; older ones (v1.3, v1.2) sit in a collapsible History panel, which opens when a link points into it.

## 1.1.0
- Release notes: v2.4.0 "The Silver Tribunal" with its 2.4.1 hotfix, and v2.3.0 "The Iron Oath". v2.4.0 is now the latest.
- Latest news: posts for v2.4.0 / v2.4.1 and v2.3.0.
- Unit data re-exported from `shared/` (Argent, the Iron Oath cards, 2.4.1 balance).

## 1.0.0
- First versioned release as its own Worker on crownnkeep.com (and www).
- Play links open game.crownnkeep.com; art loads from assets.crownnkeep.com.
