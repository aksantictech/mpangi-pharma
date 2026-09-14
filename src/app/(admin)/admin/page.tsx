"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Building2,
  Database,
  PackageSearch,
  PowerOff,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { getAdminPharmacies } from "@/services/admin-pharmacies.service";

import type { AdminOverview } from "@/types/admin";

type ModuleCard = {
  href: string;
  icon: typeof Building2;
  title: string;
  description: string;
  accent: string;
};

const modules: ModuleCard[] = [
  {
    href: "/admin/pharmacies",
    icon: Building2,
    title: "Pharmacies",
    description:
      "Créer, modifier, désactiver, archiver ou supprimer les pharmacies clientes.",
    accent: "from-blue-600 to-blue-500",
  },
  {
    href: "/admin/catalogue-produits",
    icon: Database,
    title: "Catalogue national RDC",
    description: "Référentiel ACOREP 2026 partagé par toutes les pharmacies.",
    accent: "from-emerald-600 to-emerald-500",
  },
  {
    href: "/parametres/audit-securite",
    icon: ShieldCheck,
    title: "Sécurité & audit",
    description: "Journal d’activité, connexions et événements sensibles.",
    accent: "from-violet-600 to-violet-500",
  },
  {
    href: "/parametres/stabilite",
    icon: Activity,
    title: "Stabilité système",
    description: "Santé technique de la plateforme et diagnostics.",
    accent: "from-amber-600 to-amber-500",
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

export default function AdminHomePage() {
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const pharmacies = await getAdminPharmacies();

        if (!isMounted) return;

        const next = pharmacies.reduce<AdminOverview>(
          (accumulator, pharmacy) => {
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
          },
          emptyOverview
        );

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

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const healthTiles = useMemo<
    Array<{
      icon: typeof Building2;
      label: string;
      value: number;
      total?: number;
      tone: string;
    }>
  >(
    () => [
      {
        icon: Building2,
        label: "Pharmacies actives",
        value: overview.activePharmacies,
        total: overview.totalPharmacies,
        tone: "text-emerald-300",
      },
      {
        icon: PowerOff,
        label: "Désactivées",
        value: overview.inactivePharmacies,
        tone: "text-amber-300",
      },
      {
        icon: Archive,
        label: "Archivées",
        value: overview.archivedPharmacies,
        tone: "text-slate-300",
      },
      {
        icon: Users,
        label: "Membres actifs",
        value: overview.totalMembers,
        tone: "text-blue-300",
      },
      {
        icon: PackageSearch,
        label: "Produits référencés",
        value: overview.totalProducts,
        tone: "text-blue-300",
      },
      {
        icon: Activity,
        label: "Ventes (30 derniers jours)",
        value: overview.salesLast30d,
        tone: "text-blue-300",
      },
    ],
    [overview]
  );

  return (
    <section className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <h2 className="mt-6 text-3xl font-black">
          Espace Super Admin Aksantic
        </h2>

        <p className="mt-3 max-w-2xl text-white/60">
          Vue d’ensemble et configuration de la plateforme : santé des
          pharmacies clientes, catalogue national et sécurité. Cet espace ne
          donne pas accès au stock, aux ventes ou à l’impression d’une
          pharmacie — utilisez « Espace pharmacie » pour cela.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          {errorMessage}
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-white/40">
          <Sparkles className="h-4 w-4" />
          Santé de la plateforme
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {healthTiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
            >
              <tile.icon className={`h-5 w-5 ${tile.tone}`} />

              <p className="mt-3 text-2xl font-black">
                {isLoading ? "…" : tile.value}
                {tile.total !== undefined && !isLoading ? (
                  <span className="text-sm font-bold text-white/40">
                    {" "}
                    / {tile.total}
                  </span>
                ) : null}
              </p>

              <p className="mt-1 text-xs font-bold text-white/50">
                {tile.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-white/40">
          Modules
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group flex flex-col rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br ${module.accent} text-white shadow-lg`}
              >
                <module.icon className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-lg font-black">{module.title}</h3>

              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {module.description}
              </p>

              <span className="mt-4 text-xs font-black uppercase tracking-wide text-blue-400 group-hover:text-blue-300">
                Ouvrir →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
