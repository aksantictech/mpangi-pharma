"use client";

import { useEffect, useState } from "react";
import { Banknote, Plus, Save, Trash2 } from "lucide-react";

import { updateAdminPaymentSettings } from "@/services/admin-pharmacies.service";

import type {
  BankOption,
  MobileMoneyOption,
  PlatformPaymentSettings,
} from "@/types/subscription";

type PaymentSettingsCardProps = {
  settings: PlatformPaymentSettings | null;
  onUpdated: (settings: PlatformPaymentSettings) => void;
};

export default function PaymentSettingsCard({
  settings,
  onUpdated,
}: PaymentSettingsCardProps) {
  const [mobileMoneyOptions, setMobileMoneyOptions] = useState<
    MobileMoneyOption[]
  >([]);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [cardInstructions, setCardInstructions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMoneyOptions(settings?.mobile_money_options ?? []);
    setBankOptions(settings?.bank_options ?? []);
    setCardInstructions(settings?.card_instructions ?? "");
  }, [settings]);

  function updateMobileMoney(
    index: number,
    field: keyof MobileMoneyOption,
    value: string
  ) {
    setMobileMoneyOptions((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function updateBank(index: number, field: keyof BankOption, value: string) {
    setBankOptions((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const cleanedMobileMoney = mobileMoneyOptions.filter(
        (item) => item.provider.trim() && item.number.trim()
      );
      const cleanedBank = bankOptions.filter(
        (item) => item.bankName.trim() && item.accountNumber.trim()
      );

      const result = await updateAdminPaymentSettings({
        mobileMoneyOptions: cleanedMobileMoney,
        bankOptions: cleanedBank,
        cardInstructions,
      });

      onUpdated(result);
      setSuccessMessage("Moyens de paiement enregistrés.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer les moyens de paiement."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Banknote className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Moyens de paiement de la plateforme
          </h2>
          <p className="text-sm text-slate-500">
            Affichés aux pharmacies sur leur page Abonnement.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Mobile money */}
        <div>
          <p className="mb-3 text-sm font-black text-slate-950">
            Numéros mobile money
          </p>

          <div className="space-y-3">
            {mobileMoneyOptions.map((option, index) => (
              <div
                key={`mm-${index}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={option.provider}
                    onChange={(event) =>
                      updateMobileMoney(index, "provider", event.target.value)
                    }
                    placeholder="Fournisseur (Airtel Money...)"
                    className="form-input"
                  />
                  <input
                    value={option.number}
                    onChange={(event) =>
                      updateMobileMoney(index, "number", event.target.value)
                    }
                    placeholder="Numéro"
                    className="form-input"
                  />
                </div>
                <input
                  value={option.holderName ?? ""}
                  onChange={(event) =>
                    updateMobileMoney(index, "holderName", event.target.value)
                  }
                  placeholder="Nom du titulaire (optionnel)"
                  className="form-input mt-2"
                />
                <button
                  type="button"
                  onClick={() =>
                    setMobileMoneyOptions((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                  className="mt-2 inline-flex items-center gap-1 text-xs font-black text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Retirer
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileMoneyOptions((current) => [
                ...current,
                { provider: "", number: "", holderName: "" },
              ])
            }
            className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Ajouter un numéro
          </button>
        </div>

        {/* Bank */}
        <div>
          <p className="mb-3 text-sm font-black text-slate-950">
            Comptes bancaires / carte
          </p>

          <div className="space-y-3">
            {bankOptions.map((option, index) => (
              <div
                key={`bank-${index}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={option.bankName}
                    onChange={(event) =>
                      updateBank(index, "bankName", event.target.value)
                    }
                    placeholder="Banque"
                    className="form-input"
                  />
                  <input
                    value={option.accountNumber}
                    onChange={(event) =>
                      updateBank(index, "accountNumber", event.target.value)
                    }
                    placeholder="Numéro de compte"
                    className="form-input"
                  />
                </div>
                <input
                  value={option.accountName}
                  onChange={(event) =>
                    updateBank(index, "accountName", event.target.value)
                  }
                  placeholder="Titulaire du compte"
                  className="form-input mt-2"
                />
                <input
                  value={option.notes ?? ""}
                  onChange={(event) =>
                    updateBank(index, "notes", event.target.value)
                  }
                  placeholder="Notes (optionnel)"
                  className="form-input mt-2"
                />
                <button
                  type="button"
                  onClick={() =>
                    setBankOptions((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                  className="mt-2 inline-flex items-center gap-1 text-xs font-black text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Retirer
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setBankOptions((current) => [
                ...current,
                { bankName: "", accountNumber: "", accountName: "", notes: "" },
              ])
            }
            className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Ajouter un compte
          </button>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          Instructions carte bancaire (optionnel)
        </span>
        <textarea
          value={cardInstructions}
          onChange={(event) => setCardInstructions(event.target.value)}
          placeholder="Ex. Lien de paiement, contact pour paiement par carte..."
          className="form-input min-h-20 resize-none"
        />
      </label>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaving}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60 md:w-auto"
      >
        <Save className="h-5 w-5" />
        {isSaving ? "Enregistrement..." : "Enregistrer les moyens de paiement"}
      </button>
    </section>
  );
}
