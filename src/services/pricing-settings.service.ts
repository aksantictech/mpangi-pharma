import { createSupabaseClient } from "@/lib/supabase/client";

import type { PricingRoundingMode } from "@/types/product";

/**
 * Enregistre l'indice de prix par défaut de la pharmacie (Paramètres › Prix
 * automatique). `coefficient = null` désactive l'indice par défaut.
 * Colonnes ajoutées par supabase/migrations/0004_pricing_payments_first_aid.sql.
 */
export async function updateDefaultPricing(payload: {
  pharmacyId: string;
  coefficient: number | null;
  rounding: PricingRoundingMode;
}) {
  const supabase = createSupabaseClient();

  if (
    payload.coefficient !== null &&
    (!Number.isFinite(payload.coefficient) || payload.coefficient <= 0)
  ) {
    throw new Error("L'indice doit être un nombre supérieur à zéro.");
  }

  const { data, error } = await supabase
    .from("pharmacy_settings")
    .update({
      default_price_coefficient: payload.coefficient,
      default_price_rounding: payload.rounding,
      updated_at: new Date().toISOString(),
    })
    .eq("pharmacy_id", payload.pharmacyId)
    .select("pharmacy_id");

  if (error) {
    if (/default_price_/.test(error.message)) {
      throw new Error(
        "La base de données doit être mise à jour : exécutez la migration 0004_pricing_payments_first_aid.sql dans Supabase."
      );
    }

    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Les paramètres de la pharmacie sont introuvables ou vous n'avez pas le droit de les modifier. Ouvrez d'abord Paramètres › Ma pharmacie."
    );
  }
}
