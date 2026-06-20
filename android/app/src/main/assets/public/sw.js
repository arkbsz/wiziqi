const CACHE_NAME = "gomoku-v6";
const ASSETS = [
  "/",
  "/index.html",
  "/game.js?v=4",
  "/manifest.json",
  "/icon.svg",
  "/cover.png",
  "/cover_anim.gif",
  "/win.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k); }))
    )
  );
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
