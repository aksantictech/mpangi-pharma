"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Eye,
  LogIn,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import { canViewAudit } from "@/lib/permissions";
import {
  calculateAuditMetrics,
  exportAuditCsv,
  getAuditActivities,
  getAuditPharmacies,
} from "@/services/audit.service";
import {
  getCurrentPharmacy,
  isCurrentUserPlatformAdmin,
} from "@/services/pharmacies.service";

import type {
  AuditActivity,
  AuditMetrics,
  AuditPharmacyOption,
} from "@/types/audit";
import type { PharmacyWithRole } from "@/types/pharmacy";

const PAGE_SIZE = 50;

const EVENT_OPTIONS: Array<[string, string]> = [
  ["all", "Tous les événements"],
  ["login_success", "Connexion réussie"],
  ["login_failed", "Connexion échouée"],
  ["logout", "Déconnexion"],
  ["password_changed", "Mot de passe modifié"],
  ["password_reset_requested", "Réinitialisation demandée"],
  ["password_reset_completed", "Réinitialisation terminée"],
  ["pharmacies.created", "Pharmacie créée"],
  ["pharmacies.updated", "Pharmacie modifiée"],
  ["pharmacy_settings.updated", "Paramètres modifiés"],
  ["pharmacy_members.created", "Utilisateur ajouté"],
  ["pharmacy_members.updated", "Utilisateur modifié"],
  ["products.created", "Produit créé"],
  ["products.updated", "Produit modifié"],
  ["product_batches.created", "Lot ajouté"],
  ["product_batches.updated", "Lot modifié"],
  ["stock_movements.created", "Mouvement de stock"],
  ["sales.created", "Vente créée"],
  ["sales.updated", "Vente modifiée"],
  ["expenses.created", "Dépense créée"],
  ["expenses.updated", "Dépense modifiée"],
];

const MODULE_OPTIONS: Array<[string, string]> = [
  ["all", "Tous les modules"],
  ["authentification", "Authentification"],
  ["utilisateurs", "Utilisateurs"],
  ["pharmacies", "Pharmacies"],
  ["produits", "Produits"],
  ["stock", "Stock"],
  ["ventes", "Ventes"],
  ["factures", "Factures"],
  ["finances", "Finances"],
  ["parametres", "Paramètres"],
  ["sauvegardes", "Sauvegardes"],
  ["systeme", "Système"],
];

export default function AuditPage() {
  const [pharmacy, setPharmacy] =
    useState<PharmacyWithRole | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [logs, setLogs] = useState<AuditActivity[]>([]);
  const [pharmacies, setPharmacies] = useState<
    AuditPharmacyOption[]
  >([]);

  const [metrics, setMetrics] = useState<AuditMetrics>({
    totalEvents: 0,
    successfulLogins: 0,
    failedLogins: 0,
    activeUsers: 0,
    activePharmacies: 0,
  });

  const [selectedLog, setSelectedLog] =
    useState<AuditActivity | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [pharmacyId, setPharmacyId] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [moduleName, setModuleName] = useState("all");
  const [source, setSource] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [success, setSuccess] = useState<
    "all" | "success" | "failed"
  >("all");

  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canReadAudit = Boolean(
    pharmacy &&
      canViewAudit(pharmacy.role, isPlatformAdmin)
  );

  async function initializeAuditPage() {
    setIsInitializing(true);
    setErrorMessage("");

    try {
      const [currentPharmacy, platformAdminStatus] =
        await Promise.all([
          getCurrentPharmacy(),
          isCurrentUserPlatformAdmin(),
        ]);

      setPharmacy(currentPharmacy);
      setIsPlatformAdmin(platformAdminStatus);

      if (
        !currentPharmacy ||
        !canViewAudit(
          currentPharmacy.role,
          platformAdminStatus
        )
      ) {
        setLogs([]);
        return;
      }

      const pharmacyOptions = await getAuditPharmacies();
      setPharmacies(pharmacyOptions);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsInitializing(false);
    }
  }

  async function loadAuditLogs() {
    if (!canReadAudit) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getAuditActivities({
        pharmacyId,
        eventType,
        moduleName,
        source,
        severity,
        success,
        startDate,
        endDate,
        search: searchTerm,
        page,
        pageSize: PAGE_SIZE,
      });

      setLogs(result.rows);
      setCount(result.count);
      setTotalPages(result.totalPages);
      setMetrics(calculateAuditMetrics(result.rows));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setLogs([]);
      setCount(0);
      setTotalPages(1);
      setMetrics({
        totalEvents: 0,
        successfulLogins: 0,
        failedLogins: 0,
        activeUsers: 0,
        activePharmacies: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void initializeAuditPage();
  }, []);

  useEffect(() => {
    if (!canReadAudit) return;

    void loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canReadAudit,
    pharmacyId,
    eventType,
    moduleName,
    source,
    severity,
    success,
    startDate,
    endDate,
    page,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    pharmacyId,
    eventType,
    moduleName,
    source,
    severity,
    success,
    startDate,
    endDate,
    searchTerm,
  ]);

  const topPharmacies = useMemo(() => {
    const totals = new Map<string, number>();

    logs.forEach((log) => {
      const name = log.pharmacy_name || "Plateforme";
      totals.set(name, (totals.get(name) ?? 0) + 1);
    });

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [logs]);

  function resetFilters() {
    const range = getCurrentMonthRange();

    setSearchTerm("");
    setPharmacyId("all");
    setEventType("all");
    setModuleName("all");
    setSource("all");
    setSeverity("all");
    setSuccess("all");
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setPage(1);
  }

  if (isInitializing) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement du journal d’audit...
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
            Aucune pharmacie active
          </h1>
          <p className="mt-2 text-sm font-medium text-amber-700">
            Sélectionnez une pharmacie pour consulter le journal
            d’audit.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                Sécurité et traçabilité
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Journal d’audit
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Suivi des connexions, modifications et actions
                sensibles réalisées dans les pharmacies.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => exportAuditCsv(logs)}
                disabled={logs.length === 0}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                Exporter CSV
              </button>

              <button
                type="button"
                onClick={() => void loadAuditLogs()}
                disabled={isLoading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                <RefreshCcw
                  className={`h-5 w-5 ${
                    isLoading ? "animate-spin" : ""
                  }`}
                />
                Actualiser
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

        {!canReadAudit ? (
          <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
            <div className="flex items-start gap-4">
              <ShieldCheck className="h-8 w-8 text-amber-700" />

              <div>
                <h2 className="text-xl font-black text-amber-900">
                  Accès limité
                </h2>

                <p className="mt-2 text-sm leading-6 text-amber-700">
                  Le journal d’audit est réservé au super
                  administrateur de la plateforme.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              <AuditMetric
                title="Événements"
                value={metrics.totalEvents.toString()}
                icon={<Activity className="h-6 w-6" />}
              />

              <AuditMetric
                title="Connexions réussies"
                value={metrics.successfulLogins.toString()}
                icon={<LogIn className="h-6 w-6" />}
              />

              <AuditMetric
                title="Échecs de connexion"
                value={metrics.failedLogins.toString()}
                icon={<ShieldAlert className="h-6 w-6" />}
              />

              <AuditMetric
                title="Utilisateurs actifs"
                value={metrics.activeUsers.toString()}
                icon={<User className="h-6 w-6" />}
              />

              <AuditMetric
                title="Pharmacies actives"
                value={metrics.activePharmacies.toString()}
                icon={<Building2 className="h-6 w-6" />}
              />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <FilterSelect
                  label="Pharmacie"
                  value={pharmacyId}
                  onChange={setPharmacyId}
                  options={[
                    ["all", "Toutes les pharmacies"],
                    ...pharmacies.map(
                      (item) =>
                        [item.id, item.name] as [string, string]
                    ),
                  ]}
                />

                <FilterSelect
                  label="Événement"
                  value={eventType}
                  onChange={setEventType}
                  options={EVENT_OPTIONS}
                />

                <FilterSelect
                  label="Module"
                  value={moduleName}
                  onChange={setModuleName}
                  options={MODULE_OPTIONS}
                />

                <FilterSelect
                  label="Source"
                  value={source}
                  onChange={setSource}
                  options={[
                    ["all", "Toutes les sources"],
                    ["auth", "Connexions"],
                    ["audit", "Actions applicatives"],
                  ]}
                />

                <FilterSelect
                  label="Résultat"
                  value={success}
                  onChange={(value) =>
                    setSuccess(
                      value as "all" | "success" | "failed"
                    )
                  }
                  options={[
                    ["all", "Tous les résultats"],
                    ["success", "Réussi"],
                    ["failed", "Échec"],
                  ]}
                />

                <FilterSelect
                  label="Gravité"
                  value={severity}
                  onChange={setSeverity}
                  options={[
                    ["all", "Toutes les gravités"],
                    ["info", "Information"],
                    ["warning", "Avertissement"],
                    ["critical", "Critique"],
                  ]}
                />

                <DateField
                  label="Du"
                  value={startDate}
                  onChange={setStartDate}
                />

                <DateField
                  label="Au"
                  value={endDate}
                  onChange={setEndDate}
                />
              </div>

              <div className="mt-3 flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void loadAuditLogs();
                      }
                    }}
                    className="form-input pl-12"
                    placeholder="Utilisateur, pharmacie, action, produit..."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void loadAuditLogs()}
                  className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
                >
                  Rechercher
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
                >
                  Réinitialiser
                </button>
              </div>
            </section>

            {topPharmacies.length > 0 && (
              <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">
                  Pharmacies les plus actives
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Classement calculé sur les événements de la page
                  courante.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                  {topPharmacies.map(([name, total]) => (
                    <div
                      key={name}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <p className="line-clamp-1 text-sm font-black text-slate-900">
                        {name}
                      </p>

                      <p className="mt-2 text-2xl font-black text-blue-700">
                        {total}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Événements détaillés
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {count.toLocaleString("fr-CD")} événement(s),
                    {` ${PAGE_SIZE} `}par page.
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                  Chargement des événements...
                </div>
              ) : logs.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                  Aucun événement trouvé.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px] divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <TableHead>Date</TableHead>
                          <TableHead>Pharmacie</TableHead>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Événement</TableHead>
                          <TableHead>Module</TableHead>
                          <TableHead>Résultat</TableHead>
                          <TableHead>Adresse IP</TableHead>
                          <TableHead>Détail</TableHead>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 bg-white">
                        {logs.map((log) => (
                          <tr
                            key={`${log.source}-${log.id}`}
                            className="hover:bg-slate-50"
                          >
                            <TableCell>
                              {formatDate(log.created_at)}
                            </TableCell>

                            <TableCell>
                              {log.pharmacy_name || "Plateforme"}
                            </TableCell>

                            <TableCell>
                              {log.actor_email ||
                                "Système / service"}
                            </TableCell>

                            <TableCell>
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                {formatEvent(log.event_type)}
                              </span>
                            </TableCell>

                            <TableCell>
                              {formatModule(log.module_name)}
                            </TableCell>

                            <TableCell>
                              <StatusBadge
                                success={log.success}
                                severity={log.severity}
                              />
                            </TableCell>

                            <TableCell>
                              {log.ip_address || "-"}
                            </TableCell>

                            <TableCell>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedLog(log)
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4" />
                                Voir
                              </button>
                            </TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((value) =>
                      Math.max(1, value - 1)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </button>

                <p className="text-sm font-bold text-slate-600">
                  Page {page} sur {totalPages}
                </p>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((value) =>
                      Math.min(totalPages, value + 1)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      {selectedLog && (
        <AuditDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </main>
  );
}

function AuditMetric({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 md:h-12 md:w-12">
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-500 md:text-sm">
        {title}
      </p>

      <p className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
        {value}
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input bg-white"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase text-slate-500">
        {label}
      </span>

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input bg-white"
      />
    </label>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">
      {children}
    </td>
  );
}

function StatusBadge({
  success,
  severity,
}: {
  success: boolean;
  severity: string;
}) {
  if (!success) {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
        Échec
      </span>
    );
  }

  if (severity === "critical") {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
        Critique
      </span>
    );
  }

  if (severity === "warning") {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
        Avertissement
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
      Réussi
    </span>
  );
}

function AuditDetailsModal({
  log,
  onClose,
}: {
  log: AuditActivity;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-blue-700">
              Détail de l’événement
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {formatEvent(log.event_type)}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Detail
            label="Date"
            value={formatDate(log.created_at)}
          />
          <Detail
            label="Pharmacie"
            value={log.pharmacy_name || "Plateforme"}
          />
          <Detail
            label="Utilisateur"
            value={log.actor_email || "Système"}
          />
          <Detail
            label="Module"
            value={formatModule(log.module_name)}
          />
          <Detail
            label="Entité"
            value={log.entity_label || log.entity_type}
          />
          <Detail
            label="Adresse IP"
            value={log.ip_address || "-"}
          />
          <Detail
            label="Source"
            value={log.source}
          />
          <Detail
            label="Résultat"
            value={log.success ? "Réussi" : "Échec"}
          />
        </div>

        {log.description && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Description
            </p>

            <p className="mt-2 text-sm text-slate-700">
              {log.description}
            </p>
          </div>
        )}

        <JsonBlock
          title="Anciennes valeurs"
          value={log.old_values}
        />

        <JsonBlock
          title="Nouvelles valeurs"
          value={log.new_values}
        />

        <JsonBlock
          title="Métadonnées"
          value={log.metadata}
        />

        {log.user_agent && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Navigateur / appareil
            </p>

            <p className="mt-2 break-all text-sm text-slate-700">
              {log.user_agent}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function JsonBlock({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | null;
}) {
  if (!value || Object.keys(value).length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-black text-slate-900">
        {title}
      </h3>

      <pre className="mt-2 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatEvent(value: string) {
  const labels: Record<string, string> = {
    login_success: "Connexion réussie",
    login_failed: "Connexion échouée",
    logout: "Déconnexion",
    password_changed: "Mot de passe modifié",
    password_reset_requested: "Réinitialisation demandée",
    password_reset_completed: "Réinitialisation terminée",
    "pharmacies.created": "Pharmacie créée",
    "pharmacies.updated": "Pharmacie modifiée",
    "pharmacy_settings.updated": "Paramètres modifiés",
    "pharmacy_members.created": "Utilisateur ajouté",
    "pharmacy_members.updated": "Utilisateur modifié",
    "products.created": "Produit créé",
    "products.updated": "Produit modifié",
    "product_batches.created": "Lot ajouté",
    "product_batches.updated": "Lot modifié",
    "stock_movements.created": "Mouvement de stock",
    "sales.created": "Vente créée",
    "sales.updated": "Vente modifiée",
    "expenses.created": "Dépense créée",
    "expenses.updated": "Dépense modifiée",
  };

  return labels[value] ?? value;
}

function formatModule(value: string) {
  const labels: Record<string, string> = {
    authentification: "Authentification",
    utilisateurs: "Utilisateurs",
    pharmacies: "Pharmacies",
    produits: "Produits",
    stock: "Stock",
    ventes: "Ventes",
    factures: "Factures",
    finances: "Finances",
    parametres: "Paramètres",
    sauvegardes: "Sauvegardes",
    systeme: "Système",
  };

  return labels[value] ?? value;
}

function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  );

  return {
    startDate: toDateInput(start),
    endDate: toDateInput(end),
  };
}

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Impossible de charger le journal d’audit.";
}
