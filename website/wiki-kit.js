// Shared bits for the wiki pages (wiki.html, stories.html): art helpers, colours, rule texts, nav.
window.CK = (() => {
  const ART = "https://assets.crownnkeep.com";
  const GAME_URL = "https://game.crownnkeep.com/";
  const D = window.GAME_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  // R2 art is always a CORS load (a non-CORS load poisons the cache for the game's own CORS loads).
  const img = (src, alt = "", cls = "") => `<img crossorigin="anonymous" loading="lazy" src="${ART}/${src}" alt="${alt}"${cls ? ` class="${cls}"` : ""} />`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const words = (id) => cap(id.replace(/_/g, " "));
  const fmt = (n) => n.toLocaleString("en-US");
  const pct = (v) => `${Math.round(v * 100)}%`;

  const RARITY_COLOR = { common: "#9aa5b8", rare: "#3d8bff", epic: "#a24bff", legendary: "#ffb21e", mythic: "#ff3b6b", event: "#ff8fd8" };
  const ELEMENT_COLOR = { fire: "#ff6a2b", ice: "#5fd4ff", lightning: "#ffd93b", nature: "#6bd34a", poison: "#b05cff", arcane: "#ff7ad9", normal: "#c8c8c8" };
  // game/src/scenes/arenaInfo.ts POWER
  const BOSS_POWER = {
    summon: "Summons minions", heal: "Heals itself", haste: "Rages (speeds up)", shield: "Shields itself",
    freeze_units: "Freezes your units", teleport: "Teleports ahead", charm: "Charms your units (they miss)",
    roar: "Roars to stun your units", split: "Splits when hit hard", layers: "Sheds layers as it breaks",
    portal: "Opens portals and blinks ahead", none: "Fights with its own skills",
  };
  // shared/monsters.ts BossSkillKind notes, in player words.
  const BOSS_SKILL = {
    entangle: "Roots units in vines", impale: "Stuns random units", sapling_trail: "Drops minions behind it",
    volley: "Fires arrows that stun units", anchor_hook: "Drags units to other slots", siren_song: "Sings units asleep until tapped",
    lantern_beam: "Sweeps a beam that weakens units", thrash: "Shifts the path", mimic: "Copies your strongest unit as a monster",
    burrow: "Carries monsters ahead underground", equal_ground: "Sets every unit to the board's average rank",
    absorb: "Swallows iron monsters to grow tougher", decree: "Declares a law; units that break it are jailed",
    chain: "Chains units in place", sentence: "Condemns your strongest unit",
  };

  const race = (id) => D.wiki.races[id] ?? { label: words(id), color: "#ffffff" };
  // A plate is the game's chip: thick dark rim, a colour face, display font.
  const plate = (label, color, icon = "", cls = "") => `<span class="plate${cls ? ` ${cls}` : ""}" style="--c:${color}">${icon ? img(icon) : ""}${label}</span>`;
  const racePlate = (id) => plate(race(id).label, race(id).color, `ui/races/${id}.webp`);

  // Nav: play links and the burger.
  const nav = () => {
    $$("[data-play]").forEach((a) => { a.href = GAME_URL; a.target = "_blank"; a.rel = "noopener"; });
    const burger = $("#burger"), links = $("#navLinks");
    burger?.addEventListener("click", () => burger.setAttribute("aria-expanded", links.classList.toggle("is-open")));
  };
  // Art missing on R2 (a story boss form without its own picture) just disappears.
  addEventListener("error", (e) => { if (e.target.tagName === "IMG") e.target.style.visibility = "hidden"; }, true);

  return { ART, GAME_URL, D, $, $$, img, cap, words, fmt, pct, RARITY_COLOR, ELEMENT_COLOR, BOSS_POWER, BOSS_SKILL, race, plate, racePlate, nav };
})();
