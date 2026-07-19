export type PharmacyOpeningMode =
  | "automatic"
  | "forced_open"
  | "forced_closed";

export type Pharmacy = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  pharmacist_name: string | null;
  currency_main: string;
  currency_secondary: string;
  exchange_rate: number;
  invoice_footer: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  whatsapp?: string | null;
  commune?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  public_description?: string | null;
  is_public_visible?: boolean;
  is_24h?: boolean;
  accepts_public_calls?: boolean;
  accepts_product_availability_requests?: boolean;
  shares_stock_with_network?: boolean;
  shares_exact_stock?: boolean;
  accepts_stock_requests?: boolean;
  public_opening_mode?: PharmacyOpeningMode;
  public_opening_status_updated_at?: string | null;
  public_opening_status_updated_by?: string | null;
};

export type PharmacyWithRole = Pharmacy & {
  role: string;
};
