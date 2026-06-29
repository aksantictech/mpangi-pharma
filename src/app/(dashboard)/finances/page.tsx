"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CreditCard,
  LineChart,
  Plus,
  RefreshCcw,
  Save,
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
import type { PharmacyWithRole } from "@/types/pharmacy";
import type { Expense, FinanceSummary } from "@/types/finance";

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

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
        return;
      }

      setPharmacy(currentPharmacy);

      const [summaryData, expensesData] = await Promise.all([
        getFinanceSummary(currentPharmacy.id, startDate, endDate),
        getRecentExpenses(currentPharmacy.id, startDate, endDate),
      ]);

      setSummary(summaryData);
      setExpenses(expensesData);
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

  function updateExpenseField<K extends keyof ExpenseFormState>(
    field: K,
    value: ExpenseFormState[K]
  ) {
    setExpenseForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateExpense(event: React.FormEvent<HTMLFormElement>) {
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
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement des finances...
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
            Créez une pharmacie avant d’utiliser les finances.
          </p>
        </div>
      </main>
    );
  }

  const profitTone =
    summary.estimatedProfit >= 0
      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
      : "text-red-700 bg-red-50 border-red-100";

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                {pharmacy.name}
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Finances
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Recettes, dépenses, marge brute et bénéfice estimé.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <label className="block">
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

              <label className="block">
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
                onClick={loadData}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 md:self-end"
              >
                <RefreshCcw className="h-5 w-5" />
                Actualiser
              </button>

              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800 md:self-end"
              >
                <Plus className="h-5 w-5" />
                Ajouter dépense
              </button>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {successMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Recettes"
            value={`${summary.totalSales.toLocaleString("fr-CD")} CDF`}
            description={`${summary.salesCount} vente(s)`}
            icon={<Wallet className="h-6 w-6" />}
            tone="blue"
          />

          <MetricCard
            title="Coût des produits vendus"
            value={`${summary.totalCost.toLocaleString("fr-CD")} CDF`}
            description="Prix d’achat cumulés"
            icon={<TrendingDown className="h-6 w-6" />}
            tone="orange"
          />

          <MetricCard
            title="Marge brute"
            value={`${summary.grossMargin.toLocaleString("fr-CD")} CDF`}
            description="Ventes - coût d’achat"
            icon={<TrendingUp className="h-6 w-6" />}
            tone="green"
          />

          <MetricCard
            title="Dépenses"
            value={`${summary.totalExpenses.toLocaleString("fr-CD")} CDF`}
            description={`${summary.expensesCount} dépense(s)`}
            icon={<CreditCard className="h-6 w-6" />}
            tone="red"
          />
        </section>

        <section className={`rounded-[2rem] border p-6 ${profitTone}`}>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em]">
                Résultat estimé
              </p>

              <h2 className="mt-2 text-4xl font-black">
                {summary.estimatedProfit.toLocaleString("fr-CD")} CDF
              </h2>

              <p className="mt-2 text-sm font-semibold">
                Bénéfice estimé = marge brute - dépenses.
              </p>
            </div>

            <div className="rounded-3xl bg-white/70 p-5">
              <LineChart className="h-10 w-10" />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Dépenses enregistrées
              </h2>
              <p className="mt-1 text-sm text-slate-500">
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

          <div className="overflow-hidden rounded-3xl border border-slate-200">
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
                          {expense.expense_date}
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
                          {Number(expense.amount).toLocaleString("fr-CD")}{" "}
                          {expense.currency}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Ajouter une dépense
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
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
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
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
    </main>
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
  icon: React.ReactNode;
  tone: "blue" | "green" | "orange" | "red";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-medium text-slate-400">{description}</p>
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
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