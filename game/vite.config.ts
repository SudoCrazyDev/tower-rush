import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

/** Production art comes from the R2 bucket; ASSET_BASE overrides it (e.g. "assets/" to self-host). */
const R2_ASSETS = "https://assets.crownnkeep.com/";
const version: string = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

/** Where the API lives: "" in dev (the proxy below), else the API Worker's host. */
const apiBase = (command: string, mode: string) =>
  command === "serve" ? "" : mode === "staging" ? "https://staging-api.crownnkeep.com" : "https://api.crownnkeep.com";

export default defineConfig(({ command, mode }) => ({
  base: "./",
  define: {
    __ASSET_BASE__: JSON.stringify(process.env.ASSET_BASE ?? (command === "build" ? R2_ASSETS : "assets/")),
    __API_BASE__: JSON.stringify(apiBase(command, mode)),
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 5173,
    // The game's data tables live in ../shared.
    fs: { allow: [".."] },
    // ws: PvP queue and match sockets.
    proxy: { "/api": { target: "http://localhost:8787", ws: true } },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    // public/ only holds the art (250 MB), which production loads from R2 instead.
    copyPublicDir: process.env.ASSET_BASE === "assets/",
  },
}));
