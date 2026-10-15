/*
 * Service worker de Mpangi Pharma : permet d'OUVRIR l'application sans internet
 * (démarrage à froid du poste de la pharmacie pendant une coupure).
 *
 * Ce qui est gardé sur l'appareil :
 *   - les fichiers de l'application (/_next/static : scripts, styles, polices)
 *     et les images de marque : « cache d'abord » (leur nom change à chaque
 *     version, ils ne peuvent pas être périmés) ;
 *   - les pages de l'espace pharmacie (HTML) : « réseau d'abord » avec repli
 *     sur la dernière copie quand le serveur ne répond pas.
 *
 * Ce qui n'est JAMAIS touché : les requêtes vers Supabase (autre domaine), les
 * API (/api), les requêtes non-GET. Les données (produits, stock, ventes) sont
 * gérées par l'application dans IndexedDB, pas ici.
 */

const VERSION = "mpangi-pharma-v2";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

const MAX_STATIC_ENTRIES = 600;
// Au-delà, on considère le serveur injoignable et on sert la copie locale.
const NAVIGATION_TIMEOUT_MS = 6000;

// Pages qui peuvent être gardées pour le mode hors-ligne.
const CACHEABLE_PAGE_PREFIXES = [
  "/dashboard",
  "/ventes",
  "/produits",
  "/stock",
  "/expirations",
  "/factures",
  "/synchronisation",
  "/inventaire",
  "/aide",
  "/finances",
  "/trousse",
  "/parametres",
  "/abonnement",
  "/compte",
  "/pharmacies",
  "/connexion",
];

function isCacheablePage(pathname) {
  return CACHEABLE_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function pageKey(url) {
  // Une page par chemin : le contenu ne dépend pas de la partie ?query.
  return new Request(`${url.origin}${url.pathname}`);
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/branding/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/favicon.ico"
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length <= maxEntries) return;

  // keys() suit l'ordre d'insertion : on retire les plus anciennes.
  await Promise.all(
    keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key))
  );
}

async function cacheStaticResponse(request, response) {
  if (!response || !response.ok || response.type === "opaque") return;

  const cache = await caches.open(STATIC_CACHE);

  await cache.put(request, response.clone());
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function offlinePage() {
  const body = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hors-ligne - Mpangi Pharma</title>
<style>body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px;display:grid;place-items:center;min-height:100vh}
.card{max-width:28rem;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.08)}
h1{font-size:1.25rem;margin:0 0 8px}p{color:#475569;line-height:1.5}a{display:block;margin-top:10px;padding:14px 16px;border-radius:16px;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:800;text-align:center}
a.alt{background:#eff6ff;color:#1d4ed8}</style></head><body><div class="card">
<h1>Cette page n'est pas disponible hors-ligne</h1>
<p>Internet est coupé et cette page n'a pas encore été ouverte sur cet appareil. Ouvrez une page déjà utilisée :</p>
<a href="/ventes">Caisse</a><a class="alt" href="/produits">Produits</a><a class="alt" href="/stock">Stock</a>
<p style="font-size:.85rem">Ouvrez toutes les pages une fois avec internet pour qu'elles soient disponibles ensuite.</p>
</div></body></html>`;

  return new Response(body, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// --- Cycle de vie -----------------------------------------------------------

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      // Pages gardées par la version précédente : on les re-télécharge dans la
      // nouvelle version pour que le mode hors-ligne reste prêt après une mise à jour.
      const previousPages = [];

      for (const name of names) {
        if (name.endsWith("-pages") && name !== PAGES_CACHE) {
          const keys = await (await caches.open(name)).keys();

          previousPages.push(...keys.map((key) => key.url));
        }
      }

      await Promise.all(
        names
          .filter((name) => name !== STATIC_CACHE && name !== PAGES_CACHE)
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();

      await warmPages([...new Set(previousPages)]);
    })()
  );
});

// --- Réchauffage : garder pages + fichiers pour le hors-ligne -----------------

async function warmAssetsFromText(text, baseUrl) {
  const found = new Set();

  for (const match of text.matchAll(/\/_next\/static\/[^"'\\\s)<>]+/g)) {
    found.add(match[0]);
  }

  // Polices référencées par les feuilles de style (url(...woff2)).
  for (const match of text.matchAll(/url\(([^)]+?\.woff2?)\)/g)) {
    try {
      found.add(new URL(match[1].replace(/["']/g, ""), baseUrl).pathname);
    } catch {
      // URL illisible : ignorée.
    }
  }

  const cache = await caches.open(STATIC_CACHE);

  await Promise.all(
    [...found].map(async (path) => {
      const request = new Request(path);

      if (await cache.match(request)) return;

      try {
        const response = await fetch(request);

        await cacheStaticResponse(request, response);

        // Une feuille de style amène ses polices.
        if (path.endsWith(".css") && response.ok) {
          await warmAssetsFromText(await response.clone().text(), response.url);
        }
      } catch {
        // Hors-ligne ou fichier introuvable : on réessaiera au prochain réchauffage.
      }
    })
  );
}

async function warmPages(urls) {
  const pages = await caches.open(PAGES_CACHE);

  for (const raw of urls) {
    try {
      const url = new URL(raw, self.location.origin);

      if (url.origin !== self.location.origin || !isCacheablePage(url.pathname)) {
        continue;
      }

      const response = await fetch(url.pathname, { credentials: "same-origin" });

      // Redirigé (ex. vers /connexion quand on n'est pas connecté) : pas une
      // vraie copie de cette page.
      if (!response.ok || response.redirected) continue;

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("text/html")) continue;

      await pages.put(pageKey(url), response.clone());
      await warmAssetsFromText(await response.text(), response.url);
    } catch {
      // Hors-ligne : on garde les copies existantes.
    }
  }

  await trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES);
}

self.addEventListener("message", (event) => {
  const data = event.data;

  if (data && data.type === "WARM" && Array.isArray(data.urls)) {
    event.waitUntil(warmPages(data.urls));
  }
});

// --- Requêtes ---------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Pages : réseau d'abord, copie locale si le serveur ne répond pas.
  if (request.mode === "navigate") {
    if (!isCacheablePage(url.pathname)) return;

    event.respondWith(
      (async () => {
        try {
          const response = await withTimeout(fetch(request), NAVIGATION_TIMEOUT_MS);

          const contentType = response.headers.get("content-type") || "";

          if (response.ok && !response.redirected && contentType.includes("text/html")) {
            // Copies faites tout de suite : le navigateur consomme `response`.
            const copyForPages = response.clone();
            const copyForAssets = response.clone();

            event.waitUntil(
              caches
                .open(PAGES_CACHE)
                .then((cache) => cache.put(pageKey(url), copyForPages))
                .then(() => warmAssetsFromResponse(copyForAssets))
                .catch(() => undefined)
            );
          }

          return response;
        } catch {
          const cached = await caches.match(pageKey(url), { cacheName: PAGES_CACHE });

          return cached || offlinePage();
        }
      })()
    );

    return;
  }

  // Fichiers de l'application : cache d'abord.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request, { cacheName: STATIC_CACHE });

        if (cached) return cached;

        try {
          const response = await fetch(request);

          event.waitUntil(
            cacheStaticResponse(request, response).then(() =>
              trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES)
            )
          );

          return response;
        } catch (error) {
          // Images de marque / polices absentes : on laisse l'échec normal.
          throw error;
        }
      })()
    );
  }
});

async function warmAssetsFromResponse(response) {
  try {
    await warmAssetsFromText(await response.text(), response.url);
  } catch {
    // Sans importance : le navigateur chargera lui-même ces fichiers.
  }
}
