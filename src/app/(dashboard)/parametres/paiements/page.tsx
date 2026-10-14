"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Landmark,
  Lock,
  Pencil,
  Plus,
  Power,
  Save,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import SettingsPageShell from "@/components/settings/SettingsPageShell";
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  paymentKindLabels,
  setPaymentMethodActive,
  updatePaymentMethod,
} from "@/services/payment-methods.service";

import type { PaymentMethodKind, PharmacyPaymentMethod } from "@/types/kit";
import type { PharmacyWithRole } from "@/types/pharmacy";

const standardMethods = [
  "Cash CDF",
  "Cash USD",
  "Mobile Money",
  "Carte",
  "Crédit client",
  "Paiement mixte",
];

const kindIcons: Record<PaymentMethodKind, typeof Building2> = {
  convention: Building2,
  mobile: Smartphone,
  bank: Landmark,
  other: Wallet,
};

export default function PaymentSettingsPage() {
  return (
    <SettingsPageShell
      title="Modes de paiement"
      description="Ajoutez les sociétés conventionnées et autres modes de paiement : ils apparaissent dans la caisse, sur les factures et dans les rapports financiers."
      icon={Wallet}
    >
      {(pharmacy) => <PaymentMethodsManager pharmacy={pharmacy} />}
    </SettingsPageShell>
  );
}

type FormState = {
  id: string | null;
  name: string;
  kind: PaymentMethodKind;
  notes: string;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  kind: "convention",
  notes: "",
};

function PaymentMethodsManager({ pharmacy }: { pharmacy: PharmacyWithRole }) {
  const [methods, setMethods] = useState<PharmacyPaymentMethod[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setMethods(await getPaymentMethods(pharmacy.id));
      setErrorMessage("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Chargement impossible.";

      setErrorMessage(
        /pharmacy_payment_methods/.test(message)
          ? "La base de données doit être mise à jour : exécutez la migration 0004_pricing_payments_first_aid.sql dans Supabase."
          : message
      );
    } finally {
      setIsLoading(false);
    }
  }, [pharmacy.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(action: () => Promise<void>, success: string, id?: string) {
    setBusyId(id ?? null);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await action();
      setSuccessMessage(success);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Action impossible."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrorMessage("Le nom est obligatoire.");
      return;
    }

    setIsSaving(true);

    await run(
      async () => {
        if (form.id) {
          await updatePaymentMethod(form.id, {
            name: form.name,
            kind: form.kind,
            notes: form.notes,
          });
        } else {
          await createPaymentMethod({
            pharmacyId: pharmacy.id,
            name: form.name,
            kind: form.kind,
            notes: form.notes,
          });
        }

        setForm(emptyForm);
      },
      form.id ? "Mode de paiement modifié." : "Mode de paiement ajouté."
    );

    setIsSaving(false);
  }

  function handleDelete(method: PharmacyPaymentMethod) {
    const confirmed = window.confirm(
      `Supprimer « ${method.name} » ?\n\nLes ventes déjà enregistrées gardent ce nom. Vous pouvez aussi simplement le désactiver.`
    );

    if (!confirmed) return;

    void run(
      () => deletePaymentMethod(method.id),
      "Mode de paiement supprimé.",
      method.id
    );
  }

  return (
    <>
      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
        <h2 className="text-lg font-black text-slate-950">
          {form.id ? "Modifier le mode de paiement" : "Ajouter un mode de paiement"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Nom *
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex. Société Anonyme X, Assurance Y…"
                className="form-input"
                maxLength={80}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Type
              </span>
              <select
                value={form.kind}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kind: event.target.value as PaymentMethodKind,
                  }))
                }
                className="form-input"
              >
                {(Object.keys(paymentKindLabels) as PaymentMethodKind[]).map(
                  (kind) => (
                    <option key={kind} value={kind}>
                      {paymentKindLabels[kind]}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Note (optionnel)
            </span>
            <input
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Ex. convention n° 123, prise en charge à 80 %"
              className="form-input"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {form.id ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {isSaving ? "Enregistrement..." : form.id ? "Enregistrer" : "Ajouter"}
            </button>

            {form.id && (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
              >
                <X className="h-5 w-5" />
                Annuler
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Les ventes à une société conventionnée sont enregistrées comme
            créances (« Crédit ») et ventilées par nom dans les rapports.
          </p>
        </form>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
        <h2 className="text-lg font-black text-slate-950">Liste des modes</h2>

        <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">
          Modes par défaut (toujours disponibles)
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {standardMethods.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600"
            >
              <Lock className="h-3 w-3" />
              {name}
            </span>
          ))}
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-wide text-slate-400">
          Vos modes personnalisés
        </p>

        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Chargement...</p>
        ) : methods.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Aucun mode personnalisé. Ajoutez votre première société
            conventionnée avec le formulaire ci-dessus.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {methods.map((method) => {
              const Icon = kindIcons[method.kind] ?? Wallet;
              const busy = busyId === method.id;

              return (
                <li
                  key={method.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    method.is_active
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50 opacity-70"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {method.name}
                        {!method.is_active && (
                          <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                            Désactivé
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {paymentKindLabels[method.kind]}
                        {method.notes ? ` · ${method.notes}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      title="Modifier"
                      disabled={busy}
                      onClick={() =>
                        setForm({
                          id: method.id,
                          name: method.name,
                          kind: method.kind,
                          notes: method.notes ?? "",
                        })
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={method.is_active ? "Désactiver" : "Réactiver"}
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            setPaymentMethodActive(method.id, !method.is_active),
                          method.is_active
                            ? "Mode désactivé : il n'apparaît plus en caisse."
                            : "Mode réactivé.",
                          method.id
                        )
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {method.is_active ? (
                        <Power className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Supprimer"
                      disabled={busy}
                      onClick={() => handleDelete(method)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
