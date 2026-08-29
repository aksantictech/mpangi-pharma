const CACHE_VERSION = "mpangi-pharma-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim().then(async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_VERSION)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

/*
 * Handler `fetch` minimal et volontairement passif.
 *
 * Il est conservé uniquement pour les critères d'installation PWA/TWA des
 * navigateurs Android anciens des terminaux. Il ne met rien en cache et ne
 * réécrit aucune réponse : il ne s'occupe que des requêtes de navigation de
 * même origine et laisse tout le reste au navigateur. Le mode hors-ligne de
 * l'application repose sur IndexedDB, pas sur ce service worker.
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || request.mode !== "navigate") {
    return;
  }

  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request).catch(
      () =>
        new Response(
          "Hors ligne. Vérifiez la connexion Internet puis réessayez.",
          {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }
        )
    )
  );
});
