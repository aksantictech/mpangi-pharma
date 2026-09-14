"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

import { deleteAdminPharmacy } from "@/services/admin-pharmacies.service";

import type { AdminPharmacy } from "@/types/admin";

type DeletePharmacyDialogProps = {
  pharmacy: AdminPharmacy | null;
  onClose: () => void;
  onDeleted: (pharmacyId: string) => void;
};

export default function DeletePharmacyDialog({
  pharmacy,
  onClose,
  onDeleted,
}: DeletePharmacyDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfirmationText("");
    setErrorMessage("");
  }, [pharmacy]);

  if (!pharmacy) return null;

  const isConfirmed = confirmationText.trim() === pharmacy.name.trim();

  async function handleDelete() {
    if (!pharmacy || !isConfirmed) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteAdminPharmacy(pharmacy.id);
      onDeleted(pharmacy.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer la pharmacie."
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center md:p-8">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border-2 border-red-200 bg-white p-6 text-slate-950 shadow-2xl md:rounded-[2rem]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />

        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">
                Action irréversible
              </p>
              <h2 className="mt-1 text-xl font-black">
                Supprimer « {pharmacy.name} »
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">
          <p>
            Cette suppression est <strong>définitive</strong> et{" "}
            <strong>ne peut pas être annulée</strong>. Toutes les données liées
            à cette pharmacie seront effacées de la base :
          </p>

          <ul className="list-disc space-y-1 pl-5 font-medium">
            <li>Produits, catégories, fournisseurs et lots de stock</li>
            <li>Ventes, factures et mouvements de stock</li>
            <li>Clients, dépenses et règles de tarification</li>
            <li>Utilisateurs rattachés à cette pharmacie et leurs accès</li>
            <li>Paramètres, horaires et journaux d’audit de la pharmacie</li>
          </ul>

          <p>
            Le logo hébergé de la pharmacie sera également supprimé du
            stockage.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-100 px-4 py-3 text-sm font-bold text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="mt-5">
          <label className="block text-sm font-bold text-slate-700">
            Pour confirmer, tapez exactement le nom de la pharmacie :{" "}
            <span className="font-black text-red-700">{pharmacy.name}</span>
          </label>

          <input
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            className="form-input mt-2"
            placeholder={pharmacy.name}
            autoComplete="off"
            disabled={isDeleting}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-5 w-5" />
            {isDeleting ? "Suppression..." : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}
