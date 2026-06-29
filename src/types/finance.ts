export type Expense = {
  id: string;
  pharmacy_id: string;
  category: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  payment_method: string;
  description: string | null;
  supplier_id: string | null;
  user_id: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
};

export type CreateExpensePayload = {
  pharmacyId: string;
  category: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  paymentMethod: string;
  description?: string;
  expenseDate?: string;
};

export type FinanceSummary = {
  totalSales: number;
  totalCost: number;
  grossMargin: number;
  totalExpenses: number;
  estimatedProfit: number;
  salesCount: number;
  expensesCount: number;
};