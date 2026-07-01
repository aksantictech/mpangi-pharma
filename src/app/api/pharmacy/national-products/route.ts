import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";

function getCleanParam(url: URL, name: string) {
  const value = url.searchParams.get(name)?.trim();

  return value && value !== "all" ? value : "";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pharmacyId = url.searchParams.get("pharmacyId");
    const search = getCleanParam(url, "search");
    const target = getCleanParam(url, "target");
    const category = getCleanParam(url, "category");
    const typeName = getCleanParam(url, "type");

    if (!pharmacyId) {
      throw new Error("La pharmacie est obligatoire.");
    }

    const { supabaseAdmin } = await requirePharmacyManager(pharmacyId);

    let query = supabaseAdmin
      .from("national_products")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(50);

    if (target) {
      query = query.eq("target", target);
    }

    if (category) {
      query = query.eq("category_name", category);
    }

    if (typeName) {
      query = query.eq("type_name", typeName);
    }

    if (search) {
      query = query.or(
        [
          `name.ilike.%${search}%`,
          `generic_name.ilike.%${search}%`,
          `category_name.ilike.%${search}%`,
          `type_name.ilike.%${search}%`,
          `dosage.ilike.%${search}%`,
          `form.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      products: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de rechercher dans le catalogue national.",
      },
      {
        status: 400,
      }
    );
  }
}