"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Eye,
  FileText,
  RefreshCcw,
  Search,
  WalletCards,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import { getInvoices } from "@/services/invoices.service";
import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PaymentMethod, Sale } from "@/types/sale";

export default function InvoicesPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [invoices, setInvoices] = useState<Sale[]>([]);

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setInvoices([]);
        return;
      }

      setPharmacy(currentPharmacy);

      const invoicesData = await getInvoices(currentPharmacy.id);
      setInvoices(invoicesData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les factures."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredInvoices = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) return invoices;

    return invoices.filter((invoice) => {
      const value = [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.payment_method,
        invoice.currency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return value.includes(normalized);
    });
  }, [invoices, search]);

  const totalAmount = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || 0),
    0
  );

  const totalMargin = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.gross_margin || 0),
    0
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement des factures...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-800">
            Aucune pharmacie trouvée
          </h1>
          <p className="mt-2 text-sm font-medium text-amber-700">
            Créez une pharmacie avant de consulter les factures.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                {pharmacy.name}
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Factures
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Liste des factures générées après les ventes.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Factures"
            value={invoices.length.toString()}
            icon={<FileText className="h-6 w-6" />}
          />

          <MetricCard
            title="Total vendu"
            value={`${totalAmount.toLocaleString("fr-CD")} CDF`}
            icon={<WalletCards className="h-6 w-6" />}
          />

          <MetricCard
            title="Marge brute"
            value={`${totalMargin.toLocaleString("fr-CD")} CDF`}
            icon={<CalendarDays className="h-6 w-6" />}
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Historique des factures
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Rechercher par numéro de facture, client ou mode de paiement.
              </p>
            </div>

            <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-96">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une facture..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Marge</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Aucune facture trouvée.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">
                            {invoice.invoice_number}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {invoice.status}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {invoice.customer_name || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {formatPaymentMethod(invoice.payment_method)}
                        </td>

                        <td className="px-5 py-4 font-black text-slate-950">
                          {Number(invoice.total_amount).toLocaleString(
                            "fr-CD"
                          )}{" "}
                          {invoice.currency}
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-700">
                          {Number(invoice.gross_margin).toLocaleString(
                            "fr-CD"
                          )}{" "}
                          {invoice.currency}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {new Date(invoice.created_at).toLocaleString("fr-CD")}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/factures/${invoice.id}`}
                            className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
                          >
                            <Eye className="h-4 w-4" />
                            Voir
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
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
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
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