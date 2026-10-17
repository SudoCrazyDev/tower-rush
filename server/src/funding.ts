/**
 * Community funding (shared/funding.ts). Public routes for the website's support page and the
 * Ko-fi webhook live at /api/funding (exempt from the client version gate); the admin routes
 * are mounted under /api/admin/funding behind requireAdmin.
 *
 * Flow: a player picks a goal and amount on the site and gets a pledge code (CK-XXXX), then
 * pays with the GCash QR or on Ko-fi with the code in the message. Ko-fi gifts are matched by
 * the webhook; GCash ones are confirmed by an admin when the money shows up.
 */
import { Hono } from "hono";
import { all, audit, one, run } from "./db.ts";
import { rateLimit } from "./auth.ts";
import { body, fail, numParam, type AppEnv } from "./http.ts";
import {
  DONATION_METHODS,
  DONATION_STATUSES,
  PLEDGE_CODE_RE,
  newPledgeCode,
  summarize,
  type Donation,
  type DonationMethod,
  type DonationStatus,
  type FundingGoal,
  type FundingSettings,
} from "../../shared/funding.ts";

interface GoalRow {
  id: number;
  category: string;
  title: string;
  description: string;
  target_cents: number;
  monthly: number;
  sort: number;
  status: string;
}

interface DonationRow {
  id: number;
  goal_id: number | null;
  name: string;
  anonymous: number;
  amount_cents: number;
  paid_amount: number | null;
  paid_currency: string | null;
  method: string;
  code: string | null;
  status: string;
  ref: string | null;
  message: string;
  created_at: number;
  confirmed_at: number | null;
  confirmed_by: number | null;
}

const toGoal = (r: GoalRow): FundingGoal => ({
  id: r.id,
  category: r.category,
  title: r.title,
  description: r.description,
  targetCents: r.target_cents,
  monthly: !!r.monthly,
  sort: r.sort,
  status: r.status === "archived" ? "archived" : "active",
});

const toDonation = (r: DonationRow): Donation => ({
  id: r.id,
  goalId: r.goal_id,
  name: r.name,
  anonymous: !!r.anonymous,
  amountCents: r.amount_cents,
  paidAmount: r.paid_amount,
  paidCurrency: r.paid_currency,
  method: r.method as DonationMethod,
  code: r.code,
  status: r.status as DonationStatus,
  ref: r.ref,
  message: r.message,
  createdAt: r.created_at,
  confirmedAt: r.confirmed_at,
});

/** Pledges nobody paid within this long drop off the site and out of the admin queue. */
const PLEDGE_TTL = 14 * 86400_000;
const MAX_CENTS = 1_000_000;
const MAX_QR_CHARS = 700_000;

const goals = async (db: D1Database) => (await all<GoalRow>(db, "SELECT * FROM funding_goals")).map(toGoal);

async function rawSettings(db: D1Database) {
  const rows = await all<{ key: string; value: string }>(db, "SELECT key, value FROM funding_settings");
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string | undefined>;
}

async function settings(db: D1Database): Promise<FundingSettings> {
  const s = await rawSettings(db);
  return {
    kofiHandle: s.kofi_handle ?? "",
    gcashName: s.gcash_name ?? "",
    hasGcashQr: !!s.gcash_qr,
    phpPerUsd: Number(s.php_per_usd) || 58,
  };
}

const confirmedDonations = async (db: D1Database) =>
  (await all<DonationRow>(db, "SELECT * FROM donations WHERE status = 'confirmed'")).map(toDonation);

const cleanName = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 32);
const cents = (v: unknown) => Math.round(Number(v) * 100);

// ---------------------------------------------------------------- public

export const funding = new Hono<AppEnv>();

funding.get("/", async (c) => {
  const db = c.env.DB;
  const [g, d, s] = await Promise.all([goals(db), confirmedDonations(db), settings(db)]);
  c.header("Cache-Control", "public, max-age=30");
  return c.json(summarize(g, d, s));
});

/** The GCash QR image the admin uploaded (stored as a data URL in funding_settings). */
funding.get("/gcash-qr", async (c) => {
  const qr = (await rawSettings(c.env.DB)).gcash_qr;
  const m = qr?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) fail(404, "No GCash QR yet");
  const bytes = Uint8Array.from(atob(m[2]), (ch) => ch.charCodeAt(0));
  return new Response(bytes, { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=300" } });
});

/** A pledge: the donor's goal, amount and name, waiting for the payment. Returns its code. */
funding.post("/pledge", rateLimit("AUTH_LIMIT"), async (c) => {
  const db = c.env.DB;
  const b = await body(c);
  const method = String(b.method ?? "") as DonationMethod;
  if (method !== "gcash" && method !== "kofi") fail(400, "Pick GCash or Ko-fi");
  const amount = cents(b.amount);
  if (!(amount >= 100 && amount <= MAX_CENTS)) fail(400, "Amount must be between $1 and $10,000");
  const anonymous = !!b.anonymous;
  const name = anonymous ? "" : cleanName(b.name);
  if (!anonymous && !name) fail(400, "Enter a name or choose anonymous");
  let goalId: number | null = null;
  if (b.goalId != null && b.goalId !== "") {
    goalId = Number(b.goalId);
    if (!(await one(db, "SELECT id FROM funding_goals WHERE id = ? AND status = 'active'", goalId))) fail(400, "That goal is closed");
  }
  const s = await settings(db);
  if (method === "kofi" && !s.kofiHandle) fail(400, "Ko-fi isn't set up yet");
  if (method === "gcash" && !s.hasGcashQr) fail(400, "GCash isn't set up yet");
  const paidAmount = method === "gcash" ? Math.ceil((amount / 100) * s.phpPerUsd) : amount / 100;
  const paidCurrency = method === "gcash" ? "PHP" : "USD";
  const message = String(b.message ?? "").trim().slice(0, 200);

  const buf = new Uint32Array(4);
  for (let tries = 0; tries < 5; tries++) {
    crypto.getRandomValues(buf);
    let i = 0;
    const code = newPledgeCode(() => buf[i++] / 2 ** 32);
    const res = await run(
      db,
      `INSERT OR IGNORE INTO donations (goal_id, name, anonymous, amount_cents, paid_amount, paid_currency, method, code, status, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      goalId, name, anonymous ? 1 : 0, amount, paidAmount, paidCurrency, method, code, message, Date.now(),
    );
    if (res.meta.changes) return c.json({ code, method, paidAmount, paidCurrency, kofiHandle: s.kofiHandle || null });
  }
  fail(503, "Couldn't make a code, try again");
});

/**
 * Ko-fi webhook (Ko-fi > Settings > API > Webhook URL: https://api.crownnkeep.com/api/funding/kofi).
 * Ko-fi posts form data with a `data` JSON field. A pledge code in the message credits that
 * pledge's goal; otherwise the gift goes to the general fund. Answers 200 for anything it has
 * already seen so Ko-fi doesn't retry.
 */
funding.post("/kofi", async (c) => {
  const token = c.env.KOFI_VERIFICATION_TOKEN;
  if (!token) fail(503, "Ko-fi webhook not configured");
  const form = await c.req.parseBody();
  let data: Record<string, any>;
  try {
    data = JSON.parse(String(form.data ?? ""));
  } catch {
    fail(400, "Bad payload");
  }
  if (!timingSafeEqual(String(data.verification_token ?? ""), token)) fail(401, "Bad token");

  const db = c.env.DB;
  const ref = String(data.kofi_transaction_id ?? data.message_id ?? "").slice(0, 100);
  if (!ref) fail(400, "No transaction id");
  if (await one(db, "SELECT id FROM donations WHERE method = 'kofi' AND ref = ?", ref)) return c.json({ ok: true, duplicate: true });

  const currency = String(data.currency ?? "USD").toUpperCase();
  const paid = Number(data.amount) || 0;
  const s = await settings(db);
  const usdCents = currency === "USD" ? Math.round(paid * 100) : currency === "PHP" ? Math.round((paid / s.phpPerUsd) * 100) : 0;
  const anonymous = data.is_public === false;
  const name = cleanName(data.from_name);
  const message = String(data.message ?? "").slice(0, 200);
  const now = Date.now();
  // Unknown currencies stay pending so an admin can set the dollar amount.
  const status = usdCents > 0 ? "confirmed" : "pending";

  const code = message.match(PLEDGE_CODE_RE)?.[0]?.toUpperCase();
  // The pledge keeps the name the player chose for the wall; Ko-fi's private flag still wins.
  const pledge = code ? await one<DonationRow>(db, "SELECT * FROM donations WHERE code = ? AND status = 'pending'", code) : null;
  if (pledge) {
    await run(
      db,
      `UPDATE donations SET method = 'kofi', ref = ?, amount_cents = ?, paid_amount = ?, paid_currency = ?, status = ?,
         name = CASE WHEN name = '' THEN ? ELSE name END, anonymous = CASE WHEN ? THEN 1 ELSE anonymous END,
         confirmed_at = ? WHERE id = ?`,
      ref, usdCents || pledge.amount_cents, paid, currency, status, name, anonymous ? 1 : 0, now, pledge.id,
    );
  } else {
    await run(
      db,
      `INSERT INTO donations (goal_id, name, anonymous, amount_cents, paid_amount, paid_currency, method, status, ref, message, created_at, confirmed_at)
       VALUES (NULL, ?, ?, ?, ?, ?, 'kofi', ?, ?, ?, ?, ?)`,
      name, anonymous ? 1 : 0, usdCents, paid, currency, status, ref, message, now, now,
    );
  }
  await audit(db, null, "funding.kofi", ref, { amount: paid, currency, code: code ?? null, matched: !!pledge });
  return c.json({ ok: true });
});

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------- admin (/api/admin/funding)

export const fundingAdmin = new Hono<AppEnv>();

fundingAdmin.get("/", async (c) => {
  const db = c.env.DB;
  const since = Date.now() - PLEDGE_TTL;
  const [g, d, s] = await Promise.all([
    goals(db),
    all<DonationRow>(db, "SELECT * FROM donations WHERE status <> 'pending' OR created_at > ? ORDER BY id DESC LIMIT 500", since),
    settings(db),
  ]);
  const list = d.map(toDonation);
  return c.json({ goals: g, donations: list, settings: s, summary: summarize(g, list, s) });
});

function goalFields(b: Record<string, any>) {
  const category = String(b.category ?? "").trim().slice(0, 60);
  const title = String(b.title ?? "").trim().slice(0, 80);
  if (!category || !title) fail(400, "Category and title are required");
  const target = cents(b.target);
  if (!(target >= 100 && target <= MAX_CENTS)) fail(400, "Target must be between $1 and $10,000");
  return {
    category,
    title,
    description: String(b.description ?? "").trim().slice(0, 500),
    target,
    monthly: b.monthly ? 1 : 0,
    sort: Math.round(Number(b.sort) || 0),
    status: b.status === "archived" ? "archived" : "active",
  };
}

fundingAdmin.post("/goals", async (c) => {
  const f = goalFields(await body(c));
  const now = Date.now();
  const res = await run(
    c.env.DB,
    `INSERT INTO funding_goals (category, title, description, target_cents, monthly, sort, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    f.category, f.title, f.description, f.target, f.monthly, f.sort, f.status, now, now,
  );
  await audit(c.env.DB, c.get("adminId"), "funding.goal.create", f.title, f);
  return c.json({ id: res.meta.last_row_id });
});

fundingAdmin.put("/goals/:id", async (c) => {
  const id = numParam(c, "id");
  const f = goalFields(await body(c));
  await run(
    c.env.DB,
    `UPDATE funding_goals SET category = ?, title = ?, description = ?, target_cents = ?, monthly = ?, sort = ?, status = ?, updated_at = ? WHERE id = ?`,
    f.category, f.title, f.description, f.target, f.monthly, f.sort, f.status, Date.now(), id,
  );
  await audit(c.env.DB, c.get("adminId"), "funding.goal.update", `goal:${id}`, f);
  return c.json({ ok: true });
});

/** Only goals nobody gave to can be deleted; archive the others. */
fundingAdmin.delete("/goals/:id", async (c) => {
  const id = numParam(c, "id");
  if (await one(c.env.DB, "SELECT id FROM donations WHERE goal_id = ? AND status <> 'rejected' LIMIT 1", id)) fail(400, "This goal has donations; archive it instead");
  await run(c.env.DB, "DELETE FROM donations WHERE goal_id = ?", id);
  await run(c.env.DB, "DELETE FROM funding_goals WHERE id = ?", id);
  await audit(c.env.DB, c.get("adminId"), "funding.goal.delete", `goal:${id}`);
  return c.json({ ok: true });
});

async function goalIdField(db: D1Database, v: unknown) {
  if (v == null || v === "") return null;
  const id = Number(v);
  if (!(await one(db, "SELECT id FROM funding_goals WHERE id = ?", id))) fail(400, "Unknown goal");
  return id;
}

/** A gift logged by hand (e.g. a GCash transfer without a pledge). Confirmed straight away. */
fundingAdmin.post("/donations", async (c) => {
  const db = c.env.DB;
  const b = await body(c);
  const method = String(b.method ?? "manual") as DonationMethod;
  if (!DONATION_METHODS.includes(method)) fail(400, "Unknown method");
  const amount = cents(b.amount);
  if (!(amount > 0 && amount <= MAX_CENTS)) fail(400, "Enter the amount in dollars");
  const now = Date.now();
  const res = await run(
    db,
    `INSERT INTO donations (goal_id, name, anonymous, amount_cents, paid_amount, paid_currency, method, status, ref, message, created_at, confirmed_at, confirmed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)`,
    await goalIdField(db, b.goalId), cleanName(b.name), b.anonymous ? 1 : 0, amount,
    b.paidAmount === "" || b.paidAmount == null ? null : Number(b.paidAmount), b.paidCurrency ? String(b.paidCurrency).slice(0, 8) : null,
    method, String(b.ref ?? "").trim().slice(0, 100) || null, String(b.message ?? "").slice(0, 200), now, now, c.get("adminId"),
  );
  await audit(db, c.get("adminId"), "funding.donation.add", `donation:${res.meta.last_row_id}`, { amount, method });
  return c.json({ id: res.meta.last_row_id });
});

/** Confirm, reject or correct a donation (goal, amount, name, payment reference). */
fundingAdmin.put("/donations/:id", async (c) => {
  const db = c.env.DB;
  const id = numParam(c, "id");
  const cur = await one<DonationRow>(db, "SELECT * FROM donations WHERE id = ?", id);
  if (!cur) fail(404, "No such donation");
  const b = await body(c);
  const status = String(b.status ?? cur.status) as DonationStatus;
  if (!DONATION_STATUSES.includes(status)) fail(400, "Unknown status");
  const amount = b.amount === undefined ? cur.amount_cents : cents(b.amount);
  if (!(amount > 0 && amount <= MAX_CENTS)) fail(400, "Enter the amount in dollars");
  const goalId = b.goalId === undefined ? cur.goal_id : await goalIdField(db, b.goalId);
  const confirming = status === "confirmed" && cur.status !== "confirmed";
  await run(
    db,
    `UPDATE donations SET goal_id = ?, name = ?, anonymous = ?, amount_cents = ?, paid_amount = ?, ref = ?, status = ?,
       confirmed_at = ?, confirmed_by = ? WHERE id = ?`,
    goalId,
    b.name === undefined ? cur.name : cleanName(b.name),
    b.anonymous === undefined ? cur.anonymous : b.anonymous ? 1 : 0,
    amount,
    b.paidAmount === undefined ? cur.paid_amount : b.paidAmount === "" || b.paidAmount == null ? null : Number(b.paidAmount),
    b.ref === undefined ? cur.ref : String(b.ref ?? "").trim().slice(0, 100) || null,
    status,
    confirming ? Date.now() : status === "confirmed" ? cur.confirmed_at : null,
    confirming ? c.get("adminId") : status === "confirmed" ? cur.confirmed_by : null,
    id,
  );
  await audit(db, c.get("adminId"), `funding.donation.${status}`, `donation:${id}`, { amount, goalId });
  return c.json({ ok: true });
});

fundingAdmin.put("/settings", async (c) => {
  const db = c.env.DB;
  const b = await body(c);
  const set = (key: string, value: string) =>
    run(db, "INSERT INTO funding_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
  if (b.kofiHandle !== undefined) {
    const h = String(b.kofiHandle).trim().replace(/^https?:\/\/(www\.)?ko-fi\.com\//i, "").replace(/\/.*$/, "");
    if (h && !/^[A-Za-z0-9_]{2,40}$/.test(h)) fail(400, "That isn't a Ko-fi handle");
    await set("kofi_handle", h);
  }
  if (b.gcashName !== undefined) await set("gcash_name", String(b.gcashName).trim().slice(0, 60));
  if (b.phpPerUsd !== undefined) {
    const r = Number(b.phpPerUsd);
    if (!(r > 10 && r < 500)) fail(400, "PHP per USD looks wrong");
    await set("php_per_usd", String(r));
  }
  if (b.gcashQr !== undefined) {
    const qr = String(b.gcashQr);
    if (qr && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(qr)) fail(400, "Upload a PNG, JPG or WebP image");
    if (qr.length > MAX_QR_CHARS) fail(400, "Image too large (keep it under 500 KB)");
    await set("gcash_qr", qr);
  }
  await audit(db, c.get("adminId"), "funding.settings", null, { ...b, gcashQr: b.gcashQr === undefined ? undefined : "(image)" });
  return c.json(await settings(db));
});

