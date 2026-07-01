"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Package,
  Search,
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

export default function ProductsPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [expirationAlerts, setExpirationAlerts] = useState<ExpirationAlert[]>(
    []
  );

  const [search, setSearch] = useState("");
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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return value.includes(normalizedSearch);
    });
  }, [products, search]);

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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
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
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
            <h1 className="text-2xl font-black text-amber-800">
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
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                {pharmacy.name}
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Produits & stock
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Gestion des médicaments, lots, quantités et dates d’expiration.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:items-center xl:justify-end">
              <ProductExcelActions
                pharmacyId={pharmacy.id}
                onCompleted={loadData}
              />

              <AddProductDialog pharmacyId={pharmacy.id} onCreated={loadData} />
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Produits actifs"
            value={products.length.toString()}
            icon={<Package className="h-6 w-6" />}
          />

          <MetricCard
            title="Quantité totale"
            value={totalQuantity.toString()}
            icon={<Boxes className="h-6 w-6" />}
          />

          <MetricCard
            title="Stock faible"
            value={lowStockCount.toString()}
            icon={<AlertTriangle className="h-6 w-6" />}
            tone="warning"
          />

          <MetricCard
            title="Ruptures"
            value={outOfStockCount.toString()}
            icon={<CalendarClock className="h-6 w-6" />}
            tone="danger"
          />
        </section>

        <ProductSetupPanel pharmacyId={pharmacy.id} onChanged={loadData} />

        {expirationAlerts.length > 0 && (
          <section className="rounded-[2rem] border border-orange-100 bg-orange-50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-orange-600 shadow-sm">
                <CalendarClock className="h-6 w-6" />
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

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Liste des produits
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Recherche rapide par nom, DCI, dosage, forme ou unité.
              </p>
            </div>

            <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:w-96">
              <Search className="h-5 w-5 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-3 xl:hidden">
            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-semibold text-slate-500">
                Aucun produit trouvé.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <MobileProductCard
                  key={product.product_id}
                  pharmacyId={pharmacy.id}
                  product={product}
                  onChanged={loadData}
                />
              ))
            )}
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
                          <div>
                            <p className="font-black text-slate-900">
                              {product.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Unité : {product.unit || "-"}
                            </p>
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
                          <StockStatusBadge status={product.stock_status} />
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
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-700">
            Produit
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            {product.name}
          </h3>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {product.generic_name || "DCI non renseignée"}
          </p>
        </div>

        <StockStatusBadge status={product.stock_status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MobileInfo
          label="Stock"
          value={Number(product.total_quantity || 0).toString()}
          strong
        />

        <MobileInfo
          label="Seuil"
          value={Number(product.min_stock || 0).toString()}
        />

        <MobileInfo label="Dosage" value={product.dosage || "-"} />

        <MobileInfo label="Forme" value={product.form || "-"} />

        <MobileInfo label="Unité" value={product.unit || "-"} />

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">Expiration</p>
          <div className="mt-2">
            <ExpirationBadge expiryDate={product.nearest_expiry_date} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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

function MobileInfo({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm ${
          strong ? "font-black text-slate-950" : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </p>
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
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
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