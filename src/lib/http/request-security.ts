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

  if (fetchSite === "cross-site") {
    throw new ApiRequestError("Requête intersite refusée.", 403);
  }

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
