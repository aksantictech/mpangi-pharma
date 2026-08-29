import {
  renderReceiptAsPlainText,
  type ThermalPaperWidth,
  type ThermalReceipt,
} from "@/lib/printing/receipt";
import {
  createThermalReceiptPngs,
  type ThermalReceiptPng,
} from "@/lib/printing/receipt-image";
import {
  buildEscPosReceipt,
  encodeBytesToBase64,
} from "@/lib/printing/escpos-receipt";

export type NativeThermalReceipt = ThermalReceipt;

export type NativePrinterCapabilities = {
  available: boolean;
  bridge: boolean;
  systemPrint: boolean;
  share: boolean;
  fileShare: boolean;
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

export function hasNativeThermalPrinterBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.MpangiNativePrinter?.printReceipt === "function"
  );
}

export function isAndroidPrintingDevice() {
  return (
    typeof navigator !== "undefined" &&
    /Android/i.test(navigator.userAgent)
  );
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
  const fileShare = canShareThermalReceiptFiles();

  return {
    available: bridge || typeof window !== "undefined",
    bridge,
    systemPrint: typeof window !== "undefined" && "print" in window,
    share:
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function",
    fileShare,
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

export type ThermalReceiptImage = {
  dataUrl: string;
  width: number;
  height: number;
};

/**
 * Bitmaps déterministes du ticket, prêts pour l'impression via iframe isolé.
 * Utilisé sur Android où le rendu HTML/CSS fluide déforme le ticket.
 */
export function createThermalReceiptImages(
  receipt: NativeThermalReceipt,
  paperWidth: ThermalPaperWidth = 58
): ThermalReceiptImage[] {
  return createThermalReceiptPngs(receipt, paperWidth).map((page) => ({
    dataUrl: page.dataUrl,
    width: page.width,
    height: page.height,
  }));
}

/**
 * Indique si RawBT (service d'impression ESC/POS le plus courant sur les
 * terminaux Android sans SDK constructeur) est probablement exploitable.
 * Aucune API ne permet de le détecter avec certitude : on se base sur la
 * plateforme et sur l'absence de pont natif Mpangi.
 */
export function canUseRawBtPrinting() {
  return (
    typeof window !== "undefined" &&
    isAndroidPrintingDevice() &&
    !hasNativeThermalPrinterBridge()
  );
}

/**
 * Envoie le ticket à RawBT via son schéma d'URL. Si l'application est
 * installée et configurée, l'impression est directe et silencieuse. Sinon,
 * rien ne se passe (le schéma inconnu ne fait pas naviguer Chrome) et
 * l'appelant doit proposer un repli.
 */
export async function printThermalReceiptViaRawBt(
  receipt: NativeThermalReceipt,
  paperWidth: ThermalPaperWidth = 58
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error(
      "L’impression RawBT est disponible uniquement sur le terminal Android."
    );
  }

  const payload = encodeBytesToBase64(
    buildEscPosReceipt(receipt, paperWidth)
  );

  const target = `rawbt:base64,${payload}`;

  const anchor = document.createElement("a");
  anchor.href = target;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);

  try {
    anchor.click();
  } finally {
    window.setTimeout(() => anchor.remove(), 1_000);
  }
}

export async function shareThermalReceipt(
  receipt: NativeThermalReceipt,
  paperWidth: ThermalPaperWidth = 58
) {
  if (typeof window === "undefined") {
    throw new Error("Le partage du ticket est indisponible sur le serveur.");
  }

  const title = `Ticket ${receipt.invoiceNumber}`;
  const images = createThermalReceiptPngs(receipt, paperWidth);
  const files = createShareableFiles(images);

  if (files.length > 0 && canShareFiles(files)) {
    // Cette invocation doit rester dans le même geste utilisateur. Ne pas
    // ajouter d'attente asynchrone avant navigator.share sur Android.
    await navigator.share({
      title,
      text: "Ticket de vente Mpangi Pharma",
      files,
    });

    return "share-image" as const;
  }

  const text = renderReceiptAsPlainText(receipt, paperWidth);

  if (typeof navigator.share === "function") {
    await navigator.share({
      title,
      text,
    });

    return "share-text" as const;
  }

  downloadThermalReceiptImages(images);

  return "download-image" as const;
}

function canShareThermalReceiptFiles() {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    typeof File === "undefined"
  ) {
    return false;
  }

  try {
    const sample = new File(["ticket"], "ticket.png", {
      type: "image/png",
    });

    return navigator.canShare({ files: [sample] });
  } catch {
    return false;
  }
}

function createShareableFiles(images: ThermalReceiptPng[]) {
  if (typeof File === "undefined") return [];

  return images.map(
    (image) =>
      new File([image.blob], image.fileName, {
        type: "image/png",
        lastModified: Date.now(),
      })
  );
}

function canShareFiles(files: File[]) {
  if (
    typeof navigator.canShare !== "function" ||
    typeof navigator.share !== "function"
  ) {
    return false;
  }

  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

function downloadThermalReceiptImages(images: ThermalReceiptPng[]) {
  images.forEach((image, index) => {
    const url = URL.createObjectURL(image.blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = image.fileName;
    link.rel = "noopener";
    document.body.appendChild(link);

    const triggerDownload = () => {
      link.click();
      link.remove();
    };

    if (index === 0) {
      triggerDownload();
    } else {
      window.setTimeout(triggerDownload, index * 150);
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  });
}
