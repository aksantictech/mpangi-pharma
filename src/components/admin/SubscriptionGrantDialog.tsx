"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarPlus, X } from "lucide-react";

import { grantPharmacySubscription } from "@/services/admin-pharmacies.service";

import type { AdminPharmacy } from "@/types/admin";

type SubscriptionGrantDialogProps = {
  pharmacy: AdminPharmacy | null;
  onClose: () => void;
  onGranted: (pharmacyId: string, subscription: AdminPharmacy["subscription"]) => void;
};

const presets = [
  { label: "1 mois", days: 30 },
  { label: "3 mois", days: 90 },
  { label: "6 mois", days: 180 },
  { label: "1 an", days: 365 },
];

export default function SubscriptionGrantDialog({
  pharmacy,
  onClose,
  onGranted,
}: SubscriptionGrantDialogProps) {
  const [selectedDays, setSelectedDays] = useState<number | "custom">(30);
  const [customDays, setCustomDays] = useState("30");
  const [planLabel, setPlanLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (pharmacy) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDays(30);
      setCustomDays("30");
      setPlanLabel("");
      setErrorMessage("");
    }
  }, [pharmacy]);

  if (!pharmacy) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pharmacy) return;

    const durationDays =
      selectedDays === "custom" ? Number(customDays) : selectedDays;

    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      setErrorMessage("La durée doit être un nombre de jours positif.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const preset = presets.find((item) => item.days === selectedDays);
      const subscription = await grantPharmacySubscription(pharmacy.id, {
        durationDays,
        planLabel: planLabel.trim() || preset?.label,
      });

      onGranted(pharmacy.id, subscription);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’octroyer l’abonnement."
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
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Abonnement
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Accorder à « {pharmacy.name} »
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <span className="mb-3 block text-sm font-bold text-slate-700">
              Durée
            </span>

            <div className="grid grid-cols-2 gap-3">
              {presets.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setSelectedDays(preset.days)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                    selectedDays === preset.days
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSelectedDays("custom")}
                className={`col-span-2 rounded-2xl border px-4 py-3 text-sm font-black ${
                  selectedDays === "custom"
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Personnalisé
              </button>
            </div>

            {selectedDays === "custom" && (
              <input
                type="number"
                min="1"
                max="3650"
                value={customDays}
                onChange={(event) => setCustomDays(event.target.value)}
                placeholder="Nombre de jours"
                className="form-input mt-3"
              />
            )}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Libellé du plan (optionnel)
            </span>
            <input
              value={planLabel}
              onChange={(event) => setPlanLabel(event.target.value)}
              placeholder="Ex. Plan Standard 3 mois"
              className="form-input"
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
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CalendarPlus className="h-5 w-5" />
              {isSaving ? "Enregistrement..." : "Accorder l’abonnement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
