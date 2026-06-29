import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Non authentifié.");
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: platformAdmin, error: adminError } = await supabaseAdmin
    .from("platform_admins")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError) {
    throw new Error(adminError.message);
  }

  if (!platformAdmin) {
    throw new Error("Accès réservé au Super Admin.");
  }

  return {
    user,
    platformAdmin,
    supabaseAdmin,
  };
}