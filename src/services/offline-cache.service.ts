"use client";

import Dexie, { type Table } from "dexie";

import type { PaymentMethod, SellableProduct } from "@/types/sale";

export type LocalSellableProduct = SellableProduct & {
  local_id: string;
  pharmacy_id: string;
  cached_at: string;
};

export type OfflineSaleStatus =
  | "pending_sync"
  | "syncing"
  | "synced"
  | "sync_failed"
  | "conflict"
  | "cancelled";

export type OfflineSale = {
  id: string;
  pharmacy_id: string;
  device_id: string;
  local_invoice_number: string;
  customer_name: string | null;
  payment_method: PaymentMethod;
  currency: string;
  discount: number;
  notes: string | null;
  subtotal: number;
  total: number;
  status: OfflineSaleStatus;
  conflict_reason: string | null;
  server_sale_id: string | null;
  server_invoice_number: string | null;
  created_at: string;
  synced_at: string | null;
  updated_at: string;
};

export type OfflineSaleItem = {
  id: string;
  offline_sale_id: string;
  pharmacy_id: string;
  product_id: string;
  product_name: string;
  dosage: string | null;
  form: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  available_quantity_at_sale: number;
  requires_prescription?: boolean;
};

export type OfflineSyncState = {
  id: string;
  pharmacy_id: string;
  key: string;
  status: "success" | "failed" | "running";
  count: number;
  last_synced_at: string | null;
  error_message: string | null;
  updated_at: string;
};

export type OfflineSyncLog = {
  id: string;
  pharmacy_id: string;
  type: "products" | "sales" | "settings";
  status: "success" | "failed" | "running";
  message: string | null;
  created_at: string;
};

class MpangiOfflineDatabase extends Dexie {
  sellableProducts!: Table<LocalSellableProduct, string>;
  offlineSales!: Table<OfflineSale, string>;
  offlineSaleItems!: Table<OfflineSaleItem, string>;
  syncState!: Table<OfflineSyncState, string>;
  syncLogs!: Table<OfflineSyncLog, string>;

  constructor() {
    super("mpangi_pharma_offline");

    this.version(1).stores({
      sellableProducts:
        "local_id, pharmacy_id, product_id, name, generic_name, barcode, cached_at",
      offlineSales:
        "id, pharmacy_id, device_id, status, created_at, synced_at, server_sale_id",
      offlineSaleItems: "id, offline_sale_id, pharmacy_id, product_id",
      syncState: "id, pharmacy_id, key, status, last_synced_at",
      syncLogs: "id, pharmacy_id, type, status, created_at",
    });

    this.version(2).stores({
      sellableProducts:
        "local_id, pharmacy_id, product_id, name, generic_name, barcode, cached_at",
      offlineSales:
        "id, pharmacy_id, device_id, status, created_at, synced_at, server_sale_id",
      offlineSaleItems: "id, offline_sale_id, pharmacy_id, product_id",
      syncState: "id, pharmacy_id, key, status, last_synced_at",
      syncLogs: "id, pharmacy_id, type, status, created_at",
    });
  }
}

export const offlineDb = new MpangiOfflineDatabase();

const DEVICE_ID_KEY = "mpangi_pharma_device_id";

export function createOfflineId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getOfflineDeviceId() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existingDeviceId = window.localStorage.getItem(DEVICE_ID_KEY);

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const newDeviceId = createOfflineId("device");

  window.localStorage.setItem(DEVICE_ID_KEY, newDeviceId);

  return newDeviceId;
}
