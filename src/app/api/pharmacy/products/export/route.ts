import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";
import {
  assertSameOriginRead,
  getApiErrorStatus,
} from "@/lib/http/request-security";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

function buildFileName() {
  const today = new Date().toISOString().slice(0, 10);

  return `produits-mpangi-pharma-${today}.xlsx`;
}

export async function GET(request: Request) {
  try {
    assertSameOriginRead(request);

    const url = new URL(request.url);
    const pharmacyId = url.searchParams.get("pharmacyId");

    if (!pharmacyId) {
      throw new Error("La pharmacie est obligatoire.");
    }

    const { supabaseAdmin } = await requirePharmacyManager(pharmacyId);

    const { data: stockRows, error: stockError } = await supabaseAdmin
      .from("v_product_stock")
      .select("*")
      .eq("pharmacy_id", pharmacyId);

    if (!stockError) {
      return NextResponse.json(
        {
          products: stockRows ?? [],
          fileName: buildFileName(),
        },
        { headers: PRIVATE_HEADERS }
      );
    }

    const { data: productRows, error: productError } = await supabaseAdmin
      .from("products")
      .select(
        `
        *,
        category:product_categories(name),
        supplier:suppliers(name)
      `
      )
      .eq("pharmacy_id", pharmacyId);

    if (productError) {
      throw new Error(productError.message);
    }

    return NextResponse.json(
      {
        products: productRows ?? [],
        fileName: buildFileName(),
      },
      { headers: PRIVATE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible d’exporter les produits.",
      },
      {
        status: getApiErrorStatus(error, 400),
        headers: PRIVATE_HEADERS,
      }
    );
  }
}