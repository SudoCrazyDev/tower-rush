/**
 * Trophy leagues. A player's league is the highest one whose trophy gate they're at or
 * above, so losing trophies can drop them back down. Reaching a league for the first
 * time pays its promotion reward once (the server grants it when a battle ends).
 */
import type { Reward } from "./daily.ts";

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
}

const L = (id: string, name: string, trophies: number, color: string, icon: number, coins: number, gems: number, chest: string | null = null): LeagueDef => ({
  id,
  name,
  trophies,
  color,
  icon,
  reward: { coins, gems, chest },
});

export const DEFAULT_LEAGUES: LeagueDef[] = [
  L("bronze", "Bronze League", 0, "#d08a4e", 0, 0, 0),
  L("silver", "Silver League", 300, "#c9d2e3", 1, 300, 20),
  L("gold", "Gold League", 800, "#ffd93b", 2, 600, 40, "wooden"),
  L("platinum", "Platinum League", 1600, "#7fe0d8", 3, 1000, 60, "silver"),
  L("diamond", "Diamond League", 2600, "#7fb8ff", 4, 1500, 100, "silver"),
  L("master", "Master League", 3800, "#c48bff", 5, 2500, 150, "royal"),
  L("champion", "Champion League", 5000, "#ff7a5c", 6, 4000, 250, "mythic"),
];

/** Live table: replaced in place when a config is applied (see config.ts). */
export const LEAGUES: LeagueDef[] = structuredClone(DEFAULT_LEAGUES);

/** Leagues from lowest to highest gate (admins may list them in any order). */
export const leaguesByTrophies = (list = LEAGUES) => [...list].sort((a, b) => a.trophies - b.trophies);

/** The league a trophy count is in (the lowest league if it's below every gate). */
export function leagueFor(trophies: number, list = LEAGUES): LeagueDef {
  const sorted = leaguesByTrophies(list);
  let best = sorted[0];
  for (const l of sorted) if (l.trophies <= trophies) best = l;
  return best;
}

/** The next league up, or null at the top. */
export const nextLeague = (trophies: number) => leaguesByTrophies().find((l) => l.trophies > trophies) ?? null;

/** Leagues at or below this trophy count whose promotion reward hasn't been paid yet. */
export function unpaidLeagues(trophies: number, paid: string[]) {
  return leaguesByTrophies().filter((l) => l.trophies > 0 && l.trophies <= trophies && !paid.includes(l.id));
}
