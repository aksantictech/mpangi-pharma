"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Calculator,
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
import {
  calculateAutomaticSellingPrice,
  getPricingRules,
} from "@/services/pricing.service";

import type { NationalProduct } from "@/types/national-product";
import type { PricingRule, VatRate } from "@/types/product";

type AddProductDialogProps = {
  pharmacyId: string;
  onCreated: () => void;
};

type ProductType =
  | "medicament"
  | "parapharmacie"
  | "hygiene"
  | "cosmetique"
  | "bebe"
  | "materiel_medical"
  | "complement"
  | "autre";

type ProductFormState = {
  name: string;
  genericName: string;
  categoryId: string;
  productType: ProductType;
  dosage: string;
  form: string;
  unit: string;
  barcode: string;
  manufacturer: string;
  supplierId: string;
  minStock: string;
  requiresPrescription: boolean;
  hasVisibleExpiryDate: boolean;
  description: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: string;
  vatApplicable: boolean;
  vatRate: VatRate;
  pricingRuleId: string;
  originCode: string;
  originLabel: string;
  autoPricingEnabled: boolean;
  pricingCoefficient: string;
};

const initialForm: ProductFormState = {
  name: "",
  genericName: "",
  categoryId: "",
  productType: "medicament",
  dosage: "",
  form: "",
  unit: "boîte",
  barcode: "",
  manufacturer: "",
  supplierId: "",
  minStock: "0",
  requiresPrescription: false,
  hasVisibleExpiryDate: true,
  description: "",
  batchNumber: "",
  expiryDate: "",
  purchasePrice: "0",
  sellingPrice: "0",
  quantity: "0",
  vatApplicable: false,
  vatRate: 5,
  pricingRuleId: "",
  originCode: "",
  originLabel: "",
  autoPricingEnabled: false,
  pricingCoefficient: "1",
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

const productTypeOptions: { value: ProductType; label: string }[] = [
  { value: "medicament", label: "Médicament" },
  { value: "parapharmacie", label: "Parapharmacie" },
  { value: "hygiene", label: "Hygiène" },
  { value: "cosmetique", label: "Cosmétique" },
  { value: "bebe", label: "Bébé" },
  { value: "materiel_medical", label: "Matériel médical" },
  { value: "complement", label: "Complément alimentaire" },
  { value: "autre", label: "Autre" },
];

const FAR_FUTURE_EXPIRY_DATE = "2099-12-31";

export default function AddProductDialog({
  pharmacyId,
  onCreated,
}: AddProductDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  const [form, setForm] = useState<ProductFormState>(initialForm);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

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
        const [categoriesData, suppliersData, filtersData, pricingRuleData] =
          await Promise.all([
            getProductCategories(pharmacyId),
            getSuppliers(pharmacyId),
            getNationalProductFilters(),
            getPricingRules(pharmacyId),
          ]);

        setCategories(categoriesData);
        setSuppliers(suppliersData);
        setFilterOptions(filtersData);
        setPricingRules(pricingRuleData);

        const defaultRule =
          pricingRuleData.find((rule) => rule.is_default) ??
          pricingRuleData[0];

        if (defaultRule) {
          setForm((current) => ({
            ...current,
            pricingRuleId: defaultRule.id,
            originCode: defaultRule.origin_code,
            originLabel: defaultRule.origin_label,
            pricingCoefficient: String(defaultRule.coefficient),
          }));
        }

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

  function recalculateSellingPrice(
    purchasePrice: string,
    coefficient: string
  ) {
    return String(
      calculateAutomaticSellingPrice({
        purchasePrice: Number(purchasePrice || 0),
        coefficient: Number(coefficient || 0),
        roundingMode:
          pricingRules.find((rule) => rule.id === form.pricingRuleId)
            ?.rounding_mode ?? "none",
      })
    );
  }

  function handlePricingRuleChange(ruleId: string) {
    const rule = pricingRules.find((item) => item.id === ruleId);

    setForm((current) => ({
      ...current,
      pricingRuleId: ruleId,
      originCode: rule?.origin_code ?? "",
      originLabel: rule?.origin_label ?? "",
      pricingCoefficient: String(rule?.coefficient ?? 1),
      sellingPrice: current.autoPricingEnabled
        ? String(
            calculateAutomaticSellingPrice({
              purchasePrice: Number(current.purchasePrice || 0),
              coefficient: Number(rule?.coefficient ?? 1),
              roundingMode: rule?.rounding_mode ?? "none",
            })
          )
        : current.sellingPrice,
    }));
  }

  function handlePurchasePriceChange(value: string) {
    setForm((current) => ({
      ...current,
      purchasePrice: value,
      sellingPrice: current.autoPricingEnabled
        ? String(
            calculateAutomaticSellingPrice({
              purchasePrice: Number(value || 0),
              coefficient: Number(current.pricingCoefficient || 0),
              roundingMode:
                pricingRules.find(
                  (rule) => rule.id === current.pricingRuleId
                )?.rounding_mode ?? "none",
            })
          )
        : current.sellingPrice,
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
      productType: "medicament",
      hasVisibleExpiryDate: true,
      requiresPrescription: false,
      description: "",
    }));
  }

  function startManualMode(productType: ProductType = "parapharmacie") {
    setIsManualMode(true);
    setSelectedNationalProduct(null);
    resetProductIdentityFields();

    setForm((current) => ({
      ...current,
      productType,
      unit: resolveManualUnit(productType),
      hasVisibleExpiryDate:
        productType === "medicament" || productType === "complement",
      requiresPrescription: false,
      description: `Produit hors catalogue ACOREP. Type : ${formatProductType(
        productType
      )}.`,
    }));
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

    const country = String(product.country ?? "").trim().toLowerCase();
    const matchedRule =
      pricingRules.find((rule) => {
        const code = rule.origin_code.toLowerCase();
        const label = rule.origin_label.toLowerCase();

        return (
          country.includes(code) ||
          label.includes(country) ||
          (country.includes("belg") && code === "belgium") ||
          (country.includes("canad") && code === "canada") ||
          (country.includes("inde") && code === "india")
        );
      }) ??
      pricingRules.find((rule) => rule.is_default) ??
      pricingRules[0];

    setForm((current) => ({
      ...current,
      productType: "medicament",
      name: product.name || "",
      genericName: product.generic_name || "",
      dosage: product.dosage || "",
      form: product.pharmaceutical_form || product.form || "",
      unit: resolveProductUnit(product),
      manufacturer: product.manufacturer || "",
      hasVisibleExpiryDate: true,
      description: buildAcorepDescription(product),
      pricingRuleId: matchedRule?.id ?? current.pricingRuleId,
      originCode: matchedRule?.origin_code ?? current.originCode,
      originLabel: matchedRule?.origin_label ?? product.country ?? "",
      pricingCoefficient: String(
        matchedRule?.coefficient ?? current.pricingCoefficient
      ),
    }));
  }

  function closeDialog() {
    if (isLoading) return;

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
      const expiryDateForSave = form.hasVisibleExpiryDate
        ? form.expiryDate
        : FAR_FUTURE_EXPIRY_DATE;

      if (!isManualMode && !selectedNationalProduct) {
        throw new Error(
          "Sélectionnez un produit dans le catalogue ACOREP 2026 ou cliquez sur Produit hors catalogue."
        );
      }

      if (
        selectedNationalProduct &&
        !isAmmValid(selectedNationalProduct.amm_status)
      ) {
        throw new Error(
          "Ce produit ne peut pas être ajouté : son statut AMM n’est pas valide."
        );
      }

      if (!form.name.trim()) {
        throw new Error("Le nom du produit est obligatoire.");
      }

      if (quantity > 0 && !expiryDateForSave) {
        throw new Error(
          "La date d’expiration est obligatoire si le stock initial est supérieur à zéro."
        );
      }

      if (Number(form.sellingPrice || 0) <= 0) {
        throw new Error("Le prix de vente doit être supérieur à zéro.");
      }

      const description = [
        form.description,
        isManualMode
          ? `Type de produit : ${formatProductType(form.productType)}`
          : "",
        !form.hasVisibleExpiryDate
          ? "Produit sans date d’expiration visible sur l’emballage."
          : "",
      ]
        .filter(Boolean)
        .join("\n");

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
        description,
        batchNumber: form.batchNumber,
        expiryDate: expiryDateForSave,
        purchasePrice: Number(form.purchasePrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
        quantity,
        vatApplicable: form.vatApplicable,
        vatRate: form.vatApplicable ? form.vatRate : 0,
        pricingRuleId: form.pricingRuleId,
        originCode: form.originCode,
        originLabel: form.originLabel,
        autoPricingEnabled: form.autoPricingEnabled,
        pricingCoefficient: Number(form.pricingCoefficient || 0),
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
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
      >
        <Plus className="h-5 w-5" />
        Ajouter un produit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 px-2 py-2 backdrop-blur-sm md:items-center md:px-4 md:py-8">
          <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl md:max-h-[92vh] md:rounded-[2rem]">
            <div className="shrink-0 border-b border-slate-100 p-4 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950 md:text-2xl">
                    Ajouter un produit
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                    Catalogue ACOREP ou produit hors catalogue : lingettes,
                    savon, lait de beauté, produits bébé, matériel médical.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isLoading}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMessage && (
                <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-24 md:space-y-8 md:p-6 md:pb-6">
                <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50/50 p-4 md:rounded-[2rem] md:p-5">
                  <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                        Étape 1
                      </p>

                      <h3 className="mt-1 text-lg font-black text-slate-950">
                        Source du produit
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Choisissez ACOREP ou un produit hors catalogue.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={resetCatalogueSearch}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        ACOREP
                      </button>

                      <button
                        type="button"
                        onClick={() => startManualMode("parapharmacie")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 hover:bg-amber-100"
                      >
                        <Plus className="h-4 w-4" />
                        Hors catalogue
                      </button>

                      <button
                        type="button"
                        onClick={() => startManualMode("cosmetique")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-black text-purple-700 hover:bg-purple-100"
                      >
                        <Plus className="h-4 w-4" />
                        Cosmétique
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
                      onChange={(event) =>
                        setPackagingFilter(event.target.value)
                      }
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
                      onChange={(event) =>
                        setAmmStatusFilter(event.target.value)
                      }
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

                  <div className="mt-4 max-h-72 overflow-y-auto rounded-3xl border border-slate-200 bg-white md:max-h-80">
                    {isManualMode ? (
                      <div className="px-5 py-8 text-center text-sm font-bold text-amber-700">
                        Mode hors catalogue activé. Remplissez directement les
                        informations du produit.
                      </div>
                    ) : isCatalogueLoading ? (
                      <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">
                        Recherche dans ACOREP 2026...
                      </div>
                    ) : catalogueProducts.length === 0 ? (
                      <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">
                        Aucun produit trouvé. Essayez une autre recherche ou
                        utilisez Hors catalogue.
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
                    Informations du produit
                  </h3>

                  {isManualMode ? (
                    <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                      Produit hors catalogue activé : lingettes, savon, lait de
                      beauté, produits bébé, matériel médical ou autres produits
                      non ACOREP.
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
                        produit ACOREP ou cliquez sur Hors catalogue.
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
                            ? "Ex : Lingettes bébé, savon, lait de beauté..."
                            : "Sélection depuis ACOREP"
                        }
                        required
                      />
                    </FormField>

                    <FormField label="Nom générique / description courte">
                      <input
                        value={form.genericName}
                        readOnly={!isManualMode}
                        onChange={(event) =>
                          updateField("genericName", event.target.value)
                        }
                        className={`form-input ${
                          isManualMode ? "bg-white" : "bg-slate-50"
                        }`}
                        placeholder="Ex : Paracétamol ou description courte"
                      />
                    </FormField>

                    <FormField label="Type de produit">
                      <select
                        value={form.productType}
                        onChange={(event) =>
                          updateField(
                            "productType",
                            event.target.value as ProductType
                          )
                        }
                        className="form-input"
                        disabled={!isManualMode}
                      >
                        {productTypeOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
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

                    <FormField label="Dosage / Taille">
                      <input
                        value={form.dosage}
                        readOnly={!isManualMode}
                        onChange={(event) =>
                          updateField("dosage", event.target.value)
                        }
                        className={`form-input ${
                          isManualMode ? "bg-white" : "bg-slate-50"
                        }`}
                        placeholder="Ex : 500 mg, 250 ml, 100 pièces"
                      />
                    </FormField>

                    <FormField label="Forme / Présentation">
                      <input
                        value={form.form}
                        readOnly={!isManualMode}
                        onChange={(event) =>
                          updateField("form", event.target.value)
                        }
                        className={`form-input ${
                          isManualMode ? "bg-white" : "bg-slate-50"
                        }`}
                        placeholder="Ex : comprimé, savon, lingettes"
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

                    <FormField label="Fabricant / Marque">
                      <input
                        value={form.manufacturer}
                        onChange={(event) =>
                          updateField("manufacturer", event.target.value)
                        }
                        className="form-input"
                        placeholder="Ex : fabricant ou marque"
                      />
                    </FormField>

<FormField label="Fabricant / Marque">
  <input
    value={form.manufacturer}
    onChange={(event) =>
      updateField("manufacturer", event.target.value)
    }
    className="form-input"
    placeholder="Ex : fabricant ou marque"
  />
</FormField>

<FormField label="Origine du produit">
  <input
    value={form.originLabel}
    readOnly
    className="form-input bg-slate-50"
    placeholder="Sélectionnée dans la tarification"
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

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.requiresPrescription}
                        onChange={(event) =>
                          updateField(
                            "requiresPrescription",
                            event.target.checked
                          )
                        }
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                      />
                      <span>
                        <span className="block font-black text-slate-900">
                          Nécessite une ordonnance
                        </span>
                        <span className="mt-1 block text-xs font-medium text-slate-500">
                          À cocher pour les médicaments soumis à prescription.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={!form.hasVisibleExpiryDate}
                        onChange={(event) =>
                          updateField(
                            "hasVisibleExpiryDate",
                            !event.target.checked
                          )
                        }
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                      />
                      <span>
                        <span className="block font-black text-slate-900">
                          Pas de date d’expiration visible
                        </span>
                        <span className="mt-1 block text-xs font-medium text-slate-500">
                          Exemple : savon, accessoires ou certains produits
                          d’hygiène.
                        </span>
                      </span>
                    </label>
                  </div>
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
                        value={
                          form.hasVisibleExpiryDate
                            ? form.expiryDate
                            : FAR_FUTURE_EXPIRY_DATE
                        }
                        onChange={(event) =>
                          updateField("expiryDate", event.target.value)
                        }
                        className="form-input"
                        disabled={!form.hasVisibleExpiryDate}
                      />
                    </FormField>

                    <div className="md:col-span-3 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <Calculator className="mt-0.5 h-5 w-5 text-blue-700" />
                        <div className="flex-1">
                          <h4 className="font-black text-blue-950">
                            Tarification automatique
                          </h4>

                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <label>
                              <span className="mb-2 block text-xs font-bold text-blue-800">
                                Pays ou zone d’origine
                              </span>
                              <select
                                value={form.pricingRuleId}
                                onChange={(event) =>
                                  handlePricingRuleChange(event.target.value)
                                }
                                className="form-input bg-white"
                              >
                                <option value="">Sélectionner l’origine</option>
                                {pricingRules.map((rule) => (
  <option key={rule.id} value={rule.id}>
    {rule.origin_label}
  </option>
))}
                              </select>
                            </label>

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
                                  setForm((current) => ({
                                    ...current,
                                    pricingCoefficient: event.target.value,
                                    sellingPrice: current.autoPricingEnabled
                                      ? recalculateSellingPrice(
                                          current.purchasePrice,
                                          event.target.value
                                        )
                                      : current.sellingPrice,
                                  }))
                                }
                                className="form-input bg-white"
                              />
                            </label>

                            <label className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-black text-blue-900">
                              <input
                                type="checkbox"
                                checked={form.autoPricingEnabled}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    autoPricingEnabled: event.target.checked,
                                    sellingPrice: event.target.checked
                                      ? recalculateSellingPrice(
                                          current.purchasePrice,
                                          current.pricingCoefficient
                                        )
                                      : current.sellingPrice,
                                  }))
                                }
                                className="h-4 w-4 rounded border-blue-300"
                              />
                              Calculer automatiquement le prix
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-3 rounded-3xl border border-amber-100 bg-amber-50 p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-black text-amber-900">
                          <input
                            type="checkbox"
                            checked={form.vatApplicable}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                vatApplicable: event.target.checked,
                                vatRate: event.target.checked
                                  ? current.vatRate || 5
                                  : 0,
                              }))
                            }
                            className="h-4 w-4 rounded border-amber-300"
                          />
                          TVA applicable à ce produit
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-bold text-amber-800">
                            Taux TVA
                          </span>
                          <select
                            value={form.vatRate}
                            disabled={!form.vatApplicable}
                            onChange={(event) =>
                              updateField(
                                "vatRate",
                                Number(event.target.value) as VatRate
                              )
                            }
                            className="form-input bg-white disabled:bg-slate-100"
                          >
                            <option value={0}>0 %</option>
                            <option value={5}>5 %</option>
                            <option value={16}>16 %</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <FormField label="Prix d’achat">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.purchasePrice}
                        onChange={(event) =>
                          handlePurchasePriceChange(event.target.value)
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
                        className={`form-input ${
                          form.autoPricingEnabled ? "bg-slate-100" : ""
                        }`}
                        readOnly={form.autoPricingEnabled}
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
              </div>

              <div className="fixed bottom-0 left-0 right-0 z-[95] grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur md:static md:flex md:justify-end md:gap-3 md:p-5 md:shadow-none">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isLoading}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
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
  const form = String(product.pharmaceutical_form ?? product.form ?? "")
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

function resolveManualUnit(productType: ProductType) {
  if (productType === "cosmetique") return "pièce";
  if (productType === "hygiene") return "paquet";
  if (productType === "bebe") return "paquet";
  if (productType === "materiel_medical") return "pièce";
  if (productType === "complement") return "boîte";

  return "pièce";
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

function formatProductType(type: ProductType) {
  return (
    productTypeOptions.find((item) => item.value === type)?.label || "Autre"
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
