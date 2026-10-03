/** D1 helpers. The schema lives in ../migrations (applied with `wrangler d1 migrations apply`). */

type Arg = string | number | null;

/** First row, or null. */
export const one = <T>(db: D1Database, sql: string, ...args: Arg[]) => db.prepare(sql).bind(...args).first<T>();

export async function all<T>(db: D1Database, sql: string, ...args: Arg[]) {
  return (await db.prepare(sql).bind(...args).all<T>()).results;
}

export const run = (db: D1Database, sql: string, ...args: Arg[]) => db.prepare(sql).bind(...args).run();

/** `SELECT COUNT(*) n ...` style queries. */
export async function count(db: D1Database, sql: string, ...args: Arg[]) {
  return (await one<{ n: number }>(db, sql, ...args))?.n ?? 0;
}

export function audit(db: D1Database, adminId: number | null, action: string, target: string | null, details?: unknown) {
  return run(
    db,
    "INSERT INTO audit (admin_id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)",
    adminId,
    action,
    target,
    details === undefined ? null : JSON.stringify(details),
    Date.now(),
  );
}
