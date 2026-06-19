const CACHE_NAME = "kai-expense-tracker-v30";
const ASSETS = [
  "./",
  "./index.html?v=29",
  "./styles.css?v=29",
  "./theme-v30.css?v=30",
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
    event.respondWith(fetch(event.request).catch(() => caches.match("./index.html?v=29")));
    return;
  }

  if (requestUrl.origin === self.location.origin && requestUrl.pathname.endsWith("/styles.css")) {
    event.respondWith(loadThemedStyles(event.request));
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

async function loadThemedStyles(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const [baseResponse, themeResponse] = await Promise.all([
      fetch(request),
      fetch("./theme-v30.css?v=30"),
    ]);

    if (!baseResponse.ok) throw new Error("Base stylesheet unavailable");

    const baseCss = await baseResponse.text();
    const themeCss = themeResponse.ok ? await themeResponse.text() : "";
    const themedResponse = new Response(`${baseCss}\n\n${themeCss}`, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });

    cache.put(request, themedResponse.clone());
    return themedResponse;
  } catch {
    const cached = await cache.match(request);
    return cached || caches.match("./styles.css?v=29") || Response.error();
  }
}
