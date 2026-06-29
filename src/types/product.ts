export type ProductStatus = "active" | "inactive" | "archived";

export type StockStatus = "available" | "low_stock" | "out_of_stock";

export type ExpirationStatus =
  | "ok"
  | "expires_90_days"
  | "expires_60_days"
  | "expires_30_days"
  | "expired";

export type Product = {
  id: string;
  pharmacy_id: string;
  category_id: string | null;
  name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
  unit: string;
  barcode: string | null;
  manufacturer: string | null;
  default_supplier_id: string | null;
  min_stock: number;
  max_stock: number | null;
  requires_prescription: boolean;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};

export type ProductBatch = {
  id: string;
  pharmacy_id: string;
  product_id: string;
  supplier_id: string | null;
  batch_number: string | null;
  expiry_date: string;
  purchase_price: number;
  selling_price: number;
  quantity_initial: number;
  quantity_available: number;
  received_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductStockSummary = {
  product_id: string;
  pharmacy_id: string;
  name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
  unit: string;
  min_stock: number;
  status: ProductStatus;
  total_quantity: number;
  nearest_expiry_date: string | null;
  stock_status: StockStatus;
};

export type ExpirationAlert = {
  batch_id: string;
  pharmacy_id: string;
  product_id: string;
  product_name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
  batch_number: string | null;
  expiry_date: string;
  quantity_available: number;
  selling_price: number;
  purchase_price: number;
  days_remaining: number;
  expiration_status: ExpirationStatus;
};