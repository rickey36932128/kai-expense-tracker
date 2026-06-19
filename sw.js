const CACHE_NAME = "kai-expense-tracker-v33";
const INDEX_URL = "./index.html?v=32";
const THEME_URL = "./theme-v31.css?v=32";
const ASSETS = [
  INDEX_URL,
  "./styles.css?v=29",
  THEME_URL,
  "./script.js?v=29",
  "./manifest.webmanifest?v=29",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("kai-expense-tracker-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(loadAppShell());
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && requestUrl.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

async function loadAppShell() {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(INDEX_URL, { cache: "reload" });
    if (!response.ok) throw new Error("Index unavailable");
    cache.put(INDEX_URL, response.clone());
    return response;
  } catch {
    return (await cache.match(INDEX_URL)) || Response.error();
  }
}
