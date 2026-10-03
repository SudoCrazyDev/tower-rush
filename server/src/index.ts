import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { NextFunction, Request, Response } from "express";

try {
  process.loadEnvFile(join(import.meta.dirname, "..", ".env"));
} catch {
  // .env is optional
}

const { default: express } = await import("express");
const { DATA_DIR } = await import("./db.ts");
const { initConfig } = await import("./config-store.ts");
const { player } = await import("./player.ts");
const { admin, ensureAdmin } = await import("./admin.ts");

initConfig();
const credsFile = join(DATA_DIR, "admin-credentials.txt");
const seeded = ensureAdmin((text) => writeFileSync(credsFile, text, { mode: 0o600 }));
if (seeded) {
  console.log(
    seeded.generated
      ? `Created admin "${seeded.username}". Its generated password is in ${credsFile}`
      : `Created admin "${seeded.username}" from ADMIN_PASSWORD.`,
  );
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");
app.use(express.json({ limit: "2mb" }));

app.use("/api/admin", admin);
app.use("/api", player);
app.use("/api", (_req, res) => void res.status(404).json({ error: "Not found" }));

// Game art (the admin panel shows portraits from here).
const ROOT = join(import.meta.dirname, "..", "..");
app.use("/assets", express.static(join(ROOT, "game", "public", "assets"), { maxAge: "1d" }));

// Production: serve the built game at / and the admin panel at /admin.
const adminDist = join(ROOT, "admin", "dist");
const gameDist = join(ROOT, "game", "dist");
if (existsSync(adminDist)) {
  app.use("/admin", express.static(adminDist));
  app.get(/^\/admin(\/.*)?$/, (_req, res) => res.sendFile(join(adminDist, "index.html")));
}
if (existsSync(gameDist)) app.use("/", express.static(gameDist));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`Tower Rush server on http://localhost:${port}`));
