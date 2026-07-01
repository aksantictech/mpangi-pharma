"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  RefreshCcw,
  RotateCcw,
  UploadCloud,
  Wifi,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  cancelOfflineSale,
  getOfflineSalesWithItems,
  syncPendingOfflineSalesToServer,
} from "@/services/offline-sales.service";

import type {
  OfflineSale,
  OfflineSaleItem,
  OfflineSaleStatus,
} from "@/lib/offline/db";
import type { PharmacyWithRole } from "@/types/pharmacy";

type OfflineSaleWithItems = OfflineSale & {
  items: OfflineSaleItem[];
};

const statusLabels: Record<OfflineSaleStatus, string> = {
  pending_sync: "En attente",
  syncing: "Synchronisation",
  synced: "Synchronisée",
  sync_failed: "Échec",
  conflict: "Conflit",
  cancelled: "Annulée",
};

export default function SynchronisationPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [offlineSales, setOfflineSales] = useState<OfflineSaleWithItems[]>([]);

  const [statusFilter, setStatusFilter] = useState<"all" | OfflineSaleStatus>(
    "all"
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setOfflineSales([]);
        return;
      }

      setPharmacy(currentPharmacy);

      const sales = await getOfflineSalesWithItems(currentPharmacy.id);
      setOfflineSales(sales as OfflineSaleWithItems[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les ventes offline."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    function handleCacheUpdated() {
      loadData();
    }

    window.addEventListener("mpangi-offline-cache-updated", handleCacheUpdated);

    return () => {
      window.removeEventListener(
        "mpangi-offline-cache-updated",
        handleCacheUpdated
      );
    };
  }, []);

  const filteredSales = useMemo(() => {
    if (statusFilter === "all") return offlineSales;

    return offlineSales.filter((sale) => sale.status === statusFilter);
  }, [offlineSales, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: offlineSales.length,
      pending: offlineSales.filter((sale) => sale.status === "pending_sync")
        .length,
      failed: offlineSales.filter((sale) => sale.status === "sync_failed")
        .length,
      conflict: offlineSales.filter((sale) => sale.status === "conflict")
        .length,
      synced: offlineSales.filter((sale) => sale.status === "synced").length,
      cancelled: offlineSales.filter((sale) => sale.status === "cancelled")
        .length,
    };
  }, [offlineSales]);

  async function handleSyncSales() {
    if (!pharmacy) return;

    if (!navigator.onLine) {
      setErrorMessage("Connexion absente. Impossible de synchroniser.");
      return;
    }

    setIsSyncing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await syncPendingOfflineSalesToServer(pharmacy.id);

      setSuccessMessage(
        [
          `Ventes traitées : ${result.attemptedCount}`,
          `Synchronisées : ${result.syncedCount}`,
          `Conflits : ${result.conflictCount}`,
          `Échecs : ${result.failedCount}`,
        ].join(" · ")
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur pendant la synchronisation."
      );
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCancelSale(sale: OfflineSaleWithItems) {
    if (!pharmacy) return;

    const confirmed = window.confirm(
      [
        "Annuler cette vente hors-ligne ?",
        "",
        `Ticket : ${sale.local_invoice_number}`,
        `Total : ${formatMoney(sale.total, sale.currency)}`,
        "",
        "Le stock local sera restauré sur ce terminal.",
      ].join("\n")
    );

    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await cancelOfflineSale(pharmacy.id, sale.id);

      setSuccessMessage(`Vente ${sale.local_invoice_number} annulée.`);
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’annuler cette vente."
      );
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement de la synchronisation...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-800">
            Aucune pharmacie trouvée
          </h1>

          <p className="mt-2 text-sm font-medium text-amber-700">
            Impossible de consulter la synchronisation sans pharmacie active.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                {pharmacy.name}
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Synchronisation offline
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Suivez les ventes enregistrées hors-ligne sur ce terminal,
                synchronisez-les avec Supabase et traitez les conflits.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RefreshCcw className="h-5 w-5" />
                Actualiser
              </button>

              <button
                type="button"
                onClick={handleSyncSales}
                disabled={isSyncing || !navigator.onLine}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UploadCloud
                  className={`h-5 w-5 ${isSyncing ? "animate-pulse" : ""}`}
                />
                {isSyncing ? "Synchronisation..." : "Synchroniser ventes"}
              </button>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="En attente"
            value={counts.pending.toString()}
            icon={<Clock className="h-6 w-6" />}
            tone="warning"
          />

          <MetricCard
            label="Conflits"
            value={counts.conflict.toString()}
            icon={<AlertTriangle className="h-6 w-6" />}
            tone="danger"
          />

          <MetricCard
            label="Échecs"
            value={counts.failed.toString()}
            icon={<RotateCcw className="h-6 w-6" />}
            tone="danger"
          />

          <MetricCard
            label="Synchronisées"
            value={counts.synced.toString()}
            icon={<CheckCircle2 className="h-6 w-6" />}
            tone="success"
          />

          <MetricCard
            label="Total local"
            value={counts.total.toString()}
            icon={<Wifi className="h-6 w-6" />}
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Ventes offline du terminal
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Ces données sont stockées localement dans IndexedDB sur ce
                terminal.
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | OfflineSaleStatus)
              }
              className="form-input xl:w-64"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending_sync">En attente</option>
              <option value="sync_failed">Échecs</option>
              <option value="conflict">Conflits</option>
              <option value="synced">Synchronisées</option>
              <option value="cancelled">Annulées</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredSales.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-semibold text-slate-500">
                Aucune vente offline trouvée pour ce filtre.
              </div>
            ) : (
              filteredSales.map((sale) => (
                <OfflineSaleCard
                  key={sale.id}
                  sale={sale}
                  onCancel={() => handleCancelSale(sale)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function OfflineSaleCard({
  sale,
  onCancel,
}: {
  sale: OfflineSaleWithItems;
  onCancel: () => void;
}) {
  const canCancel = !["synced", "cancelled", "syncing"].includes(sale.status);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-700">
              Ticket provisoire
            </p>

            <StatusBadge status={sale.status} />
          </div>

          <h3 className="mt-2 text-lg font-black text-slate-950">
            {sale.local_invoice_number}
          </h3>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {new Date(sale.created_at).toLocaleString("fr-CD")}
          </p>

          {sale.server_invoice_number && (
            <p className="mt-1 text-xs font-black text-emerald-700">
              Facture serveur : {sale.server_invoice_number}
            </p>
          )}

          {sale.conflict_reason && (
            <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
              {sale.conflict_reason}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 xl:w-[360px]">
          <InfoBox label="Client" value={sale.customer_name || "Comptoir"} />
          <InfoBox
            label="Total"
            value={formatMoney(sale.total, sale.currency)}
            strong
          />
          <InfoBox label="Articles" value={sale.items.length.toString()} />
          <InfoBox label="Paiement" value={sale.payment_method} />
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.15em] text-slate-500">
          Articles
        </p>

        <div className="space-y-2">
          {sale.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm"
            >
              <div>
                <p className="font-black text-slate-900">
                  {item.product_name}
                </p>

                <p className="text-xs font-semibold text-slate-500">
                  {[item.dosage, item.form, item.unit].filter(Boolean).join(" · ") ||
                    "-"}
                </p>
              </div>

              <p className="text-right font-black text-slate-950">
                {item.quantity} × {formatMoney(item.unit_price, sale.currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {canCancel && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100"
          >
            <Ban className="h-4 w-4" />
            Annuler vente locale
          </button>
        </div>
      )}
    </article>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-blue-50 text-blue-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: OfflineSaleStatus }) {
  const config: Record<
    OfflineSaleStatus,
    { label: string; className: string }
  > = {
    pending_sync: {
      label: "En attente",
      className: "bg-amber-50 text-amber-700",
    },
    syncing: {
      label: "Synchronisation",
      className: "bg-blue-50 text-blue-700",
    },
    synced: {
      label: "Synchronisée",
      className: "bg-emerald-50 text-emerald-700",
    },
    sync_failed: {
      label: "Échec",
      className: "bg-red-50 text-red-700",
    },
    conflict: {
      label: "Conflit",
      className: "bg-red-50 text-red-700",
    },
    cancelled: {
      label: "Annulée",
      className: "bg-slate-100 text-slate-500",
    },
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${config[status].className}`}
    >
      {config[status].label}
    </span>
  );
}

function InfoBox({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm ${
          strong ? "font-black text-slate-950" : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString("fr-CD")} ${currency}`;
}