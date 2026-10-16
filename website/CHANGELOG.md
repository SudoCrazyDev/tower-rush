# Website changelog

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
