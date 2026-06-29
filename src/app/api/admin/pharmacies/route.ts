import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";

type CreatePharmacyBody = {
  name: string;
  slug: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  pharmacistName?: string;
  exchangeRate?: number;
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword: string;
};

const defaultCategories = [
  ["Antipaludiques", "Médicaments contre le paludisme", "#16a34a"],
  ["Antibiotiques", "Traitements anti-infectieux", "#2563eb"],
  ["Antalgiques", "Douleurs et fièvre", "#dc2626"],
  ["Anti-inflammatoires", "Traitements anti-inflammatoires", "#ea580c"],
  ["Vitamines", "Vitamines et compléments simples", "#ca8a04"],
  ["Injectables", "Ampoules, flacons injectables", "#0891b2"],
  ["Consommables", "Gants, seringues, compresses, dispositifs", "#475569"],
  ["Dermatologie", "Pommades, crèmes et soins de peau", "#db2777"],
  ["Hygiène", "Produits d’hygiène et soins courants", "#059669"],
];

function emptyToNull(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

async function findUserByEmail(supabaseAdmin: ReturnType<typeof import("@/lib/supabase/admin").createSupabaseAdminClient>, email: string) {
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

export async function GET() {
  try {
    const { supabaseAdmin } = await requirePlatformAdmin();

    const { data, error } = await supabaseAdmin
      .from("pharmacies")
      .select(
        `
        *,
        members:pharmacy_members(
          id,
          role,
          is_active,
          profile:profiles(id, full_name, phone)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      pharmacies: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les pharmacies.",
      },
      {
        status: 403,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabaseAdmin } = await requirePlatformAdmin();

    const body = (await request.json()) as CreatePharmacyBody;

    if (!body.name?.trim()) {
      throw new Error("Le nom de la pharmacie est obligatoire.");
    }

    if (!body.slug?.trim()) {
      throw new Error("Le slug de la pharmacie est obligatoire.");
    }

    if (!body.ownerEmail?.trim()) {
      throw new Error("L’email du responsable est obligatoire.");
    }

    if (!body.ownerPassword?.trim()) {
      throw new Error("Le mot de passe du responsable est obligatoire.");
    }

    if (body.ownerPassword.length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    }

    const existingUser = await findUserByEmail(
      supabaseAdmin,
      body.ownerEmail.trim()
    );

    let ownerUserId: string;

    if (existingUser) {
      ownerUserId = existingUser.id;

      const { error: updateUserError } =
        await supabaseAdmin.auth.admin.updateUserById(ownerUserId, {
          password: body.ownerPassword,
          email_confirm: true,
          user_metadata: {
            full_name: body.ownerFullName,
          },
        });

      if (updateUserError) {
        throw new Error(updateUserError.message);
      }
    } else {
      const { data: createdUser, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email: body.ownerEmail.trim(),
          password: body.ownerPassword,
          email_confirm: true,
          user_metadata: {
            full_name: body.ownerFullName,
          },
        });

      if (createUserError) {
        throw new Error(createUserError.message);
      }

      if (!createdUser.user) {
        throw new Error("Utilisateur responsable non créé.");
      }

      ownerUserId = createdUser.user.id;
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: ownerUserId,
        full_name: body.ownerFullName?.trim() || body.ownerEmail,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from("pharmacies")
      .insert({
        name: body.name.trim(),
        slug: body.slug.trim(),
        address: emptyToNull(body.address),
        city: emptyToNull(body.city),
        province: emptyToNull(body.province),
        phone: emptyToNull(body.phone),
        email: emptyToNull(body.email),
        pharmacist_name: emptyToNull(body.pharmacistName),
        currency_main: "CDF",
        currency_secondary: "USD",
        exchange_rate: body.exchangeRate || 2800,
        invoice_footer: "Merci pour votre confiance.",
        created_by: user.id,
        is_active: true,
      })
      .select("*")
      .single();

    if (pharmacyError) {
      throw new Error(pharmacyError.message);
    }

    const { error: memberError } = await supabaseAdmin
      .from("pharmacy_members")
      .upsert(
        {
          pharmacy_id: pharmacy.id,
          user_id: ownerUserId,
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

    const { error: settingsError } = await supabaseAdmin
      .from("pharmacy_settings")
      .upsert(
        {
          pharmacy_id: pharmacy.id,
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

    if (settingsError) {
      throw new Error(settingsError.message);
    }

    const categoriesToInsert = defaultCategories.map(
      ([name, description, color]) => ({
        pharmacy_id: pharmacy.id,
        name,
        description,
        color,
        is_active: true,
      })
    );

    const { error: categoriesError } = await supabaseAdmin
      .from("product_categories")
      .insert(categoriesToInsert);

    if (categoriesError) {
      throw new Error(categoriesError.message);
    }

    return NextResponse.json({
      pharmacy,
      ownerUserId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de créer la pharmacie.",
      },
      {
        status: 400,
      }
    );
  }
}