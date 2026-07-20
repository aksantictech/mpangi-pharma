"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Printer,
  RefreshCcw,
  ReceiptText,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import { getVatReport } from "@/services/vat-report.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type {
  VatReportLine,
  VatReportSummary,
} from "@/types/vat-report";

const PAGE_SIZE = 50;

const emptySummary: VatReportSummary = {
  totalInvoices: 0,
  totalTaxableBaseHt: 0,
  totalVat: 0,
  totalTtc: 0,
  exemptBaseHt: 0,
  vat5BaseHt: 0,
  vat5Amount: 0,
  vat16BaseHt: 0,
  vat16Amount: 0,
  byRate: [],
};

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function VatReportPage() {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [lines, setLines] = useState<VatReportLine[]>([]);
  const [summary, setSummary] =
    useState<VatReportSummary>(emptySummary);

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setLines([]);
        setSummary(emptySummary);
        return;
      }

      setPharmacy(currentPharmacy);

      const report = await getVatReport(
        currentPharmacy.id,
        startDate,
        endDate
      );

      setLines(report.lines);
      setSummary(report.summary);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le rapport TVA."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  useEffect(() => {
    function handleAfterPrint() {
      setIsPrinting(false);
    }

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(lines.length / PAGE_SIZE)
  );

  const safePage = Math.min(page, totalPages);

  const paginatedLines = lines.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handlePrint() {
    if (isPrinting) return;

    setIsPrinting(true);

    window.setTimeout(() => {
      window.print();
    }, 250);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement du rapport TVA...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-800">
            Aucune pharmacie trouvée
          </h1>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="no-print min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
          <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <Link
                  href="/finances"
                  className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour aux finances
                </Link>

                <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                  {pharmacy.name}
                </p>

                <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                  Rapport TVA
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Synthèse de la base taxable et de la TVA collectée.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[150px_150px_auto_auto]">
                <label>
                  <span className="mb-1 block text-xs font-black uppercase text-slate-400">
                    Début
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="form-input"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs font-black uppercase text-slate-400">
                    Fin
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="form-input"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 xl:self-end"
                >
                  <RefreshCcw className="h-5 w-5" />
                  Actualiser
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white xl:self-end"
                >
                  <Printer className="h-5 w-5" />
                  {isPrinting ? "Préparation..." : "Imprimer / PDF"}
                </button>
              </div>
            </div>
          </header>

          {errorMessage && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard
              label="Factures"
              value={summary.totalInvoices.toString()}
              icon={<FileText className="h-5 w-5" />}
            />

            <MetricCard
              label="Base HT"
              value={formatMoney(summary.totalTaxableBaseHt)}
              icon={<ReceiptText className="h-5 w-5" />}
            />

            <MetricCard
              label="TVA collectée"
              value={formatMoney(summary.totalVat)}
              icon={<CalendarDays className="h-5 w-5" />}
            />

            <MetricCard
              label="Total TTC"
              value={formatMoney(summary.totalTtc)}
              icon={<Printer className="h-5 w-5" />}
            />
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <RateCard
              title="Exonéré / 0 %"
              base={summary.exemptBaseHt}
              vat={0}
            />

            <RateCard
              title="TVA 5 %"
              base={summary.vat5BaseHt}
              vat={summary.vat5Amount}
            />

            <RateCard
              title="TVA 16 %"
              base={summary.vat16BaseHt}
              vat={summary.vat16Amount}
            />
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 md:text-xl">
                  Détail des factures
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Du {formatDate(startDate)} au {formatDate(endDate)}.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Date</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Taux</TableHead>
                      <TableHead>Base HT</TableHead>
                      <TableHead>TVA</TableHead>
                      <TableHead>Total TTC</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedLines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          Aucune TVA enregistrée sur cette période.
                        </td>
                      </tr>
                    ) : (
                      paginatedLines.map((line) => (
                        <tr key={`${line.sale_id}-${line.vat_rate}`}>
                          <td className="px-5 py-4 text-sm text-slate-500">
                            {new Date(line.created_at).toLocaleString("fr-CD")}
                          </td>

                          <td className="px-5 py-4 font-black text-slate-950">
                            <Link
                              href={`/factures/${line.sale_id}`}
                              className="text-blue-700 hover:underline"
                            >
                              {line.invoice_number}
                            </Link>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {line.customer_name || "Comptoir"}
                          </td>

                          <td className="px-5 py-4 font-black text-amber-700">
                            {Number(line.vat_rate || 0)} %
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-700">
                            {formatMoney(
                              convertToCdf(
                                Number(line.taxable_base_ht || 0),
                                line.currency,
                                Number(line.exchange_rate || 0)
                              )
                            )}
                          </td>

                          <td className="px-5 py-4 font-black text-blue-700">
                            {formatMoney(
                              convertToCdf(
                                Number(line.vat_amount || 0),
                                line.currency,
                                Number(line.exchange_rate || 0)
                              )
                            )}
                          </td>

                          <td className="px-5 py-4 font-black text-slate-950">
                            {formatMoney(
                              convertToCdf(
                                Number(line.total_ttc || 0),
                                line.currency,
                                Number(line.exchange_rate || 0)
                              )
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={lines.length}
              onPrevious={() => setPage((value) => Math.max(1, value - 1))}
              onNext={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            />
          </section>
        </div>
      </main>

      <section className="vat-print-report hidden print:block">
        <div className="mb-6 border-b border-slate-900 pb-4 text-center">
          <h1 className="text-2xl font-black">{pharmacy.name}</h1>
          <h2 className="mt-2 text-xl font-black">Rapport TVA</h2>
          <p className="mt-1 text-sm">
            Période : {formatDate(startDate)} au {formatDate(endDate)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PrintMetric label="Base totale HT" value={formatMoney(summary.totalTaxableBaseHt)} />
          <PrintMetric label="TVA collectée" value={formatMoney(summary.totalVat)} />
          <PrintMetric label="Total TTC" value={formatMoney(summary.totalTtc)} />
          <PrintMetric label="Nombre de factures" value={summary.totalInvoices.toString()} />
          <PrintMetric label="Base TVA 5 %" value={formatMoney(summary.vat5BaseHt)} />
          <PrintMetric label="TVA 5 %" value={formatMoney(summary.vat5Amount)} />
          <PrintMetric label="Base TVA 16 %" value={formatMoney(summary.vat16BaseHt)} />
          <PrintMetric label="TVA 16 %" value={formatMoney(summary.vat16Amount)} />
        </div>

        <table className="mt-6 w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Facture</th>
              <th className="border p-2 text-right">Taux</th>
              <th className="border p-2 text-right">Base HT</th>
              <th className="border p-2 text-right">TVA</th>
              <th className="border p-2 text-right">TTC</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={`print-${line.sale_id}-${line.vat_rate}`}>
                <td className="border p-2">
                  {new Date(line.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="border p-2">{line.invoice_number}</td>
                <td className="border p-2 text-right">{line.vat_rate} %</td>
                <td className="border p-2 text-right">
                  {formatMoney(Number(line.taxable_base_ht || 0))}
                </td>
                <td className="border p-2 text-right">
                  {formatMoney(Number(line.vat_amount || 0))}
                </td>
                <td className="border p-2 text-right">
                  {formatMoney(Number(line.total_ttc || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-8 text-right text-xs">
          Imprimé le {new Date().toLocaleString("fr-CD")}
        </p>
      </section>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          body * {
            visibility: hidden !important;
          }

          .vat-print-report,
          .vat-print-report * {
            visibility: visible !important;
          }

          .vat-print-report {
            display: block !important;
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            color: black !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-500 md:text-sm">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950 md:text-2xl">
        {value}
      </p>
    </div>
  );
}

function RateCard({
  title,
  base,
  vat,
}: {
  title: string;
  base: number;
  vat: number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm text-slate-500">Base HT</p>
      <p className="mt-1 text-xl font-black text-slate-950">
        {formatMoney(base)}
      </p>
      <p className="mt-3 text-sm text-slate-500">TVA collectée</p>
      <p className="mt-1 text-lg font-black text-blue-700">
        {formatMoney(vat)}
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={page <= 1}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <p className="text-sm font-black text-slate-900">
        Page {page}/{totalPages} · {totalItems} ligne(s)
      </p>

      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
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

function PrintMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-slate-900 p-3">
      <p className="text-xs">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("fr-CD", {
    maximumFractionDigits: 2,
  })} CDF`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function convertToCdf(
  value: number,
  currency: string,
  exchangeRate: number
) {
  return currency === "USD"
    ? value * exchangeRate
    : value;
}
