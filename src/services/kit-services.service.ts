import { createSupabaseClient } from "@/lib/supabase/client";

import type { KitServiceKind, PharmacyKitService } from "@/types/kit";

export const kitServiceKindLabels: Record<KitServiceKind, string> = {
  service: "Service",
  garde: "Garde",
};

/** Services et gardes proposés tant que la pharmacie n'a pas défini les siens. */
export const DEFAULT_KIT_SERVICES: { name: string; kind: KitServiceKind }[] = [
  { name: "Urgences", kind: "service" },
  { name: "Maternité", kind: "service" },
  { name: "Pédiatrie", kind: "service" },
  { name: "Bloc opératoire", kind: "service" },
  { name: "Hospitalisation", kind: "service" },
  { name: "Garde de nuit", kind: "garde" },
];

export async function getKitServices(
  pharmacyId: string,
  options: { onlyActive?: boolean } = {}
): Promise<PharmacyKitService[]> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from("pharmacy_kit_services")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (options.onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PharmacyKitService[];
}

export type KitServicePayload = {
  pharmacyId: string;
  name: string;
  kind: KitServiceKind;
  notes?: string;
};

function friendlyError(message: string) {
  if (message.includes("pharmacy_kit_services_name_uidx")) {
    return "Un service ou une garde porte déjà ce nom.";
  }

  return message;
}

export async function createKitService(payload: KitServicePayload) {
  const supabase = createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("pharmacy_kit_services").insert({
    pharmacy_id: payload.pharmacyId,
    name: payload.name.trim(),
    kind: payload.kind,
    notes: payload.notes?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    throw new Error(friendlyError(error.message));
  }
}

export async function updateKitService(
  id: string,
  payload: Omit<KitServicePayload, "pharmacyId">
) {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("pharmacy_kit_services")
    .update({
      name: payload.name.trim(),
      kind: payload.kind,
      notes: payload.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(friendlyError(error.message));
  }
}

export async function setKitServiceActive(id: string, isActive: boolean) {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("pharmacy_kit_services")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteKitService(id: string) {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("pharmacy_kit_services")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
