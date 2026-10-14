import { createSupabaseClient } from "@/lib/supabase/client";
import {
  startOfDay,
  type InventoryMovementInput,
  type InventoryProductInput,
} from "@/lib/inventory";
import { getProductStock } from "@/services/products.service";
import { getAllActiveBatches } from "@/services/stock.service";

const PAGE_SIZE = 1000;
// Garde-fou : au-delà, la période est trop large pour être calculée côté navigateur.
const MAX_MOVEMENTS = 100_000;

/**
 * Tous les mouvements de stock depuis le début de la période. Ils servent à
 * remonter du stock actuel au stock de début/fin de période (voir lib/inventory).
 * Lecture par pages de 1000 : PostgREST plafonne le nombre de lignes par requête.
 */
export async function getMovementsSince(
  pharmacyId: string,
  fromDate: string
): Promise<InventoryMovementInput[]> {
  const supabase = createSupabaseClient();
  const fromIso = startOfDay(fromDate).toISOString();
  const all: InventoryMovementInput[] = [];

  for (let offset = 0; offset < MAX_MOVEMENTS; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("v_stock_movements")
      .select("product_id, movement_type, quantity, created_at")
      .eq("pharmacy_id", pharmacyId)
      .gte("created_at", fromIso)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    all.push(...((data ?? []) as InventoryMovementInput[]));

    if (!data || data.length < PAGE_SIZE) {
      return all;
    }
  }

  throw new Error(
    "Trop de mouvements sur cette période. Choisissez une période plus courte."
  );
}

/** Produits avec leurs lots actifs, prêts pour buildInventoryLines. */
export async function getInventoryProducts(
  pharmacyId: string
): Promise<InventoryProductInput[]> {
  const [stock, batches] = await Promise.all([
    getProductStock(pharmacyId),
    getAllActiveBatches(pharmacyId),
  ]);

  const batchesByProduct = new Map<string, InventoryProductInput["batches"]>();

  for (const batch of batches) {
    const list = batchesByProduct.get(batch.product_id) ?? [];

    list.push({
      quantity: Number(batch.quantity_available || 0),
      purchasePrice: Number(batch.purchase_price || 0),
      sellingPrice: Number(batch.selling_price || 0),
      expiryDate: batch.expiry_date ?? null,
    });

    batchesByProduct.set(batch.product_id, list);
  }

  return stock.map((row) => ({
    productId: row.product_id,
    name: row.name,
    genericName: row.generic_name,
    dosage: row.dosage,
    form: row.form,
    unit: row.unit,
    categoryId: row.category_id ?? null,
    categoryName: row.category_name ?? null,
    supplierName: row.supplier_name ?? null,
    minStock: Number(row.min_stock || 0),
    requiresPrescription: Boolean(row.requires_prescription),
    status: row.status,
    currentQuantity: Number(row.total_quantity || 0),
    batches: batchesByProduct.get(row.product_id) ?? [],
  }));
}
