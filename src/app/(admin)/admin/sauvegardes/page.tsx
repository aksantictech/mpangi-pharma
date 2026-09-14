"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  Download,
  RefreshCcw,
} from "lucide-react";

import {
  downloadJsonBackup,
  exportPharmacyBackup,
} from "@/services/backup.service";
import { getAdminPharmacies } from "@/services/admin-pharmacies.service";

import type { AdminPharmacy } from "@/types/admin";

export default function AdminBackupsPage() {
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadPharmacies() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await getAdminPharmacies();

      setPharmacies(data);

      setSelectedPharmacyId((current) => {
        if (current && data.some((pharmacy) => pharmacy.id === current)) {
          return current;
        }

        return data[0]?.id ?? "";
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les pharmacies."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPharmacies();
  }, []);

  const selectedPharmacy = pharmacies.find(
    (pharmacy) => pharmacy.id === selectedPharmacyId
  );

  async function handleExportBackup() {
    if (!selectedPharmacy) return;

    setIsExporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const backup = await exportPharmacyBackup(selectedPharmacy.id);

      const date = new Date().toISOString().slice(0, 10);
      const safeName =
        selectedPharmacy.slug ||
        selectedPharmacy.name.toLowerCase().replaceAll(" ", "-");

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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Super Admin
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
              Sauvegardes
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Exportez une copie applicative des données d’une pharmacie
              cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPharmacies}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="h-5 w-5" />
            Actualiser
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-slate-400 md:rounded-[2rem]">
          Chargement des pharmacies...
        </div>
      ) : pharmacies.length === 0 ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-slate-400 md:rounded-[2rem]">
          Aucune pharmacie à exporter.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:rounded-[2rem]">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                <DatabaseBackup className="h-7 w-7" />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-black text-slate-950">
                  Export complet d’une pharmacie
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Télécharge un fichier JSON contenant les données
                  principales de la pharmacie choisie. Ce fichier peut
                  servir de copie de sécurité ou d’archive de contrôle.
                </p>

                <label className="mt-4 block max-w-sm">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Pharmacie
                  </span>

                  <select
                    value={selectedPharmacyId}
                    onChange={(event) =>
                      setSelectedPharmacyId(event.target.value)
                    }
                    className="form-input bg-white"
                  >
                    {pharmacies.map((pharmacy) => (
                      <option key={pharmacy.id} value={pharmacy.id}>
                        {pharmacy.name}
                      </option>
                    ))}
                  </select>
                </label>
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
                disabled={isExporting || !selectedPharmacy}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-5 w-5" />
                {isExporting ? "Export en cours..." : "Télécharger l’export"}
              </button>
            </div>
          </div>

          <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:rounded-[2rem]">
            <h2 className="text-xl font-black text-slate-950">
              Recommandation production
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Cet export applicatif ne remplace pas une vraie sauvegarde
              automatique de la base de données. En production, il faudra
              aussi activer une stratégie de backup serveur, avec
              restauration testée régulièrement.
            </p>

            <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-800">
                Minimum conseillé
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-700">
                Export manuel hebdomadaire + sauvegarde automatique
                quotidienne côté base de données.
              </p>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
