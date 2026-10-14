import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInventoryLines,
  signedQuantity,
  summarizeInventory,
  type InventoryProductInput,
} from "./inventory";

const product: InventoryProductInput = {
  productId: "p1",
  name: "Paracétamol",
  genericName: null,
  dosage: "500mg",
  form: "Comprimé",
  unit: "boîte",
  categoryId: null,
  categoryName: "Antalgiques",
  supplierName: null,
  minStock: 10,
  requiresPrescription: false,
  status: "active",
  currentQuantity: 50,
  batches: [
    { quantity: 30, purchasePrice: 1000, sellingPrice: 1500, expiryDate: "2026-01-01" },
    { quantity: 20, purchasePrice: 2000, sellingPrice: 3000, expiryDate: "2027-06-30" },
  ],
};

test("signedQuantity : sens fixe par type, signe conservé pour une correction", () => {
  assert.equal(signedQuantity("supplier_entry", 5), 5);
  assert.equal(signedQuantity("sale", 5), -5);
  assert.equal(signedQuantity("sale", -5), -5);
  assert.equal(signedQuantity("customer_return", -2), 2);
  assert.equal(signedQuantity("inventory_correction", -3), -3);
  assert.equal(signedQuantity("inventory_correction", 4), 4);
});

test("période se terminant aujourd'hui : stock de fin = stock actuel", () => {
  const [line] = buildInventoryLines({
    products: [product],
    movements: [
      { product_id: "p1", movement_type: "supplier_entry", quantity: 40, created_at: "2026-10-05T10:00:00" },
      { product_id: "p1", movement_type: "sale", quantity: 10, created_at: "2026-10-08T10:00:00" },
      { product_id: "p1", movement_type: "loss", quantity: 5, created_at: "2026-10-09T10:00:00" },
    ],
    from: "2026-10-01",
    to: "2026-10-14",
    today: "2026-10-14",
  });

  assert.equal(line.closing, 50);
  assert.equal(line.entries, 40);
  assert.equal(line.exits, 15);
  // 50 = ouverture + 40 - 15  =>  ouverture = 25
  assert.equal(line.opening, 25);
});

test("période passée : les mouvements postérieurs sont annulés du stock actuel", () => {
  const [line] = buildInventoryLines({
    products: [product],
    movements: [
      { product_id: "p1", movement_type: "supplier_entry", quantity: 40, created_at: "2026-10-05T10:00:00" },
      // Après la période : 8 vendus et 3 entrés => net -5
      { product_id: "p1", movement_type: "sale", quantity: 8, created_at: "2026-10-12T10:00:00" },
      { product_id: "p1", movement_type: "supplier_entry", quantity: 3, created_at: "2026-10-13T10:00:00" },
    ],
    from: "2026-10-01",
    to: "2026-10-10",
    today: "2026-10-14",
  });

  // stock à la fin du 10/10 = 50 - (-5) = 55
  assert.equal(line.closing, 55);
  assert.equal(line.entries, 40);
  assert.equal(line.exits, 0);
  assert.equal(line.opening, 15);
});

test("valorisation au prix moyen pondéré et expirations", () => {
  const [line] = buildInventoryLines({
    products: [product],
    movements: [],
    from: "2026-10-01",
    to: "2026-10-14",
    today: "2026-10-14",
  });

  // (30*1000 + 20*2000) / 50 = 1400
  assert.equal(line.averagePurchasePrice, 1400);
  assert.equal(line.purchaseValue, 50 * 1400);
  // (30*1500 + 20*3000) / 50 = 2100
  assert.equal(line.sellingValue, 50 * 2100);
  assert.equal(line.expiredQuantity, 30);
  assert.equal(line.expiringSoonQuantity, 0);
  assert.equal(line.nearestExpiry, "2026-01-01");
  assert.equal(line.stockStatus, "ok");
});

test("statuts de stock et totaux", () => {
  const lines = buildInventoryLines({
    products: [
      { ...product, productId: "a", currentQuantity: 0, batches: [] },
      { ...product, productId: "b", currentQuantity: 8, batches: [] },
      { ...product, productId: "c", currentQuantity: 100, batches: [] },
    ],
    movements: [],
    from: "2026-10-01",
    to: "2026-10-14",
    today: "2026-10-14",
  });

  assert.deepEqual(
    lines.map((line) => line.stockStatus),
    ["out", "low", "ok"]
  );

  const totals = summarizeInventory(lines);

  assert.equal(totals.products, 3);
  assert.equal(totals.closing, 108);
  assert.equal(totals.outOfStock, 1);
  assert.equal(totals.lowStock, 1);
});
