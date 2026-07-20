import { createSupabaseClient } from "@/lib/supabase/client";

import type {
  VatRateSummary,
  VatReportLine,
  VatReportSummary,
} from "@/types/vat-report";

function toCdf(value: number, currency: string, exchangeRate: number) {
  if (currency === "USD") {
    return value * Number(exchangeRate || 0);
  }

  return value;
}

export async function getVatReport(
  pharmacyId: string,
  startDate: string,
  endDate: string
): Promise<{
  lines: VatReportLine[];
  summary: VatReportSummary;
}> {
  const supabase = createSupabaseClient();

  const startDateTime = `${startDate}T00:00:00.000Z`;
  const endDateTime = `${endDate}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from("v_vat_report_lines")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("status", "completed")
    .gte("created_at", startDateTime)
    .lte("created_at", endDateTime)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const lines = (data ?? []) as VatReportLine[];

  const rateMap = new Map<number, VatRateSummary>();

  for (const line of lines) {
    const rate = Number(line.vat_rate || 0);
    const exchangeRate = Number(line.exchange_rate || 0);
    const currency = line.currency || "CDF";

    const taxableBaseHt = toCdf(
      Number(line.taxable_base_ht || 0),
      currency,
      exchangeRate
    );

    const vatAmount = toCdf(
      Number(line.vat_amount || 0),
      currency,
      exchangeRate
    );

    const totalTtc = toCdf(
      Number(line.total_ttc || 0),
      currency,
      exchangeRate
    );

    const current = rateMap.get(rate) ?? {
      vatRate: rate,
      invoiceCount: 0,
      taxableBaseHt: 0,
      vatAmount: 0,
      totalTtc: 0,
    };

    current.invoiceCount += 1;
    current.taxableBaseHt += taxableBaseHt;
    current.vatAmount += vatAmount;
    current.totalTtc += totalTtc;

    rateMap.set(rate, current);
  }

  const byRate = Array.from(rateMap.values()).sort(
    (a, b) => a.vatRate - b.vatRate
  );

  const invoiceIds = new Set(lines.map((line) => line.sale_id));

  const summary: VatReportSummary = {
    totalInvoices: invoiceIds.size,
    totalTaxableBaseHt: byRate.reduce(
      (sum, item) => sum + item.taxableBaseHt,
      0
    ),
    totalVat: byRate.reduce(
      (sum, item) => sum + item.vatAmount,
      0
    ),
    totalTtc: byRate.reduce(
      (sum, item) => sum + item.totalTtc,
      0
    ),
    exemptBaseHt:
      byRate.find((item) => item.vatRate === 0)?.taxableBaseHt ?? 0,
    vat5BaseHt:
      byRate.find((item) => item.vatRate === 5)?.taxableBaseHt ?? 0,
    vat5Amount:
      byRate.find((item) => item.vatRate === 5)?.vatAmount ?? 0,
    vat16BaseHt:
      byRate.find((item) => item.vatRate === 16)?.taxableBaseHt ?? 0,
    vat16Amount:
      byRate.find((item) => item.vatRate === 16)?.vatAmount ?? 0,
    byRate,
  };

  return {
    lines,
    summary,
  };
}
