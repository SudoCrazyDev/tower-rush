/**
 * Crown & Keep API on Cloudflare Workers (api.crownnkeep.com). The game, admin panel and
 * website are separate static Workers; see wrangler.jsonc and RELEASING.md.
 */
import { Hono } from "hono";
import { ensureConfig } from "./config-store.ts";
import { HttpError, type AppEnv } from "./http.ts";
import { player } from "./player.ts";
import { admin } from "./admin.ts";
import { pvp } from "./pvp.ts";
import { play } from "./play.ts";
import { funding } from "./funding.ts";
import { corsMiddleware, versionGate } from "./gate.ts";

export { Matchmaker, MatchRoom } from "./pvp.ts";

const app = new Hono<AppEnv>();

// Old bookmarks (the API used to serve the game at /) go to the game's own host.
app.all("*", (c, next) => {
  if (c.req.path.startsWith("/api/")) return next();
  return c.redirect(c.env.GAME_URL ?? "https://game.crownnkeep.com/", 301);
});

app.use("/api/*", corsMiddleware);
app.use("/api/*", versionGate);

// The shared game tables must hold the live config before any route uses them.
app.use("/api/*", async (c, next) => {
  await ensureConfig(c.env.DB);
  await next();
});

app.route("/api/admin", admin);
app.route("/api/pvp", pvp);
app.route("/api/play", play);
app.route("/api/funding", funding);
app.route("/api", player);
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message, ...err.extra }, err.status);
  console.error(err);
  return c.json({ error: "Server error" }, 500);
});

export default app;
