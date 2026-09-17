import { createSupabaseClient } from "@/lib/supabase/client";

import type {
  PharmacySubscription,
  PlatformPaymentSettings,
  SubscriptionPayment,
  SubscriptionPaymentMethod,
} from "@/types/subscription";

/**
 * Lecture directe (client anon, protégée par RLS) : un membre actif de la
 * pharmacie peut toujours voir l'état de son abonnement, même bloqué ou
 * expiré (policy pharmacy_subscriptions_select_by_members, voir
 * supabase/migrations/0002_subscriptions.sql).
 */
export async function getPharmacySubscription(
  pharmacyId: string
): Promise<PharmacySubscription | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pharmacy_subscriptions")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PharmacySubscription | null) ?? null;
}

/**
 * Moyens de paiement de la plateforme, configurés par le Super Admin et
 * lisibles par tout utilisateur connecté (aucune donnée sensible).
 */
export async function getPlatformPaymentSettings(): Promise<PlatformPaymentSettings | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("platform_payment_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PlatformPaymentSettings | null) ?? null;
}

/**
 * Historique de l'abonnement (octrois du Super Admin + déclarations de
 * paiement) : propriétaire/gérant de la pharmacie, ou Super Admin.
 */
export async function getSubscriptionPaymentHistory(
  pharmacyId: string
): Promise<SubscriptionPayment[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SubscriptionPayment[];
}

export type SubmitSubscriptionPaymentPayload = {
  pharmacyId: string;
  method: SubscriptionPaymentMethod;
  amount?: number;
  currency?: string;
  reference?: string;
  note?: string;
};

/**
 * Déclaration de paiement par le propriétaire/gérant : la RLS force
 * kind='payment_submission', status='pending' et created_by=auth.uid(), et
 * n'autorise que owner/manager — voir la policy
 * subscription_payments_insert_by_owners_managers.
 */
export async function submitSubscriptionPayment(
  payload: SubmitSubscriptionPaymentPayload
): Promise<SubscriptionPayment> {
  const supabase = createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non authentifié.");
  }

  const { data, error } = await supabase
    .from("subscription_payments")
    .insert({
      pharmacy_id: payload.pharmacyId,
      kind: "payment_submission",
      status: "pending",
      method: payload.method,
      amount: payload.amount ?? null,
      currency: payload.currency || "USD",
      reference: payload.reference?.trim() || null,
      note: payload.note?.trim() || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SubscriptionPayment;
}
