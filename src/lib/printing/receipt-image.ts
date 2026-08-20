import {
  renderReceiptAsPlainText,
  type ThermalPaperWidth,
  type ThermalReceipt,
} from "@/lib/printing/receipt";

const RASTER_WIDTH_BY_PAPER: Record<ThermalPaperWidth, number> = {
  58: 384,
  80: 576,
};

const FONT_SIZE_PX = 18;
const LINE_HEIGHT_PX = 26;
const HORIZONTAL_PADDING_PX = 16;
const VERTICAL_PADDING_PX = 20;
const MAX_LINES_PER_PAGE = 160;

export type ThermalReceiptRasterPage = {
  width: number;
  height: number;
  lines: string[];
  fontSize: number;
  lineHeight: number;
  horizontalPadding: number;
  verticalPadding: number;
};

export type ThermalReceiptPng = {
  blob: Blob;
  fileName: string;
};

export function buildThermalReceiptRasterPages(
  receipt: ThermalReceipt,
  paperWidth: ThermalPaperWidth = 58
): ThermalReceiptRasterPage[] {
  const width = RASTER_WIDTH_BY_PAPER[paperWidth];
  const lines = renderReceiptAsPlainText(receipt, paperWidth).split("\n");
  const pages: ThermalReceiptRasterPage[] = [];

  for (let index = 0; index < lines.length; index += MAX_LINES_PER_PAGE) {
    const pageLines = lines.slice(index, index + MAX_LINES_PER_PAGE);

    pages.push({
      width,
      height:
        VERTICAL_PADDING_PX * 2 +
        Math.max(1, pageLines.length) * LINE_HEIGHT_PX,
      lines: pageLines,
      fontSize: FONT_SIZE_PX,
      lineHeight: LINE_HEIGHT_PX,
      horizontalPadding: HORIZONTAL_PADDING_PX,
      verticalPadding: VERTICAL_PADDING_PX,
    });
  }

  return pages;
}

export function createThermalReceiptPngs(
  receipt: ThermalReceipt,
  paperWidth: ThermalPaperWidth = 58
): ThermalReceiptPng[] {
  if (typeof document === "undefined") {
    throw new Error(
      "La génération du ticket image est disponible uniquement sur l’appareil."
    );
  }

  const pages = buildThermalReceiptRasterPages(receipt, paperWidth);
  const baseName = safeFileName(receipt.invoiceNumber);

  return pages.map((page, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = page.width;
    canvas.height = page.height;

    const context = canvas.getContext("2d", {
      alpha: false,
    });

    if (!context) {
      throw new Error(
        "Le terminal ne permet pas de générer l’image du ticket."
      );
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, page.width, page.height);
    context.fillStyle = "#000000";
    context.font = `bold ${page.fontSize}px monospace`;
    context.textAlign = "left";
    context.textBaseline = "top";

    page.lines.forEach((line, lineIndex) => {
      context.fillText(
        line,
        page.horizontalPadding,
        page.verticalPadding + lineIndex * page.lineHeight
      );
    });

    const dataUrl = canvas.toDataURL("image/png");
    const blob = dataUrlToBlob(dataUrl);
    const suffix = pages.length > 1 ? `-page-${index + 1}` : "";

    return {
      blob,
      fileName: `${baseName}${suffix}.png`,
    };
  });
}

export function safeReceiptFileName(value: string) {
  return safeFileName(value);
}

function dataUrlToBlob(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",");

  if (commaIndex < 0) {
    throw new Error("Le ticket image généré est invalide.");
  }

  const metadata = dataUrl.slice(0, commaIndex);
  const encodedData = dataUrl.slice(commaIndex + 1);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? "image/png";
  const binary = atob(encodedData);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], {
    type: mimeType,
  });
}

function safeFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "ticket";
}
