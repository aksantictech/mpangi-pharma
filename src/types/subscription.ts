export type SubscriptionStatus = "trial" | "active" | "expired" | "blocked";

export type PharmacySubscription = {
  pharmacy_id: string;
  status: SubscriptionStatus;
  plan_label: string | null;
  expires_at: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};

export type SubscriptionPaymentMethod = "mobile_money" | "bank_transfer" | "bank_card";

export type SubscriptionPaymentKind = "grant" | "payment_submission";

export type SubscriptionPaymentStatus = "pending" | "approved" | "rejected";

export type SubscriptionPayment = {
  id: string;
  pharmacy_id: string;
  kind: SubscriptionPaymentKind;
  method: SubscriptionPaymentMethod | null;
  amount: number | null;
  currency: string | null;
  reference: string | null;
  note: string | null;
  period_days: number | null;
  status: SubscriptionPaymentStatus;
  created_by: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

export type MobileMoneyOption = {
  provider: string;
  number: string;
  holderName?: string;
};

export type BankOption = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  notes?: string;
};

export type PlatformPaymentSettings = {
  id: string;
  mobile_money_options: MobileMoneyOption[];
  bank_options: BankOption[];
  card_instructions: string | null;
  updated_by: string | null;
  updated_at: string;
};

/** Calcule le statut d'affichage + les jours restants à partir d'une ligne pharmacy_subscriptions. */
export function getSubscriptionDaysRemaining(
  subscription: Pick<PharmacySubscription, "expires_at"> | null
): number | null {
  if (!subscription?.expires_at) return null;

  const diffMs = new Date(subscription.expires_at).getTime() - Date.now();

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isSubscriptionBlocking(
  subscription: Pick<PharmacySubscription, "status" | "expires_at"> | null
): boolean {
  if (!subscription) return true;
  if (subscription.status === "blocked") return true;

  if (subscription.expires_at) {
    return new Date(subscription.expires_at).getTime() <= Date.now();
  }

  return subscription.status === "expired";
}
