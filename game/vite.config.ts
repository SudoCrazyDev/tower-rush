import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

/** Production art comes from the R2 bucket; ASSET_BASE overrides it (e.g. "assets/" to self-host). */
const R2_ASSETS = "https://assets.crownnkeep.com/";
const version: string = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

/** Where the API lives: "" in dev (the proxy below), else the API Worker's host. */
const apiBase = (command: string, mode: string) =>
  command === "serve" ? "" : mode === "staging" ? "https://staging-api.crownnkeep.com" : "https://api.crownnkeep.com";

const NAME = "Crown & Keep: Tower Defense";
const NAVY = "#14183a";

/**
 * Installable app (build only): adds the web manifest, its icons and the service worker
 * (pwa/sw.js, given this build's file list to precache) next to index.html.
 */
function pwa(): Plugin {
  const icon = (name: string) => readFileSync(new URL(`./src/brand/${name}`, import.meta.url));
  return {
    name: "crown-pwa",
    apply: "build",
    transformIndexHtml: () => [{ tag: "link", attrs: { rel: "manifest", href: "./manifest.webmanifest" }, injectTo: "head" }],
    generateBundle(_, bundle) {
      const icons = { "icons/icon-192.png": "icon-192.png", "icons/icon-512.png": "icon-512.png", "icons/icon-maskable-512.png": "icon-maskable-512.png" };
      for (const [fileName, name] of Object.entries(icons)) this.emitFile({ type: "asset", fileName, source: icon(name) });
      const manifest = {
        id: "./",
        name: NAME,
        short_name: "Crown & Keep",
        description: "Merge heroes, hold the keep and defend the crown.",
        start_url: "./",
        scope: "./",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone"],
        orientation: "portrait",
        background_color: "#0d1030",
        theme_color: NAVY,
        categories: ["games"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      };
      this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: JSON.stringify(manifest, null, 2) });
      const shell = [...new Set([...Object.keys(bundle).filter((f) => !f.endsWith(".html") && !f.endsWith(".map")), ...Object.keys(icons), "manifest.webmanifest"])];
      const sw = readFileSync(new URL("./pwa/sw.js", import.meta.url), "utf8")
        // The file hashes too, so a rebuild under the same version still swaps the cache.
        .replace('"__VERSION__"', JSON.stringify(`${version}-${createHash("sha1").update(shell.join()).digest("hex").slice(0, 8)}`))
        .replace("__SHELL__", JSON.stringify(shell.map((f) => `./${f}`)));
      this.emitFile({ type: "asset", fileName: "sw.js", source: sw });
    },
  };
}

export default defineConfig(({ command, mode }) => ({
  base: "./",
  plugins: [pwa()],
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
