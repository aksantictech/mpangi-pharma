import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";
import {
  ApiRequestError,
  assertUuid,
  getApiErrorStatus,
  readProtectedJson,
} from "@/lib/http/request-security";

type ProductImportRow = {
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

type ProductImportBody = {
  pharmacyId: string;
  rows: ProductImportRow[];
};

const MAX_IMPORT_ROWS = 2_000;
const MAX_TEXT_LENGTH = 500;
const MAX_QUANTITY = 10_000_000;
const MAX_PRICE = 1_000_000_000_000;

type SupabaseAdminClient = Awaited<
  ReturnType<typeof requirePharmacyManager>
>["supabaseAdmin"];

function emptyToNull(value?: string) {
  const trimmed = String(value ?? "").trim();

  return trimmed.length > 0 ? trimmed : null;
}

function cleanName(value: string | null | undefined, fallback: string) {
  const trimmed = String(value ?? "").trim();

  return trimmed.length > 0 ? trimmed : fallback;
}

async function getOrCreateCategory(
  supabaseAdmin: SupabaseAdminClient,
  pharmacyId: string,
  categoryName: string
) {
  const name = cleanName(categoryName, "Non classé");

  const { data: existingCategory, error: existingError } = await supabaseAdmin
    .from("product_categories")
    .select("id")
    .eq("pharmacy_id", pharmacyId)
    .ilike("name", name)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingCategory?.id) {
    return existingCategory.id as string;
  }

  const { data: createdCategory, error: createError } = await supabaseAdmin
    .from("product_categories")
    .insert({
      pharmacy_id: pharmacyId,
      name,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return createdCategory.id as string;
}

async function getOrCreateSupplier(
  supabaseAdmin: SupabaseAdminClient,
  pharmacyId: string,
  supplierName: string
) {
  const name = String(supplierName ?? "").trim();

  if (!name) return null;

  const { data: existingSupplier, error: existingError } = await supabaseAdmin
    .from("suppliers")
    .select("id")
    .eq("pharmacy_id", pharmacyId)
    .ilike("name", name)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingSupplier?.id) {
    return existingSupplier.id as string;
  }

  const { data: createdSupplier, error: createError } = await supabaseAdmin
    .from("suppliers")
    .insert({
      pharmacy_id: pharmacyId,
      name,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return createdSupplier.id as string;
}

function validateRow(row: ProductImportRow) {
  if (!row || typeof row !== "object") return "Ligne invalide.";
  if (!Number.isInteger(row.rowNumber) || row.rowNumber < 1) {
    return "Numéro de ligne invalide.";
  }

  const textValues = [
    row.name,
    row.genericName,
    row.form,
    row.dosage,
    row.unit,
    row.categoryName,
    row.supplierName,
    row.barcode,
    row.batchNumber,
    row.expirationDate,
    row.description,
  ];

  if (textValues.some((value) => String(value ?? "").length > MAX_TEXT_LENGTH)) {
    return "Une valeur texte est trop longue.";
  }

  if (!row.name?.trim()) return "Nom produit obligatoire.";
  if (!row.unit?.trim()) return "Unité obligatoire.";
  if (!row.batchNumber?.trim()) return "Lot initial obligatoire.";
  if (
    !Number.isFinite(row.quantity) ||
    row.quantity <= 0 ||
    row.quantity > MAX_QUANTITY
  ) {
    return "Quantité initiale invalide.";
  }
  if (
    !Number.isFinite(row.purchasePrice) ||
    row.purchasePrice < 0 ||
    row.purchasePrice > MAX_PRICE
  ) {
    return "Prix achat invalide.";
  }
  if (
    !Number.isFinite(row.salePrice) ||
    row.salePrice <= 0 ||
    row.salePrice > MAX_PRICE
  ) {
    return "Prix vente invalide.";
  }
  if (
    !Number.isFinite(row.minStockThreshold) ||
    row.minStockThreshold < 0 ||
    row.minStockThreshold > MAX_QUANTITY
  ) {
    return "Seuil de stock invalide.";
  }
  if (!row.expirationDate || Number.isNaN(Date.parse(row.expirationDate))) {
    return "Date expiration invalide.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await readProtectedJson<ProductImportBody>(request, {
      maxBytes: 4 * 1024 * 1024,
    });

    if (!body.pharmacyId) {
      throw new Error("La pharmacie est obligatoire.");
    }

    assertUuid(body.pharmacyId, "La pharmacie");

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      throw new Error("Aucun produit à importer.");
    }

    if (body.rows.length > MAX_IMPORT_ROWS) {
      throw new ApiRequestError(
        `L’import est limité à ${MAX_IMPORT_ROWS} lignes par opération.`,
        413
      );
    }

    const { supabaseAdmin } = await requirePharmacyManager(body.pharmacyId);

    const errors: string[] = [];
    let createdCount = 0;

    for (const row of body.rows) {
      try {
        const validationError = validateRow(row);

        if (validationError) {
          errors.push(`Ligne ${row.rowNumber} : ${validationError}`);
          continue;
        }

        const categoryId = await getOrCreateCategory(
          supabaseAdmin,
          body.pharmacyId,
          row.categoryName
        );

        const supplierId = await getOrCreateSupplier(
          supabaseAdmin,
          body.pharmacyId,
          row.supplierName
        );

        const { error: rpcError } = await supabaseAdmin.rpc(
          "create_product_with_initial_batch",
          {
            p_pharmacy_id: body.pharmacyId,
            p_name: row.name.trim(),
            p_generic_name: emptyToNull(row.genericName),
            p_category_id: categoryId,
            p_supplier_id: supplierId,
            p_form: emptyToNull(row.form),
            p_dosage: emptyToNull(row.dosage),
            p_unit: row.unit.trim(),
            p_barcode: emptyToNull(row.barcode),
            p_description: emptyToNull(row.description),
            p_min_stock_threshold: row.minStockThreshold || 0,
            p_batch_number: row.batchNumber.trim(),
            p_quantity: row.quantity,
            p_purchase_price: row.purchasePrice,
            p_sale_price: row.salePrice,
            p_expiration_date: row.expirationDate,
          }
        );

        if (rpcError) {
          errors.push(`Ligne ${row.rowNumber} : ${rpcError.message}`);
          continue;
        }

        createdCount += 1;
      } catch (error) {
        errors.push(
          `Ligne ${row.rowNumber} : ${
            error instanceof Error ? error.message : "Erreur inconnue."
          }`
        );
      }
    }

    return NextResponse.json({
      createdCount,
      errorCount: errors.length,
      errors,
      message: "Import terminé.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible d’importer les produits.",
      },
      {
        status: getApiErrorStatus(error),
      }
    );
  }
}
