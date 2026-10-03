/** Inbox storage: messages from admins, and each player's read/claimed/deleted state. */
import { db } from "./db.ts";
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
 */
const VISIBLE = `
  FROM mail m LEFT JOIN mail_state s ON s.mail_id = m.id AND s.user_id = :user
  WHERE (m.user_id = :user OR (m.user_id IS NULL AND (m.new_players = 1 OR m.created_at >= :joined)))
    AND (m.expires_at IS NULL OR m.expires_at > :now)
    AND s.deleted_at IS NULL`;

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

const params = (u: UserRow) => ({ user: u.id, joined: u.created_at, now: Date.now() });

export function inbox(u: UserRow): MailMessage[] {
  const rows = db
    .prepare(`SELECT m.id, m.title, m.body, m.reward, m.created_at, m.expires_at, s.read_at, s.claimed_at ${VISIBLE} ORDER BY m.id DESC LIMIT ${INBOX_SIZE}`)
    .all(params(u)) as unknown as Row[];
  return rows.map(toMessage);
}

/** One message, if the player can see it. */
export function message(u: UserRow, id: number): MailMessage | undefined {
  const r = db
    .prepare(`SELECT m.id, m.title, m.body, m.reward, m.created_at, m.expires_at, s.read_at, s.claimed_at ${VISIBLE} AND m.id = :id`)
    .get({ ...params(u), id }) as unknown as Row | undefined;
  return r && toMessage(r);
}

/** Record that the player read, claimed or deleted a message (the first time only). */
export function mark(userId: number, mailId: number, what: "read_at" | "claimed_at" | "deleted_at") {
  db.prepare("INSERT OR IGNORE INTO mail_state (mail_id, user_id) VALUES (?, ?)").run(mailId, userId);
  db.prepare(`UPDATE mail_state SET ${what} = COALESCE(${what}, ?) WHERE mail_id = ? AND user_id = ?`).run(Date.now(), mailId, userId);
}
