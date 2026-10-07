// Dumps the game's default data (shared/) into website/data/game.js for the site
// (a plain script, so index.html also works when opened straight from disk).
// Run from the repo root: node website/scripts/export-data.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { DEFAULT_UNITS, ARCHETYPES, STYLES, maxRank, maxPowerUp, powerUpCost, rarityIndex, unitStats } from "../../shared/units.ts";
import { DEFAULT_MONSTERS, DEFAULT_BOSSES } from "../../shared/monsters.ts";
import { DEFAULT_ARENAS } from "../../shared/arenas.ts";
import { DEFAULT_LEAGUES } from "../../shared/leagues.ts";
import { kitPrimary, kitSummary, perkSummary } from "../../shared/kit.ts";
import { DEFAULT_HEROES, heroAbilityText } from "../../shared/heroes.ts";
import { RACES } from "../../shared/races.ts";
import { ECONOMY, DEFAULT_CHESTS } from "../../shared/economy.ts";
import { DEFAULT_PVP, PVP_MODE_INFO } from "../../shared/pvp.ts";
import { EFFECTS, auraBonus, buffBonus } from "../../shared/effects.ts";
import {
  SUPPORT_TEXT, brewMana, echoStrength, isSupport, luckyChance, mimePrep, mirrorInterval, noAttack, owlCharge, portalCooldown,
} from "../../shared/support.ts";
import { storyUnlocking } from "../../shared/stories.ts";

// Which art exists (awakened portraits, arena videos) comes from the live asset index on R2.
const index = await (await fetch("https://assets.depedtoolkit.com/index.json")).json();

// ---- The unit card dialog, worked out the same way as DeckScene.showCard / statsTab (card level 1).
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
const pct = (v) => `${Math.round(v * 100)}%`;
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e4 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : String(Math.round(n)));
// Stat icons from the game's R2 folders (the game's "stat:" and "item:" texture keys).
const SUPPORT_STAT = {
  mime: ["items/hourglass_speedup", "Seconds before it can copy"],
  portal: ["items/hourglass_speedup", "Recharge after a swap or hop"],
  mirror: ["items/hourglass_speedup", "Seconds between mirrors"],
  lucky: ["items/coins", "Chance a neighbour's merge keeps its unit"],
  hourglass: ["items/hourglass_speedup", "Neighbours' ultimate charge rate"],
  echo: ["stats/splash", "Strength of the repeated ultimate"],
  herald: ["stats/damage", "Damage for every unit, per awakened unit"],
  brewer: ["items/mana_orb", `Mana every ${EFFECTS.brewer.every}s, plus rank × wave at wave end`],
};
function supportCell(arch, rank, mult) {
  switch (arch) {
    case "mime": return `${+mimePrep(mult).toFixed(1)}s`;
    case "portal": return `${+portalCooldown(rank, mult).toFixed(1)}s`;
    case "mirror": return `${+mirrorInterval(rank, mult).toFixed(1)}s`;
    case "lucky": return pct(luckyChance(rank, mult));
    case "hourglass": return `+${pct(owlCharge(rank, mult))}`;
    case "echo": return pct(echoStrength(rank, mult));
    case "herald": return `+${pct(Math.min(EFFECTS.herald.max, (EFFECTS.herald.perAwakened + EFFECTS.herald.perRank * (rank - 1)) * mult))}`;
    case "brewer": return `+${brewMana(rank, mult)}`;
  }
}

const awakenArt = new Set(index.units_awakened);
function cardInfo(u) {
  const arch = kitPrimary(u);
  const support = isSupport(arch) ? arch : null;
  const silent = noAttack(arch);
  const ri = rarityIndex(u.rarity);
  const awakens = !support && awakenArt.has(u.id);
  const st = STYLES[u.style];

  // Details tab.
  const role = (u.role ? `${u.role} · ` : "") + (arch === "buff" || (silent && u.role) ? "" : support ? "Support · " : `${st.label} · `);
  const effects = kitSummary(u, 1, 1);
  const perkLines = perkSummary(u).map((l) => `${arch === "buff" ? "Neighbours get " : ""}${l}`);
  const now = unitStats(u, 1, 1, 0);
  const quick = support || arch === "aegis" ? [["stats/attack_speed", "never attacks"]]
    : arch === "buff" ? [["stats/attack_speed", `neighbours +${pct(buffBonus(1, ri, 1))} faster`]]
    : arch === "aura" ? [["stats/attack_speed", `3×3 +${pct(auraBonus(1, 1).speed)} speed, +${pct(auraBonus(1, 1).damage)} dmg`]]
    : [["stats/damage", fmt(now.damage)], ["stats/attack_speed", `every ${+(1 / now.speed).toFixed(2)}s`]];

  // Stats tab: merge ranks and in-battle power-ups.
  const dmg = (v) => (silent ? "—" : v < 100 ? String(+v.toFixed(1)) : fmt(v));
  const every = (s) => (silent ? "—" : `${+(1 / s).toFixed(2)}s`);
  const buff = (rank, up, mult = 1) => {
    const m = (1 + up * ECONOMY.powerUpBonus) * mult;
    return support ? supportCell(support, rank, m) : arch === "aura" ? `+${pct(auraBonus(rank, m).speed)}` : arch === "aegis" ? "—" : `+${pct(buffBonus(rank, ri, m))}`;
  };
  const buffIcon = support ? SUPPORT_STAT[support][0] : "stats/attack_speed";
  const boost = (r, mult) => (awakens && r === maxRank() ? mult : 1);
  const ranks = Array.from({ length: maxRank() }, (_, i) => i + 1);
  const ups = Array.from({ length: maxPowerUp() + 1 }, (_, i) => i);
  const what = silent ? "boost" : "damage";
  return {
    raceLabel: RACES[u.race]?.label ?? u.race,
    raceColor: hex(RACES[u.race]?.color ?? 0xffffff),
    awakens,
    role: role + (support ? SUPPORT_TEXT[support] : ARCHETYPES[arch].label),
    effects,
    perkLines,
    quick,
    styleLine: silent ? null : `${st.label}: ${st.text}${u.style === "balanced" ? "" : ` · ×${+st.dmg.toFixed(2)} damage, ×${st.speed} speed`}`,
    rankNote: support
      ? "Each merge: a stronger effect · support units never awaken"
      : silent
      ? `Each merge: +${pct(EFFECTS.buff.perRank)} boost${awakens ? ` · ★${maxRank()} awakens (×${ECONOMY.awakenDamageMult})` : ""}`
      : `Each merge: +${pct(ECONOMY.rankDamageStep)} base damage, ${pct(ECONOMY.rankSpeedStep)} faster${awakens ? ` · ★${maxRank()} awakens` : ""}`,
    ranks: {
      heads: ranks.map((r) => `★${r}`),
      rows: silent
        ? [{ icon: buffIcon, cells: ranks.map((r) => buff(r, 0, boost(r, ECONOMY.awakenDamageMult))) }]
        : [
            { icon: "stats/damage", cells: ranks.map((r) => dmg(unitStats(u, r, 1, 0).damage * boost(r, ECONOMY.awakenDamageMult))) },
            { icon: "stats/attack_speed", cells: ranks.map((r) => every(unitStats(u, r, 1, 0).speed * boost(r, ECONOMY.awakenSpeedMult))) },
          ],
    },
    upNote: `Spend mana: +${pct(ECONOMY.powerUpBonus)} ${what} each, for that battle`,
    ups: {
      heads: ups.map((p) => (p ? `+${p}` : "Base")),
      rows: [
        silent ? { icon: buffIcon, cells: ups.map((p) => buff(1, p)) } : { icon: "stats/damage", cells: ups.map((p) => dmg(unitStats(u, 1, 1, p).damage)) },
        { icon: "items/mana_orb", cells: ups.map((p) => (p ? fmt(powerUpCost(p - 1)) : "—")) },
      ],
    },
    foot: support
      ? `${SUPPORT_STAT[support][1]}. ${SUPPORT_TEXT[support]}; it never attacks.`
      : arch === "aura"
      ? "Units in the 3×3 around it attack this much faster."
      : silent
      ? `Its four neighbours attack this much faster (max +${pct(EFFECTS.buff.max)}).`
      : "At card level 1. Times are seconds between attacks.",
    awakeText: awakens ? `Awakened: ×${ECONOMY.awakenDamageMult} dmg · ×${ECONOMY.awakenSpeedMult} speed · ultimate every ${ECONOMY.ultimateCooldown}s` : null,
    unlock: (() => {
      const s = storyUnlocking(u.id);
      return s ? `Unlock it in Story ${s.number}: ${s.story.title}` : "Find this card in chests";
    })(),
  };
}

const out = {
  units: DEFAULT_UNITS.map((u) => ({ ...u, card: cardInfo(u) })),
  monsters: DEFAULT_MONSTERS,
  bosses: DEFAULT_BOSSES,
  arenas: DEFAULT_ARENAS,
  heroes: DEFAULT_HEROES.map((h) => ({ ...h, ability: heroAbilityText(h) })),
  leagues: DEFAULT_LEAGUES,
  leagueBadges: index.atlas.leagues, // league badge art on R2: ui/league_0 .. n-1
  // How trophies move: arena runs (battleRewards) and Ranked PvP.
  trophies: { perWave: ECONOMY.trophiesPerWave, offset: ECONOMY.trophyOffset, maxLoss: ECONOMY.trophyMaxLoss },
  chests: Object.fromEntries(DEFAULT_CHESTS.map((c) => [c.id, { name: c.name, image: c.image }])),
  pvp: { rules: DEFAULT_PVP.rules, sends: DEFAULT_PVP.sends.filter((s) => s.enabled), tiers: DEFAULT_PVP.tiers, modes: PVP_MODE_INFO },
  awakened: index.portraits_awakened,
  videos: index.videos,
};
mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/game.js", import.meta.url), `window.GAME_DATA = ${JSON.stringify(out)};
`);
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length ?? Object.keys(v).length])));
