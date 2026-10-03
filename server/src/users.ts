import { db } from "./db.ts";
import { newProfile, ownsHero, type Profile } from "../../shared/profile.ts";
import { UNIT_BY_ID } from "../../shared/units.ts";
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
  created_at: number;
  last_seen_at: number;
}

export function getUser(id: number) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function getUserByName(username: string) {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
}

/** Parse a stored profile, repairing anything a config change may have invalidated. */
export function readProfile(row: UserRow): Profile {
  const p = { ...newProfile(), ...JSON.parse(row.profile) } as Profile;
  // Cards/deck entries for units that were removed from the config.
  for (const id of Object.keys(p.cards)) if (!UNIT_BY_ID[id]) delete p.cards[id];
  const valid = p.deck.filter((id) => p.cards[id] && UNIT_BY_ID[id]?.enabled);
  if (valid.length !== 5) {
    const fill = Object.keys(p.cards).filter((id) => UNIT_BY_ID[id]?.enabled && !valid.includes(id));
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
  return p;
}

export function writeProfile(id: number, p: Profile) {
  db.prepare("UPDATE users SET profile = ? WHERE id = ?").run(JSON.stringify(p), id);
}

export function touch(id: number) {
  const now = Date.now();
  db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").run(now, id);
  db.prepare("INSERT OR IGNORE INTO activity (user_id, day) VALUES (?, ?)").run(id, utcDay(now));
}

export function createUser(displayName: string) {
  const now = Date.now();
  const r = db
    .prepare("INSERT INTO users (display_name, is_guest, profile, created_at, last_seen_at) VALUES (?, 1, ?, ?, ?)")
    .run(displayName, JSON.stringify(newProfile()), now, now);
  return getUser(Number(r.lastInsertRowid))!;
}

export function publicUser(u: UserRow) {
  return { id: u.id, name: u.display_name, username: u.username, isGuest: !!u.is_guest };
}

export const NAME_RE = /^[\p{L}\p{N} _.-]{3,20}$/u;
export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,20}$/;
