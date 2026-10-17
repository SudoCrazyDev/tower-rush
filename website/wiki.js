// Crown & Keep wiki: one long reference page built from data/game.js (scripts/export-data.mjs dumps
// shared/ there, wiki-only tables under GAME_DATA.wiki). Stories live on stories.html.
(() => {
  const { ART, D, $, $$, img, cap, words, fmt, pct, RARITY_COLOR, ELEMENT_COLOR, BOSS_POWER, BOSS_SKILL, race, plate, racePlate } = window.CK;
  const W = D.wiki;
  const E = W.economy;
  CK.nav();

  const RARITY_DESC = ["mythic", "legendary", "epic", "rare", "common", "event"];
  const RARITY_IDX = (r) => (r === "event" ? 2 : ["common", "rare", "epic", "legendary", "mythic"].indexOf(r)); // shared/units.ts rarityIndex
  const ELEMENTS = ["fire", "ice", "lightning", "nature", "poison", "arcane", "normal"];
  // Shelf taglines are the deck screen's own (DeckScene RARITY_GROUPS).
  const RARITY_TAG = { common: "The house pour", rare: "Fine spirits", epic: "Aged in oak", legendary: "Top shelf", mythic: "Kept under the counter", event: "On the house" };
  // Trait rules from shared/sim.ts and shared/perks.ts.
  const TRAIT = {
    fast: "Runs much faster than the horde. Hunter perks deal extra damage to it.",
    tank: "Lots of health. Giant Slayer perks deal extra damage to it.",
    armored: "Takes 30% less damage. Armor Breaker ignores it.",
    healer: "Heals the monsters around it every 3 seconds.",
    splitter: "Splits into smaller monsters when it dies.",
    rich: "Pays extra mana when you kill it.",
    dodge: "15% of hits miss it. True Strike always hits.",
    frostproof: "Can't be slowed or frozen. Frostbite chills it anyway and deals +30%.",
    tether: "Stretches to the nearest unit and gives it Fatigue until killed.",
  };

  const units = D.units.filter((u) => u.enabled);
  const unitById = Object.fromEntries(D.units.map((u) => [u.id, u]));
  const monsterById = Object.fromEntries(D.monsters.map((m) => [m.id, m]));
  const bossById = Object.fromEntries(D.bosses.map((b) => [b.id, b]));
  const arenaFoes = new Set(D.arenas.flatMap((a) => [...a.monsters, ...a.bosses]));
  const awakeArt = new Set(D.awakened);
  const awakePortrait = (id) => (awakeArt.has(id) ? `portraits_awakened/${id}.webp` : `portraits/${id}.webp`);
  const byRarity = (a, b) => RARITY_DESC.indexOf(a.rarity) - RARITY_DESC.indexOf(b.rarity) || a.name.localeCompare(b.name);

  const reward = (r) => [r.coins && `${img("items/coins.webp")}${fmt(r.coins)}`, r.gems && `${img("items/gems.webp")}${fmt(r.gems)}`, r.chest && `${img(`items/${D.chests[r.chest]?.image ?? "chest_common"}.webp`)}${D.chests[r.chest]?.name ?? words(r.chest)}`]
    .filter(Boolean).map((x) => `<span class="rw">${x}</span>`).join("") || "—";
  const table = (heads, rows, cls = "") => `<div class="wtable${cls ? ` ${cls}` : ""}"><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  // ui.ts cardView(): rarity frame (mythic once awakened), portrait, element icon.
  const cardFace = (u, awake = false) =>
    img(`cards/frame_${awake ? "mythic" : u.rarity}.webp`, "", "card__bg") +
    img(awake ? awakePortrait(u.id) : `portraits/${u.id}.webp`, u.name, "card__art") +
    img(`ui/element_${u.element}.webp`, u.element, "card__el");
  // "1.2K" back to a number, for the stat bars.
  const num = (s) => { const n = parseFloat(s); return /K$/.test(s) ? n * 1e3 : /M$/.test(s) ? n * 1e6 : n; };

  // ---------------------------------------------------------------- sections
  const S = [];
  const section = (id, title, icon, html, cls = "") => S.push({ id, title, icon, html, cls });

  // ---- basics: the loop, then the rulebook
  const loop = [
    ["ui/summon_button.webp", "Summon", `${E.summonCostStart} mana`, `Place a random unit from your 5-card deck. Each summon costs ${E.summonCostStep} more than the last.`],
    ["items/star_shard.webp", "Merge", `★1 → ★${E.maxRank}`, `Drop a unit on its twin (same card, same rank). Each rank doubles base damage and attacks ${pct(E.rankSpeedStep)} faster.`],
    ["items/mana_orb.webp", "Power up", `+${pct(E.powerUpBonus)} each`, `Spend mana on a card: every copy on the board gets stronger for the rest of the battle, up to +${E.powerUpCosts.length}.`],
    ["ui/wave_horn.webp", "Hold the line", `${E.lives} lives`, `Each monster that gets through costs a life. A boss arrives every ${E.bossEvery} waves.`],
  ];
  const rule = (icon, k, v) => `<li>${img(icon)}<span>${k}</span><i></i><b>${v}</b></li>`;
  section("basics", "How a battle works", "ui/wave_horn.webp", `
    <p class="lead">Monsters march along a path around your board. Your units stand on the board and fire at anything in reach. Survive as many waves as you can; the wave you reach decides your rewards.</p>
    <ol class="loop">${loop.map(([icon, t, n, txt], i) => `<li class="loop__step">
      <span class="loop__art">${img(icon)}<em>${i + 1}</em></span>
      <b>${t}</b><strong>${n}</strong><p>${txt}</p></li>`).join("")}</ol>
    <div class="ledger">
      <h3 class="ledger__title">Battle rules</h3>
      <ul>
        ${rule("items/mana_orb.webp", "Starting mana", fmt(E.startMana))}
        ${rule("items/mana_orb.webp", "Mana after each wave", `${E.waveManaBase} + ${E.waveManaPerWave} × wave`)}
        ${rule("items/heart_life.webp", "Lives", E.lives)}
        ${rule("ui/boss_warning.webp", "Boss wave", `every ${E.bossEvery}`)}
        ${rule("stats/damage.webp", "Monster health growth", `×${E.waveHpGrowth} a wave`)}
        ${rule("monsters/slime_blob.webp", "Biggest wave", `${E.waveSizeMax} monsters`)}
        ${rule("items/scroll_upgrade.webp", "Power-up costs", E.powerUpCosts.map(fmt).join(" · "))}
        ${rule("items/trophy.webp", "Each later arena", `+${pct(E.arenaHpStep)} monster health`)}
      </ul>
    </div>
    <div class="callouts">
      <a class="callout" href="#awakening">${img("items/star_shard.webp")}<span><b>Awakening</b>Merge to ★${E.maxRank} and most attackers awaken with new art, bigger stats and an ultimate.</span></a>
      <a class="callout" href="#progression">${img("items/scroll_upgrade.webp")}<span><b>Card levels</b>Level cards with copies and coins: +${pct(E.levelBonus)} damage and +${pct(E.levelSpeedBonus)} attack speed per level, for good.</span></a>
    </div>
  `);

  // ---- units: the deck room
  const unitRaces = [...new Set(units.map((u) => u.race))].sort((a, b) => race(a).label.localeCompare(race(b).label));
  section("units", "Units", "cards/frame_legendary.webp", `
    <p class="lead">Your towers are units. Tap a card for its full sheet: effects, perk, rank table, power-ups and ultimate. Numbers are at card level 1.</p>
    <div class="deckroom">
      <div class="deckroom__bar">
        <label class="search">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/></svg>
          <input id="uSearch" type="search" placeholder="Find a unit" autocomplete="off" />
        </label>
        <div class="seg" id="fRarity" role="group" aria-label="Rarity">
          <button class="chip is-on" data-v="">All</button>
          ${RARITY_DESC.map((r) => `<button class="chip" data-v="${r}" title="${cap(r)}" style="--c:${RARITY_COLOR[r]}">${img(`cards/frame_${r}.webp`)}<span>${cap(r)}</span></button>`).join("")}
        </div>
      </div>
      <div class="deckroom__bar">
        <div class="seg seg--icons" id="fElement" role="group" aria-label="Element">
          <button class="chip is-on" data-v="">All</button>
          ${ELEMENTS.map((e) => `<button class="chip" data-v="${e}" title="${cap(e)}" aria-label="${cap(e)}">${img(`ui/element_${e}.webp`)}</button>`).join("")}
        </div>
        <div class="pick" id="fRace">
          <button class="chip pick__btn" aria-expanded="false"><span id="fRaceLabel">Any race</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="3"/></svg></button>
          <div class="pick__menu" hidden>
            <button data-v="" class="is-on">Any race</button>
            ${unitRaces.map((r) => `<button data-v="${r}" style="--c:${race(r).color}">${img(`ui/races/${r}.webp`)}${race(r).label}<em>${units.filter((u) => u.race === r).length}</em></button>`).join("")}
          </div>
        </div>
        <span class="deckroom__count" id="fCount"></span>
        <button class="chip deckroom__reset" id="fReset" hidden>Clear filters</button>
      </div>
      <div id="shelves"></div>
    </div>
  `, "wsec--saloon");

  // ---- rarities and elements
  const sample = (list) => list.slice().sort(byRarity)[0];
  section("rarity", "Rarities and elements", "cards/frame_mythic.webp", `
    <p class="lead">Rarity sets how hard a card is to find and level. Element is the card's flavour; it shows in the corner of every card. Tap one to see its units.</p>
    <div class="rarities">${RARITY_DESC.map((r) => {
      const us = units.filter((u) => u.rarity === r), s = sample(us);
      const [copies] = upgradeCost(0, r);
      return `<button class="rar" data-go-rarity="${r}" style="--c:${RARITY_COLOR[r]}">
        <span class="card__frame">${img(`cards/frame_${r}.webp`, "", "card__bg")}${s ? img(`portraits/${s.id}.webp`, s.name, "card__art") : ""}</span>
        <b>${cap(r)}</b><small>${RARITY_TAG[r]}</small>
        <span class="rar__meta"><em>${us.length} units</em>${r === "event" ? "<em>Events only</em>" : `<em>${copies} cop${copies === 1 ? "y" : "ies"} to level 2</em>`}</span>
      </button>`;
    }).join("")}</div>
    <div class="elements">${ELEMENTS.map((e) => {
      const us = units.filter((u) => u.element === e).sort(byRarity);
      return `<button class="elem" data-go-element="${e}" style="--c:${ELEMENT_COLOR[e]}">
        ${img(`ui/element_${e}.webp`, "", "elem__icon")}
        <span class="elem__text"><b>${cap(e)}</b><small>${us.length} units</small></span>
        <span class="elem__faces">${us.slice(0, 3).map((u) => img(`portraits/${u.id}.webp`, u.name)).join("")}</span>
      </button>`;
    }).join("")}</div>
  `);

  // ---- kits, styles, perks
  const archRows = Object.entries(W.archetypes).map(([k, a]) => [
    `<span class="iname">${img(`ui/archs/${k}.webp`)}<b>${words(k)}</b></span>`, a.label,
    a.speed ? `×${a.speed}` : "—", a.dmg ? `×${a.dmg}` : "—",
    units.filter((u) => u.kit.some((s) => s.arch === k)).length,
  ]);
  section("kits", "Kits, styles and perks", "ui/archs/splash.webp", `
    <p class="lead">A unit's <b>kit</b> is how it attacks. The kit scales the card's base attack speed and damage. Some units carry two.</p>
    ${table(["Kit", "What it does", "Speed", "Damage", "Units"], archRows)}
    <h3>Attack styles</h3>
    ${table(["Style", "", "Speed", "Damage"], Object.values(W.styles).map((s) => [`<b>${s.label}</b>`, s.text, `×${s.speed}`, `×${+s.dmg.toFixed(2)}`]))}
    <h3>Perks</h3>
    ${table(["Perk", "Effect", "Units"], Object.entries(W.perks).filter(([k]) => k !== "none").map(([k, p]) => [
      `<span class="iname">${img(`ui/perks/${k}.webp`)}<b>${p.label}</b></span>`, cap(p.text),
      units.filter((u) => (u.perks ?? []).some((x) => x.perk === k)).sort(byRarity).map((u) => `<button class="face" data-unit="${u.id}" title="${u.name}">${img(`portraits/${u.id}.webp`, u.name)}</button>`).join("") || "—",
    ]))}
  `);

  // ---- awakenings
  const wakers = units.filter((u) => u.card.awakens).sort(byRarity);
  const timer = (s) => (s ? `<span class="timer">${img("items/hourglass_speedup.webp")}Every ${s}s</span>` : `<span class="timer timer--on">${img("items/star_shard.webp")}Always on</span>`);
  section("awakening", "Awakenings", "items/star_shard.webp", `
    <p class="lead">Merge one of these ${wakers.length} units to ★${E.maxRank} and it awakens: new art, stronger stats and an ultimate of its own. Support units and Orcs never awaken.</p>
    <div class="seg" id="fUlt" role="group" aria-label="Ultimate type">
      <button class="chip is-on" data-v="">All ${wakers.length}</button>
      <button class="chip" data-v="timer">${img("items/hourglass_speedup.webp")}On a timer</button>
      <button class="chip" data-v="passive">${img("items/star_shard.webp")}Always on</button>
    </div>
    <div class="wakes">${wakers.map((u) => `<button class="wake" data-unit="${u.id}" data-ult="${u.card.ultEvery ? "timer" : "passive"}" data-find="${u.card.ultName}" data-kind="Ultimate · ${u.name}" style="--c:${RARITY_COLOR[u.rarity]}">
      <span class="wake__pair">
        <span class="card__frame">${cardFace(u)}</span>
        ${img("ui/upgrade_arrow.webp", "", "wake__arrow")}
        <span class="card__frame wake__awake">${cardFace(u, true)}</span>
      </span>
      <span class="wake__text"><small>${u.name}</small><b>${u.card.ultName}</b>${timer(u.card.ultEvery)}<span>${u.card.ultText}</span></span>
    </button>`).join("")}</div>
  `);

  // ---- heroes
  const heroes = D.heroes.filter((h) => h.enabled);
  section("heroes", "Heroes", `portraits_heroes/${heroes[0].id}.webp`, `
    <p class="lead">Your hero stands beside the board. Tap their ability when it's charged; it comes back after its cooldown. Every hero but the Young King unlocks with gems once you have the trophies.</p>
    <div class="roster">
      <div class="roster__list" role="tablist">${heroes.map((h, i) => `<button class="roster__tab${i ? "" : " is-on"}" role="tab" data-hero="${h.id}" data-find="${h.name}" data-kind="Hero">${img(`portraits_heroes/${h.id}.webp`, h.name)}<span><b>${h.name}</b><small>${h.abilityName}</small></span></button>`).join("")}</div>
      <div class="roster__stage" id="heroStage"></div>
    </div>
    <h3>All heroes at a glance</h3>
    ${table(["Hero", "Ability", "What it does", "Cooldown", "Unlock"], heroes.map((h) => [
      `<button class="iname iname--btn" data-hero="${h.id}">${img(`portraits_heroes/${h.id}.webp`, h.name, "foe")}<b>${h.name}</b></button>`,
      `<b>${h.abilityName}</b>`, h.ability, `${h.cooldown}s`,
      h.price ? `<span class="rw">${img("items/gems.webp")}${fmt(h.price)}</span><span class="rw">${img("items/trophy.webp")}${fmt(h.trophies)}</span>` : "Free",
    ]), "wtable--wide")}
  `);

  // ---- monsters (arena foes; story foes are on stories.html)
  const traitTag = (t) => `<span class="trait" title="${TRAIT[t] ?? ""}">${img(`ui/traits/${t}.webp`)}${words(t)}</span>`;
  const arenaMonsters = D.monsters.filter((m) => arenaFoes.has(m.id));
  const firstArena = (id) => D.arenas.find((a) => a.monsters.includes(id) || a.bosses.includes(id));
  section("monsters", "Monsters", "monsters/slime_blob.webp", `
    <p class="lead">Health is a multiple of the wave's base health, so the same monster gets tougher every wave. Speed is pixels per second. Story foes are on the <a href="stories.html">Stories</a> page.</p>
    <div class="traits">${Object.entries(TRAIT).map(([t, txt]) => `<div class="traitc">${img(`ui/traits/${t}.webp`)}<span><b>${words(t)}</b>${txt}</span></div>`).join("")}</div>
    <h3>Bestiary</h3>
    ${table(["Monster", "Race", "Health", "Speed", "Mana", "Traits", "First arena"], arenaMonsters.map((m) => [
      `<span class="iname" data-find="${m.name}" data-kind="Monster" id="m-${m.id}">${img(`monsters/${m.id}.webp`, m.name, "foe")}<b>${m.name}</b></span>`,
      racePlate(m.race), `×${m.hp}`, m.speed, m.mana ?? 10, m.traits.map(traitTag).join("") || "—",
      firstArena(m.id) ? `<a href="#a-${firstArena(m.id).id}">${firstArena(m.id).name}</a>` : "—",
    ]), "wtable--wide")}
  `);

  // ---- bosses (arena bosses; story bosses are on stories.html)
  const arenaBosses = D.bosses.filter((b) => arenaFoes.has(b.id));
  section("bosses", "Arena bosses", "ui/boss_warning.webp", `
    <p class="lead">A boss walks in every ${E.bossEvery} waves with ×${E.bossHpMult} the wave's monster health, times its own multiplier. Each one pays ${E.coinsPerBoss} coins and ${E.gemsPerBoss} gems. Story bosses are on the <a href="stories.html#bosses">Stories</a> page.</p>
    <div class="bosses">${arenaBosses.map((b) => `<article class="bossc" data-find="${b.name}" data-kind="Boss" id="b-${b.id}">
      <div class="bossc__art">${img(`bosses/${b.id}.webp`, b.name)}</div>
      <div class="bossc__body"><b>${b.name}</b>
        <span class="bossc__power">${BOSS_POWER[b.power] ?? words(b.power)}</span>
        ${b.skills?.length ? `<ul>${b.skills.map((s) => `<li>${BOSS_SKILL[s.kind] ?? words(s.kind)} <small>every ${s.every}s</small></li>`).join("")}</ul>` : ""}
        <span class="bossc__meta">${racePlate(b.race)}<span>×${b.hp} health</span>${firstArena(b.id) ? `<a href="#a-${firstArena(b.id).id}">${firstArena(b.id).name}</a>` : ""}</span>
      </div>
    </article>`).join("")}</div>
  `);

  // ---- arenas
  section("arenas", "Arenas", "items/trophy.webp", `
    <p class="lead">Trophies unlock new arenas. Each one brings its own monsters and bosses, ${pct(E.arenaHpStep)} tougher monsters and ${pct(E.arenaCoinBonus)} more coins than the last.</p>
    <div class="arenas">${D.arenas.map((a, i) => `<article class="arenac" data-find="${a.name}" data-kind="Arena" id="a-${a.id}">
      ${img(`locations/arena_${a.id}.webp`, a.name, "arenac__bg")}
      <div class="arenac__body"><small>Arena ${i + 1} · ${img("items/trophy.webp", "", "ic")}${fmt(a.trophies)}</small><b>${a.name}</b>
      <div class="foes">${a.monsters.map((m) => `<a href="#m-${m}" title="${monsterById[m]?.name ?? m}">${img(`monsters/${m}.webp`, monsterById[m]?.name ?? m)}</a>`).join("")}</div>
      <div class="foes foes--boss">${a.bosses.map((b) => `<a href="#b-${b}" title="${bossById[b]?.name ?? b}">${img(`bosses/${b}.webp`, bossById[b]?.name ?? b)}</a>`).join("")}</div></div>
    </article>`).join("")}</div>
  `);

  // ---- stories teaser
  const allStories = W.sagas.flatMap((s) => s.books.flatMap((b) => b.stories));
  section("stories", "Stories", "ui/icon_story.webp", `
    <a class="teaser" href="stories.html">
      ${img("story/story_background.webp", "", "teaser__bg")}
      <span class="teaser__covers">${allStories.slice(-4).map((st) => img(`story/covers/${st.cover}.webp`, st.title)).join("")}</span>
      <span class="teaser__text"><small>${W.sagas.length} saga · ${W.sagas.reduce((n, s) => n + s.books.length, 0)} books · ${allStories.length} stories</small>
      <b>Every saga, book and chapter</b><span>Story bosses, foes, unlockable cards and badges have their own page.</span><em class="btn btn--sm">Open the Stories page</em></span>
    </a>
  `);

  // ---- pvp
  const R = D.pvp.rules;
  const MODE_LOOK = {
    ranked: { color: "#ffc93c", bg: "arena_volcano", icon: "items/trophy.webp", trophies: true, levels: "yours" },
    mirror: { color: "#7fd3ff", bg: "arena_crystal_cave", icon: "items/card_pack.webp", trophies: false, levels: R.mirrorLevel },
    casual: { color: "#7be07b", bg: "arena_meadow", icon: "ui/icon_pvp.webp", trophies: false, levels: 1 },
  };
  section("pvp", "PvP", "ui/icon_pvp.webp", `
    <p class="lead">Two players, two boards, the same waves. Spend mana to <b>send</b> monsters at your rival; every send also raises your income. Each monster that leaks through costs health. Last one standing wins.</p>
    <div class="modes">${Object.entries(D.pvp.modes).map(([k, m]) => { const x = MODE_LOOK[k] ?? MODE_LOOK.casual; return `<div class="modec" style="--c:${x.color}" data-find="${m.name} PvP" data-kind="PvP mode">
      ${img(`locations/${x.bg}.webp`, "", "modec__bg")}
      <span class="modec__emblem">${img(x.icon, "")}</span>
      <span class="modec__body"><b>${m.name}</b><p>${m.text}</p>
        <span class="modec__facts"><span>${img("items/trophy.webp")}${x.trophies ? "Trophies" : "No trophies"}</span><span>${img("items/scroll_upgrade.webp")}${x.levels === "yours" ? "Your card levels" : `All cards level ${x.levels}`}</span></span></span>
    </div>`; }).join("")}</div>
    <div class="ledger">
      <h3 class="ledger__title">Match rules</h3>
      <ul>
        ${rule("items/heart_life.webp", "Health", R.hp)}
        ${rule("monsters/orc_brute.webp", "Leak damage", `${R.leakDamage} · tanks ${R.tankLeakDamage} · bosses ${R.bossLeakDamage}`)}
        ${rule("items/hourglass_speedup.webp", "Wave length", `${R.waveSeconds}s · boss ${R.bossWaveSeconds}s`)}
        ${rule("ui/boss_warning.webp", "Sudden death", `from wave ${R.suddenDeathWave}`)}
        ${rule("items/mana_orb.webp", "Income", `${R.baseIncome} mana / ${R.incomeEvery}s`)}
        ${rule("items/trophy.webp", "Ranked win / loss", `+${R.trophyWin} / −${R.trophyLoss}`)}
        ${rule("items/coins.webp", "Coins", `${R.winCoins} win · ${R.drawCoins} draw · ${R.lossCoins} loss`)}
        ${rule("items/scroll_upgrade.webp", "Mirror mode cards", `level ${R.mirrorLevel}`)}
      </ul>
    </div>
    <h3>Sends</h3>
    ${table(["Send", "Monsters", "Cost", "Income", "Unlocks"], D.pvp.sends.map((s) => [
      `<span class="iname">${img(s.monster === "boss" ? "ui/boss_warning.webp" : `monsters/${s.monster}.webp`, "", "foe")}<b>${s.name}</b></span>`,
      `${s.count}× ${s.monster === "boss" ? "arena boss" : monsterById[s.monster]?.name ?? words(s.monster)}${s.hpMult !== 1 ? ` (×${s.hpMult} health)` : ""}`,
      `<span class="rw">${img("items/mana_orb.webp")}${s.cost}</span>`, `+${s.income}`, `wave ${s.unlockWave}`,
    ]))}
    <h3>Rating tiers</h3>
    <p>Ranked also tracks a rating that starts at ${R.ratingStart}. Your first ${R.ratingPlacementGames} games move it faster.</p>
    <div class="tiers">${D.pvp.tiers.map((t) => plate(`${t.name} <em>${fmt(t.rating)}+</em>`, t.color)).join("")}</div>
  `);

  // ---- leagues
  // Same tinted card frames as the home page ladder (app.js LEAGUE_FRAME).
  const LEAGUE_FRAME = {
    bronze: ["legendary", "hue-rotate(-22deg) saturate(.8) brightness(.78)"],
    silver: ["legendary", "grayscale(1) brightness(1.3) contrast(1.05)"],
    gold: ["legendary", "none"],
    platinum: ["legendary", "hue-rotate(125deg) saturate(.75) brightness(1.1)"],
    diamond: ["legendary", "hue-rotate(170deg) saturate(1.3) brightness(1.05)"],
    master: ["mythic", "hue-rotate(-95deg) saturate(1.1)"],
    champion: ["mythic", "none"],
    mythic: ["mythic", "hue-rotate(-40deg) saturate(1.2)"],
    immortal: ["mythic", "grayscale(.7) brightness(1.35)"],
    secret_society: ["mythic", "grayscale(1) brightness(.45)"],
  };
  section("leagues", "Leagues", "ui/league_0.webp", `
    <p class="lead">Trophies come from arena runs and Ranked PvP. Each league sets a minimum wave: an arena run that reaches it wins ${D.trophies.base} trophies plus more for every wave past it, with no cap. A run that falls short loses trophies, up to the league's max loss. Only your two highest arenas count. Each league pays its reward once.</p>
    <div class="ladder2">${D.leagues.map((l) => { const [frame, tint] = LEAGUE_FRAME[l.id] ?? ["common", "none"]; return `<div class="rung2" style="--c:${l.color};--frame:url(${ART}/cards/frame_${frame}.webp);--tint:${tint}">
      ${img(l.icon < D.leagueBadges ? `ui/league_${l.icon}.webp` : "items/trophy.webp", l.name)}
      <b>${l.name.replace(/ League$/, "")}<i>League</i></b><small>${l.hidden ? "Invite only" : `${img("items/trophy.webp", "", "ic")}${fmt(l.trophies)} · wave ${l.minWave}`}</small><span>${l.hidden ? "<em>No one speaks of it</em>" : l.reward.coins || l.reward.gems || l.reward.chest ? reward(l.reward) : "<em>Starting league</em>"}</span></div>`; }).join("")}</div>
  `);

  // ---- profiles (v2.9)
  section("profiles", "Player profiles and badges", "ui/league_6.webp", `
    <p class="lead">Every player has a profile. Tap anyone on the leaderboard, in an arena's top players or at the top of a league; tap your own avatar in the lobby for yours. It shows their hero and 5 deck units idling on the arena they last played, with each unit's level.</p>
    <div class="ledger">
      <h3 class="ledger__title">On a profile</h3>
      <ul>
        ${rule("items/trophy.webp", "Record", "trophies, best wave, ranked rating and W-L")}
        ${rule("ui/league_0.webp", "League badges", "every league reached")}
        ${rule("ui/icon_pvp.webp", "Ranked badge", `peak tier, after ${R.ratingPlacementGames} games`)}
        ${rule("items/star_shard.webp", "Story badges", "earned by finishing stories")}
      </ul>
    </div>
    <h3>Story badges</h3>
    <div class="tiers">${Object.values(W.badges).map((b) => plate(`${b.label} <em>${b.text}</em>`, "#ffd93b", "items/star_shard.webp")).join("")}</div>
    <p>The leagues list shows the player on top of each league right now. Tap them to open their profile.</p>
  `);

  // ---- progression
  function upgradeCost(i, r) {
    const ri = RARITY_IDX(r);
    return [Math.max(1, Math.ceil(E.upgradeCopies[i] / (1 + ri * E.rarityCopyDiscount))), Math.round(E.upgradeCoins[i] * (1 + ri * E.rarityCoinMarkup))];
  }
  const RS = ["common", "rare", "epic", "legendary", "mythic"];
  section("progression", "Progression and rewards", "items/chest_legendary.webp", `
    <p class="lead">No pay-to-win: every card and hero comes from playing. Coins and gems come from battles, quests, leagues and gifts.</p>
    <div class="ledger">
      <h3 class="ledger__title">After every run</h3>
      <ul>
        ${rule("items/coins.webp", "Coins", `${E.coinsPerWave} a wave (+${pct(E.arenaCoinBonus)} per arena) + ${E.coinsPerBoss} a boss`)}
        ${rule("items/gems.webp", "Gems", `${E.gemsPerBoss} a boss`)}
        ${rule("items/trophy.webp", "Trophies", `From your league's min wave; lose them below it`)}
        ${rule("items/gift_box.webp", "Free gift", `${E.giftCoins} coins + ${E.giftGems} gems / ${E.giftCooldownHours}h`)}
      </ul>
    </div>
    <h3>Card upgrades</h3>
    <p>Copies and coins to reach each level. Higher rarities need fewer copies but more coins.</p>
    ${table(["Level", ...RS.map((r) => `<span style="color:${RARITY_COLOR[r]}">${cap(r)}</span>`)], E.upgradeCopies.map((_, i) => [`${i + 1} → ${i + 2}`, ...RS.map((r) => { const [c, g] = upgradeCost(i, r); return `<span class="rw">${img("items/card_pack.webp")}${fmt(c)}</span><span class="rw">${img("items/coins.webp")}${fmt(g)}</span>`; })]), "wtable--wide")}
    <h3>Chests</h3>
    <div class="chests">${W.chests.map((c) => `<div class="chestc gframe" style="--c:${RARITY_COLOR[c.guarantee]}" data-find="${c.name}" data-kind="Chest">${img(`items/${c.image}.webp`, c.name)}<b>${c.name}</b>
      <ul class="chestc__loot"><li>${img("items/card_pack.webp")}<span><em>${c.rolls}</em> cards</span></li><li>${img("items/coins.webp")}<span><em>${fmt(c.coinsMin)}–${fmt(c.coinsMax)}</em> coins</span></li><li>${img(`cards/frame_${c.guarantee}.webp`)}<span>At least one <em style="color:${RARITY_COLOR[c.guarantee]}">${cap(c.guarantee)}</em></span></li></ul>
      <span class="chestc__price">${img(`items/${c.currency}.webp`)}${fmt(c.price)}</span></div>`).join("")}</div>
    <h3>Daily quests</h3>
    <p>${E.questsPerDay} random quests each day (UTC), plus ${E.questBonusGems} bonus gems for finishing all of them.</p>
    ${table(["Quest", "Reward"], W.quests.map((q) => [q.text, reward(q.reward)]))}
    <h3>Login calendar</h3>
    <div class="cal">
      <div class="cal__top">${img("ui/icon_daily_login.webp")}<b>Daily login</b><small>Log in to tear off the next page</small></div>
      <ol class="cal__days">${W.login.map((r, i) => `<li class="cal__day${i === W.login.length - 1 ? " is-grand" : ""}"><span class="cal__head">${i === W.login.length - 1 ? "Grand prize" : "Day"}<b>${i + 1}</b></span><span class="cal__loot">${[
        r.chest && `<span class="cal__item is-chest">${img(`items/${D.chests[r.chest]?.image ?? "chest_common"}.webp`)}<small>${D.chests[r.chest]?.name ?? words(r.chest)}</small></span>`,
        r.coins && `<span class="cal__item">${img("items/coins.webp")}<small>${fmt(r.coins)}</small></span>`,
        r.gems && `<span class="cal__item">${img("items/gems.webp")}<small>${fmt(r.gems)}</small></span>`,
      ].filter(Boolean).join("")}</span></li>`).join("")}</ol>
    </div>
    <h3>New players start with</h3>
    <p><span class="rw">${img("items/coins.webp")}${fmt(E.startingCoins)}</span><span class="rw">${img("items/gems.webp")}${fmt(E.startingGems)}</span> and these cards:</p>
    <div class="starter">${E.starterCards.map((id) => unitById[id]).filter(Boolean).map((u) => `<button class="card" data-unit="${u.id}"><span class="card__frame">${cardFace(u)}</span><span class="card__name">${u.name}</span></button>`).join("")}</div>
  `);

  // ---- races
  section("races", "Races", "ui/races/human.webp", `
    <p class="lead">Every unit, hero and monster belongs to a race. Some story chapters only allow certain races in your deck.</p>
    <div class="races">${Object.keys(W.races).map((r) => {
      const us = units.filter((u) => u.race === r), ms = D.monsters.filter((m) => m.race === r);
      const faces = [...us.map((u) => `portraits/${u.id}.webp`), ...ms.map((m) => `monsters/${m.id}.webp`)].slice(0, 4);
      return `<button class="racec gframe" style="--c:${W.races[r].color}" ${us.length ? `data-go-race="${r}" title="Show ${W.races[r].label} units"` : "disabled"} data-find="${W.races[r].label}" data-kind="Race">
        <span class="racec__crest">${img(`ui/races/${r}.webp`)}</span><b>${W.races[r].label}</b>
        <span class="racec__faces">${faces.map((f) => img(f)).join("")}</span>
        <span class="racec__stats"><span><em>${us.length}</em> unit${us.length === 1 ? "" : "s"}</span><span><em>${ms.length}</em> monster${ms.length === 1 ? "" : "s"}</span></span>
        ${us.length ? "" : `<i class="racec__tag">Foes only</i>`}</button>`;
    }).join("")}</div>
  `);

  section("faq", "FAQ", "ui/icon_quests.webp", `
    <details class="faq"><summary>Is Crown &amp; Keep pay-to-win?</summary><p>No. Every unit and hero is earned by playing. The game is free and funded by donations.</p></details>
    <details class="faq"><summary>Where do I play?</summary><p>In your browser at <a data-play href="#">game.crownnkeep.com</a>. You can also install it as an app from there.</p></details>
    <details class="faq"><summary>How do I get story-only units?</summary><p>Finish the story that unlocks them (see <a href="stories.html">Stories</a>). After that you can replay its chapters for more copies.</p></details>
    <details class="faq"><summary>What carries over between battles?</summary><p>Card levels, coins, gems, trophies and unlocked heroes. Ranks and power-ups reset each battle.</p></details>
    <details class="faq"><summary>Why do some numbers here differ from the game?</summary><p>This page shows the game's default data. Live balance tweaks can change a few numbers; the game is always right.</p></details>
  `);

  // ---------------------------------------------------------------- render
  $("#wikiBody").innerHTML = S.map((s) => `<section class="wsec${s.cls ? ` ${s.cls}` : ""}" id="${s.id}"><h2>${img(s.icon, "", "wsec__icon")}<span>${s.title}</span></h2>${s.html}</section>`).join("");
  $("#wikiToc").innerHTML = `<nav>${S.map((s) => `<a href="#${s.id}">${img(s.icon)}${s.title}</a>`).join("")}</nav>`;
  CK.nav();

  const tocLinks = $$("#wikiToc a");
  const obs = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) tocLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${en.target.id}`));
  }, { rootMargin: "-30% 0px -65% 0px" });
  $$(".wsec").forEach((s) => obs.observe(s));
  const flash = (el) => { el.classList.add("is-flash"); setTimeout(() => el.classList.remove("is-flash"), 1400); };

  // ---------------------------------------------------------------- deck room
  const f = { q: "", rarity: "", element: "", race: "" };
  const unitCard = (u) => `<button class="card" data-unit="${u.id}"><span class="card__frame">${cardFace(u)}${u.card.awakens ? img("items/star_shard.webp", "Awakens", "card__wake") : ""}</span><span class="card__name">${u.name}</span></button>`;
  const shown = () => units.filter((u) => (!f.rarity || u.rarity === f.rarity) && (!f.element || u.element === f.element) && (!f.race || u.race === f.race)
    && (!f.q || `${u.name} ${race(u.race).label} ${u.element} ${u.rarity} ${u.card.role} ${u.card.ultName ?? ""}`.toLowerCase().includes(f.q)));
  function renderShelves() {
    const list = shown();
    $("#shelves").innerHTML = RARITY_DESC.map((r) => {
      const us = list.filter((u) => u.rarity === r).sort(byRarity);
      return us.length ? `<div class="shelf is-open" style="--c:${RARITY_COLOR[r]}">
        <div class="shelf__sign">${img(`cards/frame_${r}.webp`)}<h3>${cap(r)}</h3><span>${RARITY_TAG[r]}</span><em>${us.length}</em></div>
        <div class="cards">${us.map(unitCard).join("")}</div></div>` : "";
    }).join("") || `<p class="empty">No unit matches those filters.</p>`;
    $("#fCount").textContent = `${list.length} of ${units.length}`;
    $("#fReset").hidden = !(f.q || f.rarity || f.element || f.race);
  }
  const setSeg = (id, v) => $$(`#${id} .chip`).forEach((c) => c.classList.toggle("is-on", c.dataset.v === v));
  const setRace = (v) => {
    f.race = v;
    $$("#fRace .pick__menu button").forEach((b) => b.classList.toggle("is-on", b.dataset.v === v));
    $("#fRaceLabel").innerHTML = v ? `${img(`ui/races/${v}.webp`)}${race(v).label}` : "Any race";
    $("#fRace .pick__btn").classList.toggle("is-on", !!v);
  };
  const setFilter = (k, v) => {
    if (k === "race") setRace(v);
    else { f[k] = v; setSeg(k === "rarity" ? "fRarity" : "fElement", v); }
    renderShelves();
  };
  $("#fRarity").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (c) setFilter("rarity", c.dataset.v); });
  $("#fElement").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (c) setFilter("element", c.dataset.v); });
  const pick = $("#fRace"), pickMenu = $(".pick__menu", pick), pickBtn = $(".pick__btn", pick);
  const togglePick = (open) => { pickMenu.hidden = !open; pickBtn.setAttribute("aria-expanded", open); };
  pickBtn.addEventListener("click", () => togglePick(pickMenu.hidden));
  pickMenu.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { setFilter("race", b.dataset.v); togglePick(false); } });
  document.addEventListener("click", (e) => { if (!pick.contains(e.target)) togglePick(false); });
  $("#uSearch").addEventListener("input", (e) => { f.q = e.target.value.trim().toLowerCase(); renderShelves(); });
  $("#fReset").addEventListener("click", () => { $("#uSearch").value = ""; f.q = ""; f.rarity = f.element = ""; setSeg("fRarity", ""); setSeg("fElement", ""); setRace(""); renderShelves(); });
  renderShelves();

  // Rarity / element / race tiles jump to the deck room filtered.
  const goUnits = (k, v) => {
    $("#uSearch").value = ""; f.q = ""; f.rarity = f.element = ""; setSeg("fRarity", ""); setSeg("fElement", ""); setRace("");
    setFilter(k, v);
    $("#units").scrollIntoView({ behavior: "smooth" });
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go-rarity], [data-go-element], [data-go-race]");
    if (!t) return;
    const [k, v] = t.dataset.goRarity ? ["rarity", t.dataset.goRarity] : t.dataset.goElement ? ["element", t.dataset.goElement] : ["race", t.dataset.goRace];
    goUnits(k, v);
  });

  // ---------------------------------------------------------------- unit sheet (game dialog frame)
  const modal = $("#unitModal");
  let current = null, lastFocus = null;
  const maxDmg = Math.max(...units.filter((u) => u.card.ranks.rows[0].icon === "stats/damage").map((u) => num(u.card.ranks.rows[0].cells[0])));
  const maxRate = Math.max(...units.filter((u) => u.card.ranks.rows[1]).map((u) => 1 / num(u.card.ranks.rows[1].cells[0])));
  const bar = (icon, label, value, share) => `<div class="gauge">${img(icon)}<span class="gauge__label">${label}</span><span class="gauge__track"><i style="width:${Math.max(4, Math.min(100, share * 100))}%"></i></span><b>${value}</b></div>`;
  const tbl = (t, hi = -1) => `<table class="dlg__table">
    <tr><td></td>${t.heads.map((h, i) => `<th${i === hi ? ' class="hi"' : ""}>${h}</th>`).join("")}</tr>
    ${t.rows.map((r) => `<tr><td>${img(`${r.icon}.webp`)}</td>${r.cells.map((c, i) => `<td${i === hi ? ' class="hi"' : ""}>${c}</td>`).join("")}</tr>`).join("")}
  </table>`;
  function openUnit(id) {
    const u = unitById[id];
    if (!u) return;
    current = id;
    const c = u.card;
    const attacks = c.ranks.rows[0].icon === "stats/damage" && c.ranks.rows[1];
    const perk = (u.perks ?? []).find((p) => p.perk !== "none");
    $(".modal__box", modal).style.setProperty("--c", RARITY_COLOR[u.rarity]);
    $("#unitName").textContent = u.name;
    $("#unitBody").innerHTML = `
      <div class="sheet">
        <div class="sheet__card">
          <button class="dlg__card${c.awakens ? " is-flip" : ""}" id="sheetCard" aria-label="${c.awakens ? "Show the awakened form" : u.name}">${cardFace(u)}</button>
          ${c.awakens ? `<span class="sheet__hint">${img("items/star_shard.webp")}Tap to see it awakened</span>` : ""}
        </div>
        <div class="sheet__main">
          <div class="sheet__plates">${plate(cap(u.rarity), RARITY_COLOR[u.rarity], `cards/frame_${u.rarity}.webp`, "plate--rarity")}${plate(cap(u.element), ELEMENT_COLOR[u.element], `ui/element_${u.element}.webp`)}${racePlate(u.race)}</div>
          <p class="sheet__role">${c.role}</p>
          <p class="dlg__blurb">"${u.blurb}"</p>
          ${attacks ? `${bar("stats/damage.webp", "Damage", c.ranks.rows[0].cells[0], num(c.ranks.rows[0].cells[0]) / maxDmg)}${bar("stats/attack_speed.webp", "Attack", `every ${c.ranks.rows[1].cells[0]}`, (1 / num(c.ranks.rows[1].cells[0])) / maxRate)}`
            : `<div class="sheet__quick">${c.quick.map(([icon, v]) => `<span>${img(`${icon}.webp`)}${v}</span>`).join("")}</div>`}
        </div>
      </div>
      <div class="sheet__grid">
        <div class="sheet__box">
          <h4>What it does</h4>
          <ul class="sheet__lines">
            ${u.kit.map((k) => `<li>${img(`ui/archs/${k.arch}.webp`)}<span><b>${words(k.arch)}</b> ${W.archetypes[k.arch]?.label ?? ""}</span></li>`).join("")}
            ${c.effects.map((l) => `<li class="fx">${img("ui/status_rally.webp")}<span>${l}</span></li>`).join("")}
            ${perk ? `<li class="perk">${img(`ui/perks/${perk.perk}.webp`)}<span>${c.perkLines.join("; ")}</span></li>` : ""}
          </ul>
          ${c.rework ? `<p class="sheet__note">${c.rework}</p>` : ""}
          ${c.styleLine ? `<p class="sheet__note"><b>Style</b> ${c.styleLine}</p>` : ""}
        </div>
        <div class="sheet__box">
          <h4>Merge ranks</h4>
          <p class="sheet__note">${c.rankNote}</p>
          ${tbl(c.ranks, c.awakens ? c.ranks.heads.length - 1 : -1)}
          <h4>Power-ups</h4>
          <p class="sheet__note">${c.upNote}</p>
          ${tbl(c.ups)}
          <p class="dlg__foot">${c.foot} ${c.levelNote}.</p>
        </div>
      </div>
      ${c.awakens ? `<div class="sheet__ult">
        <span class="card__frame">${cardFace(u, true)}</span>
        <div><small>Ultimate</small><b>${c.ultName}</b>${timer(c.ultEvery)}<p>${c.ultText}</p><p class="sheet__note">${c.awakeText}</p></div>
      </div>` : ""}
      <div class="sheet__foot">
        <button class="sheet__nav" data-step="-1" aria-label="Previous unit">&lsaquo;</button>
        <span class="dlg__unlock">${img("items/card_pack.webp", "", "ic")}${c.unlock}</span>
        <button class="sheet__nav" data-step="1" aria-label="Next unit">&rsaquo;</button>
      </div>`;
    if (!modal.classList.contains("is-open")) {
      lastFocus = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      $(".modal__x", modal).focus();
    }
    $(".dlg__scroll", modal).scrollTop = 0;
    history.replaceState(null, "", `#u-${id}`);
  }
  function closeUnit() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname);
    lastFocus?.focus();
  }
  // Prev / next walk the units the deck room shows right now.
  const step = (d) => {
    const list = RARITY_DESC.flatMap((r) => shown().filter((u) => u.rarity === r).sort(byRarity));
    const order = list.some((u) => u.id === current) ? list : units.slice().sort(byRarity);
    const i = order.findIndex((u) => u.id === current);
    openUnit(order[(i + d + order.length) % order.length].id);
  };
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return closeUnit();
    const s = e.target.closest("[data-step]");
    if (s) return step(+s.dataset.step);
    const card = e.target.closest("#sheetCard.is-flip");
    if (card) {
      const u = unitById[current], awake = card.classList.toggle("is-awake");
      card.innerHTML = cardFace(u, awake);
    }
  });
  addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeUnit();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-unit]");
    if (a && !modal.contains(a)) { e.preventDefault(); openUnit(a.dataset.unit); }
  });
  if (location.hash.startsWith("#u-")) openUnit(location.hash.slice(3));

  // ---------------------------------------------------------------- awakening filter
  $("#fUlt").addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    $$("#fUlt .chip").forEach((x) => x.classList.toggle("is-on", x === c));
    $$(".wake").forEach((w) => { w.hidden = !!c.dataset.v && w.dataset.ult !== c.dataset.v; });
  });

  // ---------------------------------------------------------------- hero roster
  function showHero(id) {
    const h = heroes.find((x) => x.id === id);
    $$(".roster__tab").forEach((t) => t.classList.toggle("is-on", t.dataset.hero === id));
    const stage = $("#heroStage");
    stage.innerHTML = `
      ${img("locations/lobby_landscape.webp", "", "roster__bg")}
      ${img(`heroes/${h.id}.webp`, h.name, "roster__art")}
      <div class="roster__info">
        <div class="roster__name"><h3>${h.name}</h3>${racePlate(h.race)}</div>
        <p class="dlg__blurb">"${h.blurb}"</p>
        <div class="roster__ability">
          <small>Ability · ${h.powerLabel ?? words(h.power)}</small>
          <b>${h.abilityName}</b>
          <p>${h.ability}</p>
        </div>
        <div class="roster__stats">
          <span>${img("items/hourglass_speedup.webp")}<b>${h.cooldown}s</b><small>Cooldown</small></span>
          <span>${img("items/gems.webp")}<b>${h.price ? fmt(h.price) : "Free"}</b><small>Price</small></span>
          <span>${img("items/trophy.webp")}<b>${fmt(h.trophies)}</b><small>Trophies</small></span>
        </div>
      </div>`;
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-hero]");
    if (!t) return;
    showHero(t.dataset.hero);
    if (!t.closest(".roster")) $(".roster").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  showHero(heroes[0].id);

  // ---------------------------------------------------------------- search
  // Everything tagged data-find plus every unit; best matches first.
  const index = [
    ...units.map((u) => ({ name: u.name, kind: `Unit · ${cap(u.rarity)}`, icon: `portraits/${u.id}.webp`, go: () => openUnit(u.id) })),
    ...$$("[data-find]").filter((el) => !el.dataset.unit).map((el) => ({ name: el.dataset.find, kind: el.dataset.kind, go: () => {
      if (el.dataset.hero) return el.click();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      flash(el.closest("tr") ?? el);
    } })),
    ...$$(".wake").map((el) => ({ name: el.dataset.find, kind: el.dataset.kind, icon: awakePortrait(el.dataset.unit), go: () => openUnit(el.dataset.unit) })),
    ...allStories.map((st) => ({ name: st.title, kind: "Story", icon: `story/covers/${st.cover}.webp`, go: () => { location.href = `stories.html#s-${st.id}`; } })),
  ].map((x) => ({ ...x, key: x.name.toLowerCase() }));
  const results = $("#wikiResults");
  const esc = (s) => s.replace(/[<&"]/g, (c) => ({ "<": "&lt;", "&": "&amp;", '"': "&quot;" })[c]);
  let hits = [];
  $("#wikiSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { results.hidden = true; return; }
    hits = index.filter((x) => x.key.includes(q)).sort((a, b) => a.key.indexOf(q) - b.key.indexOf(q) || a.key.length - b.key.length).slice(0, 10);
    results.hidden = false;
    results.innerHTML = hits.length
      ? hits.map((h, i) => `<button data-hit="${i}"${i === 0 ? ' class="is-first"' : ""}>${h.icon ? img(h.icon) : "<span></span>"}<b>${esc(h.name)}</b><small>${h.kind}</small></button>`).join("")
      : `<p class="empty">Nothing matches "${esc(q)}".</p>`;
  });
  const go = (i) => { results.hidden = true; $("#wikiSearch").value = ""; hits[i]?.go(); };
  results.addEventListener("click", (e) => { const b = e.target.closest("[data-hit]"); if (b) go(+b.dataset.hit); });
  $("#wikiSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && hits.length && !results.hidden) go(0);
    if (e.key === "Escape") { e.target.value = ""; results.hidden = true; }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".wiki__intro")) results.hidden = true; });
})();
