import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";
import { assertSameOriginRead } from "@/lib/http/request-security";

function getCleanParam(url: URL, name: string) {
  const value = url.searchParams.get(name)?.trim();

  return value && value !== "all" ? value : "";
}

function escapeFilterValue(value: string) {
  // Voir api/admin/national-products : neutralise la syntaxe PostgREST `or=(...)`.
  return value
    .replace(/[,()*:\\]/g, " ")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function GET(request: Request) {
  try {
    assertSameOriginRead(request);

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
      const value = escapeFilterValue(search);

      if (value) {
        query = query.or(
          [
            `name.ilike.%${value}%`,
            `generic_name.ilike.%${value}%`,
            `category_name.ilike.%${value}%`,
            `type_name.ilike.%${value}%`,
            `dosage.ilike.%${value}%`,
            `form.ilike.%${value}%`,
          ].join(",")
        );
      }
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