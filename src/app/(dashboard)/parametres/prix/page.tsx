"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Calculator, CheckCircle2, Save } from "lucide-react";

import SettingsPageShell from "@/components/settings/SettingsPageShell";
import { getPharmacySettings } from "@/services/pharmacies.service";
import { applyPricingRounding } from "@/services/pricing.service";
import { updateDefaultPricing } from "@/services/pricing-settings.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PricingRoundingMode } from "@/types/product";

const roundingOptions: { value: PricingRoundingMode; label: string }[] = [
  { value: "none", label: "Aucun arrondi (2 décimales)" },
  { value: "ceil_1", label: "À l’unité supérieure" },
  { value: "ceil_50", label: "Au multiple de 50 supérieur" },
  { value: "ceil_100", label: "Au multiple de 100 supérieur" },
  { value: "ceil_500", label: "Au multiple de 500 supérieur" },
];

export default function PricingSettingsPage() {
  return (
    <SettingsPageShell
      title="Prix automatique"
      description="Définissez l’indice par défaut : à la création d’un produit, le prix de vente est calculé automatiquement (prix d’achat × indice)."
      icon={Calculator}
    >
      {(pharmacy) => <PricingForm pharmacy={pharmacy} />}
    </SettingsPageShell>
  );
}

function PricingForm({ pharmacy }: { pharmacy: PharmacyWithRole }) {
  const [coefficient, setCoefficient] = useState("");
  const [rounding, setRounding] = useState<PricingRoundingMode>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getPharmacySettings(pharmacy.id)
      .then((settings) => {
        if (!isMounted) return;

        setCoefficient(
          settings.default_price_coefficient
            ? String(settings.default_price_coefficient)
            : ""
        );
        setRounding(settings.default_price_rounding ?? "none");
      })
      .catch(() => {
        // Paramètres absents : le formulaire reste vide, l'enregistrement le dira.
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pharmacy.id]);

  const numericCoefficient = Number(coefficient.replace(",", "."));
  const hasCoefficient =
    Number.isFinite(numericCoefficient) && numericCoefficient > 0;

  const previewPurchase = 1000;
  const previewSelling = hasCoefficient
    ? applyPricingRounding(previewPurchase * numericCoefficient, rounding)
    : 0;

  async function save(value: number | null) {
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateDefaultPricing({
        pharmacyId: pharmacy.id,
        coefficient: value,
        rounding,
      });

      if (value === null) setCoefficient("");

      setSuccessMessage(
        value === null
          ? "Indice par défaut désactivé."
          : "Indice enregistré : il s’applique aux prochains produits créés."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Enregistrement impossible."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasCoefficient) {
      setErrorMessage("Saisissez un indice supérieur à zéro (ex. 1,3 ou 2).");
      return;
    }

    void save(numericCoefficient);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
    >
      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Indice de prix par défaut
          </span>
          <input
            inputMode="decimal"
            value={coefficient}
            onChange={(event) => setCoefficient(event.target.value)}
            placeholder="Ex. 2 (le prix d’achat est multiplié par 2)"
            className="form-input"
            disabled={isLoading}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Arrondi du prix de vente
          </span>
          <select
            value={rounding}
            onChange={(event) =>
              setRounding(event.target.value as PricingRoundingMode)
            }
            className="form-input"
            disabled={isLoading}
          >
            {roundingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <p className="font-black">Aperçu</p>
        {hasCoefficient ? (
          <p>
            Un produit acheté {previewPurchase.toLocaleString("fr-FR")} sera
            vendu <strong>{previewSelling.toLocaleString("fr-FR")}</strong> (
            {previewPurchase.toLocaleString("fr-FR")} × {numericCoefficient}).
          </p>
        ) : (
          <p>
            Saisissez un indice pour voir le résultat. Exemple : avec 2, un
            achat à 1 000 est vendu 2 000.
          </p>
        )}
        <p className="mt-2 text-xs text-blue-800">
          L’indice est appliqué à la création d’un produit et à l’ajout d’un
          lot ; vous pouvez toujours le modifier ou fixer un prix manuel sur la
          fiche du produit. Les produits déjà créés ne changent pas.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isSaving || isLoading}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          <Save className="h-5 w-5" />
          {isSaving ? "Enregistrement..." : "Enregistrer l’indice"}
        </button>

        <button
          type="button"
          disabled={isSaving || isLoading}
          onClick={() => void save(null)}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-60"
        >
          Désactiver l’indice par défaut
        </button>
      </div>
    </form>
  );
}
