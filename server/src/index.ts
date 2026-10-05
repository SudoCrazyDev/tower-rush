/**
 * Tower Rush API on Cloudflare Workers. The game and admin panel are static files served
 * by Workers static assets (see wrangler.jsonc); requests that aren't files land here.
 */
import { Hono } from "hono";
import { ensureConfig } from "./config-store.ts";
import { HttpError, type AppEnv } from "./http.ts";
import { player } from "./player.ts";
import { admin } from "./admin.ts";
import { pvp } from "./pvp.ts";
import { play } from "./play.ts";

export { Matchmaker, MatchRoom } from "./pvp.ts";

const app = new Hono<AppEnv>();

// The shared game tables must hold the live config before any route uses them.
app.use("/api/*", async (c, next) => {
  await ensureConfig(c.env.DB);
  await next();
});

app.route("/api/admin", admin);
app.route("/api/pvp", pvp);
app.route("/api/play", play);
app.route("/api", player);
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message, ...err.extra }, err.status);
  console.error(err);
  return c.json({ error: "Server error" }, 500);
});

export default app;
