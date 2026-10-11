import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

/** Game art for portraits: the R2 bucket in production, the game's dev server in dev. */
const R2_ASSETS = "https://assets.crownnkeep.com/";
const version: string = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

// One admin app serves both environments: the API base is picked at runtime (src/env.ts).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Served from the root of manage.crownnkeep.com (routing is hash-based).
  base: "/",
  define: {
    __ASSET_BASE__: JSON.stringify(process.env.ASSET_BASE ?? (command === "build" ? R2_ASSETS : "/assets/")),
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 5174,
    fs: { allow: [".."] },
    proxy: { "/api": "http://localhost:8787", "/assets": "http://localhost:5173" },
  },
}));
