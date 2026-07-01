import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";

function getCleanParam(url: URL, name: string) {
  const value = url.searchParams.get(name)?.trim();

  return value && value !== "all" ? value : "";
}

function getPositiveNumber(value: string | null, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) return fallback;

  return number;
}

function escapeFilterValue(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", " ");
}

export async function GET(request: Request) {
  try {
    const { supabaseAdmin } = await requirePlatformAdmin();

    const url = new URL(request.url);

    const search = getCleanParam(url, "search");
    const therapeuticClass = getCleanParam(url, "therapeuticClass");
    const pharmaceuticalForm = getCleanParam(url, "pharmaceuticalForm");
    const packaging = getCleanParam(url, "packaging");
    const target = getCleanParam(url, "target");
    const ammStatus = getCleanParam(url, "ammStatus");

    const page = getPositiveNumber(url.searchParams.get("page"), 1);
    const pageSize = Math.min(
      getPositiveNumber(url.searchParams.get("pageSize"), 100),
      500
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("national_products")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(from, to);

    if (therapeuticClass) {
      query = query.eq("therapeutic_class", therapeuticClass);
    }

    if (pharmaceuticalForm) {
      query = query.eq("pharmaceutical_form", pharmaceuticalForm);
    }

    if (packaging) {
      query = query.eq("packaging", packaging);
    }

    if (target) {
      query = query.eq("target", target);
    }

    if (ammStatus) {
      query = query.eq("amm_status", ammStatus);
    }

    if (search) {
      const value = escapeFilterValue(search);

      query = query.or(
        [
          `name.ilike.%${value}%`,
          `generic_name.ilike.%${value}%`,
          `dosage.ilike.%${value}%`,
          `therapeutic_class.ilike.%${value}%`,
          `pharmaceutical_form.ilike.%${value}%`,
          `packaging.ilike.%${value}%`,
          `amm_number.ilike.%${value}%`,
          `registration_number.ilike.%${value}%`,
          `manufacturer.ilike.%${value}%`,
          `country.ilike.%${value}%`,
        ].join(",")
      );
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      products: data ?? [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        from: total === 0 ? 0 : from + 1,
        to: Math.min(to + 1, total),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger le catalogue ACOREP 2026.",
      },
      { status: 400 }
    );
  }
}