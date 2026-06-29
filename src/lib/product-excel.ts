import * as XLSX from "xlsx";

export type ProductExcelImportRow = {
  rowNumber: number;
  name: string;
  genericName: string;
  form: string;
  dosage: string;
  unit: string;
  categoryName: string;
  supplierName: string;
  barcode: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  expirationDate: string;
  minStockThreshold: number;
  description: string;
};

export type ProductExcelParseResult = {
  rows: ProductExcelImportRow[];
  errors: string[];
};

const PRODUCT_TEMPLATE_HEADERS = [
  "Nom produit *",
  "Nom générique",
  "Forme",
  "Dosage",
  "Unité *",
  "Catégorie",
  "Fournisseur",
  "Code-barres",
  "Lot initial *",
  "Quantité initiale *",
  "Prix achat USD *",
  "Prix vente USD *",
  "Date expiration *",
  "Seuil stock minimum",
  "Description",
];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  const text = normalizeText(value).replace(",", ".");

  if (!text) return 0;

  const number = Number(text);

  return Number.isFinite(number) ? number : 0;
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed) {
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");

      return `${parsed.y}-${month}-${day}`;
    }
  }

  const text = normalizeText(value);

  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const frenchDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (frenchDate) {
    const [, day, month, year] = frenchDate;

    return `${year}-${month}-${day}`;
  }

  const date = new Date(text);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return "";
}

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }

  return "";
}

function isEmptyExcelRow(row: Record<string, unknown>) {
  return Object.values(row).every((value) => normalizeText(value) === "");
}

export function downloadProductExcelTemplate() {
  const sampleRow = {
    "Nom produit *": "Paracétamol",
    "Nom générique": "Paracétamol",
    Forme: "Comprimé",
    Dosage: "500 mg",
    "Unité *": "Boîte",
    Catégorie: "Antalgiques",
    Fournisseur: "Fournisseur principal",
    "Code-barres": "1234567890123",
    "Lot initial *": "LOT-001",
    "Quantité initiale *": 100,
    "Prix achat USD *": 1.5,
    "Prix vente USD *": 2,
    "Date expiration *": "2027-12-31",
    "Seuil stock minimum": 10,
    Description: "Produit exemple",
  };

  const workbook = XLSX.utils.book_new();

  const worksheet = XLSX.utils.json_to_sheet([sampleRow], {
    header: PRODUCT_TEMPLATE_HEADERS,
  });

  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 32 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Produits");

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Instructions"],
    [""],
    ["Les colonnes avec * sont obligatoires."],
    ["Date expiration : format recommandé YYYY-MM-DD, exemple 2027-12-31."],
    ["Prix achat USD et Prix vente USD : utiliser des nombres."],
    ["Catégorie : si vide, l’import utilisera Non classé."],
    ["Fournisseur : optionnel."],
    [""],
    ["Ne changez pas les titres des colonnes."],
  ]);

  instructions["!cols"] = [{ wch: 80 }];

  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");

  XLSX.writeFile(workbook, "modele-produits-mpangi-pharma.xlsx");
}

export async function parseProductExcelFile(
  file: File
): Promise<ProductExcelParseResult> {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    worksheet,
    {
      defval: "",
      raw: true,
    }
  );

  const rows: ProductExcelImportRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;

    if (isEmptyExcelRow(rawRow)) return;

    const name = normalizeText(
      pick(rawRow, ["Nom produit *", "Nom produit", "name"])
    );

    const unit = normalizeText(pick(rawRow, ["Unité *", "Unité", "unit"]));

    const batchNumber = normalizeText(
      pick(rawRow, ["Lot initial *", "Lot initial", "batchNumber"])
    );

    const quantity = toNumber(
      pick(rawRow, ["Quantité initiale *", "Quantité initiale", "quantity"])
    );

    const purchasePrice = toNumber(
      pick(rawRow, ["Prix achat USD *", "Prix achat USD", "purchasePrice"])
    );

    const salePrice = toNumber(
      pick(rawRow, ["Prix vente USD *", "Prix vente USD", "salePrice"])
    );

    const expirationDate = normalizeDate(
      pick(rawRow, ["Date expiration *", "Date expiration", "expirationDate"])
    );

    if (!name) errors.push(`Ligne ${rowNumber} : nom produit obligatoire.`);
    if (!unit) errors.push(`Ligne ${rowNumber} : unité obligatoire.`);
    if (!batchNumber) errors.push(`Ligne ${rowNumber} : lot initial obligatoire.`);
    if (quantity <= 0)
      errors.push(`Ligne ${rowNumber} : quantité initiale invalide.`);
    if (purchasePrice < 0)
      errors.push(`Ligne ${rowNumber} : prix achat invalide.`);
    if (salePrice <= 0)
      errors.push(`Ligne ${rowNumber} : prix vente invalide.`);
    if (!expirationDate)
      errors.push(`Ligne ${rowNumber} : date expiration invalide.`);

    rows.push({
      rowNumber,
      name,
      genericName: normalizeText(pick(rawRow, ["Nom générique"])),
      form: normalizeText(pick(rawRow, ["Forme"])),
      dosage: normalizeText(pick(rawRow, ["Dosage"])),
      unit,
      categoryName: normalizeText(pick(rawRow, ["Catégorie"])) || "Non classé",
      supplierName: normalizeText(pick(rawRow, ["Fournisseur"])),
      barcode: normalizeText(pick(rawRow, ["Code-barres"])),
      batchNumber,
      quantity,
      purchasePrice,
      salePrice,
      expirationDate,
      minStockThreshold: toNumber(pick(rawRow, ["Seuil stock minimum"])),
      description: normalizeText(pick(rawRow, ["Description"])),
    });
  });

  return {
    rows,
    errors,
  };
}

function getAnyValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

export function exportProductsToExcel(
  products: Record<string, unknown>[],
  fileName: string
) {
  const exportRows = products.map((product) => {
    const category = product.category as { name?: string } | null | undefined;
    const supplier = product.supplier as { name?: string } | null | undefined;

    return {
      "Nom produit": getAnyValue(product, ["name", "product_name"]),
      "Nom générique": getAnyValue(product, ["generic_name", "genericName"]),
      Forme: getAnyValue(product, ["form"]),
      Dosage: getAnyValue(product, ["dosage"]),
      Unité: getAnyValue(product, ["unit"]),
      Catégorie:
        getAnyValue(product, ["category_name"]) || category?.name || "",
      Fournisseur:
        getAnyValue(product, ["supplier_name"]) || supplier?.name || "",
      "Code-barres": getAnyValue(product, ["barcode"]),
      "Stock total": getAnyValue(product, [
        "total_quantity",
        "current_stock",
        "stock_quantity",
        "quantity",
      ]),
      "Prix achat USD": getAnyValue(product, [
        "purchase_price",
        "latest_purchase_price",
      ]),
      "Prix vente USD": getAnyValue(product, [
        "sale_price",
        "latest_sale_price",
      ]),
      "Seuil minimum": getAnyValue(product, ["min_stock_threshold"]),
      Statut: getAnyValue(product, ["status", "stock_status"]),
      Description: getAnyValue(product, ["description"]),
    };
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 32 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Produits");

  XLSX.writeFile(workbook, fileName);
}