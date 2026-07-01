import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";

type ImportRow = {
  rowNumber: number;
  sourceRowNumber: number;
  ammApplicant: string;
  therapeuticClass: string;
  genericName: string;
  name: string;
  dosage: string;
  pharmaceuticalForm: string;
  packaging: string;
  manufacturer: string;
  ammHolder: string;
  distributor: string;
  country: string;
  ammNumber: string;
  registrationDateSource: string;
  validUntilSource: string;
  registrationDate: string;
  validUntil: string;
  ammStatus: string;
  target: string;
};

type ImportBody = {
  rows: ImportRow[];
  replaceExisting?: boolean;
};

type NationalProductPayload = {
  import_key: string;
  source_row_number: number | null;

  name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
  unit: string | null;
  category_name: string | null;
  target: string | null;
  type_name: string | null;
  registration_number: string | null;
  manufacturer: string | null;
  country: string | null;
  source: string;
  is_active: boolean;
  updated_at: string;

  therapeutic_class: string | null;
  pharmaceutical_form: string | null;
  packaging: string | null;
  amm_applicant: string | null;
  amm_holder: string | null;
  distributor: string | null;
  amm_number: string | null;
  registration_date: string | null;
  valid_until: string | null;
  registration_date_source: string | null;
  valid_until_source: string | null;
  amm_status: string | null;
  source_year: number;
};

function clean(value?: string | number | null) {
  const trimmed = String(value ?? "").trim();

  return trimmed.length > 0 ? trimmed : null;
}

function cleanStatus(value?: string | null) {
  const status = String(value ?? "").trim();

  if (!status) return null;

  const normalized = status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("valid")) return "Valide";
  if (normalized.includes("expire")) return "Expirée";
  if (normalized.includes("suspend")) return "Suspendue";

  return status;
}

function normalizeKey(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ");
}

function cleanDate(value?: string | null) {
  const cleanValue = clean(value);

  if (!cleanValue) return null;

  const isoMatch = cleanValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const frenchMatch = cleanValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (frenchMatch) {
    const day = frenchMatch[1].padStart(2, "0");
    const month = frenchMatch[2].padStart(2, "0");
    const year = frenchMatch[3];

    return `${year}-${month}-${day}`;
  }

  return null;
}

function buildImportKey(row: ImportRow) {
  const ammNumber = normalizeKey(row.ammNumber);

  if (ammNumber) {
    return `amm|${ammNumber}`;
  }

  return [
    "acorep",
    normalizeKey(row.name),
    normalizeKey(row.genericName),
    normalizeKey(row.dosage),
    normalizeKey(row.pharmaceuticalForm),
    normalizeKey(row.packaging),
    normalizeKey(row.manufacturer),
    normalizeKey(row.country),
  ].join("|");
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function POST(request: Request) {
  try {
    const { supabaseAdmin } = await requirePlatformAdmin();
    const body = (await request.json()) as ImportBody;

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      throw new Error("Aucun produit ACOREP à importer.");
    }

    const errors: string[] = [];
    const payloadByKey = new Map<string, NationalProductPayload>();
    let duplicateCount = 0;

    for (const row of body.rows) {
      const productName = clean(row.name) ?? clean(row.genericName);

      if (!productName) {
        errors.push(`Ligne ${row.rowNumber} : nom du produit ou DCI obligatoire.`);
        continue;
      }

      const importKey = buildImportKey(row);

      if (payloadByKey.has(importKey)) {
        duplicateCount += 1;
      }

      const therapeuticClass = clean(row.therapeuticClass);
      const pharmaceuticalForm = clean(row.pharmaceuticalForm);
      const packaging = clean(row.packaging);
      const ammStatus = cleanStatus(row.ammStatus);

      payloadByKey.set(importKey, {
        import_key: importKey,
        source_row_number:
          Number.isFinite(Number(row.sourceRowNumber)) &&
          Number(row.sourceRowNumber) > 0
            ? Number(row.sourceRowNumber)
            : null,

        name: productName,
        generic_name: clean(row.genericName),
        dosage: clean(row.dosage),
        form: pharmaceuticalForm,
        unit: packaging,
        category_name: therapeuticClass,
        target: clean(row.target),
        type_name: therapeuticClass,
        registration_number: clean(row.ammNumber),
        manufacturer: clean(row.manufacturer),
        country: clean(row.country),
        source: "ACOREP 2026",
        is_active: true,
        updated_at: new Date().toISOString(),

        therapeutic_class: therapeuticClass,
        pharmaceutical_form: pharmaceuticalForm,
        packaging,
        amm_applicant: clean(row.ammApplicant),
        amm_holder: clean(row.ammHolder),
        distributor: clean(row.distributor),
        amm_number: clean(row.ammNumber),
        registration_date: cleanDate(row.registrationDate),
        valid_until: cleanDate(row.validUntil),
        registration_date_source: clean(row.registrationDateSource),
        valid_until_source: clean(row.validUntilSource),
        amm_status: ammStatus,
        source_year: 2026,
      });
    }

    const payload = Array.from(payloadByKey.values());

    if (payload.length === 0) {
      throw new Error("Aucun produit valide à importer après contrôle.");
    }

    if (body.replaceExisting !== false) {
      await supabaseAdmin
        .from("products")
        .update({ national_product_id: null })
        .not("national_product_id", "is", null);

      const { error: deleteError } = await supabaseAdmin
        .from("national_products")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    const chunks = chunkArray(payload, 500);
    let importedCount = 0;

    for (const chunk of chunks) {
      const { error } = await supabaseAdmin.from("national_products").insert(chunk);

      if (error) {
        throw new Error(error.message);
      }

      importedCount += chunk.length;
    }

    const validCount = payload.filter((item) => item.amm_status === "Valide").length;
    const expiredCount = payload.filter(
      (item) => item.amm_status === "Expirée"
    ).length;

    return NextResponse.json({
      importedCount,
      duplicateCount,
      errorCount: errors.length,
      errors,
      validCount,
      expiredCount,
      totalRowsReceived: body.rows.length,
      message: "Import catalogue ACOREP 2026 terminé.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible d’importer le catalogue ACOREP 2026.",
      },
      { status: 400 }
    );
  }
}