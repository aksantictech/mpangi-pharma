export type StockMovementType =
  | "supplier_entry"
  | "sale"
  | "customer_return"
  | "supplier_return"
  | "adjustment_in"
  | "adjustment_out"
  | "loss"
  | "damage"
  | "expired"
  | "transfer_in"
  | "transfer_out"
  | "inventory_correction";

export type StockMovement = {
  id: string;
  pharmacy_id: string;
  product_id: string;
  product_name: string;
  generic_name: string | null;
  dosage: string | null;
  form: string | null;
  batch_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  movement_type: StockMovementType;
  quantity: number;
  unit_cost: number | null;
  unit_price: number | null;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
};

export type AddStockBatchPayload = {
  productId: string;
  supplierId?: string;
  batchNumber?: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  reason?: string;
};

export type CorrectBatchQuantityPayload = {
  batchId: string;
  newQuantity: number;
  reason?: string;
};