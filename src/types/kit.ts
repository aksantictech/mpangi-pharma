export type KitRequisitionStatus = "completed" | "cancelled";

export type KitRequisitionItem = {
  id: string;
  requisition_id: string;
  pharmacy_id: string;
  product_id: string | null;
  batch_id: string | null;
  product_name: string;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
};

export type KitRequisition = {
  id: string;
  pharmacy_id: string;
  reference: string;
  requester_name: string;
  department: string | null;
  reason: string | null;
  status: KitRequisitionStatus;
  total_quantity: number;
  total_cost: number;
  created_by: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  kit_requisition_items?: KitRequisitionItem[];
};

export type KitServiceKind = "service" | "garde";

export type PharmacyKitService = {
  id: string;
  pharmacy_id: string;
  name: string;
  kind: KitServiceKind;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PaymentMethodKind = "convention" | "mobile" | "bank" | "other";

export type PharmacyPaymentMethod = {
  id: string;
  pharmacy_id: string;
  name: string;
  kind: PaymentMethodKind;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
