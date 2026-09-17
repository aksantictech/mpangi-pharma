"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ShieldAlert, X } from "lucide-react";

import { blockPharmacySubscription } from "@/services/admin-pharmacies.service";

import type { AdminPharmacy } from "@/types/admin";

type SubscriptionBlockDialogProps = {
  pharmacy: AdminPharmacy | null;
  onClose: () => void;
  onBlocked: (pharmacyId: string, subscription: AdminPharmacy["subscription"]) => void;
};

export default function SubscriptionBlockDialog({
  pharmacy,
  onClose,
  onBlocked,
}: SubscriptionBlockDialogProps) {
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (pharmacy) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReason("");
      setErrorMessage("");
    }
  }, [pharmacy]);

  if (!pharmacy) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pharmacy) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      const subscription = await blockPharmacySubscription(
        pharmacy.id,
        reason.trim() || undefined
      );

      onBlocked(pharmacy.id, subscription);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de bloquer l’abonnement."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm md:items-center md:p-8">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-6 text-slate-950 shadow-2xl md:rounded-[2rem]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
              Bloquer l’accès
            </p>
            <h2 className="mt-1 text-2xl font-black">« {pharmacy.name} »</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          Cette pharmacie perdra immédiatement l’accès à la plateforme (produits,
          stock, ventes, factures...). Ses membres ne pourront plus voir que la
          page Abonnement. Vous pourrez débloquer l’accès à tout moment.
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Raison (affichée à la pharmacie, optionnel)
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex. Abonnement impayé depuis le 12/09."
              className="form-input min-h-24 resize-none"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldAlert className="h-5 w-5" />
              {isSaving ? "Blocage..." : "Bloquer l’accès"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
