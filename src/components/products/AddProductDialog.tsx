"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  CheckCircle2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  X,
} from "lucide-react";

import QuickSupplierDialog from "@/components/products/QuickSupplierDialog";

import {
  createProductWithInitialBatch,
  getNationalProductFilters,
  getProductCategories,
  getSuppliers,
  searchNationalProducts,
  type NationalProductFilterOptions,
  type ProductCategory,
  type Supplier,
} from "@/services/products.service";

import type { NationalProduct } from "@/types/national-product";

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
  description: string;
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
  description: "",
  batchNumber: "",
  expiryDate: "",
  purchasePrice: "0",
  sellingPrice: "0",
  quantity: "0",
};

const initialFilters: NationalProductFilterOptions = {
  therapeuticClasses: [],
  pharmaceuticalForms: [],
  packagings: [],
  targets: [],
  ammStatuses: [],
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
];

export default function AddProductDialog({
  pharmacyId,
  onCreated,
}: AddProductDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  const [form, setForm] = useState<ProductFormState>(initialForm);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [catalogueProducts, setCatalogueProducts] = useState<NationalProduct[]>(
    []
  );

  const [selectedNationalProduct, setSelectedNationalProduct] =
    useState<NationalProduct | null>(null);

  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [therapeuticClassFilter, setTherapeuticClassFilter] = useState("all");
  const [pharmaceuticalFormFilter, setPharmaceuticalFormFilter] =
    useState("all");
  const [packagingFilter, setPackagingFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [ammStatusFilter, setAmmStatusFilter] = useState("Valide");

  const [filterOptions, setFilterOptions] =
    useState<NationalProductFilterOptions>(initialFilters);

  const [isCatalogueLoading, setIsCatalogueLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const unitOptions = buildUnitOptions(form.unit);

  useEffect(() => {
    if (!isOpen) return;

    async function loadOptions() {
      setErrorMessage("");

      try {
        const [categoriesData, suppliersData, filtersData] = await Promise.all([
          getProductCategories(pharmacyId),
          getSuppliers(pharmacyId),
          getNationalProductFilters(),
        ]);

        setCategories(categoriesData);
        setSuppliers(suppliersData);
        setFilterOptions(filtersData);

        if (
          filtersData.ammStatuses.length > 0 &&
          !filtersData.ammStatuses.includes("Valide")
        ) {
          setAmmStatusFilter(filtersData.ammStatuses[0]);
        }
      } catch {
        setErrorMessage(
          "Impossible de charger les catégories, fournisseurs et filtres ACOREP."
        );
      }
    }

    loadOptions();
    loadCatalogueProducts({ reset: true });

    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function loadCatalogueProducts(options?: { reset?: boolean }) {
    setIsCatalogueLoading(true);
    setErrorMessage("");

    try {
      const products = await searchNationalProducts({
        search: options?.reset ? "" : catalogueSearch,
        therapeuticClass: options?.reset ? "all" : therapeuticClassFilter,
        pharmaceuticalForm: options?.reset ? "all" : pharmaceuticalFormFilter,
        packaging: options?.reset ? "all" : packagingFilter,
        target: options?.reset ? "all" : targetFilter,
        ammStatus: options?.reset ? "Valide" : ammStatusFilter,
        limit: 50,
      });

      setCatalogueProducts(products);
    } catch (error) {
      setCatalogueProducts([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de rechercher dans le catalogue ACOREP 2026."
      );
    } finally {
      setIsCatalogueLoading(false);
    }
  }

  function resetProductIdentityFields() {
    setForm((current) => ({
      ...current,
      name: "",
      genericName: "",
      dosage: "",
      form: "",
      unit: "boîte",
      manufacturer: "",
    }));
  }

  function startManualMode() {
    setIsManualMode(true);
    setSelectedNationalProduct(null);
    resetProductIdentityFields();
  }

  function backToCatalogueMode() {
    setIsManualMode(false);
    setSelectedNationalProduct(null);
    resetProductIdentityFields();
  }

  function resetCatalogueSearch() {
    setCatalogueSearch("");
    setTherapeuticClassFilter("all");
    setPharmaceuticalFormFilter("all");
    setPackagingFilter("all");
    setTargetFilter("all");
    setAmmStatusFilter("Valide");
    setSelectedNationalProduct(null);
    setIsManualMode(false);
    resetProductIdentityFields();

    setTimeout(() => {
      loadCatalogueProducts({ reset: true });
    }, 0);
  }

  function selectNationalProduct(product: NationalProduct) {
    if (!isAmmValid(product.amm_status)) {
      setErrorMessage(
        "Impossible d’ajouter ce produit : son statut AMM n’est pas valide."
      );
      return;
    }

    setErrorMessage("");
    setIsManualMode(false);
    setSelectedNationalProduct(product);

    setForm((current) => ({
      ...current,
      name: product.name || "",
      genericName: product.generic_name || "",
      dosage: product.dosage || "",
      form: product.pharmaceutical_form || product.form || "",
      unit: resolveProductUnit(product),
      manufacturer: product.manufacturer || "",
      description: buildAcorepDescription(product),
    }));
  }

  function closeDialog() {
    setIsOpen(false);
    setIsManualMode(false);
    setForm(initialForm);
    setSelectedNationalProduct(null);
    setCatalogueProducts([]);
    setCatalogueSearch("");
    setTherapeuticClassFilter("all");
    setPharmaceuticalFormFilter("all");
    setPackagingFilter("all");
    setTargetFilter("all");
    setAmmStatusFilter("Valide");
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    try {
      const quantity = Number(form.quantity || 0);

      if (!isManualMode && !selectedNationalProduct) {
        throw new Error(
          "Sélectionnez un produit dans le catalogue ACOREP 2026 ou activez l’ajout manuel."
        );
      }

      if (selectedNationalProduct && !isAmmValid(selectedNationalProduct.amm_status)) {
        throw new Error(
          "Ce produit ne peut pas être ajouté : son statut AMM n’est pas valide."
        );
      }

      if (!form.name.trim()) {
        throw new Error("Le nom du produit est obligatoire.");
      }

      if (quantity > 0 && !form.expiryDate) {
        throw new Error(
          "La date d’expiration est obligatoire si le stock initial est supérieur à zéro."
        );
      }

      if (Number(form.sellingPrice || 0) <= 0) {
        throw new Error("Le prix de vente doit être supérieur à zéro.");
      }

      await createProductWithInitialBatch({
        pharmacyId,
        nationalProductId: selectedNationalProduct?.id,
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
        description: form.description,
        batchNumber: form.batchNumber,
        expiryDate: form.expiryDate,
        purchasePrice: Number(form.purchasePrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
        quantity,
      });

      closeDialog();
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
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Ajouter un produit
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Sélectionnez un médicament depuis le catalogue ACOREP 2026 ou
                  ajoutez-le manuellement s’il est absent.
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

            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="rounded-[2rem] border border-blue-100 bg-blue-50/50 p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                      Étape 1
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      Rechercher dans ACOREP 2026
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Par défaut, seuls les médicaments avec AMM valide sont
                      proposés.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetCatalogueSearch}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Réinitialiser
                    </button>

                    <button
                      type="button"
                      onClick={startManualMode}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 hover:bg-amber-100"
                    >
                      <Plus className="h-4 w-4" />
                      Produit absent ? Ajouter manuellement
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <select
                    value={therapeuticClassFilter}
                    onChange={(event) =>
                      setTherapeuticClassFilter(event.target.value)
                    }
                    className="form-input bg-white"
                    disabled={isManualMode}
                  >
                    <option value="all">Toutes les classes</option>
                    {filterOptions.therapeuticClasses.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={pharmaceuticalFormFilter}
                    onChange={(event) =>
                      setPharmaceuticalFormFilter(event.target.value)
                    }
                    className="form-input bg-white"
                    disabled={isManualMode}
                  >
                    <option value="all">Toutes les formes</option>
                    {filterOptions.pharmaceuticalForms.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={packagingFilter}
                    onChange={(event) => setPackagingFilter(event.target.value)}
                    className="form-input bg-white"
                    disabled={isManualMode}
                  >
                    <option value="all">Tous les conditionnements</option>
                    {filterOptions.packagings.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={targetFilter}
                    onChange={(event) => setTargetFilter(event.target.value)}
                    className="form-input bg-white"
                    disabled={isManualMode}
                  >
                    <option value="all">Toutes les cibles</option>
                    {filterOptions.targets.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={ammStatusFilter}
                    onChange={(event) => setAmmStatusFilter(event.target.value)}
                    className="form-input bg-white"
                    disabled={isManualMode}
                  >
                    {filterOptions.ammStatuses.length === 0 && (
                      <option value="Valide">Valide</option>
                    )}

                    {filterOptions.ammStatuses.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <Search className="h-5 w-5 text-slate-400" />

                    <input
                      value={catalogueSearch}
                      onChange={(event) =>
                        setCatalogueSearch(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();

                          if (!isManualMode) {
                            loadCatalogueProducts();
                          }
                        }
                      }}
                      placeholder="Rechercher..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      disabled={isManualMode}
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => loadCatalogueProducts()}
                    disabled={isManualMode}
                    className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Chercher
                  </button>
                </div>

                <div className="mt-4 max-h-80 overflow-y-auto rounded-3xl border border-slate-200 bg-white">
                  {isManualMode ? (
                    <div className="px-5 py-8 text-center text-sm font-bold text-amber-700">
                      Mode manuel activé. Saisissez les informations du produit
                      dans l’étape 2.
                    </div>
                  ) : isCatalogueLoading ? (
                    <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">
                      Recherche dans ACOREP 2026...
                    </div>
                  ) : catalogueProducts.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">
                      Aucun produit trouvé. Essayez une autre recherche ou
                      utilisez l’ajout manuel.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {catalogueProducts.map((product) => {
                        const isSelected =
                          selectedNationalProduct?.id === product.id;

                        const validAmm = isAmmValid(product.amm_status);

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectNationalProduct(product)}
                            disabled={!validAmm}
                            className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              isSelected
                                ? "bg-emerald-50"
                                : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-black text-slate-950">
                                  {product.name}
                                </p>

                                <AmmStatusBadge status={product.amm_status} />

                                {isSelected && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Sélectionné
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm text-slate-600">
                                {[
                                  product.generic_name,
                                  product.dosage,
                                  product.pharmaceutical_form || product.form,
                                  product.packaging || product.unit,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Détails non renseignés"}
                              </p>

                              <p className="mt-1 text-xs font-semibold text-slate-400">
                                {[
                                  product.therapeutic_class ||
                                    product.category_name,
                                  product.target,
                                  product.amm_number ||
                                    product.registration_number,
                                ]
                                  .filter(Boolean)
                                  .join(" / ") || "ACOREP 2026"}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                              {validAmm ? "Choisir" : "AMM non valide"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  Étape 2
                </p>

                <h3 className="mt-1 mb-4 font-black text-slate-900">
                  Informations du médicament
                </h3>

                {isManualMode ? (
                  <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                    Mode manuel activé. L’application contrôlera si un produit
                    identique existe déjà dans cette pharmacie avant
                    l’enregistrement.
                    <button
                      type="button"
                      onClick={backToCatalogueMode}
                      className="ml-2 underline"
                    >
                      Revenir au catalogue ACOREP
                    </button>
                  </div>
                ) : (
                  !selectedNationalProduct && (
                    <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                      Aucun médicament sélectionné. Sélectionnez d’abord un
                      produit dans ACOREP 2026.
                    </div>
                  )
                )}

                {selectedNationalProduct && (
                  <div className="mb-4 grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
                    <InfoCard
                      label="Classe"
                      value={
                        selectedNationalProduct.therapeutic_class ||
                        selectedNationalProduct.category_name ||
                        "-"
                      }
                    />

                    <InfoCard
                      label="AMM"
                      value={
                        selectedNationalProduct.amm_number ||
                        selectedNationalProduct.registration_number ||
                        "-"
                      }
                    />

                    <InfoCard
                      label="Statut"
                      value={selectedNationalProduct.amm_status || "-"}
                    />

                    <InfoCard
                      label="Pays"
                      value={selectedNationalProduct.country || "-"}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField label="Produit *">
                    <input
                      value={form.name}
                      readOnly={!isManualMode}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      className={`form-input ${
                        isManualMode ? "bg-white" : "bg-slate-50"
                      }`}
                      placeholder={
                        isManualMode
                          ? "Ex : Nom du produit"
                          : "Sélection depuis ACOREP"
                      }
                      required
                    />
                  </FormField>

                  <FormField label="Nom générique / DCI">
                    <input
                      value={form.genericName}
                      readOnly={!isManualMode}
                      onChange={(event) =>
                        updateField("genericName", event.target.value)
                      }
                      className={`form-input ${
                        isManualMode ? "bg-white" : "bg-slate-50"
                      }`}
                      placeholder="Ex : Paracétamol"
                    />
                  </FormField>

                  <FormField label="Catégorie interne pharmacie">
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
                      readOnly={!isManualMode}
                      onChange={(event) =>
                        updateField("dosage", event.target.value)
                      }
                      className={`form-input ${
                        isManualMode ? "bg-white" : "bg-slate-50"
                      }`}
                      placeholder="Ex : 500 mg"
                    />
                  </FormField>

                  <FormField label="Forme pharmaceutique">
                    <input
                      value={form.form}
                      readOnly={!isManualMode}
                      onChange={(event) =>
                        updateField("form", event.target.value)
                      }
                      className={`form-input ${
                        isManualMode ? "bg-white" : "bg-slate-50"
                      }`}
                      placeholder="Ex : comprimé"
                    />
                  </FormField>

                  <FormField label="Unité / Conditionnement">
                    <select
                      value={form.unit}
                      onChange={(event) =>
                        updateField("unit", event.target.value)
                      }
                      className="form-input"
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
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

                <FormField label="Description / note interne">
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    className="form-input mt-4 min-h-24"
                    placeholder="Ex : remarques internes, conditionnement, observations..."
                  />
                </FormField>

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
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  Étape 3
                </p>

                <h3 className="mt-1 mb-4 font-black text-slate-900">
                  Premier lot / stock initial
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  onClick={closeDialog}
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

function isAmmValid(status: string | null) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalized === "valide" || normalized.includes("valid");
}

function resolveProductUnit(product: NationalProduct) {
  const unit = String(product.packaging ?? product.unit ?? "").trim();
  const form = String(
    product.pharmaceutical_form ?? product.form ?? ""
  )
    .trim()
    .toLowerCase();

  if (unit) return unit;

  if (form.includes("comprim")) return "comprimé";
  if (form.includes("gélule")) return "gélule";
  if (form.includes("capsule")) return "capsule";
  if (form.includes("inject")) return "ampoule";
  if (form.includes("flacon")) return "flacon";
  if (form.includes("sachet")) return "sachet";
  if (form.includes("tube")) return "tube";

  return "boîte";
}

function buildAcorepDescription(product: NationalProduct) {
  return [
    product.amm_number || product.registration_number
      ? `AMM : ${product.amm_number || product.registration_number}`
      : "",
    product.amm_status ? `Statut AMM : ${product.amm_status}` : "",
    product.amm_holder ? `Titulaire AMM : ${product.amm_holder}` : "",
    product.distributor ? `Distributeur : ${product.distributor}` : "",
    product.country ? `Pays : ${product.country}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildUnitOptions(currentUnit: string) {
  return Array.from(
    new Set(
      [...defaultUnitOptions, currentUnit]
        .map((unit) => String(unit ?? "").trim())
        .filter((unit) => unit.length > 0)
    )
  );
}

function AmmStatusBadge({ status }: { status: string | null }) {
  if (isAmmValid(status)) {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
        Valide
      </span>
    );
  }

  const normalized = String(status ?? "").toLowerCase();

  if (normalized.includes("expir")) {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
        Expirée
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
      {status || "Non défini"}
    </span>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
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