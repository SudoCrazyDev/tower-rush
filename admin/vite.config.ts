import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Game art for portraits: the R2 bucket in production, the game's dev server in dev. */
const R2_ASSETS = "https://assets.depedtoolkit.com/";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Served under /admin in production.
  base: "/admin/",
  define: { __ASSET_BASE__: JSON.stringify(process.env.ASSET_BASE ?? (command === "build" ? R2_ASSETS : "/assets/")) },
  server: {
    port: 5174,
    fs: { allow: [".."] },
    proxy: { "/api": "http://localhost:8787", "/assets": "http://localhost:5173" },
  },
}));
