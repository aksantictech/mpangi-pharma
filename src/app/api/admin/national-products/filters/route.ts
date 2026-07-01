import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";

function uniqueSorted(values: Array<string | null>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

export async function GET() {
  try {
    const { supabaseAdmin } = await requirePlatformAdmin();

    const { data, error } = await supabaseAdmin
      .from("national_products")
      .select(
        "therapeutic_class, pharmaceutical_form, packaging, target, amm_status"
      )
      .eq("is_active", true)
      .limit(10000);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      therapeuticClasses: uniqueSorted(
        (data ?? []).map((item) => item.therapeutic_class)
      ),
      pharmaceuticalForms: uniqueSorted(
        (data ?? []).map((item) => item.pharmaceutical_form)
      ),
      packagings: uniqueSorted((data ?? []).map((item) => item.packaging)),
      targets: uniqueSorted((data ?? []).map((item) => item.target)),
      ammStatuses: uniqueSorted((data ?? []).map((item) => item.amm_status)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les filtres ACOREP.",
      },
      { status: 400 }
    );
  }
}