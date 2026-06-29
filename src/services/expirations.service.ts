import { createSupabaseClient } from "@/lib/supabase/client";
import type { ExpirationAlert } from "@/types/product";

export async function getExpirationAlertsList(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("v_expiration_alerts")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .neq("expiration_status", "ok")
    .order("expiry_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as ExpirationAlert[];
}

export async function removeBatchFromSale(batchId: string, reason?: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("remove_batch_from_sale", {
    p_batch_id: batchId,
    p_reason: reason || "Retrait du lot pour expiration",
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}