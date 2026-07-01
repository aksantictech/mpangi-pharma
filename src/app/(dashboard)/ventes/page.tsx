"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  ShoppingCart,
  Trash2,
  WifiOff,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  createSale,
  getRecentSales,
  getSellableProducts,
} from "@/services/sales.service";
import { getOfflineSellableProducts } from "@/services/offline-cache.service";
import {
  createOfflineSale,
  getPendingOfflineSales,
} from "@/services/offline-sales.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type {
  CartItem,
  PaymentMethod,
  Sale,
  SellableProduct,
} from "@/types/sale";

const MOBILE_PAGE_SIZE = 5;

type SaleCartItem = CartItem & {
  requiresPrescription?: boolean;
};

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "cash_cdf", label: "Cash CDF" },
  { value: "cash_usd", label: "Cash USD" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Carte" },
  { value: "credit", label: "Crédit client" },
  { value: "mixed", label: "Paiement mixte" },
];

type PendingOfflineSaleForDisplay = {
  id: string;
  local_invoice_number: string;
  customer_name: string | null;
  total: number;
  currency: string;
  status: string;
  created_at: string;
};

export default function SalesPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<SellableProduct[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [pendingOfflineSales, setPendingOfflineSales] = useState<
    PendingOfflineSaleForDisplay[]
  >([]);

  const [cart, setCart] = useState<SaleCartItem[]>([]);

  const [search, setSearch] = useState("");
  const [mobilePage, setMobilePage] = useState(1);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_cdf");
  const [currency, setCurrency] = useState("CDF");
  const [discount, setDiscount] = useState("0");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");

  const [isOnline, setIsOnline] = useState(true);
  const [productsSource, setProductsSource] = useState<"online" | "offline">(
    "online"
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSelling, setIsSelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdInvoiceHref, setCreatedInvoiceHref] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setProducts([]);
        setRecentSales([]);
        setPendingOfflineSales([]);
        return;
      }

      setPharmacy(currentPharmacy);

      const onlineNow =
        typeof navigator === "undefined" ? true : navigator.onLine;

      setIsOnline(onlineNow);

      const pendingSales = await getPendingOfflineSales(currentPharmacy.id);
      setPendingOfflineSales(pendingSales as PendingOfflineSaleForDisplay[]);

      if (onlineNow) {
        try {
          const [productsData, salesData] = await Promise.all([
            getSellableProducts(currentPharmacy.id),
            getRecentSales(currentPharmacy.id),
          ]);

          setProducts(productsData);
          setRecentSales(salesData);
          setProductsSource("online");
          return;
        } catch {
          const offlineProducts = await getOfflineSellableProducts(
            currentPharmacy.id
          );

          setProducts(offlineProducts as unknown as SellableProduct[]);
          setRecentSales([]);
          setProductsSource("offline");

          setErrorMessage(
            "Connexion Supabase instable. La caisse utilise les produits offline disponibles sur ce terminal."
          );

          return;
        }
      }

      const offlineProducts = await getOfflineSellableProducts(
        currentPharmacy.id
      );

      setProducts(offlineProducts as unknown as SellableProduct[]);
      setRecentSales([]);
      setProductsSource("offline");
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
    function updateNetworkStatus() {
      setIsOnline(navigator.onLine);
    }

    updateNetworkStatus();

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!pharmacy) return;

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  useEffect(() => {
    setMobilePage(1);
  }, [search]);

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

  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  function handlePaymentMethodChange(method: PaymentMethod) {
    setPaymentMethod(method);

    if (method === "cash_usd") {
      setCurrency("USD");
    }

    if (method === "cash_cdf") {
      setCurrency("CDF");
    }
  }

  function addToCart(product: SellableProduct) {
    setErrorMessage("");
    setSuccessMessage("");
    setCreatedInvoiceHref("");

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

    const existingItem = cart.find(
      (item) => item.productId === product.product_id
    );

    if (
      existingItem &&
      existingItem.quantity + 1 > existingItem.availableQuantity
    ) {
      setErrorMessage("Quantité demandée supérieure au stock disponible.");
      return;
    }

    setCart((current) => {
      const currentItem = current.find(
        (item) => item.productId === product.product_id
      );

      if (currentItem) {
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
          requiresPrescription: productRequiresPrescription(product),
        },
      ];
    });
  }

  function updateCartQuantity(productId: string, quantity: number) {
    setErrorMessage("");
    setSuccessMessage("");
    setCreatedInvoiceHref("");

    setCart((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item;

        const safeQuantity = Math.max(
          1,
          Math.min(
            Number.isFinite(quantity) ? quantity : 1,
            item.availableQuantity
          )
        );

        return {
          ...item,
          quantity: safeQuantity,
        };
      })
    );
  }

  function removeFromCart(productId: string) {
    setCreatedInvoiceHref("");
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  function clearCart() {
    setCart([]);
    setDiscount("0");
    setCustomerName("");
    setNotes("");
    setErrorMessage("");
    setSuccessMessage("");
    setCreatedInvoiceHref("");
  }

  async function handleValidateSale() {
    if (!pharmacy) return;

    setIsSelling(true);
    setErrorMessage("");
    setSuccessMessage("");
    setCreatedInvoiceHref("");

    try {
      if (cart.length === 0) {
        throw new Error("Le panier est vide.");
      }

      const prescriptionItems = cart.filter((item) => item.requiresPrescription);

      if (prescriptionItems.length > 0) {
        const confirmedPrescription = window.confirm(
          [
            "Cette vente contient un ou plusieurs médicaments qui nécessitent une ordonnance.",
            "",
            ...prescriptionItems.map((item) => `- ${item.name}`),
            "",
            "Confirmez-vous que l’ordonnance a été vérifiée avant la vente ?",
          ].join("\n")
        );

        if (!confirmedPrescription) {
          setIsSelling(false);
          return;
        }
      }

      if (!isOnline || productsSource === "offline") {
        const result = await createOfflineSale({
          pharmacyId: pharmacy.id,
          items: cart,
          paymentMethod,
          currency,
          discount: discountValue,
          customerName,
          notes,
        });

        setSuccessMessage(
          `Vente hors-ligne enregistrée. Ticket provisoire ${
            result.localInvoiceNumber
          } · Total ${Number(result.totalAmount).toLocaleString("fr-CD")} ${
            result.currency
          }. Synchronisation nécessaire dès retour d’internet.`
        );

        setCart([]);
        setDiscount("0");
        setCustomerName("");
        setNotes("");

        await loadData();
        return;
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

      const saleId = getCreatedSaleId(result);

      setCreatedInvoiceHref(saleId ? `/factures/${saleId}` : "/factures");

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
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <p className="font-semibold text-slate-500">
            Chargement de la caisse...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 md:rounded-[2rem] md:p-8">
          <h1 className="text-xl font-black text-amber-800 md:text-2xl">
            Aucune pharmacie trouvée
          </h1>

          <p className="mt-2 text-sm font-medium text-amber-700">
            Créez une pharmacie avant d’utiliser la caisse.
          </p>
        </div>
      </main>
    );
  }

  const isOfflineMode = !isOnline || productsSource === "offline";

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
                Ventes / Caisse
              </h1>

              <p className="mt-1 text-xs text-slate-500 md:mt-2 md:text-sm">
                Interface caisse adaptée au terminal Android.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </header>

        {isOfflineMode && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
            Mode hors-ligne actif : les ventes seront enregistrées localement et
            synchronisées plus tard.
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-3 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{successMessage}</p>
            </div>

            {!isOfflineMode && (
              <Link
                href={createdInvoiceHref || "/factures"}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800 sm:w-auto"
              >
                <Receipt className="h-4 w-4" />
                Voir / imprimer la facture
              </Link>
            )}
          </div>
        )}

        {pendingOfflineSales.length > 0 && (
          <section className="rounded-[1.5rem] border border-amber-100 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
            <h2 className="text-lg font-black text-slate-950 md:text-xl">
              Ventes hors-ligne en attente
            </h2>

            <div className="mt-3 space-y-2">
              {pendingOfflineSales.map((sale) => (
                <article
                  key={sale.id}
                  className="rounded-2xl border border-amber-100 bg-amber-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">
                        Ticket provisoire
                      </p>

                      <h3 className="mt-1 truncate text-sm font-black text-slate-950">
                        {sale.local_invoice_number}
                      </h3>

                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        {new Date(sale.created_at).toLocaleString("fr-CD")}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-amber-700">
                      {sale.status}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between text-xs font-black text-slate-800">
                    <span>{sale.customer_name || "Client comptoir"}</span>
                    <span>{formatMoney(sale.total, sale.currency)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-3 xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-700">
                Panier
              </p>

              <p className="mt-1 text-xs font-bold text-slate-600">
                {totalItems} article(s) · {cart.length} produit(s)
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500">Total</p>
              <p className="text-lg font-black text-slate-950">
                {formatMoney(total, currency)}
              </p>
            </div>
          </div>

          <a
            href="#panier-caisse"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
          >
            <ShoppingCart className="h-4 w-4" />
            Ouvrir panier / paiement
          </a>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_430px] xl:gap-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-lg font-black text-slate-950 md:text-xl">
                  Produits disponibles
                </h2>

                <p className="mt-1 text-xs text-slate-500 md:text-sm">
                  Source :{" "}
                  <span className="font-black">
                    {productsSource === "online" ? "Supabase" : "Cache offline"}
                  </span>
                </p>
              </div>

              <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:w-96">
                <Search className="h-5 w-5 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nom, DCI, dosage..."
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
                onPrevious={() =>
                  setMobilePage((page) => Math.max(1, page - 1))
                }
                onNext={() =>
                  setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
                }
              />

              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                  Aucun produit disponible. Synchronisez d’abord les produits en
                  ligne si vous voulez vendre hors-ligne.
                </div>
              ) : (
                mobileProducts.map((product) => (
                  <ProductSaleCard
                    key={product.product_id}
                    product={product}
                    onAdd={() => addToCart(product)}
                  />
                ))
              )}

              <MobilePagination
                page={safeMobilePage}
                totalPages={mobileTotalPages}
                totalItems={filteredProducts.length}
                pageSize={MOBILE_PAGE_SIZE}
                onPrevious={() =>
                  setMobilePage((page) => Math.max(1, page - 1))
                }
                onNext={() =>
                  setMobilePage((page) => Math.min(mobileTotalPages, page + 1))
                }
              />
            </div>

            <div className="hidden grid-cols-1 gap-3 md:grid-cols-2 xl:grid">
              {filteredProducts.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500 md:col-span-2">
                  Aucun produit disponible. Synchronisez d’abord les produits en
                  ligne si vous voulez vendre hors-ligne.
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <ProductSaleCard
                    key={product.product_id}
                    product={product}
                    onAdd={() => addToCart(product)}
                  />
                ))
              )}
            </div>
          </div>

          <aside
            id="panier-caisse"
            className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5 xl:sticky xl:top-6 xl:self-start"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 md:h-12 md:w-12">
                  <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950 md:text-xl">
                    Panier
                  </h2>

                  <p className="text-xs text-slate-500 md:text-sm">
                    {cart.length} produit(s)
                  </p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                >
                  Vider
                </button>
              )}
            </div>

            <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1 xl:max-h-[40vh]">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  Panier vide. Ajoutez un produit depuis la liste.
                </div>
              ) : (
                cart.map((item) => (
                  <CartItemCard
                    key={item.productId}
                    item={item}
                    currency={currency}
                    onDecrease={() =>
                      updateCartQuantity(item.productId, item.quantity - 1)
                    }
                    onIncrease={() =>
                      updateCartQuantity(item.productId, item.quantity + 1)
                    }
                    onChangeQuantity={(quantity) =>
                      updateCartQuantity(item.productId, quantity)
                    }
                    onRemove={() => removeFromCart(item.productId)}
                  />
                ))
              )}
            </div>

            {cart.some((item) => item.requiresPrescription) && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
                Ce panier contient un médicament sous ordonnance. Vérifiez l’ordonnance avant de valider la vente.
              </div>
            )}

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Devise">
                  <select
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="form-input"
                  >
                    <option value="CDF">CDF</option>
                    <option value="USD">USD</option>
                  </select>
                </FormField>

                <FormField label="Paiement">
                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      handlePaymentMethodChange(
                        event.target.value as PaymentMethod
                      )
                    }
                    className="form-input"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Client optionnel">
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="form-input"
                  placeholder="Nom du client"
                />
              </FormField>

              <FormField label={`Remise (${currency})`}>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className="form-input"
                />
              </FormField>

              <FormField label="Note optionnelle">
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="form-input min-h-16 resize-none"
                  placeholder="Observation..."
                />
              </FormField>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Sous-total</span>
                  <span>{formatMoney(subtotal, currency)}</span>
                </div>

                <div className="mt-2 flex justify-between text-sm text-slate-600">
                  <span>Remise</span>
                  <span>{formatMoney(discountValue, currency)}</span>
                </div>

                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-950 md:text-xl">
                  <span>Total</span>
                  <span>{formatMoney(total, currency)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isSelling || cart.length === 0}
                onClick={handleValidateSale}
                className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
                  isOfflineMode
                    ? "bg-amber-700 shadow-amber-100 hover:bg-amber-800"
                    : "bg-blue-700 shadow-blue-100 hover:bg-blue-800"
                }`}
              >
                <Receipt className="h-5 w-5" />
                {isSelling
                  ? "Validation..."
                  : isOfflineMode
                    ? "Enregistrer vente hors-ligne"
                    : "Valider la vente"}
              </button>
            </div>
          </aside>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <h2 className="text-lg font-black text-slate-950 md:text-xl">
            Dernières ventes en ligne
          </h2>

          <div className="mt-4 space-y-2 xl:hidden">
            {recentSales.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                Aucune vente en ligne chargée.
              </div>
            ) : (
              recentSales.map((sale) => (
                <article
                  key={sale.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-700">
                        Facture
                      </p>

                      <h3 className="mt-1 truncate text-sm font-black text-slate-950">
                        {sale.invoice_number}
                      </h3>

                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        {new Date(sale.created_at).toLocaleString("fr-CD")}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                      {formatPaymentMethod(sale.payment_method)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MobileInfo
                      label="Client"
                      value={sale.customer_name || "-"}
                    />

                    <MobileInfo
                      label="Total"
                      value={formatMoney(
                        Number(sale.total_amount || 0),
                        sale.currency
                      )}
                      strong
                    />
                  </div>

                  <Link
                    href={`/factures/${sale.id}`}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100"
                  >
                    <Receipt className="h-4 w-4" />
                    Voir / imprimer
                  </Link>
                </article>
              ))
            )}
          </div>

          <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-sm font-semibold text-slate-500"
                      >
                        Aucune vente en ligne chargée.
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
                          {formatMoney(
                            Number(sale.total_amount || 0),
                            sale.currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {new Date(sale.created_at).toLocaleString("fr-CD")}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/factures/${sale.id}`}
                            className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
                          >
                            <Receipt className="h-4 w-4" />
                            Voir / imprimer
                          </Link>
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

function ProductSaleCard({
  product,
  onAdd,
}: {
  product: SellableProduct;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.99] md:min-h-32 md:rounded-3xl md:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950 md:text-base">
            {product.name}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 md:text-sm">
            {[product.dosage, product.form].filter(Boolean).join(" / ") ||
              product.generic_name ||
              "Produit"}
          </p>

          {product.generic_name && (
            <p className="mt-1 truncate text-[11px] text-slate-400 md:text-xs">
              DCI : {product.generic_name}
            </p>
          )}

          {productRequiresPrescription(product) && (
            <div className="mt-2">
              <PrescriptionBadge />
            </div>
          )}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white md:h-11 md:w-11">
          <Plus className="h-4 w-4 md:h-5 md:w-5" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black md:mt-4 md:text-xs">
        <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 md:px-3">
          Stock : {Number(product.total_quantity || 0)}
        </span>

        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 md:px-3">
          {formatMoney(Number(product.selling_price || 0), "CDF")}
        </span>

        {product.nearest_expiry_date && (
          <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700 md:px-3">
            Exp : {formatShortDate(product.nearest_expiry_date)}
          </span>
        )}
      </div>
    </button>
  );
}

function CartItemCard({
  item,
  currency,
  onDecrease,
  onIncrease,
  onChangeQuantity,
  onRemove,
}: {
  item: SaleCartItem;
  currency: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-3 md:rounded-3xl md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-black text-slate-950">
            {item.name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {[item.dosage, item.form].filter(Boolean).join(" / ") || "-"}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            Stock dispo : {item.availableQuantity}
          </p>

          {item.requiresPrescription && (
            <div className="mt-2">
              <PrescriptionBadge />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl p-2 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrease}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <Minus className="h-4 w-4" />
          </button>

          <input
            type="number"
            min="1"
            max={item.availableQuantity}
            value={item.quantity}
            onChange={(event) =>
              onChangeQuantity(Number(event.target.value || 1))
            }
            className="h-9 w-14 rounded-xl border border-slate-200 px-2 text-center text-sm font-black outline-none"
          />

          <button
            type="button"
            onClick={onIncrease}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm font-black text-slate-950">
          {formatMoney(item.quantity * item.unitPrice, currency)}
        </p>
      </div>
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-700 md:text-sm">
        {label}
      </span>
      {children}
    </label>
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

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function getCreatedSaleId(result: unknown) {
  const row = result as Record<string, unknown>;

  const value = row.sale_id ?? row.id ?? row.saleId;

  return value ? String(value) : "";
}

function formatPaymentMethod(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    cash_cdf: "Cash CDF",
    cash_usd: "Cash USD",
    mobile_money: "Mobile Money",
    card: "Carte",
    credit: "Crédit client",
    mixed: "Mixte",
  };

  return labels[method] ?? method;
}

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString("fr-CD")} ${currency}`;
}

function formatShortDate(value: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
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
