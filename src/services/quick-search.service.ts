import { createSupabaseClient } from "@/lib/supabase/client";

export type QuickProductResult = {
  id: string;
  name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
};

export type QuickInvoiceResult = {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  total_amount: number;
  currency: string | null;
};

export type QuickSearchResults = {
  products: QuickProductResult[];
  invoices: QuickInvoiceResult[];
};

// Retire les caractères qui ont un sens dans un filtre PostgREST `or(...)`
// (virgule, parenthèses) ou dans un motif ilike (% et *), sinon une saisie
// comme « vit,c » casserait la requête ou élargirait la recherche.
function sanitizeTerm(term: string) {
  return term
    .replace(/[,()%*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Recherche rapide de la palette Ctrl+K : produits et factures de la
 * pharmacie active. Chaque famille est facultative (droits du rôle) et une
 * erreur sur l'une ne masque pas l'autre.
 */
export async function quickSearch(params: {
  pharmacyId: string;
  term: string;
  products: boolean;
  invoices: boolean;
}): Promise<QuickSearchResults> {
  const term = sanitizeTerm(params.term);

  if (term.length < 2) return { products: [], invoices: [] };

  const supabase = createSupabaseClient();
  const pattern = `%${term}%`;

  const [products, invoices] = await Promise.all([
    params.products
      ? supabase
          .from("products")
          .select("id, name, generic_name, dosage, form")
          .eq("pharmacy_id", params.pharmacyId)
          .neq("status", "archived")
          .or(
            `name.ilike.${pattern},generic_name.ilike.${pattern},barcode.ilike.${pattern}`
          )
          .order("name", { ascending: true })
          .limit(6)
      : Promise.resolve({ data: [] }),
    params.invoices
      ? supabase
          .from("sales")
          .select("id, invoice_number, customer_name, total_amount, currency")
          .eq("pharmacy_id", params.pharmacyId)
          .or(`invoice_number.ilike.${pattern},customer_name.ilike.${pattern}`)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    products: (products.data ?? []) as QuickProductResult[],
    invoices: (invoices.data ?? []) as QuickInvoiceResult[],
  };
}
