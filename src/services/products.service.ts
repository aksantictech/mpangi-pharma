import { createSupabaseClient } from "@/lib/supabase/client";

import type { NationalProduct } from "@/types/national-product";
import type {
  ExpirationAlert,
  Product,
  ProductBatch,
  ProductStockSummary,
} from "@/types/product";

export type ProductCategory = {
  id: string;
  pharmacy_id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean;
};

export type Supplier = {
  id: string;
  pharmacy_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  contact_person: string | null;
  balance: number;
  is_active: boolean;
};

export type CreateProductPayload = {
  pharmacyId: string;
  nationalProductId?: string;
  name: string;
  genericName?: string;
  categoryId?: string;
  dosage?: string;
  form?: string;
  unit?: string;
  barcode?: string;
  manufacturer?: string;
  supplierId?: string;
  minStock?: number;
  requiresPrescription?: boolean;
  description?: string;
  batchNumber?: string;
  expiryDate?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  quantity?: number;
};

export type ProductDuplicateCandidate = {
  id: string;
  name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
  unit: string | null;
};

export type NationalProductSearchParams = {
  search?: string;
  therapeuticClass?: string;
  pharmaceuticalForm?: string;
  packaging?: string;
  target?: string;
  ammStatus?: string;
  limit?: number;
};

export type NationalProductFilterOptions = {
  therapeuticClasses: string[];
  pharmaceuticalForms: string[];
  packagings: string[];
  targets: string[];
  ammStatuses: string[];
};

function emptyToNull(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function cleanFilter(value?: string) {
  const trimmed = String(value ?? "").trim();

  return trimmed && trimmed !== "all" ? trimmed : "";
}

function escapeSearchValue(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", " ");
}

function uniqueSorted(values: Array<string | null>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

export async function searchNationalProducts(
  params: NationalProductSearchParams
) {
  const supabase = createSupabaseClient();

  const search = cleanFilter(params.search);
  const therapeuticClass = cleanFilter(params.therapeuticClass);
  const pharmaceuticalForm = cleanFilter(params.pharmaceuticalForm);
  const packaging = cleanFilter(params.packaging);
  const target = cleanFilter(params.target);
  const ammStatus = cleanFilter(params.ammStatus);
  const limit = params.limit ?? 50;

  let query = supabase
    .from("national_products")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(limit);

  if (therapeuticClass) {
    query = query.eq("therapeutic_class", therapeuticClass);
  }

  if (pharmaceuticalForm) {
    query = query.eq("pharmaceutical_form", pharmaceuticalForm);
  }

  if (packaging) {
    query = query.eq("packaging", packaging);
  }

  if (target) {
    query = query.eq("target", target);
  }

  if (ammStatus) {
    query = query.eq("amm_status", ammStatus);
  }

  if (search) {
    const value = escapeSearchValue(search);

    query = query.or(
      [
        `name.ilike.%${value}%`,
        `generic_name.ilike.%${value}%`,
        `dosage.ilike.%${value}%`,
        `therapeutic_class.ilike.%${value}%`,
        `pharmaceutical_form.ilike.%${value}%`,
        `packaging.ilike.%${value}%`,
        `amm_number.ilike.%${value}%`,
        `registration_number.ilike.%${value}%`,
        `manufacturer.ilike.%${value}%`,
        `country.ilike.%${value}%`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data as NationalProduct[];
}

export async function getNationalProductFilters(): Promise<NationalProductFilterOptions> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("national_products")
    .select(
      "therapeutic_class, pharmaceutical_form, packaging, target, amm_status"
    )
    .eq("is_active", true)
    .limit(10000);

  if (error) {
    throw new Error(error.message);
  }

  return {
    therapeuticClasses: uniqueSorted(
      (data ?? []).map((item) => item.therapeutic_class)
    ),
    pharmaceuticalForms: uniqueSorted(
      (data ?? []).map((item) => item.pharmaceutical_form)
    ),
    packagings: uniqueSorted((data ?? []).map((item) => item.packaging)),
    targets: uniqueSorted((data ?? []).map((item) => item.target)),
    ammStatuses: uniqueSorted((data ?? []).map((item) => item.amm_status)),
  };
}

function normalizeDuplicateValue(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ");
}

function buildProductDuplicateKey(payload: {
  name?: string | null;
  genericName?: string | null;
  generic_name?: string | null;
  dosage?: string | null;
  form?: string | null;
  unit?: string | null;
}) {
  return [
    normalizeDuplicateValue(payload.name),
    normalizeDuplicateValue(payload.genericName ?? payload.generic_name),
    normalizeDuplicateValue(payload.dosage),
    normalizeDuplicateValue(payload.form),
    normalizeDuplicateValue(payload.unit),
  ].join("|");
}

export async function findDuplicateProductInPharmacy(payload: {
  pharmacyId: string;
  name: string;
  genericName?: string;
  dosage?: string;
  form?: string;
  unit?: string;
}) {
  const supabase = createSupabaseClient();

  const searchedName = payload.name.trim();

  if (!searchedName) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, generic_name, dosage, form, unit")
    .eq("pharmacy_id", payload.pharmacyId)
    .ilike("name", searchedName)
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  const searchedKey = buildProductDuplicateKey(payload);

  const duplicate = (data ?? []).find((product) => {
    const productKey = buildProductDuplicateKey(product);

    return productKey === searchedKey;
  });

  return (duplicate ?? null) as ProductDuplicateCandidate | null;
}

export async function getProducts(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      category:product_categories(id, name, color),
      supplier:suppliers(id, name, phone)
    `
    )
    .eq("pharmacy_id", pharmacyId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Product[];
}

export async function getProductStock(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("v_product_stock")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductStockSummary[];
}

export async function getProductBatches(productId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("product_batches")
    .select("*")
    .eq("product_id", productId)
    .order("expiry_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductBatch[];
}

export async function getExpirationAlerts(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("v_expiration_alerts")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .neq("expiration_status", "ok")
    .order("expiry_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as ExpirationAlert[];
}

export async function getProductCategories(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductCategory[];
}

export async function getSuppliers(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Supplier[];
}

export async function createProductWithInitialBatch(
  payload: CreateProductPayload
) {
  const supabase = createSupabaseClient();

  const duplicateProduct = await findDuplicateProductInPharmacy({
    pharmacyId: payload.pharmacyId,
    name: payload.name,
    genericName: payload.genericName,
    dosage: payload.dosage,
    form: payload.form,
    unit: payload.unit,
  });

  if (duplicateProduct) {
    throw new Error(
      `Ce produit existe déjà dans cette pharmacie : ${duplicateProduct.name}.`
    );
  }

  if (payload.nationalProductId) {
    const { data: existingProduct, error: existingError } = await supabase
      .from("products")
      .select("id, name")
      .eq("pharmacy_id", payload.pharmacyId)
      .eq("national_product_id", payload.nationalProductId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingProduct) {
      throw new Error(
        `Ce produit existe déjà dans cette pharmacie : ${existingProduct.name}.`
      );
    }
  }

  const { data, error } = await supabase.rpc(
    "create_product_with_initial_batch",
    {
      p_pharmacy_id: payload.pharmacyId,
      p_name: payload.name,
      p_generic_name: emptyToNull(payload.genericName),
      p_category_id: emptyToNull(payload.categoryId),
      p_dosage: emptyToNull(payload.dosage),
      p_form: emptyToNull(payload.form),
      p_unit: payload.unit || "boîte",
      p_barcode: emptyToNull(payload.barcode),
      p_manufacturer: emptyToNull(payload.manufacturer),
      p_supplier_id: emptyToNull(payload.supplierId),
      p_min_stock: payload.minStock ?? 0,
      p_requires_prescription: payload.requiresPrescription ?? false,
      p_batch_number: emptyToNull(payload.batchNumber),
      p_expiry_date: emptyToNull(payload.expiryDate),
      p_purchase_price: payload.purchasePrice ?? 0,
      p_selling_price: payload.sellingPrice ?? 0,
      p_quantity: payload.quantity ?? 0,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const productId = String(data);

  const updatePayload: Record<string, string | null> = {};

  if (payload.nationalProductId) {
    updatePayload.national_product_id = payload.nationalProductId;
  }

  if (payload.description !== undefined) {
    updatePayload.description = emptyToNull(payload.description);
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", productId)
      .eq("pharmacy_id", payload.pharmacyId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return productId;
}

export async function addProductBatch(payload: AddProductBatchPayload) {
  const supabase = createSupabaseClient();

  const quantity = payload.quantity ?? 0;

  if (quantity <= 0) {
    throw new Error("La quantité du lot doit être supérieure à zéro.");
  }

  if (!payload.expiryDate) {
    throw new Error("La date d’expiration est obligatoire.");
  }

  if ((payload.sellingPrice ?? 0) <= 0) {
    throw new Error("Le prix de vente doit être supérieur à zéro.");
  }

  const { data, error } = await supabase.rpc("add_product_batch", {
    p_pharmacy_id: payload.pharmacyId,
    p_product_id: payload.productId,
    p_supplier_id: emptyToNull(payload.supplierId),
    p_batch_number: emptyToNull(payload.batchNumber),
    p_expiry_date: emptyToNull(payload.expiryDate),
    p_purchase_price: payload.purchasePrice ?? 0,
    p_selling_price: payload.sellingPrice ?? 0,
    p_quantity: quantity,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export type CreateProductCategoryPayload = {
  pharmacyId: string;
  name: string;
  description?: string;
  color?: string;
};

export type AddProductBatchPayload = {
  pharmacyId: string;
  productId: string;
  supplierId?: string;
  batchNumber?: string;
  expiryDate?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  quantity?: number;
};

export type CreateSupplierPayload = {
  pharmacyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
};

export async function createProductCategory(
  payload: CreateProductCategoryPayload
) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("product_categories")
    .insert({
      pharmacy_id: payload.pharmacyId,
      name: payload.name.trim(),
      description: emptyToNull(payload.description),
      color: payload.color || "#2563eb",
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductCategory;
}

export async function createSupplier(payload: CreateSupplierPayload) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      pharmacy_id: payload.pharmacyId,
      name: payload.name.trim(),
      phone: emptyToNull(payload.phone),
      email: emptyToNull(payload.email),
      address: emptyToNull(payload.address),
      contact_person: emptyToNull(payload.contactPerson),
      balance: 0,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Supplier;
}
export type CorrectBatchQuantityPayload = {
  pharmacyId: string;
  batchId: string;
  newQuantity: number;
  reason?: string;
};

export type RemoveBatchFromSalePayload = {
  pharmacyId: string;
  batchId: string;
  reason?: string;
};

export async function correctBatchQuantity(
  payload: CorrectBatchQuantityPayload
) {
  const supabase = createSupabaseClient();

  if (payload.newQuantity < 0) {
    throw new Error("La quantité ne peut pas être négative.");
  }

  const { data, error } = await supabase.rpc("correct_batch_quantity", {
    p_pharmacy_id: payload.pharmacyId,
    p_batch_id: payload.batchId,
    p_new_quantity: payload.newQuantity,
    p_reason: emptyToNull(payload.reason),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function removeBatchFromSale(
  payload: RemoveBatchFromSalePayload
) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("remove_batch_from_sale", {
    p_pharmacy_id: payload.pharmacyId,
    p_batch_id: payload.batchId,
    p_reason: emptyToNull(payload.reason),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}