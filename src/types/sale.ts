export type PaymentMethod =
  | "cash_cdf"
  | "cash_usd"
  | "mobile_money"
  | "card"
  | "credit"
  | "mixed";

export type SaleStatus = "completed" | "cancelled" | "refunded";

export type SellableProduct = {
  product_id: string;
  pharmacy_id: string;
  name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
  unit: string;
  barcode: string | null;
  requires_prescription: boolean;
  min_stock: number;
  total_quantity: number;
  nearest_expiry_date: string | null;
  selling_price: number | null;
  purchase_price: number | null;
  stock_status: "available" | "low_stock" | "out_of_stock";
};

export type CartItem = {
  productId: string;
  name: string;
  dosage: string | null;
  form: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  availableQuantity: number;
};

export type Sale = {
  id: string;
  pharmacy_id: string;
  invoice_number: string;
  customer_name: string | null;
  subtotal: number;
  discount: number;
  total_amount: number;
  total_cost: number;
  gross_margin: number;
  currency: string;
  exchange_rate: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  notes: string | null;
  created_at: string;
};

export type CreateSaleResult = {
  sale_id: string;
  invoice_number: string;
  total_amount: number;
};
export type SaleItem = {
  id: string;
  sale_id: string;
  pharmacy_id: string;
  product_id: string;
  batch_id: string | null;
  product_name: string;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
  total_cost: number;
  created_at: string;
};

export type SaleWithItems = Sale & {
  items: SaleItem[];
};