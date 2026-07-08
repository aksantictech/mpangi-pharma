"use client";

import {
  createOfflineId,
  getOfflineDeviceId,
  offlineDb,
  type OfflineSale,
  type OfflineSaleItem,
} from "@/lib/offline/db";
import { createSale } from "@/services/sales.service";

import type { CartItem, PaymentMethod } from "@/types/sale";

export type CreateOfflineSalePayload = {
  pharmacyId: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  currency: string;
  discount: number;
  customerName?: string;
  notes?: string;
};

export type SyncOfflineSalesResult = {
  attemptedCount: number;
  syncedCount: number;
  conflictCount: number;
  failedCount: number;
  messages: string[];
};

function nowIso() {
  return new Date().toISOString();
}

function createLocalInvoiceNumber() {
  const date = new Date();

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const timePart = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");

  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `OFF-${datePart}-${timePart}-${randomPart}`;
}

function productLocalId(pharmacyId: string, productId: string) {
  return `${pharmacyId}:${productId}`;
}

function isStockConflictError(message: string) {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    normalized.includes("stock") ||
    normalized.includes("insuffisant") ||
    normalized.includes("rupture") ||
    normalized.includes("expiration") ||
    normalized.includes("expire") ||
    normalized.includes("lot")
  );
}

function getResultValue(result: unknown, key: string) {
  const record = result as Record<string, unknown>;

  return record?.[key];
}

function cartItemRequiresPrescription(item: CartItem) {
  const record = item as unknown as Record<string, unknown>;

  return Boolean(
    record.requiresPrescription ??
      record.requires_prescription ??
      record.requires_prescription_at_sale ??
      false
  );
}

export async function createOfflineSale(payload: CreateOfflineSalePayload) {
  if (payload.items.length === 0) {
    throw new Error("Le panier est vide.");
  }

  const createdAt = nowIso();
  const deviceId = getOfflineDeviceId();
  const offlineSaleId = createOfflineId("offline_sale");
  const localInvoiceNumber = createLocalInvoiceNumber();

  const subtotal = payload.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const discount = Number(payload.discount || 0);
  const total = Math.max(subtotal - discount, 0);

  const sale: OfflineSale = {
    id: offlineSaleId,
    pharmacy_id: payload.pharmacyId,
    device_id: deviceId,
    local_invoice_number: localInvoiceNumber,
    customer_name: payload.customerName?.trim() || null,
    payment_method: payload.paymentMethod,
    currency: payload.currency,
    discount,
    notes: payload.notes?.trim() || null,
    subtotal,
    total,
    status: "pending_sync",
    conflict_reason: null,
    server_sale_id: null,
    server_invoice_number: null,
    created_at: createdAt,
    synced_at: null,
    updated_at: createdAt,
  };

  const saleItems: OfflineSaleItem[] = payload.items.map((item) => ({
    id: createOfflineId("offline_sale_item"),
    offline_sale_id: offlineSaleId,
    pharmacy_id: payload.pharmacyId,
    product_id: item.productId,
    product_name: item.name,
    dosage: item.dosage ?? null,
    form: item.form ?? null,
    unit: item.unit ?? null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.quantity * item.unitPrice,
    available_quantity_at_sale: item.availableQuantity,
    requires_prescription: cartItemRequiresPrescription(item),
  })) as OfflineSaleItem[];

  await offlineDb.transaction(
    "rw",
    offlineDb.sellableProducts,
    offlineDb.offlineSales,
    offlineDb.offlineSaleItems,
    offlineDb.syncLogs,
    async () => {
      for (const item of payload.items) {
        const localProductId = productLocalId(
          payload.pharmacyId,
          item.productId
        );

        const localProduct = await offlineDb.sellableProducts.get(
          localProductId
        );

        if (!localProduct) {
          throw new Error(
            `Produit introuvable dans le cache offline : ${item.name}`
          );
        }

        const currentQuantity = Number(localProduct.total_quantity || 0);

        if (item.quantity > currentQuantity) {
          throw new Error(
            `Stock local insuffisant pour ${item.name}. Disponible : ${currentQuantity}`
          );
        }

        await offlineDb.sellableProducts.update(localProductId, {
          total_quantity: currentQuantity - item.quantity,
          cached_at: nowIso(),
        });
      }

      await offlineDb.offlineSales.add(sale);
      await offlineDb.offlineSaleItems.bulkAdd(saleItems);

      await offlineDb.syncLogs.add({
        id: createOfflineId("sync_log"),
        pharmacy_id: payload.pharmacyId,
        type: "sales",
        status: "success",
        message: `Vente locale créée : ${localInvoiceNumber}`,
        created_at: createdAt,
      });
    }
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mpangi-offline-cache-updated"));
  }

  return {
    offlineSaleId,
    localInvoiceNumber,
    totalAmount: total,
    currency: payload.currency,
  };
}

export async function getPendingOfflineSales(pharmacyId: string) {
  return await offlineDb.offlineSales
    .where("pharmacy_id")
    .equals(pharmacyId)
    .filter((sale) =>
      ["pending_sync", "sync_failed", "conflict"].includes(sale.status)
    )
    .toArray();
}

export async function syncPendingOfflineSalesToServer(
  pharmacyId: string
): Promise<SyncOfflineSalesResult> {
  const result: SyncOfflineSalesResult = {
    attemptedCount: 0,
    syncedCount: 0,
    conflictCount: 0,
    failedCount: 0,
    messages: [],
  };

  const pendingSales = await offlineDb.offlineSales
    .where("pharmacy_id")
    .equals(pharmacyId)
    .filter((sale) => ["pending_sync", "sync_failed"].includes(sale.status))
    .toArray();

  result.attemptedCount = pendingSales.length;

  if (pendingSales.length === 0) {
    result.messages.push("Aucune vente hors-ligne à synchroniser.");
    return result;
  }

  for (const sale of pendingSales) {
    const startedAt = nowIso();

    try {
      await offlineDb.offlineSales.update(sale.id, {
        status: "syncing",
        updated_at: startedAt,
      });

      const saleItems = await offlineDb.offlineSaleItems
        .where("offline_sale_id")
        .equals(sale.id)
        .toArray();

      if (saleItems.length === 0) {
        throw new Error(
          `La vente ${sale.local_invoice_number} ne contient aucun article.`
        );
      }

      const cartItems = saleItems.map((item) => {
        const itemRecord = item as unknown as Record<string, unknown>;

        return {
          productId: item.product_id,
          name: item.product_name,
          dosage: item.dosage ?? undefined,
          form: item.form ?? undefined,
          unit: item.unit ?? undefined,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unit_price || 0),
          availableQuantity: Number(item.available_quantity_at_sale || 0),
          requiresPrescription: Boolean(itemRecord.requires_prescription),
        };
      }) as CartItem[];

      const serverSale = await createSale({
        pharmacyId,
        items: cartItems,
        paymentMethod: sale.payment_method,
        currency: sale.currency,
        discount: sale.discount,
        customerName: sale.customer_name ?? undefined,
        notes: sale.notes
          ? `${sale.notes}\n\nSynchronisée depuis vente offline : ${sale.local_invoice_number}`
          : `Synchronisée depuis vente offline : ${sale.local_invoice_number}`,
      });

      const syncedAt = nowIso();

      const serverSaleId =
        getResultValue(serverSale, "sale_id") ??
        getResultValue(serverSale, "id") ??
        null;

      const serverInvoiceNumber =
        getResultValue(serverSale, "invoice_number") ?? null;

      await offlineDb.offlineSales.update(sale.id, {
        status: "synced",
        server_sale_id: serverSaleId ? String(serverSaleId) : null,
        server_invoice_number: serverInvoiceNumber
          ? String(serverInvoiceNumber)
          : null,
        synced_at: syncedAt,
        updated_at: syncedAt,
        conflict_reason: null,
      });

      await offlineDb.syncLogs.add({
        id: createOfflineId("sync_log"),
        pharmacy_id: pharmacyId,
        type: "sales",
        status: "success",
        message: `Vente ${sale.local_invoice_number} synchronisée : ${
          serverInvoiceNumber || "facture serveur créée"
        }`,
        created_at: syncedAt,
      });

      result.syncedCount += 1;
      result.messages.push(
        `${sale.local_invoice_number} synchronisée avec succès.`
      );
    } catch (error) {
      const failedAt = nowIso();

      const message =
        error instanceof Error
          ? error.message
          : `Impossible de synchroniser ${sale.local_invoice_number}.`;

      const isConflict = isStockConflictError(message);

      await offlineDb.offlineSales.update(sale.id, {
        status: isConflict ? "conflict" : "sync_failed",
        conflict_reason: message,
        updated_at: failedAt,
      });

      await offlineDb.syncLogs.add({
        id: createOfflineId("sync_log"),
        pharmacy_id: pharmacyId,
        type: "sales",
        status: "failed",
        message: `${sale.local_invoice_number} : ${message}`,
        created_at: failedAt,
      });

      if (isConflict) {
        result.conflictCount += 1;
        result.messages.push(
          `${sale.local_invoice_number} en conflit : ${message}`
        );
      } else {
        result.failedCount += 1;
        result.messages.push(
          `${sale.local_invoice_number} non synchronisée : ${message}`
        );
      }
    }
  }

  if (result.syncedCount > 0) {
    result.messages.push(
      "Ventes synchronisées. Pensez à relancer la synchronisation des produits pour actualiser le cache offline."
    );
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mpangi-offline-cache-updated"));
  }

  return result;
}

export async function getOfflineSalesWithItems(pharmacyId: string) {
  const sales = await offlineDb.offlineSales
    .where("pharmacy_id")
    .equals(pharmacyId)
    .reverse()
    .sortBy("created_at");

  const items = await offlineDb.offlineSaleItems
    .where("pharmacy_id")
    .equals(pharmacyId)
    .toArray();

  return sales
    .map((sale) => ({
      ...sale,
      items: items.filter((item) => item.offline_sale_id === sale.id),
    }))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export async function cancelOfflineSale(
  pharmacyId: string,
  offlineSaleId: string
) {
  const sale = await offlineDb.offlineSales.get(offlineSaleId);

  if (!sale || sale.pharmacy_id !== pharmacyId) {
    throw new Error("Vente offline introuvable.");
  }

  if (sale.status === "synced") {
    throw new Error("Impossible d’annuler une vente déjà synchronisée.");
  }

  const items = await offlineDb.offlineSaleItems
    .where("offline_sale_id")
    .equals(offlineSaleId)
    .toArray();

  const cancelledAt = nowIso();

  await offlineDb.transaction(
    "rw",
    offlineDb.sellableProducts,
    offlineDb.offlineSales,
    offlineDb.syncLogs,
    async () => {
      for (const item of items) {
        const localProductId = productLocalId(pharmacyId, item.product_id);
        const localProduct = await offlineDb.sellableProducts.get(localProductId);

        if (localProduct) {
          await offlineDb.sellableProducts.update(localProductId, {
            total_quantity:
              Number(localProduct.total_quantity || 0) + Number(item.quantity || 0),
            cached_at: cancelledAt,
          });
        }
      }

      await offlineDb.offlineSales.update(offlineSaleId, {
        status: "cancelled",
        updated_at: cancelledAt,
      });

      await offlineDb.syncLogs.add({
        id: createOfflineId("sync_log"),
        pharmacy_id: pharmacyId,
        type: "sales",
        status: "success",
        message: `Vente offline annulée : ${sale.local_invoice_number}`,
        created_at: cancelledAt,
      });
    }
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mpangi-offline-cache-updated"));
  }

  return offlineSaleId;
}