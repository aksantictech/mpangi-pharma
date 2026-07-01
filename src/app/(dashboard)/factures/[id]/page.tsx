"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import InvoicePrintTicket from "@/components/invoices/InvoicePrintTicket";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Printer,
  Receipt,
  RefreshCcw,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import { getInvoiceById } from "@/services/invoices.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PaymentMethod, SaleItem, SaleWithItems } from "@/types/sale";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const invoiceId = String(params?.id ?? "");

  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [invoice, setInvoice] = useState<SaleWithItems | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setInvoice(null);
        return;
      }

      setPharmacy(currentPharmacy);

      const invoiceData = await getInvoiceById(invoiceId, currentPharmacy.id);
      setInvoice(invoiceData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger la facture."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!invoiceId) return;

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const subtotal = useMemo(() => {
    if (!invoice) return 0;

    return invoice.items.reduce((sum, item) => {
      return sum + getItemTotal(item);
    }, 0);
  }, [invoice]);

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement de la facture...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy || !invoice) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-red-100 bg-red-50 p-8">
          <h1 className="text-2xl font-black text-red-800">
            Facture introuvable
          </h1>

          <p className="mt-2 text-sm font-medium text-red-700">
            {errorMessage || "Impossible d’afficher cette facture."}
          </p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="no-print min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <Link
                  href="/factures"
                  className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour factures
                </Link>

                <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                  {pharmacy.name}
                </p>

                <h1 className="mt-2 text-3xl font-black text-slate-950">
                  Facture {invoice.invoice_number}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Consultation et impression du reçu de vente.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={loadData}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCcw className="h-5 w-5" />
                  Actualiser
                </button>

<button
  type="button"
  onClick={handlePrint}
  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white hover:bg-blue-800"
>
  <Printer className="h-5 w-5" />
  Imprimer ticket
</button>
              </div>
            </div>
          </header>

          {errorMessage && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InfoMetric
              title="Client"
              value={invoice.customer_name || "Client comptoir"}
              icon={<Building2 className="h-6 w-6" />}
            />

            <InfoMetric
              title="Paiement"
              value={formatPaymentMethod(invoice.payment_method)}
              icon={<Receipt className="h-6 w-6" />}
            />

            <InfoMetric
              title="Date"
              value={new Date(invoice.created_at).toLocaleString("fr-CD")}
              icon={<CalendarDays className="h-6 w-6" />}
            />
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Articles vendus
            </h2>

            <div className="mt-5 space-y-3 md:hidden">
              {invoice.items.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
                  Aucun article trouvé.
                </div>
              ) : (
                invoice.items.map((item) => (
                  <article
                    key={getItemKey(item)}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <h3 className="font-black text-slate-950">
                      {getItemName(item)}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {getItemDetails(item)}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <MobileInfo
                        label="Qté"
                        value={String(getItemQuantity(item))}
                      />

                      <MobileInfo
                        label="PU"
                        value={formatMoney(getItemUnitPrice(item), invoice.currency)}
                      />

                      <MobileInfo
                        label="Total"
                        value={formatMoney(getItemTotal(item), invoice.currency)}
                        strong
                      />
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-200 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Produit</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead>Qté</TableHead>
                      <TableHead>Prix unitaire</TableHead>
                      <TableHead>Total</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-sm font-semibold text-slate-500"
                        >
                          Aucun article trouvé.
                        </td>
                      </tr>
                    ) : (
                      invoice.items.map((item) => (
                        <tr key={getItemKey(item)}>
                          <td className="px-5 py-4 font-black text-slate-950">
                            {getItemName(item)}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {getItemDetails(item)}
                          </td>

                          <td className="px-5 py-4 text-sm font-black text-slate-950">
                            {getItemQuantity(item)}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatMoney(getItemUnitPrice(item), invoice.currency)}
                          </td>

                          <td className="px-5 py-4 font-black text-slate-950">
                            {formatMoney(getItemTotal(item), invoice.currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Résumé</h2>

            <div className="mt-5 space-y-3 rounded-3xl bg-slate-50 p-5">
              <AmountLine
                label="Sous-total"
                value={formatMoney(subtotal, invoice.currency)}
              />

             <AmountLine
  label="Remise"
  value={formatMoney(getInvoiceDiscount(invoice), invoice.currency)}
/>

              <AmountLine
                label="Total payé"
                value={formatMoney(Number(invoice.total_amount || 0), invoice.currency)}
                strong
              />
            </div>
          </section>
        </div>
      </main>

     <InvoicePrintTicket
  pharmacy={pharmacy}
  invoice={invoice}
  subtotal={subtotal}
/>

      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-ticket,
          .print-ticket * {
            visibility: visible !important;
          }

          .print-ticket {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            min-height: auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 4mm !important;
            font-family: Arial, sans-serif !important;
            font-size: 11px !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}


function InfoMetric({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function MobileInfo({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm ${
          strong ? "font-black text-slate-950" : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AmountLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        strong
          ? "border-t border-slate-200 pt-3 text-xl font-black text-slate-950"
          : "text-sm font-semibold text-slate-600"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function getItemRecord(item: SaleItem) {
  return item as unknown as Record<string, any>;
}

function getItemKey(item: SaleItem) {
  const row = getItemRecord(item);

  return String(row.id ?? row.product_id ?? row.productId ?? Math.random());
}

function getItemName(item: SaleItem) {
  const row = getItemRecord(item);

  return String(row.product_name ?? row.name ?? row.product?.name ?? "Produit");
}

function getItemDetails(item: SaleItem) {
  const row = getItemRecord(item);

  return [
    row.generic_name,
    row.dosage,
    row.form,
    row.unit,
    row.batch_number ? `Lot ${row.batch_number}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "-";
}

function getItemQuantity(item: SaleItem) {
  const row = getItemRecord(item);

  return Number(row.quantity ?? 0);
}

function getItemUnitPrice(item: SaleItem) {
  const row = getItemRecord(item);

  return Number(row.unit_price ?? row.selling_price ?? row.price ?? 0);
}

function getItemTotal(item: SaleItem) {
  const row = getItemRecord(item);

  const savedTotal = Number(row.total_price ?? row.line_total ?? 0);

  if (savedTotal > 0) return savedTotal;

  return getItemQuantity(item) * getItemUnitPrice(item);
}

function getInvoiceDiscount(invoice: SaleWithItems) {
  const row = invoice as unknown as Record<string, any>;

  return Number(
    row.discount_amount ??
      row.discount ??
      row.discount_value ??
      row.discountAmount ??
      0
  );
}

function formatPaymentMethod(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    cash_cdf: "Cash CDF",
    cash_usd: "Cash USD",
    mobile_money: "Mobile Money",
    card: "Carte",
    credit: "Crédit",
    mixed: "Mixte",
  };

  return labels[method] ?? method;
}

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString("fr-CD")} ${currency}`;
}