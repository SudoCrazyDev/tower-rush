import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Served by the game server under /admin in production.
  base: "/admin/",
  server: {
    port: 5174,
    fs: { allow: [".."] },
    proxy: { "/api": "http://localhost:8787", "/assets": "http://localhost:8787" },
  },
});
