import { createSupabaseClient } from "@/lib/supabase/client";

import type { KitRequisition } from "@/types/kit";

export type KitRequisitionItemInput = {
  productId: string;
  quantity: number;
};

export type CreateKitRequisitionPayload = {
  pharmacyId: string;
  items: KitRequisitionItemInput[];
  requesterName: string;
  department?: string;
  reason?: string;
};

export type CreateKitRequisitionResult = {
  id: string;
  reference: string;
  total_quantity: number;
  total_cost: number;
};

export async function createKitRequisition(
  payload: CreateKitRequisitionPayload
): Promise<CreateKitRequisitionResult> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("create_kit_requisition", {
    p_pharmacy_id: payload.pharmacyId,
    p_items: payload.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
    p_requester_name: payload.requesterName.trim(),
    p_department: payload.department?.trim() || null,
    p_reason: payload.reason?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as CreateKitRequisitionResult;
}

export async function cancelKitRequisition(
  requisitionId: string,
  reason?: string
) {
  const supabase = createSupabaseClient();

  const { error } = await supabase.rpc("cancel_kit_requisition", {
    p_requisition_id: requisitionId,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/** Réquisitions (avec leurs lignes) créées depuis `since` (ISO), plus récentes d'abord. */
export async function getKitRequisitions(
  pharmacyId: string,
  since: string
): Promise<KitRequisition[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("kit_requisitions")
    .select("*, kit_requisition_items(*)")
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as KitRequisition[];
}
