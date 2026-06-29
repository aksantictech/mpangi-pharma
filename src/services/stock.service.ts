import { createSupabaseClient } from "@/lib/supabase/client";
import type {
  AddStockBatchPayload,
  CorrectBatchQuantityPayload,
  StockMovement,
} from "@/types/stock";
import type { ProductBatch } from "@/types/product";

function emptyToNull(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function getStockMovements(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("v_stock_movements")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return data as StockMovement[];
}

export async function getAllActiveBatches(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("product_batches")
    .select(
      `
      *,
      product:products(id, name, generic_name, dosage, form, unit)
    `
    )
    .eq("pharmacy_id", pharmacyId)
    .eq("is_active", true)
    .order("expiry_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as (ProductBatch & {
    product?: {
      id: string;
      name: string;
      generic_name: string | null;
      dosage: string | null;
      form: string | null;
      unit: string;
    };
  })[];
}

export async function addStockBatch(payload: AddStockBatchPayload) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("add_product_batch", {
    p_product_id: payload.productId,
    p_supplier_id: emptyToNull(payload.supplierId),
    p_batch_number: emptyToNull(payload.batchNumber),
    p_expiry_date: payload.expiryDate,
    p_purchase_price: payload.purchasePrice,
    p_selling_price: payload.sellingPrice,
    p_quantity: payload.quantity,
    p_reason: payload.reason || "Entrée de stock",
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function correctBatchQuantity(
  payload: CorrectBatchQuantityPayload
) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("correct_batch_quantity", {
    p_batch_id: payload.batchId,
    p_new_quantity: payload.newQuantity,
    p_reason: payload.reason || "Correction inventaire",
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}