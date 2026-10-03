import { defineConfig } from "vite";

/** Production art comes from the R2 bucket; ASSET_BASE overrides it (e.g. "assets/" to self-host). */
const R2_ASSETS = "https://assets.depedtoolkit.com/";

export default defineConfig(({ command }) => ({
  base: "./",
  define: { __ASSET_BASE__: JSON.stringify(process.env.ASSET_BASE ?? (command === "build" ? R2_ASSETS : "assets/")) },
  server: {
    port: 5173,
    // The game's data tables live in ../shared.
    fs: { allow: [".."] },
    proxy: { "/api": "http://localhost:8787" },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    // public/ only holds the art (250 MB), which production loads from R2 instead.
    copyPublicDir: process.env.ASSET_BASE === "assets/",
  },
}));
