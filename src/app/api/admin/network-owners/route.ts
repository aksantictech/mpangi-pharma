import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { NETWORK_ACCOUNT_TYPE } from "@/lib/account-type";
import {
  ApiRequestError,
  assertSameOriginRead,
  assertStringLength,
  assertUuid,
  getApiErrorStatus,
  readProtectedJson,
} from "@/lib/http/request-security";

type SupabaseAdminClient = Awaited<
  ReturnType<typeof requirePlatformAdmin>
>["supabaseAdmin"];

type CreateBody = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  pharmacyIds: string[];
};

type UpdateBody = {
  userId: string;
  fullName?: string;
  phone?: string;
  pharmacyIds?: string[];
  /** Mot de passe temporaire : la personne devra le changer à la connexion. */
  temporaryPassword?: string;
};

const MAX_PHARMACIES = 50;

function emptyToNull(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function parsePharmacyIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new ApiRequestError("Choisissez au moins une pharmacie.", 400);
  }

  const ids = [...new Set(value.map((item) => String(item)))];

  if (ids.length === 0) {
    throw new ApiRequestError("Choisissez au moins une pharmacie.", 400);
  }

  if (ids.length > MAX_PHARMACIES) {
    throw new ApiRequestError("Trop de pharmacies sélectionnées.", 400);
  }

  ids.forEach((id) => assertUuid(id, "La pharmacie"));

  return ids;
}

async function assertPharmaciesUsable(
  supabaseAdmin: SupabaseAdminClient,
  pharmacyIds: string[]
) {
  const { data, error } = await supabaseAdmin
    .from("pharmacies")
    .select("id, archived_at")
    .in("id", pharmacyIds);

  if (error) {
    throw new Error(error.message);
  }

  const usable = new Set(
    (data ?? [])
      .filter((pharmacy: { archived_at: string | null }) => !pharmacy.archived_at)
      .map((pharmacy: { id: string }) => pharmacy.id)
  );

  if (pharmacyIds.some((id) => !usable.has(id))) {
    throw new ApiRequestError(
      "Une des pharmacies choisies est introuvable ou archivée.",
      400
    );
  }
}

async function listNetworkOwners(supabaseAdmin: SupabaseAdminClient) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.users.filter(
    (user: { app_metadata?: Record<string, unknown> }) =>
      user.app_metadata?.account_type === NETWORK_ACCOUNT_TYPE
  );
}

/** Aligne les pharmacies actives du compte sur la liste demandée. */
async function syncMemberships(
  supabaseAdmin: SupabaseAdminClient,
  userId: string,
  pharmacyIds: string[],
  actor: { id: string; email?: string | null }
) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("pharmacy_members")
    .select("id, pharmacy_id, is_active")
    .eq("user_id", userId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const wanted = new Set(pharmacyIds);
  const current = (existing ?? []) as {
    id: string;
    pharmacy_id: string;
    is_active: boolean;
  }[];

  const rows = pharmacyIds.map((pharmacyId) => ({
    pharmacy_id: pharmacyId,
    user_id: userId,
    role: "owner",
    is_active: true,
  }));

  const { error: upsertError } = await supabaseAdmin
    .from("pharmacy_members")
    .upsert(rows, { onConflict: "pharmacy_id,user_id" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  // Pharmacies retirées : l'accès est désactivé, la ligne est conservée.
  const removed = current.filter(
    (member) => member.is_active && !wanted.has(member.pharmacy_id)
  );

  if (removed.length > 0) {
    const { error: removeError } = await supabaseAdmin
      .from("pharmacy_members")
      .update({ is_active: false })
      .eq("user_id", userId)
      .in(
        "pharmacy_id",
        removed.map((member) => member.pharmacy_id)
      );

    if (removeError) {
      throw new Error(removeError.message);
    }
  }

  const alreadyActive = new Set(
    current.filter((member) => member.is_active).map((m) => m.pharmacy_id)
  );

  const auditRows = [
    ...pharmacyIds
      .filter((id) => !alreadyActive.has(id))
      .map((id) => ({ pharmacyId: id, action: "network_owner.pharmacy_added" })),
    ...removed.map((member) => ({
      pharmacyId: member.pharmacy_id,
      action: "network_owner.pharmacy_removed",
    })),
  ].map(({ pharmacyId, action }) => ({
    pharmacy_id: pharmacyId,
    actor_user_id: actor.id,
    actor_email: actor.email ?? null,
    action,
    entity_type: "pharmacy_members",
    entity_id: userId,
    metadata: { target_user_id: userId },
  }));

  if (auditRows.length > 0) {
    // Journal d'audit : ne bloque jamais l'opération principale.
    await supabaseAdmin.from("audit_logs").insert(auditRows);
  }
}

/** Comptes « propriétaire réseau » et pharmacies auxquelles ils accèdent. */
export async function GET(request: Request) {
  try {
    assertSameOriginRead(request);

    const { supabaseAdmin } = await requirePlatformAdmin();
    const users = await listNetworkOwners(supabaseAdmin);
    const userIds = users.map((user: { id: string }) => user.id);

    const { data: memberships, error: membershipsError } =
      userIds.length === 0
        ? { data: [], error: null }
        : await supabaseAdmin
            .from("pharmacy_members")
            .select("user_id, pharmacy_id, is_active")
            .in("user_id", userIds);

    if (membershipsError) {
      throw new Error(membershipsError.message);
    }

    const { data: profiles, error: profilesError } =
      userIds.length === 0
        ? { data: [], error: null }
        : await supabaseAdmin
            .from("profiles")
            .select("id, full_name, phone")
            .in("id", userIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    const owners = users.map(
      (user: {
        id: string;
        email?: string;
        last_sign_in_at?: string | null;
        user_metadata?: Record<string, unknown>;
      }) => {
        const profile = (profiles ?? []).find(
          (item: { id: string }) => item.id === user.id
        );

        return {
          userId: user.id,
          email: user.email ?? "",
          fullName:
            profile?.full_name ??
            (user.user_metadata?.full_name as string | undefined) ??
            "",
          phone: profile?.phone ?? null,
          lastSignInAt: user.last_sign_in_at ?? null,
          pharmacyIds: (memberships ?? [])
            .filter(
              (item: { user_id: string; is_active: boolean }) =>
                item.user_id === user.id && item.is_active
            )
            .map((item: { pharmacy_id: string }) => item.pharmacy_id),
        };
      }
    );

    return NextResponse.json(
      { owners },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les comptes réseau.",
      },
      { status: getApiErrorStatus(error) }
    );
  }
}

/** Crée un compte « propriétaire réseau » rattaché à plusieurs pharmacies. */
export async function POST(request: Request) {
  try {
    const body = await readProtectedJson<CreateBody>(request, {
      maxBytes: 32_768,
    });

    assertStringLength(body.fullName, "Le nom complet", 120);
    assertStringLength(body.email, "L’email", 254);
    assertStringLength(body.password, "Le mot de passe", 128);
    assertStringLength(body.phone, "Le téléphone", 40);

    if (!body.fullName?.trim()) {
      throw new Error("Le nom complet est obligatoire.");
    }

    if (!body.email?.trim()) {
      throw new Error("L’email est obligatoire.");
    }

    if (!body.password || body.password.length < 12) {
      throw new Error("Le mot de passe doit contenir au moins 12 caractères.");
    }

    const pharmacyIds = parsePharmacyIds(body.pharmacyIds);
    const { supabaseAdmin, user: actor } = await requirePlatformAdmin();

    await assertPharmaciesUsable(supabaseAdmin, pharmacyIds);

    const email = body.email.trim();
    const { data: found, error: findError } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (findError) {
      throw new Error(findError.message);
    }

    if (
      found.users.some(
        (existing: { email?: string }) =>
          existing.email?.toLowerCase() === email.toLowerCase()
      )
    ) {
      // Un compte existant peut appartenir à une pharmacie : on ne le
      // transforme jamais silencieusement en compte réseau.
      throw new Error(
        "Un compte utilise déjà cette adresse. Utilisez un autre email."
      );
    }

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.fullName.trim(),
          phone: emptyToNull(body.phone),
          must_change_password: true,
        },
        // Modifiable uniquement ici (côté serveur) : l'utilisateur ne peut pas
        // se retirer ou s'attribuer ce type de compte lui-même.
        app_metadata: { account_type: NETWORK_ACCOUNT_TYPE },
      });

    if (createError) {
      throw new Error(createError.message);
    }

    if (!created.user) {
      throw new Error("Compte non créé.");
    }

    const userId = created.user.id;

    try {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: body.fullName.trim(),
            email,
            phone: emptyToNull(body.phone),
            must_change_password: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (profileError) {
        throw new Error(profileError.message);
      }

      await syncMemberships(supabaseAdmin, userId, pharmacyIds, actor);
    } catch (error) {
      // Pas de compte à moitié créé : on retire le compte pour pouvoir
      // recommencer avec la même adresse.
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw error;
    }

    return NextResponse.json({ userId, pharmacyIds });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de créer le compte réseau.",
      },
      { status: getApiErrorStatus(error) }
    );
  }
}

/** Modifie un compte réseau : identité, pharmacies, mot de passe temporaire. */
export async function PATCH(request: Request) {
  try {
    const body = await readProtectedJson<UpdateBody>(request, {
      maxBytes: 32_768,
    });

    if (!body.userId) {
      throw new Error("Le compte est obligatoire.");
    }

    assertUuid(body.userId, "Le compte");
    assertStringLength(body.fullName, "Le nom complet", 120);
    assertStringLength(body.phone, "Le téléphone", 40);
    assertStringLength(body.temporaryPassword, "Le mot de passe", 128);

    if (body.fullName !== undefined && !body.fullName.trim()) {
      throw new Error("Le nom complet est obligatoire.");
    }

    if (body.temporaryPassword && body.temporaryPassword.length < 12) {
      throw new Error("Le mot de passe doit contenir au moins 12 caractères.");
    }

    const { supabaseAdmin, user: actor } = await requirePlatformAdmin();

    const { data: target, error: targetError } =
      await supabaseAdmin.auth.admin.getUserById(body.userId);

    if (targetError || !target.user) {
      throw new ApiRequestError("Compte introuvable.", 404);
    }

    // Cette route ne touche que les comptes réseau : jamais un autre type.
    if (target.user.app_metadata?.account_type !== NETWORK_ACCOUNT_TYPE) {
      throw new ApiRequestError(
        "Ce compte n’est pas un compte propriétaire réseau.",
        400
      );
    }

    if (body.pharmacyIds !== undefined) {
      const pharmacyIds = parsePharmacyIds(body.pharmacyIds);

      await assertPharmaciesUsable(supabaseAdmin, pharmacyIds);
      await syncMemberships(supabaseAdmin, body.userId, pharmacyIds, actor);
    }

    const metadata = { ...(target.user.user_metadata ?? {}) };
    let authChanged = false;

    if (body.fullName !== undefined) {
      metadata.full_name = body.fullName.trim();
      authChanged = true;
    }

    if (body.phone !== undefined) {
      metadata.phone = emptyToNull(body.phone);
      authChanged = true;
    }

    if (body.temporaryPassword) {
      metadata.must_change_password = true;
      authChanged = true;
    }

    if (authChanged) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        body.userId,
        {
          ...(body.temporaryPassword ? { password: body.temporaryPassword } : {}),
          user_metadata: metadata,
        }
      );

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          ...(body.fullName !== undefined
            ? { full_name: body.fullName.trim() }
            : {}),
          ...(body.phone !== undefined ? { phone: emptyToNull(body.phone) } : {}),
          ...(body.temporaryPassword ? { must_change_password: true } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.userId);

      if (profileError) {
        throw new Error(profileError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de modifier le compte réseau.",
      },
      { status: getApiErrorStatus(error) }
    );
  }
}
