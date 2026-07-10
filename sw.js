const CACHE_NAME = "kai-expense-tracker-v52-home-layout-density";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./ios-finance.css",
  "./home-reorder.css",
  "./home-dashboard-v48.css",
  "./mascot-settings.css",
  "./mascot-image-home.js",
  "./mascot-image-records.js",
  "./mascot-image-assets.js",
  "./mascot-image-split.js",
  "./mascot-image-debts.js",
  "./mascot-settings.js",
  "./script.js",
  "./assets/quick-lunch.png",
  "./assets/quick-drink.png",
  "./assets/quick-fuel.png",
  "./assets/quick-shopping.png",
  "./assets/ui/calendar-clock.svg",
  "./assets/ui/trending-up.svg",
  "./assets/ui/chevron-right.svg",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("kai-expense-tracker-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put("./", response.clone());
              cache.put("./index.html", response.clone());
            });
          }
          return response;
        })
        .catch(() => caches.match("./index.html").then((response) => response || caches.match("./")))
    );
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && new URL(event.request.url).origin === self.location.origin) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response || caches.match(event.request, { ignoreSearch: true })))
  );
});
