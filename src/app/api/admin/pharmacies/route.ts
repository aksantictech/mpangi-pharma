import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  assertStringLength,
  getApiErrorStatus,
  readProtectedJson,
} from "@/lib/http/request-security";

type CreatePharmacyBody = {
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function emptyToNull(value?: string) {
  const trimmed = String(value ?? "").trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  try {
    await requirePlatformAdmin();

    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin
      .from("pharmacies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      pharmacies: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les pharmacies.",
      },
      {
        status: 400,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();

    const body = await readProtectedJson<CreatePharmacyBody>(request, {
      maxBytes: 32_768,
    });

    assertStringLength(body.name, "Le nom", 160);
    assertStringLength(body.slug, "Le slug", 120);
    assertStringLength(body.address, "L’adresse", 300);
    assertStringLength(body.city, "La ville", 120);
    assertStringLength(body.province, "La province", 120);
    assertStringLength(body.phone, "Le téléphone", 40);
    assertStringLength(body.email, "L’email", 254);

    if (!body.name?.trim()) {
      throw new Error("Le nom de la pharmacie est obligatoire.");
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const slug = body.slug?.trim() || toSlug(body.name);

    const { data: existingPharmacy, error: existingError } = await supabaseAdmin
      .from("pharmacies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingPharmacy) {
      throw new Error("Une pharmacie avec ce slug existe déjà.");
    }

    const { data: pharmacy, error: createError } = await supabaseAdmin
      .from("pharmacies")
      .insert({
        name: body.name.trim(),
        slug,
        address: emptyToNull(body.address),
        city: emptyToNull(body.city),
        province: emptyToNull(body.province),
        phone: emptyToNull(body.phone),
        email: emptyToNull(body.email),
        is_active: true,
      })
      .select("*")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return NextResponse.json({
      pharmacy,
      message: "Pharmacie créée avec succès.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de créer la pharmacie.",
      },
      {
        status: getApiErrorStatus(error),
      }
    );
  }
}
