import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";

type UpdateMemberStatusBody = {
  pharmacyId: string;
  memberId: string;
  isActive: boolean;
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UpdateMemberStatusBody;

    if (!body.pharmacyId) {
      throw new Error("La pharmacie est obligatoire.");
    }

    if (!body.memberId) {
      throw new Error("L’utilisateur est obligatoire.");
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
      throw new Error("Le propriétaire ne peut pas être désactivé.");
    }

    if (member.user_id === user.id) {
      throw new Error("Vous ne pouvez pas désactiver votre propre accès.");
    }

    if (!isPlatformAdmin && role === "manager" && member.role === "manager") {
      throw new Error("Un gérant ne peut pas désactiver un autre gérant.");
    }

    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from("pharmacy_members")
      .update({
        is_active: body.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.id)
      .eq("pharmacy_id", body.pharmacyId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      pharmacy_id: body.pharmacyId,
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      action: body.isActive
        ? "pharmacy_members.activated"
        : "pharmacy_members.deactivated",
      entity_type: "pharmacy_members",
      entity_id: member.id,
      metadata: {
        target_user_id: member.user_id,
        target_role: member.role,
        previous_status: member.is_active,
        new_status: body.isActive,
      },
    });

    return NextResponse.json({
      member: updatedMember,
      message: body.isActive
        ? "Utilisateur réactivé avec succès."
        : "Utilisateur désactivé avec succès.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de modifier le statut de l’utilisateur.",
      },
      {
        status: 400,
      }
    );
  }
}