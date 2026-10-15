"use client";

/**
 * Demande au service worker de garder ces pages (et leurs fichiers) sur
 * l'appareil, pour qu'elles s'ouvrent même sans internet. À appeler quand la
 * connexion fonctionne. Sans effet en développement (pas de service worker).
 */
export async function warmOfflinePages(urls: string[]) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    registration?.active?.postMessage({ type: "WARM", urls });
  } catch {
    // Pas de service worker : le mode hors-ligne des pages n'est simplement pas prêt.
  }
}

const WARMED_AT_KEY = "mpangi_pharma_pages_warmed_at";
const WARM_EVERY_MS = 6 * 60 * 60 * 1000;

/** Comme warmOfflinePages, au plus une fois toutes les 6 heures. */
export function warmOfflinePagesIfDue(urls: string[]) {
  if (typeof window === "undefined") return;

  const lastWarmed = Number(window.localStorage.getItem(WARMED_AT_KEY) || 0);

  if (Date.now() - lastWarmed < WARM_EVERY_MS) return;

  window.localStorage.setItem(WARMED_AT_KEY, String(Date.now()));

  void warmOfflinePages(urls);
}
