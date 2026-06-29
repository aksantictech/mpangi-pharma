import { createSupabaseClient } from "@/lib/supabase/client";
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
  batchNumber?: string;
  expiryDate?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  quantity?: number;
};

function emptyToNull(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
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

  return data as string;
}
export type CreateProductCategoryPayload = {
  pharmacyId: string;
  name: string;
  description?: string;
  color?: string;
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