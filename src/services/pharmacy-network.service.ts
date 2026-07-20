"use client";

import { createSupabaseClient } from "@/lib/supabase/client";

export type ProductForNetworkSearch = {
  id: string;
  pharmacy_id: string;
  name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
  unit: string | null;
  barcode: string | null;
};

export type NeighborPharmacyStock = {
  pharmacy_id: string;
  pharmacy_name: string;
  city: string | null;
  commune: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_open_now: boolean;
  product_id: string;
  product_name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
  unit: string | null;
  total_quantity: number | null;
  availability_label: string;
  nearest_expiry_date: string | null;
  distance_group: string;
};

export type PublicOpenPharmacy = {
  pharmacy_id: string;
  pharmacy_name: string;
  logo_url: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone: string | null;
  whatsapp: string | null;
  is_24h: boolean;
  is_open_now: boolean;
  accepts_public_calls: boolean;
  product_availability: string;
};

export type SearchPublicOpenPharmaciesParams = {
  city?: string;
  commune?: string;
  district?: string;
  productSearch?: string;
  openNowOnly?: boolean;
};

export async function searchMyProductsForNetwork(
  pharmacyId: string,
  search: string
): Promise<ProductForNetworkSearch[]> {
  const supabase = createSupabaseClient();
  const normalizedSearch = sanitizeSearch(search);

  let query = supabase
    .from("products")
    .select(
      `
        id,
        pharmacy_id,
        name,
        generic_name,
        dosage,
        form,
        unit,
        barcode
      `
    )
    .eq("pharmacy_id", pharmacyId)
    .order("name", { ascending: true })
    .limit(80);

  if (normalizedSearch) {
    query = query.or(
      [
        `name.ilike.%${normalizedSearch}%`,
        `generic_name.ilike.%${normalizedSearch}%`,
        `barcode.ilike.%${normalizedSearch}%`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Impossible de charger les produits.");
  }

  return (data ?? []) as ProductForNetworkSearch[];
}

export async function findNeighborPharmacyStock(
  requestingPharmacyId: string,
  productId: string
): Promise<NeighborPharmacyStock[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("find_neighbor_pharmacy_stock", {
    p_requesting_pharmacy_id: requestingPharmacyId,
    p_product_id: productId,
  });

  if (error) {
    throw new Error(
      error.message ||
        "Impossible de rechercher le stock dans les pharmacies voisines."
    );
  }

  return (data ?? []) as NeighborPharmacyStock[];
}

export async function createNeighborStockRequest({
  requestingPharmacyId,
  supplierPharmacyId,
  productId,
  requestedQuantity,
  message,
}: {
  requestingPharmacyId: string;
  supplierPharmacyId: string;
  productId: string;
  requestedQuantity: number;
  message?: string;
}) {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("stock_requests")
    .insert({
      requesting_pharmacy_id: requestingPharmacyId,
      supplier_pharmacy_id: supplierPharmacyId,
      product_id: productId,
      requested_quantity: Math.max(1, Math.floor(requestedQuantity || 1)),
      message: message?.trim() || null,
      requested_by: user?.id ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message || "Impossible d’envoyer la demande.");
  }

  return data;
}

export async function searchPublicOpenPharmacies({
  city = "",
  commune = "",
  district = "",
  productSearch = "",
  openNowOnly = true,
}: SearchPublicOpenPharmaciesParams): Promise<PublicOpenPharmacy[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("search_public_open_pharmacies_v3", {
    p_city: city.trim() || null,
    p_commune: commune.trim() || null,
    p_district: district.trim() || null,
    p_product_search: productSearch.trim() || null,
    p_open_now_only: openNowOnly,
  });

  if (error) {
    throw new Error(
      error.message || "Impossible de rechercher les pharmacies ouvertes."
    );
  }

  return (data ?? []) as PublicOpenPharmacy[];
}

function sanitizeSearch(value: string) {
  return value
    .trim()
    .replace(/[%_,()*]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function buildWhatsappHref(phone: string | null, message?: string) {
  const normalized = normalizePhoneForWhatsapp(phone);

  if (!normalized) return "";

  const text = message ? `?text=${encodeURIComponent(message)}` : "";

  return `https://wa.me/${normalized}${text}`;
}

export function buildPhoneHref(phone: string | null) {
  const normalized = String(phone ?? "").trim();

  if (!normalized) return "";

  return `tel:${normalized}`;
}

function normalizePhoneForWhatsapp(phone: string | null) {
  const onlyDigits = String(phone ?? "").replace(/\D/g, "");

  if (!onlyDigits) return "";

  if (onlyDigits.startsWith("0")) {
    return `243${onlyDigits.slice(1)}`;
  }

  if (onlyDigits.startsWith("243")) {
    return onlyDigits;
  }

  return onlyDigits;
}
