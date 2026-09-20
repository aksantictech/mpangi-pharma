import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Espaces privés (authentification obligatoire) et API : inutiles à
        // crawler, on économise le budget de crawl pour les pages publiques.
        // /connexion reste crawlable mais en noindex (voir son layout).
        disallow: [
          "/admin",
          "/api/",
          "/dashboard",
          "/produits",
          "/stock",
          "/stock-voisin",
          "/ventes",
          "/factures",
          "/finances",
          "/expirations",
          "/synchronisation",
          "/parametres",
          // Préfixe exact : "/pharmacies" seul bloquerait aussi la page
          // publique /pharmacies-ouvertes (Disallow fonctionne par préfixe).
          "/pharmacies$",
          "/pharmacies/",
          "/compte",
          "/abonnement",
          "/download/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
