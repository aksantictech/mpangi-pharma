import { createSupabaseClient } from "@/lib/supabase/client";

export type CurrentUserAccount = {
  userId: string;
  email: string;
  mustChangePassword: boolean;
};

export async function getCurrentUserAccount(): Promise<CurrentUserAccount> {
  const supabase = createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user?.id || !user.email) {
    throw new Error("Utilisateur introuvable.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    userId: user.id,
    email: user.email,
    mustChangePassword: Boolean(profile?.must_change_password),
  };
}

export async function mustCurrentUserChangePassword() {
  try {
    const account = await getCurrentUserAccount();
    return account.mustChangePassword;
  } catch {
    return false;
  }
}

export async function changeCurrentUserPassword({
  email,
  currentPassword,
  newPassword,
}: {
  email: string;
  currentPassword: string;
  newPassword: string;
}) {
  const supabase = createSupabaseClient();

  const {
    data: { user: currentUser },
    error: currentUserError,
  } = await supabase.auth.getUser();

  if (currentUserError || !currentUser) {
    throw new Error("Utilisateur non connecté.");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError) {
    throw new Error("Mot de passe actuel incorrect.");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentUser.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return true;
}