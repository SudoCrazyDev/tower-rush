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

  // ---------------------------------------------------------------- stats counters
  const counts = { units: D.units.length, arenas: D.arenas.length, monsters: D.monsters.length, bosses: D.bosses.length, heroes: D.heroes.length };
  const countObs = new IntersectionObserver((entries, obs) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      obs.unobserve(en.target);
      const el = en.target, to = counts[el.dataset.count], t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 1200);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countObs.observe(el));

  // ---------------------------------------------------------------- codex
  const units = D.units.filter((u) => u.enabled);
  const awakened = new Set(D.awakened);
  const maxDmg = Math.max(...units.map((u) => u.damage));
  const maxSpd = Math.max(...units.map((u) => u.speed));
  const maxDps = Math.max(...units.map((u) => u.damage * u.speed));
  const PAGE = 18;
  const state = { rarity: "all", element: "all", q: "", all: false };

  const chip = (group, value, label, color, icon = "") =>
    `<button class="chip${value === "all" ? " is-on" : ""}" data-group="${group}" data-value="${value}" style="--c:${color}">${icon}${label}</button>`;
  $("#rarityFilter").innerHTML = chip("rarity", "all", "All", "#ffc93c") +
    RARITIES.filter((r) => units.some((u) => u.rarity === r)).map((r) => chip("rarity", r, cap(r), RARITY_COLOR[r])).join("");
  $("#elementFilter").innerHTML = chip("element", "all", "Any element", "#ffc93c") +
    ELEMENTS.map((e) => chip("element", e, cap(e), ELEMENT_COLOR[e], img(`ui/element_${e}.webp`))).join("");
  $$(".filters .chip").forEach((b) => b.addEventListener("click", () => {
    $$(`.chip[data-group="${b.dataset.group}"]`).forEach((c) => c.classList.toggle("is-on", c === b));
    state[b.dataset.group] = b.dataset.value;
    renderCards();
  }));
  $("#unitSearch").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); renderCards(); });
  $("#moreUnits").addEventListener("click", () => { state.all = !state.all; renderCards(); });

  function filtered() {
    return units
      .filter((u) => state.rarity === "all" || u.rarity === state.rarity)
      .filter((u) => state.element === "all" || u.element === state.element)
      .filter((u) => !state.q || `${u.name} ${u.race} ${u.arch} ${u.role ?? ""}`.toLowerCase().includes(state.q))
      .sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.name.localeCompare(b.name));
  }
  function renderCards() {
    const list = filtered();
    const shown = state.all ? list : list.slice(0, PAGE);
    $("#codexCount").textContent = `${list.length} unit${list.length === 1 ? "" : "s"}`;
    $("#cards").innerHTML = shown.length ? shown.map((u, i) => `
      <button class="card" data-id="${u.id}" data-rarity="${u.rarity}" style="animation-delay:${Math.min(i, 18) * 25}ms">
        ${img(`portraits/${u.id}.webp`, u.name, "card__art")}
        ${img(`ui/element_${u.element}.webp`, u.element, "card__el")}
        ${awakened.has(u.id) ? `<span class="card__wake">Awakens</span>` : ""}
        <span class="card__name">${u.name}</span>
        <span class="card__rarity">${u.role ?? u.rarity}</span>
      </button>`).join("") : `<p class="empty">No units match. Try another filter.</p>`;
    const btn = $("#moreUnits");
    btn.hidden = list.length <= PAGE;
    btn.textContent = state.all ? "Show fewer" : `Show all ${list.length} units`;
  }
  $("#cards").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openUnit(card.dataset.id);
  });
  renderCards();

  // ---------------------------------------------------------------- unit modal
  const unitModal = $("#unitModal");
  let wakeOn = false, current = null;
  function openUnit(id) {
    const u = units.find((x) => x.id === id);
    if (!u) return;
    current = u; wakeOn = false;
    const box = $(".modal__box", unitModal);
    box.style.setProperty("--c", RARITY_COLOR[u.rarity]);
    $("#unitImg").src = `${ART}/portraits/${u.id}.webp`;
    $("#unitImg").alt = u.name;
    $("#unitName").textContent = u.name;
    $("#unitBlurb").textContent = `"${u.blurb}"`;
    $("#unitTags").innerHTML = [
      `<span class="tag" style="color:${RARITY_COLOR[u.rarity]}">${u.rarity}</span>`,
      `<span class="tag" style="color:${ELEMENT_COLOR[u.element]}">${img(`ui/element_${u.element}.webp`)}${u.element}</span>`,
      `<span class="tag">${u.race}</span>`,
      `<span class="tag">${u.role ?? u.style}</span>`,
    ].join("");
    const support = u.damage === 0;
    const bar = (label, val, max, text) =>
      `<div class="ustat"><small>${label}</small><b>${text}</b><i style="--w:${Math.max(4, (val / max) * 100)}%"></i></div>`;
    $("#unitStats").innerHTML = support
      ? `<div class="ustat" style="grid-column:1/-1"><small>Role</small><b>Support</b><span style="display:block;color:var(--muted);margin-top:4px">Never attacks. Makes the units around it stronger.</span></div>`
      : bar("Damage", u.damage, maxDmg, fmt(u.damage)) +
        bar("Attack speed", u.speed, maxSpd, `${u.speed}/s`) +
        bar("Damage per second", u.damage * u.speed, maxDps, fmt(Math.round(u.damage * u.speed))) +
        `<div class="ustat"><small>Perk</small><b style="font-size:17px">${u.perkLabel && u.perk !== "none" ? u.perkLabel : "None"}</b>${u.perk !== "none" && u.perkText ? `<span style="display:block;color:var(--muted);font-size:13px;margin-top:4px">${cap(u.perkText)}</span>` : ""}</div>`;
    $("#unitArch").innerHTML = u.archLabel ? `<b>How it fights:</b> ${u.archLabel}.` : "";
    const wake = $("#unitAwaken");
    wake.hidden = !awakened.has(u.id);
    wake.textContent = "Show awakened";
    openModal(unitModal);
  }
  $("#unitAwaken").addEventListener("click", (e) => {
    wakeOn = !wakeOn;
    $("#unitImg").src = `${ART}/${wakeOn ? "portraits_awakened" : "portraits"}/${current.id}.webp`;
    e.target.textContent = wakeOn ? "Show base form" : "Show awakened";
  });

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
  $$(".section__head, .step, .heroes, .rail, .bosses, .mode, .league, .post, .stat").forEach((el) => {
    el.classList.add("reveal");
    revealObs.observe(el);
  });
})();
