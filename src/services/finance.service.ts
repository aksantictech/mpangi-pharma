import { createSupabaseClient } from "@/lib/supabase/client";
import type {
  CreateExpensePayload,
  Expense,
  FinanceSummary,
} from "@/types/finance";
import type { Sale } from "@/types/sale";

function emptyToNull(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export async function getFinanceSummary(
  pharmacyId: string,
  startDate: string,
  endDate: string
): Promise<FinanceSummary> {
  const supabase = createSupabaseClient();

  const startDateTime = `${startDate}T00:00:00.000Z`;
  const endDateTime = `${endDate}T23:59:59.999Z`;

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("status", "completed")
    .gte("created_at", startDateTime)
    .lte("created_at", endDateTime);

  if (salesError) {
    throw new Error(salesError.message);
  }

  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate);

  if (expensesError) {
    throw new Error(expensesError.message);
  }

  const salesRows = (sales ?? []) as Sale[];
  const expenseRows = (expenses ?? []) as Expense[];

  const totalSales = salesRows.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const totalCost = salesRows.reduce(
    (sum, sale) => sum + Number(sale.total_cost || 0),
    0
  );

  const grossMargin = salesRows.reduce(
    (sum, sale) => sum + Number(sale.gross_margin || 0),
    0
  );

  const totalExpenses = expenseRows.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  return {
    totalSales,
    totalCost,
    grossMargin,
    totalExpenses,
    estimatedProfit: grossMargin - totalExpenses,
    salesCount: salesRows.length,
    expensesCount: expenseRows.length,
  };
}

export async function getRecentExpenses(
  pharmacyId: string,
  startDate: string,
  endDate: string
) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Expense[];
}

export async function createExpense(payload: CreateExpensePayload) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      pharmacy_id: payload.pharmacyId,
      category: payload.category.trim(),
      amount: payload.amount,
      currency: payload.currency,
      exchange_rate: payload.exchangeRate,
      payment_method: payload.paymentMethod,
      description: emptyToNull(payload.description),
      expense_date: payload.expenseDate || new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Expense;
}