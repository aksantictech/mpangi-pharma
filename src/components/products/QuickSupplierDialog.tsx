"use client";

import { useState, type FormEvent } from "react";
import { Plus, Save, X } from "lucide-react";

import {
  createSupplier,
  type Supplier,
} from "@/services/products.service";

type QuickSupplierDialogProps = {
  pharmacyId: string;
  onCreated: (supplier: Supplier) => void;
};

type SupplierFormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
};

const initialForm: SupplierFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  contactPerson: "",
};

export default function QuickSupplierDialog({
  pharmacyId,
  onCreated,
}: QuickSupplierDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<SupplierFormState>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField<K extends keyof SupplierFormState>(
    field: K,
    value: SupplierFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function closeDialog() {
    setIsOpen(false);
    setForm(initialForm);
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!form.name.trim()) {
        throw new Error("Le nom du fournisseur est obligatoire.");
      }

      const supplier = await createSupplier({
        pharmacyId,
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        contactPerson: form.contactPerson,
      });

      onCreated(supplier);
      closeDialog();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de créer le fournisseur."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
      >
        <Plus className="h-4 w-4" />
        Nouveau fournisseur
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Nouveau fournisseur
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Créez rapidement un fournisseur sans quitter le formulaire
                  produit.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
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
              <FormField label="Nom fournisseur *">
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="form-input"
                  placeholder="Ex : Fournisseur principal"
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Téléphone">
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    className="form-input"
                    placeholder="+243..."
                  />
                </FormField>

                <FormField label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    className="form-input"
                    placeholder="contact@fournisseur.com"
                  />
                </FormField>
              </div>

              <FormField label="Personne de contact">
                <input
                  value={form.contactPerson}
                  onChange={(event) =>
                    updateField("contactPerson", event.target.value)
                  }
                  className="form-input"
                  placeholder="Nom du contact"
                />
              </FormField>

              <FormField label="Adresse">
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  className="form-input min-h-24"
                  placeholder="Adresse du fournisseur"
                />
              </FormField>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-5 w-5" />
                  {isLoading ? "Création..." : "Créer fournisseur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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