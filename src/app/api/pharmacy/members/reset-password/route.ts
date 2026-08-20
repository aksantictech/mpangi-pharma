import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";
import {
  ApiRequestError,
  assertStringLength,
  assertUuid,
  getApiErrorStatus,
  readProtectedJson,
} from "@/lib/http/request-security";

type ResetPasswordBody = {
  pharmacyId: string;
  memberId: string;
  temporaryPassword: string;
};

export async function POST(request: Request) {
  try {
    const body = await readProtectedJson<ResetPasswordBody>(request, {
      maxBytes: 16_384,
    });

    if (!body.pharmacyId) {
      throw new Error("La pharmacie est obligatoire.");
    }

    assertUuid(body.pharmacyId, "La pharmacie");

    if (!body.memberId) {
      throw new Error("L’utilisateur est obligatoire.");
    }

    assertUuid(body.memberId, "L’utilisateur");
    assertStringLength(body.temporaryPassword, "Le mot de passe", 128);

    if (!body.temporaryPassword?.trim()) {
      throw new Error("Le mot de passe temporaire est obligatoire.");
    }

    if (body.temporaryPassword.length < 12) {
      throw new Error("Le mot de passe doit contenir au moins 12 caractères.");
    }

    const { supabaseAdmin, user, role, isPlatformAdmin } =
      await requirePharmacyManager(body.pharmacyId);

    const { data: member, error: memberError } = await supabaseAdmin
      .from("pharmacy_members")
      .select("id, pharmacy_id, user_id, role, is_active")
      .eq("id", body.memberId)
      .eq("pharmacy_id", body.pharmacyId)
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (!member) {
      throw new Error("Utilisateur introuvable dans cette pharmacie.");
    }

    if (!member.is_active) {
      throw new Error("Impossible de réinitialiser un utilisateur inactif.");
    }

    if (!isPlatformAdmin && role === "manager" && member.role === "owner") {
      throw new Error("Un gérant ne peut pas réinitialiser le propriétaire.");
    }

    if (!isPlatformAdmin && role === "manager" && member.role === "manager") {
      throw new ApiRequestError(
        "Un gérant ne peut pas réinitialiser le mot de passe d’un autre gérant.",
        403
      );
    }

    const { data: authUserData, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(member.user_id);

    if (authUserError) {
      throw new Error(authUserError.message);
    }

    const currentMetadata = authUserData.user?.user_metadata ?? {};

    const { error: updateAuthError } =
      await supabaseAdmin.auth.admin.updateUserById(member.user_id, {
        password: body.temporaryPassword,
        user_metadata: {
          ...currentMetadata,
          must_change_password: true,
        },
      });

    if (updateAuthError) {
      throw new Error(updateAuthError.message);
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.user_id);

    if (profileError) {
      throw new Error(profileError.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      pharmacy_id: body.pharmacyId,
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      action: "pharmacy_members.password_reset",
      entity_type: "pharmacy_members",
      entity_id: member.id,
      metadata: {
        target_user_id: member.user_id,
        target_role: member.role,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Mot de passe réinitialisé avec succès.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de réinitialiser le mot de passe.",
      },
      {
        status: getApiErrorStatus(error),
      }
    );
  }
}
