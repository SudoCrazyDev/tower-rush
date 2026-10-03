/**
 * Player inbox: messages an admin sends to one player or to everyone, optionally with a
 * gift (gold, gems, a chest) the player claims once. Stored by the server, not the config.
 */
import type { Reward } from "./daily.ts";
import { CHESTS } from "./economy.ts";

export const MAIL_TITLE_MAX = 60;
export const MAIL_BODY_MAX = 1000;
/** Most messages a player's inbox lists (newest first). */
export const INBOX_SIZE = 50;

/** A message as the player sees it. */
export interface MailMessage {
  id: number;
  title: string;
  body: string;
  /** The gift, or null for a plain announcement. */
  reward: Reward | null;
  createdAt: number;
  /** After this the message (and an unclaimed gift) is gone; null = never. */
  expiresAt: number | null;
  read: boolean;
  claimed: boolean;
}

/** Still needs the player: unread, or a gift not yet claimed. */
export const needsAttention = (m: MailMessage) => !m.read || (!!m.reward && !m.claimed);

/** A gift with nothing in it counts as no gift. */
export const emptyReward = (r: Reward) => !r.coins && !r.gems && !r.chest;

/** What's wrong with a message an admin is about to send (empty list if it's fine). */
export function mailProblems(title: string, body: string, reward: Reward | null) {
  const errs: string[] = [];
  if (!title.trim()) errs.push("The title is empty");
  if (title.length > MAIL_TITLE_MAX) errs.push(`The title is longer than ${MAIL_TITLE_MAX} characters`);
  if (body.length > MAIL_BODY_MAX) errs.push(`The message is longer than ${MAIL_BODY_MAX} characters`);
  if (reward) {
    for (const k of ["coins", "gems"] as const)
      if (!Number.isInteger(reward[k]) || reward[k] < 0) errs.push(`Gift ${k === "coins" ? "gold" : "gems"} must be a whole number ≥ 0`);
    if (reward.chest !== null && !CHESTS.some((c) => c.id === reward.chest)) errs.push(`Unknown chest "${reward.chest}"`);
  }
  return errs;
}
