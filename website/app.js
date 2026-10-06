// Tower Rush website: renders the codex, heroes, arenas, bosses and leagues from data/game.js
// (exported from shared/ by scripts/export-data.mjs). Art is loaded from the game's R2 bucket.
(() => {
  const ART = "https://assets.depedtoolkit.com";
  const GAME_URL = "https://tower-rush.philiplouis0717.workers.dev/";
  const D = window.GAME_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  // Every <img> of R2 art is a CORS load (see the R2 note in the repo memory: a non-CORS load
  // poisons the browser cache for the game's own CORS loads).
  const img = (src, alt = "", cls = "") => `<img crossorigin="anonymous" loading="lazy" src="${ART}/${src}" alt="${alt}"${cls ? ` class="${cls}"` : ""} />`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmt = (n) => n.toLocaleString("en-US");

  const RARITIES = ["common", "rare", "epic", "legendary", "mythic", "event"];
  const ELEMENTS = ["fire", "ice", "lightning", "nature", "poison", "arcane"];
  const RARITY_COLOR = { common: "#9aa5b8", rare: "#3d8bff", epic: "#a24bff", legendary: "#ffb21e", mythic: "#ff3b6b", event: "#ff8fd8" };
  const ELEMENT_COLOR = { fire: "#ff6a2b", ice: "#5fd4ff", lightning: "#ffd93b", nature: "#6bd34a", poison: "#b05cff", arcane: "#ff7ad9" };
  const BOSS_POWER = {
    summon: "Summons minions", heal: "Heals the horde", haste: "Hastes monsters", shield: "Raises shields",
    freeze_units: "Freezes your units", teleport: "Teleports ahead", charm: "Charms your units", roar: "Stunning roar",
    split: "Splits apart", layers: "Sheds layers", portal: "Opens portals",
  };

  // ---------------------------------------------------------------- play links
  $$("[data-play]").forEach((a) => { a.href = GAME_URL; a.target = "_blank"; a.rel = "noopener"; });

  // ---------------------------------------------------------------- nav
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-solid", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const burger = $("#burger"), links = $("#navLinks");
  burger.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", (e) => { if (e.target.tagName === "A") links.classList.remove("is-open"); });
  const navObs = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) {
      $$("a", links).forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${en.target.id}`));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => navObs.observe(s));

  // ---------------------------------------------------------------- stats (lobby top-bar pills)
  const counts = { units: D.units.filter((u) => u.enabled).length, arenas: D.arenas.length, monsters: D.monsters.length, bosses: D.bosses.length, heroes: D.heroes.filter((h) => h.enabled).length };
  $$("[data-count]").forEach((el) => { el.textContent = counts[el.dataset.count]; });

  // ---------------------------------------------------------------- codex (the deck room)
  const units = D.units.filter((u) => u.enabled);
  const RARITY_DESC = ["mythic", "legendary", "epic", "rare", "common", "event"];
  // Shelf names and taglines are the deck screen's own (DeckScene RARITY_GROUPS, ELEMENT_GROUPS, ROLES).
  const RARITY_GROUPS = { common: "The house pour", rare: "Fine spirits", epic: "Aged in oak", legendary: "Top shelf", mythic: "Kept under the counter", event: "On the house" };
  const ELEMENT_GROUPS = { fire: "Firewater", ice: "Served on the rocks", lightning: "Thunder shots", nature: "Herbal brews", poison: "Snake oil", arcane: "Mystic mixers" };
  const ROLES = [
    { key: "gun", title: "Gunslingers", sub: "Single-target damage", icon: "stats/range", archs: ["shot", "pierce", "sniper", "crit", "execute", "growth"] },
    { key: "brawl", title: "Brawlers", sub: "Hit the whole crowd", icon: "stats/splash", archs: ["splash", "burn", "chain"] },
    { key: "trick", title: "Tricksters", sub: "Slow, freeze, stun and curse", icon: "stats/slow", archs: ["slow", "freeze", "stun", "poison", "curse"] },
    { key: "support", title: "Barkeeps", sub: "Buffs and mana", icon: "items/mana_orb", archs: ["buff", "aura", "mana"] },
  ];
  const ROLE_ARCHS = ROLES.flatMap((r) => r.archs);
  const GROUPS = {
    rarity: () => RARITY_DESC.map((r) => ({ key: r, title: cap(r), sub: RARITY_GROUPS[r], icon: `cards/frame_${r}.webp`, color: RARITY_COLOR[r], match: (u) => u.rarity === r })),
    element: () => ELEMENTS.map((e) => ({ key: e, title: cap(e), sub: ELEMENT_GROUPS[e], icon: `ui/element_${e}.webp`, color: ELEMENT_COLOR[e], match: (u) => u.element === e })),
    role: () => [
      ...ROLES.map((r) => ({ ...r, match: (u) => r.archs.includes(u.arch) })),
      { key: "cast", title: "Supporting cast", sub: "Never attack: copy, swap, brew", icon: "items/star_shard", match: (u) => !ROLE_ARCHS.includes(u.arch) },
    ].map((g) => ({ ...g, icon: `${g.icon}.webp` })),
  };
  const state = { by: "rarity", q: "", open: new Set() };
  // Each shelf shows one row until opened; the column counts match .cards in styles.css.
  const narrow = matchMedia("(max-width: 600px)"), mid = matchMedia("(max-width: 900px)");

  $("#groupBy").innerHTML = [["rarity", "Rarity", "cards/frame_legendary.webp"], ["element", "Element", "ui/element_fire.webp"], ["role", "Role", "stats/damage.webp"]]
    .map(([v, label, icon]) => `<button class="chip${v === state.by ? " is-on" : ""}" data-by="${v}">${img(icon)}${label}</button>`).join("");
  $("#groupBy").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    $$("#groupBy .chip").forEach((c) => c.classList.toggle("is-on", c === b));
    state.by = b.dataset.by;
    state.open.clear();
    renderShelves();
  });
  $("#unitSearch").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); renderShelves(); });
  [narrow, mid].forEach((mq) => mq.addEventListener("change", () => renderShelves()));

  // ui.ts cardView(): rarity frame (mythic once awakened), portrait, element icon.
  const cardFace = (u, awake = false) =>
    img(`cards/frame_${awake ? "mythic" : u.rarity}.webp`, "", "card__bg") +
    img(`${awake ? "portraits_awakened" : "portraits"}/${u.id}.webp`, u.name, "card__art") +
    img(`ui/element_${u.element}.webp`, u.element, "card__el");
  const cardHtml = (u, i) => `
    <button class="card" data-id="${u.id}" style="animation-delay:${Math.min(i, 8) * 35}ms">
      <span class="card__frame">${cardFace(u)}${u.card.awakens ? img("items/star_shard.webp", "Awakens", "card__wake") : ""}</span>
      <span class="card__name">${u.name}</span>
    </button>`;

  function renderShelves() {
    const list = units.filter((u) => !state.q || `${u.name} ${u.race} ${u.arch} ${u.role ?? ""} ${u.element} ${u.rarity}`.toLowerCase().includes(state.q));
    const perRow = narrow.matches ? 4 : mid.matches ? 6 : 8;
    const html = GROUPS[state.by]().map((g) => {
      const us = list.filter(g.match).sort((a, b) => RARITY_DESC.indexOf(a.rarity) - RARITY_DESC.indexOf(b.rarity) || a.name.localeCompare(b.name));
      if (!us.length) return "";
      const open = state.q || state.open.has(g.key);
      return `<div class="shelf${open ? " is-open" : ""}" style="--c:${g.color ?? "var(--gold-text)"}">
        <div class="shelf__sign">${img(g.icon)}<h3>${g.title}</h3><span>${g.sub}</span><em>${us.length}</em></div>
        <div class="cards">${us.map(cardHtml).join("")}</div>
        ${us.length > perRow && !state.q ? `<button class="chip shelf__more" data-more="${g.key}">${open ? "Show fewer" : `Show all ${us.length}`}</button>` : ""}
      </div>`;
    }).join("");
    $("#shelves").innerHTML = html || `<p class="empty">No cards match "${state.q.replace(/[<&"]/g, "")}".</p>`;
  }
  $("#shelves").addEventListener("click", (e) => {
    const more = e.target.closest("[data-more]");
    if (more) {
      const k = more.dataset.more;
      state.open.has(k) ? state.open.delete(k) : state.open.add(k);
      renderShelves();
      return;
    }
    const card = e.target.closest(".card");
    if (card) openUnit(card.dataset.id);
  });
  renderShelves();

  // ---------------------------------------------------------------- unit dialog (DeckScene.showCard)
  const unitModal = $("#unitModal");
  let tab = "info";
  const table = (t, hi = 0) => `<table class="dlg__table">
    <tr><td></td>${t.heads.map((h, i) => `<th${i === hi ? ' class="hi"' : ""}>${h}</th>`).join("")}</tr>
    ${t.rows.map((r) => `<tr><td>${img(`${r.icon}.webp`)}</td>${r.cells.map((c, i) => `<td${i === hi ? ' class="hi"' : ""}>${c}</td>`).join("")}</tr>`).join("")}
  </table>`;
  function openUnit(id) {
    const u = units.find((x) => x.id === id);
    if (!u) return;
    const c = u.card;
    $(".modal__box", unitModal).style.setProperty("--c", RARITY_COLOR[u.rarity]);
    $("#unitName").textContent = u.name;
    $("#unitBody").innerHTML = `
      <div class="dlg__top">
        <div class="dlg__race" style="--race:${c.raceColor}"><small>Race</small><b>${c.raceLabel}</b></div>
        <button class="dlg__card${c.awakens ? " is-flip" : ""}" id="dlgCard" aria-label="${c.awakens ? "Flip to the awakened form" : u.name}">${cardFace(u)}</button>
        ${c.awakens ? `<button class="dlg__wake" id="dlgWake"><span>${cardFace(u, true)}</span>Awakens<br>at rank ${c.ranks.heads.length}</button>` : ""}
      </div>
      <div class="dlg__tabs" role="tablist">
        <button class="chip" role="tab" data-tab="info">Details</button>
        <button class="chip" role="tab" data-tab="stats">Stats</button>
      </div>
      <div class="dlg__pane" data-pane="info">
        <div class="dlg__lines">
          <div class="dlg__rarity" id="dlgRarity">${u.rarity} · ${u.element}</div>
          ${c.awakeText ? `<div class="dlg__awake" id="dlgAwake" hidden>${c.awakeText}</div>` : ""}
          <div class="dlg__role">${c.role}</div>
          ${c.effects.map((l) => `<div class="dlg__fx">${l}</div>`).join("")}
          ${c.perkLine ? `<div class="dlg__perk">${c.perkLine}</div>` : ""}
          <div class="dlg__blurb">"${u.blurb}"</div>
        </div>
        <div class="dlg__quick">${c.quick.map(([icon, v]) => `<span>${img(`${icon}.webp`)}${v}</span>`).join("")}</div>
        <p class="dlg__unlock">${c.unlock}</p>
        <a class="btn btn--play dlg__cta" href="${GAME_URL}" target="_blank" rel="noopener">Play free</a>
      </div>
      <div class="dlg__pane" data-pane="stats">
        <div class="dlg__lines">
          ${c.styleLine ? `<div class="dlg__role">${c.styleLine}</div>` : ""}
          ${c.perkLine ? `<div class="dlg__perk">${c.perkLine}</div>` : ""}
        </div>
        <div class="dlg__sec"><h4>Merge rank</h4><p>${c.rankNote}</p></div>
        ${table(c.ranks)}
        <div class="dlg__sec"><h4>Power-ups in battle</h4><p>${c.upNote}</p></div>
        ${table(c.ups)}
        <p class="dlg__foot">${c.foot}</p>
      </div>`;
    showTab(tab);
    if (c.awakens) {
      let awake = false;
      const flip = () => {
        awake = !awake;
        $("#dlgCard").innerHTML = cardFace(u, awake);
        $("#dlgWake").hidden = awake;
        $("#dlgRarity").hidden = awake;
        $("#dlgAwake").hidden = !awake;
      };
      $("#dlgCard").addEventListener("click", flip);
      $("#dlgWake").addEventListener("click", flip);
    }
    $("#unitBody").scrollTop = 0;
    openModal(unitModal);
  }
  function showTab(t) {
    tab = t;
    $$("#unitBody [data-tab]").forEach((b) => { b.classList.toggle("is-on", b.dataset.tab === t); b.setAttribute("aria-selected", b.dataset.tab === t); });
    $$("#unitBody [data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== t; });
  }
  $("#unitBody").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) showTab(b.dataset.tab); });

  // ---------------------------------------------------------------- modals
  let lastFocus = null;
  function openModal(m) {
    lastFocus = document.activeElement;
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".modal__x", m).focus();
  }
  function closeModal(m) {
    m.classList.remove("is-open");
    m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    const v = $("video", m);
    if (v) v.pause();
    lastFocus?.focus();
  }
  $$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(m); }));
  addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".modal.is-open").forEach(closeModal); });
  $$("[data-trailer]").forEach((b) => b.addEventListener("click", () => {
    const m = $("#trailerModal");
    openModal(m);
    $("#trailer").play().catch(() => {});
  }));

  // ---------------------------------------------------------------- heroes
  const heroes = D.heroes.filter((h) => h.enabled);
  $("#heroList").innerHTML = heroes.map((h, i) =>
    `<button class="hero-tab${i === 0 ? " is-on" : ""}" role="tab" data-id="${h.id}">${img(`portraits_heroes/${h.id}.webp`, h.name)}${h.name}</button>`).join("");
  function showHero(id) {
    const h = heroes.find((x) => x.id === id);
    $$(".hero-tab").forEach((t) => t.classList.toggle("is-on", t.dataset.id === id));
    const art = $("#heroArt");
    art.style.animation = "none"; art.offsetWidth; art.style.animation = "";
    art.src = `${ART}/heroes/${h.id}.webp`;
    art.alt = h.name;
    const info = $(".heroes__info");
    info.style.animation = "none"; info.offsetWidth; info.style.animation = "";
    $("#heroName").textContent = h.name;
    $("#heroBlurb").textContent = `"${h.blurb}"`;
    $("#heroAbility").textContent = h.ability;
    $("#heroMeta").innerHTML = [
      `<span>Cooldown ${h.cooldown}s</span>`,
      `<span>${cap(h.race)}</span>`,
      h.price ? `<span>${img("items/gems.webp")}${fmt(h.price)}</span>` : `<span style="color:var(--green)">Free starter</span>`,
      h.trophies ? `<span>${img("items/trophy.webp")}${fmt(h.trophies)}+</span>` : "",
    ].join("");
  }
  $("#heroList").addEventListener("click", (e) => { const t = e.target.closest(".hero-tab"); if (t) showHero(t.dataset.id); });
  showHero(heroes[0].id);

  // ---------------------------------------------------------------- arenas
  const videos = new Set(D.videos);
  $("#arenaRail").innerHTML = D.arenas.map((a, i) => {
    const hasVid = videos.has(`arena_${a.id}`);
    return `
    <article class="arena"${hasVid ? ` data-video="${ART}/video/arena_${a.id}.mp4"` : ""}>
      ${img(`locations/arena_${a.id}.webp`, a.name)}
      ${hasVid ? `<span class="arena__live">&#9654; LIVE</span>` : ""}
      <div class="arena__body">
        <span class="arena__num">Arena ${i + 1}</span>
        <h3>${a.name}</h3>
        <span class="arena__trophy">${img("items/trophy.webp")}${a.trophies ? `${fmt(a.trophies)} trophies` : "Start here"}</span>
        <div class="arena__foes">${a.monsters.slice(0, 5).map((m) => img(`monsters/${m}.webp`, m.replace(/_/g, " "))).join("")}</div>
      </div>
    </article>`;
  }).join("");
  $$(".arena[data-video]").forEach((card) => {
    const play = () => {
      let v = $("video", card);
      if (!v) {
        v = document.createElement("video");
        Object.assign(v, { muted: true, loop: true, playsInline: true, crossOrigin: "anonymous", src: card.dataset.video });
        card.insertBefore(v, card.children[1]);
      }
      v.play().then(() => card.classList.add("is-playing")).catch(() => {});
    };
    const stop = () => { card.classList.remove("is-playing"); $("video", card)?.pause(); };
    card.addEventListener("mouseenter", play);
    card.addEventListener("mouseleave", stop);
    card.addEventListener("focusin", play);
    card.addEventListener("focusout", stop);
  });

  // ---------------------------------------------------------------- bosses + bestiary
  $("#bossGrid").innerHTML = D.bosses.map((b) => {
    const corrupt = /chaos|corrupt/i.test(b.id + b.name);
    return `<article class="boss${corrupt ? " boss--corrupt" : ""}">
      ${img(`boss_banners/${b.id}.webp`, b.name)}
      <div class="boss__body"><span class="boss__power">${BOSS_POWER[b.power] ?? cap(b.power)}</span><h3>${b.name}</h3></div>
    </article>`;
  }).join("");
  const foes = D.monsters.map((m) => `<div class="foe">${img(`monsters/${m.id}.webp`, m.name)}<span>${m.name}</span></div>`).join("");
  $("#monsterTrack").innerHTML = foes + foes.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');

  // ---------------------------------------------------------------- story books
  const BOOKS = [
    ["story1_saving_the_muse", "Saving the Muse", "The Candy Kingdom is falling to chaos. Save its princess."],
    ["story2_chaorruption", "Chaorruption", "Find out who corrupted the kingdom."],
    ["story3_the_beginning", "The Beginning", "Follow the vision to the first corruption."],
  ];
  $("#books").innerHTML = BOOKS.map(([cover, title, blurb]) =>
    `<div class="book">${img(`story/covers/${cover}.webp`, title)}<b>${title}</b><span>${blurb}</span></div>`).join("");

  // ---------------------------------------------------------------- leagues
  $("#leagues").innerHTML = D.leagues.map((l) => {
    const icon = l.icon <= 5 ? `ui/league_${l.icon}.webp` : "items/trophy.webp";
    return `<div class="league" style="--c:${l.color}">${img(icon, l.name)}<b>${l.name.replace(" League", "")}</b><span>${fmt(l.trophies)}+</span></div>`;
  }).join("");

  // ---------------------------------------------------------------- reveal on scroll
  const revealObs = new IntersectionObserver((entries, obs) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); obs.unobserve(en.target); }
  }, { threshold: 0.12 });
  $$(".section__head, .step, .heroes, .rail, .bosses, .mode, .league, .post").forEach((el) => {
    el.classList.add("reveal");
    revealObs.observe(el);
  });
})();
