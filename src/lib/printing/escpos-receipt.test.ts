import assert from "node:assert/strict";
import test from "node:test";

import { buildEscPosReceipt, encodeBytesToBase64 } from "./escpos-receipt";

import type { ThermalReceipt } from "./receipt";

function createReceipt(): ThermalReceipt {
  return {
    pharmacyName: "Pharmacie Élikya",
    pharmacyAddress: "Bandal 165",
    invoiceNumber: "FAC/2026/001",
    date: "2026-08-20T10:00:00.000Z",
    paymentMethod: "cash",
    currency: "CDF",
    items: [
      {
        name: "Paracétamol 500mg",
        quantity: 2,
        unitPrice: 1_000,
        total: 2_000,
      },
    ],
    subtotal: 2_000,
    discount: 0,
    subtotalHt: 2_000,
    vatTotal: 0,
    totalTtc: 2_000,
  };
}

test("le flux ESC/POS commence par une réinitialisation ESC @", () => {
  const bytes = buildEscPosReceipt(createReceipt(), 58);

  assert.equal(bytes[0], 0x1b);
  assert.equal(bytes[1], 0x40);
});

test("le flux ESC/POS se termine par une commande de coupe GS V", () => {
  const bytes = buildEscPosReceipt(createReceipt(), 58);

  assert.equal(bytes[bytes.length - 3], 0x1d);
  assert.equal(bytes[bytes.length - 2], 0x56);
  assert.equal(bytes[bytes.length - 1], 0x01);
});

test("tous les octets du corps restent en ASCII imprimable ou saut de ligne", () => {
  const bytes = buildEscPosReceipt(createReceipt(), 58);

  for (const byte of bytes) {
    assert.ok(
      byte === 0x0a || byte === 0x1b || byte === 0x1d || byte <= 0x7f,
      `octet hors plage: ${byte}`
    );
  }
});

test("l'encodage base64 est réversible", () => {
  const source = Uint8Array.from([0x1b, 0x40, 0x41, 0x0a, 0xff]);
  const base64 = encodeBytesToBase64(source);
  const decoded = Buffer.from(base64, "base64");

  assert.deepEqual(Array.from(decoded), Array.from(source));
});
