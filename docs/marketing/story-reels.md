# Story reels (WAN 3.0, up to 30 s)

These are 12 short story reels for Discord and FB Reels. Each one tells a tiny story in 4-5 shots and ends on the Crown & Keep castle with **PLAY NOW FOR FREE**.

## Settings (Higgsfield web app)

- **Model:** WAN 3.0, image-to-video
- **Aspect:** 9:16, 1080p
- **Length:** 25-30 s (each prompt below is timed for 30 s; trim the timestamps if you pick 25 s)
- **Sound:** on if WAN offers music/SFX, otherwise off (we add music in post)
- **Start frame:** the image listed under **Start**
- **End frame:** `docs/marketing/story-reels/end_card.png` (castle + logo + PLAY NOW FOR FREE + crownnkeep.com, 1080x1920)
- **References:** the images listed under **Refs**. Upload them in the order given; the prompt calls them `@ref1`, `@ref2`, and so on. If the site uses a different tag (such as `@image1` or `<ref 1>`), swap the tag.

All paths are relative to the repo root. Unit art is in `assets/units/`, heroes in `assets/heroes/`, bosses in `assets/bosses/`, arenas in `assets/locations/`.

### About the end card

AI video often garbles text. Use one of these:

1. **Safest:** don't set an end frame. End the prompt on the empty castle gate (the last shot in each prompt already does this). Paste the clip link in chat and Claude adds a 3 s end card with the logo, PLAY NOW FOR FREE and crownnkeep.com.
2. **All in WAN:** set `end_card.png` as the end frame. If the button text wobbles while it fades in, fall back to option 1.

### Style line (add to the end of every prompt)

> Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles, no watermark.

---

## 1. The Crown Falls (origin)

- **Start:** `assets/locations/lobby_portrait.png`
- **Refs:** `@ref1` `assets/heroes/young_king.png`, `@ref2` `assets/units/hooded_archer.png`, `@ref3` `assets/units/shield_knight.png`, `@ref4` `assets/bosses/demon_lord.png`
- **Prompt:**
  - [0-5s] Night over the castle. The camera pushes slowly toward the gate. A red glow rises behind the hills.
  - [5-11s] The young king (@ref1) bursts out of the castle doors holding a small crown, eyes wide. On the horizon, the demon lord (@ref4) raises his arms and an army of cartoon monsters pours down the winding road.
  - [11-18s] The king slams a glowing card onto the stone floor. In a flash of gold, a hooded archer (@ref2) and a shield knight (@ref3) pop onto the wall.
  - [18-25s] Fast action: arrows fly, the shield knight blocks a charging goblin, and defeated monsters burst into gold coins. The king grins and puts the crown on.
  - [25-30s] The camera pulls back and rises over the calm castle gate at dawn, banners waving.
- **Caption:** Every kingdom needs a keeper. Build your army, merge your heroes, hold the gate. Crown & Keep is free in your browser. crownnkeep.com

Reels 2-12 use no start or end frame. The arena and `docs/marketing/story-reels/end_card.png` are references instead, uploaded in the order shown.

## 2. One More Merge (comedy)

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/units/hooded_archer.png`, `@ref2` `assets/units/goblin_bomber.png`, `@ref3` `assets/locations/arena_meadow.png`, `@ref4` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] The sunny meadow lane from @ref3; one hooded archer (@ref1) shoots at a goblin bomber (@ref2), who laughs and keeps walking. [6-12s] A second identical archer walks in, they bump shoulders, glow bright white and merge into one bigger archer with a tiny gold star on the hood, looking smug. [12-19s] The goblin gulps; two more archers walk in and merge again with a bigger flash into a giant archer who barely fits the frame. [19-25s] The giant archer fires one huge glowing arrow; the goblin and a crowd of monsters behind it pop into a shower of gold coins. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref4: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** It's never just one more merge. Crown & Keep: free merge tower defense. crownnkeep.com

## 3. Saving the Muse

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/units/princess_muse.png`, `@ref2` `assets/bosses/sugar_plum_tyrant.png`, `@ref3` `assets/units/lance_knight.png`, `@ref4` `assets/bosses/gummy_warlord.png`, `@ref5` `assets/locations/arena_candy_land.png`, `@ref6` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] The colorful candy kingdom from @ref5; violet cracks of chaos spread over the candy walls and the sky turns purple. [6-12s] Inside a candy palace, Princess Muse (@ref1) is trapped behind glowing violet bars while the corrupted Sugar Plum Tyrant (@ref2) laughs on his throne. [12-18s] At the candy gates a lance knight (@ref3) charges through violet-eyed gummy bears as the Gummy Warlord (@ref4) roars. [18-25s] The knight smashes the violet bars with his lance, the chaos shatters into sparkles, Muse smiles and raises a glowing heart, and bright candy colors flood back. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref6: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** The Candy Kingdom is falling to chaos. Only you can save the Muse. Story mode, free to play. crownnkeep.com

## 4. The Dragon at the Gate

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/bosses/fire_dragon.png`, `@ref2` `assets/units/frost_sorceress.png`, `@ref3` `assets/units/thunder_dwarf.png`, `@ref4` `assets/units/aegis_knight.png`, `@ref5` `assets/locations/arena_volcano.png`, `@ref6` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] The volcano lane from @ref5 rumbles, lava splashes, a huge shadow passes over the lane. [6-12s] The fire dragon (@ref1) lands with a quake and breathes a wall of fire toward three small towers. [12-18s] The aegis knight (@ref4) raises his shield and the fire splits around it; the frost sorceress (@ref2) answers with an ice blast that freezes the dragon's wing. [18-25s] The thunder dwarf (@ref3) slams his hammer, a lightning bolt strikes the frozen dragon, and it explodes into gold coins and a glowing treasure chest. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref6: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** Bosses don't knock. Freeze them, shock them, take their loot. crownnkeep.com

## 5. The Horde Is Here

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/heroes/orc_warchief.png`, `@ref2` `assets/units/grunt.png`, `@ref3` `assets/units/headhunter.png`, `@ref4` `assets/units/kodo_beasts.png`, `@ref5` `assets/locations/arena_mountain_pass.png`, `@ref6` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] War drums boom in the misty mountain pass from @ref5, dust shakes off the rocks with every beat. [6-12s] The orc warchief (@ref1) steps out of the fog and raises his axe; behind him a grunt (@ref2) roars with red rage glowing in his eyes. [12-18s] A headhunter (@ref3) spins and throws axes in a frenzy; a kodo beast (@ref4) stomps in with war drums on its back as red buff rings pulse over the orcs. [18-25s] The whole horde charges as one and smashes through a wave of skeletons, which burst into bones and gold coins. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref6: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** The Horde has arrived. Grunt, Headhunter, Peon, Spirit Walker and Kodo are now in Crown & Keep. crownnkeep.com

## 6. Rise of the Kraken

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/bosses/kraken.png`, `@ref2` `assets/units/tide_mermaid.png`, `@ref3` `assets/units/pirate_gunner.png`, `@ref4` `assets/bosses/ghost_pirate_captain.png`, `@ref5` `assets/locations/arena_pirate_beach.png`, `@ref6` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] The pirate beach from @ref5 at sunset, small waves, a ghostly ship appears in the fog. [6-12s] The ghost pirate captain (@ref4) points his sword at the shore; the sea swells and the kraken (@ref1) rises, tentacles towering over the beach. [12-18s] On the sand a pirate gunner (@ref3) fires a cannon blast while a tide mermaid (@ref2) summons a spinning water spout. [18-25s] Water spout and cannonballs hit the kraken together; it sinks back into the sea with a giant splash and gold coins wash up on shore. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref6: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** Something big lives in the deep. Sand & Sea is waiting. crownnkeep.com

## 7. Lantern Night

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/bosses/lich_king.png`, `@ref2` `assets/units/lantern_knight.png`, `@ref3` `assets/units/lantern_ghost.png`, `@ref4` `assets/units/pumpkin_scarecrow.png`, `@ref5` `assets/locations/arena_graveyard.png`, `@ref6` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] The foggy graveyard from @ref5 under a green moon; gravestones crack and bony hands push out of the dirt. [6-12s] The lich king (@ref1) floats up from a crypt with glowing blue eyes as skeletons rise around him. [12-18s] A small warm light appears: the lantern knight (@ref2) walks forward with a glowing lantern, a friendly lantern ghost (@ref3) beside him, a pumpkin scarecrow (@ref4) waving its scythe. [18-25s] The lantern flares into a golden blast of light; skeletons crumble into dust and gold coins, and the lich king shields his eyes and shatters. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref6: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** The dead walk tonight. Light the lanterns. crownnkeep.com

## 8. The Iron Oath

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/units/durgrim.png`, `@ref2` `assets/bosses/walking_forge.png`, `@ref3` `assets/units/oath_knight.png`, `@ref4` `assets/units/cyclops_smith.png`, `@ref5` `assets/locations/arena_oath_field.png`, `@ref6` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] The old battlefield of broken shields from @ref5, smoke and orange sparks drifting in the wind. [6-12s] The ground shakes as the walking forge (@ref2), a giant iron machine with a burning furnace heart, stomps over the hill. [12-18s] The dwarf Durgrim (@ref1) slams his hammer on a glowing anvil and swears an oath; beside him the oath knight (@ref3) and the cyclops smith (@ref4) raise their weapons. [18-25s] They charge together; the forge's cannons miss, the cyclops cracks its leg, and Durgrim's hammer smashes its furnace core; it collapses into gears and gold coins. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref6: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** A broken oath. An iron giant. One last stand. crownnkeep.com

## 9. Order in the Court (comedy)

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/bosses/prosecutor.png`, `@ref2` `assets/bosses/bailiff.png`, `@ref3` `assets/units/raccoon_thief.png`, `@ref4` `assets/units/argent.png`, `@ref5` `assets/locations/arena_aurelion_court.png`, `@ref6` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] The grand silver courtroom from @ref5; the prosecutor (@ref1) bangs a gavel and points dramatically. [6-12s] The bailiff (@ref2) drags in a raccoon thief (@ref3) holding a sack of gold coins and whistling innocently. [12-18s] The prosecutor shouts, the sack falls open and hundreds of gold coins spill across the floor; everyone freezes. [18-25s] Argent (@ref4) bursts through the courtroom doors in shining silver armor; the raccoon uses the distraction to scoop up the coins and run out the door, comedic timing. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref6: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** The court finds you... guilty of having too much fun. The Silver Tribunal awaits. crownnkeep.com

## 10. Rivals (PvP)

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/heroes/young_king.png`, `@ref2` `assets/heroes/dark_knight.png`, `@ref3` `assets/units/fox_samurai.png`, `@ref4` `assets/units/shadow_ninja.png`, `@ref5` `assets/story/pvp_poster.png`, `@ref6` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] Two castles face each other across a glowing battlefield in the style of @ref5 as thunder rolls. [6-12s] On the left the young king (@ref1) smirks; on the right the dark knight (@ref2) lowers his visor; camera snaps between their eyes. [12-18s] Both throw cards at the same time; a fox samurai (@ref3) and a shadow ninja (@ref4) appear in puffs of smoke and dash toward each other. [18-25s] Their blades clash in the middle with a huge spark, slow motion, then the shockwave knocks the dark knight's helmet crooked and the young king laughs. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref6: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** Real players. Real time. Who keeps the crown? PvP is live. crownnkeep.com

## 11. The Littlest Hero

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/units/phoenix_chick.png`, `@ref2` `assets/bosses/frost_wyrm.png`, `@ref3` `assets/units/penguin_wizard.png`, `@ref4` `assets/locations/arena_winter_village.png`, `@ref5` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] The snowy village from @ref4 in heavy snowfall; the towers are frozen solid and a penguin wizard (@ref3) shivers. [6-12s] The frost wyrm (@ref2) coils around the village bell tower and breathes an icy storm. [12-18s] A tiny phoenix chick (@ref1) peeks out of a nest, looks scared, then puffs up its chest bravely. [18-25s] The chick bursts into a huge fiery phoenix glow; the flames melt the ice, the towers thaw, the frost wyrm flees into the clouds and the penguin wizard cheers. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref5: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** Small hero. Big heart. Every unit has a story. crownnkeep.com

## 12. The Jawbreaker Cracks

- **Start frame:** none
- **End frame:** none
- **Refs:** `@ref1` `assets/bosses/chaos_jawbreaker.png`, `@ref2` `assets/units/rogue_knight.png`, `@ref3` `assets/units/berserker_sellsword.png`, `@ref4` `assets/locations/arena_jawbreaker_core.png`, `@ref5` `docs/marketing/story-reels/end_card.png`
- **Prompt:**

```
[0-6s] The violet void from @ref4; a giant cracked jawbreaker (@ref1) floats there, pulsing with chaos light. [6-12s] A rogue knight (@ref2) and a berserker sellsword (@ref3) climb its surface and strike it again and again; each hit peels off a glowing layer. [12-18s] Deep cracks race over the core, violet light pours out and the knights shield their eyes. [18-25s] The core splits open; inside, a vision of a quiet human village glows, then a dark shadow falls over it, mysterious mood. [25-30s] The camera rises to the castle gate and settles on the end card exactly as in @ref5: the castle, the Crown & Keep logo, the yellow PLAY NOW FOR FREE button and crownnkeep.com, text sharp and unchanged, held still for the last 2 seconds. Flat 2D cartoon game art, thick dark navy outlines, two-tone cel shading, chunky chibi characters with big heads and big expressive eyes, bright saturated colors, keep every character's design identical to its reference image, smooth cinematic camera, no subtitles and no text except the end card text, no watermark.
```

- **Caption:** What's inside the chaos? Play the story and find out. crownnkeep.com

---

## Posting

- **FB Reels:** post with the caption plus `#CrownAndKeep #TowerDefense #MergeGame #IndieGame #BrowserGame`.
- **Discord:** post in #announcements or #media with one line, such as "New story reel: The Crown Falls. Play free at crownnkeep.com".
- **Order:** start with 1 (origin), then 2 (comedy), 4 (boss), 3 (story). Alternate hype and comedy after that.
- After a clip is done, paste its link in chat with the reel number. Claude adds the end card, music and hook text, and uploads it to R2 and admin #/marketing.
