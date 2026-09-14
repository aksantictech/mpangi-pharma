"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  Database,
  PackageSearch,
  PowerOff,
  ShieldCheck,
  Users,
} from "lucide-react";

import { getAdminPharmacies } from "@/services/admin-pharmacies.service";

import type { AdminOverview, AdminPharmacy } from "@/types/admin";

type ModuleCard = {
  href: string;
  icon: typeof Building2;
  title: string;
  description: string;
  tone: string;
};

const modules: ModuleCard[] = [
  {
    href: "/admin/pharmacies",
    icon: Building2,
    title: "Pharmacies",
    description:
      "Créer, modifier, désactiver, archiver ou supprimer les pharmacies clientes.",
    tone: "bg-blue-50 text-blue-700",
  },
  {
    href: "/admin/catalogue-produits",
    icon: Database,
    title: "Catalogue national RDC",
    description: "Référentiel ACOREP 2026 partagé par toutes les pharmacies.",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    href: "/admin/securite",
    icon: ShieldCheck,
    title: "Sécurité & audit",
    description: "Journal d’activité, connexions et événements sensibles.",
    tone: "bg-violet-50 text-violet-700",
  },
  {
    href: "/admin/stabilite",
    icon: Activity,
    title: "Paramètres système",
    description: "Santé technique de la plateforme et diagnostics.",
    tone: "bg-amber-50 text-amber-700",
  },
];

const emptyOverview: AdminOverview = {
  totalPharmacies: 0,
  activePharmacies: 0,
  inactivePharmacies: 0,
  archivedPharmacies: 0,
  totalMembers: 0,
  totalProducts: 0,
  salesLast30d: 0,
};

function getPharmacyStatus(pharmacy: AdminPharmacy) {
  if (pharmacy.archived_at) return "archived" as const;
  if (!pharmacy.is_active) return "inactive" as const;
  return "active" as const;
}

export default function AdminHomePage() {
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([]);
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await getAdminPharmacies();

        if (!isMounted) return;

        setPharmacies(data);

        const next = data.reduce<AdminOverview>((accumulator, pharmacy) => {
          const isArchived = Boolean(pharmacy.archived_at);
          const isActive = pharmacy.is_active && !isArchived;

          return {
            totalPharmacies: accumulator.totalPharmacies + 1,
            activePharmacies: accumulator.activePharmacies + (isActive ? 1 : 0),
            inactivePharmacies:
              accumulator.inactivePharmacies +
              (!pharmacy.is_active && !isArchived ? 1 : 0),
            archivedPharmacies:
              accumulator.archivedPharmacies + (isArchived ? 1 : 0),
            totalMembers: accumulator.totalMembers + pharmacy.health.activeMembers,
            totalProducts:
              accumulator.totalProducts + pharmacy.health.productsCount,
            salesLast30d: accumulator.salesLast30d + pharmacy.health.salesLast30d,
          };
        }, emptyOverview);

        setOverview(next);
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger la santé des pharmacies."
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const kpis = useMemo(
    () => [
      {
        icon: Building2,
        label: "Pharmacies actives",
        value: overview.activePharmacies,
        hint: `${overview.totalPharmacies} au total`,
        tone: "bg-blue-50 text-blue-700",
      },
      {
        icon: Users,
        label: "Membres actifs",
        value: overview.totalMembers,
        hint: "Tous rôles confondus",
        tone: "bg-purple-50 text-purple-700",
      },
      {
        icon: PackageSearch,
        label: "Produits référencés",
        value: overview.totalProducts,
        hint: "Toutes pharmacies",
        tone: "bg-emerald-50 text-emerald-700",
      },
      {
        icon: Activity,
        label: "Ventes (30 derniers jours)",
        value: overview.salesLast30d,
        hint: "Toutes pharmacies",
        tone: "bg-amber-50 text-amber-700",
      },
    ],
    [overview]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
          Tableau de bord plateforme
        </p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
          Vue d’ensemble
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Santé et configuration des pharmacies clientes Mpangi_Pharma. Cet
          espace ne donne pas accès au stock, aux ventes ou à l’impression
          d’une pharmacie — utilisez « Espace pharmacie » pour cela.
        </p>
      </header>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* KPI */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${kpi.tone}`}
            >
              <kpi.icon className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-black text-slate-950 md:text-3xl">
              {isLoading ? "…" : kpi.value}
            </p>

            <p className="mt-1 text-xs font-bold text-slate-500">
              {kpi.label}
            </p>

            <p className="text-[11px] font-medium text-slate-400">
              {kpi.hint}
            </p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Santé de la plateforme */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6 lg:col-span-2">
          <h2 className="text-lg font-black text-slate-950">
            Santé de la plateforme
          </h2>

          <div className="mt-4 space-y-2">
            <HealthRow
              label="Connexion Supabase"
              status={errorMessage ? "down" : isLoading ? "checking" : "ok"}
            />
            <HealthRow
              label="Base de données"
              status={errorMessage ? "down" : isLoading ? "checking" : "ok"}
            />
            <HealthRow
              label="Pharmacies désactivées"
              status={overview.inactivePharmacies > 0 ? "warning" : "ok"}
              hint={
                overview.inactivePharmacies > 0
                  ? `${overview.inactivePharmacies} pharmacie(s)`
                  : "Aucune"
              }
            />
            <HealthRow
              label="Pharmacies archivées"
              status={overview.archivedPharmacies > 0 ? "info" : "ok"}
              hint={
                overview.archivedPharmacies > 0
                  ? `${overview.archivedPharmacies} pharmacie(s)`
                  : "Aucune"
              }
            />
          </div>
        </section>

        {/* Situation des pharmacies */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">
              Situation des pharmacies
            </h2>

            <Link
              href="/admin/pharmacies"
              className="text-xs font-black text-blue-700 hover:text-blue-800"
            >
              Gérer →
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-3">Pharmacie</th>
                  <th className="pb-2 pr-3">Statut</th>
                  <th className="pb-2 pr-3">Membres</th>
                  <th className="pb-2">Ventes 30j</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-400">
                      Chargement...
                    </td>
                  </tr>
                ) : pharmacies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-400">
                      Aucune pharmacie.
                    </td>
                  </tr>
                ) : (
                  pharmacies.slice(0, 8).map((pharmacy) => {
                    const status = getPharmacyStatus(pharmacy);

                    return (
                      <tr
                        key={pharmacy.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="py-2.5 pr-3 font-bold text-slate-950">
                          {pharmacy.name}
                        </td>
                        <td className="py-2.5 pr-3">
                          <StatusPill status={status} />
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600">
                          {pharmacy.health.activeMembers}
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {pharmacy.health.salesLast30d}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modules */}
      <section>
        <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Modules
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:rounded-[2rem]"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${module.tone}`}
              >
                <module.icon className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-black text-slate-950">
                {module.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {module.description}
              </p>

              <span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-blue-700 group-hover:text-blue-800">
                Ouvrir →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function HealthRow({
  label,
  status,
  hint,
}: {
  label: string;
  status: "ok" | "warning" | "down" | "checking" | "info";
  hint?: string;
}) {
  const pill = {
    ok: {
      text: "Opérationnel",
      className: "bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    },
    warning: {
      text: "À surveiller",
      className: "bg-amber-50 text-amber-700",
      icon: AlertTriangle,
    },
    down: {
      text: "Indisponible",
      className: "bg-red-50 text-red-700",
      icon: AlertTriangle,
    },
    checking: {
      text: "Vérification...",
      className: "bg-slate-100 text-slate-500",
      icon: Activity,
    },
    info: {
      text: "Info",
      className: "bg-slate-100 text-slate-600",
      icon: Archive,
    },
  }[status];

  const Icon = pill.icon;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>

      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${pill.className}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {pill.text}
      </span>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: "active" | "inactive" | "archived";
}) {
  if (status === "archived") {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
        Archivée
      </span>
    );
  }

  if (status === "inactive") {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
        <PowerOff className="mr-1 inline h-3 w-3" />
        Désactivée
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
      Active
    </span>
  );
}
