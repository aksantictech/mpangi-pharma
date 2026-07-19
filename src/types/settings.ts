export type PharmacySettings = {
  id: string;
  pharmacy_id: string;
  allow_negative_stock: boolean;
  block_expired_sales: boolean;
  expiration_alert_days: number;
  low_stock_alert_enabled: boolean;
  invoice_prefix: string;
  receipt_format: string;
  created_at: string;
  updated_at: string;
};

export type PharmacyMember = {
  id: string;
  pharmacy_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};
