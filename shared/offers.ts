/**
 * Shop offers and limited-time events, both part of the game config. An event runs between
 * two times and boosts battle rewards and/or discounts chests while it's on. An offer is a
 * bundle (gold, gems, chests) sold in the shop for gold or gems, optionally limited per
 * player, gated by trophies, and on sale only during its own dates or its event's.
 * Times are ISO strings (UTC); the server decides what's live, the game mirrors it.
 */
import type { Reward } from "./daily.ts";

export interface EventDef {
  id: string;
  name: string;
  /** One line shown under the name in the game. */
  text: string;
  startsAt: string;
  endsAt: string;
  /** Battle gold and gems are multiplied by these while it runs (1 = no change). */
  coinMult: number;
  gemMult: number;
  /** Fraction off every chest in the shop (0.25 = 25% off). */
  chestDiscount: number;
  enabled: boolean;
}

export interface OfferDef {
  id: string;
  name: string;
  /** One line shown under the name in the game. */
  text: string;
  /** Art key in items/. */
  image: string;
  price: number;
  currency: "coins" | "gems";
  /** Struck-through "was" price shown next to the price; 0 for none. */
  wasPrice: number;
  /** What the player gets; `chest` comes `chests` times. */
  reward: Reward;
  chests: number;
  /** Purchases allowed per player; 0 = unlimited. */
  limit: number;
  /** Only shown to players with at least this many trophies. */
  trophies: number;
  /** When set, the offer is on sale only while this event runs (its own dates are ignored). */
  event: string | null;
  /** Own sale window; null = open-ended on that side. */
  startsAt: string | null;
  endsAt: string | null;
  enabled: boolean;
}

const day = 86400_000;
const iso = (t: number) => new Date(t).toISOString();

/** No events by default; one starter bundle (once per player) so the shop shows the idea. */
export const DEFAULT_EVENTS: EventDef[] = [];
export const DEFAULT_OFFERS: OfferDef[] = [
  {
    id: "starter_pack",
    name: "Starter Pack",
    text: "A head start for new players",
    image: "card_pack",
    price: 100,
    currency: "gems",
    wasPrice: 250,
    reward: { coins: 1000, gems: 0, chest: "silver" },
    chests: 2,
    limit: 1,
    trophies: 0,
    event: null,
    startsAt: null,
    endsAt: null,
    enabled: true,
  },
];

export function newEvent(id: string, now = Date.now()): EventDef {
  const start = Math.ceil(now / day) * day;
  return { id, name: "Gold Rush Weekend", text: "Double gold from every battle", startsAt: iso(start), endsAt: iso(start + 2 * day), coinMult: 2, gemMult: 1, chestDiscount: 0, enabled: true };
}

export function newOffer(id: string): OfferDef {
  return { id, name: "New Offer", text: "", image: "chest_rare", price: 50, currency: "gems", wasPrice: 0, reward: { coins: 500, gems: 0, chest: null }, chests: 1, limit: 1, trophies: 0, event: null, startsAt: null, endsAt: null, enabled: false };
}

/** Live tables: replaced in place when a config is applied (see config.ts). */
export const EVENTS: EventDef[] = structuredClone(DEFAULT_EVENTS);
export const OFFERS: OfferDef[] = structuredClone(DEFAULT_OFFERS);

export const eventById = (id: string) => EVENTS.find((e) => e.id === id);
export const offerById = (id: string) => OFFERS.find((o) => o.id === id);

/** A config time as milliseconds; NaN if it doesn't parse. */
export const timeOf = (s: string) => Date.parse(s);

export type Phase = "off" | "scheduled" | "live" | "ended";

/** Where something with an on/off switch and a time window is, at `now`. */
export function phaseOf(enabled: boolean, start: number | null, end: number | null, now = Date.now()): Phase {
  if (!enabled) return "off";
  if (start !== null && now < start) return "scheduled";
  if (end !== null && now >= end) return "ended";
  return "live";
}

export const eventPhase = (e: EventDef, now = Date.now()) => phaseOf(e.enabled, timeOf(e.startsAt), timeOf(e.endsAt), now);

export const activeEvents = (now = Date.now()) => EVENTS.filter((e) => eventPhase(e, now) === "live");

/** An offer's sale window: its event's when it has one, else its own. */
export function offerWindow(o: OfferDef, events = EVENTS): { start: number | null; end: number | null; enabled: boolean } {
  if (o.event) {
    const e = events.find((x) => x.id === o.event);
    if (!e) return { start: null, end: null, enabled: false };
    return { start: timeOf(e.startsAt), end: timeOf(e.endsAt), enabled: o.enabled && e.enabled };
  }
  return { start: o.startsAt ? timeOf(o.startsAt) : null, end: o.endsAt ? timeOf(o.endsAt) : null, enabled: o.enabled };
}

export function offerPhase(o: OfferDef, now = Date.now(), events = EVENTS) {
  const w = offerWindow(o, events);
  return phaseOf(w.enabled, w.start, w.end, now);
}

/**
 * The boosts in effect at `now`. Overlapping events don't stack: each boost is the biggest
 * any running event gives.
 */
export function eventBoosts(now = Date.now()) {
  const live = activeEvents(now);
  return {
    coinMult: Math.max(1, ...live.map((e) => e.coinMult)),
    gemMult: Math.max(1, ...live.map((e) => e.gemMult)),
    chestDiscount: Math.max(0, ...live.map((e) => e.chestDiscount)),
  };
}

/** A chest's price after any running event's discount. */
export const discounted = (price: number, now = Date.now()) => Math.round(price * (1 - eventBoosts(now).chestDiscount));

/** Battle gold and gems with event boosts applied (trophies are never boosted). */
export function boostRewards<T extends { coins: number; gems: number }>(r: T, now = Date.now()): T {
  const b = eventBoosts(now);
  return { ...r, coins: Math.round(r.coins * b.coinMult), gems: Math.round(r.gems * b.gemMult) };
}

/** Offers a player with `trophies` can see right now, in config order. */
export const shopOffers = (trophies: number, now = Date.now()) => OFFERS.filter((o) => offerPhase(o, now) === "live" && trophies >= o.trophies);

/** How many more a player can buy (Infinity when unlimited). */
export const offerLeft = (o: OfferDef, bought: Record<string, number>) => (o.limit > 0 ? Math.max(0, o.limit - (bought[o.id] ?? 0)) : Infinity);

/** Why an offer can't be bought, or null if it can. */
export function offerBuyProblem(o: OfferDef | undefined, p: { coins: number; gems: number; trophies: number; offers: Record<string, number> }, now = Date.now()) {
  if (!o || offerPhase(o, now) !== "live") return "That offer isn't on sale";
  if (p.trophies < o.trophies) return `Unlocks at ${o.trophies} trophies`;
  if (offerLeft(o, p.offers) <= 0) return "You've bought all of these";
  if (p[o.currency] < o.price) return `Not enough ${o.currency === "coins" ? "gold" : "gems"}`;
  return null;
}

/** The next moment an event or offer starts or ends after `now` (Infinity if none). */
export function nextChange(now = Date.now()) {
  const times = [
    ...EVENTS.filter((e) => e.enabled).flatMap((e) => [timeOf(e.startsAt), timeOf(e.endsAt)]),
    ...OFFERS.map((o) => offerWindow(o)).flatMap((w) => (w.enabled ? [w.start, w.end] : [])),
  ];
  return Math.min(Infinity, ...times.filter((t): t is number => t !== null && t > now));
}

/** Milliseconds until a window ends (null when it doesn't). */
export const msLeft = (end: number | null, now = Date.now()) => (end === null ? null : Math.max(0, end - now));

/** "2d 4h", "3h 12m", "45m" — for countdowns. */
export function shortDuration(ms: number) {
  const m = Math.max(1, Math.ceil(ms / 60000));
  if (m >= 1440) return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}

/** Config problems in the offers and events lists. */
export function offerProblems(events: EventDef[], offers: OfferDef[], chestIds: Set<string>): string[] {
  const errs: string[] = [];
  const idOk = (id: string) => /^[a-z0-9_]+$/.test(id ?? "");
  const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const eventIds = new Set<string>();
  for (const e of events) {
    const w = `Event ${e.id}`;
    if (!idOk(e.id)) errs.push(`Event id "${e.id}" must be lowercase letters, digits or _`);
    if (eventIds.has(e.id)) errs.push(`Duplicate event id "${e.id}"`);
    eventIds.add(e.id);
    if (!e.name) errs.push(`${w}: name is required`);
    const s = timeOf(e.startsAt);
    const t = timeOf(e.endsAt);
    if (!Number.isFinite(s)) errs.push(`${w}: start time is missing or invalid`);
    if (!Number.isFinite(t)) errs.push(`${w}: end time is missing or invalid`);
    if (Number.isFinite(s) && Number.isFinite(t) && t <= s) errs.push(`${w}: must end after it starts`);
    if (!finite(e.coinMult) || e.coinMult < 1 || e.coinMult > 10) errs.push(`${w}: gold multiplier must be between 1 and 10`);
    if (!finite(e.gemMult) || e.gemMult < 1 || e.gemMult > 10) errs.push(`${w}: gem multiplier must be between 1 and 10`);
    if (!finite(e.chestDiscount) || e.chestDiscount < 0 || e.chestDiscount > 0.9) errs.push(`${w}: chest discount must be between 0 and 90%`);
  }
  const offerIds = new Set<string>();
  for (const o of offers) {
    const w = `Offer ${o.id}`;
    if (!idOk(o.id)) errs.push(`Offer id "${o.id}" must be lowercase letters, digits or _`);
    if (offerIds.has(o.id)) errs.push(`Duplicate offer id "${o.id}"`);
    offerIds.add(o.id);
    if (!o.name) errs.push(`${w}: name is required`);
    if (!/^[a-z0-9_]+$/.test(o.image ?? "")) errs.push(`${w}: art is required`);
    if (o.currency !== "coins" && o.currency !== "gems") errs.push(`${w}: currency must be gold or gems`);
    for (const [k, v, label] of [
      ["price", o.price, "price"],
      ["wasPrice", o.wasPrice, "was-price"],
      ["limit", o.limit, "limit"],
      ["trophies", o.trophies, "trophies"],
      ["coins", o.reward?.coins, "gold"],
      ["gems", o.reward?.gems, "gems"],
    ] as const) if (!Number.isInteger(v) || v < 0) errs.push(`${w}: ${label} must be a whole number ≥ 0${k === "limit" ? " (0 = unlimited)" : ""}`);
    if (o.reward?.chest != null && !chestIds.has(o.reward.chest)) errs.push(`${w}: unknown chest "${o.reward.chest}"`);
    if (o.reward?.chest != null && (!Number.isInteger(o.chests) || o.chests < 1 || o.chests > 50)) errs.push(`${w}: chest count must be 1 to 50`);
    if (o.reward && !o.reward.coins && !o.reward.gems && !o.reward.chest) errs.push(`${w}: the bundle is empty`);
    if (o.wasPrice && o.wasPrice <= o.price) errs.push(`${w}: the was-price must be higher than the price`);
    if (o.event !== null && !events.some((e) => e.id === o.event)) errs.push(`${w}: unknown event "${o.event}"`);
    if (o.event === null) {
      const s = o.startsAt === null ? null : timeOf(o.startsAt);
      const t = o.endsAt === null ? null : timeOf(o.endsAt);
      if (s !== null && !Number.isFinite(s)) errs.push(`${w}: start time is invalid`);
      if (t !== null && !Number.isFinite(t)) errs.push(`${w}: end time is invalid`);
      if (s !== null && t !== null && t <= s) errs.push(`${w}: must end after it starts`);
    }
  }
  return errs;
}
