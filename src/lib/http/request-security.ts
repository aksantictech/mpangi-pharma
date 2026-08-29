export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

type ReadJsonOptions = {
  maxBytes: number;
  requireSameOrigin?: boolean;
};

export async function readProtectedJson<T>(
  request: Request,
  { maxBytes, requireSameOrigin = true }: ReadJsonOptions
): Promise<T> {
  if (requireSameOrigin) {
    assertSameOriginRequest(request);
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiRequestError(
      "Le type de contenu doit être application/json.",
      415
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);

  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiRequestError("Requête trop volumineuse.", 413);
  }

  const rawBody = await request.text();
  const actualLength = new TextEncoder().encode(rawBody).byteLength;

  if (actualLength > maxBytes) {
    throw new ApiRequestError("Requête trop volumineuse.", 413);
  }

  if (!rawBody.trim()) {
    throw new ApiRequestError("Le corps de la requête est vide.");
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new ApiRequestError("Le corps JSON est invalide.");
  }
}

export function assertSameOriginRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  // `Sec-Fetch-Site` est envoyé par tous les navigateurs modernes. On
  // n'autorise que les appels de la même origine (ou déclenchés hors contexte
  // web, ex. barre d'adresse : `none`). `same-site` et `cross-site` sont
  // refusés : l'application n'a pas de sous-domaine de confiance.
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new ApiRequestError("Requête intersite refusée.", 403);
  }

  if (origin && origin !== requestUrl.origin) {
    throw new ApiRequestError("Origine de la requête refusée.", 403);
  }

  // Repli pour les navigateurs sans `Sec-Fetch-Site` : sur une méthode de
  // mutation, l'absence totale d'`Origin` et de `Referer` cohérents est
  // traitée comme suspecte.
  if (!fetchSite && !origin) {
    const referer = request.headers.get("referer");

    if (referer) {
      try {
        if (new URL(referer).origin !== requestUrl.origin) {
          throw new ApiRequestError("Référent de la requête refusé.", 403);
        }
      } catch {
        throw new ApiRequestError("Référent de la requête invalide.", 403);
      }
    }
  }
}

/**
 * Contrôle d'origine pour les routes GET qui exposent des données sensibles
 * (exports, catalogues). Empêche qu'un autre site déclenche la requête via une
 * simple balise ou un `fetch` et en lise le résultat.
 */
export function assertSameOriginRead(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new ApiRequestError("Requête intersite refusée.", 403);
  }

  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);

  if (origin && origin !== requestUrl.origin) {
    throw new ApiRequestError("Origine de la requête refusée.", 403);
  }
}

export function getApiErrorStatus(error: unknown, fallback = 400) {
  return error instanceof ApiRequestError ? error.status : fallback;
}

export function assertUuid(value: string, label: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    throw new ApiRequestError(`${label} est invalide.`);
  }
}

export function assertStringLength(
  value: string | undefined,
  label: string,
  maxLength: number
) {
  if ((value?.length ?? 0) > maxLength) {
    throw new ApiRequestError(
      `${label} dépasse la longueur maximale autorisée.`
    );
  }
}
