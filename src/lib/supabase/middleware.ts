import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = [
  "/admin",
  "/dashboard",
  "/pharmacies",
  "/produits",
  "/stock",
  "/ventes",
  "/factures",
  "/expirations",
  "/audit",
  "/sauvegardes",
  "/finances",
  "/parametres",
  "/compte",
];

const authRoutes = ["/connexion", "/inscription"];

const publicRoutes = [
  "/",
  "/pharmacies-ouvertes",
  "/forfaits",
  "/devis-demo",
  "/contact",
  "/offline",
];

/**
 * Vérifie une route exacte ou une véritable sous-route.
 *
 * Exemple :
 * /pharmacies correspond à :
 * - /pharmacies
 * - /pharmacies/123
 *
 * Mais ne correspond pas à :
 * - /pharmacies-ouvertes
 */
function matchesRoute(pathname: string, route: string) {
  if (route === "/") {
    return pathname === "/";
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => matchesRoute(pathname, route));
}

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => matchesRoute(pathname, route));
}

function isAuthRoute(pathname: string) {
  return authRoutes.some((route) => matchesRoute(pathname, route));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /*
   * Les pages publiques passent toujours,
   * avec ou sans utilisateur connecté.
   */
  if (isPublicRoute(pathname)) {
    return response;
  }

  /*
   * Un utilisateur non connecté qui tente
   * d’accéder à une route privée est redirigé.
   */
  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/connexion";
    redirectUrl.searchParams.set("redirectedFrom", pathname);

    return NextResponse.redirect(redirectUrl);
  }

  /*
   * Un utilisateur déjà connecté n’a normalement
   * plus besoin d’accéder aux pages de connexion.
   */
  if (user && isAuthRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}