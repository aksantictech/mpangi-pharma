"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // Demande au navigateur de ne pas effacer la copie locale (ventes en attente,
    // produits, stock) quand l'espace disque manque. Sans effet s'il refuse.
    void navigator.storage?.persist?.().catch(() => undefined);

    function register() {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Cherche une nouvelle version du service worker à chaque ouverture.
          // Échec attendu sans internet : sans importance.
          registration.update().catch(() => undefined);
        })
        .catch((error) => {
          console.error("Erreur Service Worker:", error);
        });
    }

    // L'événement « load » est parfois déjà passé quand React hydrate : dans
    // ce cas il ne reviendra pas et le service worker ne serait jamais installé.
    if (document.readyState === "complete") {
      register();

      return;
    }

    window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
