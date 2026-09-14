import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  ApiRequestError,
  assertSameOriginRequest,
  assertStringLength,
  assertUuid,
  getApiErrorStatus,
  readProtectedJson,
} from "@/lib/http/request-security";

type UpdatePharmacyBody = {
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

function emptyToNull(value?: string) {
  if (value === undefined) return undefined;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requirePlatformAdmin();

    const { id } = await params;

    assertUuid(id, "La pharmacie");

    const body = await readProtectedJson<UpdatePharmacyBody>(request, {
      maxBytes: 32_768,
    });

    assertStringLength(body.name, "Le nom", 160);
    assertStringLength(body.address, "L’adresse", 300);
    assertStringLength(body.city, "La ville", 120);
    assertStringLength(body.commune, "La commune", 120);
    assertStringLength(body.district, "Le quartier", 120);
    assertStringLength(body.province, "La province", 120);
    assertStringLength(body.country, "Le pays", 120);
    assertStringLength(body.phone, "Le téléphone", 40);
    assertStringLength(body.whatsapp, "Le WhatsApp", 40);
    assertStringLength(body.email, "L’email", 254);
    assertStringLength(body.pharmacistName, "Le pharmacien", 160);
    assertStringLength(body.invoiceFooter, "Le pied de facture", 500);

    if (body.name !== undefined && !body.name.trim()) {
      throw new ApiRequestError("Le nom de la pharmacie est obligatoire.");
    }

    if (
      body.exchangeRate !== undefined &&
      (!Number.isFinite(body.exchangeRate) || body.exchangeRate <= 0)
    ) {
      throw new ApiRequestError("Le taux de change doit être un nombre positif.");
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) update.name = body.name.trim();
    if (body.address !== undefined) update.address = emptyToNull(body.address);
    if (body.city !== undefined) update.city = emptyToNull(body.city);
    if (body.commune !== undefined) update.commune = emptyToNull(body.commune);
    if (body.district !== undefined) update.district = emptyToNull(body.district);
    if (body.province !== undefined) update.province = emptyToNull(body.province);
    if (body.country !== undefined) {
      update.country = body.country.trim() || "République démocratique du Congo";
    }
    if (body.phone !== undefined) update.phone = emptyToNull(body.phone);
    if (body.whatsapp !== undefined) update.whatsapp = emptyToNull(body.whatsapp);
    if (body.email !== undefined) update.email = emptyToNull(body.email);
    if (body.pharmacistName !== undefined) {
      update.pharmacist_name = emptyToNull(body.pharmacistName);
    }
    if (body.exchangeRate !== undefined) update.exchange_rate = body.exchangeRate;
    if (body.invoiceFooter !== undefined) {
      update.invoice_footer = emptyToNull(body.invoiceFooter);
    }

    if (body.isActive !== undefined) {
      update.is_active = body.isActive;
    }

    if (body.archived !== undefined) {
      update.archived_at = body.archived ? new Date().toISOString() : null;

      // Archiver suspend automatiquement l'accès ; désarchiver le redonne,
      // sauf si l'appel précise explicitement isActive.
      if (body.isActive === undefined) {
        update.is_active = !body.archived;
      }
    }

    if (Object.keys(update).length <= 1) {
      throw new ApiRequestError("Aucune modification à appliquer.");
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: pharmacy, error } = await supabaseAdmin
      .from("pharmacies")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      pharmacy,
      message: "Pharmacie mise à jour.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour la pharmacie.",
      },
      { status: getApiErrorStatus(error) }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requirePlatformAdmin();

    const { id } = await params;

    assertUuid(id, "La pharmacie");

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: pharmacy, error: fetchError } = await supabaseAdmin
      .from("pharmacies")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!pharmacy) {
      throw new ApiRequestError("Pharmacie introuvable.", 404);
    }

    const { data: deletedCounts, error: rpcError } = await supabaseAdmin.rpc(
      "admin_delete_pharmacy",
      { p_pharmacy_id: id }
    );

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    // Nettoyage best-effort du logo stocké : ne doit jamais faire échouer la
    // suppression déjà actée en base.
    try {
      const { data: files } = await supabaseAdmin.storage
        .from("pharmacy-logos")
        .list(id);

      if (files && files.length > 0) {
        await supabaseAdmin.storage
          .from("pharmacy-logos")
          .remove(files.map((file) => `${id}/${file.name}`));
      }
    } catch {
      // Le logo orphelin n'est pas bloquant : la pharmacie et ses données
      // métier sont déjà supprimées.
    }

    return NextResponse.json({
      message: `Pharmacie « ${pharmacy.name} » et toutes ses données ont été supprimées.`,
      deletedCounts: deletedCounts ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer la pharmacie.",
      },
      { status: getApiErrorStatus(error) }
    );
  }
}
