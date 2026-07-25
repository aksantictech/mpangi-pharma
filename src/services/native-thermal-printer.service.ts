export type NativeThermalReceiptItem = {
  name: string;
  details?: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type NativeThermalReceipt = {
  pharmacyName: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  paymentMethod: string;
  currency: string;
  items: NativeThermalReceiptItem[];
  subtotal: number;
  discount: number;
  subtotalHt: number;
  vatTotal: number;
  totalTtc: number;
};

type NativePrinterBridge = {
  isAvailable?: () => boolean | Promise<boolean>;
  printReceipt: (
    payload: string
  ) => void | string | Promise<void | string>;
};

declare global {
  interface Window {
    MpangiNativePrinter?: NativePrinterBridge;
  }
}

export async function isNativeThermalPrinterAvailable() {
  if (typeof window === "undefined") {
    return false;
  }

  const bridge = window.MpangiNativePrinter;

  if (!bridge || typeof bridge.printReceipt !== "function") {
    return false;
  }

  if (typeof bridge.isAvailable !== "function") {
    return true;
  }

  return Boolean(await bridge.isAvailable());
}

export async function printNativeThermalReceipt(
  receipt: NativeThermalReceipt
) {
  if (typeof window === "undefined") {
    throw new Error(
      "L’impression native est disponible uniquement sur le terminal Android."
    );
  }

  const bridge = window.MpangiNativePrinter;

  if (!bridge || typeof bridge.printReceipt !== "function") {
    throw new Error(
  "Le pont d’impression native n’est pas disponible sur cet appareil. " +
    "Utilisez l’application Android Mpangi Pharma installée sur le terminal H10."
);
  }

  const payload = JSON.stringify({
    version: 1,
    printerMode: "thermal-native",
    paperWidthMm: 58,
    encoding: "UTF-8",
    cutPaper: false,
    feedLinesAfterPrint: 4,
    receipt,
  });

  const result = await bridge.printReceipt(payload);

  if (typeof result !== "string") {
    return;
  }

  try {
    const parsed = JSON.parse(result) as {
      ok?: boolean;
      error?: string;
    };

    if (parsed.ok === false) {
      throw new Error(
        parsed.error ||
          "Le terminal a refusé l’impression."
      );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return;
    }

    throw error;
  }
}
