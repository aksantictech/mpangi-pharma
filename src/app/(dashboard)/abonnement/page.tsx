"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCcw,
  ShieldAlert,
  Smartphone,
} from "lucide-react";

import { canEditPharmacySettings } from "@/lib/permissions";
import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  getPharmacySubscription,
  getPlatformPaymentSettings,
  getSubscriptionPaymentHistory,
  submitSubscriptionPayment,
} from "@/services/subscriptions.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import {
  getSubscriptionDaysRemaining,
  isSubscriptionBlocking,
  type PharmacySubscription,
  type PlatformPaymentSettings,
  type SubscriptionPayment,
  type SubscriptionPaymentMethod,
} from "@/types/subscription";

const statusLabels: Record<string, string> = {
  trial: "Essai",
  active: "Actif",
  expired: "Expiré",
  blocked: "Bloqué",
};

const statusTones: Record<string, string> = {
  trial: "bg-blue-50 text-blue-700 border-blue-100",
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  expired: "bg-amber-50 text-amber-700 border-amber-100",
  blocked: "bg-red-50 text-red-700 border-red-100",
};

const methodLabels: Record<SubscriptionPaymentMethod, string> = {
  mobile_money: "Mobile money",
  bank_transfer: "Virement bancaire",
  bank_card: "Carte bancaire",
};

export default function AbonnementPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [subscription, setSubscription] = useState<PharmacySubscription | null>(
    null
  );
  const [paymentSettings, setPaymentSettings] =
    useState<PlatformPaymentSettings | null>(null);
  const [history, setHistory] = useState<SubscriptionPayment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [method, setMethod] = useState<SubscriptionPaymentMethod>("mobile_money");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        return;
      }

      setPharmacy(currentPharmacy);

      const [subscriptionResult, settingsResult, historyResult] =
        await Promise.all([
          getPharmacySubscription(currentPharmacy.id),
          getPlatformPaymentSettings(),
          getSubscriptionPaymentHistory(currentPharmacy.id),
        ]);

      setSubscription(subscriptionResult);
      setPaymentSettings(settingsResult);
      setHistory(historyResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger l’abonnement."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  async function handleSubmitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pharmacy) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await submitSubscriptionPayment({
        pharmacyId: pharmacy.id,
        method,
        amount: amount ? Number(amount) : undefined,
        currency,
        reference,
        note,
      });

      setSuccessMessage(
        "Paiement déclaré. Aksantic Technology va le vérifier et activer votre abonnement."
      );
      setAmount("");
      setReference("");
      setNote("");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer votre déclaration de paiement."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement de l’abonnement...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-800">
            Aucune pharmacie trouvée
          </h1>
        </div>
      </main>
    );
  }

  const canManage = canEditPharmacySettings(pharmacy.role);
  const daysRemaining = getSubscriptionDaysRemaining(subscription);
  const blocked = isSubscriptionBlocking(subscription);
  const status = subscription?.status ?? "expired";

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                Abonnement
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                {pharmacy.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Suivi de l’abonnement et moyens de paiement de la plateforme.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* État de l'abonnement */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${statusTones[status]}`}
              >
                {blocked ? (
                  <ShieldAlert className="h-7 w-7" />
                ) : (
                  <CalendarClock className="h-7 w-7" />
                )}
              </div>

              <div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${statusTones[status]}`}
                >
                  {statusLabels[status] ?? status}
                </span>

                <p className="mt-2 text-lg font-black text-slate-950">
                  {subscription?.plan_label || "Aucun plan actif"}
                </p>

                {subscription?.expires_at ? (
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {blocked ? "Expiré le" : "Valable jusqu’au"}{" "}
                    {new Date(subscription.expires_at).toLocaleDateString(
                      "fr-CD",
                      { day: "2-digit", month: "long", year: "numeric" }
                    )}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Aucune échéance enregistrée.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
              <p className="text-3xl font-black text-slate-950">
                {daysRemaining !== null ? Math.max(daysRemaining, 0) : "—"}
              </p>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                jour{(daysRemaining ?? 0) > 1 ? "s" : ""} restant
                {(daysRemaining ?? 0) > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {subscription?.status === "blocked" && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              Accès à la plateforme bloqué par Aksantic Technology
              {subscription.blocked_reason
                ? ` : ${subscription.blocked_reason}`
                : "."}{" "}
              Réglez votre abonnement ci-dessous puis contactez-nous pour la
              réactivation.
            </div>
          )}
        </section>

        {/* Moyens de paiement */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Moyens de paiement
              </h2>
              <p className="text-sm text-slate-500">
                Payez via l’un de ces canaux puis déclarez votre paiement
                ci-dessous.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
                <Smartphone className="h-4 w-4 text-blue-700" />
                Mobile money
              </p>

              {paymentSettings?.mobile_money_options?.length ? (
                <ul className="space-y-3">
                  {paymentSettings.mobile_money_options.map((option, index) => (
                    <li
                      key={`mm-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {option.provider}
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {option.number}
                      </p>
                      {option.holderName && (
                        <p className="text-xs text-slate-500">
                          {option.holderName}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  Aucun numéro mobile money configuré pour le moment.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
                <CreditCard className="h-4 w-4 text-blue-700" />
                Virement / carte bancaire
              </p>

              {paymentSettings?.bank_options?.length ? (
                <ul className="space-y-3">
                  {paymentSettings.bank_options.map((option, index) => (
                    <li
                      key={`bank-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {option.bankName}
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {option.accountNumber}
                      </p>
                      {option.accountName && (
                        <p className="text-xs text-slate-500">
                          {option.accountName}
                        </p>
                      )}
                      {option.notes && (
                        <p className="mt-1 text-xs text-slate-400">
                          {option.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  Aucun compte bancaire configuré pour le moment.
                </p>
              )}

              {paymentSettings?.card_instructions && (
                <p className="mt-3 rounded-2xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                  {paymentSettings.card_instructions}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Déclaration de paiement (owner/manager uniquement) */}
        {canManage && (
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <h2 className="mb-4 text-xl font-black text-slate-950">
              Déclarer un paiement
            </h2>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Moyen utilisé
                  </span>
                  <select
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as SubscriptionPaymentMethod)
                    }
                    className="form-input"
                  >
                    <option value="mobile_money">Mobile money</option>
                    <option value="bank_transfer">Virement bancaire</option>
                    <option value="bank_card">Carte bancaire</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Montant payé (optionnel)
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="form-input"
                    />
                    <select
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="form-input w-28"
                    >
                      <option value="USD">USD</option>
                      <option value="CDF">CDF</option>
                    </select>
                  </div>
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Référence / numéro utilisé
                  </span>
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Ex. ID de transaction, numéro de téléphone..."
                    className="form-input"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Note (optionnel)
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="form-input min-h-20 resize-none"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60 md:w-auto"
              >
                <CheckCircle2 className="h-5 w-5" />
                {isSubmitting ? "Envoi..." : "J’ai payé, déclarer ce paiement"}
              </button>
            </form>
          </section>
        )}

        {/* Historique */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-950">
            <Clock className="h-5 w-5 text-slate-400" />
            Historique
          </h2>

          {history.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucun événement pour le moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {item.kind === "grant"
                        ? `Abonnement octroyé${item.period_days ? ` (${item.period_days} jours)` : ""}`
                        : `Paiement déclaré${item.method ? ` · ${methodLabels[item.method]}` : ""}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString("fr-CD")}
                      {item.amount ? ` · ${item.amount} ${item.currency || "USD"}` : ""}
                      {item.reference ? ` · Réf. ${item.reference}` : ""}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${
                      item.status === "approved"
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : item.status === "rejected"
                          ? "border-red-100 bg-red-50 text-red-700"
                          : "border-amber-100 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.status === "approved"
                      ? "Approuvé"
                      : item.status === "rejected"
                        ? "Rejeté"
                        : "En attente"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
