import {
  renderReceiptAsPlainText,
  type ThermalPaperWidth,
  type ThermalReceipt,
} from "@/lib/printing/receipt";

/**
 * Construit un flux ESC/POS minimal et portable pour le ticket.
 *
 * Le texte est deja mis en page (colonnes fixes) par `renderReceiptAsPlainText`.
 * On se limite aux commandes universelles : init, jeu de caracteres, saut de
 * lignes final et coupe partielle. Les accents sont replies en ASCII car les
 * terminaux bas de gamme n'ont pas tous la page de code latine.
 */
export function buildEscPosReceipt(
  receipt: ThermalReceipt,
  paperWidth: ThermalPaperWidth = 58
): Uint8Array {
  const ESC = 0x1b;
  const GS = 0x1d;

  const body = foldToAscii(renderReceiptAsPlainText(receipt, paperWidth));

  const bytes: number[] = [ESC, 0x40, ESC, 0x74, 0x00, ESC, 0x61, 0x00];

  for (const char of body + "\n") {
    if (char === "\n") {
      bytes.push(0x0a);
      continue;
    }

    const code = char.charCodeAt(0);
    bytes.push(code >= 0x20 && code < 0x7f ? code : 0x3f);
  }

  bytes.push(0x0a, 0x0a, 0x0a, 0x0a, GS, 0x56, 0x01);

  return Uint8Array.from(bytes);
}

export function encodeBytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  return Buffer.from(bytes).toString("base64");
}

function foldToAscii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u20ac/g, "EUR")
    .replace(/[^\n\x20-\x7e]/g, "?");
}
