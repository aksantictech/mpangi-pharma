"use client";

import { offlineDb } from "@/lib/offline/db";
import { isOfflineError } from "@/lib/offline/network";

/*
 * Lecture avec copie locale.
 *
 *   cachedRead(pharmacyId, "products", () => getProductsFromServer())
 *
 * - en ligne : on lit le serveur et on garde une copie sur l'appareil ;
 * - sans internet : on renvoie la dernière copie (et on le signale), de sorte
 *   que les écrans Produits, Stock, Expirations… restent consultables.
 * Une autre erreur (droits, serveur) est relancée telle quelle : on ne montre
 * jamais une copie périmée pour masquer un vrai problème.
 */

export const SERVED_FROM_CACHE_EVENT = "mpangi-served-from-cache";

let lastServedFromCacheAt: string | null = null;
let cacheFallbackCount = 0;

/** Nombre de lectures servies par la copie locale depuis le chargement (pour détecter une copie incomplète). */
export function getCacheFallbackCount() {
  return cacheFallbackCount;
}

/** Date de la plus ancienne copie locale affichée depuis la dernière lecture en ligne. */
export function getServedFromCacheAt() {
  return lastServedFromCacheAt;
}

export function clearServedFromCache() {
  if (lastServedFromCacheAt === null) return;

  lastServedFromCacheAt = null;

  window.dispatchEvent(new Event(SERVED_FROM_CACHE_EVENT));
}

function cacheKey(pharmacyId: string, name: string) {
  return `${pharmacyId}|${name}`;
}

async function writeCache(
  pharmacyId: string,
  name: string,
  data: unknown
) {
  try {
    await offlineDb.readCache.put({
      key: cacheKey(pharmacyId, name),
      pharmacy_id: pharmacyId,
      name,
      data,
      cached_at: new Date().toISOString(),
    });
  } catch {
    // Quota ou navigateur sans IndexedDB : la lecture en ligne reste valable.
  }
}

export async function readCachedCopy<T>(pharmacyId: string, name: string) {
  try {
    const entry = await offlineDb.readCache.get(cacheKey(pharmacyId, name));

    return entry ? { data: entry.data as T, cachedAt: entry.cached_at } : null;
  } catch {
    return null;
  }
}

export async function cachedRead<T>(
  pharmacyId: string,
  name: string,
  fetcher: () => Promise<T>,
  options: { toCache?: (data: T) => unknown } = {}
): Promise<T> {
  try {
    const data = await fetcher();

    void writeCache(
      pharmacyId,
      name,
      options.toCache ? options.toCache(data) : data
    );

    return data;
  } catch (error) {
    if (!isOfflineError(error)) throw error;

    const copy = await readCachedCopy<T>(pharmacyId, name);

    if (!copy) throw error;

    cacheFallbackCount += 1;

    if (
      lastServedFromCacheAt === null ||
      copy.cachedAt < lastServedFromCacheAt
    ) {
      lastServedFromCacheAt = copy.cachedAt;
      window.dispatchEvent(new Event(SERVED_FROM_CACHE_EVENT));
    }

    return copy.data;
  }
}
