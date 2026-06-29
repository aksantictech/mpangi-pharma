"use client";

import { useEffect, useState } from "react";
import { Plus, Save, X } from "lucide-react";

import {
  createProductWithInitialBatch,
  getProductCategories,
  getSuppliers,
  type ProductCategory,
  type Supplier,
} from "@/services/products.service";

type AddProductDialogProps = {
  pharmacyId: string;
  onCreated: () => void;
};

type ProductFormState = {
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
  batchNumber: string;
  expiryDate: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: string;
};

const initialForm: ProductFormState = {
  name: "",
  genericName: "",
  categoryId: "",
  dosage: "",
  form: "",
  unit: "boîte",
  barcode: "",
  manufacturer: "",
  supplierId: "",
  minStock: "0",
  requiresPrescription: false,
  batchNumber: "",
  expiryDate: "",
  purchasePrice: "0",
  sellingPrice: "0",
  quantity: "0",
};

export default function AddProductDialog({
  pharmacyId,
  onCreated,
}: AddProductDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(initialForm);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    async function loadOptions() {
      try {
        const [categoriesData, suppliersData] = await Promise.all([
          getProductCategories(pharmacyId),
          getSuppliers(pharmacyId),
        ]);

        setCategories(categoriesData);
        setSuppliers(suppliersData);
      } catch {
        setErrorMessage("Impossible de charger les catégories et fournisseurs.");
      }
    }

    loadOptions();
  }, [isOpen, pharmacyId]);

  function updateField<K extends keyof ProductFormState>(
    field: K,
    value: ProductFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    try {
      const quantity = Number(form.quantity || 0);

      if (!form.name.trim()) {
        throw new Error("Le nom du produit est obligatoire.");
      }

      if (quantity > 0 && !form.expiryDate) {
        throw new Error(
          "La date d’expiration est obligatoire si le stock initial est supérieur à zéro."
        );
      }

      await createProductWithInitialBatch({
        pharmacyId,
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
        batchNumber: form.batchNumber,
        expiryDate: form.expiryDate,
        purchasePrice: Number(form.purchasePrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
        quantity,
      });

      setForm(initialForm);
      setIsOpen(false);
      onCreated();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant la création du produit."
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
        className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
      >
        <Plus className="h-5 w-5" />
        Ajouter un produit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Ajouter un produit
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Créez le produit et, si nécessaire, son premier lot en stock.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
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

            <form onSubmit={handleSubmit} className="space-y-8">
              <section>
                <h3 className="mb-4 font-black text-slate-900">
                  Informations du médicament / intrant
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField label="Nom commercial *">
                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      className="form-input"
                      placeholder="Ex : Paracétamol"
                      required
                    />
                  </FormField>

                  <FormField label="DCI / Molécule">
                    <input
                      value={form.genericName}
                      onChange={(event) =>
                        updateField("genericName", event.target.value)
                      }
                      className="form-input"
                      placeholder="Ex : Acétaminophène"
                    />
                  </FormField>

                  <FormField label="Catégorie">
                    <select
                      value={form.categoryId}
                      onChange={(event) =>
                        updateField("categoryId", event.target.value)
                      }
                      className="form-input"
                    >
                      <option value="">Non classé</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Dosage">
                    <input
                      value={form.dosage}
                      onChange={(event) =>
                        updateField("dosage", event.target.value)
                      }
                      className="form-input"
                      placeholder="Ex : 500mg"
                    />
                  </FormField>

                  <FormField label="Forme">
                    <input
                      value={form.form}
                      onChange={(event) =>
                        updateField("form", event.target.value)
                      }
                      className="form-input"
                      placeholder="Ex : comprimé"
                    />
                  </FormField>

                  <FormField label="Unité">
                    <select
                      value={form.unit}
                      onChange={(event) =>
                        updateField("unit", event.target.value)
                      }
                      className="form-input"
                    >
                      <option value="boîte">Boîte</option>
                      <option value="plaquette">Plaquette</option>
                      <option value="comprimé">Comprimé</option>
                      <option value="flacon">Flacon</option>
                      <option value="ampoule">Ampoule</option>
                      <option value="sachet">Sachet</option>
                      <option value="pièce">Pièce</option>
                    </select>
                  </FormField>

                  <FormField label="Code-barres">
                    <input
                      value={form.barcode}
                      onChange={(event) =>
                        updateField("barcode", event.target.value)
                      }
                      className="form-input"
                      placeholder="Scanner ou saisir"
                    />
                  </FormField>

                  <FormField label="Fabricant">
                    <input
                      value={form.manufacturer}
                      onChange={(event) =>
                        updateField("manufacturer", event.target.value)
                      }
                      className="form-input"
                      placeholder="Ex : fabricant"
                    />
                  </FormField>

                  <FormField label="Seuil stock faible">
                    <input
                      type="number"
                      min="0"
                      value={form.minStock}
                      onChange={(event) =>
                        updateField("minStock", event.target.value)
                      }
                      className="form-input"
                    />
                  </FormField>
                </div>

                <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.requiresPrescription}
                    onChange={(event) =>
                      updateField("requiresPrescription", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Produit nécessitant une ordonnance
                </label>
              </section>

              <section>
                <h3 className="mb-4 font-black text-slate-900">
                  Premier lot / stock initial
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField label="Fournisseur">
                    <select
                      value={form.supplierId}
                      onChange={(event) =>
                        updateField("supplierId", event.target.value)
                      }
                      className="form-input"
                    >
                      <option value="">Aucun fournisseur</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Numéro de lot">
                    <input
                      value={form.batchNumber}
                      onChange={(event) =>
                        updateField("batchNumber", event.target.value)
                      }
                      className="form-input"
                      placeholder="Ex : LOT-2026-001"
                    />
                  </FormField>

                  <FormField label="Date d’expiration">
                    <input
                      type="date"
                      value={form.expiryDate}
                      onChange={(event) =>
                        updateField("expiryDate", event.target.value)
                      }
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Prix d’achat">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.purchasePrice}
                      onChange={(event) =>
                        updateField("purchasePrice", event.target.value)
                      }
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Prix de vente">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.sellingPrice}
                      onChange={(event) =>
                        updateField("sellingPrice", event.target.value)
                      }
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Quantité initiale">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={(event) =>
                        updateField("quantity", event.target.value)
                      }
                      className="form-input"
                    />
                  </FormField>
                </div>
              </section>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-5 w-5" />
                  {isLoading ? "Enregistrement..." : "Enregistrer"}
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