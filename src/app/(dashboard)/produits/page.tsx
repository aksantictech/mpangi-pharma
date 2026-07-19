"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
  Store,
  Warehouse,
} from "lucide-react";

import AddBatchDialog from "@/components/products/AddBatchDialog";
import AddProductDialog from "@/components/products/AddProductDialog";
import ExpirationBadge from "@/components/products/ExpirationBadge";
import ProductBatchesDialog from "@/components/products/ProductBatchesDialog";
import ProductExcelActions from "@/components/products/ProductExcelActions";
import ProductSetupPanel from "@/components/products/ProductSetupPanel";
import StockStatusBadge from "@/components/products/StockStatusBadge";
import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  getExpirationAlerts,
  getProductStock,
} from "@/services/products.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { ExpirationAlert, ProductStockSummary } from "@/types/product";

const MOBILE_PAGE_SIZE = 5;


export default function ProductsPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [expirationAlerts, setExpirationAlerts] = useState<ExpirationAlert[]>(
    []
  );

  const [search, setSearch] = useState("");
  const [mobilePage, setMobilePage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setProducts([]);
        setExpirationAlerts([]);
        return;
      }

      setPharmacy(currentPharmacy);

      const [stockData, alertsData] = await Promise.all([
        getProductStock(currentPharmacy.id),
        getExpirationAlerts(currentPharmacy.id),
      ]);

      setProducts(stockData);
      setExpirationAlerts(alertsData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les produits."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setMobilePage(1);
  }, [search]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return products;

    return products.filter((product) => {
      const value = [
        product.name,
        product.generic_name,
        product.dosage,
        product.form,
        product.unit,
        productRequiresPrescription(product) ? "ordonnance prescription" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return value.includes(normalizedSearch);
    });
  }, [products, search]);

  const mobileTotalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / MOBILE_PAGE_SIZE)
  );

  const safeMobilePage = Math.min(mobilePage, mobileTotalPages);

  const mobileProducts = filteredProducts.slice(
    (safeMobilePage - 1) * MOBILE_PAGE_SIZE,
    safeMobilePage * MOBILE_PAGE_SIZE
  );

  useEffect(() => {
    if (mobilePage > mobileTotalPages) {
      setMobilePage(mobileTotalPages);
    }
  }, [mobilePage, mobileTotalPages]);

  const outOfStockCount = products.filter(
    (product) => product.stock_status === "out_of_stock"
  ).length;

  const lowStockCount = products.filter(
    (product) => product.stock_status === "low_stock"
  ).length;

  const totalQuantity = products.reduce(
    (sum, product) => sum + Number(product.total_quantity || 0),
    0
  );

  const prescriptionCount = products.filter(productRequiresPrescription).length;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
            <p className="font-semibold text-slate-500">
              Chargement des produits...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 md:rounded-[2rem] md:p-8">
            <h1 className="text-xl font-black text-amber-800 md:text-2xl">
              Aucune pharmacie trouvée
            </h1>

            <p className="mt-2 text-sm font-medium text-amber-700">
              Votre compte n’est encore rattaché à aucune pharmacie. Créez une
              pharmacie ou demandez à un administrateur de vous inviter.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm">
                {pharmacy.name}
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
                Produits & stock
              </h1>

              <p className="mt-1 text-xs text-slate-500 md:mt-2 md:max-w-2xl md:text-sm">
                Médicaments, lots, quantités et dates d’expiration.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:items-center xl:justify-end">
              <ProductExcelActions
                pharmacyId={pharmacy.id}
                onCompleted={loadData}
              />

              <AddProductDialog pharmacyId={pharmacy.id} onCreated={loadData} />
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Actions rapides
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-950 md:text-xl">
                Réseau et disponibilité
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Vérifiez le stock des pharmacies partenaires ou consultez la page publique.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href="/stock-voisin"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
              >
                <Warehouse className="h-5 w-5" />
                Rechercher stock voisin
              </Link>

              <Link
                href="/pharmacies-ouvertes"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
              >
                <Store className="h-5 w-5" />
                Voir pharmacies ouvertes
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            title="Produits"
            value={products.length.toString()}
            icon={<Package className="h-5 w-5 md:h-6 md:w-6" />}
          />

          <MetricCard
            title="Quantité"
            value={totalQuantity.toString()}
            icon={<Boxes className="h-5 w-5 md:h-6 md:w-6" />}
          />

          <MetricCard
            title="Stock faible"
            value={lowStockCount.toString()}
            icon={<AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />}
            tone="warning"
          />

          <MetricCard
            title="Ruptures"
            value={outOfStockCount.toString()}
            icon={<CalendarClock className="h-5 w-5 md:h-6 md:w-6" />}
            tone="danger"
          />
        </section>

        <ProductSetupPanel pharmacyId={pharmacy.id} onChanged={loadData} />

        {prescriptionCount > 0 && (
          <section className="rounded-[1.5rem] border border-red-100 bg-red-50 p-4 md:rounded-[2rem] md:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-red-600 shadow-sm">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />
              </div>

              <div>
                <h2 className="font-black text-red-900">
                  Médicaments sous ordonnance
                </h2>

                <p className="mt-1 text-sm font-medium text-red-700">
                  {prescriptionCount} produit(s) nécessitent une ordonnance avant la vente.
                </p>
              </div>
            </div>
          </section>
        )}

        {expirationAlerts.length > 0 && (
          <section className="rounded-[1.5rem] border border-orange-100 bg-orange-50 p-4 md:rounded-[2rem] md:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-orange-600 shadow-sm">
                <CalendarClock className="h-5 w-5 md:h-6 md:w-6" />
              </div>

              <div>
                <h2 className="font-black text-orange-900">
                  Alertes d’expiration
                </h2>

                <p className="mt-1 text-sm font-medium text-orange-700">
                  {expirationAlerts.length} lot(s) nécessitent une vérification.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-950 md:text-xl">
                Liste des produits
              </h2>

              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Recherche par nom, DCI, dosage, forme ou unité.
              </p>
            </div>

            <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:w-96">
              <Search className="h-5 w-5 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-2 xl:hidden">
            <MobilePagination
              page={safeMobilePage}
              totalPages={mobileTotalPages}
              totalItems={filteredProducts.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() => setMobilePage((page) => Math.max(1, page - 1))}
              onNext={() =>
                setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
              }
            />

            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">
                Aucun produit trouvé.
              </div>
            ) : (
              mobileProducts.map((product) => (
                <MobileProductCard
                  key={product.product_id}
                  pharmacyId={pharmacy.id}
                  product={product}
                  onChanged={loadData}
                />
              ))
            )}

            <MobilePagination
              page={safeMobilePage}
              totalPages={mobileTotalPages}
              totalItems={filteredProducts.length}
              pageSize={MOBILE_PAGE_SIZE}
              onPrevious={() => setMobilePage((page) => Math.max(1, page - 1))}
              onNext={() =>
                setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
              }
            />
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Produit</TableHead>
                    <TableHead>DCI</TableHead>
                    <TableHead>Dosage / Forme</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expiration proche</TableHead>
                    <TableHead>Actions</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Aucun produit trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr
                        key={product.product_id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-900">
                            {product.name}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-slate-500">
                              Unité : {product.unit || "-"}
                            </p>

                            {productRequiresPrescription(product) && (
                              <PrescriptionBadge />
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.generic_name || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {[product.dosage, product.form]
                            .filter(Boolean)
                            .join(" / ") || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">
                            {Number(product.total_quantity || 0)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Seuil : {Number(product.min_stock || 0)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                          <StockStatusBadge status={product.stock_status} />
                          {productRequiresPrescription(product) && (
                            <PrescriptionBadge />
                          )}
                        </div>
                        </td>

                        <td className="px-5 py-4">
                          <ExpirationBadge
                            expiryDate={product.nearest_expiry_date}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <ProductBatchesDialog
                              pharmacyId={pharmacy.id}
                              product={product}
                              onChanged={loadData}
                            />

                            <AddBatchDialog
                              pharmacyId={pharmacy.id}
                              product={product}
                              onCreated={loadData}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MobileProductCard({
  pharmacyId,
  product,
  onChanged,
}: {
  pharmacyId: string;
  product: ProductStockSummary;
  onChanged: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
            Produit
          </p>

          <h3 className="mt-0.5 line-clamp-2 text-sm font-black leading-5 text-slate-950">
            {product.name}
          </h3>

          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
            {product.generic_name || "DCI non renseignée"}
          </p>

          {productRequiresPrescription(product) && (
            <div className="mt-2">
              <PrescriptionBadge />
            </div>
          )}
        </div>

        <StockStatusBadge status={product.stock_status} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniInfo
          label="Stock"
          value={Number(product.total_quantity || 0).toString()}
          strong
        />

        <MiniInfo
          label="Seuil"
          value={Number(product.min_stock || 0).toString()}
        />

        <MiniInfo label="Unité" value={product.unit || "-"} />

        <MiniInfo label="Dosage" value={product.dosage || "-"} />

        <MiniInfo label="Forme" value={product.form || "-"} />

        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[10px] font-bold text-slate-500">Exp.</p>
          <div className="mt-1">
            <ExpirationBadge expiryDate={product.nearest_expiry_date} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ProductBatchesDialog
          pharmacyId={pharmacyId}
          product={product}
          onChanged={onChanged}
        />

        <AddBatchDialog
          pharmacyId={pharmacyId}
          product={product}
          onCreated={onChanged}
        />
      </div>
    </article>
  );
}

function MiniInfo({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p
        className={`mt-0.5 line-clamp-2 text-xs ${
          strong ? "font-black text-slate-950" : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MobilePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center">
        <p className="text-xs font-black text-slate-900">
          Page {page}/{totalPages}
        </p>
        <p className="text-[11px] font-semibold text-slate-500">
          {start}-{end} sur {totalItems}
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-blue-50 text-blue-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm md:rounded-[2rem] md:p-5">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl md:h-12 md:w-12 ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-500 md:text-sm">{title}</p>
      <p className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
        {value}
      </p>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function PrescriptionBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-red-700 md:px-3 md:text-xs">
      Ordonnance
    </span>
  );
}

function productRequiresPrescription(product: unknown) {
  const value = product as Record<string, unknown>;

  return (
    value.requires_prescription === true ||
    value.requiresPrescription === true
  );
}
