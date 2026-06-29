import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";

type MemberRole =
  | "manager"
  | "pharmacist"
  | "cashier"
  | "stock_manager"
  | "accountant";

type UpdateMemberBody = {
  pharmacyId: string;
  memberId: string;
  fullName: string;
  phone?: string;
  role: MemberRole;
  isActive: boolean;
};

const allowedRoles: MemberRole[] = [
  "manager",
  "pharmacist",
  "cashier",
  "stock_manager",
  "accountant",
];

function emptyToNull(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UpdateMemberBody;

    if (!body.pharmacyId) {
      throw new Error("La pharmacie est obligatoire.");
    }

    if (!body.memberId) {
      throw new Error("L’utilisateur est obligatoire.");
    }

    if (!body.fullName?.trim()) {
      throw new Error("Le nom complet est obligatoire.");
    }

    if (!allowedRoles.includes(body.role)) {
      throw new Error("Rôle invalide.");
    }

    if (typeof body.isActive !== "boolean") {
      throw new Error("Le statut est obligatoire.");
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

    if (member.role === "owner") {
      throw new Error("Le propriétaire ne peut pas être modifié depuis cette action.");
    }

    if (member.user_id === user.id && body.isActive === false) {
      throw new Error("Vous ne pouvez pas désactiver votre propre accès.");
    }

    if (!isPlatformAdmin && role === "manager" && member.role === "manager") {
      throw new Error("Un gérant ne peut pas modifier un autre gérant.");
    }

const { data: authUserData, error: authUserError } =
  await supabaseAdmin.auth.admin.getUserById(member.user_id);

if (authUserError) {
  throw new Error(authUserError.message);
}

const currentMetadata = authUserData.user?.user_metadata ?? {};
const targetEmail = authUserData.user?.email ?? null;

    const { error: authUpdateError } =
      await supabaseAdmin.auth.admin.updateUserById(member.user_id, {
        user_metadata: {
          ...currentMetadata,
          full_name: body.fullName.trim(),
          phone: emptyToNull(body.phone),
        },
      });

    if (authUpdateError) {
      throw new Error(authUpdateError.message);
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
    id: member.user_id,
    full_name: body.fullName.trim(),
    email: targetEmail,
    phone: emptyToNull(body.phone),
    updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { data: updatedMember, error: updateMemberError } =
      await supabaseAdmin
        .from("pharmacy_members")
        .update({
          role: body.role,
          is_active: body.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id)
        .eq("pharmacy_id", body.pharmacyId)
        .select("*")
        .single();

    if (updateMemberError) {
      throw new Error(updateMemberError.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      pharmacy_id: body.pharmacyId,
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      action: "pharmacy_members.updated",
      entity_type: "pharmacy_members",
      entity_id: member.id,
      metadata: {
        target_user_id: member.user_id,
        previous_role: member.role,
        new_role: body.role,
        previous_status: member.is_active,
        new_status: body.isActive,
        full_name: body.fullName.trim(),
        phone: emptyToNull(body.phone),
      },
    });

    return NextResponse.json({
      member: updatedMember,
      message: "Utilisateur modifié avec succès.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de modifier l’utilisateur.",
      },
      {
        status: 400,
      }
    );
  }
}