import { createSupabaseClient } from "@/lib/supabase/client";

import type {
  PaymentMethodKind,
  PharmacyPaymentMethod,
} from "@/types/kit";
import type { PaymentMethod } from "@/types/sale";

/** Mode de base enregistré dans la vente pour un mode personnalisé. */
export function baseMethodForKind(kind: PaymentMethodKind): PaymentMethod {
  if (kind === "mobile") return "mobile_money";
  if (kind === "bank") return "card";

  // Société conventionnée / autre : la vente est une créance à encaisser.
  return "credit";
}

export const paymentKindLabels: Record<PaymentMethodKind, string> = {
  convention: "Société conventionnée",
  mobile: "Mobile money",
  bank: "Banque / virement",
  other: "Autre",
};

export async function getPaymentMethods(
  pharmacyId: string,
  options: { onlyActive?: boolean } = {}
): Promise<PharmacyPaymentMethod[]> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from("pharmacy_payment_methods")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (options.onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PharmacyPaymentMethod[];
}

export type PaymentMethodPayload = {
  pharmacyId: string;
  name: string;
  kind: PaymentMethodKind;
  notes?: string;
};

function friendlyError(message: string) {
  if (message.includes("pharmacy_payment_methods_name_uidx")) {
    return "Un mode de paiement porte déjà ce nom.";
  }

  return message;
}

export async function createPaymentMethod(payload: PaymentMethodPayload) {
  const supabase = createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("pharmacy_payment_methods").insert({
    pharmacy_id: payload.pharmacyId,
    name: payload.name.trim(),
    kind: payload.kind,
    notes: payload.notes?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    throw new Error(friendlyError(error.message));
  }
}

export async function updatePaymentMethod(
  id: string,
  payload: Omit<PaymentMethodPayload, "pharmacyId">
) {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("pharmacy_payment_methods")
    .update({
      name: payload.name.trim(),
      kind: payload.kind,
      notes: payload.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(friendlyError(error.message));
  }
}

export async function setPaymentMethodActive(id: string, isActive: boolean) {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("pharmacy_payment_methods")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePaymentMethod(id: string) {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("pharmacy_payment_methods")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
