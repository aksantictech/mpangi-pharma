"use client";

import { LoadingBlocks } from "@/components/ui/PageLoading";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";

import { canEditPharmacySettings } from "@/lib/permissions";
import { getCurrentPharmacy } from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";

type SettingsPageShellProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Rendu une fois la pharmacie active chargée et l'accès vérifié. */
  children: (pharmacy: PharmacyWithRole) => ReactNode;
};

/**
 * Cadre commun des sous-pages de Paramètres : en-tête avec retour, chargement
 * de la pharmacie active et contrôle d'accès (propriétaire / gérant).
 */
export default function SettingsPageShell({
  title,
  description,
  icon: Icon,
  children,
}: SettingsPageShellProps) {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getCurrentPharmacy()
      .then((result) => {
        if (isMounted) setPharmacy(result);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Chargement impossible."
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const canEdit = pharmacy ? canEditPharmacySettings(pharmacy.role) : false;

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <Link
            href="/parametres"
            className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux paramètres
          </Link>

          <div className="mt-3 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Icon className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-950 md:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
          </div>
        </header>

        {isLoading && (
          <div role="status" aria-busy="true">
            <span className="sr-only">Chargement...</span>
            <LoadingBlocks variant="detail" />
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {!isLoading && !pharmacy && !errorMessage && (
          <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-800">
            Aucune pharmacie active.
          </div>
        )}

        {pharmacy && !canEdit && (
          <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-800">
            Seuls le propriétaire et le gérant peuvent modifier ces paramètres.
          </div>
        )}

        {pharmacy && canEdit && children(pharmacy)}
      </div>
    </main>
  );
}
