/** Inbox storage: messages from admins, and each player's read/claimed/deleted state. */
import { all, one, run } from "./db.ts";
import type { UserRow } from "./users.ts";
import { INBOX_SIZE, type MailMessage } from "../../shared/mail.ts";
import type { Reward } from "../../shared/daily.ts";

interface Row {
  id: number;
  title: string;
  body: string;
  reward: string | null;
  created_at: number;
  expires_at: number | null;
  read_at: number | null;
  claimed_at: number | null;
}

/**
 * Messages a player can see: sent to them, or to everyone since they joined (or to
 * everyone including later players), not expired and not deleted by them.
 * ?1 = player id, ?2 = when they joined, ?3 = now.
 */
const VISIBLE = `
  FROM mail m LEFT JOIN mail_state s ON s.mail_id = m.id AND s.user_id = ?1
  WHERE (m.user_id = ?1 OR (m.user_id IS NULL AND (m.new_players = 1 OR m.created_at >= ?2)))
    AND (m.expires_at IS NULL OR m.expires_at > ?3)
    AND s.deleted_at IS NULL`;
const COLUMNS = "m.id, m.title, m.body, m.reward, m.created_at, m.expires_at, s.read_at, s.claimed_at";

const toMessage = (r: Row): MailMessage => ({
  id: r.id,
  title: r.title,
  body: r.body,
  reward: r.reward ? (JSON.parse(r.reward) as Reward) : null,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  read: r.read_at !== null,
  claimed: r.claimed_at !== null,
});

export async function inbox(db: D1Database, u: UserRow): Promise<MailMessage[]> {
  const rows = await all<Row>(db, `SELECT ${COLUMNS} ${VISIBLE} ORDER BY m.id DESC LIMIT ${INBOX_SIZE}`, u.id, u.created_at, Date.now());
  return rows.map(toMessage);
}

/** One message, if the player can see it. */
export async function message(db: D1Database, u: UserRow, id: number): Promise<MailMessage | undefined> {
  const r = await one<Row>(db, `SELECT ${COLUMNS} ${VISIBLE} AND m.id = ?4`, u.id, u.created_at, Date.now(), id);
  return r ? toMessage(r) : undefined;
}

/**
 * Record that the player read, claimed or deleted a message. Only the first time counts:
 * returns false when it was already recorded (so a gift can't be claimed twice).
 */
export async function mark(db: D1Database, userId: number, mailId: number, what: "read_at" | "claimed_at" | "deleted_at") {
  const [, r] = await db.batch([
    db.prepare("INSERT OR IGNORE INTO mail_state (mail_id, user_id) VALUES (?, ?)").bind(mailId, userId),
    db.prepare(`UPDATE mail_state SET ${what} = ? WHERE mail_id = ? AND user_id = ? AND ${what} IS NULL`).bind(Date.now(), mailId, userId),
  ]);
  return r.meta.changes > 0;
}

/** Undo a claim (used when the gift couldn't be saved). */
export const unclaim = (db: D1Database, userId: number, mailId: number) =>
  run(db, "UPDATE mail_state SET claimed_at = NULL WHERE mail_id = ? AND user_id = ?", mailId, userId);
