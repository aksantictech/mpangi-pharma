"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Printer,
  Receipt,
  RefreshCcw,
} from "lucide-react";

import InvoicePrintTicket from "@/components/invoices/InvoicePrintTicket";
import { getInvoiceById } from "@/services/invoices.service";
import { getCurrentPharmacy } from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PaymentMethod, SaleItem, SaleWithItems } from "@/types/sale";

type InvoiceTotals = {
  subtotalBeforeDiscount: number;
  subtotalHt: number;
  vat5: number;
  vat16: number;
  vatTotal: number;
  totalTtc: number;
};

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const invoiceId = String(params?.id ?? "");

  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [invoice, setInvoice] = useState<SaleWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
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

      const invoiceData = await getInvoiceById(
        invoiceId,
        currentPharmacy.id
      );

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

    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  useEffect(() => {
    function handleAfterPrint() {
      setIsPreparingPrint(false);
    }

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const invoiceTotals = useMemo<InvoiceTotals>(() => {
    if (!invoice) {
      return {
        subtotalBeforeDiscount: 0,
        subtotalHt: 0,
        vat5: 0,
        vat16: 0,
        vatTotal: 0,
        totalTtc: 0,
      };
    }

    const invoiceRecord = asRecord(invoice);

    const vat5 = invoice.items
      .filter((item) => getItemVatRate(item) === 5)
      .reduce((sum, item) => sum + getItemVatAmount(item), 0);

    const vat16 = invoice.items
      .filter((item) => getItemVatRate(item) === 16)
      .reduce((sum, item) => sum + getItemVatAmount(item), 0);

    const calculatedSubtotalHt = invoice.items.reduce(
      (sum, item) => sum + getItemTotalHt(item),
      0
    );

    const calculatedVatTotal = invoice.items.reduce(
      (sum, item) => sum + getItemVatAmount(item),
      0
    );

    const subtotalHt =
      Number(invoiceRecord.subtotal_ht ?? 0) || calculatedSubtotalHt;

    const vatTotal =
      Number(invoiceRecord.vat_total ?? 0) || calculatedVatTotal;

    const totalTtc =
      Number(
        invoiceRecord.total_ttc ??
          invoiceRecord.total_amount ??
          0
      ) || subtotalHt + vatTotal;

    const subtotalBeforeDiscount =
      Number(invoiceRecord.subtotal ?? 0) || totalTtc;

    return {
      subtotalBeforeDiscount,
      subtotalHt,
      vat5,
      vat16,
      vatTotal,
      totalTtc,
    };
  }, [invoice]);

  function handlePrint() {
    if (isPreparingPrint) return;

    setIsPreparingPrint(true);

    window.setTimeout(() => {
      window.print();

      window.setTimeout(() => {
        setIsPreparingPrint(false);
      }, 3000);
    }, 300);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-5xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <p className="font-semibold text-slate-500">
            Chargement de la facture...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy || !invoice) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-5xl rounded-[1.5rem] border border-red-100 bg-red-50 p-5 md:rounded-[2rem] md:p-8">
          <h1 className="text-xl font-black text-red-800 md:text-2xl">
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

  const pharmacyLogoUrl = getPharmacyLogoUrl(pharmacy);

  return (
    <>
      <main className="no-print min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
          <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div className="flex items-start gap-4">
                {pharmacyLogoUrl && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white md:h-20 md:w-20">
                    <Image
                      src={pharmacyLogoUrl}
                      alt={`Logo ${pharmacy.name}`}
                      fill
                      sizes="80px"
                      className="object-contain p-1"
                      unoptimized
                    />
                  </div>
                )}

                <div>
                  <Link
                    href="/factures"
                    className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 md:mb-4"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour factures
                  </Link>

                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm">
                    {pharmacy.name}
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
                    Facture {invoice.invoice_number}
                  </h1>

                  <p className="mt-1 text-xs text-slate-500 md:mt-2 md:text-sm">
                    Consultation et impression du reçu de vente.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void loadData()}
                  disabled={isPreparingPrint}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className="h-5 w-5" />
                  Actualiser
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isPreparingPrint}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Printer
                    className={`h-5 w-5 ${
                      isPreparingPrint ? "animate-pulse" : ""
                    }`}
                  />
                  {isPreparingPrint ? "Préparation..." : "Imprimer ticket"}
                </button>
              </div>
            </div>
          </header>

          {errorMessage && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          )}

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <InfoMetric
              title="Client"
              value={invoice.customer_name || "Client comptoir"}
              icon={<Building2 className="h-5 w-5 md:h-6 md:w-6" />}
            />

            <InfoMetric
              title="Paiement"
              value={formatPaymentMethod(invoice.payment_method)}
              icon={<Receipt className="h-5 w-5 md:h-6 md:w-6" />}
            />

            <InfoMetric
              title="Date"
              value={new Date(invoice.created_at).toLocaleString("fr-CD")}
              icon={<CalendarDays className="h-5 w-5 md:h-6 md:w-6" />}
            />
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
            <h2 className="text-lg font-black text-slate-950 md:text-xl">
              Articles vendus
            </h2>

            <div className="mt-4 space-y-2 md:hidden">
              {invoice.items.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                  Aucun article trouvé.
                </div>
              ) : (
                invoice.items.map((item, index) => (
                  <article
                    key={`${getItemKey(item)}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <h3 className="line-clamp-2 text-sm font-black text-slate-950">
                      {getItemName(item)}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">
                      {getItemDetails(item)}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MobileInfo
                        label="Qté"
                        value={String(getItemQuantity(item))}
                      />

                      <MobileInfo
                        label="TVA"
                        value={`${getItemVatRate(item)} %`}
                      />

                      <MobileInfo
                        label="PU TTC"
                        value={formatMoney(
                          getItemUnitPriceTtc(item),
                          invoice.currency
                        )}
                      />

                      <MobileInfo
                        label="Total TTC"
                        value={formatMoney(
                          getItemTotalTtc(item),
                          invoice.currency
                        )}
                        strong
                      />
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-200 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Produit</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead>Qté</TableHead>
                      <TableHead>Prix HT</TableHead>
                      <TableHead>TVA</TableHead>
                      <TableHead>Prix TTC</TableHead>
                      <TableHead>Total TTC</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-8 text-center text-sm font-semibold text-slate-500"
                        >
                          Aucun article trouvé.
                        </td>
                      </tr>
                    ) : (
                      invoice.items.map((item, index) => (
                        <tr key={`${getItemKey(item)}-${index}`}>
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
                            {formatMoney(
                              getItemUnitPriceHt(item),
                              invoice.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-black text-amber-700">
                            {getItemVatRate(item)} %
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatMoney(
                              getItemUnitPriceTtc(item),
                              invoice.currency
                            )}
                          </td>

                          <td className="px-5 py-4 font-black text-slate-950">
                            {formatMoney(
                              getItemTotalTtc(item),
                              invoice.currency
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
            <h2 className="text-lg font-black text-slate-950 md:text-xl">
              Résumé fiscal
            </h2>

            <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 md:rounded-3xl md:p-5">
              <AmountLine
                label="Sous-total TTC avant remise"
                value={formatMoney(
                  invoiceTotals.subtotalBeforeDiscount,
                  invoice.currency
                )}
              />

              <AmountLine
                label="Remise"
                value={formatMoney(
                  getInvoiceDiscount(invoice),
                  invoice.currency
                )}
              />

              <AmountLine
                label="Sous-total HT"
                value={formatMoney(
                  invoiceTotals.subtotalHt,
                  invoice.currency
                )}
              />

              {invoiceTotals.vat5 > 0 && (
                <AmountLine
                  label="TVA 5 %"
                  value={formatMoney(
                    invoiceTotals.vat5,
                    invoice.currency
                  )}
                />
              )}

              {invoiceTotals.vat16 > 0 && (
                <AmountLine
                  label="TVA 16 %"
                  value={formatMoney(
                    invoiceTotals.vat16,
                    invoice.currency
                  )}
                />
              )}

              <AmountLine
                label="Total TVA"
                value={formatMoney(
                  invoiceTotals.vatTotal,
                  invoice.currency
                )}
              />

              <AmountLine
                label="Total TTC"
                value={formatMoney(
                  invoiceTotals.totalTtc,
                  invoice.currency
                )}
                strong
              />
            </div>
          </section>
        </div>
      </main>

      <InvoicePrintTicket
        pharmacy={pharmacy}
        invoice={invoice}
        subtotal={invoiceTotals.subtotalBeforeDiscount}
      />

      <style jsx global>{`
        @media print {
          @page {
            size: 80mm 297mm;
            margin: 0;
          }

          html,
          body {
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-ticket,
          .print-ticket * {
            visibility: visible !important;
          }

          .print-ticket {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 72mm !important;
            max-width: 72mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 2mm 3mm !important;
            margin: 0 !important;
            font-family: "Courier New", Courier, monospace !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1.25 !important;
          }

          .print-ticket img {
            max-width: 28mm !important;
            max-height: 18mm !important;
            object-fit: contain !important;
            filter: grayscale(1) contrast(2.2) !important;
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
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 md:mb-4 md:h-12 md:w-12">
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-500 md:text-sm">
        {title}
      </p>

      <p className="mt-1 text-sm font-black text-slate-950 md:mt-2 md:text-lg">
        {value}
      </p>
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
    <div className="rounded-xl bg-slate-50 p-2">
      <p className="text-[10px] font-bold text-slate-500">
        {label}
      </p>

      <p
        className={`mt-0.5 text-xs ${
          strong
            ? "font-black text-slate-950"
            : "font-semibold text-slate-700"
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
          ? "border-t border-slate-200 pt-3 text-lg font-black text-slate-950 md:text-xl"
          : "text-sm font-semibold text-slate-600"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function asRecord(value: unknown) {
  return value as Record<string, any>;
}

function getPharmacyLogoUrl(
  pharmacy: PharmacyWithRole
) {
  const row = asRecord(pharmacy);

  return String(
    row.logo_url ??
      row.logoUrl ??
      row.logo ??
      row.pharmacy_logo_url ??
      ""
  ).trim();
}

function getItemKey(item: SaleItem) {
  const row = asRecord(item);

  return String(
    row.id ??
      row.product_id ??
      row.productId ??
      row.product_name ??
      row.name ??
      "item"
  );
}

function getItemName(item: SaleItem) {
  const row = asRecord(item);

  return String(
    row.product_name ??
      row.name ??
      row.product?.name ??
      "Produit"
  );
}

function getItemDetails(item: SaleItem) {
  const row = asRecord(item);

  return (
    [
      row.generic_name,
      row.dosage,
      row.form,
      row.unit,
      row.batch_number
        ? `Lot ${row.batch_number}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "-"
  );
}

function getItemQuantity(item: SaleItem) {
  return Number(asRecord(item).quantity ?? 0);
}

function getItemVatRate(item: SaleItem) {
  return Number(asRecord(item).vat_rate ?? 0);
}

function getItemUnitPriceHt(item: SaleItem) {
  const row = asRecord(item);

  return Number(
    row.unit_price_ht ??
      row.unit_price ??
      row.selling_price ??
      row.price ??
      0
  );
}

function getItemUnitPriceTtc(item: SaleItem) {
  const row = asRecord(item);

  return Number(
    row.unit_price_ttc ??
      row.unit_price ??
      row.selling_price ??
      row.price ??
      0
  );
}

function getItemTotalHt(item: SaleItem) {
  const row = asRecord(item);
  const savedTotal = Number(row.line_total_ht ?? 0);

  if (savedTotal > 0) {
    return savedTotal;
  }

  return (
    getItemQuantity(item) *
    getItemUnitPriceHt(item)
  );
}

function getItemTotalTtc(item: SaleItem) {
  const row = asRecord(item);

  const savedTotal = Number(
    row.line_total_ttc ??
      row.total_price ??
      row.line_total ??
      0
  );

  if (savedTotal > 0) {
    return savedTotal;
  }

  return (
    getItemQuantity(item) *
    getItemUnitPriceTtc(item)
  );
}

function getItemVatAmount(item: SaleItem) {
  const row = asRecord(item);

  const savedVat = Number(
    row.line_total_vat ??
      row.vat_amount ??
      0
  );

  if (savedVat > 0) {
    return savedVat;
  }

  return Math.max(
    getItemTotalTtc(item) -
      getItemTotalHt(item),
    0
  );
}

function getInvoiceDiscount(
  invoice: SaleWithItems
) {
  const row = asRecord(invoice);

  return Number(
    row.discount_amount ??
      row.discount ??
      row.discount_value ??
      row.discountAmount ??
      0
  );
}

function formatPaymentMethod(
  method: PaymentMethod
) {
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

function formatMoney(
  value: number,
  currency: string
) {
  return `${Number(value || 0).toLocaleString(
    "fr-CD",
    {
      maximumFractionDigits: 2,
    }
  )} ${currency}`;
}
