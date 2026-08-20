import assert from "node:assert/strict";
import test from "node:test";

import {
  buildThermalReceiptRasterPages,
  safeReceiptFileName,
} from "./receipt-image";

import type { ThermalReceipt } from "./receipt";

function createReceipt(itemCount = 1): ThermalReceipt {
  return {
    pharmacyName: "Pharmacie Test",
    invoiceNumber: "FAC/2026/001",
    date: "2026-08-20T10:00:00.000Z",
    paymentMethod: "cash",
    currency: "CDF",
    items: Array.from({ length: itemCount }, (_, index) => ({
      name: `Produit ${index + 1} avec une désignation suffisamment longue`,
      quantity: 2,
      unitPrice: 1_000,
      total: 2_000,
    })),
    subtotal: itemCount * 2_000,
    discount: 0,
    subtotalHt: itemCount * 2_000,
    vatTotal: 0,
    totalTtc: itemCount * 2_000,
  };
}

test("le ticket image 58 mm utilise exactement 384 pixels", () => {
  const pages = buildThermalReceiptRasterPages(createReceipt(), 58);

  assert.equal(pages.length, 1);
  assert.equal(pages[0]?.width, 384);
  assert.ok((pages[0]?.height ?? 0) > 0);
});

test("une facture longue est paginée sans dépasser 160 lignes", () => {
  const pages = buildThermalReceiptRasterPages(createReceipt(100), 58);

  assert.ok(pages.length > 1);
  assert.ok(pages.every((page) => page.lines.length <= 160));
});

test("le nom du fichier ticket est compatible avec Android", () => {
  assert.equal(safeReceiptFileName("FAC/Été 2026/001"), "FAC-Ete-2026-001");
});
