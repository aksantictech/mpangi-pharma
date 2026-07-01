"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCcw,
  UploadCloud,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  getPendingOfflineSalesCount,
  getProductOfflineSyncState,
  syncSellableProductsToOffline,
} from "@/services/offline-cache.service";
import { syncPendingOfflineSalesToServer } from "@/services/offline-sales.service";

import type { OfflineSyncState } from "@/lib/offline/db";

type OfflineStatusBarProps = {
  pharmacyId?: string | null;
};

export default function OfflineStatusBar({ pharmacyId }: OfflineStatusBarProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncState, setSyncState] = useState<OfflineSyncState | null>(null);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);

  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [isSyncingSales, setIsSyncingSales] = useState(false);

  const [message, setMessage] = useState("");

  const refreshLocalStats = useCallback(async () => {
    if (!pharmacyId) {
      setSyncState(null);
      setPendingSalesCount(0);
      return;
    }

    const [state, pendingCount] = await Promise.all([
      getProductOfflineSyncState(pharmacyId),
      getPendingOfflineSalesCount(pharmacyId),
    ]);

    setSyncState(state ?? null);
    setPendingSalesCount(pendingCount);
  }, [pharmacyId]);

  useEffect(() => {
    function updateNetworkStatus() {
      setIsOnline(navigator.onLine);
    }

    updateNetworkStatus();

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, []);

  useEffect(() => {
    refreshLocalStats();

    const intervalId = window.setInterval(() => {
      refreshLocalStats();
    }, 15000);

    function handleCacheUpdated() {
      refreshLocalStats();
    }

    window.addEventListener("mpangi-offline-cache-updated", handleCacheUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "mpangi-offline-cache-updated",
        handleCacheUpdated
      );
    };
  }, [refreshLocalStats]);

  async function handleSyncProducts() {
    if (!pharmacyId) return;

    if (!isOnline) {
      setMessage("Connexion absente. Impossible de synchroniser les produits.");
      return;
    }

    setIsSyncingProducts(true);
    setMessage("");

    try {
      const result = await syncSellableProductsToOffline(pharmacyId);

      setMessage(`${result.count} produit(s) disponibles hors-ligne.`);
      await refreshLocalStats();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur pendant la synchronisation des produits."
      );
    } finally {
      setIsSyncingProducts(false);
    }
  }

  async function handleSyncSales() {
    if (!pharmacyId) return;

    if (!isOnline) {
      setMessage("Connexion absente. Impossible de synchroniser les ventes.");
      return;
    }

    setIsSyncingSales(true);
    setMessage("");

    try {
      const result = await syncPendingOfflineSalesToServer(pharmacyId);

      const summary = [
        `Ventes traitées : ${result.attemptedCount}`,
        `Synchronisées : ${result.syncedCount}`,
        `Conflits : ${result.conflictCount}`,
        `Échecs : ${result.failedCount}`,
      ].join(" · ");

      setMessage(summary);

      await refreshLocalStats();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur pendant la synchronisation des ventes."
      );
    } finally {
      setIsSyncingSales(false);
    }
  }

  if (!pharmacyId) {
    return null;
  }

  const lastSyncText = syncState?.last_synced_at
    ? new Date(syncState.last_synced_at).toLocaleString("fr-CD")
    : "Jamais";

  const productCount = syncState?.count ?? 0;
  const isBusy = isSyncingProducts || isSyncingSales;

  return (
    <section className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
        <div
          className={`rounded-3xl border p-4 ${
            isOnline
              ? "border-emerald-100 bg-emerald-50"
              : "border-amber-100 bg-amber-50"
          }`}
        >
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div className="flex items-start gap-3">
              <div
                className={`rounded-2xl p-3 ${
                  isOnline
                    ? "bg-white text-emerald-700"
                    : "bg-white text-amber-700"
                }`}
              >
                {isOnline ? (
                  <Wifi className="h-5 w-5" />
                ) : (
                  <WifiOff className="h-5 w-5" />
                )}
              </div>

              <div>
                <p
                  className={`text-sm font-black ${
                    isOnline ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {isOnline ? "Mode en ligne" : "Mode hors-ligne"}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Produits offline : {productCount} · Dernière synchro :{" "}
                  {lastSyncText}
                </p>

                {pendingSalesCount > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-black text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {pendingSalesCount} vente(s) hors-ligne en attente
                  </p>
                )}

                {message && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                    {message.includes("Synchronisées") ||
                    message.includes("disponibles") ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <Database className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    {message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:items-center">
              <button
                type="button"
                onClick={handleSyncProducts}
                disabled={!isOnline || isBusy}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${
                    isSyncingProducts ? "animate-spin" : ""
                  }`}
                />
                {isSyncingProducts
                  ? "Produits..."
                  : "Synchroniser produits"}
              </button>

              <button
                type="button"
                onClick={handleSyncSales}
                disabled={!isOnline || isBusy || pendingSalesCount === 0}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadCloud
                  className={`h-4 w-4 ${
                    isSyncingSales ? "animate-pulse" : ""
                  }`}
                />
                {isSyncingSales
                  ? "Ventes..."
                  : `Synchroniser ventes${
                      pendingSalesCount > 0 ? ` (${pendingSalesCount})` : ""
                    }`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}