"use client";

import { reportReachable } from "@/lib/offline/connectivity";

/*
 * Requêtes réseau du client Supabase :
 *  - délai maximum (sans lui, une connexion « à moitié coupée » fait attendre
 *    des minutes devant un écran figé) ;
 *  - erreur claire et reconnaissable quand le serveur est injoignable, pour
 *    que chaque écran puisse basculer sur la copie locale ;
 *  - mise à jour de l'état de connexion (connectivity.ts).
 */

export const OFFLINE_ERROR_NAME = "Hors-ligne";
export const OFFLINE_ERROR_MESSAGE =
  "Cette action nécessite une connexion internet (pas de connexion avec le serveur).";

const REQUEST_TIMEOUT_MS = 25_000;

const OFFLINE_PATTERN =
  /pas de connexion avec le serveur|hors-ligne:|failed to fetch|networkerror|network request failed|load failed|fetch failed|délai dépassé/i;

/** Vrai si l'erreur vient d'une panne de connexion (et non d'un refus du serveur). */
export function isOfflineError(error: unknown) {
  if (!error) return false;

  const record = error as { name?: string; message?: string; status?: number };
  const text = `${record.name ?? ""}: ${record.message ?? String(error)}`;

  return (
    record.name === "AuthRetryableFetchError" ||
    record.name === OFFLINE_ERROR_NAME ||
    OFFLINE_PATTERN.test(text)
  );
}

function offlineError(detail?: string) {
  const error = new Error(
    detail ? `${OFFLINE_ERROR_MESSAGE} ${detail}` : OFFLINE_ERROR_MESSAGE
  );

  error.name = OFFLINE_ERROR_NAME;

  return error;
}

function isLongTransfer(url: string) {
  // Envois de fichiers (logo) : pas de délai court.
  return url.includes("/storage/v1/");
}

export const offlineAwareFetch: typeof fetch = async (input, init) => {
  // Rendu côté serveur : pas de notion de connexion navigateur, requête directe.
  if (typeof window === "undefined") {
    return fetch(input, init);
  }

  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    reportReachable(false);
    throw offlineError();
  }

  const controller = new AbortController();
  const callerSignal = init?.signal;
  let timedOut = false;

  const onCallerAbort = () => controller.abort();

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener("abort", onCallerAbort, { once: true });
    }
  }

  const timer = isLongTransfer(url)
    ? undefined
    : window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });

    reportReachable(true);

    return response;
  } catch (error) {
    // Annulation voulue par l'appelant : on la laisse passer telle quelle.
    if (callerSignal?.aborted && !timedOut) {
      throw error;
    }

    reportReachable(false);

    throw offlineError(timedOut ? "(délai dépassé)" : undefined);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);

    callerSignal?.removeEventListener("abort", onCallerAbort);
  }
};
