"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Download,
  Printer,
  Receipt,
  UserRound,
} from "lucide-react";

import AppLogo from "@/components/branding/AppLogo";
import { getCurrentPharmacy } from "@/services/pharmacies.service";
import { getInvoiceById } from "@/services/invoices.service";
import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PaymentMethod, SaleWithItems } from "@/types/sale";

type InvoiceDetailPageProps = {
  params: Promise<{
    saleId: string;
  }>;
};

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const [saleId, setSaleId] = useState("");
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [invoice, setInvoice] = useState<SaleWithItems | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params;
      setSaleId(resolvedParams.saleId);
    }

    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!saleId) return;

    async function loadInvoice() {
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

        const invoiceData = await getInvoiceById(saleId, currentPharmacy.id);
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

    loadInvoice();
  }, [saleId]);

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement de la facture...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage || !pharmacy || !invoice) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-red-100 bg-red-50 p-8">
          <h1 className="text-2xl font-black text-red-800">
            Facture introuvable
          </h1>
          <p className="mt-2 text-sm font-medium text-red-700">
            {errorMessage || "Impossible d’afficher cette facture."}
          </p>

          <Link
            href="/factures"
            className="mt-5 inline-flex rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white"
          >
            Retour aux factures
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="no-print flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <Link
            href="/factures"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-5 w-5" />
              Imprimer
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
            >
              <Download className="h-5 w-5" />
              PDF
            </button>
          </div>
        </div>

        <section className="invoice-a4 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none">
          <header className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start">
            <div className="flex items-start gap-4">
              {pharmacy.logo_url ? (
                <img
                  src={pharmacy.logo_url}
                  alt={pharmacy.name}
                  className="h-20 w-20 rounded-3xl border border-slate-200 object-contain"
                />
              ) : (
                <div className="no-print">
                  <AppLogo compact />
                </div>
              )}

              <div>
                <h1 className="text-3xl font-black text-slate-950">
                  {pharmacy.name}
                </h1>

                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p>
                    {[pharmacy.address, pharmacy.city, pharmacy.province]
                      .filter(Boolean)
                      .join(", ") || "Adresse non renseignée"}
                  </p>
                  <p>{pharmacy.phone || "Téléphone non renseigné"}</p>
                  <p>{pharmacy.email || "Email non renseigné"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-blue-50 p-5 text-right">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                Facture
              </p>
              <p className="mt-2 text-xl font-black text-slate-950">
                {invoice.invoice_number}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {new Date(invoice.created_at).toLocaleString("fr-CD")}
              </p>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-4 border-b border-slate-200 py-6 md:grid-cols-3">
            <InfoBox
              icon={<UserRound className="h-5 w-5" />}
              label="Client"
              value={invoice.customer_name || "Client comptoir"}
            />

            <InfoBox
              icon={<Receipt className="h-5 w-5" />}
              label="Paiement"
              value={formatPaymentMethod(invoice.payment_method)}
            />

            <InfoBox
              icon={<Building2 className="h-5 w-5" />}
              label="Pharmacien"
              value={pharmacy.pharmacist_name || "Non renseigné"}
            />
          </section>

          <section className="py-6">
            <div className="overflow-hidden rounded-3xl border border-slate-200 print:rounded-none">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Produit</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Exp.</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>PU</TableHead>
                    <TableHead>Total</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-950">
                          {item.product_name}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.batch_number || "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.expiry_date || "-"}
                      </td>

                      <td className="px-4 py-4 font-black text-slate-950">
                        {Number(item.quantity)}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {Number(item.unit_price).toLocaleString("fr-CD")}{" "}
                        {invoice.currency}
                      </td>

                      <td className="px-4 py-4 font-black text-slate-950">
                        {Number(item.total_price).toLocaleString("fr-CD")}{" "}
                        {invoice.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex justify-end">
            <div className="w-full max-w-sm rounded-3xl bg-slate-50 p-5">
              <SummaryLine
                label="Sous-total"
                value={`${Number(invoice.subtotal).toLocaleString(
                  "fr-CD"
                )} ${invoice.currency}`}
              />

              <SummaryLine
                label="Remise"
                value={`${Number(invoice.discount).toLocaleString(
                  "fr-CD"
                )} ${invoice.currency}`}
              />

              <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-xl font-black text-slate-950">
                <span>Total</span>
                <span>
                  {Number(invoice.total_amount).toLocaleString("fr-CD")}{" "}
                  {invoice.currency}
                </span>
              </div>
            </div>
          </section>

          <footer className="mt-10 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm font-semibold text-slate-600">
              {pharmacy.invoice_footer || "Merci pour votre confiance."}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Propulsé par Aksantic Technology © 2026
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-blue-700">{icon}</div>
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm text-slate-600">
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
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