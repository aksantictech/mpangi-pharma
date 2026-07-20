"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LineChart,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  createExpense,
  getCurrentMonthRange,
  getFinanceSummary,
  getRecentExpenses,
} from "@/services/finance.service";
import { getInvoices } from "@/services/invoices.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { Expense, FinanceSummary } from "@/types/finance";
import type { Sale } from "@/types/sale";

const expenseCategories = [
  "Achat produits",
  "Loyer",
  "Salaire",
  "Transport",
  "Électricité",
  "Internet",
  "Taxes",
  "Entretien",
  "Perte / casse",
  "Autres charges",
];

const paymentMethods = [
  { value: "cash_cdf", label: "Cash CDF" },
  { value: "cash_usd", label: "Cash USD" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Carte" },
  { value: "bank_transfer", label: "Virement" },
];

type ExpenseFormState = {
  category: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  expenseDate: string;
  description: string;
};

type PeriodPreset = "today" | "week" | "month" | "custom";

type PaymentReportLine = {
  method: string;
  count: number;
  totalCdf: number;
};

const MOBILE_PAGE_SIZE = 5;

const today = new Date().toISOString().slice(0, 10);

const initialExpenseForm: ExpenseFormState = {
  category: "Achat produits",
  amount: "",
  currency: "CDF",
  paymentMethod: "cash_cdf",
  expenseDate: today,
  description: "",
};

const emptySummary: FinanceSummary = {
  totalSales: 0,
  totalCost: 0,
  grossMargin: 0,
  totalExpenses: 0,
  estimatedProfit: 0,
  salesCount: 0,
  expensesCount: 0,
};

export default function FinancesPage() {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
  const [salesSearch, setSalesSearch] = useState("");

  const [mobileSalesPage, setMobileSalesPage] = useState(1);
  const [mobileExpensesPage, setMobileExpensesPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const [expenseForm, setExpenseForm] =
    useState<ExpenseFormState>(initialExpenseForm);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setSummary(emptySummary);
        setExpenses([]);
        setSales([]);
        return;
      }

      setPharmacy(currentPharmacy);

      const [summaryData, expensesData, invoicesData] = await Promise.all([
        getFinanceSummary(currentPharmacy.id, startDate, endDate),
        getRecentExpenses(currentPharmacy.id, startDate, endDate),
        getInvoices(currentPharmacy.id),
      ]);

      setSummary(summaryData);
      setExpenses(expensesData);
      setSales(invoicesData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les finances."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  useEffect(() => {
    setMobileSalesPage(1);
  }, [salesSearch, startDate, endDate]);

  useEffect(() => {
    setMobileExpensesPage(1);
  }, [startDate, endDate]);

  const filteredSales = useMemo(() => {
    const normalized = salesSearch.trim().toLowerCase();

    return sales.filter((sale) => {
      const saleDate = toDateOnly(sale.created_at);

      const matchesDate = saleDate >= startDate && saleDate <= endDate;

      if (!matchesDate) return false;

      if (!normalized) return true;

      const value = [
        sale.invoice_number,
        sale.customer_name,
        sale.payment_method,
        sale.currency,
        sale.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return value.includes(normalized);
    });
  }, [sales, salesSearch, startDate, endDate]);

  const salesReport = useMemo(() => {
    const exchangeRate = Number(pharmacy?.exchange_rate || 2800);

    const totalCdf = filteredSales.reduce((sum, sale) => {
      return sum + toCdf(Number(sale.total_amount || 0), sale.currency, exchangeRate);
    }, 0);

    const grossMarginCdf = filteredSales.reduce((sum, sale) => {
      return sum + toCdf(Number(sale.gross_margin || 0), sale.currency, exchangeRate);
    }, 0);

    const totalUsd = filteredSales.reduce((sum, sale) => {
      if (sale.currency !== "USD") return sum;
      return sum + Number(sale.total_amount || 0);
    }, 0);

    const averageTicket =
      filteredSales.length > 0 ? totalCdf / filteredSales.length : 0;

    const paymentMap = new Map<string, PaymentReportLine>();

    for (const sale of filteredSales) {
      const method = sale.payment_method || "unknown";
      const current = paymentMap.get(method) || {
        method,
        count: 0,
        totalCdf: 0,
      };

      current.count += 1;
      current.totalCdf += toCdf(
        Number(sale.total_amount || 0),
        sale.currency,
        exchangeRate
      );

      paymentMap.set(method, current);
    }

    const paymentLines = Array.from(paymentMap.values()).sort(
      (a, b) => b.totalCdf - a.totalCdf
    );

    return {
      totalCdf,
      totalUsd,
      grossMarginCdf,
      averageTicket,
      paymentLines,
    };
  }, [filteredSales, pharmacy?.exchange_rate]);

  const mobileSalesTotalPages = Math.max(
    1,
    Math.ceil(filteredSales.length / MOBILE_PAGE_SIZE)
  );

  const safeMobileSalesPage = Math.min(mobileSalesPage, mobileSalesTotalPages);

  const mobileSales = filteredSales.slice(
    (safeMobileSalesPage - 1) * MOBILE_PAGE_SIZE,
    safeMobileSalesPage * MOBILE_PAGE_SIZE
  );

  const mobileExpensesTotalPages = Math.max(
    1,
    Math.ceil(expenses.length / MOBILE_PAGE_SIZE)
  );

  const safeMobileExpensesPage = Math.min(
    mobileExpensesPage,
    mobileExpensesTotalPages
  );

  const mobileExpenses = expenses.slice(
    (safeMobileExpensesPage - 1) * MOBILE_PAGE_SIZE,
    safeMobileExpensesPage * MOBILE_PAGE_SIZE
  );

  useEffect(() => {
    if (mobileSalesPage > mobileSalesTotalPages) {
      setMobileSalesPage(mobileSalesTotalPages);
    }
  }, [mobileSalesPage, mobileSalesTotalPages]);

  useEffect(() => {
    if (mobileExpensesPage > mobileExpensesTotalPages) {
      setMobileExpensesPage(mobileExpensesTotalPages);
    }
  }, [mobileExpensesPage, mobileExpensesTotalPages]);

  function applyPreset(preset: PeriodPreset) {
    setPeriodPreset(preset);

    if (preset === "today") {
      setStartDate(today);
      setEndDate(today);
      return;
    }

    if (preset === "week") {
      const range = getCurrentWeekRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      return;
    }

    if (preset === "month") {
      const range = getCurrentMonthRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  }

  function updateExpenseField<K extends keyof ExpenseFormState>(
    field: K,
    value: ExpenseFormState[K]
  ) {
    setExpenseForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pharmacy) return;

    setIsSavingExpense(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const amount = Number(expenseForm.amount || 0);

      if (amount <= 0) {
        throw new Error("Le montant de la dépense doit être supérieur à zéro.");
      }

      if (!expenseForm.category.trim()) {
        throw new Error("La catégorie est obligatoire.");
      }

      await createExpense({
        pharmacyId: pharmacy.id,
        category: expenseForm.category,
        amount,
        currency: expenseForm.currency,
        exchangeRate: Number(pharmacy.exchange_rate || 2800),
        paymentMethod: expenseForm.paymentMethod,
        description: expenseForm.description,
        expenseDate: expenseForm.expenseDate,
      });

      setExpenseForm(initialExpenseForm);
      setIsDialogOpen(false);
      setSuccessMessage("Dépense enregistrée avec succès.");

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer la dépense."
      );
    } finally {
      setIsSavingExpense(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <p className="font-semibold text-slate-500">
            Chargement des finances...
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
            Créez une pharmacie avant d’utiliser les finances.
          </p>
        </div>
      </main>
    );
  }

  function handlePrintReport() {
    setIsPrintingReport(true);
    window.setTimeout(() => window.print(), 200);
  }

  const profitTone =
    summary.estimatedProfit >= 0
      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
      : "text-red-700 bg-red-50 border-red-100";

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm md:tracking-[0.2em]">
                {pharmacy.name}
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
                Finances
              </h1>

              <p className="mt-1 text-xs text-slate-500 md:mt-2 md:text-sm">
                Recettes, dépenses, marge, bénéfice et rapport des ventes.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-[150px_150px_auto_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-400">
                  Début
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setPeriodPreset("custom");
                    setStartDate(event.target.value);
                  }}
                  className="form-input"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-400">
                  Fin
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setPeriodPreset("custom");
                    setEndDate(event.target.value);
                  }}
                  className="form-input"
                />
              </label>

              <button
                type="button"
                onClick={loadData}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 md:self-end"
              >
                <RefreshCcw className="h-5 w-5" />
                Actualiser
              </button>
<button
  type="button"
  onClick={handlePrintReport}
  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 md:self-end"
>
  <Printer className="h-5 w-5" />
  {isPrintingReport ? "Préparation..." : "Rapport PDF"}
</button>
<Link
  href="/finances/tva"
  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100 md:self-end"
>
  <FileText className="h-5 w-5" />
  Rapport TVA
</Link>
              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800 md:self-end"
              >
                <Plus className="h-5 w-5" />
                Ajouter dépense
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="mb-3">
            <h2 className="text-lg font-black text-slate-950 md:text-xl">
              Période du rapport
            </h2>

            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Choisissez rapidement jour, semaine, mois ou période personnalisée.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            <PeriodButton
              label="Aujourd’hui"
              active={periodPreset === "today"}
              onClick={() => applyPreset("today")}
            />

            <PeriodButton
              label="Cette semaine"
              active={periodPreset === "week"}
              onClick={() => applyPreset("week")}
            />

            <PeriodButton
              label="Ce mois"
              active={periodPreset === "month"}
              onClick={() => applyPreset("month")}
            />

            <PeriodButton
              label="Personnalisé"
              active={periodPreset === "custom"}
              onClick={() => setPeriodPreset("custom")}
            />
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {successMessage}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            title="Recettes"
            value={formatMoney(summary.totalSales, "CDF")}
            description={`${summary.salesCount} vente(s)`}
            icon={<Wallet className="h-5 w-5 md:h-6 md:w-6" />}
            tone="blue"
          />

          <MetricCard
            title="Coût produits"
            value={formatMoney(summary.totalCost, "CDF")}
            description="Prix d’achat cumulés"
            icon={<TrendingDown className="h-5 w-5 md:h-6 md:w-6" />}
            tone="orange"
          />

          <MetricCard
            title="Marge brute"
            value={formatMoney(summary.grossMargin, "CDF")}
            description="Ventes - coût"
            icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
            tone="green"
          />

          <MetricCard
            title="Dépenses"
            value={formatMoney(summary.totalExpenses, "CDF")}
            description={`${summary.expensesCount} dépense(s)`}
            icon={<CreditCard className="h-5 w-5 md:h-6 md:w-6" />}
            tone="red"
          />
        </section>

        <section className={`rounded-[1.5rem] border p-4 md:rounded-[2rem] md:p-6 ${profitTone}`}>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] md:text-sm md:tracking-[0.2em]">
                Résultat estimé
              </p>

              <h2 className="mt-1 break-words text-3xl font-black md:mt-2 md:text-4xl">
                {formatMoney(summary.estimatedProfit, "CDF")}
              </h2>

              <p className="mt-2 text-xs font-semibold md:text-sm">
                Bénéfice estimé = marge brute - dépenses.
              </p>
            </div>

            <div className="hidden rounded-3xl bg-white/70 p-5 md:block">
              <LineChart className="h-10 w-10" />
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-950 md:text-xl">
                Rapport des ventes
              </h2>

              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Analyse des ventes entre {formatDate(startDate)} et{" "}
                {formatDate(endDate)}.
              </p>
            </div>

            <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:w-96">
              <Search className="h-5 w-5 text-slate-400" />

              <input
                value={salesSearch}
                onChange={(event) => setSalesSearch(event.target.value)}
                placeholder="Facture, client, paiement..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
            <MiniReportCard
              label="Ventes"
              value={filteredSales.length.toString()}
            />

            <MiniReportCard
              label="Total vendu"
              value={formatMoney(salesReport.totalCdf, "CDF")}
            />

            <MiniReportCard
              label="Marge ventes"
              value={formatMoney(salesReport.grossMarginCdf, "CDF")}
            />

            <MiniReportCard
              label="Ticket moyen"
              value={formatMoney(salesReport.averageTicket, "CDF")}
            />
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:rounded-3xl md:p-4">
            <h3 className="mb-3 text-sm font-black text-slate-950">
              Répartition par mode de paiement
            </h3>

            {salesReport.paymentLines.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">
                Aucune vente sur cette période.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {salesReport.paymentLines.map((line) => (
                  <div
                    key={line.method}
                    className="rounded-2xl bg-white px-3 py-2"
                  >
                    <p className="text-xs font-black text-slate-950">
                      {formatPaymentMethod(line.method)}
                    </p>

                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      {line.count} vente(s) · {formatMoney(line.totalCdf, "CDF")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 xl:hidden">
            <MobilePagination
              page={safeMobileSalesPage}
              totalPages={mobileSalesTotalPages}
              totalItems={filteredSales.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() =>
                setMobileSalesPage((page) => Math.max(1, page - 1))
              }
              onNext={() =>
                setMobileSalesPage((page) =>
                  Math.min(mobileSalesTotalPages, page + 1)
                )
              }
            />

            {filteredSales.length === 0 ? (
              <EmptyState message="Aucune vente trouvée sur cette période." />
            ) : (
              mobileSales.map((sale) => (
                <MobileSaleCard key={sale.id} sale={sale} />
              ))
            )}

            <MobilePagination
              page={safeMobileSalesPage}
              totalPages={mobileSalesTotalPages}
              totalItems={filteredSales.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() =>
                setMobileSalesPage((page) => Math.max(1, page - 1))
              }
              onNext={() =>
                setMobileSalesPage((page) =>
                  Math.min(mobileSalesTotalPages, page + 1)
                )
              }
            />
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Date</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Marge</TableHead>
                    <TableHead>Action</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Aucune vente trouvée sur cette période.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {new Date(sale.created_at).toLocaleString("fr-CD")}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">
                            {sale.invoice_number}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatStatus(sale.status)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {sale.customer_name || "Comptoir"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {formatPaymentMethod(sale.payment_method)}
                        </td>

                        <td className="px-5 py-4 font-black text-slate-950">
                          {formatMoney(Number(sale.total_amount || 0), sale.currency)}
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-700">
                          {formatMoney(Number(sale.gross_margin || 0), sale.currency)}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/factures/${sale.id}`}
                            className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
                          >
                            <Printer className="h-4 w-4" />
                            Facture
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

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950 md:text-xl">
                Dépenses enregistrées
              </h2>

              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Charges de la pharmacie sur la période sélectionnée.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 md:inline-flex"
            >
              <Plus className="h-5 w-5" />
              Nouvelle dépense
            </button>
          </div>

          <div className="space-y-2 xl:hidden">
            <MobilePagination
              page={safeMobileExpensesPage}
              totalPages={mobileExpensesTotalPages}
              totalItems={expenses.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() =>
                setMobileExpensesPage((page) => Math.max(1, page - 1))
              }
              onNext={() =>
                setMobileExpensesPage((page) =>
                  Math.min(mobileExpensesTotalPages, page + 1)
                )
              }
            />

            {expenses.length === 0 ? (
              <EmptyState message="Aucune dépense enregistrée sur cette période." />
            ) : (
              mobileExpenses.map((expense) => (
                <MobileExpenseCard key={expense.id} expense={expense} />
              ))
            )}

            <MobilePagination
              page={safeMobileExpensesPage}
              totalPages={mobileExpensesTotalPages}
              totalItems={expenses.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() =>
                setMobileExpensesPage((page) => Math.max(1, page - 1))
              }
              onNext={() =>
                setMobileExpensesPage((page) =>
                  Math.min(mobileExpensesTotalPages, page + 1)
                )
              }
            />
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Date</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Montant</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Aucune dépense enregistrée sur cette période.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {formatDate(expense.expense_date)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            {expense.category}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {expense.description || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatPaymentMethod(expense.payment_method)}
                        </td>

                        <td className="px-5 py-4 font-black text-slate-950">
                          {formatMoney(Number(expense.amount || 0), expense.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {isDialogOpen && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 px-3 py-3 backdrop-blur-sm md:items-center md:px-4 md:py-8">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl md:rounded-[2rem] md:p-6">
              <div className="mb-5 flex items-start justify-between gap-4 md:mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-950 md:text-2xl">
                    Ajouter une dépense
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 md:text-sm">
                    Enregistrez une charge liée à la pharmacie.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <FormField label="Catégorie">
                    <select
                      value={expenseForm.category}
                      onChange={(event) =>
                        updateExpenseField("category", event.target.value)
                      }
                      className="form-input"
                    >
                      {expenseCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Montant">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(event) =>
                        updateExpenseField("amount", event.target.value)
                      }
                      className="form-input"
                      placeholder="Ex : 50000"
                    />
                  </FormField>

                  <FormField label="Devise">
                    <select
                      value={expenseForm.currency}
                      onChange={(event) =>
                        updateExpenseField("currency", event.target.value)
                      }
                      className="form-input"
                    >
                      <option value="CDF">CDF</option>
                      <option value="USD">USD</option>
                    </select>
                  </FormField>

                  <FormField label="Mode de paiement">
                    <select
                      value={expenseForm.paymentMethod}
                      onChange={(event) =>
                        updateExpenseField("paymentMethod", event.target.value)
                      }
                      className="form-input"
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Date">
                    <input
                      type="date"
                      value={expenseForm.expenseDate}
                      onChange={(event) =>
                        updateExpenseField("expenseDate", event.target.value)
                      }
                      className="form-input"
                    />
                  </FormField>
                </div>

                <FormField label="Description">
                  <textarea
                    value={expenseForm.description}
                    onChange={(event) =>
                      updateExpenseField("description", event.target.value)
                    }
                    className="form-input min-h-24 resize-none"
                    placeholder="Ex : Achat de cartons auprès du fournisseur..."
                  />
                </FormField>

                <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2 md:flex md:justify-end md:gap-3 md:pt-5">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingExpense}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-5 w-5" />
                    {isSavingExpense ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <section className="finance-print-report hidden print:block">
        <div className="border-b border-black pb-4 text-center">
          <h1 className="text-2xl font-black">{pharmacy.name}</h1>
          <h2 className="mt-1 text-xl font-black">Rapport financier</h2>
          <p className="mt-1 text-sm">Période : {formatDate(startDate)} au {formatDate(endDate)}</p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <PrintMetric label="Recettes" value={formatMoney(summary.totalSales, "CDF")} />
          <PrintMetric label="Coût produits" value={formatMoney(summary.totalCost, "CDF")} />
          <PrintMetric label="Marge brute" value={formatMoney(summary.grossMargin, "CDF")} />
          <PrintMetric label="Dépenses" value={formatMoney(summary.totalExpenses, "CDF")} />
          <PrintMetric label="Résultat estimé" value={formatMoney(summary.estimatedProfit, "CDF")} />
          <PrintMetric label="Nombre de ventes" value={summary.salesCount.toString()} />
        </div>

        <h3 className="mt-6 text-base font-black">Ventes</h3>
        <table className="mt-2 w-full border-collapse text-xs">
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
            {filteredSales.map((sale) => (
              <tr key={`finance-print-sale-${sale.id}`}>
                <td className="border p-2">{new Date(sale.created_at).toLocaleString("fr-CD")}</td>
                <td className="border p-2">{sale.invoice_number}</td>
                <td className="border p-2">{sale.customer_name || "Comptoir"}</td>
                <td className="border p-2">{formatPaymentMethod(sale.payment_method)}</td>
                <td className="border p-2 text-right">{formatMoney(Number(sale.total_amount || 0), sale.currency)}</td>
                <td className="border p-2 text-right">{formatMoney(Number(sale.gross_margin || 0), sale.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="mt-6 text-base font-black">Dépenses</h3>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Catégorie</th>
              <th className="border p-2 text-left">Description</th>
              <th className="border p-2 text-left">Paiement</th>
              <th className="border p-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={`finance-print-expense-${expense.id}`}>
                <td className="border p-2">{formatDate(expense.expense_date)}</td>
                <td className="border p-2">{expense.category}</td>
                <td className="border p-2">{expense.description || "-"}</td>
                <td className="border p-2">{formatPaymentMethod(expense.payment_method)}</td>
                <td className="border p-2 text-right">{formatMoney(Number(expense.amount || 0), expense.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 text-right text-xs">Imprimé le {new Date().toLocaleString("fr-CD")}</p>
      </section>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden !important; }
          .finance-print-report, .finance-print-report * { visibility: visible !important; }
          .finance-print-report { display: block !important; position: absolute !important; inset: 0 !important; background: white !important; color: black !important; }
        }
      `}</style>
    </main>
  );
}

function MobileSaleCard({ sale }: { sale: Sale }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
            Vente
          </p>

          <h3 className="mt-1 truncate text-sm font-black text-slate-950">
            {sale.invoice_number}
          </h3>

          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
            {new Date(sale.created_at).toLocaleString("fr-CD")}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
          {formatStatus(sale.status)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniInfo label="Client" value={sale.customer_name || "Comptoir"} />
        <MiniInfo
          label="Paiement"
          value={formatPaymentMethod(sale.payment_method)}
        />
        <MiniInfo
          label="Total"
          value={formatMoney(Number(sale.total_amount || 0), sale.currency)}
          strong
        />
        <MiniInfo
          label="Marge"
          value={formatMoney(Number(sale.gross_margin || 0), sale.currency)}
        />
      </div>

      <Link
        href={`/factures/${sale.id}`}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
      >
        <FileText className="h-4 w-4" />
        Voir facture
      </Link>
    </article>
  );
}

function MobileExpenseCard({ expense }: { expense: Expense }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700">
            Dépense
          </p>

          <h3 className="mt-1 line-clamp-2 text-sm font-black text-slate-950">
            {expense.category}
          </h3>

          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
            {formatDate(expense.expense_date)}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">
          {formatMoney(Number(expense.amount || 0), expense.currency)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniInfo
          label="Paiement"
          value={formatPaymentMethod(expense.payment_method)}
        />

        <MiniInfo label="Devise" value={expense.currency} />
      </div>

      {expense.description && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          {expense.description}
        </p>
      )}
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

function PeriodButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-xl px-3 py-2 text-xs font-black md:rounded-2xl md:px-4 md:py-3 md:text-sm ${
        active
          ? "bg-blue-700 text-white shadow-lg shadow-blue-100"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone: "blue" | "green" | "orange" | "red";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm md:rounded-[2rem] md:p-5">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl md:mb-4 md:h-12 md:w-12 ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-500 md:text-sm">{title}</p>

      <p className="mt-1 break-words text-lg font-black text-slate-950 md:mt-2 md:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-[11px] font-medium text-slate-400 md:mt-2 md:text-xs">
        {description}
      </p>
    </div>
  );
}

function MiniReportCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-slate-950 md:text-base">
        {value}
      </p>
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

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-700 md:text-sm">
        {label}
      </span>
      {children}
    </label>
  );
}

function formatPaymentMethod(method: string) {
  const labels: Record<string, string> = {
    cash_cdf: "Cash CDF",
    cash_usd: "Cash USD",
    mobile_money: "Mobile Money",
    card: "Carte",
    bank_transfer: "Virement",
    credit: "Crédit",
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

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function toDateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
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

function toCdf(value: number, currency: string, exchangeRate: number) {
  if (currency === "USD") {
    return value * exchangeRate;
  }

  return value;
}


function PrintMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black p-3">
      <p className="text-xs">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}
