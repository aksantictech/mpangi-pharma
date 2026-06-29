"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
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

  const filteredAlerts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesFilter =
        filter === "all" || alert.expiration_status === filter;

      const searchValue = [
        alert.product_name,
        alert.generic_name,
        alert.dosage,
        alert.form,
        alert.batch_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalized || searchValue.includes(normalized);

      return matchesFilter && matchesSearch;
    });
  }, [alerts, search, filter]);

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
      `Retirer le lot "${alert.batch_number || "-"}" de ${alert.product_name} ? Cette action mettra la quantité disponible à zéro.`
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
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement des expirations...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-800">
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
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                {pharmacy.name}
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Expirations
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Suivi des lots expirés ou proches de l’expiration.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            {successMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard
            title="Lots expirés"
            value={expiredCount.toString()}
            icon={<PackageX className="h-6 w-6" />}
            tone="red"
          />

          <MetricCard
            title="À 30 jours"
            value={expires30Count.toString()}
            icon={<ShieldAlert className="h-6 w-6" />}
            tone="orange"
          />

          <MetricCard
            title="À 60 jours"
            value={expires60Count.toString()}
            icon={<CalendarClock className="h-6 w-6" />}
            tone="amber"
          />

          <MetricCard
            title="À 90 jours"
            value={expires90Count.toString()}
            icon={<CalendarClock className="h-6 w-6" />}
            tone="blue"
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Lots à surveiller
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Les lots expirés ne doivent plus être vendus.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-80">
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
                className="form-input md:w-52"
              >
                {filters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
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
                          {alert.expiry_date}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-black text-slate-950">
                            {Number(alert.days_remaining)}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-black text-slate-950">
                          {Number(alert.quantity_available)}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {Number(alert.selling_price).toLocaleString("fr-CD")}{" "}
                          CDF
                        </td>

                        <td className="px-5 py-4">
                          <ExpirationStatusBadge
                            status={alert.expiration_status}
                          />
                        </td>

                        <td className="px-5 py-4">
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

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: "red" | "orange" | "amber" | "blue";
}) {
  const toneClass = {
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
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
        label: "≤ 90 jours",
        className: "border-blue-100 bg-blue-50 text-blue-700",
      },
      expires_60_days: {
        label: "≤ 60 jours",
        className: "border-amber-100 bg-amber-50 text-amber-700",
      },
      expires_30_days: {
        label: "≤ 30 jours",
        className: "border-orange-100 bg-orange-50 text-orange-700",
      },
      expired: {
        label: "Expiré",
        className: "border-red-100 bg-red-50 text-red-700",
      },
    };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${config[status].className}`}
    >
      {config[status].label}
    </span>
  );
}