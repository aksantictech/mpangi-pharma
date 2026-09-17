import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  assertSameOriginRequest,
  assertStringLength,
  getApiErrorStatus,
  readProtectedJson,
} from "@/lib/http/request-security";

import type { AdminPharmacy, PharmacyHealth } from "@/types/admin";
import type { Pharmacy } from "@/types/pharmacy";
import type { PharmacySubscription } from "@/types/subscription";

/** Essai gratuit accordé automatiquement à la création, le temps que le
 * Super Admin configure un abonnement définitif depuis /admin/abonnements. */
const DEFAULT_TRIAL_DAYS = 30;

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

function emptyHealth(): PharmacyHealth {
  return {
    activeMembers: 0,
    totalMembers: 0,
    productsCount: 0,
    salesLast30d: 0,
  };
}

async function loadHealthByPharmacy(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>
) {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [membersResult, productsResult, salesResult] = await Promise.all([
    supabaseAdmin
      .from("pharmacy_members")
      .select("pharmacy_id, is_active")
      .limit(50_000),
    supabaseAdmin.from("products").select("pharmacy_id").limit(200_000),
    supabaseAdmin
      .from("sales")
      .select("pharmacy_id")
      .gte("created_at", thirtyDaysAgo)
      .limit(200_000),
  ]);

  const health = new Map<string, PharmacyHealth>();

  function get(pharmacyId: string) {
    const existing = health.get(pharmacyId);

    if (existing) return existing;

    const created = emptyHealth();

    health.set(pharmacyId, created);

    return created;
  }

  for (const row of membersResult.data ?? []) {
    const entry = get(row.pharmacy_id as string);

    entry.totalMembers += 1;

    if (row.is_active) {
      entry.activeMembers += 1;
    }
  }

  for (const row of productsResult.data ?? []) {
    get(row.pharmacy_id as string).productsCount += 1;
  }

  for (const row of salesResult.data ?? []) {
    get(row.pharmacy_id as string).salesLast30d += 1;
  }

  return health;
}

export async function GET() {
  try {
    await requirePlatformAdmin();

    const supabaseAdmin = createSupabaseAdminClient();

    const [{ data, error }, health, { data: subscriptionRows }] =
      await Promise.all([
        supabaseAdmin
          .from("pharmacies")
          .select("*")
          .order("created_at", { ascending: false }),
        loadHealthByPharmacy(supabaseAdmin),
        supabaseAdmin.from("pharmacy_subscriptions").select("*"),
      ]);

    if (error) {
      throw new Error(error.message);
    }

    const subscriptions = new Map<string, PharmacySubscription>(
      ((subscriptionRows ?? []) as PharmacySubscription[]).map((row) => [
        row.pharmacy_id,
        row,
      ])
    );

    const pharmacies: AdminPharmacy[] = ((data ?? []) as Pharmacy[]).map(
      (pharmacy) => ({
        ...pharmacy,
        health: health.get(pharmacy.id) ?? emptyHealth(),
        subscription: subscriptions.get(pharmacy.id) ?? null,
      })
    );

    return NextResponse.json(
      { pharmacies },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les pharmacies.",
      },
      { status: getApiErrorStatus(error, 400) }
    );
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
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

    // Sans cette ligne d'initialisation, la pharmacie n'a aucune configuration
    // (pharmacy_settings) et la page « Paramètres généraux » échoue en
    // silence (.single() sans ligne) : le formulaire d'identité/logo
    // n'apparaît jamais. create_pharmacy_with_owner() le fait déjà pour le
    // flux normal ; cette route (création directe par le Super Admin) doit
    // faire de même.
    const { error: settingsError } = await supabaseAdmin
      .from("pharmacy_settings")
      .insert({ pharmacy_id: pharmacy.id });

    if (settingsError) {
      throw new Error(settingsError.message);
    }

    // Essai gratuit automatique : sans ça, la nouvelle pharmacie n'a aucune
    // ligne pharmacy_subscriptions et has_active_pharmacy_role() (utilisée
    // par la RLS des données métier) la considère bloquée dès sa création.
    const { error: subscriptionError } = await supabaseAdmin
      .from("pharmacy_subscriptions")
      .insert({
        pharmacy_id: pharmacy.id,
        status: "trial",
        plan_label: `Essai gratuit ${DEFAULT_TRIAL_DAYS} jours`,
        expires_at: new Date(
          Date.now() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

    if (subscriptionError) {
      throw new Error(subscriptionError.message);
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
