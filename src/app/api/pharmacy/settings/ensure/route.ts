import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";
import {
  assertUuid,
  getApiErrorStatus,
  readProtectedJson,
} from "@/lib/http/request-security";

type EnsureSettingsBody = {
  pharmacyId: string;
};

/**
 * Certaines pharmacies (créées avant ce correctif via le Super Admin, qui
 * insérait directement dans `pharmacies` sans passer par le RPC
 * create_pharmacy_with_owner) n'ont pas de ligne `pharmacy_settings`. La
 * page « Paramètres généraux » ne peut alors ni afficher ni modifier le
 * logo/les infos de la pharmacie. Cette route la crée à la volée, à la
 * demande d'un propriétaire/gérant, plutôt que d'exiger une migration SQL
 * manuelle pour réparer les pharmacies existantes.
 */
export async function POST(request: Request) {
  try {
    const body = await readProtectedJson<EnsureSettingsBody>(request, {
      maxBytes: 2_048,
    });

    if (!body.pharmacyId) {
      throw new Error("La pharmacie est obligatoire.");
    }

    assertUuid(body.pharmacyId, "La pharmacie");

    const { supabaseAdmin } = await requirePharmacyManager(body.pharmacyId);

    const { data: existing, error: selectError } = await supabaseAdmin
      .from("pharmacy_settings")
      .select("*")
      .eq("pharmacy_id", body.pharmacyId)
      .maybeSingle();

    if (selectError) {
      throw new Error(selectError.message);
    }

    if (existing) {
      return NextResponse.json({ settings: existing });
    }

    const { data: created, error: insertError } = await supabaseAdmin
      .from("pharmacy_settings")
      .insert({ pharmacy_id: body.pharmacyId })
      .select("*")
      .single();

    if (insertError) {
      // Course concurrente : un autre appel a déjà créé la ligne entre le
      // select et l'insert ci-dessus. On relit simplement le résultat.
      if (insertError.code === "23505") {
        const { data: retry, error: retryError } = await supabaseAdmin
          .from("pharmacy_settings")
          .select("*")
          .eq("pharmacy_id", body.pharmacyId)
          .single();

        if (retryError) {
          throw new Error(retryError.message);
        }

        return NextResponse.json({ settings: retry });
      }

      throw new Error(insertError.message);
    }

    return NextResponse.json({ settings: created });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible d’initialiser les paramètres de la pharmacie.",
      },
      { status: getApiErrorStatus(error) }
    );
  }
}
