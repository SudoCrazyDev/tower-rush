// Crown & Keep service worker. vite.config.ts fills in VERSION and SHELL at build time.
// - The page (navigations): network first, so a deploy reaches players on their next load;
//   the cached copy only answers when offline.
// - Hashed build files (js/css/icons): cache first; precached on install.
// - Art from the R2 bucket and Google Fonts: stale-while-revalidate, so the game boots from
//   disk and picks up re-uploaded art on the following load (like the day-long HTTP cache).
// - The API, the fresh asset index (?t=), videos and anything not GET: straight to the network.
const VERSION = "__VERSION__";
const SHELL = __SHELL__;
const SHELL_CACHE = `ck-shell-${VERSION}`;
const ART_CACHE = "ck-art";
const PAGE = new URL("./", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.addAll([PAGE, ...SHELL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ck-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const ART_HOSTS = ["assets.crownnkeep.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(PAGE, copy));
          }
          return res;
        })
        .catch(() => caches.match(PAGE).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api") || url.pathname.endsWith("/sw.js")) return;
    event.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)));
    return;
  }

  if (ART_HOSTS.includes(url.hostname) && !url.searchParams.has("t") && !url.pathname.endsWith(".mp4")) {
    event.respondWith(staleWhileRevalidate(event, req));
  }
});

function staleWhileRevalidate(event, req) {
  return caches.open(ART_CACHE).then((cache) =>
    cache.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => {
        // Only whole, readable responses: no 206 ranges, no opaque no-CORS copies.
        if (res.status === 200 && res.type !== "opaque") cache.put(req, res.clone());
        return res;
      });
      if (hit) {
        event.waitUntil(fresh.catch(() => {}));
        return hit;
      }
      return fresh;
    }),
  );
}
