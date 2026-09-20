/**
 * Next.js précharge (prefetch) le code des routes liées dès qu'un <Link>
 * entre dans le viewport. /connexion et /pharmacies-ouvertes embarquent
 * supabase-js (~217 Ko) : depuis l'accueil, ce préchargement gonflait la page
 * (1,1 Mo transférés) et retardait l'interactivité. Pour ces deux routes, on
 * charge le code au clic plutôt qu'au survol du viewport.
 */
const HEAVY_ROUTES = new Set(["/connexion", "/pharmacies-ouvertes"]);

export function prefetchFor(href: string): false | undefined {
  return HEAVY_ROUTES.has(href) ? false : undefined;
}
