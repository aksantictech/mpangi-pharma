/*
 * Calcul de l'inventaire d'une période (logique pure, sans accès base : les
 * données sont chargées par services/inventory.service.ts).
 *
 * Principe : le stock ACTUEL de chaque produit est connu (somme des lots
 * actifs). On remonte le temps avec les mouvements de stock :
 *   stock de fin de période   = stock actuel - mouvements APRÈS la période
 *   stock de début de période = stock de fin - (entrées - sorties) de la période
 */

export type InventoryBatchInput = {
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  /** Date d'expiration au format ISO (AAAA-MM-JJ). */
  expiryDate: string | null;
};

export type InventoryProductInput = {
  productId: string;
  name: string;
  genericName: string | null;
  dosage: string | null;
  form: string | null;
  unit: string;
  categoryId: string | null;
  categoryName: string | null;
  supplierName: string | null;
  minStock: number;
  requiresPrescription: boolean;
  status: string;
  currentQuantity: number;
  batches: InventoryBatchInput[];
};

export type InventoryMovementInput = {
  product_id: string;
  movement_type: string;
  quantity: number;
  created_at: string;
};

export type InventoryStockStatus = "ok" | "low" | "out";

export type InventoryLine = {
  productId: string;
  name: string;
  genericName: string | null;
  dosage: string | null;
  form: string | null;
  unit: string;
  categoryId: string | null;
  categoryName: string | null;
  supplierName: string | null;
  requiresPrescription: boolean;
  status: string;
  minStock: number;
  opening: number;
  entries: number;
  exits: number;
  closing: number;
  averagePurchasePrice: number;
  averageSellingPrice: number;
  purchaseValue: number;
  sellingValue: number;
  /** Quantité en stock dont la date d'expiration est dépassée (situation actuelle). */
  expiredQuantity: number;
  /** Quantité qui expire dans les 90 jours (situation actuelle). */
  expiringSoonQuantity: number;
  nearestExpiry: string | null;
  stockStatus: InventoryStockStatus;
};

const POSITIVE_TYPES = new Set([
  "supplier_entry",
  "customer_return",
  "adjustment_in",
  "transfer_in",
]);

const NEGATIVE_TYPES = new Set([
  "sale",
  "supplier_return",
  "adjustment_out",
  "loss",
  "damage",
  "expired",
  "transfer_out",
]);

/**
 * Effet d'un mouvement sur le stock (+ entrée, - sortie). Les types connus
 * ont un sens fixe ; une correction d'inventaire garde le signe enregistré.
 */
export function signedQuantity(type: string, quantity: number) {
  const value = Number(quantity || 0);

  if (POSITIVE_TYPES.has(type)) return Math.abs(value);
  if (NEGATIVE_TYPES.has(type)) return -Math.abs(value);

  return value;
}

export function startOfDay(date: string) {
  return new Date(`${date}T00:00:00`);
}

export function endOfDay(date: string) {
  return new Date(`${date}T23:59:59.999`);
}

const SOON_DAYS = 90;

export function buildInventoryLines(params: {
  products: InventoryProductInput[];
  movements: InventoryMovementInput[];
  /** Début de période, AAAA-MM-JJ. */
  from: string;
  /** Fin de période, AAAA-MM-JJ. */
  to: string;
  /** Date du jour, AAAA-MM-JJ (pour les expirations). */
  today: string;
}): InventoryLine[] {
  const start = startOfDay(params.from).getTime();
  const end = endOfDay(params.to).getTime();
  const todayTime = startOfDay(params.today).getTime();
  const soonLimit = todayTime + SOON_DAYS * 86_400_000;

  const afterEnd = new Map<string, number>();
  const entries = new Map<string, number>();
  const exits = new Map<string, number>();

  for (const movement of params.movements) {
    const time = new Date(movement.created_at).getTime();
    const effect = signedQuantity(movement.movement_type, movement.quantity);

    if (time > end) {
      afterEnd.set(
        movement.product_id,
        (afterEnd.get(movement.product_id) ?? 0) + effect
      );
    } else if (time >= start) {
      if (effect >= 0) {
        entries.set(
          movement.product_id,
          (entries.get(movement.product_id) ?? 0) + effect
        );
      } else {
        exits.set(
          movement.product_id,
          (exits.get(movement.product_id) ?? 0) - effect
        );
      }
    }
  }

  return params.products.map((product) => {
    const closing =
      product.currentQuantity - (afterEnd.get(product.productId) ?? 0);
    const entered = entries.get(product.productId) ?? 0;
    const exited = exits.get(product.productId) ?? 0;
    const opening = closing - (entered - exited);

    const stocked = product.batches.filter((batch) => batch.quantity > 0);
    const batchQuantity = stocked.reduce((sum, b) => sum + b.quantity, 0);

    const averagePurchasePrice =
      batchQuantity > 0
        ? stocked.reduce((sum, b) => sum + b.quantity * b.purchasePrice, 0) /
          batchQuantity
        : 0;
    const averageSellingPrice =
      batchQuantity > 0
        ? stocked.reduce((sum, b) => sum + b.quantity * b.sellingPrice, 0) /
          batchQuantity
        : 0;

    let expiredQuantity = 0;
    let expiringSoonQuantity = 0;
    let nearestExpiry: string | null = null;

    for (const batch of stocked) {
      if (!batch.expiryDate) continue;

      const expiry = startOfDay(batch.expiryDate.slice(0, 10)).getTime();

      if (expiry < todayTime) {
        expiredQuantity += batch.quantity;
      } else if (expiry <= soonLimit) {
        expiringSoonQuantity += batch.quantity;
      }

      if (!nearestExpiry || batch.expiryDate < nearestExpiry) {
        nearestExpiry = batch.expiryDate;
      }
    }

    const stockStatus: InventoryStockStatus =
      closing <= 0 ? "out" : closing <= product.minStock ? "low" : "ok";

    return {
      productId: product.productId,
      name: product.name,
      genericName: product.genericName,
      dosage: product.dosage,
      form: product.form,
      unit: product.unit,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      supplierName: product.supplierName,
      requiresPrescription: product.requiresPrescription,
      status: product.status,
      minStock: product.minStock,
      opening,
      entries: entered,
      exits: exited,
      closing,
      averagePurchasePrice,
      averageSellingPrice,
      // Valorisation au prix moyen pondéré des lots actuellement en stock.
      purchaseValue: Math.max(closing, 0) * averagePurchasePrice,
      sellingValue: Math.max(closing, 0) * averageSellingPrice,
      expiredQuantity,
      expiringSoonQuantity,
      nearestExpiry,
      stockStatus,
    };
  });
}

export function summarizeInventory(lines: InventoryLine[]) {
  return lines.reduce(
    (total, line) => ({
      products: total.products + 1,
      opening: total.opening + line.opening,
      entries: total.entries + line.entries,
      exits: total.exits + line.exits,
      closing: total.closing + line.closing,
      purchaseValue: total.purchaseValue + line.purchaseValue,
      sellingValue: total.sellingValue + line.sellingValue,
      outOfStock: total.outOfStock + (line.stockStatus === "out" ? 1 : 0),
      lowStock: total.lowStock + (line.stockStatus === "low" ? 1 : 0),
      expiredQuantity: total.expiredQuantity + line.expiredQuantity,
    }),
    {
      products: 0,
      opening: 0,
      entries: 0,
      exits: 0,
      closing: 0,
      purchaseValue: 0,
      sellingValue: 0,
      outOfStock: 0,
      lowStock: 0,
      expiredQuantity: 0,
    }
  );
}
