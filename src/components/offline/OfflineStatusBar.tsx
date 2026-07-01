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
        `Traitées : ${result.attemptedCount}`,
        `OK : ${result.syncedCount}`,
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

  const shortLastSyncText = syncState?.last_synced_at
    ? new Date(syncState.last_synced_at).toLocaleTimeString("fr-CD", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Jamais";

  const productCount = syncState?.count ?? 0;
  const isBusy = isSyncingProducts || isSyncingSales;

  return (
    <section className="no-print border-b border-slate-200 bg-white">
      {/* Mobile / terminal Android */}
      <div className="px-3 py-2 xl:hidden">
        <div
          className={`rounded-2xl border px-3 py-3 ${
            isOnline
              ? "border-emerald-100 bg-emerald-50"
              : "border-amber-100 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ${
                isOnline ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {isOnline ? (
                <Wifi className="h-4 w-4" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`truncate text-xs font-black ${
                    isOnline ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {isOnline ? "En ligne" : "Hors-ligne"}
                </p>

                {pendingSalesCount > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">
                    {pendingSalesCount} vente(s)
                  </span>
                )}
              </div>

              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">
                Produits : {productCount} · Sync : {shortLastSyncText}
              </p>

              {message && (
                <p className="mt-1 line-clamp-2 text-[11px] font-bold text-slate-700">
                  {message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSyncProducts}
              disabled={!isOnline || isBusy}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-[11px] font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${
                  isSyncingProducts ? "animate-spin" : ""
                }`}
              />
              {isSyncingProducts ? "Produits..." : "Produits"}
            </button>

            <button
              type="button"
              onClick={handleSyncSales}
              disabled={!isOnline || isBusy || pendingSalesCount === 0}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UploadCloud
                className={`h-3.5 w-3.5 ${
                  isSyncingSales ? "animate-pulse" : ""
                }`}
              />
              {isSyncingSales
                ? "Ventes..."
                : pendingSalesCount > 0
                  ? `Ventes (${pendingSalesCount})`
                  : "Ventes"}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop / tablette large */}
      <div className="mx-auto hidden max-w-7xl px-4 py-3 md:px-6 xl:block">
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
                    {message.includes("OK") ||
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