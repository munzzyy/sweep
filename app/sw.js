// Sweep service worker: offline shell only. Checkup results never exist
// anywhere a cache could see.

const VERSION = "sweep-v0.3.0";

// Relative to this script's own URL, which sits at the app root wherever
// that root is served from (a domain, or a subpath like a GitHub Pages
// project site). Resolving against self.registration.scope instead of a
// hardcoded "/" is what makes that work.
const PRECACHE = [
  "index.html",
  "css/app.css",
  "js/main.js",
  "js/analyze.js",
  "js/i18n.js",
  "js/strings-es.js",
  "js/quickexit.js",
  "data/indicators.json",
  "icons/sweep.svg",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "privacy.html",
  "manifest.webmanifest",
];

const SCOPE = new URL(self.registration.scope);
const abs = (p) => new URL(p, SCOPE).href;
const pathOf = (p) => new URL(p, SCOPE).pathname;
const HOME_PATH = pathOf("index.html");
const PRIVACY_PATH = pathOf("privacy.html");

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(PRECACHE);
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== SCOPE.origin) return;

  if (event.request.mode === "navigate") {
    const shell =
      url.pathname === SCOPE.pathname || url.pathname === HOME_PATH
        ? abs("index.html")
        : url.pathname === PRIVACY_PATH || url.pathname === pathOf("privacy")
          ? abs("privacy.html")
          : null;
    if (shell) {
      event.respondWith(
        (async () => {
          const cached = await caches.match(shell, { cacheName: VERSION });
          return cached || fetch(event.request);
        })()
      );
    }
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request, { cacheName: VERSION });
      if (cached) return cached;
      const res = await fetch(event.request);
      if (res && res.ok && PRECACHE.some((p) => pathOf(p) === url.pathname)) {
        const cache = await caches.open(VERSION);
        cache.put(event.request, res.clone());
      }
      return res;
    })()
  );
});
