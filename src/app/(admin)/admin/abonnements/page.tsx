"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarPlus,
  CreditCard,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import PaymentSettingsCard from "@/components/admin/PaymentSettingsCard";
import SubscriptionBlockDialog from "@/components/admin/SubscriptionBlockDialog";
import SubscriptionGrantDialog from "@/components/admin/SubscriptionGrantDialog";
import {
  getAdminPaymentSettings,
  getAdminPharmacies,
  unblockPharmacySubscription,
} from "@/services/admin-pharmacies.service";

import type { AdminPharmacy } from "@/types/admin";
import type { PlatformPaymentSettings } from "@/types/subscription";
import {
  getSubscriptionDaysRemaining,
  isSubscriptionBlocking,
} from "@/types/subscription";

const statusLabels: Record<string, string> = {
  trial: "Essai",
  active: "Actif",
  expired: "Expiré",
  blocked: "Bloqué",
};

const statusTones: Record<string, string> = {
  trial: "border-blue-100 bg-blue-50 text-blue-700",
  active: "border-emerald-100 bg-emerald-50 text-emerald-700",
  expired: "border-amber-100 bg-amber-50 text-amber-700",
  blocked: "border-red-100 bg-red-50 text-red-700",
};

export default function AdminAbonnementsPage() {
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([]);
  const [paymentSettings, setPaymentSettings] =
    useState<PlatformPaymentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyPharmacyId, setBusyPharmacyId] = useState<string | null>(null);

  const [grantingPharmacy, setGrantingPharmacy] = useState<AdminPharmacy | null>(
    null
  );
  const [blockingPharmacy, setBlockingPharmacy] = useState<AdminPharmacy | null>(
    null
  );

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [pharmaciesResult, settingsResult] = await Promise.all([
        getAdminPharmacies(),
        getAdminPaymentSettings(),
      ]);

      setPharmacies(
        pharmaciesResult.filter((pharmacy) => !pharmacy.archived_at)
      );
      setPaymentSettings(settingsResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les abonnements."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  function applySubscription(
    pharmacyId: string,
    subscription: AdminPharmacy["subscription"]
  ) {
    setPharmacies((current) =>
      current.map((pharmacy) =>
        pharmacy.id === pharmacyId ? { ...pharmacy, subscription } : pharmacy
      )
    );
  }

  async function handleUnblock(pharmacy: AdminPharmacy) {
    setBusyPharmacyId(pharmacy.id);
    setErrorMessage("");

    try {
      const subscription = await unblockPharmacySubscription(pharmacy.id);
      applySubscription(pharmacy.id, subscription);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de débloquer l’abonnement."
      );
    } finally {
      setBusyPharmacyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 md:h-14 md:w-14">
                <CreditCard className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm">
                  Centre d’administration
                </p>
                <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                  Abonnements
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Octroyez, prolongez ou bloquez l’accès de chaque pharmacie à
                  la plateforme.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
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

        <PaymentSettingsCard
          settings={paymentSettings}
          onUpdated={setPaymentSettings}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-slate-400 md:rounded-[2rem]">
              Chargement...
            </div>
          ) : pharmacies.length === 0 ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-slate-400 md:rounded-[2rem]">
              Aucune pharmacie trouvée.
            </div>
          ) : (
            pharmacies.map((pharmacy) => {
              const subscription = pharmacy.subscription;
              const status = subscription?.status ?? "expired";
              const blocked = isSubscriptionBlocking(subscription);
              const daysRemaining = getSubscriptionDaysRemaining(subscription);
              const isBusy = busyPharmacyId === pharmacy.id;

              return (
                <article
                  key={pharmacy.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Building2 className="h-6 w-6" />
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${statusTones[status]}`}
                    >
                      {statusLabels[status] ?? status}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-black text-slate-950">
                    {pharmacy.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {subscription?.plan_label || "Aucun plan"}
                  </p>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-center">
                    <p className="text-2xl font-black text-slate-950">
                      {daysRemaining !== null ? Math.max(daysRemaining, 0) : "—"}
                    </p>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      jour{(daysRemaining ?? 0) > 1 ? "s" : ""} restant
                      {(daysRemaining ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>

                  {subscription?.status === "blocked" &&
                    subscription.blocked_reason && (
                      <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-700">
                        {subscription.blocked_reason}
                      </p>
                    )}

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() => setGrantingPharmacy(pharmacy)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-100"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Accorder
                    </button>

                    {status === "blocked" ? (
                      <button
                        type="button"
                        onClick={() => void handleUnblock(pharmacy)}
                        disabled={isBusy}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {isBusy ? "..." : "Débloquer"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBlockingPharmacy(pharmacy)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-black text-red-700 hover:bg-red-100"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Bloquer
                      </button>
                    )}
                  </div>

                  <p
                    className={`mt-3 flex items-center gap-1 text-xs font-bold ${
                      blocked ? "text-red-500" : "text-slate-400"
                    }`}
                  >
                    {blocked
                      ? "Accès plateforme coupé"
                      : "Accès plateforme actif"}
                  </p>
                </article>
              );
            })
          )}
        </section>
      </div>

      <SubscriptionGrantDialog
        pharmacy={grantingPharmacy}
        onClose={() => setGrantingPharmacy(null)}
        onGranted={(pharmacyId, subscription) => {
          applySubscription(pharmacyId, subscription);
          setGrantingPharmacy(null);
        }}
      />

      <SubscriptionBlockDialog
        pharmacy={blockingPharmacy}
        onClose={() => setBlockingPharmacy(null)}
        onBlocked={(pharmacyId, subscription) => {
          applySubscription(pharmacyId, subscription);
          setBlockingPharmacy(null);
        }}
      />
    </main>
  );
}
