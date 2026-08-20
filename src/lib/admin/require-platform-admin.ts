import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ApiRequestError } from "@/lib/http/request-security";

export async function requirePlatformAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ApiRequestError("Non authentifié.", 401);
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: platformAdmin, error: adminError } = await supabaseAdmin
    .from("platform_admins")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError) {
    throw new ApiRequestError(
      "Impossible de vérifier les autorisations administrateur.",
      500
    );
  }

  if (!platformAdmin) {
    throw new ApiRequestError("Accès réservé au Super Admin.", 403);
  }

  return {
    user,
    platformAdmin,
    supabaseAdmin,
  };
}
