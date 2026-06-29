import { createSupabaseClient } from "@/lib/supabase/client";
import type { Sale, SaleItem, SaleWithItems } from "@/types/sale";

export async function getInvoices(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Sale[];
}

export async function getInvoiceById(saleId: string, pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .eq("pharmacy_id", pharmacyId)
    .single();

  if (saleError) {
    throw new Error(saleError.message);
  }

  const { data: items, error: itemsError } = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", saleId)
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return {
    ...(sale as Sale),
    items: (items ?? []) as SaleItem[],
  } satisfies SaleWithItems;
}