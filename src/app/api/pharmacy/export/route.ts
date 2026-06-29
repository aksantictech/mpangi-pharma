import { NextResponse } from "next/server";

import { requirePharmacyManager } from "@/lib/auth/require-pharmacy-manager";

type ExportRequestBody = {
  pharmacyId: string;
};

async function getTableData(
  supabaseAdmin: Awaited<ReturnType<typeof requirePharmacyManager>>["supabaseAdmin"],
  table: string,
  pharmacyId: string
) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("pharmacy_id", pharmacyId);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data ?? [];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportRequestBody;

    if (!body.pharmacyId) {
      throw new Error("La pharmacie est obligatoire.");
    }

    const { supabaseAdmin, user, isPlatformAdmin, role } =
      await requirePharmacyManager(body.pharmacyId);

    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from("pharmacies")
      .select("*")
      .eq("id", body.pharmacyId)
      .single();

    if (pharmacyError) {
      throw new Error(pharmacyError.message);
    }

    const [
      settings,
      members,
      categories,
      suppliers,
      products,
      batches,
      stockMovements,
      customers,
      sales,
      expenses,
      auditLogs,
    ] = await Promise.all([
      getTableData(supabaseAdmin, "pharmacy_settings", body.pharmacyId),
      getTableData(supabaseAdmin, "pharmacy_members", body.pharmacyId),
      getTableData(supabaseAdmin, "product_categories", body.pharmacyId),
      getTableData(supabaseAdmin, "suppliers", body.pharmacyId),
      getTableData(supabaseAdmin, "products", body.pharmacyId),
      getTableData(supabaseAdmin, "product_batches", body.pharmacyId),
      getTableData(supabaseAdmin, "stock_movements", body.pharmacyId),
      getTableData(supabaseAdmin, "customers", body.pharmacyId),
      getTableData(supabaseAdmin, "sales", body.pharmacyId),
      getTableData(supabaseAdmin, "expenses", body.pharmacyId),
      getTableData(supabaseAdmin, "audit_logs", body.pharmacyId),
    ]);

    const saleIds = sales.map((sale) => sale.id);

    let saleItems: unknown[] = [];

    if (saleIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("sale_items")
        .select("*")
        .in("sale_id", saleIds);

      if (error) {
        throw new Error(`sale_items: ${error.message}`);
      }

      saleItems = data ?? [];
    }

    const exportedAt = new Date().toISOString();

    return NextResponse.json({
      exportedAt,
      exportedBy: {
        userId: user.id,
        email: user.email ?? null,
        role,
        isPlatformAdmin,
      },
      pharmacy,
      data: {
        settings,
        members,
        categories,
        suppliers,
        products,
        batches,
        stockMovements,
        customers,
        sales,
        saleItems,
        expenses,
        auditLogs,
      },
      metadata: {
        version: "1.0",
        app: "Mpangi_Pharma",
        format: "json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible d’exporter les données.",
      },
      {
        status: 400,
      }
    );
  }
}