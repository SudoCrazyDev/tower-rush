/**
 * Community funding: goals that donations pay for (website support.html, admin #/funding,
 * server/src/funding.ts). Amounts are US cents; GCash gifts are converted at php_per_usd.
 */

export type DonationMethod = "gcash" | "kofi" | "manual";
export type DonationStatus = "pending" | "confirmed" | "rejected";
export const DONATION_METHODS: readonly DonationMethod[] = ["gcash", "kofi", "manual"];
export const DONATION_STATUSES: readonly DonationStatus[] = ["pending", "confirmed", "rejected"];

export interface FundingGoal {
  id: number;
  category: string;
  title: string;
  description: string;
  targetCents: number;
  monthly: boolean;
  sort: number;
  status: "active" | "archived";
}

export interface Donation {
  id: number;
  goalId: number | null;
  name: string;
  anonymous: boolean;
  amountCents: number;
  paidAmount: number | null;
  paidCurrency: string | null;
  method: DonationMethod;
  code: string | null;
  status: DonationStatus;
  ref: string | null;
  message: string;
  createdAt: number;
  confirmedAt: number | null;
}

export interface FundingSettings {
  kofiHandle: string;
  gcashName: string;
  hasGcashQr: boolean;
  phpPerUsd: number;
}

/** One goal as the website shows it. */
export interface GoalProgress {
  id: number;
  category: string;
  title: string;
  description: string;
  targetCents: number;
  monthly: boolean;
  /** Counted toward the target: own gifts plus overflow carried in, capped at the target. */
  raisedCents: number;
  /** Part of raisedCents that overflowed from earlier goals in the same category. */
  carriedCents: number;
  done: boolean;
  donors: string[];
}

export interface FundingSummary {
  goals: GoalProgress[];
  /** Untargeted gifts plus overflow nobody could take. */
  generalCents: number;
  totalCents: number;
  supporters: number;
  recent: { name: string; amountCents: number; goal: string | null; at: number }[];
  settings: FundingSettings;
}

export const ANONYMOUS = "Anonymous";
export const displayName = (d: Pick<Donation, "name" | "anonymous">) => (d.anonymous || !d.name.trim() ? ANONYMOUS : d.name.trim());

/** Start of the current month (UTC), for monthly goals. */
export const monthStart = (now = Date.now()) => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

/**
 * Progress for every active goal from confirmed donations. Within a category, goals fill in
 * sort order: whatever a goal gets beyond its target flows to the next unfinished goal, and
 * what's left at the end goes to the general fund. Monthly goals count this month's gifts
 * only and never pass overflow on.
 */
export function summarize(goals: FundingGoal[], donations: Donation[], settings: FundingSettings, now = Date.now()): FundingSummary {
  const confirmed = donations.filter((d) => d.status === "confirmed");
  const month = monthStart(now);
  const active = goals.filter((g) => g.status === "active").sort((a, b) => a.sort - b.sort || a.id - b.id);
  const byGoal = new Map<number, Donation[]>();
  for (const d of confirmed) if (d.goalId != null) byGoal.set(d.goalId, [...(byGoal.get(d.goalId) ?? []), d]);

  let general = confirmed.filter((d) => d.goalId == null || !active.some((g) => g.id === d.goalId)).reduce((s, d) => s + d.amountCents, 0);
  const out: GoalProgress[] = [];
  const carry = new Map<string, number>();

  for (const g of active) {
    const own = (byGoal.get(g.id) ?? []).filter((d) => !g.monthly || (d.confirmedAt ?? d.createdAt) >= month);
    const ownCents = own.reduce((s, d) => s + d.amountCents, 0);
    const donors = [...new Set(own.map(displayName))];
    if (g.monthly) {
      out.push({ ...pick(g), raisedCents: Math.min(ownCents, g.targetCents), carriedCents: 0, done: ownCents >= g.targetCents, donors });
      continue;
    }
    const carriedIn = carry.get(g.category) ?? 0;
    const total = ownCents + carriedIn;
    const raised = Math.min(total, g.targetCents);
    carry.set(g.category, total - raised);
    out.push({ ...pick(g), raisedCents: raised, carriedCents: Math.max(0, raised - ownCents), done: total >= g.targetCents, donors });
  }
  for (const left of carry.values()) general += left;

  const named = new Set(confirmed.filter((d) => !d.anonymous && d.name.trim()).map((d) => d.name.trim().toLowerCase()));
  const anon = confirmed.filter((d) => d.anonymous || !d.name.trim()).length;
  const titles = new Map(goals.map((g) => [g.id, g.title]));
  const recent = [...confirmed]
    .sort((a, b) => (b.confirmedAt ?? b.createdAt) - (a.confirmedAt ?? a.createdAt))
    .slice(0, 12)
    .map((d) => ({ name: displayName(d), amountCents: d.amountCents, goal: d.goalId == null ? null : titles.get(d.goalId) ?? null, at: d.confirmedAt ?? d.createdAt }));

  return {
    goals: out,
    generalCents: general,
    totalCents: confirmed.reduce((s, d) => s + d.amountCents, 0),
    supporters: named.size + anon,
    recent,
    settings,
  };
}

const pick = (g: FundingGoal) => ({ id: g.id, category: g.category, title: g.title, description: g.description, targetCents: g.targetCents, monthly: g.monthly });

/** "CK-" plus 4 characters without look-alikes (no 0/O, 1/I/L). */
export function newPledgeCode(rand: () => number = Math.random) {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "CK-";
  for (let i = 0; i < 4; i++) s += abc[Math.floor(rand() * abc.length)];
  return s;
}
export const PLEDGE_CODE_RE = /\bCK-[A-HJKMNP-Z2-9]{4}\b/i;
