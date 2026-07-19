import { createSupabaseClient } from "@/lib/supabase/client";
import type { Pharmacy, PharmacyWithRole } from "@/types/pharmacy";
import type { PharmacySettings, PharmacyMember } from "@/types/settings";

const ACTIVE_PHARMACY_STORAGE_KEY = "mpangi_pharma_active_pharmacy_id";

export function getStoredActivePharmacyId() {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(ACTIVE_PHARMACY_STORAGE_KEY);
}

export function setStoredActivePharmacyId(pharmacyId: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ACTIVE_PHARMACY_STORAGE_KEY, pharmacyId);
}

export function clearStoredActivePharmacyId() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(ACTIVE_PHARMACY_STORAGE_KEY);
}

type PharmacyMemberResponse = {
  role: string;
  pharmacy: Pharmacy | Pharmacy[] | null;
};

export type CreatePharmacyPayload = {
  name: string;
  slug: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  pharmacistName?: string;
  exchangeRate?: number;
};

function emptyToNull(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function generateSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function getMyPharmacies(): Promise<PharmacyWithRole[]> {
  const supabase = createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("pharmacy_members")
    .select(
      `
      role,
      pharmacy:pharmacies(*)
    `
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const pharmacies = ((data ?? []) as PharmacyMemberResponse[])
    .map((item) => {
      const pharmacy = Array.isArray(item.pharmacy)
        ? item.pharmacy[0]
        : item.pharmacy;

      if (!pharmacy) return null;

      return {
        ...pharmacy,
        role: item.role,
      };
    })
    .filter(Boolean) as PharmacyWithRole[];

  return Array.from(
    new Map(pharmacies.map((pharmacy) => [pharmacy.id, pharmacy])).values()
  );
}

export async function getCurrentPharmacy(): Promise<PharmacyWithRole | null> {
  const pharmacies = await getMyPharmacies();

  if (pharmacies.length === 0) {
    clearStoredActivePharmacyId();
    return null;
  }

  const storedPharmacyId = getStoredActivePharmacyId();

  if (storedPharmacyId) {
    const selectedPharmacy = pharmacies.find(
      (pharmacy) => pharmacy.id === storedPharmacyId
    );

    if (selectedPharmacy) {
      return selectedPharmacy;
    }
  }

  const defaultPharmacy = pharmacies[0];

  setStoredActivePharmacyId(defaultPharmacy.id);

  return defaultPharmacy;
}

export async function setActivePharmacy(pharmacyId: string) {
  const pharmacies = await getMyPharmacies();

  const selectedPharmacy = pharmacies.find(
    (pharmacy) => pharmacy.id === pharmacyId
  );

  if (!selectedPharmacy) {
    throw new Error("Cette pharmacie n’est pas accessible pour cet utilisateur.");
  }

  setStoredActivePharmacyId(selectedPharmacy.id);

  return selectedPharmacy;
}

export async function createPharmacy(payload: CreatePharmacyPayload) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("create_pharmacy_with_owner", {
    p_name: payload.name.trim(),
    p_slug: payload.slug.trim(),
    p_logo_url: emptyToNull(payload.logoUrl),
    p_address: emptyToNull(payload.address),
    p_city: emptyToNull(payload.city),
    p_province: emptyToNull(payload.province),
    p_phone: emptyToNull(payload.phone),
    p_email: emptyToNull(payload.email),
    p_pharmacist_name: emptyToNull(payload.pharmacistName),
    p_exchange_rate: payload.exchangeRate ?? 2800,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}
export type UpdatePharmacyPayload = {
  pharmacyId: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  pharmacistName?: string;
  exchangeRate: number;
  invoiceFooter?: string;
  logoUrl?: string | null;
};

export type UpdatePharmacySettingsPayload = {
  pharmacyId: string;
  allowNegativeStock: boolean;
  blockExpiredSales: boolean;
  expirationAlertDays: number;
  lowStockAlertEnabled: boolean;
  invoicePrefix: string;
  receiptFormat: string;
};

export async function updatePharmacy(payload: UpdatePharmacyPayload) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pharmacies")
    .update({
      name: payload.name.trim(),
      address: emptyToNull(payload.address),
      city: emptyToNull(payload.city),
      province: emptyToNull(payload.province),
      phone: emptyToNull(payload.phone),
      email: emptyToNull(payload.email),
      pharmacist_name: emptyToNull(payload.pharmacistName),
      exchange_rate: payload.exchangeRate,
      invoice_footer: emptyToNull(payload.invoiceFooter),
      logo_url: payload.logoUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.pharmacyId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Pharmacy;
}

export async function getPharmacySettings(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pharmacy_settings")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PharmacySettings;
}

export async function updatePharmacySettings(
  payload: UpdatePharmacySettingsPayload
) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pharmacy_settings")
    .update({
      allow_negative_stock: payload.allowNegativeStock,
      block_expired_sales: payload.blockExpiredSales,
      expiration_alert_days: payload.expirationAlertDays,
      low_stock_alert_enabled: payload.lowStockAlertEnabled,
      invoice_prefix: payload.invoicePrefix.trim() || "FAC",
      receipt_format: payload.receiptFormat,
      updated_at: new Date().toISOString(),
    })
    .eq("pharmacy_id", payload.pharmacyId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PharmacySettings;
}

export async function getPharmacyMembers(pharmacyId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pharmacy_members")
    .select(
      `
      *,
      profile:profiles(
        full_name,
        phone,
        email
      )
    `
    )
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PharmacyMember[];
}

export async function uploadPharmacyLogo(pharmacyId: string, file: File) {
  const supabase = createSupabaseClient();

  const fileExtension = file.name.split(".").pop() || "png";
  const fileName = `${pharmacyId}/logo-${Date.now()}.${fileExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("pharmacy-logos")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from("pharmacy-logos")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
export async function isCurrentUserPlatformAdmin() {
  const supabase = createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data, error } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

    
  if (error) {
    return false;
  }

  return Boolean(data);
}
export type CreatePharmacyMemberPayload = {
  pharmacyId: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: "manager" | "pharmacist" | "cashier" | "stock_manager" | "accountant";
};

export async function createPharmacyMember(
  payload: CreatePharmacyMemberPayload
) {
  const response = await fetch("/api/pharmacy/members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let result: { message?: string } | null = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        `Erreur API création utilisateur. Status HTTP : ${response.status}`
    );
  }

  return result;
}
export type ResetPharmacyMemberPasswordPayload = {
  pharmacyId: string;
  memberId: string;
  temporaryPassword: string;
};

export async function resetPharmacyMemberPassword(
  payload: ResetPharmacyMemberPasswordPayload
) {
  const response = await fetch("/api/pharmacy/members/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Impossible de réinitialiser le mot de passe."
    );
  }

  return result;
}
export type UpdatePharmacyMemberStatusPayload = {
  pharmacyId: string;
  memberId: string;
  isActive: boolean;
};

export async function updatePharmacyMemberStatus(
  payload: UpdatePharmacyMemberStatusPayload
) {
  const response = await fetch("/api/pharmacy/members/status", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Impossible de modifier le statut de l’utilisateur."
    );
  }

  return result;
}
export type UpdatePharmacyMemberPayload = {
  pharmacyId: string;
  memberId: string;
  fullName: string;
  phone?: string;
  role: "manager" | "pharmacist" | "cashier" | "stock_manager" | "accountant";
  isActive: boolean;
};

export async function updatePharmacyMember(
  payload: UpdatePharmacyMemberPayload
) {
  const response = await fetch("/api/pharmacy/members/manage", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let result: { message?: string } | null = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        `Erreur API modification utilisateur. Status HTTP : ${response.status}`
    );
  }

  return result;
}