"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";

import {
  updateAdminPharmacy,
  type UpdateAdminPharmacyPayload,
} from "@/services/admin-pharmacies.service";

import type { AdminPharmacy } from "@/types/admin";

type PharmacyEditDialogProps = {
  pharmacy: AdminPharmacy | null;
  onClose: () => void;
  onUpdated: (pharmacy: AdminPharmacy) => void;
};

type FormState = {
  name: string;
  address: string;
  city: string;
  commune: string;
  district: string;
  province: string;
  country: string;
  phone: string;
  whatsapp: string;
  email: string;
  pharmacistName: string;
  exchangeRate: string;
  invoiceFooter: string;
};

function toFormState(pharmacy: AdminPharmacy): FormState {
  return {
    name: pharmacy.name || "",
    address: pharmacy.address || "",
    city: pharmacy.city || "",
    commune: pharmacy.commune || "",
    district: pharmacy.district || "",
    province: pharmacy.province || "",
    country: pharmacy.country || "République démocratique du Congo",
    phone: pharmacy.phone || "",
    whatsapp: pharmacy.whatsapp || "",
    email: pharmacy.email || "",
    pharmacistName: pharmacy.pharmacist_name || "",
    exchangeRate: String(pharmacy.exchange_rate ?? 2800),
    invoiceFooter: pharmacy.invoice_footer || "",
  };
}

export default function PharmacyEditDialog({
  pharmacy,
  onClose,
  onUpdated,
}: PharmacyEditDialogProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (pharmacy) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(toFormState(pharmacy));
      setErrorMessage("");
    } else {
      setForm(null);
    }
  }, [pharmacy]);

  if (!pharmacy || !form) return null;

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pharmacy || !form) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload: UpdateAdminPharmacyPayload = {
        name: form.name,
        address: form.address,
        city: form.city,
        commune: form.commune,
        district: form.district,
        province: form.province,
        country: form.country,
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email,
        pharmacistName: form.pharmacistName,
        exchangeRate: Number(form.exchangeRate || 0),
        invoiceFooter: form.invoiceFooter,
      };

      const result = await updateAdminPharmacy(pharmacy.id, payload);

      onUpdated({
        ...pharmacy,
        ...(result?.pharmacy ?? {}),
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour la pharmacie."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm md:items-center md:p-8">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white p-6 text-slate-950 shadow-2xl md:rounded-[2rem]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Super Admin
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Modifier « {pharmacy.name} »
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Nom pharmacie *">
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="form-input"
                required
              />
            </FormField>

            <FormField label="Pharmacien responsable">
              <input
                value={form.pharmacistName}
                onChange={(event) =>
                  updateField("pharmacistName", event.target.value)
                }
                className="form-input"
              />
            </FormField>

            <FormField label="Adresse">
              <input
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Ville">
              <input
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Commune">
              <input
                value={form.commune}
                onChange={(event) => updateField("commune", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Quartier">
              <input
                value={form.district}
                onChange={(event) => updateField("district", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Province">
              <input
                value={form.province}
                onChange={(event) => updateField("province", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Pays">
              <input
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Téléphone">
              <input
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="WhatsApp">
              <input
                value={form.whatsapp}
                onChange={(event) => updateField("whatsapp", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Email pharmacie">
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Taux USD → CDF">
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.exchangeRate}
                onChange={(event) =>
                  updateField("exchangeRate", event.target.value)
                }
                className="form-input"
              />
            </FormField>
          </div>

          <FormField label="Pied de facture / ticket">
            <textarea
              value={form.invoiceFooter}
              onChange={(event) =>
                updateField("invoiceFooter", event.target.value)
              }
              className="form-input min-h-20"
              placeholder="Ex : Merci pour votre confiance."
            />
          </FormField>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
