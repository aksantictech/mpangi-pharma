export type ThermalReceiptItem = {
  name: string;
  details?: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ThermalReceipt = {
  pharmacyName: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  paymentMethod: string;
  currency: string;
  items: ThermalReceiptItem[];
  subtotal: number;
  discount: number;
  subtotalHt: number;
  vatTotal: number;
  totalTtc: number;
};

export type ThermalPaperWidth = 58 | 80;

const COLUMNS_BY_PAPER_WIDTH: Record<ThermalPaperWidth, number> = {
  58: 32,
  80: 48,
};

export function renderReceiptAsPlainText(
  receipt: ThermalReceipt,
  paperWidth: ThermalPaperWidth = 58
) {
  const columns = COLUMNS_BY_PAPER_WIDTH[paperWidth];
  const separator = "-".repeat(columns);
  const lines: string[] = [];

  lines.push(...centerAndWrap(receipt.pharmacyName, columns));

  if (receipt.pharmacyAddress?.trim()) {
    lines.push(...centerAndWrap(receipt.pharmacyAddress, columns));
  }

  if (receipt.pharmacyPhone?.trim()) {
    lines.push(...centerAndWrap(`Tel: ${receipt.pharmacyPhone}`, columns));
  }

  lines.push(separator);
  lines.push(...labelValue("Facture", receipt.invoiceNumber, columns));
  lines.push(...labelValue("Date", formatReceiptDate(receipt.date), columns));
  lines.push(
    ...labelValue(
      "Client",
      receipt.customerName?.trim() || "Client comptoir",
      columns
    )
  );
  lines.push(...labelValue("Paiement", receipt.paymentMethod, columns));
  lines.push(separator);

  for (const item of receipt.items) {
    lines.push(...wrapText(item.name, columns));

    if (item.details?.trim()) {
      lines.push(...wrapText(item.details, columns));
    }

    const quantityAndPrice = `${formatQuantity(item.quantity)} x ${formatMoney(
      item.unitPrice,
      receipt.currency
    )}`;

    lines.push(
      ...labelValue(
        quantityAndPrice,
        formatMoney(item.total, receipt.currency),
        columns
      )
    );
  }

  lines.push(separator);
  lines.push(
    ...labelValue(
      "Sous-total",
      formatMoney(receipt.subtotal, receipt.currency),
      columns
    )
  );
  lines.push(
    ...labelValue(
      "Remise",
      formatMoney(receipt.discount, receipt.currency),
      columns
    )
  );
  lines.push(
    ...labelValue(
      "Sous-total HT",
      formatMoney(receipt.subtotalHt, receipt.currency),
      columns
    )
  );
  lines.push(
    ...labelValue(
      "Total TVA",
      formatMoney(receipt.vatTotal, receipt.currency),
      columns
    )
  );
  lines.push(separator);
  lines.push(
    ...labelValue(
      "TOTAL TTC",
      formatMoney(receipt.totalTtc, receipt.currency),
      columns
    )
  );
  lines.push(separator);
  lines.push(...centerAndWrap("Merci pour votre achat.", columns));
  lines.push(...centerAndWrap("Mpangi Pharma", columns));

  return lines.join("\n");
}

export function getThermalColumns(paperWidth: ThermalPaperWidth) {
  return COLUMNS_BY_PAPER_WIDTH[paperWidth];
}

function labelValue(label: string, value: string, columns: number) {
  const normalizedLabel = normalizeWhitespace(label);
  const normalizedValue = normalizeWhitespace(value);
  const minimumGap = 1;

  if (
    normalizedLabel.length + normalizedValue.length + minimumGap <=
    columns
  ) {
    return [
      normalizedLabel +
        " ".repeat(
          columns - normalizedLabel.length - normalizedValue.length
        ) +
        normalizedValue,
    ];
  }

  return [
    ...wrapText(normalizedLabel, columns),
    ...wrapText(normalizedValue, columns).map((line) =>
      line.padStart(columns, " ")
    ),
  ];
}

function centerAndWrap(value: string, columns: number) {
  return wrapText(value, columns).map((line) => {
    const leftPadding = Math.max(
      0,
      Math.floor((columns - line.length) / 2)
    );

    return `${" ".repeat(leftPadding)}${line}`;
  });
}

function wrapText(value: string, columns: number) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) return [""];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const chunks = splitLongWord(word, columns);

    for (const chunk of chunks) {
      const candidate = currentLine
        ? `${currentLine} ${chunk}`
        : chunk;

      if (candidate.length <= columns) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = chunk;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function splitLongWord(value: string, columns: number) {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += columns) {
    chunks.push(value.slice(index, index + columns));
  }

  return chunks;
}

function normalizeWhitespace(value: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function formatMoney(value: number, currency: string) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safeValue * 100) / 100;
  return `${rounded.toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatQuantity(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("fr-FR", {
    maximumFractionDigits: 3,
  });
}

function formatReceiptDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-CD");
}
