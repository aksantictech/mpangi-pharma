"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Save, X } from "lucide-react";

import BarcodeField from "@/components/products/BarcodeField";
import {
  getProductById,
  getProductCategories,
  getSuppliers,
  updateProduct,
  type ProductCategory,
  type Supplier,
} from "@/services/products.service";

import type { VatRate } from "@/types/product";

type EditProductDialogProps = {
  pharmacyId: string;
  /** Produit à corriger ; `null` = boîte fermée. */
  productId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  genericName: string;
  categoryId: string;
  dosage: string;
  form: string;
  unit: string;
  barcode: string;
  manufacturer: string;
  supplierId: string;
  minStock: string;
  requiresPrescription: boolean;
  vatApplicable: boolean;
  vatRate: VatRate;
  description: string;
};

const defaultUnitOptions = [
  "boîte",
  "plaquette",
  "comprimé",
  "gélule",
  "capsule",
  "flacon",
  "ampoule",
  "sachet",
  "tube",
  "pièce",
  "paquet",
  "pot",
  "bouteille",
  "bidon",
  "carton",
  "rouleau",
  "kit",
  "litre",
  "ml",
];

export default function EditProductDialog({
  pharmacyId,
  productId,
  onClose,
  onSaved,
}: EditProductDialogProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!productId) return;

    let isMounted = true;

    async function load(id: string) {
      try {
        const [product, categoriesData, suppliersData] = await Promise.all([
          getProductById({ pharmacyId, productId: id }),
          getProductCategories(pharmacyId),
          getSuppliers(pharmacyId),
        ]);

        if (!isMounted) return;

        setCategories(categoriesData);
        setSuppliers(suppliersData);
        setForm({
          name: product.name ?? "",
          genericName: product.generic_name ?? "",
          categoryId: product.category_id ?? "",
          dosage: product.dosage ?? "",
          form: product.form ?? "",
          unit: product.unit || "boîte",
          barcode: product.barcode ?? "",
          manufacturer: product.manufacturer ?? "",
          supplierId: product.default_supplier_id ?? "",
          minStock: String(product.min_stock ?? 0),
          requiresPrescription: Boolean(product.requires_prescription),
          vatApplicable: Boolean(product.vat_applicable),
          vatRate: (product.vat_rate ?? 0) as VatRate,
          description: product.description ?? "",
        });
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger ce produit."
        );
      }
    }

    void load(productId);

    return () => {
      isMounted = false;
      // Le dialogue est réutilisé pour le produit suivant : on repart à vide.
      setForm(null);
      setErrorMessage("");
    };
  }, [productId, pharmacyId]);

  if (!productId) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form || !productId) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      await updateProduct({
        pharmacyId,
        productId,
        name: form.name,
        genericName: form.genericName,
        categoryId: form.categoryId,
        dosage: form.dosage,
        form: form.form,
        unit: form.unit,
        barcode: form.barcode,
        manufacturer: form.manufacturer,
        supplierId: form.supplierId,
        minStock: Number(form.minStock || 0),
        requiresPrescription: form.requiresPrescription,
        vatApplicable: form.vatApplicable,
        vatRate: form.vatRate,
        description: form.description,
      });

      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer les modifications."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const unitOptions = Array.from(
    new Set([...defaultUnitOptions, form?.unit ?? ""].filter(Boolean))
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 px-3 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Modifier le produit"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl md:rounded-[2rem] md:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950 md:text-2xl">
              Modifier le produit
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Corrigez le nom ou les options. Les prix et les quantités se
              gèrent dans les lots et ne sont pas modifiés ici.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {!form ? (
          !errorMessage && (
            <p className="py-8 text-center text-sm font-semibold text-slate-500">
              Chargement du produit...
            </p>
          )
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nom du produit *">
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  className="form-input"
                  required
                  maxLength={160}
                />
              </Field>

              <Field label="DCI / Nom générique">
                <input
                  value={form.genericName}
                  onChange={(event) =>
                    update("genericName", event.target.value)
                  }
                  className="form-input"
                />
              </Field>

              <Field label="Dosage">
                <input
                  value={form.dosage}
                  onChange={(event) => update("dosage", event.target.value)}
                  className="form-input"
                  placeholder="Ex : 500 mg"
                />
              </Field>

              <Field label="Forme / Présentation">
                <input
                  value={form.form}
                  onChange={(event) => update("form", event.target.value)}
                  className="form-input"
                  placeholder="Ex : comprimé, sirop"
                />
              </Field>

              <Field label="Unité / Conditionnement">
                <select
                  value={form.unit}
                  onChange={(event) => update("unit", event.target.value)}
                  className="form-input"
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Code-barres">
                <BarcodeField
                  value={form.barcode}
                  onChange={(value) => update("barcode", value)}
                />
              </Field>

              <Field label="Catégorie">
                <select
                  value={form.categoryId}
                  onChange={(event) => update("categoryId", event.target.value)}
                  className="form-input"
                >
                  <option value="">Sans catégorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Fournisseur par défaut">
                <select
                  value={form.supplierId}
                  onChange={(event) => update("supplierId", event.target.value)}
                  className="form-input"
                >
                  <option value="">Aucun</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Fabricant">
                <input
                  value={form.manufacturer}
                  onChange={(event) =>
                    update("manufacturer", event.target.value)
                  }
                  className="form-input"
                />
              </Field>

              <Field label="Seuil de stock minimum">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.minStock}
                  onChange={(event) => update("minStock", event.target.value)}
                  className="form-input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.requiresPrescription}
                  onChange={(event) =>
                    update("requiresPrescription", event.target.checked)
                  }
                  className="h-5 w-5 accent-blue-700"
                />
                <span className="text-sm font-bold text-slate-700">
                  Vendu sur ordonnance
                </span>
              </label>

              <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.vatApplicable}
                    onChange={(event) =>
                      update("vatApplicable", event.target.checked)
                    }
                    className="h-5 w-5 accent-blue-700"
                  />
                  <span className="text-sm font-bold text-slate-700">
                    TVA applicable
                  </span>
                </label>

                {form.vatApplicable && (
                  <select
                    value={form.vatRate}
                    onChange={(event) =>
                      update("vatRate", Number(event.target.value) as VatRate)
                    }
                    aria-label="Taux de TVA"
                    className="form-input ml-auto w-28 py-2"
                  >
                    <option value={5}>5 %</option>
                    <option value={16}>16 %</option>
                    <option value={0}>0 %</option>
                  </select>
                )}
              </div>
            </div>

            <Field label="Description (optionnel)">
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                className="form-input min-h-20 resize-none"
              />
            </Field>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800 disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
