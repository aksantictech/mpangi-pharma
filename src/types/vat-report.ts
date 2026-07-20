export type VatReportLine = {
  pharmacy_id: string;
  sale_id: string;
  invoice_number: string;
  customer_name: string | null;
  currency: string;
  exchange_rate: number;
  payment_method: string;
  status: string;
  created_at: string;
  vat_rate: number;
  taxable_base_ht: number;
  vat_amount: number;
  total_ttc: number;
  total_quantity: number;
};

export type VatRateSummary = {
  vatRate: number;
  invoiceCount: number;
  taxableBaseHt: number;
  vatAmount: number;
  totalTtc: number;
};

export type VatReportSummary = {
  totalInvoices: number;
  totalTaxableBaseHt: number;
  totalVat: number;
  totalTtc: number;
  exemptBaseHt: number;
  vat5BaseHt: number;
  vat5Amount: number;
  vat16BaseHt: number;
  vat16Amount: number;
  byRate: VatRateSummary[];
};
