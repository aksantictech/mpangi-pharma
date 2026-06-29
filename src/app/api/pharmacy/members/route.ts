import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";

type CreateMemberBody = {
  pharmacyId: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: "manager" | "pharmacist" | "cashier" | "stock_manager" | "accountant";
};

const allowedRoles = [
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

async function findUserByEmail(supabaseAdmin: any, email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.users.find(
    (user: { email?: string }) =>
      user.email?.toLowerCase() === email.toLowerCase()
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateMemberBody;

    if (!body.pharmacyId) {
      throw new Error("La pharmacie est obligatoire.");
    }

    if (!body.fullName?.trim()) {
      throw new Error("Le nom complet est obligatoire.");
    }

    if (!body.email?.trim()) {
      throw new Error("L’email est obligatoire.");
    }

    if (!body.password?.trim()) {
      throw new Error("Le mot de passe est obligatoire.");
    }

    if (body.password.length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    }

    if (!allowedRoles.includes(body.role)) {
      throw new Error("Rôle invalide.");
    }

    const { supabaseAdmin } = await requirePharmacyManager(body.pharmacyId);

    const existingUser = await findUserByEmail(
      supabaseAdmin,
      body.email.trim()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: body.password,
          email_confirm: true,
user_metadata: {
  full_name: body.fullName.trim(),
  phone: emptyToNull(body.phone),
  must_change_password: true,
},
        });

      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { data: createdUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: body.email.trim(),
          password: body.password,
          email_confirm: true,
          user_metadata: {
            full_name: body.fullName.trim(),
            phone: emptyToNull(body.phone),
          },
        });

      if (createError) {
        throw new Error(createError.message);
      }

      if (!createdUser.user) {
        throw new Error("Utilisateur non créé.");
      }

      userId = createdUser.user.id;
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
    id: userId,
    full_name: body.fullName.trim(),
    email: body.email.trim(),
    phone: emptyToNull(body.phone),
    must_change_password: true,
    updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from("pharmacy_members")
      .upsert(
        {
          pharmacy_id: body.pharmacyId,
          user_id: userId,
          role: body.role,
          is_active: true,
        },
        {
          onConflict: "pharmacy_id,user_id",
        }
      )
      .select("*")
      .single();

    if (memberError) {
      throw new Error(memberError.message);
    }

    return NextResponse.json({
      member,
      userId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible d’ajouter l’utilisateur.",
      },
      {
        status: 400,
      }
    );
  }
}