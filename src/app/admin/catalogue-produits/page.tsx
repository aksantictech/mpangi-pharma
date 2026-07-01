"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Database,
  RotateCcw,
  Search,
} from "lucide-react";

import NationalProductsExcelActions from "@/components/admin/NationalProductsExcelActions";

import type { NationalProduct } from "@/types/national-product";

type FilterOptions = {
  therapeuticClasses: string[];
  pharmaceuticalForms: string[];
  packagings: string[];
  targets: string[];
  ammStatuses: string[];
};

type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
};

const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  pageSize: 100,
  total: 0,
  totalPages: 1,
  from: 0,
  to: 0,
};

export default function AdminNationalProductsPage() {
  const [products, setProducts] = useState<NationalProduct[]>([]);
  const [search, setSearch] = useState("");

  const [therapeuticClassFilter, setTherapeuticClassFilter] = useState("all");
  const [pharmaceuticalFormFilter, setPharmaceuticalFormFilter] =
    useState("all");
  const [packagingFilter, setPackagingFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [ammStatusFilter, setAmmStatusFilter] = useState("all");

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    therapeuticClasses: [],
    pharmaceuticalForms: [],
    packagings: [],
    targets: [],
    ammStatuses: [],
  });

  const [pagination, setPagination] =
    useState<PaginationState>(DEFAULT_PAGINATION);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadProducts(options?: {
    page?: number;
    reset?: boolean;
    silent?: boolean;
  }) {
    if (!options?.silent) {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const params = new URLSearchParams();

      const currentSearch = options?.reset ? "" : search.trim();

      const currentTherapeuticClass = options?.reset
        ? "all"
        : therapeuticClassFilter;

      const currentPharmaceuticalForm = options?.reset
        ? "all"
        : pharmaceuticalFormFilter;

      const currentPackaging = options?.reset ? "all" : packagingFilter;
      const currentTarget = options?.reset ? "all" : targetFilter;
      const currentAmmStatus = options?.reset ? "all" : ammStatusFilter;

      const currentPage = options?.reset ? 1 : options?.page ?? pagination.page;

      if (currentSearch) {
        params.set("search", currentSearch);
      }

      if (currentTherapeuticClass !== "all") {
        params.set("therapeuticClass", currentTherapeuticClass);
      }

      if (currentPharmaceuticalForm !== "all") {
        params.set("pharmaceuticalForm", currentPharmaceuticalForm);
      }

      if (currentPackaging !== "all") {
        params.set("packaging", currentPackaging);
      }

      if (currentTarget !== "all") {
        params.set("target", currentTarget);
      }

      if (currentAmmStatus !== "all") {
        params.set("ammStatus", currentAmmStatus);
      }

      params.set("page", String(currentPage));
      params.set("pageSize", "100");

      const response = await fetch(
        `/api/admin/national-products?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Impossible de charger le catalogue ACOREP."
        );
      }

      setProducts(result.products ?? []);
      setPagination(result.pagination ?? DEFAULT_PAGINATION);
    } catch (error) {
      setProducts([]);
      setPagination(DEFAULT_PAGINATION);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le catalogue ACOREP."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFilters() {
    try {
      const response = await fetch("/api/admin/national-products/filters", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Impossible de charger les filtres.");
      }

      setFilterOptions({
        therapeuticClasses: result.therapeuticClasses ?? [],
        pharmaceuticalForms: result.pharmaceuticalForms ?? [],
        packagings: result.packagings ?? [],
        targets: result.targets ?? [],
        ammStatuses: result.ammStatuses ?? [],
      });
    } catch {
      setFilterOptions({
        therapeuticClasses: [],
        pharmaceuticalForms: [],
        packagings: [],
        targets: [],
        ammStatuses: [],
      });
    }
  }

  async function refreshAfterImport() {
    setSearch("");
    setTherapeuticClassFilter("all");
    setPharmaceuticalFormFilter("all");
    setPackagingFilter("all");
    setTargetFilter("all");
    setAmmStatusFilter("all");
    setPagination(DEFAULT_PAGINATION);

    await loadFilters();
    await loadProducts({ reset: true });
  }

  function applyFilters() {
    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    loadProducts({
      page: 1,
    });
  }

  function resetFilters() {
    setSearch("");
    setTherapeuticClassFilter("all");
    setPharmaceuticalFormFilter("all");
    setPackagingFilter("all");
    setTargetFilter("all");
    setAmmStatusFilter("all");
    setPagination(DEFAULT_PAGINATION);

    setTimeout(() => {
      loadProducts({ reset: true });
    }, 0);
  }

  function goToPreviousPage() {
    if (pagination.page <= 1) return;

    loadProducts({
      page: pagination.page - 1,
    });
  }

  function goToNextPage() {
    if (pagination.page >= pagination.totalPages) return;

    loadProducts({
      page: pagination.page + 1,
    });
  }

  useEffect(() => {
    loadProducts({ page: 1 });
    loadFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validOnPageCount = useMemo(
    () => products.filter((product) => product.amm_status === "Valide").length,
    [products]
  );

  const expiredOnPageCount = useMemo(
    () => products.filter((product) => product.amm_status === "Expirée").length,
    [products]
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div>
              <Link
                href="/dashboard"
                className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour tableau de bord
              </Link>

              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                Super Admin
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Catalogue ACOREP 2026
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Répertoire des médicaments autorisés. Les pharmacies
                sélectionneront les produits depuis ce catalogue, avec contrôle
                du statut AMM.
              </p>
            </div>

            <NationalProductsExcelActions
              products={products}
              onCompleted={refreshAfterImport}
            />
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard
            title="Total catalogue"
            value={pagination.total.toString()}
          />

          <MetricCard
            title="Affichés sur cette page"
            value={products.length.toString()}
          />

          <MetricCard
            title="AMM valides sur page"
            value={validOnPageCount.toString()}
            tone="success"
          />

          <MetricCard
            title="AMM expirées sur page"
            value={expiredOnPageCount.toString()}
            tone="warning"
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Liste du catalogue
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Recherche par DCI, nom produit, dosage, classe thérapeutique,
                forme, conditionnement, numéro AMM, fabricant ou pays.
                Affichage par page de 100 produits.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <select
                value={therapeuticClassFilter}
                onChange={(event) =>
                  setTherapeuticClassFilter(event.target.value)
                }
                className="form-input"
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
                className="form-input"
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
                className="form-input"
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
                className="form-input"
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
                className="form-input"
              >
                <option value="all">Tous les statuts AMM</option>
                {filterOptions.ammStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyFilters();
                    }
                  }}
                  placeholder="Rechercher..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <p className="text-sm font-bold text-slate-500">
                Affichage {pagination.from} - {pagination.to} sur{" "}
                {pagination.total} produit(s)
              </p>

              <div className="flex flex-col gap-2 md:flex-row">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser
                </button>

                <button
                  type="button"
                  onClick={applyFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800"
                >
                  Filtrer
                </button>
              </div>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Produit</TableHead>
                    <TableHead>DCI</TableHead>
                    <TableHead>Classe thérapeutique</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Forme</TableHead>
                    <TableHead>Conditionnement</TableHead>
                    <TableHead>AMM</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Fabricant</TableHead>
                    <TableHead>Pays</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Chargement...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Aucun produit trouvé.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-900">
                            {product.name}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.generic_name || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.therapeutic_class ||
                            product.category_name ||
                            "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.dosage || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.pharmaceutical_form || product.form || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.packaging || product.unit || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {product.amm_number ||
                            product.registration_number ||
                            "-"}
                        </td>

                        <td className="px-5 py-4">
                          <AmmStatusBadge status={product.amm_status} />
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.target || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.manufacturer || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.country || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 xl:hidden">
            {isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-semibold text-slate-500">
                Chargement...
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-semibold text-slate-500">
                Aucun produit trouvé.
              </div>
            ) : (
              products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-700">
                        {product.therapeutic_class ||
                          product.category_name ||
                          "Classe non renseignée"}
                      </p>

                      <h3 className="mt-1 text-lg font-black text-slate-950">
                        {product.name}
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {product.generic_name || "-"}
                      </p>
                    </div>

                    <AmmStatusBadge status={product.amm_status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MobileInfo label="Dosage" value={product.dosage || "-"} />
                    <MobileInfo
                      label="Forme"
                      value={product.pharmaceutical_form || product.form || "-"}
                    />
                    <MobileInfo
                      label="Conditionnement"
                      value={product.packaging || product.unit || "-"}
                    />
                    <MobileInfo label="Cible" value={product.target || "-"} />
                    <MobileInfo
                      label="AMM"
                      value={
                        product.amm_number ||
                        product.registration_number ||
                        "-"
                      }
                    />
                    <MobileInfo label="Pays" value={product.country || "-"} />
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={pagination.page <= 1 || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </button>

            <p className="text-center text-sm font-black text-slate-600">
              Page {pagination.page} sur {pagination.totalPages}
            </p>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass = {
    default: "bg-blue-50 text-blue-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
      >
        <Database className="h-6 w-6" />
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function MobileInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function AmmStatusBadge({ status }: { status: string | null }) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized.includes("valid")) {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
        Valide
      </span>
    );
  }

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

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}