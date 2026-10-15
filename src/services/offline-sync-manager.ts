"use client";

import { getCacheFallbackCount } from "@/lib/offline/read-cache";
import { isServerReachable } from "@/lib/offline/connectivity";
import { syncSellableProductsToOffline } from "@/services/offline-cache.service";
import { syncPendingOfflineSalesToServer } from "@/services/offline-sales.service";
import {
  getExpirationAlertsList,
} from "@/services/expirations.service";
import { getPharmacySettings } from "@/services/pharmacies.service";
import {
  getExpirationAlerts,
  getProductCategories,
  getProducts,
  getProductStock,
  getSuppliers,
} from "@/services/products.service";
import {
  getAllActiveBatches,
  refreshStockMovementsCopy,
} from "@/services/stock.service";

import type { SyncOfflineSalesResult } from "@/services/offline-sales.service";

/*
 * Synchronisation automatique du poste.
 *
 *  - montante : les ventes faites hors-ligne partent vers le serveur ;
 *  - descendante : la copie locale (produits, stock, lots, expirations…) est
 *    rafraîchie pour pouvoir être consultée si internet coupe.
 *
 * Ordre important : les ventes d'abord, la copie ensuite, pour que la copie
 * reflète des ventes déjà comptées par le serveur.
 */

const COPY_STALE_MS = 10 * 60 * 1000;

function copyKey(pharmacyId: string) {
  return `mpangi_pharma_local_copy_at:${pharmacyId}`;
}

export function getLocalCopyDate(pharmacyId: string) {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(copyKey(pharmacyId));
}

export function isLocalCopyStale(pharmacyId: string) {
  const at = getLocalCopyDate(pharmacyId);

  return !at || Date.now() - new Date(at).getTime() > COPY_STALE_MS;
}

let copyInFlight: Promise<void> | null = null;

/** Rafraîchit toute la copie locale. Un seul rafraîchissement à la fois. */
export function refreshLocalCopy(pharmacyId: string): Promise<void> {
  if (copyInFlight) return copyInFlight;

  copyInFlight = (async () => {
    if (!isServerReachable()) return;

    const fallbacksBefore = getCacheFallbackCount();

    // Les lectures enregistrent elles-mêmes leur copie (cachedRead). Une
    // lecture qui échoue ne doit pas empêcher les autres.
    const results = await Promise.allSettled([
      getProducts(pharmacyId),
      getProductStock(pharmacyId),
      getAllActiveBatches(pharmacyId),
      getExpirationAlerts(pharmacyId),
      getExpirationAlertsList(pharmacyId),
      getProductCategories(pharmacyId),
      getSuppliers(pharmacyId),
      getPharmacySettings(pharmacyId),
      refreshStockMovementsCopy(pharmacyId),
      syncSellableProductsToOffline(pharmacyId),
    ]);

    // Copie complète seulement si tout a répondu ; sinon on réessaiera au prochain passage.
    // Une lecture servie par l'ancienne copie (connexion perdue en route) ne
    // compte pas : la copie n'est « à jour » que si tout vient du serveur.
    if (
      results.every((result) => result.status === "fulfilled") &&
      getCacheFallbackCount() === fallbacksBefore
    ) {
      window.localStorage.setItem(
        copyKey(pharmacyId),
        new Date().toISOString()
      );
      window.dispatchEvent(new CustomEvent("mpangi-offline-cache-updated"));
    }
  })().finally(() => {
    copyInFlight = null;
  });

  return copyInFlight;
}

export async function refreshLocalCopyIfStale(pharmacyId: string) {
  if (isLocalCopyStale(pharmacyId)) {
    await refreshLocalCopy(pharmacyId);
  }
}

/** Ventes en attente d'abord, puis copie locale. */
export async function syncEverything(
  pharmacyId: string
): Promise<SyncOfflineSalesResult> {
  const sales = await syncPendingOfflineSalesToServer(pharmacyId);

  await refreshLocalCopy(pharmacyId);

  return sales;
}
