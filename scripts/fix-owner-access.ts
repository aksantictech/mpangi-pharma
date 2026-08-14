import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ownerEmail = process.env.OWNER_EMAIL ?? "";
const ownerPassword = process.env.OWNER_PASSWORD ?? "";
const ownerFullName = process.env.OWNER_FULL_NAME ?? "";
const pharmacySlug = process.env.OWNER_PHARMACY_SLUG ?? "";

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL manquant.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant.");
}

if (!ownerEmail || !ownerFullName || !pharmacySlug) {
  throw new Error(
    "OWNER_EMAIL, OWNER_FULL_NAME et OWNER_PHARMACY_SLUG sont obligatoires."
  );
}

if (!ownerPassword || ownerPassword.length < 12) {
  throw new Error(
    "OWNER_PASSWORD est manquant ou contient moins de 12 caractères."
  );
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
}

async function main() {
  console.log("Réparation accès owner...");

  const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
    .from("pharmacies")
    .select("*")
    .eq("slug", pharmacySlug)
    .single();

  if (pharmacyError) {
    throw new Error(pharmacyError.message);
  }

  if (!pharmacy) {
    throw new Error(`Pharmacie introuvable avec le slug : ${pharmacySlug}`);
  }

  let userId: string;

  const existingUser = await findUserByEmail(ownerEmail);

  if (existingUser) {
    userId = existingUser.id;

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: ownerPassword,
        email_confirm: true,
        user_metadata: {
          full_name: ownerFullName,
        },
      });

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log("Utilisateur existant trouvé, mot de passe réinitialisé.");
  } else {
    const { data: createdUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true,
        user_metadata: {
          full_name: ownerFullName,
        },
      });

    if (createError) {
      throw new Error(createError.message);
    }

    if (!createdUser.user) {
      throw new Error("Utilisateur non créé.");
    }

    userId = createdUser.user.id;

    console.log("Utilisateur owner créé.");
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      full_name: ownerFullName,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: memberError } = await supabaseAdmin
    .from("pharmacy_members")
    .upsert(
      {
        pharmacy_id: pharmacy.id,
        user_id: userId,
        role: "owner",
        is_active: true,
      },
      {
        onConflict: "pharmacy_id,user_id",
      }
    );

  if (memberError) {
    throw new Error(memberError.message);
  }

  console.log("");
  console.log("Accès owner réparé avec succès.");
  console.log(`Pharmacie : ${pharmacy.name}`);
  console.log(`Email : ${ownerEmail}`);
  console.log("Mot de passe : défini depuis OWNER_PASSWORD (non affiché)");
}

main().catch((error) => {
  console.error("Erreur réparation owner :");
  console.error(error);
  process.exit(1);
});
