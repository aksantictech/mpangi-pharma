"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  RefreshCcw,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
 
import { getAuditLogs } from "@/services/audit.service";
import {
  getCurrentPharmacy,
  isCurrentUserPlatformAdmin,
} from "@/services/pharmacies.service";
import { canViewAudit } from "@/lib/permissions";
import type { AuditLog } from "@/types/audit";
import type { PharmacyWithRole } from "@/types/pharmacy";

export default function AuditPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] =
  useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadAuditLogs() {
    setIsLoading(true);
    setErrorMessage("");

    try {
const [
  currentPharmacy,
  platformAdminStatus,
] = await Promise.all([
  getCurrentPharmacy(),
  isCurrentUserPlatformAdmin(),
]);

setIsPlatformAdmin(platformAdminStatus);

if (!currentPharmacy) {
  setPharmacy(null);
  setLogs([]);
  return;
}

setPharmacy(currentPharmacy);

if (
  !canViewAudit(
    currentPharmacy.role,
    platformAdminStatus
  )
) {
  setLogs([]);
  setErrorMessage(
    "Accès réservé au super administrateur."
  );
  return;
}

      const auditData = await getAuditLogs(currentPharmacy.id, 150);
      setLogs(auditData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le journal d’audit."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return logs;

    return logs.filter((log) => {
      const haystack = [
        log.action,
        log.entity_type,
        log.actor_email,
        log.entity_id,
        log.created_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [logs, searchTerm]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
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
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-800">
            Aucune pharmacie active
          </h1>
          <p className="mt-2 text-sm font-medium text-amber-700">
            Sélectionnez une pharmacie pour consulter le journal d’audit.
          </p>
        </div>
      </main>
    );
  }

  const canReadAudit = canViewAudit(
  pharmacy.role,
  isPlatformAdmin
);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                Sécurité
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Journal d’audit
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Historique des actions sensibles pour {pharmacy.name}.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAuditLogs}
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

        {!canReadAudit ? (
          <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
            <div className="flex items-start gap-4">
              <ShieldCheck className="h-8 w-8 text-amber-700" />
              <div>
                <h2 className="text-xl font-black text-amber-900">
                  Accès limité
                </h2>
                <p className="mt-2 text-sm leading-6 text-amber-700">
                  Le journal d’audit est réservé au super administrateur de la plateforme.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <AuditMetric
                title="Actions enregistrées"
                value={logs.length.toString()}
                icon={<Activity className="h-6 w-6" />}
              />

              <AuditMetric
                title="Utilisateurs actifs"
                value={
                  new Set(logs.map((log) => log.actor_email).filter(Boolean))
                    .size.toString()
                }
                icon={<User className="h-6 w-6" />}
              />

              <AuditMetric
                title="Tables touchées"
                value={
                  new Set(logs.map((log) => log.entity_type).filter(Boolean))
                    .size.toString()
                }
                icon={<Database className="h-6 w-6" />}
              />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Dernières actions
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Les 150 derniers événements enregistrés.
                  </p>
                </div>

                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="form-input pl-12"
                    placeholder="Rechercher action, utilisateur..."
                  />
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
                  Aucun événement trouvé.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Entité</TableHead>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <TableCell>{formatDate(log.created_at)}</TableCell>

                            <TableCell>
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                {formatAction(log.action)}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="font-bold text-slate-700">
                                {formatEntityType(log.entity_type)}
                              </span>
                            </TableCell>

                            <TableCell>
                              {log.actor_email || "Système / service role"}
                            </TableCell>

                            <TableCell>
                              <span className="font-mono text-xs text-slate-500">
                                {log.entity_id || "-"}
                              </span>
                            </TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
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
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">
      {children}
    </td>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAction(action: string) {
  const labels: Record<string, string> = {
    "pharmacies.created": "Pharmacie créée",
    "pharmacies.updated": "Pharmacie modifiée",
    "pharmacy_settings.updated": "Paramètres modifiés",
    "pharmacy_members.created": "Utilisateur ajouté",
    "pharmacy_members.updated": "Utilisateur modifié",
    "products.created": "Produit créé",
    "products.updated": "Produit modifié",
    "product_batches.created": "Lot ajouté",
    "product_batches.updated": "Lot modifié",
    "stock_movements.created": "Mouvement stock",
    "sales.created": "Vente créée",
    "sales.updated": "Vente modifiée",
    "expenses.created": "Dépense créée",
    "expenses.updated": "Dépense modifiée",
  };

  return labels[action] ?? action;
}

function formatEntityType(entityType: string) {
  const labels: Record<string, string> = {
    pharmacies: "Pharmacies",
    pharmacy_settings: "Paramètres",
    pharmacy_members: "Utilisateurs",
    product_categories: "Catégories",
    suppliers: "Fournisseurs",
    products: "Produits",
    product_batches: "Lots",
    stock_movements: "Stock",
    customers: "Clients",
    sales: "Ventes",
    expenses: "Dépenses",
  };

  return labels[entityType] ?? entityType;
}