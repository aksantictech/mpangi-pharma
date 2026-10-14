import { createSupabaseClient } from "@/lib/supabase/client";
import {
  startOfDay,
  type InventoryMovementInput,
  type InventoryProductInput,
} from "@/lib/inventory";
import { getProducts, getProductStock } from "@/services/products.service";
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

/**
 * Produits avec leurs lots actifs, prêts pour buildInventoryLines.
 *
 * La vue v_product_stock ne porte que la quantité (pas la catégorie, le
 * fournisseur ni l'ordonnance) : la fiche produit vient de la table products
 * et la quantité de la vue, comme sur la page Produits.
 */
export async function getInventoryProducts(
  pharmacyId: string
): Promise<InventoryProductInput[]> {
  const [products, stock, batches] = await Promise.all([
    getProducts(pharmacyId),
    getProductStock(pharmacyId),
    getAllActiveBatches(pharmacyId),
  ]);

  const quantityByProduct = new Map(
    stock.map((row) => [row.product_id, Number(row.total_quantity || 0)])
  );

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

  return products.map((product) => ({
    productId: product.id,
    name: product.name,
    genericName: product.generic_name,
    dosage: product.dosage,
    form: product.form,
    unit: product.unit,
    categoryId: product.category_id,
    categoryName: product.category?.name ?? null,
    supplierName: product.supplier?.name ?? null,
    minStock: Number(product.min_stock || 0),
    requiresPrescription: Boolean(product.requires_prescription),
    status: product.status,
    currentQuantity: quantityByProduct.get(product.id) ?? 0,
    batches: batchesByProduct.get(product.id) ?? [],
  }));
}
