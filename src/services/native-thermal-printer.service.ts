import {
  renderReceiptAsPlainText,
  type ThermalPaperWidth,
  type ThermalReceipt,
} from "@/lib/printing/receipt";

export type NativeThermalReceipt = ThermalReceipt;

export type NativePrinterCapabilities = {
  available: boolean;
  bridge: boolean;
  systemPrint: boolean;
  share: boolean;
  platform: "android" | "ios" | "desktop" | "unknown";
};

type NativePrinterBridge = {
  isAvailable?: () => boolean | Promise<boolean>;
  getCapabilities?: () =>
    | string
    | Record<string, unknown>
    | Promise<string | Record<string, unknown>>;
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

  try {
    return Boolean(await bridge.isAvailable());
  } catch {
    return false;
  }
}

export async function getNativePrinterCapabilities(): Promise<NativePrinterCapabilities> {
  const userAgent =
    typeof navigator === "undefined" ? "" : navigator.userAgent;

  const platform = /Android/i.test(userAgent)
    ? "android"
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? "ios"
      : userAgent
        ? "desktop"
        : "unknown";

  const bridge = await isNativeThermalPrinterAvailable();

  return {
    available: bridge || typeof window !== "undefined",
    bridge,
    systemPrint: typeof window !== "undefined" && "print" in window,
    share:
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function",
    platform,
  };
}

export async function printNativeThermalReceipt(
  receipt: NativeThermalReceipt
) {
  if (typeof window === "undefined") {
    throw new Error(
      "L’impression native est disponible uniquement depuis l’application mobile."
    );
  }

  const bridge = window.MpangiNativePrinter;

  if (!bridge || typeof bridge.printReceipt !== "function") {
    throw new Error(
      "Le connecteur natif n’est pas disponible. Utilisez l’impression système " +
        "ou partagez le ticket vers l’application de votre imprimante."
    );
  }

  const payload = JSON.stringify({
    version: 2,
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

export async function shareThermalReceipt(
  receipt: NativeThermalReceipt,
  paperWidth: ThermalPaperWidth = 58
) {
  if (typeof window === "undefined") {
    throw new Error("Le partage du ticket est indisponible sur le serveur.");
  }

  const text = renderReceiptAsPlainText(receipt, paperWidth);
  const title = `Ticket ${receipt.invoiceNumber}`;

  if (typeof navigator.share === "function") {
    await navigator.share({
      title,
      text,
    });

    return "share" as const;
  }

  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${safeFileName(receipt.invoiceNumber)}.txt`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);

  return "download" as const;
}

function safeFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "ticket";
}
