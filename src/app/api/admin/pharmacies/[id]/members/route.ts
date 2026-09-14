import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  assertSameOriginRead,
  assertUuid,
  getApiErrorStatus,
} from "@/lib/http/request-security";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Liste les membres d'une pharmacie pour la console Super Admin.
 *
 * Le service client (`pharmacies.service.ts#getPharmacyMembers`) interroge
 * Supabase avec la clé anon : la RLS `pharmacy_members_select_by_members`
 * ne renvoie que les pharmacies dont l'appelant est réellement membre, donc
 * rien pour un Super Admin externe à la pharmacie consultée. Cette route
 * utilise la clé service_role pour contourner cette limite, uniquement
 * après vérification du rôle Super Admin.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    assertSameOriginRead(request);
    await requirePlatformAdmin();

    const { id } = await params;

    assertUuid(id, "La pharmacie");

    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin
      .from("pharmacy_members")
      .select(
        `
        *,
        profile:profiles(full_name, phone, email)
      `
      )
      .eq("pharmacy_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      { members: data ?? [] },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les utilisateurs de la pharmacie.",
      },
      { status: getApiErrorStatus(error) }
    );
  }
}
