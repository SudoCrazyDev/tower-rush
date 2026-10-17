/*
 * Support page: funding goals from the API (/api/funding, server/src/funding.ts) and the
 * donate dialog. Donating makes a pledge with a code (CK-XXXX) that the player sends with
 * their GCash or Ko-fi payment; an admin (or the Ko-fi webhook) confirms it.
 */
(() => {
  const host = location.hostname;
  const API =
    host === "localhost" || host === "127.0.0.1"
      ? "http://localhost:8787"
      : host.startsWith("staging.")
        ? "https://staging-api.crownnkeep.com"
        : "https://api.crownnkeep.com";
  const PRESETS = [1, 3, 5, 10, 25];

  const $ = (id) => document.getElementById(id);
  const usd = (c) => "$" + (c / 100).toFixed(c % 100 ? 2 : 0);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const month = new Date().toLocaleString("en", { month: "long" });

  let data = null;
  let goal = null; // the goal being donated to (null: general fund)
  let method = "gcash";

  async function load() {
    try {
      const r = await fetch(API + "/api/funding");
      if (!r.ok) throw new Error();
      data = await r.json();
      render();
    } catch {
      $("supStatus").textContent = "Couldn't load the goals right now. Try again in a minute.";
    }
  }

  const canDonate = () => data && (data.settings.hasGcashQr || data.settings.kofiHandle);

  function render() {
    const s = data;
    const funded = s.goals.filter((g) => g.done && !g.monthly).length;
    $("supRaised").textContent = usd(s.totalCents);
    $("supSupporters").textContent = s.supporters;
    $("supFunded").textContent = funded;
    $("supTotals").hidden = false;
    if (s.settings.kofiHandle) {
      $("supKofiTopLink").href = "https://ko-fi.com/" + encodeURIComponent(s.settings.kofiHandle);
      $("supKofiTop").hidden = false;
    }

    // Monthly running costs first, then each category in the order its first goal appears.
    const cats = [];
    for (const g of s.goals) {
      const key = g.monthly ? "\u0000monthly" : g.category;
      let c = cats.find((x) => x.key === key);
      if (!c) cats.push((c = { key, name: g.monthly ? "Running costs" : g.category, monthly: g.monthly, goals: [] }));
      c.goals.push(g);
    }
    cats.sort((a, b) => b.monthly - a.monthly);

    const html = cats.map((c) => `
      <div class="sup-cat${c.monthly ? " sup-cat--monthly" : ""}">
        <div class="sup-cat__head">
          <h3>${esc(c.name)}</h3>
          ${c.monthly ? `<span class="sup-cat__note">${month}: refills every month</span>` : catNote(c.goals)}
        </div>
        <div class="sup-cat__list">${c.goals.map(card).join("")}</div>
      </div>`).join("");

    const general = `
      <div class="sup-general">
        <div>
          <h3>General fund</h3>
          <p>Not sure what to pick? The general fund goes wherever it's needed most. Overflow from finished goals lands here too.</p>
        </div>
        <div class="sup-general__side">
          <b>${usd(s.generalCents)}</b>
          ${canDonate() ? `<button class="btn btn--sm" data-donate="">Donate</button>` : ""}
        </div>
      </div>`;

    $("supGoals").innerHTML = (cats.length ? html : `<p class="sup__status">No goals posted yet. Check back soon!</p>`) + general +
      (canDonate() ? "" : `<p class="sup__status">Donations open soon.</p>`);

    if (s.recent.length) {
      $("supRecent").innerHTML = s.recent.map((d) => `
        <li><b>${esc(d.name)}</b> <span>${usd(d.amountCents)}</span> <em>${d.goal ? "for " + esc(d.goal) : "to the general fund"}</em></li>`).join("");
      $("supWall").hidden = false;
    }
  }

  function catNote(goals) {
    const done = goals.filter((g) => g.done).length;
    return `<span class="sup-cat__note">${done} of ${goals.length} funded</span>`;
  }

  function card(g) {
    const pct = Math.min(100, Math.round((g.raisedCents / g.targetCents) * 100));
    const left = g.targetCents - g.raisedCents;
    const donors = g.donors.length ? `<p class="sup-goal__donors">${g.done ? "Funded by " : "Backed by "}${g.donors.map(esc).join(", ")}</p>` : "";
    const carried = g.carriedCents ? ` <span class="sup-goal__carry" title="Rolled over from finished goals">+${usd(g.carriedCents)} rollover</span>` : "";
    return `
      <article class="sup-goal${g.done ? " is-done" : ""}">
        <div class="sup-goal__top">
          <h4>${esc(g.title)}</h4>
          ${g.done ? `<span class="sup-goal__badge">${g.monthly ? "Covered" : "Completed"}</span>` : `<span class="sup-goal__need">Need ${usd(g.targetCents)}</span>`}
        </div>
        ${g.description ? `<p class="sup-goal__desc">${esc(g.description)}</p>` : ""}
        <div class="sup-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${g.targetCents}" aria-valuenow="${g.raisedCents}" aria-label="${esc(g.title)} progress"><span style="width:${pct}%"></span></div>
        <div class="sup-goal__foot">
          <span class="sup-goal__amt"><b>${usd(g.raisedCents)}</b> / ${usd(g.targetCents)}${carried}</span>
          ${!g.done && canDonate() ? `<button class="btn btn--sm" data-donate="${g.id}" data-left="${left}">Donate</button>` : ""}
        </div>
        ${donors}
      </article>`;
  }

  // ---------------------------------------------------------------- donate dialog

  const modal = $("supModal");

  function open(goalId, leftCents) {
    goal = goalId ? data.goals.find((g) => g.id === Number(goalId)) : null;
    $("supModalCat").textContent = goal ? (goal.monthly ? "Running costs" : goal.category) : "General fund";
    $("supModalTitle").textContent = goal ? goal.title : "Where it's needed most";
    $("supModalLeft").textContent = goal ? `${usd(leftCents)} to go.` : "";
    const left = leftCents ? leftCents / 100 : 0;
    const presets = [...new Set([...PRESETS, ...(left && !PRESETS.includes(left) && left <= 100 ? [left] : [])])].sort((a, b) => a - b);
    $("supAmounts").innerHTML = presets
      .map((v) => `<button type="button" data-amt="${v}"${v === left ? ' class="is-left"' : ""}>$${v % 1 ? v.toFixed(2) : v}${v === left ? "<small>finish it</small>" : ""}</button>`)
      .join("");
    setAmount(left && left <= 25 ? left : 3);

    const ms = [];
    if (data.settings.hasGcashQr) ms.push(["gcash", "GCash"]);
    if (data.settings.kofiHandle) ms.push(["kofi", "Ko-fi / PayPal / card"]);
    method = ms[0][0];
    $("supMethods").innerHTML = ms.length > 1
      ? ms.map(([k, l]) => `<label><input type="radio" name="supMethod" value="${k}"${k === method ? " checked" : ""} /> ${l}</label>`).join("")
      : "";
    $("supError").textContent = "";
    $("supStep1").hidden = false;
    $("supStep2").hidden = true;
    modal.showModal();
  }

  function setAmount(v) {
    $("supAmount").value = v;
    for (const b of $("supAmounts").children) b.classList.toggle("is-on", Number(b.dataset.amt) === Number(v));
    showPhp();
  }

  function showPhp() {
    const v = Number($("supAmount").value) || 0;
    $("supPhp").textContent = method === "gcash" && v ? `≈ ₱${Math.ceil(v * data.settings.phpPerUsd).toLocaleString()} through GCash` : "";
  }

  async function next() {
    const amount = Number($("supAmount").value);
    const anonymous = $("supAnon").checked;
    const name = $("supName").value.trim();
    const err = $("supError");
    if (!(amount >= 1)) return (err.textContent = "The smallest gift is $1.");
    if (!anonymous && !name) return (err.textContent = "Enter a name, or tick Anonymous.");
    const btn = $("supNext");
    btn.disabled = true;
    err.textContent = "";
    try {
      const r = await fetch(API + "/api/funding/pledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal ? goal.id : null, amount, name, anonymous, method }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error || "Something went wrong");
      try { localStorage.setItem("ck-donor-name", name); } catch {}
      showCode(p, amount);
    } catch (e) {
      err.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  }

  function showCode(p, amount) {
    for (const id of ["supCode", "supCode2", "supCode3"]) $(id).textContent = p.code;
    $("supGcash").hidden = p.method !== "gcash";
    $("supKofi").hidden = p.method !== "kofi";
    if (p.method === "gcash") {
      const qr = API + "/api/funding/gcash-qr";
      $("supQr").src = qr;
      $("supQrSave").href = qr;
      $("supSend").textContent = `₱${Number(p.paidAmount).toLocaleString()}`;
      $("supQrName").textContent = data.settings.gcashName ? `GCash: ${data.settings.gcashName}` : "";
    } else {
      $("supKofiAmt").textContent = usd(Math.round(amount * 100));
      $("supKofiLink").href = `https://ko-fi.com/${encodeURIComponent(p.kofiHandle)}`;
    }
    $("supNote").textContent = p.method === "gcash"
      ? "We confirm GCash gifts by hand, usually within a day. Your name shows on the goal once it's confirmed. Thank you!"
      : "Ko-fi gifts with the code count right away. Your name shows on the goal in a minute or two. Thank you!";
    $("supStep1").hidden = true;
    $("supStep2").hidden = false;
  }

  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-donate]");
    if (d) return open(d.dataset.donate, Number(d.dataset.left) || 0);
    const a = e.target.closest("[data-amt]");
    if (a) setAmount(a.dataset.amt);
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  modal.addEventListener("close", () => { if (!$("supStep2").hidden) load(); });
  $("supAmount").addEventListener("input", () => {
    for (const b of $("supAmounts").children) b.classList.toggle("is-on", Number(b.dataset.amt) === Number($("supAmount").value));
    showPhp();
  });
  $("supMethods").addEventListener("change", (e) => { method = e.target.value; showPhp(); });
  $("supAnon").addEventListener("change", (e) => { $("supName").disabled = e.target.checked; });
  $("supNext").addEventListener("click", next);
  $("supCopy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("supCode").textContent);
      $("supCopy").textContent = "Copied!";
      setTimeout(() => ($("supCopy").textContent = "Copy code"), 1500);
    } catch {}
  });
  try { $("supName").value = localStorage.getItem("ck-donor-name") || ""; } catch {}

  load();
})();
