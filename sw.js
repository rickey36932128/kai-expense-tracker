const CACHE_NAME = "kai-expense-tracker-v31-mascot-settings-r2";
const ASSETS = [
  "./",
  "./index.html?v=31-mascot-settings",
  "./styles.css?v=31-mascot-settings",
  "./ios-finance.css?v=31-mascot-settings",
  "./mascot-settings.css?v=31-mascot-settings",
  "./mascot-image-home.js?v=31-mascot-settings",
  "./mascot-image-fallback.js?v=31-mascot-settings",
  "./mascot-settings.js?v=31-mascot-settings",
  "./script.js?v=31-mascot-settings",
  "./manifest.webmanifest?v=29",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

const HEAD_INJECTION = '<link rel="stylesheet" href="mascot-settings.css?v=31-mascot-settings" />';
const BODY_INJECTION = '<script src="mascot-image-home.js?v=31-mascot-settings"></script><script src="mascot-image-fallback.js?v=31-mascot-settings"></script><script src="mascot-settings.js?v=31-mascot-settings"></script>';

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

async function injectExperience(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) return response;
  const text = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(text.replace("</head>", `${HEAD_INJECTION}</head>`).replace("</body>", `${BODY_INJECTION}</body>`), { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(injectExperience).catch(async () => injectExperience(await caches.match("./index.html?v=31-mascot-settings"))));
    return;
  }
  event.respondWith(fetch(event.request).then((response) => {
    if (response && response.ok && new URL(event.request.url).origin === self.location.origin) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request)));
});
