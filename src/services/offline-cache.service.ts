"use client";

import {
  createOfflineId,
  offlineDb,
  type LocalSellableProduct,
  type OfflineSyncState,
} from "@/lib/offline/db";
import { getSellableProducts } from "@/services/sales.service";

function nowIso() {
  return new Date().toISOString();
}

function productLocalId(pharmacyId: string, productId: string) {
  return `${pharmacyId}:${productId}`;
}

export async function syncSellableProductsToOffline(pharmacyId: string) {
  const startedAt = nowIso();

  await offlineDb.syncState.put({
    id: `sellable_products:${pharmacyId}`,
    pharmacy_id: pharmacyId,
    key: "sellable_products",
    status: "running",
    count: 0,
    last_synced_at: null,
    error_message: null,
    updated_at: startedAt,
  });

  try {
    const products = await getSellableProducts(pharmacyId);

    const cachedProducts: LocalSellableProduct[] = products.map((product) => ({
      ...product,
      local_id: productLocalId(pharmacyId, product.product_id),
      pharmacy_id: pharmacyId,
      cached_at: startedAt,
    }));

    await offlineDb.transaction(
      "rw",
      [
        offlineDb.sellableProducts,
        offlineDb.offlineSales,
        offlineDb.offlineSaleItems,
        offlineDb.syncState,
        offlineDb.syncLogs,
      ],
      async () => {
        // Ventes faites hors-ligne et pas encore reçues par le serveur : leurs
        // quantités ne sont pas dans le stock que le serveur vient de renvoyer.
        // On les retire à nouveau, sinon la caisse pourrait revendre ce stock.
        const pendingSales = await offlineDb.offlineSales
          .where("pharmacy_id")
          .equals(pharmacyId)
          .filter((sale) =>
            ["pending_sync", "syncing", "sync_failed", "conflict"].includes(
              sale.status
            )
          )
          .toArray();

        const pendingQuantity = new Map<string, number>();

        for (const sale of pendingSales) {
          const items = await offlineDb.offlineSaleItems
            .where("offline_sale_id")
            .equals(sale.id)
            .toArray();

          for (const item of items) {
            pendingQuantity.set(
              item.product_id,
              (pendingQuantity.get(item.product_id) ?? 0) +
                Number(item.quantity || 0)
            );
          }
        }

        for (const product of cachedProducts) {
          const pending = pendingQuantity.get(product.product_id);

          if (pending) {
            product.total_quantity = Math.max(
              Number(product.total_quantity || 0) - pending,
              0
            );
          }
        }

        await offlineDb.sellableProducts
          .where("pharmacy_id")
          .equals(pharmacyId)
          .delete();

        if (cachedProducts.length > 0) {
          await offlineDb.sellableProducts.bulkPut(cachedProducts);
        }

        await offlineDb.syncState.put({
          id: `sellable_products:${pharmacyId}`,
          pharmacy_id: pharmacyId,
          key: "sellable_products",
          status: "success",
          count: cachedProducts.length,
          last_synced_at: startedAt,
          error_message: null,
          updated_at: startedAt,
        });

        await offlineDb.syncLogs.add({
          id: createOfflineId("sync_log"),
          pharmacy_id: pharmacyId,
          type: "products",
          status: "success",
          message: `${cachedProducts.length} produit(s) synchronisé(s).`,
          created_at: startedAt,
        });
      }
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mpangi-offline-cache-updated"));
    }

    return {
      count: cachedProducts.length,
      lastSyncedAt: startedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de synchroniser les produits.";

    const failedAt = nowIso();

    await offlineDb.syncState.put({
      id: `sellable_products:${pharmacyId}`,
      pharmacy_id: pharmacyId,
      key: "sellable_products",
      status: "failed",
      count: 0,
      last_synced_at: null,
      error_message: message,
      updated_at: failedAt,
    });

    await offlineDb.syncLogs.add({
      id: createOfflineId("sync_log"),
      pharmacy_id: pharmacyId,
      type: "products",
      status: "failed",
      message,
      created_at: failedAt,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mpangi-offline-cache-updated"));
    }

    throw new Error(message);
  }
}

export async function getOfflineSellableProducts(pharmacyId: string) {
  return await offlineDb.sellableProducts
    .where("pharmacy_id")
    .equals(pharmacyId)
    .sortBy("name");
}

export async function getProductOfflineSyncState(
  pharmacyId: string
): Promise<OfflineSyncState | undefined> {
  return await offlineDb.syncState.get(`sellable_products:${pharmacyId}`);
}

export async function getPendingOfflineSalesCount(pharmacyId: string) {
  return await offlineDb.offlineSales
    .where("pharmacy_id")
    .equals(pharmacyId)
    .filter((sale) =>
      ["pending_sync", "syncing", "sync_failed", "conflict"].includes(
        sale.status
      )
    )
    .count();
}