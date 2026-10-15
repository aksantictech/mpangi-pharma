import { getSalesTrend } from "@/services/dashboard.service";
import { getPharmacySubscription } from "@/services/subscriptions.service";
import {
  getExpirationAlerts,
  getProductStock,
} from "@/services/products.service";
import { getAllActiveBatches } from "@/services/stock.service";
import { isSubscriptionBlocking } from "@/types/subscription";

import type { PharmacyWithRole } from "@/types/pharmacy";

export type NetworkPharmacyStats = {
  pharmacy: PharmacyWithRole;
  /** Les chiffres de stock n'ont pas pu être lus (droits, abonnement, connexion). */
  stockUnavailable: boolean;
  salesUnavailable: boolean;
  salesToday: number;
  salesCountToday: number;
  sales7Days: number;
  products: number;
  productsInStock: number;
  quantity: number;
  outOfStock: number;
  lowStock: number;
  expiredLots: number;
  expiringSoonLots: number;
  stockValuePurchase: number;
  subscriptionBlocked: boolean;
};

async function getPharmacyStats(
  pharmacy: PharmacyWithRole
): Promise<NetworkPharmacyStats> {
  const [stock, alerts, batches, trend, subscription] =
    await Promise.allSettled([
      getProductStock(pharmacy.id),
      getExpirationAlerts(pharmacy.id),
      getAllActiveBatches(pharmacy.id),
      getSalesTrend(pharmacy.id),
      getPharmacySubscription(pharmacy.id),
    ]);

  // Les produits archivés sont retirés du catalogue : ils ne comptent pas.
  const products =
    stock.status === "fulfilled"
      ? stock.value.filter((product) => product.status !== "archived")
      : [];

  const expired =
    alerts.status === "fulfilled"
      ? alerts.value.filter((alert) => alert.expiration_status === "expired")
          .length
      : 0;

  return {
    pharmacy,
    stockUnavailable: stock.status === "rejected",
    salesUnavailable: trend.status === "rejected",
    salesToday: trend.status === "fulfilled" ? trend.value.today.total : 0,
    salesCountToday: trend.status === "fulfilled" ? trend.value.today.count : 0,
    sales7Days:
      trend.status === "fulfilled"
        ? trend.value.days.reduce((sum, day) => sum + day.total, 0)
        : 0,
    products: products.length,
    productsInStock: products.filter(
      (product) => Number(product.total_quantity || 0) > 0
    ).length,
    quantity: products.reduce(
      (sum, product) => sum + Number(product.total_quantity || 0),
      0
    ),
    outOfStock: products.filter(
      (product) => product.stock_status === "out_of_stock"
    ).length,
    lowStock: products.filter((product) => product.stock_status === "low_stock")
      .length,
    expiredLots: expired,
    expiringSoonLots:
      alerts.status === "fulfilled" ? alerts.value.length - expired : 0,
    stockValuePurchase:
      batches.status === "fulfilled"
        ? batches.value.reduce(
            (sum, batch) =>
              sum +
              Number(batch.quantity_available || 0) *
                Number(batch.purchase_price || 0),
            0
          )
        : 0,
    subscriptionBlocked:
      subscription.status === "fulfilled"
        ? isSubscriptionBlocking(subscription.value)
        : false,
  };
}

/** Indicateurs de chaque pharmacie du réseau, lus en parallèle. */
export async function getNetworkStats(
  pharmacies: PharmacyWithRole[]
): Promise<NetworkPharmacyStats[]> {
  return await Promise.all(pharmacies.map((pharmacy) => getPharmacyStats(pharmacy)));
}
