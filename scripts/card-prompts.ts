/**
 * Trading card prompts for the website: one Nano Banana 2 prompt per unit, with the stats,
 * ability, perk and flavor text from the default unit table. Rerun after changing units.
 * Run from the repo root: node scripts/card-prompts.ts (writes docs/marketing/card-prompts.md)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { DEFAULT_UNITS, ARCHETYPES, STYLES } from "../shared/units.ts";
import { PERKS } from "../shared/perks.ts";
import { EFFECT_LABELS } from "../shared/effects.ts";
import { noAttack } from "../shared/support.ts";

const RARITY: Record<string, { name: string; hex: string; finish: string }> = {
  common: { name: "silver-gray", hex: "#9AA5B8", finish: "plain matte metal" },
  rare: { name: "sapphire blue", hex: "#3D8BFF", finish: "a light polished shine" },
  epic: { name: "amethyst purple", hex: "#A24BFF", finish: "a subtle foil shimmer" },
  legendary: { name: "gold", hex: "#FFB21E", finish: "gold foil with soft light rays" },
  mythic: { name: "crimson-rose", hex: "#FF3B6B", finish: "holographic rainbow foil and a glowing aura" },
  event: { name: "sakura pink", hex: "#FF8FD8", finish: "sparkles and drifting petals" },
};

const ELEMENT: Record<string, { emblem: string; scene: string }> = {
  fire: { emblem: "flame", scene: "drifting embers, a molten orange glow, scorched ruins" },
  ice: { emblem: "snowflake", scene: "frozen cliffs, falling snow, pale blue mist" },
  lightning: { emblem: "lightning bolt", scene: "a stormy sky, crackling yellow lightning, dark clouds" },
  nature: { emblem: "leaf", scene: "a sunlit forest, floating leaves, mossy stones" },
  poison: { emblem: "toxic droplet", scene: "a misty swamp, glowing purple fumes, twisted roots" },
  arcane: { emblem: "arcane star", scene: "a starry magic void, floating runes, pink-violet glow" },
};

// What the character is doing in the art, by archetype.
const ACTION: Record<string, string> = {
  shot: "attacking in a dynamic pose with their signature weapon",
  splash: "unleashing a big explosive blast",
  burn: "conjuring swirling fireballs that leave burning trails",
  chain: "casting forked lightning that arcs between targets",
  pierce: "thrusting a powerful piercing strike forward",
  slow: "casting a slowing wave of energy",
  freeze: "freezing the air solid with a burst of ice",
  stun: "landing a stunning, ground-shaking blow",
  poison: "hurling bubbling toxic potions and clouds",
  crit: "striking a precise critical hit with a flash of light",
  curse: "weaving a dark glowing curse",
  execute: "raising a judgment strike with a glowing sigil",
  sniper: "taking aim with a long-range starlight shot",
  growth: "radiating swelling, ever-growing power",
  buff: "raising a hand to empower allies with a glowing aura",
  mana: "gathering glowing mana orbs",
  mime: "miming an invisible copy of another hero",
  portal: "stepping out of a swirling portal",
  mirror: "wobbling into a mirror reflection of another hero",
  lucky: "waving a lucky paw amid gold coins and sparkles",
  hourglass: "spinning a glowing clockwork hourglass",
  echo: "sending out ghostly echo rings",
  herald: "raising a rallying war banner high",
  brewer: "stirring a bubbling mana cauldron",
  aura: "raising a mug in a cheerful toast, surrounded by a warm golden aura",
  aegis: "planting a great shield that casts a protective dome",
};

const n = (v: number) => (Math.round(v * 10) / 10).toString();
const s = (v: number) => (Math.round(v * 100) / 100).toString();
const dps = (u: { damage: number; speed: number }) => Math.round(u.damage * u.speed).toString();
const order = ["common", "rare", "epic", "legendary", "mythic", "event"];

const out: string[] = [];
out.push(`# Trading card prompts

One prompt per unit for **Nano Banana 2** on the Higgsfield website (unlimited). It was generated from the default unit table in \`shared/units.ts\` by \`node scripts/card-prompts.ts\`. Rerun that after changing units instead of editing this file. If you changed any numbers in the live admin config, check that the stats still match.

## How to use

1. Attach **reference 1**: the unit's portrait from \`game/public/assets/portraits/<id>.webp\`. If the website won't take .webp, convert it to PNG first.
2. Attach **reference 2**: your finished Ember Witch card. It keeps every card in the same frame layout.
3. Set the aspect ratio to **2:3** and the resolution to 2K, then paste the prompt.
4. Check every number on the card. If a digit comes out wrong, fix it with a follow-up edit such as \`change the second badge to read "0.8/s"\`.

Stats are for rank 1 at card level 1. **DPS** is attack × attack speed, rounded. Units with no attack of their own (support units, buff units, Princess Muse and the Aegis Knight) get one role badge instead of three stat badges.

`);

const sorted = [...DEFAULT_UNITS].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
let current = "";
for (const u of sorted) {
  if (u.rarity !== current) {
    current = u.rarity;
    const count = sorted.filter((x) => x.rarity === current).length;
    out.push(`## ${current[0].toUpperCase() + current.slice(1)} (${count})\n`);
  }
  const r = RARITY[u.rarity];
  const el = ELEMENT[u.element];
  const arch = ARCHETYPES[u.arch];
  const silent = noAttack(u.arch);
  const role = (u.role ?? (silent ? "Support" : STYLES[u.style].label)).toUpperCase();
  const effect = u.effect ? EFFECT_LABELS[u.effect]?.replace(/^[^:]+:\s*/, "") : undefined;
  const ability = `${u.arch.toUpperCase()} — ${arch.label}${effect ? `. ${effect[0].toUpperCase() + effect.slice(1)}` : ""}`;
  const perk = u.perk !== "none" ? `${PERKS[u.perk].label.toUpperCase()} ${PERKS[u.perk].text}` : undefined;

  const stats = silent
    ? `STAT ROW: one wide ${r.name} metal plaque just under the nameplate, with a shield-and-star icon and the bold word "${role}".`
    : `STATS ROW: 3 small round ${r.name} metal medallions just under the nameplate, each with an icon and a bold number: crossed swords "${n(u.damage)}", lightning bolt "${s(u.speed)}/s", flame burst "${dps(u)} DPS".`;

  out.push(`### ${u.name}`);
  out.push(
    silent
      ? `Reference: \`portraits/${u.id}.webp\` · ${u.element} · role: ${role.toLowerCase()} (no attack)\n`
      : `Reference: \`portraits/${u.id}.webp\` · ${u.element} · ATK ${n(u.damage)} · ${s(u.speed)}/s · ${dps(u)} DPS · ${STYLES[u.style].label}\n`,
  );
  out.push("```");
  out.push(`Collectible fantasy trading card, vertical 2:3, front face only, centered on a plain dark background, no hands, no table.

CHARACTER: ${u.name}, matching reference image 1 exactly (same face, outfit, colors, proportions), ${ACTION[u.arch] ?? "in a heroic action pose"}. Stylized painterly mobile-game art, vibrant colors, soft rim light.

LAYOUT: use the same frame layout as reference image 2 (art window, top gem, corner emblem, nameplate banner, parchment text box, bottom ribbon), recolored for this card.

ART WINDOW: the character fills the top 60% of the card and breaks slightly out of the frame. Background: ${el.scene}.

FRAME: ornate carved metal border in ${r.name} (${r.hex}) with ${r.finish}, a faceted ${r.name} gem at the top center, and a small ${el.emblem} emblem in the top-left corner.

NAMEPLATE: banner under the art reading "${u.name.toUpperCase()}" in bold fantasy serif capitals.
${stats}
TEXT BOX: parchment panel containing, top to bottom:
  - bold small caps: "${ability}"${perk ? `\n  - small gold perk tag: "${perk}"` : ""}
  - small italic flavor text: "${u.blurb}"
RARITY LABEL: small ribbon reading "${u.rarity.toUpperCase()}" at the bottom center.

All text spelled exactly as written, clean and readable. No other text, no watermark, no logos.`);
  out.push("```\n");
}

mkdirSync("docs/marketing", { recursive: true });
writeFileSync("docs/marketing/card-prompts.md", out.join("\n"));
console.log(`wrote ${sorted.length} prompts`);
