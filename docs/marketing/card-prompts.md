# Trading card prompts

One prompt per unit for **Nano Banana 2** on the Higgsfield website (unlimited). It was generated from the default unit table in `shared/units.ts` by `node scripts/card-prompts.ts`. Rerun that after changing units instead of editing this file. If you changed any numbers in the live admin config, check that the stats still match.

## How to use

1. Attach **reference 1**: the unit's portrait from `game/public/assets/portraits/<id>.webp`. If the website won't take .webp, convert it to PNG first.
2. Attach **reference 2**: your finished Ember Witch card. It keeps every card in the same frame layout.
3. Set the aspect ratio to **2:3** and the resolution to 2K, then paste the prompt.
4. Check every number on the card. If a digit comes out wrong, fix it with a follow-up edit such as `change the second badge to read "0.8/s"`.

Stats are for rank 1 at card level 1. **DPS** is attack × attack speed, rounded. Units with no attack of their own (support units, buff units, Princess Muse and the Aegis Knight) get one role badge instead of three stat badges.


## Common (12)

### Hooded Archer
Reference: `portraits/hooded_archer.webp` · nature · ATK 20 · 1.25/s · 25 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Hooded Archer, matching reference image 1 exactly (same face, outfit, colors, proportions), attacking in a dynamic pose with their signature weapon. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "HOODED ARCHER" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "20", lightning bolt "1.25/s", flame burst "25 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster"
  - small gold perk tag: "True Strike: hits can't be dodged"
  - small italic flavor text: "Never misses, not even a flitting bat."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Fox Spearman
Reference: `portraits/fox_spearman.webp` · nature · ATK 20 · 0.9/s · 18 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Fox Spearman, matching reference image 1 exactly (same face, outfit, colors, proportions), thrusting a powerful piercing strike forward. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "FOX SPEARMAN" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "20", lightning bolt "0.9/s", flame burst "18 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "PIERCE — Hits the target and those behind it"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "One thrust finishes what others started."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Goblin Bomber
Reference: `portraits/goblin_bomber.webp` · fire · ATK 13.8 · 1.28/s · 18 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Goblin Bomber, matching reference image 1 exactly (same face, outfit, colors, proportions), unleashing a big explosive blast. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "GOBLIN BOMBER" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "13.8", lightning bolt "1.28/s", flame burst "18 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Lobs bombs faster than goblins can run."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Flame Adept
Reference: `portraits/flame_adept.webp` · fire · ATK 16 · 0.8/s · 13 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Flame Adept, matching reference image 1 exactly (same face, outfit, colors, proportions), conjuring swirling fireballs that leave burning trails. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "FLAME ADEPT" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "16", lightning bolt "0.8/s", flame burst "13 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target. Burns 45% per second for 3s"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "Burns the stragglers down to ash."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Penguin Wizard
Reference: `portraits/penguin_wizard.webp` · ice · ATK 12 · 1/s · 12 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Penguin Wizard, matching reference image 1 exactly (same face, outfit, colors, proportions), casting a slowing wave of energy. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: frozen cliffs, falling snow, pale blue mist.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small snowflake emblem in the top-left corner.

NAMEPLATE: banner under the art reading "PENGUIN WIZARD" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "12", lightning bolt "1/s", flame burst "12 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Slows 24% for 2s"
  - small gold perk tag: "Frostbite: chills frost-proof monsters, +30% to them"
  - small italic flavor text: "Cold enough to chill even a yeti."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Tesla Gnome
Reference: `portraits/tesla_gnome.webp` · lightning · ATK 11.3 · 1.28/s · 14 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Tesla Gnome, matching reference image 1 exactly (same face, outfit, colors, proportions), casting forked lightning that arcs between targets. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "TESLA GNOME" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "11.3", lightning bolt "1.28/s", flame burst "14 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "CHAIN — Lightning jumps between monsters"
  - small gold perk tag: "True Strike: hits can't be dodged"
  - small italic flavor text: "Pocket thunder that never misses."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Cactus Gunslinger
Reference: `portraits/cactus_gunslinger.webp` · nature · ATK 25.7 · 0.7/s · 18 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Cactus Gunslinger, matching reference image 1 exactly (same face, outfit, colors, proportions), striking a precise critical hit with a flash of light. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "CACTUS GUNSLINGER" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "25.7", lightning bolt "0.7/s", flame burst "18 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 28% chance of ×2.6 damage"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "Heavy slugs punch through plate."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Clockwork Turret
Reference: `portraits/clockwork_turret.webp` · lightning · ATK 28.6 · 0.88/s · 25 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Clockwork Turret, matching reference image 1 exactly (same face, outfit, colors, proportions), attacking in a dynamic pose with their signature weapon. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "CLOCKWORK TURRET" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "28.6", lightning bolt "0.88/s", flame burst "25 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "Slow to reload. Cracks any shell."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Wind Sylph
Reference: `portraits/wind_sylph.webp` · nature · ATK 12.5 · 2/s · 25 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Wind Sylph, matching reference image 1 exactly (same face, outfit, colors, proportions), attacking in a dynamic pose with their signature weapon. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "WIND SYLPH" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "12.5", lightning bolt "2/s", flame burst "25 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Faster than the fastest runner."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Shield Knight
Reference: `portraits/shield_knight.webp` · arcane · ATK 17.2 · 0.7/s · 12 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Shield Knight, matching reference image 1 exactly (same face, outfit, colors, proportions), weaving a dark glowing curse. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "SHIELD KNIGHT" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "17.2", lightning bolt "0.7/s", flame burst "12 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Each hit: +3% damage taken (up to 60%)"
  - small gold perk tag: "Giant Slayer: +40% to tanks and bosses"
  - small italic flavor text: "Cracks the biggest brutes like eggs."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Wolf Hunter
Reference: `portraits/wolf_hunter.webp` · nature · ATK 11.3 · 1.6/s · 18 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Wolf Hunter, matching reference image 1 exactly (same face, outfit, colors, proportions), striking a precise critical hit with a flash of light. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "WOLF HUNTER" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "11.3", lightning bolt "1.6/s", flame burst "18 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 28% chance of ×2.6 damage"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Runs down anything with legs."
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Pirate Gunner
Reference: `portraits/pirate_gunner.webp` · fire · ATK 31.5 · 0.56/s · 18 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Pirate Gunner, matching reference image 1 exactly (same face, outfit, colors, proportions), unleashing a big explosive blast. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in silver-gray (#9AA5B8) with plain matte metal, a faceted silver-gray gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "PIRATE GUNNER" in bold fantasy serif capitals.
STATS ROW: 3 small round silver-gray metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "31.5", lightning bolt "0.56/s", flame burst "18 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target"
  - small gold perk tag: "Plunder: +3 mana for each kill"
  - small italic flavor text: "Every kill pays. Fire in the hole!"
RARITY LABEL: small ribbon reading "COMMON" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

## Rare (23)

### Ember Witch
Reference: `portraits/ember_witch.webp` · fire · ATK 22.4 · 0.8/s · 18 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Ember Witch, matching reference image 1 exactly (same face, outfit, colors, proportions), conjuring swirling fireballs that leave burning trails. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "EMBER WITCH" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "22.4", lightning bolt "0.8/s", flame burst "18 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target. Burns 45% per second for 3s"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "Her flames finish off the weak."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Frost Sorceress
Reference: `portraits/frost_sorceress.webp` · ice · ATK 16.8 · 1/s · 17 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Frost Sorceress, matching reference image 1 exactly (same face, outfit, colors, proportions), casting a slowing wave of energy. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: frozen cliffs, falling snow, pale blue mist.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small snowflake emblem in the top-left corner.

NAMEPLATE: banner under the art reading "FROST SORCERESS" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "16.8", lightning bolt "1/s", flame burst "17 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Slows 28% for 2s"
  - small gold perk tag: "Frostbite: chills frost-proof monsters, +30% to them"
  - small italic flavor text: "Her frost bites even the frost-proof."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Frog Alchemist
Reference: `portraits/frog_alchemist.webp` · poison · ATK 14 · 1/s · 14 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Frog Alchemist, matching reference image 1 exactly (same face, outfit, colors, proportions), hurling bubbling toxic potions and clouds. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "FROG ALCHEMIST" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "14", lightning bolt "1/s", flame burst "14 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Poison 35% per second for 4s, stacks"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "Ribbit. Bubble. Melt the weakened."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Bee Keeper
Reference: `portraits/bee_keeper.webp` · nature · ATK 8.8 · 1.6/s · 14 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Bee Keeper, matching reference image 1 exactly (same face, outfit, colors, proportions), hurling bubbling toxic potions and clouds. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "BEE KEEPER" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "8.8", lightning bolt "1.6/s", flame burst "14 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Poison 35% per second for 4s, stacks"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "The bees catch whatever runs."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Bear Rider
Reference: `portraits/bear_rider.webp` · nature · ATK 36 · 0.63/s · 23 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Bear Rider, matching reference image 1 exactly (same face, outfit, colors, proportions), landing a stunning, ground-shaking blow. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "BEAR RIDER" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "36", lightning bolt "0.63/s", flame burst "23 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 12% chance to stun for 0.8s"
  - small gold perk tag: "Giant Slayer: +40% to tanks and bosses"
  - small italic flavor text: "The bear wrestles giants for fun."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Gear Engineer
Reference: `portraits/gear_engineer.webp` · lightning · ATK 19.3 · 1.28/s · 25 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Gear Engineer, matching reference image 1 exactly (same face, outfit, colors, proportions), unleashing a big explosive blast. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "GEAR ENGINEER" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "19.3", lightning bolt "1.28/s", flame burst "25 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "Twin gear cannons shred armor."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Imp Hunter
Reference: `portraits/imp_hunter.webp` · fire · ATK 25.2 · 1/s · 25 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Imp Hunter, matching reference image 1 exactly (same face, outfit, colors, proportions), striking a precise critical hit with a flash of light. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "IMP HUNTER" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "25.2", lightning bolt "1/s", flame burst "25 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 28% chance of ×2.6 damage"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Hunts down the quick little things."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Lute Bard
Reference: `portraits/lute_bard.webp` · arcane · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Lute Bard, matching reference image 1 exactly (same face, outfit, colors, proportions), raising a hand to empower allies with a glowing aura. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "LUTE BARD" in bold fantasy serif capitals.
STAT ROW: one wide sapphire blue metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "BUFF — Speeds up neighbouring units"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Plays fast. Neighbours chase the quick."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Raccoon Thief
Reference: `portraits/raccoon_thief.webp` · nature · ATK 7 · 0.96/s · 7 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Raccoon Thief, matching reference image 1 exactly (same face, outfit, colors, proportions), gathering glowing mana orbs. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "RACCOON THIEF" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "7", lightning bolt "0.96/s", flame burst "7 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "MANA — Generates mana over time"
  - small gold perk tag: "Plunder: +3 mana for each kill"
  - small italic flavor text: "Picks the pockets of every fallen foe."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Sand Monk
Reference: `portraits/sand_monk.webp` · nature · ATK 15.8 · 1.44/s · 23 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Sand Monk, matching reference image 1 exactly (same face, outfit, colors, proportions), landing a stunning, ground-shaking blow. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "SAND MONK" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "15.8", lightning bolt "1.44/s", flame burst "23 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 12% chance to stun for 0.8s"
  - small gold perk tag: "True Strike: hits can't be dodged"
  - small italic flavor text: "A palm strike no one can dodge."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Snowglobe Fairy
Reference: `portraits/snowglobe_fairy.webp` · ice · ATK 16.8 · 0.9/s · 15 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Snowglobe Fairy, matching reference image 1 exactly (same face, outfit, colors, proportions), freezing the air solid with a burst of ice. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: frozen cliffs, falling snow, pale blue mist.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small snowflake emblem in the top-left corner.

NAMEPLATE: banner under the art reading "SNOWGLOBE FAIRY" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "16.8", lightning bolt "0.9/s", flame burst "15 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 16% chance to freeze for 1.2s"
  - small gold perk tag: "Frostbite: chills frost-proof monsters, +30% to them"
  - small italic flavor text: "Her snow freezes even the yetis."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Spore Sage
Reference: `portraits/spore_sage.webp` · poison · ATK 20 · 0.7/s · 14 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Spore Sage, matching reference image 1 exactly (same face, outfit, colors, proportions), hurling bubbling toxic potions and clouds. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "SPORE SAGE" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "20", lightning bolt "0.7/s", flame burst "14 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Poison 35% per second for 4s, stacks"
  - small gold perk tag: "Giant Slayer: +40% to tanks and bosses"
  - small italic flavor text: "Big spores for big monsters."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Storm Totem
Reference: `portraits/storm_totem.webp` · lightning · ATK 25.2 · 0.8/s · 20 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Storm Totem, matching reference image 1 exactly (same face, outfit, colors, proportions), casting forked lightning that arcs between targets. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "STORM TOTEM" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "25.2", lightning bolt "0.8/s", flame burst "20 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "CHAIN — Lightning jumps between monsters"
  - small gold perk tag: "True Strike: hits can't be dodged"
  - small italic flavor text: "Its lightning never misses."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Thunder Dwarf
Reference: `portraits/thunder_dwarf.webp` · lightning · ATK 36 · 0.63/s · 23 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Thunder Dwarf, matching reference image 1 exactly (same face, outfit, colors, proportions), landing a stunning, ground-shaking blow. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "THUNDER DWARF" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "36", lightning bolt "0.63/s", flame burst "23 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 12% chance to stun for 0.8s"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "Hammer meets armor. Hammer wins."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Vine Druid
Reference: `portraits/vine_druid.webp` · nature · ATK 10.5 · 1.6/s · 17 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Vine Druid, matching reference image 1 exactly (same face, outfit, colors, proportions), casting a slowing wave of energy. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "VINE DRUID" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "10.5", lightning bolt "1.6/s", flame burst "17 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Slows 28% for 2s"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Roots grab the fastest ankles."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Witch Doctor
Reference: `portraits/witch_doctor.webp` · poison · ATK 16.8 · 1/s · 17 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Witch Doctor, matching reference image 1 exactly (same face, outfit, colors, proportions), weaving a dark glowing curse. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "WITCH DOCTOR" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "16.8", lightning bolt "1/s", flame burst "17 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Each hit: +4% damage taken (up to 60%)"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "Hexes the weak into the grave."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Pumpkin Scarecrow
Reference: `portraits/pumpkin_scarecrow.webp` · poison · ATK 25.2 · 0.9/s · 23 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Pumpkin Scarecrow, matching reference image 1 exactly (same face, outfit, colors, proportions), landing a stunning, ground-shaking blow. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "PUMPKIN SCARECROW" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "25.2", lightning bolt "0.9/s", flame burst "23 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 12% chance to stun for 0.8s"
  - small gold perk tag: "Plunder: +3 mana for each kill"
  - small italic flavor text: "Scares them stiff, keeps their mana."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Ogre Chef
Reference: `portraits/ogre_chef.webp` · fire · ATK 44 · 0.56/s · 25 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Ogre Chef, matching reference image 1 exactly (same face, outfit, colors, proportions), unleashing a big explosive blast. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "OGRE CHEF" in bold fantasy serif capitals.
STATS ROW: 3 small round sapphire blue metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "44", lightning bolt "0.56/s", flame burst "25 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target"
  - small gold perk tag: "Giant Slayer: +40% to tanks and bosses"
  - small italic flavor text: "Big pots for big appetites."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Portal Imp
Reference: `portraits/portal_imp.webp` · fire · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Portal Imp, matching reference image 1 exactly (same face, outfit, colors, proportions), stepping out of a swirling portal. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "PORTAL IMP" in bold fantasy serif capitals.
STAT ROW: one wide sapphire blue metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "PORTAL — Support: swaps places with a unit of the same rank"
  - small italic flavor text: "A mischievous imp who rearranges the battlefield."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Mirror Slime
Reference: `portraits/mirror_slime.webp` · poison · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Mirror Slime, matching reference image 1 exactly (same face, outfit, colors, proportions), wobbling into a mirror reflection of another hero. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "MIRROR SLIME" in bold fantasy serif capitals.
STAT ROW: one wide sapphire blue metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "MIRROR — Support: turns into a neighbour of the same rank"
  - small italic flavor text: "It wobbles, it watches, then it's someone else."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Lucky Cat
Reference: `portraits/lucky_cat.webp` · nature · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Lucky Cat, matching reference image 1 exactly (same face, outfit, colors, proportions), waving a lucky paw amid gold coins and sparkles. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "LUCKY CAT" in bold fantasy serif capitals.
STAT ROW: one wide sapphire blue metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "LUCKY — Support: neighbours' merges can keep their unit"
  - small italic flavor text: "Wave the paw, keep the luck."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Banner Herald
Reference: `portraits/banner_herald.webp` · fire · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Banner Herald, matching reference image 1 exactly (same face, outfit, colors, proportions), raising a rallying war banner high. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "BANNER HERALD" in bold fantasy serif capitals.
STAT ROW: one wide sapphire blue metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "HERALD — Support: every unit hits harder per awakening"
  - small italic flavor text: "When a hero awakens, the whole army rallies."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Gnome Brewer
Reference: `portraits/gnome_brewer.webp` · nature · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Gnome Brewer, matching reference image 1 exactly (same face, outfit, colors, proportions), stirring a bubbling mana cauldron. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in sapphire blue (#3D8BFF) with a light polished shine, a faceted sapphire blue gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "GNOME BREWER" in bold fantasy serif capitals.
STAT ROW: one wide sapphire blue metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "BREWER — Support: brews mana, pays a bonus every wave"
  - small italic flavor text: "Slow and steady fills the cauldron."
RARITY LABEL: small ribbon reading "RARE" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

## Epic (29)

### Crystal Golem
Reference: `portraits/crystal_golem.webp` · arcane · ATK 62.9 · 0.56/s · 35 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Crystal Golem, matching reference image 1 exactly (same face, outfit, colors, proportions), unleashing a big explosive blast. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "CRYSTAL GOLEM" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "62.9", lightning bolt "0.56/s", flame burst "35 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "Crystal shards split any armor."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Cyclops Smith
Reference: `portraits/cyclops_smith.webp` · fire · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Cyclops Smith, matching reference image 1 exactly (same face, outfit, colors, proportions), raising a hand to empower allies with a glowing aura. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "CYCLOPS SMITH" in bold fantasy serif capitals.
STAT ROW: one wide amethyst purple metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "BUFF — Speeds up neighbouring units"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "Forges neighbours blades that cut armor."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Fox Samurai
Reference: `portraits/fox_samurai.webp` · arcane · ATK 51.5 · 0.7/s · 36 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Fox Samurai, matching reference image 1 exactly (same face, outfit, colors, proportions), striking a precise critical hit with a flash of light. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "FOX SAMURAI" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "51.5", lightning bolt "0.7/s", flame burst "36 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 28% chance of ×2.6 damage"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "One cut. Through any armor."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Lava Golem
Reference: `portraits/lava_golem.webp` · fire · ATK 45.8 · 0.56/s · 26 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Lava Golem, matching reference image 1 exactly (same face, outfit, colors, proportions), conjuring swirling fireballs that leave burning trails. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "LAVA GOLEM" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "45.8", lightning bolt "0.56/s", flame burst "26 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target. Burns 45% per second for 3s"
  - small gold perk tag: "Giant Slayer: +40% to tanks and bosses"
  - small italic flavor text: "Melts down the biggest brutes."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Magnet Robot
Reference: `portraits/magnet_robot.webp` · lightning · ATK 15 · 1.6/s · 24 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Magnet Robot, matching reference image 1 exactly (same face, outfit, colors, proportions), weaving a dark glowing curse. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "MAGNET ROBOT" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "15", lightning bolt "1.6/s", flame burst "24 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Each hit: +5% damage taken (up to 60%)"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "Pulls armor right off. Fast."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Minotaur Gladiator
Reference: `portraits/minotaur_gladiator.webp` · nature · ATK 51.5 · 0.63/s · 32 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Minotaur Gladiator, matching reference image 1 exactly (same face, outfit, colors, proportions), landing a stunning, ground-shaking blow. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "MINOTAUR GLADIATOR" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "51.5", lightning bolt "0.63/s", flame burst "32 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 12% chance to stun for 0.8s"
  - small gold perk tag: "Giant Slayer: +40% to tanks and bosses"
  - small italic flavor text: "Lives to fight giants."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Moon Oracle
Reference: `portraits/moon_oracle.webp` · arcane · ATK 22.9 · 0.42/s · 10 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Moon Oracle, matching reference image 1 exactly (same face, outfit, colors, proportions), gathering glowing mana orbs. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "MOON ORACLE" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "22.9", lightning bolt "0.42/s", flame burst "10 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "MANA — Generates mana over time"
  - small gold perk tag: "Plunder: +3 mana for each kill"
  - small italic flavor text: "Every fallen foe feeds the moon."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Lantern Ghost
Reference: `portraits/lantern_ghost.webp` · arcane · ATK 10 · 0.96/s · 10 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Lantern Ghost, matching reference image 1 exactly (same face, outfit, colors, proportions), gathering glowing mana orbs. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "LANTERN GHOST" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "10", lightning bolt "0.96/s", flame burst "10 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "MANA — Generates mana over time"
  - small gold perk tag: "True Strike: hits can't be dodged"
  - small italic flavor text: "Its light finds whatever hides."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Phoenix Chick
Reference: `portraits/phoenix_chick.webp` · fire · ATK 20 · 1.28/s · 26 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Phoenix Chick, matching reference image 1 exactly (same face, outfit, colors, proportions), conjuring swirling fireballs that leave burning trails. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "PHOENIX CHICK" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "20", lightning bolt "1.28/s", flame burst "26 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target. Burns 45% per second for 3s"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "Small bird, fast fire, no survivors."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Plague Alchemist
Reference: `portraits/plague_alchemist.webp` · poison · ATK 20 · 1/s · 20 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Plague Alchemist, matching reference image 1 exactly (same face, outfit, colors, proportions), hurling bubbling toxic potions and clouds. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "PLAGUE ALCHEMIST" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "20", lightning bolt "1/s", flame burst "20 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Poison 35% per second for 4s, stacks"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "Finishes the ones still coughing."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Sand Worm
Reference: `portraits/sand_worm.webp` · nature · ATK 44 · 0.8/s · 35 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Sand Worm, matching reference image 1 exactly (same face, outfit, colors, proportions), unleashing a big explosive blast. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "SAND WORM" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "44", lightning bolt "0.8/s", flame burst "35 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Bursts up under the runners."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Shadow Ninja
Reference: `portraits/shadow_ninja.webp` · poison · ATK 22.5 · 1.6/s · 36 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Shadow Ninja, matching reference image 1 exactly (same face, outfit, colors, proportions), striking a precise critical hit with a flash of light. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "SHADOW NINJA" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "22.5", lightning bolt "1.6/s", flame burst "36 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 28% chance of ×2.6 damage"
  - small gold perk tag: "True Strike: hits can't be dodged"
  - small italic flavor text: "Nothing dodges the shadow."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Storm Whelp
Reference: `portraits/storm_whelp.webp` · lightning · ATK 22.5 · 1.28/s · 29 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Storm Whelp, matching reference image 1 exactly (same face, outfit, colors, proportions), casting forked lightning that arcs between targets. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "STORM WHELP" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "22.5", lightning bolt "1.28/s", flame burst "29 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "CHAIN — Lightning jumps between monsters"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Baby dragon, faster than its prey."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Tide Mermaid
Reference: `portraits/tide_mermaid.webp` · ice · ATK 24 · 1/s · 24 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Tide Mermaid, matching reference image 1 exactly (same face, outfit, colors, proportions), casting a slowing wave of energy. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: frozen cliffs, falling snow, pale blue mist.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small snowflake emblem in the top-left corner.

NAMEPLATE: banner under the art reading "TIDE MERMAID" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "24", lightning bolt "1/s", flame burst "24 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Slows 32% for 2s"
  - small gold perk tag: "Frostbite: chills frost-proof monsters, +30% to them"
  - small italic flavor text: "Her tide chills even ice-born foes."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Treant Guardian
Reference: `portraits/treant_guardian.webp` · nature · ATK 36 · 0.9/s · 32 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Treant Guardian, matching reference image 1 exactly (same face, outfit, colors, proportions), landing a stunning, ground-shaking blow. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "TREANT GUARDIAN" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "36", lightning bolt "0.9/s", flame burst "32 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 12% chance to stun for 0.8s"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Old roots trip the quickest feet."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Bone Necromancer
Reference: `portraits/bone_necromancer.webp` · poison · ATK 34.3 · 0.7/s · 24 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Bone Necromancer, matching reference image 1 exactly (same face, outfit, colors, proportions), weaving a dark glowing curse. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "BONE NECROMANCER" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "34.3", lightning bolt "0.7/s", flame burst "24 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Each hit: +5% damage taken (up to 60%)"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "Marks the dying for the grave."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Card Jester
Reference: `portraits/card_jester.webp` · arcane · ATK 36 · 1/s · 36 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Card Jester, matching reference image 1 exactly (same face, outfit, colors, proportions), striking a precise critical hit with a flash of light. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "CARD JESTER" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "36", lightning bolt "1/s", flame burst "36 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 28% chance of ×2.6 damage"
  - small gold perk tag: "Plunder: +3 mana for each kill"
  - small italic flavor text: "Always holds the ace. And your mana."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Mime
Reference: `portraits/mime.webp` · arcane · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Mime, matching reference image 1 exactly (same face, outfit, colors, proportions), miming an invisible copy of another hero. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "MIME" in bold fantasy serif capitals.
STAT ROW: one wide amethyst purple metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "MIME — Support: copies a unit of the same rank"
  - small italic flavor text: "A silent performer who becomes whoever stands across."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Hourglass Owl
Reference: `portraits/hourglass_owl.webp` · lightning · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Hourglass Owl, matching reference image 1 exactly (same face, outfit, colors, proportions), spinning a glowing clockwork hourglass. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "HOURGLASS OWL" in bold fantasy serif capitals.
STAT ROW: one wide amethyst purple metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "HOURGLASS — Support: neighbours charge ultimates faster"
  - small italic flavor text: "A clockwork owl that makes time run faster for friends."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Echo Spirit
Reference: `portraits/echo_spirit.webp` · ice · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Echo Spirit, matching reference image 1 exactly (same face, outfit, colors, proportions), sending out ghostly echo rings. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: frozen cliffs, falling snow, pale blue mist.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small snowflake emblem in the top-left corner.

NAMEPLATE: banner under the art reading "ECHO SPIRIT" in bold fantasy serif capitals.
STAT ROW: one wide amethyst purple metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "ECHO — Support: repeats neighbours' ultimates"
  - small italic flavor text: "Every great move deserves an encore."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Pentagonal Knight
Reference: `portraits/pentagonal_knight.webp` · lightning · ATK 100 · 0.44/s · 44 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Pentagonal Knight, matching reference image 1 exactly (same face, outfit, colors, proportions), attacking in a dynamic pose with their signature weapon. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "PENTAGONAL KNIGHT" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "100", lightning bolt "0.44/s", flame burst "44 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Each hit: adjacent units +100% attack speed for 4s"
  - small italic flavor text: "Every hammer blow rallies the line."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Rogue Knight
Reference: `portraits/rogue_knight.webp` · fire · ATK 24 · 4.8/s · 115 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Rogue Knight, matching reference image 1 exactly (same face, outfit, colors, proportions), attacking in a dynamic pose with their signature weapon. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "ROGUE KNIGHT" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "24", lightning bolt "4.8/s", flame burst "115 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 95% crit ×3 · every 4s: adjacent units miss 25% of attacks for 2s"
  - small italic flavor text: "Fast blades, short temper. Keep him on the edge."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Aegis Knight
Reference: `portraits/aegis_knight.webp` · arcane · role: knight (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Aegis Knight, matching reference image 1 exactly (same face, outfit, colors, proportions), planting a great shield that casts a protective dome. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "AEGIS KNIGHT" in bold fantasy serif capitals.
STAT ROW: one wide amethyst purple metal plaque just under the nameplate, with a shield-and-star icon and the bold word "KNIGHT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "AEGIS — Neighbours are immune to debuffs"
  - small italic flavor text: "Stand by the shield and nothing shakes you."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Lance Knight
Reference: `portraits/lance_knight.webp` · lightning · ATK 40 · 0.9/s · 36 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Lance Knight, matching reference image 1 exactly (same face, outfit, colors, proportions), thrusting a powerful piercing strike forward. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "LANCE KNIGHT" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "40", lightning bolt "0.9/s", flame burst "36 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "PIERCE — Hits the target and those behind it. +50% damage to corrupted bosses · each hit chains to 5 more"
  - small italic flavor text: "Runs the whole line through. Hates corruption most."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Oath Knight
Reference: `portraits/oath_knight.webp` · fire · ATK 40 · 1.25/s · 50 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Oath Knight, matching reference image 1 exactly (same face, outfit, colors, proportions), attacking in a dynamic pose with their signature weapon. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "OATH KNIGHT" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "40", lightning bolt "1.25/s", flame burst "50 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. +10% damage and +5% attack speed for each adjacent Knight"
  - small italic flavor text: "Stronger with every sworn brother beside him."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Lantern Knight
Reference: `portraits/lantern_knight.webp` · arcane · ATK 16 · 0.6/s · 10 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Lantern Knight, matching reference image 1 exactly (same face, outfit, colors, proportions), gathering glowing mana orbs. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "LANTERN KNIGHT" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "16", lightning bolt "0.6/s", flame burst "10 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "MANA — Generates mana over time. +5 mana every 5s, +3 more per Knight on the field"
  - small gold perk tag: "Plunder: +3 mana for each kill"
  - small italic flavor text: "His lantern finds mana in the dark."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Berserker Sellsword
Reference: `portraits/berserker_sellsword.webp` · fire · ATK 75 · 0.88/s · 66 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Berserker Sellsword, matching reference image 1 exactly (same face, outfit, colors, proportions), attacking in a dynamic pose with their signature weapon. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "BERSERKER SELLSWORD" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "75", lightning bolt "0.88/s", flame burst "66 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. While attacking: adjacent units attack 25% slower · +15% damage per Mercenary on the field"
  - small italic flavor text: "Hits like a landslide. Wears out everyone near him."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Powder Grenadier
Reference: `portraits/powder_grenadier.webp` · fire · ATK 52 · 0.8/s · 42 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Powder Grenadier, matching reference image 1 exactly (same face, outfit, colors, proportions), unleashing a big explosive blast. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "POWDER GRENADIER" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "52", lightning bolt "0.8/s", flame burst "42 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SPLASH — Area damage around the target. Each blast: 15% chance to stun an adjacent unit for 1s"
  - small italic flavor text: "Big blasts. Mind your ears."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Hired Blade
Reference: `portraits/hired_blade.webp` · poison · ATK 60 · 1.25/s · 75 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Hired Blade, matching reference image 1 exactly (same face, outfit, colors, proportions), striking a precise critical hit with a flash of light. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in amethyst purple (#A24BFF) with a subtle foil shimmer, a faceted amethyst purple gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "HIRED BLADE" in bold fantasy serif capitals.
STATS ROW: 3 small round amethyst purple metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "60", lightning bolt "1.25/s", flame burst "75 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 28% chance of ×2.6 damage. Wages: 10 mana every wave, or no attacks that wave"
  - small italic flavor text: "The best blade money can buy. Pay him."
RARITY LABEL: small ribbon reading "EPIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

## Legendary (9)

### Anubis Priest
Reference: `portraits/anubis_priest.webp` · arcane · ATK 58 · 0.7/s · 41 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Anubis Priest, matching reference image 1 exactly (same face, outfit, colors, proportions), raising a judgment strike with a glowing sigil. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in gold (#FFB21E) with gold foil with soft light rays, a faceted gold gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "ANUBIS PRIEST" in bold fantasy serif capitals.
STATS ROW: 3 small round gold metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "58", lightning bolt "0.7/s", flame burst "41 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 7% chance to execute"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "Weighs every soul. Takes the weak."
RARITY LABEL: small ribbon reading "LEGENDARY" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Crystal Queen
Reference: `portraits/crystal_queen.webp` · ice · ATK 34.8 · 0.9/s · 31 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Crystal Queen, matching reference image 1 exactly (same face, outfit, colors, proportions), freezing the air solid with a burst of ice. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: frozen cliffs, falling snow, pale blue mist.

FRAME: ornate carved metal border in gold (#FFB21E) with gold foil with soft light rays, a faceted gold gem at the top center, and a small snowflake emblem in the top-left corner.

NAMEPLATE: banner under the art reading "CRYSTAL QUEEN" in bold fantasy serif capitals.
STATS ROW: 3 small round gold metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "34.8", lightning bolt "0.9/s", flame burst "31 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 20% chance to freeze for 1.2s"
  - small gold perk tag: "Frostbite: chills frost-proof monsters, +30% to them"
  - small italic flavor text: "Even the frost-born fall still."
RARITY LABEL: small ribbon reading "LEGENDARY" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Lion Paladin
Reference: `portraits/lion_paladin.webp` · arcane · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Lion Paladin, matching reference image 1 exactly (same face, outfit, colors, proportions), raising a hand to empower allies with a glowing aura. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in gold (#FFB21E) with gold foil with soft light rays, a faceted gold gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "LION PALADIN" in bold fantasy serif capitals.
STAT ROW: one wide gold metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "BUFF — Speeds up neighbouring units"
  - small gold perk tag: "Giant Slayer: +40% to tanks and bosses"
  - small italic flavor text: "Leads the charge against giants."
RARITY LABEL: small ribbon reading "LEGENDARY" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Spider Queen
Reference: `portraits/spider_queen.webp` · poison · ATK 34.8 · 1/s · 35 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Spider Queen, matching reference image 1 exactly (same face, outfit, colors, proportions), casting a slowing wave of energy. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in gold (#FFB21E) with gold foil with soft light rays, a faceted gold gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "SPIDER QUEEN" in bold fantasy serif capitals.
STATS ROW: 3 small round gold metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "34.8", lightning bolt "1/s", flame burst "35 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Slows 36% for 2s"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "Her webs snare the swiftest."
RARITY LABEL: small ribbon reading "LEGENDARY" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Star Astronomer
Reference: `portraits/star_astronomer.webp` · arcane · ATK 185.6 · 0.4/s · 74 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Star Astronomer, matching reference image 1 exactly (same face, outfit, colors, proportions), taking aim with a long-range starlight shot. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in gold (#FFB21E) with gold foil with soft light rays, a faceted gold gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "STAR ASTRONOMER" in bold fantasy serif capitals.
STATS ROW: 3 small round gold metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "185.6", lightning bolt "0.4/s", flame burst "74 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SNIPER — Heavy shots at the toughest monster"
  - small gold perk tag: "Giant Slayer: +40% to tanks and bosses"
  - small italic flavor text: "Falling stars for the biggest foes."
RARITY LABEL: small ribbon reading "LEGENDARY" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Sun Priestess
Reference: `portraits/sun_priestess.webp` · fire · role: support (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Sun Priestess, matching reference image 1 exactly (same face, outfit, colors, proportions), raising a hand to empower allies with a glowing aura. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in gold (#FFB21E) with gold foil with soft light rays, a faceted gold gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "SUN PRIESTESS" in bold fantasy serif capitals.
STAT ROW: one wide gold metal plaque just under the nameplate, with a shield-and-star icon and the bold word "SUPPORT".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "BUFF — Speeds up neighbouring units"
  - small gold perk tag: "True Strike: hits can't be dodged"
  - small italic flavor text: "Her light leaves nowhere to hide."
RARITY LABEL: small ribbon reading "LEGENDARY" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Unicorn Knight
Reference: `portraits/unicorn_knight.webp` · arcane · ATK 58 · 0.9/s · 52 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Unicorn Knight, matching reference image 1 exactly (same face, outfit, colors, proportions), thrusting a powerful piercing strike forward. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in gold (#FFB21E) with gold foil with soft light rays, a faceted gold gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "UNICORN KNIGHT" in bold fantasy serif capitals.
STATS ROW: 3 small round gold metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "58", lightning bolt "0.9/s", flame burst "52 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "PIERCE — Hits the target and those behind it"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "Charges through armor and line."
RARITY LABEL: small ribbon reading "LEGENDARY" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Valkyrie
Reference: `portraits/valkyrie.webp` · lightning · ATK 52.2 · 0.8/s · 42 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Valkyrie, matching reference image 1 exactly (same face, outfit, colors, proportions), casting forked lightning that arcs between targets. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a stormy sky, crackling yellow lightning, dark clouds.

FRAME: ornate carved metal border in gold (#FFB21E) with gold foil with soft light rays, a faceted gold gem at the top center, and a small lightning bolt emblem in the top-left corner.

NAMEPLATE: banner under the art reading "VALKYRIE" in bold fantasy serif capitals.
STATS ROW: 3 small round gold metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "52.2", lightning bolt "0.8/s", flame burst "42 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "CHAIN — Lightning jumps between monsters"
  - small gold perk tag: "Finisher: +50% to monsters under 30% health"
  - small italic flavor text: "Chooses who falls."
RARITY LABEL: small ribbon reading "LEGENDARY" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Vampire Countess
Reference: `portraits/vampire_countess.webp` · poison · ATK 40.6 · 0.9/s · 37 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Vampire Countess, matching reference image 1 exactly (same face, outfit, colors, proportions), radiating swelling, ever-growing power. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a misty swamp, glowing purple fumes, twisted roots.

FRAME: ornate carved metal border in gold (#FFB21E) with gold foil with soft light rays, a faceted gold gem at the top center, and a small toxic droplet emblem in the top-left corner.

NAMEPLATE: banner under the art reading "VAMPIRE COUNTESS" in bold fantasy serif capitals.
STATS ROW: 3 small round gold metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "40.6", lightning bolt "0.9/s", flame burst "37 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. +2% damage per second, up to +200%"
  - small gold perk tag: "Plunder: +3 mana for each kill"
  - small italic flavor text: "Every bite feeds her power."
RARITY LABEL: small ribbon reading "LEGENDARY" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

## Mythic (4)

### Void Titan
Reference: `portraits/void_titan.webp` · arcane · ATK 117.3 · 0.49/s · 57 DPS · Heavy

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Void Titan, matching reference image 1 exactly (same face, outfit, colors, proportions), raising a judgment strike with a glowing sigil. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in crimson-rose (#FF3B6B) with holographic rainbow foil and a glowing aura, a faceted crimson-rose gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "VOID TITAN" in bold fantasy serif capitals.
STATS ROW: 3 small round crimson-rose metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "117.3", lightning bolt "0.49/s", flame burst "57 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. 8% chance to execute"
  - small gold perk tag: "Giant Slayer: +40% to tanks and bosses"
  - small italic flavor text: "Erases giants with a touch."
RARITY LABEL: small ribbon reading "MYTHIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Dragon Egg
Reference: `portraits/dragon_egg.webp` · fire · ATK 57.4 · 0.9/s · 52 DPS · Balanced

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Dragon Egg, matching reference image 1 exactly (same face, outfit, colors, proportions), radiating swelling, ever-growing power. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: drifting embers, a molten orange glow, scorched ruins.

FRAME: ornate carved metal border in crimson-rose (#FF3B6B) with holographic rainbow foil and a glowing aura, a faceted crimson-rose gem at the top center, and a small flame emblem in the top-left corner.

NAMEPLATE: banner under the art reading "DRAGON EGG" in bold fantasy serif capitals.
STATS ROW: 3 small round crimson-rose metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "57.4", lightning bolt "0.9/s", flame burst "52 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. +2% damage per second, up to +200%"
  - small gold perk tag: "Armor Breaker: ignores armor"
  - small italic flavor text: "Hatching fire melts any armor."
RARITY LABEL: small ribbon reading "MYTHIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Chrono Mage
Reference: `portraits/chrono_mage.webp` · arcane · ATK 30.7 · 1.6/s · 49 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Chrono Mage, matching reference image 1 exactly (same face, outfit, colors, proportions), casting a slowing wave of energy. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in crimson-rose (#FF3B6B) with holographic rainbow foil and a glowing aura, a faceted crimson-rose gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "CHRONO MAGE" in bold fantasy serif capitals.
STATS ROW: 3 small round crimson-rose metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "30.7", lightning bolt "1.6/s", flame burst "49 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "SHOT — Rapid shots at the leading monster. Slows 40% for 2s"
  - small gold perk tag: "True Strike: hits can't be dodged"
  - small italic flavor text: "Time bends. No one dodges."
RARITY LABEL: small ribbon reading "MYTHIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

### Monkey King
Reference: `portraits/monkey_king.webp` · nature · ATK 46.1 · 1.28/s · 59 DPS · Rapid

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Monkey King, matching reference image 1 exactly (same face, outfit, colors, proportions), casting forked lightning that arcs between targets. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a sunlit forest, floating leaves, mossy stones.

FRAME: ornate carved metal border in crimson-rose (#FF3B6B) with holographic rainbow foil and a glowing aura, a faceted crimson-rose gem at the top center, and a small leaf emblem in the top-left corner.

NAMEPLATE: banner under the art reading "MONKEY KING" in bold fantasy serif capitals.
STATS ROW: 3 small round crimson-rose metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "46.1", lightning bolt "1.28/s", flame burst "59 DPS".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "CHAIN — Lightning jumps between monsters"
  - small gold perk tag: "Hunter: +40% to fast monsters"
  - small italic flavor text: "His staff outruns any runner."
RARITY LABEL: small ribbon reading "MYTHIC" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```

## Event (1)

### Princess Muse
Reference: `portraits/princess_muse.webp` · arcane · role: barkeeper (no attack)

```
Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: Princess Muse, matching reference image 1 exactly (same face, outfit, colors, proportions), raising a mug in a cheerful toast, surrounded by a warm golden aura. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: a starry magic void, floating runes, pink-violet glow.

FRAME: ornate carved metal border in sakura pink (#FF8FD8) with sparkles and drifting petals, a faceted sakura pink gem at the top center, and a small arcane star emblem in the top-left corner.

NAMEPLATE: banner under the art reading "PRINCESS MUSE" in bold fantasy serif capitals.
STAT ROW: one wide sakura pink metal plaque just under the nameplate, with a shield-and-star icon and the bold word "BARKEEPER".
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "AURA — Units around it attack faster and hit harder"
  - small italic flavor text: "A round on the house, and the whole bar fights harder."
RARITY LABEL: small ribbon reading "EVENT" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.
```
