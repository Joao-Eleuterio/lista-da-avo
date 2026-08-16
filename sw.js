// Cache do shell da app. Os dados do Supabase/Open Food Facts ficam sempre em rede.
// Mudar a versão força Safari/Chrome/WebViews a largarem CSS/JS antigos.
const CACHE = "compras-v3-responsive";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app-core.js",
  "./app-ui.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Dados partilhados têm de vir sempre da rede.
  if (url.hostname.includes("supabase") || url.hostname.includes("openfoodfacts")) return;

  // Só tratamos recursos http(s); evita problemas com schemes internos de WebViews.
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Network-first: uma atualização publicada ganha sempre ao cache antigo.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => cached || caches.match("./index.html"))
      )
  );
});
