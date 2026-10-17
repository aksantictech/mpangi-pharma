import assert from "node:assert/strict";
import test from "node:test";

import {
  createScanDetector,
  findProductByBarcode,
  normalizeBarcode,
} from "./barcode";

function type(detector: ReturnType<typeof createScanDetector>, text: string, start: number, gap: number) {
  let now = start;

  for (const char of text) {
    detector.feed(char, now);
    now += gap;
  }

  return detector.feed("Enter", now);
}

test("une rafale rapide terminée par Entrée donne le code", () => {
  assert.equal(type(createScanDetector(), "6001234567890", 1000, 12), "6001234567890");
});

test("une saisie humaine lente n'est pas prise pour un scan", () => {
  assert.equal(type(createScanDetector(), "6001234567890", 1000, 250), null);
});

test("un code trop court est ignoré", () => {
  assert.equal(type(createScanDetector(), "12", 1000, 10), null);
});

test("Entrée seule ou après une longue pause ne renvoie rien", () => {
  const detector = createScanDetector();

  assert.equal(detector.feed("Enter", 5000), null);

  detector.feed("1", 6000);
  detector.feed("2", 6010);
  detector.feed("3", 6020);
  detector.feed("4", 6030);
  assert.equal(detector.feed("Enter", 9000), null);
});

test("deux scans de suite ne se mélangent pas", () => {
  const detector = createScanDetector();

  assert.equal(type(detector, "1111111", 1000, 10), "1111111");
  assert.equal(type(detector, "2222222", 2000, 10), "2222222");
});

test("les zéros de tête sont ignorés pour les codes numériques", () => {
  assert.equal(normalizeBarcode("0123456789012"), normalizeBarcode("123456789012"));
  assert.equal(normalizeBarcode(" ABC-1 "), "abc-1");
  assert.equal(normalizeBarcode(null), "");
});

test("le produit est retrouvé par son code-barres", () => {
  const products = [
    { name: "A", barcode: "0123456789012" },
    { name: "B", barcode: null },
    { name: "C", barcode: "999" },
  ];

  assert.equal(findProductByBarcode(products, "123456789012")?.name, "A");
  assert.equal(findProductByBarcode(products, "000"), undefined);
  assert.equal(findProductByBarcode(products, "  "), undefined);
});
