import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminEmail = process.env.ADMIN_EMAIL || "admin@mpangi-pharma.cd";
const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe@2026!";
const adminFullName =
  process.env.ADMIN_FULL_NAME || "Administrateur Mpangi_Pharma";

const pharmacyName =
  process.env.ADMIN_PHARMACY_NAME || "Pharmacie Centrale Mpangi";
const pharmacySlug =
  process.env.ADMIN_PHARMACY_SLUG || "pharmacie-centrale-mpangi";
const pharmacyCity = process.env.ADMIN_PHARMACY_CITY || "Kinshasa";
const pharmacyProvince = process.env.ADMIN_PHARMACY_PROVINCE || "Kinshasa";
const exchangeRate = Number(process.env.ADMIN_EXCHANGE_RATE || 2800);

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL est manquant dans .env.local");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY est manquant dans .env.local");
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

async function createOrGetAdminUser() {
  const existingUser = await findUserByEmail(adminEmail);

  if (existingUser) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      {
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminFullName,
        },
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    console.log(`Utilisateur déjà existant, mot de passe réinitialisé : ${adminEmail}`);

    return existingUser.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: adminFullName,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Utilisateur admin non créé.");
  }

  console.log(`Utilisateur admin créé : ${adminEmail}`);

  return data.user.id;
}
async function upsertProfile(userId: string) {
  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      full_name: adminFullName,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  console.log("Profil admin synchronisé.");
}

async function upsertPlatformAdmin(userId: string) {
  const { error } = await supabaseAdmin.from("platform_admins").upsert(
    {
      user_id: userId,
      role: "super_admin",
      is_active: true,
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  console.log("Rôle super admin attribué.");
}

async function createOrGetPharmacy(userId: string) {
  const { data: existingPharmacy, error: selectError } = await supabaseAdmin
    .from("pharmacies")
    .select("id")
    .eq("slug", pharmacySlug)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existingPharmacy) {
    console.log(`Pharmacie déjà existante : ${pharmacyName}`);
    return existingPharmacy.id as string;
  }

  const { data, error } = await supabaseAdmin
    .from("pharmacies")
    .insert({
      name: pharmacyName,
      slug: pharmacySlug,
      city: pharmacyCity,
      province: pharmacyProvince,
      country: "RD Congo",
      pharmacist_name: adminFullName,
      currency_main: "CDF",
      currency_secondary: "USD",
      exchange_rate: exchangeRate,
      invoice_footer: "Merci pour votre confiance.",
      created_by: userId,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  console.log(`Pharmacie créée : ${pharmacyName}`);

  return data.id as string;
}

async function attachOwnerToPharmacy(userId: string, pharmacyId: string) {
  const { error } = await supabaseAdmin.from("pharmacy_members").upsert(
    {
      pharmacy_id: pharmacyId,
      user_id: userId,
      role: "owner",
      is_active: true,
    },
    {
      onConflict: "pharmacy_id,user_id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  console.log("Admin rattaché à la pharmacie comme propriétaire.");
}

async function upsertPharmacySettings(pharmacyId: string) {
  const { error } = await supabaseAdmin.from("pharmacy_settings").upsert(
    {
      pharmacy_id: pharmacyId,
      allow_negative_stock: false,
      block_expired_sales: true,
      expiration_alert_days: 90,
      low_stock_alert_enabled: true,
      invoice_prefix: "FAC",
      receipt_format: "A4",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "pharmacy_id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  console.log("Paramètres pharmacie initialisés.");
}

async function main() {
  console.log("Création du compte admin Mpangi_Pharma...");

  const userId = await createOrGetAdminUser();

  await upsertProfile(userId);
  await upsertPlatformAdmin(userId);

  const pharmacyId = await createOrGetPharmacy(userId);

  await attachOwnerToPharmacy(userId, pharmacyId);
  await upsertPharmacySettings(pharmacyId);

  console.log("");
  console.log("Compte admin prêt.");
  console.log(`Email : ${adminEmail}`);
  console.log(`Mot de passe : ${adminPassword}`);
  console.log("");
  console.log("Important : change le mot de passe après la première connexion.");
}

main().catch((error) => {
  console.error("Erreur création admin :");
  console.error(error);
  process.exit(1);
});