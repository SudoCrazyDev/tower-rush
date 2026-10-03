/**
 * Numbers for the admin Analytics page: daily players and battles, sign-up cohort retention,
 * and battle results per arena per day. Days are UTC, like the game's daily reset.
 */
import { all } from "./db.ts";
import { utcDay } from "../../shared/daily.ts";

/** Days after sign-up that retention is measured on. */
export const RETENTION_DAYS = [1, 3, 7, 14, 30] as const;

const DAY = 86400_000;
const dayOf = (col: string) => `date(${col} / 1000, 'unixepoch')`;

export async function analytics(db: D1Database, days: number, now = Date.now()) {
  const today = utcDay(now);
  const fromMs = Date.parse(today) - (days - 1) * DAY;
  const from = utcDay(fromMs);
  const dayList = Array.from({ length: days }, (_, i) => utcDay(fromMs + i * DAY));

  const byDay = async <T extends { d: string }>(sql: string, ...args: (string | number)[]) =>
    new Map((await all<T>(db, sql, ...args)).map((r) => [r.d, r]));
  const signup = dayOf("u.created_at");
  const [fresh, active, fights, arenas, back] = await Promise.all([
    byDay<{ d: string; n: number }>(`SELECT ${dayOf("created_at")} d, COUNT(*) n FROM users WHERE created_at >= ? GROUP BY d`, fromMs),
    byDay<{ d: string; n: number }>("SELECT day d, COUNT(*) n FROM activity WHERE day >= ? GROUP BY day", from),
    byDay<{ d: string; n: number; waves: number }>(
      `SELECT ${dayOf("finished_at")} d, COUNT(*) n, SUM(wave) waves FROM battles WHERE finished_at >= ? GROUP BY d`,
      fromMs,
    ),
    // Finished battles per arena per day; the page averages them into days or weeks.
    all<{ day: string; arena: string; battles: number; waveSum: number }>(
      db,
      `SELECT ${dayOf("finished_at")} AS day, arena, COUNT(*) AS battles, SUM(wave) AS waveSum
       FROM battles WHERE finished_at >= ? GROUP BY day, arena ORDER BY day`,
      fromMs,
    ),
    // Players who signed up in the range, grouped by sign-up day, and on which later days they came back.
    all<{ d: string; after: number; n: number }>(
      db,
      `SELECT ${signup} AS d, CAST(julianday(a.day) - julianday(${signup}) AS INTEGER) AS after, COUNT(*) AS n
       FROM users u JOIN activity a ON a.user_id = u.id
       WHERE u.created_at >= ? AND a.day > ${signup}
       GROUP BY d, after`,
      fromMs,
    ),
  ]);
  const daily = dayList.map((d) => ({
    day: d,
    newPlayers: fresh.get(d)?.n ?? 0,
    activePlayers: active.get(d)?.n ?? 0,
    battles: fights.get(d)?.n ?? 0,
    avgWave: fights.get(d)?.n ? +(fights.get(d)!.waves / fights.get(d)!.n).toFixed(2) : null,
  }));

  const returned = new Map(back.map((r) => [`${r.d}|${r.after}`, r.n]));
  const age = (d: string) => Math.round((Date.parse(today) - Date.parse(d)) / DAY);
  const cohorts = dayList
    .filter((d) => fresh.has(d))
    .map((d) => {
      const size = fresh.get(d)!.n;
      // null: the cohort isn't that old yet.
      const retained = RETENTION_DAYS.map((n) => (age(d) >= n ? returned.get(`${d}|${n}`) ?? 0 : null));
      return { day: d, size, retained };
    })
    .reverse();
  // Overall rate per day-N, over the cohorts old enough to have one.
  const overall = RETENTION_DAYS.map((_, i) => {
    const old = cohorts.filter((c) => c.retained[i] !== null);
    const size = old.reduce((s, c) => s + c.size, 0);
    return { players: size, rate: size ? old.reduce((s, c) => s + c.retained[i]!, 0) / size : null };
  });

  return { from, to: today, days: RETENTION_DAYS, daily, arenas, cohorts, overall };
}
