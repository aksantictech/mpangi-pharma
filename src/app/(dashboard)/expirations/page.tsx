"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PackageX,
  RefreshCcw,
  Search,
  ShieldAlert,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  getExpirationAlertsList,
  removeBatchFromSale,
} from "@/services/expirations.service";
import type { PharmacyWithRole } from "@/types/pharmacy";
import type { ExpirationAlert, ExpirationStatus } from "@/types/product";

type ExpirationFilter = "all" | ExpirationStatus;

const MOBILE_PAGE_SIZE = 5;

const filters: { value: ExpirationFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "expired", label: "Expirés" },
  { value: "expires_30_days", label: "≤ 30 jours" },
  { value: "expires_60_days", label: "≤ 60 jours" },
  { value: "expires_90_days", label: "≤ 90 jours" },
];

export default function ExpirationsPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [alerts, setAlerts] = useState<ExpirationAlert[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExpirationFilter>("all");
  const [mobilePage, setMobilePage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setAlerts([]);
        return;
      }

      setPharmacy(currentPharmacy);

      const data = await getExpirationAlertsList(currentPharmacy.id);
      setAlerts(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les expirations."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setMobilePage(1);
  }, [search, filter]);

  const filteredAlerts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesFilter =
        filter === "all" || alert.expiration_status === filter;

      if (!matchesFilter) return false;

      const searchValue = [
        alert.product_name,
        alert.generic_name,
        alert.dosage,
        alert.form,
        alert.batch_number,
        alert.expiry_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalized || searchValue.includes(normalized);

      return matchesSearch;
    });
  }, [alerts, search, filter]);

  const mobileTotalPages = Math.max(
    1,
    Math.ceil(filteredAlerts.length / MOBILE_PAGE_SIZE)
  );

  const safeMobilePage = Math.min(mobilePage, mobileTotalPages);

  const mobileAlerts = filteredAlerts.slice(
    (safeMobilePage - 1) * MOBILE_PAGE_SIZE,
    safeMobilePage * MOBILE_PAGE_SIZE
  );

  useEffect(() => {
    if (mobilePage > mobileTotalPages) {
      setMobilePage(mobileTotalPages);
    }
  }, [mobilePage, mobileTotalPages]);

  const expiredCount = alerts.filter(
    (alert) => alert.expiration_status === "expired"
  ).length;

  const expires30Count = alerts.filter(
    (alert) => alert.expiration_status === "expires_30_days"
  ).length;

  const expires60Count = alerts.filter(
    (alert) => alert.expiration_status === "expires_60_days"
  ).length;

  const expires90Count = alerts.filter(
    (alert) => alert.expiration_status === "expires_90_days"
  ).length;

  async function handleRemoveBatch(alert: ExpirationAlert) {
    const confirmed = window.confirm(
      [
        "Retirer ce lot de la vente ?",
        "",
        `Produit : ${alert.product_name}`,
        `Lot : ${alert.batch_number || "-"}`,
        `Stock : ${Number(alert.quantity_available || 0)}`,
        "",
        "Cette action mettra la quantité disponible à zéro.",
      ].join("\n")
    );

    if (!confirmed) return;

    setIsRemoving(alert.batch_id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await removeBatchFromSale(
        alert.batch_id,
        `Retrait expiration - ${alert.product_name}`
      );

      setSuccessMessage("Lot retiré de la vente avec succès.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de retirer ce lot."
      );
    } finally {
      setIsRemoving(null);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <p className="font-semibold text-slate-500">
            Chargement des expirations...
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
            Créez une pharmacie avant de suivre les expirations.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm md:tracking-[0.2em]">
                {pharmacy.name}
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
                Expirations
              </h1>

              <p className="mt-1 text-xs text-slate-500 md:mt-2 md:text-sm">
                Lots expirés ou proches de l’expiration.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
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

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            title="Expirés"
            value={expiredCount.toString()}
            icon={<PackageX className="h-5 w-5 md:h-6 md:w-6" />}
            tone="red"
          />

          <MetricCard
            title="≤ 30 jours"
            value={expires30Count.toString()}
            icon={<ShieldAlert className="h-5 w-5 md:h-6 md:w-6" />}
            tone="orange"
          />

          <MetricCard
            title="≤ 60 jours"
            value={expires60Count.toString()}
            icon={<CalendarClock className="h-5 w-5 md:h-6 md:w-6" />}
            tone="amber"
          />

          <MetricCard
            title="≤ 90 jours"
            value={expires90Count.toString()}
            icon={<CalendarClock className="h-5 w-5 md:h-6 md:w-6" />}
            tone="blue"
          />
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-950 md:text-xl">
                Lots à surveiller
              </h2>

              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Les lots expirés ne doivent plus être vendus.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px] xl:w-[620px]">
              <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Produit, DCI, lot..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as ExpirationFilter)
                }
                className="form-input"
              >
                {filters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 xl:hidden">
            <MobilePagination
              page={safeMobilePage}
              totalPages={mobileTotalPages}
              totalItems={filteredAlerts.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() => setMobilePage((page) => Math.max(1, page - 1))}
              onNext={() =>
                setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
              }
            />

            {filteredAlerts.length === 0 ? (
              <EmptyState message="Aucun lot à surveiller." />
            ) : (
              mobileAlerts.map((alert) => (
                <MobileExpirationCard
                  key={alert.batch_id}
                  alert={alert}
                  isRemoving={isRemoving === alert.batch_id}
                  onRemove={() => handleRemoveBatch(alert)}
                />
              ))
            )}

            <MobilePagination
              page={safeMobilePage}
              totalPages={mobileTotalPages}
              totalItems={filteredAlerts.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() => setMobilePage((page) => Math.max(1, page - 1))}
              onNext={() =>
                setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
              }
            />
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Produit</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Jours restants</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Prix vente</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Action</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Aucun lot à surveiller.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr key={alert.batch_id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">
                            {alert.product_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {[alert.dosage, alert.form]
                              .filter(Boolean)
                              .join(" / ") ||
                              alert.generic_name ||
                              "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {alert.batch_number || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(alert.expiry_date)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-black text-slate-950">
                            {Number(alert.days_remaining || 0)}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-black text-slate-950">
                          {Number(alert.quantity_available || 0)}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {formatMoney(Number(alert.selling_price || 0))}
                        </td>

                        <td className="px-5 py-4">
                          <ExpirationStatusBadge
                            status={alert.expiration_status}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href="/stock"
                              className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
                            >
                              Stock
                            </Link>

                            <button
                              type="button"
                              disabled={isRemoving === alert.batch_id}
                              onClick={() => handleRemoveBatch(alert)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Ban className="h-4 w-4" />
                              {isRemoving === alert.batch_id
                                ? "Retrait..."
                                : "Retirer"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MobileExpirationCard({
  alert,
  isRemoving,
  onRemove,
}: {
  alert: ExpirationAlert;
  isRemoving: boolean;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
            Lot à surveiller
          </p>

          <h3 className="mt-1 line-clamp-2 text-sm font-black leading-5 text-slate-950">
            {alert.product_name}
          </h3>

          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
            {[alert.dosage, alert.form].filter(Boolean).join(" / ") ||
              alert.generic_name ||
              "-"}
          </p>
        </div>

        <ExpirationStatusBadge status={alert.expiration_status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniInfo label="Lot" value={alert.batch_number || "-"} />
        <MiniInfo label="Exp." value={formatDate(alert.expiry_date)} />
        <MiniInfo
          label="Jours"
          value={String(Number(alert.days_remaining || 0))}
          strong={alert.expiration_status === "expired"}
        />
        <MiniInfo
          label="Stock"
          value={String(Number(alert.quantity_available || 0))}
          strong
        />
        <MiniInfo
          label="Prix"
          value={formatMoney(Number(alert.selling_price || 0))}
        />
        <MiniInfo
          label="Risque"
          value={formatRiskText(alert.expiration_status)}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href="/stock"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
        >
          Voir stock
        </Link>

        <button
          type="button"
          disabled={isRemoving}
          onClick={onRemove}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Ban className="h-4 w-4" />
          {isRemoving ? "Retrait..." : "Retirer"}
        </button>
      </div>
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
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "red" | "orange" | "amber" | "blue";
}) {
  const toneClass = {
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm md:rounded-[2rem] md:p-5">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl md:mb-4 md:h-12 md:w-12 ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-500 md:text-sm">{title}</p>

      <p className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
        {value}
      </p>
    </div>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function ExpirationStatusBadge({ status }: { status: ExpirationStatus }) {
  const config: Record<ExpirationStatus, { label: string; className: string }> =
    {
      ok: {
        label: "OK",
        className: "border-emerald-100 bg-emerald-50 text-emerald-700",
      },
      expires_90_days: {
        label: "≤ 90 j",
        className: "border-blue-100 bg-blue-50 text-blue-700",
      },
      expires_60_days: {
        label: "≤ 60 j",
        className: "border-amber-100 bg-amber-50 text-amber-700",
      },
      expires_30_days: {
        label: "≤ 30 j",
        className: "border-orange-100 bg-orange-50 text-orange-700",
      },
      expired: {
        label: "Expiré",
        className: "border-red-100 bg-red-50 text-red-700",
      },
    };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-black md:px-3 md:text-xs ${config[status].className}`}
    >
      {config[status].label}
    </span>
  );
}

function formatRiskText(status: ExpirationStatus) {
  const labels: Record<ExpirationStatus, string> = {
    ok: "OK",
    expires_90_days: "Surveiller",
    expires_60_days: "Attention",
    expires_30_days: "Critique",
    expired: "Interdit",
  };

  return labels[status] ?? status;
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("fr-CD")} CDF`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}
