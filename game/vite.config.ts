import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5173,
    // The game's data tables live in ../shared.
    fs: { allow: [".."] },
    proxy: { "/api": "http://localhost:8787" },
  },
  build: { chunkSizeWarningLimit: 2000 },
});
