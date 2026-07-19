"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Calculator, PackagePlus, Save, X } from "lucide-react";

import QuickSupplierDialog from "@/components/products/QuickSupplierDialog";

import {
  addProductBatch,
  getSuppliers,
  type Supplier,
} from "@/services/products.service";
import {
  calculateAutomaticSellingPrice,
  getProductPricingContext,
} from "@/services/pricing.service";

import type { PricingRoundingMode, ProductStockSummary } from "@/types/product";

type AddBatchDialogProps = {
  pharmacyId: string;
  product: ProductStockSummary;
  onCreated: () => void;
};

type BatchFormState = {
  supplierId: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: string;
  autoPricingEnabled: boolean;
  pricingCoefficient: string;
  roundingMode: PricingRoundingMode;
};

const initialForm: BatchFormState = {
  supplierId: "",
  batchNumber: "",
  expiryDate: "",
  purchasePrice: "0",
  sellingPrice: "0",
  quantity: "1",
  autoPricingEnabled: false,
  pricingCoefficient: "1",
  roundingMode: "none",
};

export default function AddBatchDialog({
  pharmacyId,
  product,
  onCreated,
}: AddBatchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<BatchFormState>(initialForm);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    async function loadSuppliers() {
      setErrorMessage("");

      try {
        const [supplierData, pricingContext] = await Promise.all([
          getSuppliers(pharmacyId),
          getProductPricingContext(pharmacyId, product.product_id),
        ]);

        setSuppliers(supplierData);

        const coefficient =
          pricingContext.pricing_coefficient ??
          pricingContext.pricing_rule?.coefficient ??
          1;

        const roundingMode =
          pricingContext.pricing_rule?.rounding_mode ?? "none";

        setForm((current) => ({
          ...current,
          autoPricingEnabled: pricingContext.auto_pricing_enabled,
          pricingCoefficient: String(coefficient),
          roundingMode,
          sellingPrice: pricingContext.auto_pricing_enabled
            ? String(
                calculateAutomaticSellingPrice({
                  purchasePrice: Number(current.purchasePrice || 0),
                  coefficient,
                  roundingMode,
                })
              )
            : current.sellingPrice,
        }));
      } catch {
        setErrorMessage("Impossible de charger les fournisseurs.");
      }
    }

    loadSuppliers();
  }, [isOpen, pharmacyId]);

  function updateField<K extends keyof BatchFormState>(
    field: K,
    value: BatchFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePurchasePrice(value: string) {
    setForm((current) => {
      const next = {
        ...current,
        purchasePrice: value,
      };

      if (current.autoPricingEnabled) {
        next.sellingPrice = String(
          calculateAutomaticSellingPrice({
            purchasePrice: Number(value || 0),
            coefficient: Number(current.pricingCoefficient || 0),
            roundingMode: current.roundingMode,
          })
        );
      }

      return next;
    });
  }

  function updateCoefficient(value: string) {
    setForm((current) => ({
      ...current,
      pricingCoefficient: value,
      sellingPrice: current.autoPricingEnabled
        ? String(
            calculateAutomaticSellingPrice({
              purchasePrice: Number(current.purchasePrice || 0),
              coefficient: Number(value || 0),
              roundingMode: current.roundingMode,
            })
          )
        : current.sellingPrice,
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
      const quantity = Number(form.quantity || 0);
      const purchasePrice = Number(form.purchasePrice || 0);
      const sellingPrice = Number(form.sellingPrice || 0);

      if (quantity <= 0) {
        throw new Error("La quantité du lot doit être supérieure à zéro.");
      }

      if (!form.expiryDate) {
        throw new Error("La date d’expiration est obligatoire.");
      }

      if (sellingPrice <= 0) {
        throw new Error("Le prix de vente doit être supérieur à zéro.");
      }

      await addProductBatch({
        pharmacyId,
        productId: product.product_id,
        supplierId: form.supplierId,
        batchNumber: form.batchNumber,
        expiryDate: form.expiryDate,
        purchasePrice,
        sellingPrice,
        quantity,
      });

      closeDialog();
      onCreated();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’ajouter le lot."
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
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
      >
        <PackagePlus className="h-4 w-4" />
        Ajouter lot
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Ajouter un nouveau lot
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Produit :{" "}
                  <span className="font-black text-slate-800">
                    {product.name}
                  </span>
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {[product.generic_name, product.dosage, product.form]
                    .filter(Boolean)
                    .join(" · ") || "Détails non renseignés"}
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="block text-sm font-bold text-slate-700">
                      Fournisseur
                    </span>

                    <QuickSupplierDialog
                      pharmacyId={pharmacyId}
                      onCreated={(supplier) => {
                        setSuppliers((current) => [...current, supplier]);
                        updateField("supplierId", supplier.id);
                      }}
                    />
                  </div>

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
                </div>

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

                <FormField label="Date d’expiration *">
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(event) =>
                      updateField("expiryDate", event.target.value)
                    }
                    className={`form-input ${
                      form.autoPricingEnabled ? "bg-slate-100" : ""
                    }`}
                    readOnly={form.autoPricingEnabled}
                    required
                  />
                </FormField>

                <FormField label="Quantité *">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantity}
                    onChange={(event) =>
                      updateField("quantity", event.target.value)
                    }
                    className="form-input"
                    required
                  />
                </FormField>

                <div className="md:col-span-2 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <Calculator className="mt-0.5 h-5 w-5 text-blue-700" />
                    <div className="flex-1">
                      <label className="flex items-center gap-3 text-sm font-black text-blue-900">
                        <input
                          type="checkbox"
                          checked={form.autoPricingEnabled}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              autoPricingEnabled: event.target.checked,
                              sellingPrice: event.target.checked
                                ? String(
                                    calculateAutomaticSellingPrice({
                                      purchasePrice: Number(
                                        current.purchasePrice || 0
                                      ),
                                      coefficient: Number(
                                        current.pricingCoefficient || 0
                                      ),
                                      roundingMode: current.roundingMode,
                                    })
                                  )
                                : current.sellingPrice,
                            }))
                          }
                          className="h-4 w-4 rounded border-blue-300"
                        />
                        Calcul automatique du prix de vente
                      </label>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label>
                          <span className="mb-2 block text-xs font-bold text-blue-800">
                            Coefficient
                          </span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={form.pricingCoefficient}
                            onChange={(event) =>
                              updateCoefficient(event.target.value)
                            }
                            className="form-input bg-white"
                          />
                        </label>

                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs font-bold text-slate-500">
                            Prix calculé
                          </p>
                          <p className="mt-1 text-lg font-black text-blue-800">
                            {Number(form.sellingPrice || 0).toLocaleString(
                              "fr-CD"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <FormField label="Prix d’achat">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchasePrice}
                    onChange={(event) =>
                      updatePurchasePrice(event.target.value)
                    }
                    className="form-input"
                  />
                </FormField>

                <FormField label="Prix de vente *">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(event) =>
                      updateField("sellingPrice", event.target.value)
                    }
                    className="form-input"
                    required
                  />
                </FormField>
              </div>

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
                  {isLoading ? "Enregistrement..." : "Enregistrer le lot"}
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
  children: ReactNode;
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