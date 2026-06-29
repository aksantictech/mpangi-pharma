import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedManagerRoles = ["owner", "manager"];

export async function requirePharmacyManager(pharmacyId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Utilisateur non authentifié.");
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: platformAdmin } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (platformAdmin) {
    return {
      user,
      supabaseAdmin,
      isPlatformAdmin: true,
      role: "super_admin",
    };
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from("pharmacy_members")
    .select("role")
    .eq("pharmacy_id", pharmacyId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (!member || !allowedManagerRoles.includes(member.role)) {
    throw new Error("Accès réservé au propriétaire ou au gérant.");
  }

  return {
    user,
    supabaseAdmin,
    isPlatformAdmin: false,
    role: member.role,
  };
}