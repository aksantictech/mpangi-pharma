"use client";

import { useEffect, useState } from "react";
import { Building2, Layers3, Plus, RefreshCcw, Save } from "lucide-react";

import {
  createProductCategory,
  createSupplier,
  getProductCategories,
  getSuppliers,
  type ProductCategory,
  type Supplier,
} from "@/services/products.service";

type ProductSetupPanelProps = {
  pharmacyId: string;
  onChanged?: () => void;
};

const categoryColors = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#ea580c",
  "#9333ea",
  "#0891b2",
  "#475569",
  "#db2777",
];

export default function ProductSetupPanel({
  pharmacyId,
  onChanged,
}: ProductSetupPanelProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState("#2563eb");

  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [categoriesData, suppliersData] = await Promise.all([
        getProductCategories(pharmacyId),
        getSuppliers(pharmacyId),
      ]);

      setCategories(categoriesData);
      setSuppliers(suppliersData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les catégories et fournisseurs."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [pharmacyId]);

  async function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSavingCategory(true);
    setErrorMessage("");

    try {
      if (!categoryName.trim()) {
        throw new Error("Le nom de la catégorie est obligatoire.");
      }

      await createProductCategory({
        pharmacyId,
        name: categoryName,
        description: categoryDescription,
        color: categoryColor,
      });

      setCategoryName("");
      setCategoryDescription("");
      setCategoryColor("#2563eb");

      await loadData();
      onChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de créer la catégorie."
      );
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleCreateSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSavingSupplier(true);
    setErrorMessage("");

    try {
      if (!supplierName.trim()) {
        throw new Error("Le nom du fournisseur est obligatoire.");
      }

      await createSupplier({
        pharmacyId,
        name: supplierName,
        phone: supplierPhone,
        email: supplierEmail,
        address: supplierAddress,
      });

      setSupplierName("");
      setSupplierPhone("");
      setSupplierEmail("");
      setSupplierAddress("");

      await loadData();
      onChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de créer le fournisseur."
      );
    } finally {
      setIsSavingSupplier(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Paramètres produits
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ajoutez les catégories et fournisseurs utilisés dans les fiches
            produits.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw className="h-5 w-5" />
          Actualiser
        </button>
      </div>

      {errorMessage && (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Layers3 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-black text-slate-950">Catégories</h3>
              <p className="text-sm text-slate-500">
                {isLoading
                  ? "Chargement..."
                  : `${categories.length} catégorie(s)`}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                className="form-input"
                placeholder="Ex : Antipaludiques"
              />

              <input
                value={categoryDescription}
                onChange={(event) =>
                  setCategoryDescription(event.target.value)
                }
                className="form-input"
                placeholder="Description optionnelle"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {categoryColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCategoryColor(color)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    categoryColor === color
                      ? "border-slate-950"
                      : "border-white"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Couleur ${color}`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isSavingCategory}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-5 w-5" />
              {isSavingCategory ? "Ajout..." : "Ajouter catégorie"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">
                Aucune catégorie créée.
              </p>
            ) : (
              categories.slice(0, 12).map((category) => (
                <span
                  key={category.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: category.color || "#2563eb" }}
                  />
                  {category.name}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-black text-slate-950">Fournisseurs</h3>
              <p className="text-sm text-slate-500">
                {isLoading
                  ? "Chargement..."
                  : `${suppliers.length} fournisseur(s)`}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                className="form-input"
                placeholder="Nom fournisseur"
              />

              <input
                value={supplierPhone}
                onChange={(event) => setSupplierPhone(event.target.value)}
                className="form-input"
                placeholder="Téléphone"
              />

              <input
                type="email"
                value={supplierEmail}
                onChange={(event) => setSupplierEmail(event.target.value)}
                className="form-input"
                placeholder="Email"
              />

              <input
                value={supplierAddress}
                onChange={(event) => setSupplierAddress(event.target.value)}
                className="form-input"
                placeholder="Adresse"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSupplier}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {isSavingSupplier ? "Ajout..." : "Ajouter fournisseur"}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {suppliers.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">
                Aucun fournisseur créé.
              </p>
            ) : (
              suppliers.slice(0, 6).map((supplier) => (
                <div
                  key={supplier.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="font-black text-slate-900">{supplier.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {supplier.phone || "Téléphone non renseigné"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}