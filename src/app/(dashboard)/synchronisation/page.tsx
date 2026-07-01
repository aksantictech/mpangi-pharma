"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCcw,
  RotateCcw,
  Search,
  UploadCloud,
  Wifi,
  WifiOff,
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
import type { PaymentMethod } from "@/types/sale";

type OfflineSaleWithItems = OfflineSale & {
  items: OfflineSaleItem[];
};

const MOBILE_PAGE_SIZE = 5;

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
  const [search, setSearch] = useState("");
  const [mobilePage, setMobilePage] = useState(1);
  const [isOnline, setIsOnline] = useState(true);

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

  useEffect(() => {
    setMobilePage(1);
  }, [statusFilter, search]);

  const filteredSales = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return offlineSales.filter((sale) => {
      const matchesStatus =
        statusFilter === "all" ? true : sale.status === statusFilter;

      if (!matchesStatus) return false;

      if (!normalized) return true;

      const value = [
        sale.local_invoice_number,
        sale.server_invoice_number,
        sale.customer_name,
        sale.status,
        sale.conflict_reason,
        sale.payment_method,
        ...sale.items.map((item) => item.product_name),
        ...sale.items.map((item) => item.dosage),
        ...sale.items.map((item) => item.form),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return value.includes(normalized);
    });
  }, [offlineSales, search, statusFilter]);

  const mobileTotalPages = Math.max(
    1,
    Math.ceil(filteredSales.length / MOBILE_PAGE_SIZE)
  );

  const safeMobilePage = Math.min(mobilePage, mobileTotalPages);

  const mobileSales = filteredSales.slice(
    (safeMobilePage - 1) * MOBILE_PAGE_SIZE,
    safeMobilePage * MOBILE_PAGE_SIZE
  );

  useEffect(() => {
    if (mobilePage > mobileTotalPages) {
      setMobilePage(mobileTotalPages);
    }
  }, [mobilePage, mobileTotalPages]);

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

    if (!isOnline) {
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
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <p className="font-semibold text-slate-500">
            Chargement de la synchronisation...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 md:rounded-[2rem] md:p-8">
          <h1 className="text-xl font-black text-amber-800 md:text-2xl">
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
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm">
                  {pharmacy.name}
                </p>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${
                    isOnline
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isOnline ? (
                    <Wifi className="h-3.5 w-3.5" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5" />
                  )}
                  {isOnline ? "En ligne" : "Hors-ligne"}
                </span>
              </div>

              <h1 className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
                Synchronisation
              </h1>

              <p className="mt-1 text-xs text-slate-500 md:mt-2 md:max-w-3xl md:text-sm">
                Ventes hors-ligne stockées sur ce terminal, synchronisation
                Supabase et traitement des conflits.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RefreshCcw className="h-5 w-5" />
                Actualiser
              </button>

              <button
                type="button"
                onClick={handleSyncSales}
                disabled={isSyncing || !isOnline}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <MetricCard
            label="En attente"
            value={counts.pending.toString()}
            icon={<Clock className="h-5 w-5 md:h-6 md:w-6" />}
            tone="warning"
          />

          <MetricCard
            label="Conflits"
            value={counts.conflict.toString()}
            icon={<AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />}
            tone="danger"
          />

          <MetricCard
            label="Échecs"
            value={counts.failed.toString()}
            icon={<RotateCcw className="h-5 w-5 md:h-6 md:w-6" />}
            tone="danger"
          />

          <MetricCard
            label="OK"
            value={counts.synced.toString()}
            icon={<CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />}
            tone="success"
          />

          <MetricCard
            label="Total"
            value={counts.total.toString()}
            icon={<Wifi className="h-5 w-5 md:h-6 md:w-6" />}
          />
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-950 md:text-xl">
                Ventes offline du terminal
              </h2>

              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Données locales IndexedDB, propres à ce terminal.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px] xl:w-[620px]">
              <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ticket, client, produit..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | OfflineSaleStatus
                  )
                }
                className="form-input"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending_sync">En attente</option>
                <option value="sync_failed">Échecs</option>
                <option value="conflict">Conflits</option>
                <option value="synced">Synchronisées</option>
                <option value="cancelled">Annulées</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 xl:hidden">
            <MobilePagination
              page={safeMobilePage}
              totalPages={mobileTotalPages}
              totalItems={filteredSales.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() => setMobilePage((page) => Math.max(1, page - 1))}
              onNext={() =>
                setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
              }
            />

            {filteredSales.length === 0 ? (
              <EmptyState message="Aucune vente offline trouvée pour ce filtre." />
            ) : (
              mobileSales.map((sale) => (
                <MobileOfflineSaleCard
                  key={sale.id}
                  sale={sale}
                  onCancel={() => handleCancelSale(sale)}
                />
              ))
            )}

            <MobilePagination
              page={safeMobilePage}
              totalPages={mobileTotalPages}
              totalItems={filteredSales.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() => setMobilePage((page) => Math.max(1, page - 1))}
              onNext={() =>
                setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
              }
            />
          </div>

          <div className="hidden space-y-3 xl:block">
            {filteredSales.length === 0 ? (
              <EmptyState message="Aucune vente offline trouvée pour ce filtre." />
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

function MobileOfflineSaleCard({
  sale,
  onCancel,
}: {
  sale: OfflineSaleWithItems;
  onCancel: () => void;
}) {
  const canCancel = !["synced", "cancelled", "syncing"].includes(sale.status);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
            Ticket provisoire
          </p>

          <h3 className="mt-1 truncate text-sm font-black text-slate-950">
            {sale.local_invoice_number}
          </h3>

          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
            {new Date(sale.created_at).toLocaleString("fr-CD")}
          </p>
        </div>

        <StatusBadge status={sale.status} />
      </div>

      {sale.server_invoice_number && (
        <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
          Facture serveur : {sale.server_invoice_number}
        </p>
      )}

      {sale.conflict_reason && (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
          {sale.conflict_reason}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniInfo label="Client" value={sale.customer_name || "Comptoir"} />
        <MiniInfo
          label="Total"
          value={formatMoney(sale.total, sale.currency)}
          strong
        />
        <MiniInfo label="Articles" value={sale.items.length.toString()} />
        <MiniInfo
          label="Paiement"
          value={formatPaymentMethod(sale.payment_method)}
        />
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 p-3">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          Articles
        </p>

        <div className="space-y-2">
          {sale.items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="line-clamp-1 font-black text-slate-900">
                  {item.product_name}
                </p>

                <p className="line-clamp-1 text-[11px] font-semibold text-slate-500">
                  {[item.dosage, item.form, item.unit].filter(Boolean).join(" · ") ||
                    "-"}
                </p>
              </div>

              <p className="shrink-0 text-right font-black text-slate-950">
                {item.quantity} × {formatMoney(item.unit_price, sale.currency)}
              </p>
            </div>
          ))}
        </div>

        {sale.items.length > 3 && (
          <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
            + {sale.items.length - 3} autre(s) article(s)
          </p>
        )}
      </div>

      {canCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-100"
        >
          <Ban className="h-4 w-4" />
          Annuler vente locale
        </button>
      )}
    </article>
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
          <InfoBox
            label="Paiement"
            value={formatPaymentMethod(sale.payment_method)}
          />
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

function MobilePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center">
        <p className="text-xs font-black text-slate-900">
          Page {page}/{totalPages}
        </p>

        <p className="text-[11px] font-semibold text-slate-500">
          {start}-{end} sur {totalItems}
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
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
  icon: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-blue-50 text-blue-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm md:rounded-[2rem] md:p-5">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl md:mb-4 md:h-12 md:w-12 ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-500 md:text-sm">{label}</p>

      <p className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
        {value}
      </p>
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
      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black md:px-3 md:text-xs ${config[status].className}`}
    >
      {config[status].label}
    </span>
  );
}

function MiniInfo({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <p className="text-[10px] font-bold text-slate-500">{label}</p>

      <p
        className={`mt-0.5 line-clamp-2 text-xs ${
          strong ? "font-black text-slate-950" : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function formatPaymentMethod(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    cash_cdf: "Cash CDF",
    cash_usd: "Cash USD",
    mobile_money: "Mobile Money",
    card: "Carte",
    credit: "Crédit client",
    mixed: "Mixte",
  };

  return labels[method] ?? method;
}

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString("fr-CD")} ${currency}`;
}
