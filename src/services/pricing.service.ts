import { createSupabaseClient } from "@/lib/supabase/client";

import type {
  PricingRoundingMode,
  PricingRule,
  ProductPricingContext,
  VatRate,
} from "@/types/product";

export function applyPricingRounding(
  value: number,
  mode: PricingRoundingMode
) {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const step =
    mode === "ceil_50"
      ? 50
      : mode === "ceil_100"
        ? 100
        : mode === "ceil_500"
          ? 500
          : mode === "ceil_1"
            ? 1
            : 0;

  if (step === 0) {
    return Math.round(value * 100) / 100;
  }

  return Math.ceil(value / step) * step;
}

export function calculateAutomaticSellingPrice(payload: {
  purchasePrice: number;
  coefficient: number;
  roundingMode?: PricingRoundingMode;
}) {
  const purchasePrice = Number(payload.purchasePrice || 0);
  const coefficient = Number(payload.coefficient || 0);

  if (purchasePrice <= 0 || coefficient <= 0) return 0;

  return applyPricingRounding(
    purchasePrice * coefficient,
    payload.roundingMode ?? "none"
  );
}

export async function getPricingRules(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("origin_label", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PricingRule[];
}

export async function getProductPricingContext(
  pharmacyId: string,
  productId: string
): Promise<ProductPricingContext> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      pharmacy_id,
      vat_applicable,
      vat_rate,
      origin_code,
      origin_label,
      auto_pricing_enabled,
      pricing_coefficient,
      pricing_rule_id,
      pricing_rule:pricing_rules(*)
      `
    )
    .eq("pharmacy_id", pharmacyId)
    .eq("id", productId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const rawRule = Array.isArray(data.pricing_rule)
    ? data.pricing_rule[0]
    : data.pricing_rule;

  return {
    product_id: data.id,
    pharmacy_id: data.pharmacy_id,
    vat_applicable: Boolean(data.vat_applicable),
    vat_rate: Number(data.vat_rate || 0) as VatRate,
    origin_code: data.origin_code,
    origin_label: data.origin_label,
    auto_pricing_enabled: Boolean(data.auto_pricing_enabled),
    pricing_coefficient:
      data.pricing_coefficient === null
        ? null
        : Number(data.pricing_coefficient),
    pricing_rule_id: data.pricing_rule_id,
    pricing_rule: (rawRule ?? null) as PricingRule | null,
  };
}
