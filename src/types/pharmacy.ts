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
};

export type PharmacyWithRole = Pharmacy & {
  role: string;
};