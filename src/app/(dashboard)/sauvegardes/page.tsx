"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  Download,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
 
import {
  downloadJsonBackup,
  exportPharmacyBackup,
} from "@/services/backup.service";
import { getCurrentPharmacy } from "@/services/pharmacies.service";
import { canManageBackups } from "@/lib/permissions";
import type { PharmacyWithRole } from "@/types/pharmacy";

export default function BackupsPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();
      setPharmacy(currentPharmacy);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger la pharmacie active."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleExportBackup() {
    if (!pharmacy) return;

    setIsExporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const backup = await exportPharmacyBackup(pharmacy.id);

      const date = new Date().toISOString().slice(0, 10);
      const safeName = pharmacy.slug || pharmacy.name.toLowerCase().replaceAll(" ", "-");

      downloadJsonBackup(
        backup,
        `mpangi-pharma-${safeName}-backup-${date}.json`
      );

      setSuccessMessage("Export généré avec succès.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de générer l’export."
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement des sauvegardes...
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
            Sélectionnez une pharmacie avant de générer une sauvegarde.
          </p>
        </div>
      </main>
    );
  }

  const canExport = canManageBackups(pharmacy.role);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                Sécurité & continuité
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Sauvegardes
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Export des données critiques de {pharmacy.name}.
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

        {!canExport ? (
          <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
            <div className="flex items-start gap-4">
              <ShieldCheck className="h-8 w-8 text-amber-700" />
              <div>
                <h2 className="text-xl font-black text-amber-900">
                  Accès limité
                </h2>
                <p className="mt-2 text-sm leading-6 text-amber-700">
                  Les sauvegardes sont réservées au propriétaire et au gérant de
                  la pharmacie.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                  <DatabaseBackup className="h-7 w-7" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Export complet pharmacie
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Télécharge un fichier JSON contenant les données principales
                    de la pharmacie active. Ce fichier peut servir de copie de
                    sécurité ou d’archive de contrôle.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-black text-blue-900">
                  Contenu de l’export
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm font-semibold text-blue-700 md:grid-cols-2">
                  <p>• Pharmacie</p>
                  <p>• Paramètres</p>
                  <p>• Utilisateurs</p>
                  <p>• Produits</p>
                  <p>• Lots</p>
                  <p>• Stock</p>
                  <p>• Ventes</p>
                  <p>• Factures</p>
                  <p>• Dépenses</p>
                  <p>• Audit logs</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-5 w-5" />
                  {isExporting ? "Export en cours..." : "Télécharger l’export"}
                </button>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                Recommandation production
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Cet export applicatif ne remplace pas une vraie sauvegarde
                automatique de la base de données. En production, il faudra aussi
                activer une stratégie de backup serveur, avec restauration
                testée régulièrement.
              </p>

              <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-800">
                  Minimum conseillé
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-700">
                  Export manuel hebdomadaire + sauvegarde automatique quotidienne
                  côté base de données.
                </p>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}