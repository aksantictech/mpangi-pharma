import { createSupabaseClient } from "@/lib/supabase/client";

export type SalesDay = {
  /** Date locale au format YYYY-MM-DD. */
  date: string;
  total: number;
  count: number;
};

export type SalesTrend = {
  /** Du plus ancien au plus récent ; le dernier élément est aujourd'hui. */
  days: SalesDay[];
  today: SalesDay;
  yesterday: SalesDay;
};

export type SetupProgress = {
  pharmacyInfo: boolean;
  supplier: boolean;
  product: boolean;
  stock: boolean;
  pricing: boolean;
  firstSale: boolean;
};

function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Chiffre d'affaires et nombre de ventes par jour (jours calendaires du
 * terminal, pas UTC, pour que « aujourd'hui » corresponde à la journée de
 * travail de la pharmacie).
 */
export async function getSalesTrend(
  pharmacyId: string,
  days = 7
): Promise<SalesTrend> {
  const supabase = createSupabaseClient();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("sales")
    .select("total_amount, created_at")
    .eq("pharmacy_id", pharmacyId)
    .eq("status", "completed")
    .gte("created_at", start.toISOString())
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  const buckets = new Map<string, SalesDay>();

  for (let index = 0; index < days; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);

    const key = localDateKey(day);
    buckets.set(key, { date: key, total: 0, count: 0 });
  }

  for (const sale of data ?? []) {
    const bucket = buckets.get(localDateKey(new Date(sale.created_at)));

    if (!bucket) continue;

    bucket.total += Number(sale.total_amount || 0);
    bucket.count += 1;
  }

  const list = Array.from(buckets.values());

  return {
    days: list,
    today: list[list.length - 1],
    yesterday: list[list.length - 2] ?? { date: "", total: 0, count: 0 },
  };
}

async function hasRows(
  table: "suppliers" | "sales",
  pharmacyId: string
): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("pharmacy_id", pharmacyId);

  if (error) return false;

  return (count ?? 0) > 0;
}

/**
 * État des étapes de mise en route d'une pharmacie. Les produits et le stock
 * sont fournis par l'appelant (déjà chargés pour le tableau de bord). Chaque
 * lecture échoue en douceur : une étape illisible reste simplement « à faire ».
 */
export async function getSetupProgress(params: {
  pharmacyId: string;
  hasAddress: boolean;
  productCount: number;
  totalQuantity: number;
}): Promise<SetupProgress> {
  const supabase = createSupabaseClient();

  const [supplier, firstSale, settings] = await Promise.all([
    hasRows("suppliers", params.pharmacyId),
    hasRows("sales", params.pharmacyId),
    supabase
      .from("pharmacy_settings")
      .select("default_price_coefficient")
      .eq("pharmacy_id", params.pharmacyId)
      .maybeSingle(),
  ]);

  return {
    pharmacyInfo: params.hasAddress,
    supplier,
    product: params.productCount > 0,
    stock: params.totalQuantity > 0,
    pricing: Number(settings.data?.default_price_coefficient || 0) > 0,
    firstSale,
  };
}
