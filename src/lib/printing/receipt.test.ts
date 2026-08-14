import assert from "node:assert/strict";
import test from "node:test";

import {
  getThermalColumns,
  renderReceiptAsPlainText,
  type ThermalReceipt,
} from "./receipt";

const receipt: ThermalReceipt = {
  pharmacyName: "Pharmacie Mpangi Santé",
  pharmacyAddress: "12 avenue de la Paix, Kinshasa",
  pharmacyPhone: "+243 999 000 000",
  invoiceNumber: "FAC-2026-0001",
  date: "2026-08-14T08:00:00.000Z",
  customerName: "Client comptoir",
  paymentMethod: "Mobile Money",
  currency: "CDF",
  items: [
    {
      name: "Paracétamol pédiatrique avec un nom volontairement long",
      details: "Sirop 100 mg / 5 ml",
      quantity: 2,
      unitPrice: 4_500,
      total: 9_000,
    },
  ],
  subtotal: 9_000,
  discount: 0,
  subtotalHt: 7_758.62,
  vatTotal: 1_241.38,
  totalTtc: 9_000,
};

test("le ticket 58 mm ne dépasse jamais 32 caractères", () => {
  const output = renderReceiptAsPlainText(receipt, 58);
  const lines = output.split("\n");

  assert.equal(getThermalColumns(58), 32);
  assert.ok(lines.length > 10);
  assert.ok(lines.every((line) => line.length <= 32));
  assert.match(output, /FAC-2026-0001/);
  assert.match(output, /TOTAL TTC/);
});

test("le ticket 80 mm utilise une largeur de 48 caractères", () => {
  const output = renderReceiptAsPlainText(receipt, 80);
  const lines = output.split("\n");

  assert.equal(getThermalColumns(80), 48);
  assert.ok(lines.every((line) => line.length <= 48));
  assert.ok(lines.some((line) => line.length === 48));
});

test("les montants invalides sont neutralisés", () => {
  const output = renderReceiptAsPlainText(
    {
      ...receipt,
      totalTtc: Number.NaN,
    },
    58
  );

  assert.match(output, /0 CDF/);
  assert.doesNotMatch(output, /NaN/);
});
