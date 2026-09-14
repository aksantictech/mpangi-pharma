import type { AdminPharmacy } from "@/types/admin";
import type { PharmacyMember } from "@/types/settings";

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getAdminPharmacies(): Promise<AdminPharmacy[]> {
  const response = await fetch("/api/admin/pharmacies", {
    method: "GET",
    cache: "no-store",
  });

  const result = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(result?.message || "Erreur chargement pharmacies.");
  }

  return (result?.pharmacies ?? []) as AdminPharmacy[];
}

export type CreateAdminPharmacyPayload = {
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
};

export async function createAdminPharmacy(
  payload: CreateAdminPharmacyPayload
) {
  const response = await fetch("/api/admin/pharmacies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(result?.message || "Erreur création pharmacie.");
  }

  return result;
}

export type UpdateAdminPharmacyPayload = {
  name?: string;
  address?: string;
  city?: string;
  commune?: string;
  district?: string;
  province?: string;
  country?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  pharmacistName?: string;
  exchangeRate?: number;
  invoiceFooter?: string;
  isActive?: boolean;
  archived?: boolean;
};

export async function updateAdminPharmacy(
  pharmacyId: string,
  payload: UpdateAdminPharmacyPayload
) {
  const response = await fetch(`/api/admin/pharmacies/${pharmacyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(result?.message || "Erreur mise à jour pharmacie.");
  }

  return result;
}

export async function getAdminPharmacyMembers(
  pharmacyId: string
): Promise<PharmacyMember[]> {
  const response = await fetch(`/api/admin/pharmacies/${pharmacyId}/members`, {
    method: "GET",
    cache: "no-store",
  });

  const result = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(result?.message || "Erreur chargement des utilisateurs.");
  }

  return (result?.members ?? []) as PharmacyMember[];
}

export async function deleteAdminPharmacy(pharmacyId: string) {
  const response = await fetch(`/api/admin/pharmacies/${pharmacyId}`, {
    method: "DELETE",
  });

  const result = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(result?.message || "Erreur suppression pharmacie.");
  }

  return result;
}
