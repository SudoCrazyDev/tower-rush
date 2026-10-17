// Crown & Keep stories page: every saga, book, story and chapter, with story bosses and badges.
// Built from GAME_DATA.wiki.sagas (scripts/export-data.mjs); a new saga or book shows up on its own.
(() => {
  const { D, $, $$, img, words, fmt, RARITY_COLOR, BOSS_POWER, BOSS_SKILL, racePlate } = window.CK;
  const W = D.wiki;
  CK.nav();

  const unitById = Object.fromEntries(D.units.map((u) => [u.id, u]));
  const monsterById = Object.fromEntries(D.monsters.map((m) => [m.id, m]));
  const bossById = Object.fromEntries(D.bosses.map((b) => [b.id, b]));
  const banners = new Set(W.bossBanners);
  const arenaFoes = new Set(D.arenas.flatMap((a) => [...a.monsters, ...a.bosses]));
  const name = (id) => bossById[id]?.name ?? monsterById[id]?.name ?? words(id);
  const uniq = (xs) => [...new Set(xs)];
  // Story-only units pay out as a playable card (ui.ts cardView).
  const cardFace = (u) => img(`cards/frame_${u.rarity}.webp`, "", "card__bg") + img(`portraits/${u.id}.webp`, u.name, "card__art") + img(`ui/element_${u.element}.webp`, u.element, "card__el");

  // Which story a boss first appears in (for the story boss list).
  const where = {};
  W.sagas.forEach((saga) => saga.books.forEach((b, bi) => b.stories.forEach((st, si) => st.chapters.forEach((c) => c.bosses.forEach((id) => {
    where[id] ??= { saga, book: b, story: st, label: `${b.title.split(":")[0]} · Story ${si + 1}` };
  })))));

  const chapter = (c, i) => `<li class="chap">
    ${img(`locations/${c.art}.webp`, "", "chap__bg")}
    <span class="chap__body">
      <small>Chapter ${i + 1}${c.rules ? ` · <em>Special rules</em>` : ""}</small>
      <b>${c.title}</b>
      <span class="chap__meta">${c.waves} wave${c.waves === 1 ? "" : "s"}${c.bosses.length ? ` · ${uniq(c.bosses).length} boss${uniq(c.bosses).length === 1 ? "" : "es"}` : ""}</span>
      ${c.bosses.length ? `<span class="chap__bosses">${uniq(c.bosses).map((id) => `<a href="#b-${id}" title="${name(id)}">${img(`bosses/${id}.webp`, name(id))}</a>`).join("")}</span>` : ""}
    </span>
  </li>`;

  const story = (b, st, i) => {
    const foes = uniq(st.chapters.flatMap((c) => c.monsters)).filter((id) => monsterById[id] && !monsterById[id].family);
    const cards = st.replayCards.map((id) => unitById[id]).filter(Boolean);
    return `<article class="story2" id="s-${st.id}">
      <div class="story2__head">
        ${img(`story/covers/${st.cover}.webp`, st.title, "story2__cover")}
        <div class="story2__intro">
          <small>${b.title.split(":")[0]} · Story ${i + 1}</small>
          <h3>${st.title}</h3>
          <p>${st.blurb}</p>
          <div class="story2__rewards">
            <span class="plate" style="--c:#d9a441">${img("items/trophy.webp")}${fmt(st.trophies)} trophies</span>
            ${cards.map((u) => `<span class="story2__card" style="--c:${RARITY_COLOR[u.rarity]}"><span class="card__frame">${cardFace(u)}</span><span><small>Unlocks</small><b>${u.name}</b></span></span>`).join("")}
          </div>
        </div>
      </div>
      <ol class="chaps">${st.chapters.map(chapter).join("")}</ol>
      ${foes.length ? `<div class="story2__foes"><b>Foes</b><span>${foes.map((id) => `<span class="foe2" title="${name(id)}">${img(`monsters/${id}.webp`, name(id))}<small>${name(id)}</small></span>`).join("")}</span></div>` : ""}
    </article>`;
  };

  const bossCard = (id) => {
    const b = bossById[id], w = where[id];
    if (!b) return "";
    return `<article class="sboss" id="b-${id}">
      <div class="sboss__art">${banners.has(id) ? img(`boss_banners/${id}.webp`, b.name, "sboss__banner") : ""}${img(`bosses/${id}.webp`, b.name, "sboss__fig")}</div>
      <div class="sboss__body">
        <small><a href="#s-${w.story.id}">${w.story.title}</a> · ${w.label}</small>
        <b>${b.name}</b>
        <span class="bossc__power">${BOSS_POWER[b.power] ?? words(b.power)}</span>
        ${b.skills?.length ? `<ul>${b.skills.map((s) => `<li>${BOSS_SKILL[s.kind] ?? words(s.kind)} <small>every ${s.every}s</small></li>`).join("")}</ul>` : ""}
        <span class="bossc__meta">${racePlate(b.race)}<span>×${b.hp} health</span>${b.corrupted ? `<span class="plate" style="--c:#8a4bd6">Corrupted</span>` : ""}</span>
      </div>
    </article>`;
  };

  // Sagas: one tab each (only shown once there's more than one).
  let saga = 0;
  function render() {
    const s = W.sagas[saga];
    const storyBosses = uniq(s.books.flatMap((b) => b.stories.flatMap((st) => st.chapters.flatMap((c) => c.bosses))));
    const badges = Object.values(W.badges);
    $("#sagaTabs").hidden = W.sagas.length < 2;
    $("#sagaTabs").innerHTML = W.sagas.map((x, i) => `<button class="chip${i === saga ? " is-on" : ""}" data-saga="${i}">${x.title}</button>`).join("");
    $("#sagaTitle").textContent = s.title;
    $("#sagaMeta").textContent = `${s.books.length} books · ${s.books.reduce((n, b) => n + b.stories.length, 0)} stories · ${s.books.reduce((n, b) => n + b.stories.reduce((m, st) => m + st.chapters.length, 0), 0)} chapters`;
    $("#storyToc").innerHTML = s.books.map((b) => `<div class="stoc__book"><b>${b.title}</b>${b.stories.map((st) => `<a href="#s-${st.id}">${img(`story/covers/${st.cover}.webp`)}${st.title}</a>`).join("")}</div>`).join("")
      + `<div class="stoc__book"><b>More</b><a href="#bosses">${img("ui/boss_warning.webp")}Story bosses</a><a href="#badges">${img("items/star_shard.webp")}Badges</a></div>`;
    $("#storyBody").innerHTML = s.books.map((b) => `<section class="book2">
        <h2 class="book2__title"><small>${b.title.split(":")[0]}</small>${b.title.split(":").slice(1).join(":").trim() || b.title}</h2>
        ${b.stories.map((st, i) => story(b, st, i)).join("")}
      </section>`).join("")
      + `<section class="book2" id="bosses"><h2 class="book2__title"><small>${s.title}</small>Story bosses</h2>
          <p class="lead">${storyBosses.filter((id) => !arenaFoes.has(id)).length} bosses you only meet in the stories, plus arena bosses that return in them.</p>
          <div class="sbosses">${storyBosses.map(bossCard).join("")}</div></section>`
      + `<section class="book2" id="badges"><h2 class="book2__title"><small>${s.title}</small>Badges</h2>
          <div class="badges">${badges.map((x) => `<div class="badge">${img("items/star_shard.webp")}<b>${x.label}</b><small>${x.text}</small></div>`).join("")}</div></section>`;
  }
  $("#sagaTabs").addEventListener("click", (e) => { const t = e.target.closest("[data-saga]"); if (t) { saga = +t.dataset.saga; render(); } });
  render();
  if (location.hash) $(location.hash)?.scrollIntoView();
})();
