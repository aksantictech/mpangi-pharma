"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Building2,
  DatabaseBackup,
  History,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  getCurrentPharmacy,
  isCurrentUserPlatformAdmin,
} from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { LucideIcon } from "lucide-react";

type SettingsCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  superAdminOnly?: boolean;
};

const cards: SettingsCard[] = [
  {
    href: "/parametres/general",
    title: "Ma pharmacie",
    description:
      "Modifier le logo, les coordonnées, le pharmacien responsable, la facturation et les règles de gestion.",
    icon: Building2,
    tone: "blue",
  },
  {
    href: "/parametres/utilisateurs",
    title: "Utilisateurs de ma pharmacie",
    description:
      "Voir, ajouter, modifier, désactiver et réinitialiser les accès des utilisateurs liés à la pharmacie active.",
    icon: Users,
    tone: "purple",
  },
  {
    href: "/parametres/audit-securite",
    title: "Audit & sécurité",
    description:
      "Contrôler les accès sensibles, la sécurité et les opérations administratives.",
    icon: ShieldCheck,
    tone: "amber",
    superAdminOnly: true,
  },
  {
    href: "/audit",
    title: "Journal des modifications",
    description:
      "Consulter l’historique global des opérations et des changements sensibles.",
    icon: History,
    tone: "slate",
    superAdminOnly: true,
  },
  {
    href: "/sauvegardes",
    title: "Sauvegardes",
    description:
      "Exporter les données critiques et administrer la continuité de service.",
    icon: DatabaseBackup,
    tone: "emerald",
    superAdminOnly: true,
  },
  {
    href: "/parametres/stabilite",
    title: "État de l’application",
    description:
      "Vérifier la PWA, le stockage local, le service worker et la connexion Supabase.",
    icon: Activity,
    tone: "rose",
    superAdminOnly: true,
  },
];

export default function SettingsHomePage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAccess() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [currentPharmacy, platformAdmin] = await Promise.all([
          getCurrentPharmacy(),
          isCurrentUserPlatformAdmin(),
        ]);

        if (!isMounted) return;

        setPharmacy(currentPharmacy);
        setIsPlatformAdmin(platformAdmin);
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de vérifier vos autorisations."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleCards = useMemo(
    () =>
      cards.filter((card) => {
        if (card.superAdminOnly) {
          return isPlatformAdmin;
        }

        return (
          isPlatformAdmin ||
          pharmacy?.role === "owner" ||
          pharmacy?.role === "manager"
        );
      }),
    [isPlatformAdmin, pharmacy?.role]
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Vérification des autorisations...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 md:h-14 md:w-14">
              <Settings className="h-6 w-6 md:h-7 md:w-7" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm">
                Centre de configuration
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                Paramètres
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {isPlatformAdmin
                  ? "Administration complète de Mpangi_Pharma, des pharmacies, de la sécurité et des sauvegardes."
                  : `Administration limitée à ${
                      pharmacy?.name || "votre pharmacie"
                    } et à ses utilisateurs.`}
              </p>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {!isPlatformAdmin && !pharmacy && (
          <section className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 md:rounded-[2rem] md:p-6">
            <h2 className="text-lg font-black text-amber-900">
              Aucune pharmacie active
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-700">
              Votre compte doit être propriétaire ou gérant d’une pharmacie
              pour accéder à ses paramètres.
            </p>
          </section>
        )}

        {!isPlatformAdmin &&
          pharmacy &&
          pharmacy.role !== "owner" &&
          pharmacy.role !== "manager" && (
            <section className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 md:rounded-[2rem] md:p-6">
              <h2 className="text-lg font-black text-amber-900">
                Accès limité
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-700">
                Seuls le propriétaire et le gérant peuvent administrer les
                informations et les utilisateurs de cette pharmacie.
              </p>
            </section>
          )}

        {visibleCards.length > 0 && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleCards.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:rounded-[2rem] md:p-6"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass(
                      item.tone
                    )}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="mt-5 flex items-start justify-between gap-3">
                    <h2 className="text-lg font-black text-slate-950 md:text-xl">
                      {item.title}
                    </h2>

                    {item.superAdminOnly && (
                      <span className="shrink-0 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                        Super admin
                      </span>
                    )}
                  </div>

                  <p className="mt-2 min-h-16 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-black text-blue-700">
                    Ouvrir
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function toneClass(tone: string) {
  const classes: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return classes[tone] ?? classes.blue;
}
