import { createSupabaseClient } from "@/lib/supabase/client";
import type {
  CartItem,
  CreateSaleResult,
  PaymentMethod,
  Sale,
  SellableProduct,
} from "@/types/sale";

export type CreateSalePayload = {
  pharmacyId: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  currency: string;
  discount: number;
  customerName?: string;
  notes?: string;
};

function emptyToNull(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function getSellableProducts(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("v_sellable_products")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .gt("total_quantity", 0)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as SellableProduct[];
}

export async function createSale(payload: CreateSalePayload) {
  const supabase = createSupabaseClient();

  const rpcItems = payload.items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc("create_sale", {
    p_pharmacy_id: payload.pharmacyId,
    p_items: rpcItems,
    p_payment_method: payload.paymentMethod,
    p_currency: payload.currency,
    p_discount: payload.discount,
    p_customer_name: emptyToNull(payload.customerName),
    p_notes: emptyToNull(payload.notes),
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = Array.isArray(data) ? data[0] : data;

  return result as CreateSaleResult;
}

export async function getRecentSales(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return data as Sale[];
}