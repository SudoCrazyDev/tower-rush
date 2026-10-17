/**
 * Trophy leagues. A player's league is the highest one whose trophy gate they're at or
 * above, so losing trophies can drop them back down. Reaching a league for the first
 * time pays its promotion reward once (the server grants it when a battle ends).
 *
 * v2.9: each league sets its own trophy rules for solo runs. A run that reaches the league's
 * minWave gains trophies with no cap; a run that falls short loses them (up to maxLoss).
 * A society league (the Secret Society) is invite-only: it also needs gold and gems, is
 * joined by paying an entry fee and kept by paying monthly dues (see profile.ts).
 */
import type { Reward } from "./daily.ts";

/** An invite-only league: what it takes to be recruited, and what membership costs. */
export interface SocietyRules {
  /** Gold and gems a player must hold to be recruited; paid once when they accept. */
  entryCoins: number;
  entryGems: number;
  /** Dues taken every `duesDays` days; a player who can't pay loses their membership. */
  duesCoins: number;
  duesGems: number;
  duesDays: number;
}

export interface LeagueDef {
  id: string;
  name: string;
  /** Trophies needed to be in this league. */
  trophies: number;
  /** Badge colour ("#rrggbb"), used for text and when the icon art isn't available. */
  color: string;
  /** Icon in the league_ranks atlas (ui/league_<n>.webp). */
  icon: number;
  /** Paid once, the first time a player reaches the league. Leagues at 0 trophies pay nothing. */
  reward: Reward;
  /** Solo runs: the wave a run must reach to gain trophies; below it the run loses them. */
  minWave: number;
  /** Trophies gained per wave past minWave (on top of TROPHY_BASE). No cap. */
  gainPerWave: number;
  /** Trophies lost per wave short of minWave (on top of TROPHY_BASE). */
  lossPerWave: number;
  /** Most trophies one run can lose. */
  maxLoss: number;
  /** Set for an invite-only league (hidden as "???" until the player is a member). */
  society?: SocietyRules | null;
}

/** Trophies a run gets just for reaching minWave, and loses just for missing it. */
export const TROPHY_BASE = 5;

const L = (
  id: string,
  name: string,
  trophies: number,
  color: string,
  icon: number,
  [coins, gems, chest]: [number, number, string | null],
  [minWave, gainPerWave, lossPerWave, maxLoss]: [number, number, number, number],
  society: SocietyRules | null = null,
): LeagueDef => ({
  id,
  name,
  trophies,
  color,
  icon,
  reward: { coins, gems, chest },
  minWave,
  gainPerWave,
  lossPerWave,
  maxLoss,
  society,
});

export const DEFAULT_LEAGUES: LeagueDef[] = [
  L("bronze", "Bronze League", 0, "#d08a4e", 0, [0, 0, null], [5, 3, 1, 5]),
  L("silver", "Silver League", 500, "#c9d2e3", 1, [300, 20, null], [8, 3, 2, 12]),
  L("gold", "Gold League", 1200, "#ffd93b", 2, [600, 40, "wooden"], [12, 2, 3, 18]),
  L("platinum", "Platinum League", 2200, "#7fe0d8", 3, [1000, 60, "silver"], [16, 2, 3, 22]),
  L("diamond", "Diamond League", 3500, "#7fb8ff", 4, [1500, 100, "silver"], [20, 2, 4, 26]),
  L("master", "Master League", 5000, "#c48bff", 5, [2500, 150, "royal"], [25, 1, 4, 30]),
  L("champion", "Champion League", 7000, "#ff7a5c", 6, [4000, 250, "mythic"], [30, 1, 5, 35]),
  L("mythic", "Mythic League", 10000, "#ff5ca8", 7, [6000, 400, "mythic"], [36, 1, 6, 40]),
  L("immortal", "Immortal League", 15000, "#f5f0d0", 8, [10000, 600, "mythic"], [42, 1, 7, 45]),
  L("secret_society", "Secret Society League", 30000, "#d4af37", 9, [0, 0, null], [50, 1, 8, 50], {
    entryCoins: 5_000_000,
    entryGems: 10_000,
    duesCoins: 30_000,
    duesGems: 1_000,
    duesDays: 30,
  }),
];

/** Live table: replaced in place when a config is applied (see config.ts). */
export const LEAGUES: LeagueDef[] = structuredClone(DEFAULT_LEAGUES);

/** Badge slice shown for a society league the player hasn't joined ("???"). */
export const MYSTERY_ICON = 10;

/** Leagues from lowest to highest gate (admins may list them in any order). */
export const leaguesByTrophies = (list = LEAGUES) => [...list].sort((a, b) => a.trophies - b.trophies);

/** A player as far as leagues care: trophies, and the society league they belong to (if any). */
export interface LeagueStanding {
  trophies: number;
  society?: { league: string } | null;
}

/** Whether this player counts as in league `l` once they have its trophies. */
const open = (l: LeagueDef, member: string | null | undefined) => !l.society || member === l.id;

/** The league a trophy count is in (the lowest league if it's below every gate). Society leagues need membership. */
export function leagueFor(trophies: number, list = LEAGUES, member: string | null = null): LeagueDef {
  const sorted = leaguesByTrophies(list);
  let best = sorted[0];
  for (const l of sorted) if (l.trophies <= trophies && open(l, member)) best = l;
  return best;
}

/** A player's league. */
export const playerLeague = (p: LeagueStanding, list = LEAGUES) => leagueFor(p.trophies, list, p.society?.league ?? null);

/** The next public league up, or null at the top (society leagues are never shown as "next"). */
export const nextLeague = (trophies: number) => leaguesByTrophies().find((l) => l.trophies > trophies && !l.society) ?? null;

/** Leagues at or below this trophy count whose promotion reward hasn't been paid yet. */
export function unpaidLeagues(trophies: number, paid: string[], member: string | null = null) {
  return leaguesByTrophies().filter((l) => l.trophies > 0 && l.trophies <= trophies && !paid.includes(l.id) && open(l, member));
}

/** Trophy change for a solo run that reached `wave`, under its league's rules. */
export function runTrophies(wave: number, l: LeagueDef) {
  if (wave >= l.minWave) return TROPHY_BASE + (wave - l.minWave) * l.gainPerWave;
  return -Math.min(l.maxLoss, TROPHY_BASE + (l.minWave - wave) * l.lossPerWave);
}

/** The society league a player could be recruited into right now (meets every requirement), or null. */
export function societyInvite(p: LeagueStanding & { coins: number; gems: number }) {
  if (p.society) return null;
  return leaguesByTrophies().find((l) => l.society && p.trophies >= l.trophies && p.coins >= l.society.entryCoins && p.gems >= l.society.entryGems) ?? null;
}
