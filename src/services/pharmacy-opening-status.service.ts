"use client";

import { createSupabaseClient } from "@/lib/supabase/client";

export type PharmacyOpeningMode =
  | "automatic"
  | "forced_open"
  | "forced_closed";

export type PharmacyOpeningStatus = {
  pharmacy_id: string;
  opening_mode: PharmacyOpeningMode;
  is_open_now: boolean;
  updated_at: string | null;
};

export async function getPharmacyOpeningStatus(
  pharmacyId: string
): Promise<PharmacyOpeningStatus> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pharmacies")
    .select(
      `
        id,
        public_opening_mode,
        public_opening_status_updated_at
      `
    )
    .eq("id", pharmacyId)
    .single();

  if (error) {
    throw new Error(
      error.message ||
        "Impossible de récupérer le statut de la pharmacie."
    );
  }

  const { data: isOpenData, error: isOpenError } =
    await supabase.rpc("is_pharmacy_open_now_v2", {
      p_pharmacy_id: pharmacyId,
    });

  if (isOpenError) {
    throw new Error(
      isOpenError.message ||
        "Impossible de vérifier si la pharmacie est ouverte."
    );
  }

  return {
    pharmacy_id: data.id,
    opening_mode:
      (data.public_opening_mode as PharmacyOpeningMode) ||
      "automatic",
    is_open_now: Boolean(isOpenData),
    updated_at:
      data.public_opening_status_updated_at || null,
  };
}

export async function setPharmacyOpeningMode(
  pharmacyId: string,
  mode: PharmacyOpeningMode
): Promise<PharmacyOpeningStatus> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc(
    "set_pharmacy_public_opening_mode",
    {
      p_pharmacy_id: pharmacyId,
      p_mode: mode,
    }
  );

  if (error) {
    throw new Error(
      error.message ||
        "Impossible de modifier le statut de la pharmacie."
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    throw new Error(
      "Le serveur n’a retourné aucun statut."
    );
  }

  return result as PharmacyOpeningStatus;
}