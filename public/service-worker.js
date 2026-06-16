const CACHE_NAME = "nashama-registration-v14";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/admin.html",
  "/styles.css",
  "/app.js",
  "/admin.js",
  "/vendor/qrcode.js",
  "/vendor/jspdf.umd.min.js",
  "/firebase-config.js",
  "/manifest.webmanifest",
  "/admin.webmanifest",
  "/assets/nashama-logo.jpg",
  "/assets/nashama-hero.jpg",
  "/assets/wristband.jpg",
  "/assets/vip-pass.jpg",
  "/assets/ticket-preview.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
  );
});
