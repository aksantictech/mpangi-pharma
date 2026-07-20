"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Printer,
  RefreshCcw,
  Search,
  WalletCards,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import { getInvoices } from "@/services/invoices.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PaymentMethod, Sale } from "@/types/sale";

const MOBILE_PAGE_SIZE = 5;
const DESKTOP_PAGE_SIZE = 50;

export default function InvoicesPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [invoices, setInvoices] = useState<Sale[]>([]);

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodPreset, setPeriodPreset] = useState<"all" | "today" | "week" | "month" | "custom">("month");
  const monthRange = getCurrentMonthRange();
  const [startDate, setStartDate] = useState(monthRange.startDate);
  const [endDate, setEndDate] = useState(monthRange.endDate);
  const [mobilePage, setMobilePage] = useState(1);
  const [desktopPage, setDesktopPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

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

  useEffect(() => {
    setMobilePage(1);
    setDesktopPage(1);
  }, [search, paymentFilter, statusFilter, startDate, endDate]);

  const filteredInvoices = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.created_at).toISOString().slice(0, 10);
      const matchesDate =
        periodPreset === "all" ||
        (invoiceDate >= startDate && invoiceDate <= endDate);

      const matchesPayment =
        paymentFilter === "all" || invoice.payment_method === paymentFilter;

      const matchesStatus =
        statusFilter === "all" || invoice.status === statusFilter;

      const value = [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.payment_method,
        invoice.currency,
        invoice.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalized || value.includes(normalized);

      return matchesDate && matchesPayment && matchesStatus && matchesSearch;
    });
  }, [
    invoices,
    search,
    paymentFilter,
    statusFilter,
    startDate,
    endDate,
    periodPreset,
  ]);

  const mobileTotalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / MOBILE_PAGE_SIZE)
  );

  const safeMobilePage = Math.min(mobilePage, mobileTotalPages);

  const mobileInvoices = filteredInvoices.slice(
    (safeMobilePage - 1) * MOBILE_PAGE_SIZE,
    safeMobilePage * MOBILE_PAGE_SIZE
  );

  const desktopTotalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / DESKTOP_PAGE_SIZE)
  );

  const safeDesktopPage = Math.min(desktopPage, desktopTotalPages);

  const desktopInvoices = filteredInvoices.slice(
    (safeDesktopPage - 1) * DESKTOP_PAGE_SIZE,
    safeDesktopPage * DESKTOP_PAGE_SIZE
  );

  const filteredTotalAmount = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || 0),
    0
  );

  const filteredTotalMargin = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.gross_margin || 0),
    0
  );

  function applyPeriod(preset: "all" | "today" | "week" | "month" | "custom") {
    setPeriodPreset(preset);

    if (preset === "all" || preset === "custom") return;

    const range =
      preset === "today"
        ? { startDate: today(), endDate: today() }
        : preset === "week"
          ? getCurrentWeekRange()
          : getCurrentMonthRange();

    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function handlePrint() {
    setIsPrinting(true);
    window.setTimeout(() => window.print(), 200);
  }

  useEffect(() => {
    if (mobilePage > mobileTotalPages) {
      setMobilePage(mobileTotalPages);
    }
  }, [mobilePage, mobileTotalPages]);

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
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <p className="font-semibold text-slate-500">
            Chargement des factures...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 md:rounded-[2rem] md:p-8">
          <h1 className="text-xl font-black text-amber-800 md:text-2xl">
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
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm">
                {pharmacy.name}
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
                Factures
              </h1>

              <p className="mt-1 text-xs text-slate-500 md:mt-2 md:text-sm">
                Liste des factures générées après les ventes.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
              >
                <Printer className="h-5 w-5" />
                {isPrinting ? "Préparation..." : "Imprimer / PDF"}
              </button>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Factures"
            value={invoices.length.toString()}
            icon={<FileText className="h-5 w-5 md:h-6 md:w-6" />}
          />

          <MetricCard
            title="Total vendu"
            value={`${totalAmount.toLocaleString("fr-CD")} CDF`}
            icon={<WalletCards className="h-5 w-5 md:h-6 md:w-6" />}
          />

          <MetricCard
            title="Marge brute"
            value={`${totalMargin.toLocaleString("fr-CD")} CDF`}
            icon={<CalendarDays className="h-5 w-5 md:h-6 md:w-6" />}
          />
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-950 md:text-xl">
                Historique des factures
              </h2>

              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Recherche par numéro, client, paiement ou statut.
              </p>
            </div>

            <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:w-96">
              <Search className="h-5 w-5 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une facture..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-6">
            <select value={periodPreset} onChange={(event) => applyPeriod(event.target.value as "all" | "today" | "week" | "month" | "custom")} className="form-input bg-white">
              <option value="all">Toutes les périodes</option>
              <option value="today">Aujourd’hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="custom">Personnalisée</option>
            </select>

            <input type="date" value={startDate} onChange={(event) => { setPeriodPreset("custom"); setStartDate(event.target.value); }} className="form-input bg-white" />
            <input type="date" value={endDate} onChange={(event) => { setPeriodPreset("custom"); setEndDate(event.target.value); }} className="form-input bg-white" />

            <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="form-input bg-white">
              <option value="all">Tous les paiements</option>
              <option value="cash_cdf">Cash CDF</option>
              <option value="cash_usd">Cash USD</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Carte</option>
              <option value="credit">Crédit</option>
              <option value="mixed">Mixte</option>
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="form-input bg-white">
              <option value="all">Tous les statuts</option>
              <option value="completed">Validées</option>
              <option value="pending">En attente</option>
              <option value="cancelled">Annulées</option>
            </select>

            <button type="button" onClick={() => { setSearch(""); setPaymentFilter("all"); setStatusFilter("all"); applyPeriod("month"); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
              Réinitialiser
            </button>
          </div>

          <div className="space-y-2 xl:hidden">
            <MobilePagination
              page={safeMobilePage}
              totalPages={mobileTotalPages}
              totalItems={filteredInvoices.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() => setMobilePage((page) => Math.max(1, page - 1))}
              onNext={() =>
                setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
              }
            />

            {filteredInvoices.length === 0 ? (
              <EmptyState message="Aucune facture trouvée." />
            ) : (
              mobileInvoices.map((invoice) => (
                <MobileInvoiceCard key={invoice.id} invoice={invoice} />
              ))
            )}

            <MobilePagination
              page={safeMobilePage}
              totalPages={mobileTotalPages}
              totalItems={filteredInvoices.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() => setMobilePage((page) => Math.max(1, page - 1))}
              onNext={() =>
                setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
              }
            />
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
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
                    desktopInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">
                            {invoice.invoice_number}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatStatus(invoice.status)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {invoice.customer_name || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {formatPaymentMethod(invoice.payment_method)}
                        </td>

                        <td className="px-5 py-4 font-black text-slate-950">
                          {formatMoney(
                            Number(invoice.total_amount || 0),
                            invoice.currency
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-700">
                          {formatMoney(
                            Number(invoice.gross_margin || 0),
                            invoice.currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {new Date(invoice.created_at).toLocaleString("fr-CD")}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/factures/${invoice.id}`}
                            className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
                          >
                            <Printer className="h-4 w-4" />
                            Voir / Imprimer
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 hidden xl:block">
            <MobilePagination
              page={safeDesktopPage}
              totalPages={desktopTotalPages}
              totalItems={filteredInvoices.length}
              pageSize={DESKTOP_PAGE_SIZE}
              onPrevious={() => setDesktopPage((page) => Math.max(1, page - 1))}
              onNext={() => setDesktopPage((page) => Math.min(desktopTotalPages, page + 1))}
            />
          </div>
        </section>
      </div>

      <section className="invoice-history-print hidden print:block">
        <div className="border-b border-black pb-4 text-center">
          <h1 className="text-2xl font-black">{pharmacy.name}</h1>
          <h2 className="mt-1 text-xl font-black">Historique des factures</h2>
          <p className="mt-1 text-sm">Période : {periodPreset === "all" ? "Toutes" : `${formatDate(startDate)} au ${formatDate(endDate)}`}</p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <PrintMetric label="Factures" value={filteredInvoices.length.toString()} />
          <PrintMetric label="Total vendu" value={`${filteredTotalAmount.toLocaleString("fr-CD")} CDF`} />
          <PrintMetric label="Marge brute" value={`${filteredTotalMargin.toLocaleString("fr-CD")} CDF`} />
        </div>

        <table className="mt-6 w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Facture</th>
              <th className="border p-2 text-left">Client</th>
              <th className="border p-2 text-left">Paiement</th>
              <th className="border p-2 text-right">Total</th>
              <th className="border p-2 text-right">Marge</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <tr key={`print-${invoice.id}`}>
                <td className="border p-2">{new Date(invoice.created_at).toLocaleString("fr-CD")}</td>
                <td className="border p-2">{invoice.invoice_number}</td>
                <td className="border p-2">{invoice.customer_name || "Comptoir"}</td>
                <td className="border p-2">{formatPaymentMethod(invoice.payment_method)}</td>
                <td className="border p-2 text-right">{formatMoney(Number(invoice.total_amount || 0), invoice.currency)}</td>
                <td className="border p-2 text-right">{formatMoney(Number(invoice.gross_margin || 0), invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden !important; }
          .invoice-history-print, .invoice-history-print * { visibility: visible !important; }
          .invoice-history-print { display: block !important; position: absolute !important; inset: 0 !important; background: white !important; color: black !important; }
        }
      `}</style>
    </main>
  );
}

function MobileInvoiceCard({ invoice }: { invoice: Sale }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
            Facture
          </p>

          <h3 className="mt-1 truncate text-sm font-black text-slate-950">
            {invoice.invoice_number}
          </h3>

          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
            {new Date(invoice.created_at).toLocaleString("fr-CD")}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
          {formatStatus(invoice.status)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniInfo label="Client" value={invoice.customer_name || "Comptoir"} />

        <MiniInfo
          label="Paiement"
          value={formatPaymentMethod(invoice.payment_method)}
        />

        <MiniInfo
          label="Total"
          value={formatMoney(Number(invoice.total_amount || 0), invoice.currency)}
          strong
        />

        <MiniInfo
          label="Marge"
          value={formatMoney(Number(invoice.gross_margin || 0), invoice.currency)}
        />
      </div>

      <Link
        href={`/factures/${invoice.id}`}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
      >
        <Printer className="h-4 w-4" />
        Voir / Imprimer
      </Link>
    </article>
  );
}

function MobilePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center">
        <p className="text-xs font-black text-slate-900">
          Page {page}/{totalPages}
        </p>

        <p className="text-[11px] font-semibold text-slate-500">
          {start}-{end} sur {totalItems}
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MiniInfo({
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
      <p className="text-[10px] font-bold text-slate-500">{label}</p>

      <p
        className={`mt-0.5 line-clamp-2 text-xs ${
          strong ? "font-black text-slate-950" : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm md:rounded-[2rem] md:p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 md:mb-4 md:h-12 md:w-12">
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-500 md:text-sm">{title}</p>

      <p className="mt-1 break-words text-xl font-black text-slate-950 md:mt-2 md:text-2xl">
        {value}
      </p>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
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
    credit: "Crédit client",
    mixed: "Mixte",
  };

  return labels[method] ?? method;
}

function formatStatus(status?: string | null) {
  const labels: Record<string, string> = {
    completed: "Validée",
    cancelled: "Annulée",
    pending: "En attente",
  };

  if (!status) return "-";

  return labels[status] ?? status;
}

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString("fr-CD")} ${currency}`;
}


function PrintMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black p-3">
      <p className="text-xs">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCurrentMonthRange() {
  const current = new Date();
  return {
    startDate: toDateInputValue(new Date(current.getFullYear(), current.getMonth(), 1)),
    endDate: toDateInputValue(new Date(current.getFullYear(), current.getMonth() + 1, 0)),
  };
}

function getCurrentWeekRange() {
  const current = new Date();
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    startDate: toDateInputValue(monday),
    endDate: toDateInputValue(sunday),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}
