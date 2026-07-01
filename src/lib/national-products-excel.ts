import * as XLSX from "xlsx";

import type {
  NationalProduct,
  NationalProductImportRow,
} from "@/types/national-product";

const ACOREP_HEADERS = [
  "N°",
  "Demandeur AMM / Représentant local",
  "Classe thérapeutique",
  "DCI",
  "Nom du produit",
  "Dosage",
  "Forme pharmaceutique",
  "Conditionnement",
  "Fabricant produit fini",
  "Titulaire AMM",
  "Distributeur",
  "Pays de provenance",
  "Numéro AMM",
  "Date d'enregistrement source",
  "Fin de validité AMM source",
  "Date enregistrement ISO",
  "Fin validité ISO",
  "Statut AMM au 2026-06-30",
  "Cible",
];

function cleanCell(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

function getCell(row: Record<string, unknown>, keys: string[]) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => ({
    key,
    normalizedKey: normalizeHeader(key),
    value,
  }));

  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);

    const found = normalizedEntries.find(
      (entry) => entry.normalizedKey === normalizedKey
    );

    const value = cleanCell(found?.value);

    if (value) return value;
  }

  return "";
}

function getNumberCell(row: Record<string, unknown>, keys: string[]) {
  const value = getCell(row, keys);
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(workbook, fileName);
}

export function downloadNationalProductTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([ACOREP_HEADERS]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "AMM_ACOREP_2026");

  downloadWorkbook(workbook, "modele-import-acorep-2026.xlsx");
}

export async function parseNationalProductsExcelFile(file: File) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const sheetName =
    workbook.SheetNames.find((name) =>
      normalizeHeader(name).includes("acorep")
    ) ?? workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Le fichier Excel ne contient aucune feuille.");
  }

  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  const parsedRows: NationalProductImportRow[] = rows
    .map((row, index) => {
      const name = getCell(row, [
        "Nom du produit",
        "Nom produit",
        "Produit",
        "Spécialité",
      ]);

      const genericName = getCell(row, ["DCI", "Nom générique", "Generique"]);

      return {
        rowNumber: index + 2,
        sourceRowNumber: getNumberCell(row, ["N°", "No", "N"]),
        ammApplicant: getCell(row, [
          "Demandeur AMM / Représentant local",
          "Demandeur AMM",
          "Représentant local",
          "Representant local",
        ]),
        therapeuticClass: getCell(row, [
          "Classe thérapeutique",
          "Classe therapeutique",
          "Classe",
        ]),
        genericName,
        name,
        dosage: getCell(row, ["Dosage", "Dose"]),
        pharmaceuticalForm: getCell(row, [
          "Forme pharmaceutique",
          "Forme pharm",
          "Forme",
        ]),
        packaging: getCell(row, [
          "Conditionnement",
          "Présentation",
          "Presentation",
        ]),
        manufacturer: getCell(row, [
          "Fabricant produit fini",
          "Fabricant",
          "Laboratoire",
        ]),
        ammHolder: getCell(row, ["Titulaire AMM", "Titulaire"]),
        distributor: getCell(row, ["Distributeur"]),
        country: getCell(row, [
          "Pays de provenance",
          "Pays",
          "Origine",
        ]),
        ammNumber: getCell(row, [
          "Numéro AMM",
          "Numero AMM",
          "N° AMM",
          "AMM",
        ]),
        registrationDateSource: getCell(row, [
          "Date d'enregistrement source",
          "Date enregistrement source",
        ]),
        validUntilSource: getCell(row, [
          "Fin de validité AMM source",
          "Fin validité AMM source",
          "Fin de validite AMM source",
        ]),
        registrationDate: getCell(row, [
          "Date enregistrement ISO",
          "Date d'enregistrement ISO",
        ]),
        validUntil: getCell(row, [
          "Fin validité ISO",
          "Fin de validité ISO",
          "Fin validite ISO",
        ]),
        ammStatus: getCell(row, [
          "Statut AMM au 2026-06-30",
          "Statut AMM",
          "Statut",
        ]),
        target: getCell(row, ["Cible", "Target"]),
      };
    })
    .filter((row) => row.name.trim().length > 0 || row.genericName.trim().length > 0);

  if (parsedRows.length === 0) {
    throw new Error("Aucun produit valide trouvé dans le fichier Excel.");
  }

  return parsedRows;
}

export function exportNationalProductsToExcel(
  products: NationalProduct[],
  fileName = "catalogue-acorep-2026.xlsx"
) {
  const rows = products.map((product) => ({
    "N°": product.source_row_number ?? "",
    "Demandeur AMM / Représentant local": product.amm_applicant ?? "",
    "Classe thérapeutique": product.therapeutic_class ?? product.category_name ?? "",
    DCI: product.generic_name ?? "",
    "Nom du produit": product.name ?? "",
    Dosage: product.dosage ?? "",
    "Forme pharmaceutique": product.pharmaceutical_form ?? product.form ?? "",
    Conditionnement: product.packaging ?? product.unit ?? "",
    "Fabricant produit fini": product.manufacturer ?? "",
    "Titulaire AMM": product.amm_holder ?? "",
    Distributeur: product.distributor ?? "",
    "Pays de provenance": product.country ?? "",
    "Numéro AMM": product.amm_number ?? product.registration_number ?? "",
    "Date d'enregistrement source": product.registration_date_source ?? "",
    "Fin de validité AMM source": product.valid_until_source ?? "",
    "Date enregistrement ISO": product.registration_date ?? "",
    "Fin validité ISO": product.valid_until ?? "",
    "Statut AMM au 2026-06-30": product.amm_status ?? "",
    Cible: product.target ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ACOREP_HEADERS,
  });

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "AMM_ACOREP_2026");

  downloadWorkbook(workbook, fileName);
}