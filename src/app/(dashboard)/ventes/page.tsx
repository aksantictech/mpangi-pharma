"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  createSale,
  getRecentSales,
  getSellableProducts,
} from "@/services/sales.service";
import type { PharmacyWithRole } from "@/types/pharmacy";
import type {
  CartItem,
  PaymentMethod,
  Sale,
  SellableProduct,
} from "@/types/sale";

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "cash_cdf", label: "Cash CDF" },
  { value: "cash_usd", label: "Cash USD" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Carte" },
  { value: "credit", label: "Crédit client" },
  { value: "mixed", label: "Paiement mixte" },
];

export default function SalesPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<SellableProduct[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_cdf");
  const [currency, setCurrency] = useState("CDF");
  const [discount, setDiscount] = useState("0");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSelling, setIsSelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setProducts([]);
        setRecentSales([]);
        return;
      }

      setPharmacy(currentPharmacy);

      const [productsData, salesData] = await Promise.all([
        getSellableProducts(currentPharmacy.id),
        getRecentSales(currentPharmacy.id),
      ]);

      setProducts(productsData);
      setRecentSales(salesData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger la caisse."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) return products;

    return products.filter((product) => {
      const value = [
        product.name,
        product.generic_name,
        product.dosage,
        product.form,
        product.barcode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return value.includes(normalized);
    });
  }, [products, search]);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);

  function addToCart(product: SellableProduct) {
    setErrorMessage("");
    setSuccessMessage("");

    const availableQuantity = Number(product.total_quantity || 0);
    const unitPrice = Number(product.selling_price || 0);

    if (availableQuantity <= 0) {
      setErrorMessage("Ce produit n’a pas de stock disponible.");
      return;
    }

    if (unitPrice <= 0) {
      setErrorMessage("Ce produit n’a pas de prix de vente valide.");
      return;
    }

    setCart((current) => {
      const existingItem = current.find(
        (item) => item.productId === product.product_id
      );

      if (existingItem) {
        if (existingItem.quantity + 1 > existingItem.availableQuantity) {
          return current;
        }

        return current.map((item) =>
          item.productId === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product.product_id,
          name: product.name,
          dosage: product.dosage,
          form: product.form,
          unit: product.unit,
          quantity: 1,
          unitPrice,
          availableQuantity,
        },
      ];
    });
  }

  function updateCartQuantity(productId: string, quantity: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.productId !== productId) return item;

          const safeQuantity = Math.max(
            1,
            Math.min(quantity, item.availableQuantity)
          );

          return {
            ...item,
            quantity: safeQuantity,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  async function handleValidateSale() {
    if (!pharmacy) return;

    setIsSelling(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (cart.length === 0) {
        throw new Error("Le panier est vide.");
      }

      const result = await createSale({
        pharmacyId: pharmacy.id,
        items: cart,
        paymentMethod,
        currency,
        discount: discountValue,
        customerName,
        notes,
      });

      setSuccessMessage(
        `Vente validée. Facture ${result.invoice_number} · Total ${Number(
          result.total_amount
        ).toLocaleString("fr-CD")} ${currency}`
      );

      setCart([]);
      setDiscount("0");
      setCustomerName("");
      setNotes("");

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de valider la vente."
      );
    } finally {
      setIsSelling(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement de la caisse...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-800">
            Aucune pharmacie trouvée
          </h1>
          <p className="mt-2 text-sm font-medium text-amber-700">
            Créez une pharmacie avant d’utiliser la caisse.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                {pharmacy.name}
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Ventes / Caisse
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Recherche produit, panier, paiement et sortie automatique du
                stock.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            {successMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Produits disponibles
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Cliquez sur un produit pour l’ajouter au panier.
                </p>
              </div>

              <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-96">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nom, DCI, dosage ou code-barres..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredProducts.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500 md:col-span-2">
                  Aucun produit disponible.
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.product_id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="rounded-3xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-black text-slate-950">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {[product.dosage, product.form]
                            .filter(Boolean)
                            .join(" / ") || product.generic_name || "Produit"}
                        </p>
                      </div>

                      <Plus className="h-5 w-5 text-blue-700" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                        Stock : {Number(product.total_quantity || 0)}
                      </span>

                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                        {Number(product.selling_price || 0).toLocaleString(
                          "fr-CD"
                        )}{" "}
                        CDF
                      </span>

                      {product.nearest_expiry_date && (
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">
                          Exp : {product.nearest_expiry_date}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ShoppingCart className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950">Panier</h2>
                <p className="text-sm text-slate-500">
                  {cart.length} produit(s)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {cart.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                  Le panier est vide.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-3xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {[item.dosage, item.form].filter(Boolean).join(" / ")}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="rounded-xl p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(
                              item.productId,
                              item.quantity - 1
                            )
                          }
                          className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <input
                          type="number"
                          min="1"
                          max={item.availableQuantity}
                          value={item.quantity}
                          onChange={(event) =>
                            updateCartQuantity(
                              item.productId,
                              Number(event.target.value || 1)
                            )
                          }
                          className="w-16 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-black outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(
                              item.productId,
                              item.quantity + 1
                            )
                          }
                          className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="text-sm font-black text-slate-950">
                        {(item.quantity * item.unitPrice).toLocaleString(
                          "fr-CD"
                        )}{" "}
                        CDF
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Devise
                  </span>
                  <select
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="form-input"
                  >
                    <option value="CDF">CDF</option>
                    <option value="USD">USD</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Paiement
                  </span>
                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(event.target.value as PaymentMethod)
                    }
                    className="form-input"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Client optionnel
                </span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="form-input"
                  placeholder="Nom du client"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Remise
                </span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className="form-input"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Note optionnelle
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="form-input min-h-20 resize-none"
                  placeholder="Observation..."
                />
              </label>

              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Sous-total</span>
                  <span>{subtotal.toLocaleString("fr-CD")} CDF</span>
                </div>

                <div className="mt-2 flex justify-between text-sm text-slate-600">
                  <span>Remise</span>
                  <span>{discountValue.toLocaleString("fr-CD")} CDF</span>
                </div>

                <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-xl font-black text-slate-950">
                  <span>Total</span>
                  <span>{total.toLocaleString("fr-CD")} CDF</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isSelling || cart.length === 0}
                onClick={handleValidateSale}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Receipt className="h-5 w-5" />
                {isSelling ? "Validation..." : "Valider la vente"}
              </button>
            </div>
          </aside>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Dernières ventes
          </h2>

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentSales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-sm font-semibold text-slate-500"
                    >
                      Aucune vente enregistrée.
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-5 py-4 font-black text-slate-900">
                        {sale.invoice_number}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {sale.customer_name || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatPaymentMethod(sale.payment_method)}
                      </td>

                      <td className="px-5 py-4 font-black text-slate-950">
                        {Number(sale.total_amount).toLocaleString("fr-CD")}{" "}
                        {sale.currency}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {new Date(sale.created_at).toLocaleString("fr-CD")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function formatPaymentMethod(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    cash_cdf: "Cash CDF",
    cash_usd: "Cash USD",
    mobile_money: "Mobile Money",
    card: "Carte",
    credit: "Crédit",
    mixed: "Mixte",
  };

  return labels[method] ?? method;
}