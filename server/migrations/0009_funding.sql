-- Community funding (website support.html, admin #/funding). Goals are things donations pay
-- for; each donation is a pledge (made on the site, pending until the money arrives) or a
-- confirmed gift. Amounts are US cents. See server/src/funding.ts.
CREATE TABLE funding_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  target_cents INTEGER NOT NULL,
  -- 1: running costs that refill each month; only this month's gifts count.
  monthly INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  -- 'active' shows on the site, 'archived' is hidden but keeps its donations.
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- NULL: the general fund.
  goal_id INTEGER REFERENCES funding_goals(id),
  name TEXT NOT NULL DEFAULT '',
  anonymous INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL,
  -- What was actually sent, e.g. 174.00 PHP through GCash.
  paid_amount REAL,
  paid_currency TEXT,
  method TEXT NOT NULL,
  -- Short code the donor puts in the payment message (CK-XXXX), for pledges.
  code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Payment reference: Ko-fi transaction id or GCash reference number.
  ref TEXT,
  message TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  confirmed_by INTEGER
);
CREATE INDEX donations_status ON donations (status, created_at);
CREATE UNIQUE INDEX donations_ref ON donations (method, ref) WHERE ref IS NOT NULL;

-- kofi_handle, gcash_name, gcash_qr (image data URL), php_per_usd.
CREATE TABLE funding_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO funding_settings (key, value) VALUES ('php_per_usd', '58'), ('kofi_handle', 'F5I428XZUE');

-- Running costs: the Cloudflare bill (Workers, D1, Durable Objects, R2, email), $20 a month.
INSERT INTO funding_goals (category, title, description, target_cents, monthly, sort, status, created_at, updated_at)
VALUES ('Running costs', 'Cloudflare servers', 'Game, API, database, PvP rooms, art storage and email. Keeps Crown & Keep online for everyone.', 2000, 1, 0, 'active', unixepoch() * 1000, unixepoch() * 1000);
