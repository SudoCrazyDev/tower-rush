import { one, run } from "./db.ts";
import { newProfile, ownsHero, type Profile } from "../../shared/profile.ts";
import { UNIT_BY_ID, deckable } from "../../shared/units.ts";
import { newStoryProgress } from "../../shared/stories.ts";
import { HEROES, HERO_BY_ID } from "../../shared/heroes.ts";
import { questById, utcDay } from "../../shared/daily.ts";

export interface UserRow {
  id: number;
  username: string | null;
  password_hash: string | null;
  display_name: string;
  is_guest: number;
  banned: number;
  ban_reason: string | null;
  profile: string;
  rev: number;
  created_at: number;
  last_seen_at: number;
}

export const getUser = (db: D1Database, id: number) => one<UserRow>(db, "SELECT * FROM users WHERE id = ?", id);

export const getUserByName = (db: D1Database, username: string) => one<UserRow>(db, "SELECT * FROM users WHERE username = ?", username);

/** Parse a stored profile, repairing anything a config change may have invalidated. */
export function readProfile(row: UserRow): Profile {
  const p = { ...newProfile(), ...JSON.parse(row.profile) } as Profile;
  // Cards/deck entries for units that were removed from the config.
  for (const id of Object.keys(p.cards)) if (!UNIT_BY_ID[id]) delete p.cards[id];
  const valid = p.deck.filter((id) => p.cards[id] && deckable(UNIT_BY_ID[id]));
  if (valid.length !== 5) {
    const fill = Object.keys(p.cards).filter((id) => deckable(UNIT_BY_ID[id]) && !valid.includes(id));
    p.deck = [...valid, ...fill].slice(0, 5);
  }
  // Heroes removed from the config, or a selected hero that was disabled.
  p.heroes = p.heroes.filter((id) => HERO_BY_ID[id]);
  if (p.hero && (!ownsHero(p, p.hero) || !HERO_BY_ID[p.hero].enabled)) {
    p.hero = HEROES.find((h) => h.enabled && h.price === 0)?.id ?? null;
  }
  // Quests removed from the config (or with a lowered target) since they were handed out.
  p.daily.quests = p.daily.quests.filter((s) => questById(s.id));
  for (const s of p.daily.quests) s.progress = Math.min(s.progress, questById(s.id)!.target);
  p.story = { ...newStoryProgress(), ...p.story };
  return p;
}

/**
 * Save a profile read from `u`. Requests run concurrently on Workers, so a save only lands
 * if nobody else saved since `u` was read (`rev` unchanged); returns false when it didn't.
 */
export async function writeProfile(db: D1Database, u: UserRow, p: Profile) {
  const json = JSON.stringify(p);
  const r = await run(db, "UPDATE users SET profile = ?, rev = rev + 1 WHERE id = ? AND rev = ?", json, u.id, u.rev);
  if (!r.meta.changes) return false;
  u.rev++;
  u.profile = json;
  return true;
}

/** Record that the player was around: last seen (at most every few minutes) and today's activity row. */
export async function touch(db: D1Database, u: UserRow) {
  const now = Date.now();
  const newDay = utcDay(u.last_seen_at) !== utcDay(now);
  if (!newDay && now - u.last_seen_at < 5 * 60_000) return;
  const stmts = [db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").bind(now, u.id)];
  if (newDay) stmts.push(db.prepare("INSERT OR IGNORE INTO activity (user_id, day) VALUES (?, ?)").bind(u.id, utcDay(now)));
  await db.batch(stmts);
  u.last_seen_at = now;
}

export async function createUser(db: D1Database, displayName: string) {
  const now = Date.now();
  const r = await run(
    db,
    "INSERT INTO users (display_name, is_guest, profile, created_at, last_seen_at) VALUES (?, 1, ?, ?, ?)",
    displayName,
    JSON.stringify(newProfile()),
    now,
    now,
  );
  const id = r.meta.last_row_id;
  await run(db, "INSERT OR IGNORE INTO activity (user_id, day) VALUES (?, ?)", id, utcDay(now));
  return (await getUser(db, id))!;
}

export function publicUser(u: UserRow) {
  return { id: u.id, name: u.display_name, username: u.username, isGuest: !!u.is_guest };
}

export const NAME_RE = /^[\p{L}\p{N} _.-]{3,20}$/u;
export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,20}$/;
