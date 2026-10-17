"use client";

import { formatDisplayMoney, useDisplayCurrency } from "@/lib/currency";
import PageLoading from "@/components/ui/PageLoading";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Minus,
  Plus,
  Printer,
  Receipt,
  RefreshCcw,
  ScanLine,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";

import CurrencySwitcher from "@/components/layout/CurrencySwitcher";
import {
  CameraScanner,
  canScanWithCamera,
} from "@/components/products/BarcodeField";
import { findProductByBarcode, playScanBeep } from "@/lib/barcode";
import {
  useBarcodeScanner,
  useScanToCartSetting,
} from "@/lib/use-barcode-scanner";
import { isServerReachable, useConnectivity } from "@/lib/offline/connectivity";
import { isOfflineError } from "@/lib/offline/network";
import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  baseMethodForKind,
  getPaymentMethods,
} from "@/services/payment-methods.service";
import {
  createSale,
  getRecentSales,
  getSellableProducts,
} from "@/services/sales.service";
import { getOfflineSellableProducts } from "@/services/offline-cache.service";
import {
  createLocalInvoiceNumber,
  createOfflineSale,
  getPendingOfflineSales,
  saleReferenceNote,
} from "@/services/offline-sales.service";

import type { PharmacyPaymentMethod } from "@/types/kit";
import type { PharmacyWithRole } from "@/types/pharmacy";
import type {
  CartItem,
  PaymentMethod,
  Sale,
  SellableProduct,
} from "@/types/sale";

// Nombre de tuiles produit affichées d'un coup ; « Afficher plus » en ajoute.
const PAGE_SIZE = 24;
const LOW_STOCK_THRESHOLD = 5;

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
const CURRENT_PHARMACY_CACHE_KEY = "mpangi_pharma_current_pharmacy";

// « En ligne » = le serveur répond (pas seulement le Wi-Fi) ; voir
// lib/offline/connectivity.ts.
function getOnlineState() {
  return isServerReachable();
}

function cacheCurrentPharmacy(pharmacy: PharmacyWithRole) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      CURRENT_PHARMACY_CACHE_KEY,
      JSON.stringify(pharmacy)
    );
  } catch {
    // Le cache navigateur peut être indisponible sur certains terminaux.
  }
}

function getCachedCurrentPharmacy() {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(CURRENT_PHARMACY_CACHE_KEY);

    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue) as PharmacyWithRole;

    if (!parsedValue?.id) return null;

    return parsedValue;
  } catch {
    return null;
  }
}


export default function SalesPage() {
  // Re-rendu quand la devise d'affichage (CDF/USD/EUR) change.
  useDisplayCurrency();
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<SellableProduct[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [pendingOfflineSales, setPendingOfflineSales] = useState<
    PendingOfflineSaleForDisplay[]
  >([]);

  const [cart, setCart] = useState<SaleCartItem[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [formFilter, setFormFilter] = useState("all");
  const [prescriptionFilter, setPrescriptionFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("available");
  // Le compteur est lié à la combinaison de filtres : dès qu'elle change, on
  // repart de la première page sans avoir besoin d'un effet de remise à zéro.
  const [pager, setPager] = useState({ key: "", count: PAGE_SIZE });
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Scan code-barres : ajout direct au panier (option mémorisée sur l'appareil).
  const [scanToCart, setScanToCart] = useScanToCartSetting();
  const [scanNotice, setScanNotice] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const scanNoticeTimer = useRef<number | undefined>(undefined);
  const [cartOpen, setCartOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_cdf");
  // Modes personnalisés (sociétés conventionnées…) configurés dans Paramètres.
  const [customMethods, setCustomMethods] = useState<PharmacyPaymentMethod[]>(
    []
  );
  const [customMethodId, setCustomMethodId] = useState("");
  const currency = "CDF";
  const [discount, setDiscount] = useState("0");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");

  const { online: serverReachable } = useConnectivity();
  const isOnline = serverReachable && getOnlineState();
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

    const onlineNow = getOnlineState();

    try {
      let currentPharmacy: PharmacyWithRole | null = null;
      let isUsingCachedPharmacy = false;

      if (onlineNow) {
        try {
          currentPharmacy = await getCurrentPharmacy();

          if (currentPharmacy) {
            cacheCurrentPharmacy(currentPharmacy);
          }
        } catch {
          currentPharmacy = getCachedCurrentPharmacy();
          isUsingCachedPharmacy = Boolean(currentPharmacy);
        }
      } else {
        currentPharmacy = getCachedCurrentPharmacy();
        isUsingCachedPharmacy = Boolean(currentPharmacy);
      }

      if (!currentPharmacy) {
        setPharmacy(null);
        setProducts([]);
        setRecentSales([]);
        setPendingOfflineSales([]);

        if (!onlineNow) {
          setErrorMessage(
            "Aucune pharmacie en cache sur ce terminal. Connectez-vous au moins une fois avec Internet, puis synchronisez les produits avant d’utiliser le mode hors-ligne."
          );
        }

        return;
      }

      setPharmacy(currentPharmacy);

      const pendingSales = await getPendingOfflineSales(currentPharmacy.id);
      setPendingOfflineSales(pendingSales as PendingOfflineSaleForDisplay[]);

      if (onlineNow && !isUsingCachedPharmacy) {
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
          // Si Supabase devient instable, on bascule automatiquement sur le cache offline.
        }
      }

      const offlineProducts = await getOfflineSellableProducts(
        currentPharmacy.id
      );

      setProducts(offlineProducts as unknown as SellableProduct[]);
      setRecentSales([]);
      setProductsSource("offline");

      if (offlineProducts.length === 0) {
        setErrorMessage(
          "Aucun produit offline trouvé sur ce terminal. Remettez Internet, allez dans Synchronisation, puis synchronisez les produits."
        );
      } else if (!onlineNow) {
        setErrorMessage(
          "Mode hors-ligne actif. Les produits affichés viennent du cache de ce terminal."
        );
      } else {
        setErrorMessage(
          "Connexion Supabase instable. La caisse utilise les produits offline disponibles sur ce terminal."
        );
      }
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

  useEffect(() => {
    if (!pharmacy) return;

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    const origins = new Set<string>();
    const forms = new Set<string>();

    for (const product of products) {
      const row = product as unknown as Record<string, unknown>;

      const category = String(
        row.category_name ??
          row.category ??
          row.product_category ??
          ""
      ).trim();

      const origin = String(
        row.origin_label ??
          row.origin_code ??
          row.country ??
          ""
      ).trim();

      const pharmaceuticalForm = String(product.form ?? "").trim();

      if (category) categories.add(category);
      if (origin) origins.add(origin);
      if (pharmaceuticalForm) forms.add(pharmaceuticalForm);
    }

    return {
      categories: Array.from(categories).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
      origins: Array.from(origins).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
      forms: Array.from(forms).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return products.filter((product) => {
      const row = product as unknown as Record<string, unknown>;

      const searchableValue = [
        product.name,
        product.generic_name,
        product.dosage,
        product.form,
        product.barcode,
        row.category_name,
        row.category,
        row.origin_label,
        row.origin_code,
        row.country,
        row.manufacturer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const category = String(
        row.category_name ??
          row.category ??
          row.product_category ??
          ""
      );

      const origin = String(
        row.origin_label ??
          row.origin_code ??
          row.country ??
          ""
      );

      const matchesSearch =
        !normalized || searchableValue.includes(normalized);

      const matchesCategory =
        categoryFilter === "all" || category === categoryFilter;

      const matchesOrigin =
        originFilter === "all" || origin === originFilter;

      const matchesForm =
        formFilter === "all" || String(product.form ?? "") === formFilter;

      const requiresPrescription = productRequiresPrescription(product);

      const matchesPrescription =
        prescriptionFilter === "all" ||
        (prescriptionFilter === "required" && requiresPrescription) ||
        (prescriptionFilter === "not_required" && !requiresPrescription);

      const quantity = Number(product.total_quantity || 0);

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "available" && quantity > 0) ||
        (stockFilter === "low" &&
          quantity > 0 &&
          quantity <= LOW_STOCK_THRESHOLD) ||
        (stockFilter === "out" && quantity <= 0);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesOrigin &&
        matchesForm &&
        matchesPrescription &&
        matchesStock
      );
    });
  }, [
    products,
    search,
    categoryFilter,
    originFilter,
    formFilter,
    prescriptionFilter,
    stockFilter,
  ]);

  const filterKey = [
    search,
    categoryFilter,
    originFilter,
    formFilter,
    prescriptionFilter,
    stockFilter,
  ].join("\u0001");

  const visibleCount = pager.key === filterKey ? pager.count : PAGE_SIZE;
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  // Filtres « avancés » (hors recherche et catégorie, déjà visibles) qui
  // s'écartent de leur valeur par défaut : affiché sur le bouton Filtres.
  const activeAdvancedFilters =
    (originFilter !== "all" ? 1 : 0) +
    (formFilter !== "all" ? 1 : 0) +
    (prescriptionFilter !== "all" ? 1 : 0) +
    (stockFilter !== "available" ? 1 : 0);

  const cartQuantities = useMemo(() => {
    const quantities = new Map<string, number>();

    for (const item of cart) {
      quantities.set(item.productId, item.quantity);
    }

    return quantities;
  }, [cart]);

  function showMoreProducts() {
    setPager({ key: filterKey, count: visibleCount + PAGE_SIZE });
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("all");
    setOriginFilter("all");
    setFormFilter("all");
    setPrescriptionFilter("all");
    setStockFilter("available");
  }

  function openCamera() {
    if (!canScanWithCamera()) {
      showScanNotice(
        "error",
        "La caméra ne peut pas lire les codes-barres sur cet appareil. Utilisez un lecteur de code-barres."
      );
      return;
    }

    setIsCameraOpen(true);
  }

  function showScanNotice(tone: "ok" | "error", text: string) {
    window.clearTimeout(scanNoticeTimer.current);
    setScanNotice({ tone, text });
    scanNoticeTimer.current = window.setTimeout(() => setScanNotice(null), 3500);
  }

  // Un code-barres a été lu (lecteur ou caméra) : le produit correspondant
  // est cherché dans TOUT le catalogue (même si un filtre le masque) et ajouté
  // au panier. Les refus (stock, prix) s'affichent via addToCart.
  function handleScan(code: string) {
    const product = findProductByBarcode(products, code);

    if (!product) {
      playScanBeep("error");
      showScanNotice("error", `Aucun produit avec le code-barres ${code}.`);
      return;
    }

    const added = addToCart(product);

    playScanBeep(added ? "ok" : "error");

    if (added) {
      showScanNotice("ok", `${product.name} ajouté au panier.`);
    } else {
      showScanNotice("error", `${product.name} : ajout impossible.`);
    }
  }

  // Lecteur USB / Bluetooth, même sans cliquer dans la recherche.
  useBarcodeScanner(handleScan, scanToCart && !isCameraOpen);

  // Saisie rapide dans la recherche : Entrée ajoute le produit dont le
  // code-barres correspond exactement (option « Scan direct »), ou l'unique
  // résultat de la recherche.
  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    const typed = search.trim();

    if (!typed) return;

    if (scanToCart) {
      const byBarcode = findProductByBarcode(products, typed);

      if (byBarcode || /^\d{6,}$/.test(typed)) {
        event.preventDefault();
        handleScan(typed);
        setSearch("");
        return;
      }
    }

    const match = filteredProducts.length === 1 ? filteredProducts[0] : undefined;

    if (!match) return;

    event.preventDefault();
    addToCart(match);
    setSearch("");
  }

  useEffect(() => {
    const pharmacyId = pharmacy?.id;

    if (!pharmacyId) return;

    let isMounted = true;

    // Échec silencieux (hors ligne, migration pas encore appliquée) : la
    // caisse reste utilisable avec les modes de paiement standard.
    getPaymentMethods(pharmacyId, { onlyActive: true })
      .then((methods) => {
        if (isMounted) setCustomMethods(methods);
      })
      .catch(() => {
        if (isMounted) setCustomMethods([]);
      });

    return () => {
      isMounted = false;
    };
  }, [pharmacy?.id]);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);
  const exchangeRate = Number(pharmacy?.exchange_rate || 2800);
  const totalUsd =
    exchangeRate > 0 ? total / exchangeRate : 0;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  function handlePaymentMethodChange(value: string) {
    if (value.startsWith("custom:")) {
      const id = value.slice("custom:".length);
      const method = customMethods.find((item) => item.id === id);

      if (method) {
        setCustomMethodId(method.id);
        setPaymentMethod(baseMethodForKind(method.kind));
        return;
      }
    }

    setCustomMethodId("");
    setPaymentMethod(value as PaymentMethod);
  }

  function addToCart(product: SellableProduct): boolean {
    setErrorMessage("");
    setSuccessMessage("");
    setCreatedInvoiceHref("");

    const availableQuantity = Number(product.total_quantity || 0);
    const unitPrice = Number(product.selling_price || 0);

    if (availableQuantity <= 0) {
      setErrorMessage("Ce produit n’a pas de stock disponible.");
      return false;
    }

    if (unitPrice <= 0) {
      setErrorMessage("Ce produit n’a pas de prix de vente valide.");
      return false;
    }

    const existingItem = cart.find(
      (item) => item.productId === product.product_id
    );

    if (
      existingItem &&
      existingItem.quantity + 1 > existingItem.availableQuantity
    ) {
      setErrorMessage("Quantité demandée supérieure au stock disponible.");
      return false;
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

    return true;
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

  // Vente enregistrée : on vide le panier, on referme le volet mobile et on
  // remonte en haut pour montrer la confirmation.
  function resetAfterSale() {
    setCart([]);
    setDiscount("0");
    setCustomerName("");
    setNotes("");
    setCartOpen(false);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
          customPaymentMethodId: customMethodId || undefined,
          currency,
          discount: discountValue,
          customerName,
          notes,
        });

        setSuccessMessage(
          `Ticket provisoire ${
            result.localInvoiceNumber
          } · Total ${formatMoney(
            Number(result.totalAmount),
            result.currency
          )}. Synchronisation nécessaire dès retour d’internet.`
        );

        resetAfterSale();

        await loadData();
        return;
      }

      // Référence de la vente, envoyée aussi au serveur : si la connexion
      // tombe en plein envoi, elle permet de retrouver la vente côté serveur
      // à la synchronisation et d'éviter un doublon.
      const localRef = createLocalInvoiceNumber();

      let result;

      try {
        result = await createSale({
          pharmacyId: pharmacy.id,
          items: cart,
          paymentMethod,
          customPaymentMethodId: customMethodId || undefined,
          currency,
          discount: discountValue,
          customerName,
          notes: [notes.trim(), saleReferenceNote(localRef)]
            .filter(Boolean)
            .join("\n\n"),
        });
      } catch (error) {
        // Internet a coupé pendant la vente : on ne la perd pas, elle est
        // enregistrée sur l'appareil (ticket provisoire) et partira dès le
        // retour de la connexion.
        if (!isOfflineError(error)) throw error;

        const offlineResult = await createOfflineSale({
          pharmacyId: pharmacy.id,
          items: cart,
          paymentMethod,
          customPaymentMethodId: customMethodId || undefined,
          currency,
          discount: discountValue,
          customerName,
          notes,
          localInvoiceNumber: localRef,
        });

        setSuccessMessage(
          `Connexion perdue : vente enregistrée sur cet appareil. Ticket provisoire ${
            offlineResult.localInvoiceNumber
          } · Total ${formatMoney(
            Number(offlineResult.totalAmount),
            offlineResult.currency
          )}. Elle sera envoyée dès le retour d’internet.`
        );

        resetAfterSale();

        await loadData();
        return;
      }

      const saleId = getCreatedSaleId(result);

      setCreatedInvoiceHref(saleId ? `/factures/${saleId}` : "/factures");

      setSuccessMessage(
        `Facture ${result.invoice_number} · Total ${formatMoney(
          Number(result.total_amount),
          "CDF"
        )}${
          paymentMethod === "cash_usd"
            ? ` · Équivalent ${(
                Number(result.total_amount) / exchangeRate
              ).toLocaleString("fr-CD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} USD`
            : ""
        }`
      );

      resetAfterSale();

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
    return <PageLoading label="Chargement de la caisse..." variant="pos" />;
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
    <main className="min-h-screen bg-slate-50 p-3 pb-24 md:p-6 xl:pb-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              {pharmacy.name}
            </p>

            <h1 className="mt-0.5 text-2xl font-black text-slate-950 md:text-3xl">
              Caisse
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
                isOfflineMode
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {isOfflineMode ? (
                <WifiOff className="h-4 w-4" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
              )}
              {isOfflineMode ? "Hors-ligne" : "En ligne"}
            </span>

            <button
              type="button"
              onClick={loadData}
              aria-label="Actualiser la caisse"
              title="Actualiser"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Devise d’affichage
          </span>

          <CurrencySwitcher />
        </div>

        {isOfflineMode && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
            Mode hors-ligne actif : les ventes seront enregistrées localement et
            synchronisées plus tard.
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="sticky top-20 z-30 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 shadow-sm"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="min-w-0 flex-1">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              aria-label="Fermer le message"
              className="shrink-0 rounded-lg p-1 text-red-700 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 md:p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <CheckCircle2 className="h-6 w-6" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-emerald-900">
                  {isOfflineMode ? "Vente enregistrée" : "Vente validée"}
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800">
                  {successMessage}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {!isOfflineMode && (
                <Link
                  href={createdInvoiceHref || "/factures"}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
                >
                  <Printer className="h-5 w-5" />
                  Voir / imprimer la facture
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setSuccessMessage("");
                  setCreatedInvoiceHref("");
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-100"
              >
                <Plus className="h-5 w-5" />
                Nouvelle vente
              </button>
            </div>
          </div>
        )}

        {pendingOfflineSales.length > 0 && (
          <details
            open
            className="group rounded-[1.5rem] border border-amber-100 bg-white p-4 shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <h2 className="text-base font-black text-slate-950">
                Ventes hors-ligne en attente ({pendingOfflineSales.length})
              </h2>

              <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
            </summary>

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
          </details>
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start xl:gap-6">
          <div className="min-w-0 space-y-3">
            <div className="flex gap-2">
              <label className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 focus-within:border-blue-600">
                <Search className="h-5 w-5 shrink-0 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="Produit, DCI ou code-barres…"
                  aria-label="Rechercher un produit"
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-400"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Effacer la recherche"
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>

              <button
                type="button"
                onClick={openCamera}
                aria-label="Scanner avec la caméra"
                title="Scanner avec la caméra"
                className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50"
              >
                <ScanLine className="h-5 w-5" />
                <span className="hidden sm:inline">Scanner</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className={`relative inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 px-4 text-sm font-black ${
                  filtersOpen || activeAdvancedFilters > 0
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                <span className="hidden sm:inline">Filtres</span>

                {activeAdvancedFilters > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 text-[11px] font-black text-white">
                    {activeAdvancedFilters}
                  </span>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={scanToCart}
                  onChange={(event) => setScanToCart(event.target.checked)}
                  className="h-4 w-4"
                />
                Scan direct : un code-barres lu ajoute le produit au panier
              </label>

              {scanNotice && (
                <p
                  role="status"
                  className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                    scanNotice.tone === "ok"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {scanNotice.text}
                </p>
              )}
            </div>

            {isCameraOpen && (
              <CameraScanner
                continuous
                onDetected={handleScan}
                onClose={() => setIsCameraOpen(false)}
                message={scanNotice?.text}
              />
            )}

            {filterOptions.categories.length > 0 && (
              <div
                role="group"
                aria-label="Catégories"
                className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
              >
                <CategoryChip
                  label="Tous"
                  active={categoryFilter === "all"}
                  onClick={() => setCategoryFilter("all")}
                />

                {filterOptions.categories.map((category) => (
                  <CategoryChip
                    key={category}
                    label={category}
                    active={categoryFilter === category}
                    onClick={() => setCategoryFilter(category)}
                  />
                ))}
              </div>
            )}

            {filtersOpen && (
              <div className="grid grid-cols-1 gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                <FilterSelect
                  label="Origine"
                  value={originFilter}
                  onChange={setOriginFilter}
                  options={filterOptions.origins}
                />

                <FilterSelect
                  label="Forme"
                  value={formFilter}
                  onChange={setFormFilter}
                  options={filterOptions.forms}
                />

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-600">
                    Ordonnance
                  </span>
                  <select
                    value={prescriptionFilter}
                    onChange={(event) =>
                      setPrescriptionFilter(event.target.value)
                    }
                    className="form-input bg-white"
                  >
                    <option value="all">Tous</option>
                    <option value="required">Ordonnance requise</option>
                    <option value="not_required">Sans ordonnance</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-600">
                    Stock
                  </span>
                  <select
                    value={stockFilter}
                    onChange={(event) => setStockFilter(event.target.value)}
                    className="form-input bg-white"
                  >
                    <option value="all">Tous</option>
                    <option value="available">Disponibles</option>
                    <option value="low">Stock faible</option>
                    <option value="out">Rupture</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 sm:col-span-2 lg:col-span-4"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            <p className="px-1 text-xs font-semibold text-slate-500">
              {filteredProducts.length} produit(s) · Source :{" "}
              <span className="font-black text-slate-700">
                {productsSource === "online" ? "Supabase" : "Cache offline"}
              </span>
            </p>

            {filteredProducts.length === 0 ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
                Aucun produit trouvé. Modifiez la recherche ou les filtres.
                Pour vendre hors-ligne, synchronisez d’abord les produits en
                ligne.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductTile
                    key={product.product_id}
                    product={product}
                    inCartQuantity={cartQuantities.get(product.product_id) ?? 0}
                    onAdd={() => addToCart(product)}
                  />
                ))}
              </div>
            )}

            {filteredProducts.length > visibleCount && (
              <button
                type="button"
                onClick={showMoreProducts}
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Afficher plus ({filteredProducts.length - visibleCount}{" "}
                restants)
              </button>
            )}
          </div>

          {cartOpen && (
            <div
              aria-hidden="true"
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 z-[85] bg-slate-950/50 xl:hidden"
            />
          )}

          <aside
            id="panier-caisse"
            aria-label="Panier"
            className={`border border-slate-200 bg-white xl:sticky xl:top-24 xl:flex xl:max-h-[calc(100dvh-7rem)] xl:flex-col xl:self-start xl:rounded-[2rem] xl:shadow-sm ${
              cartOpen
                ? "fixed inset-x-0 bottom-0 z-[90] flex max-h-[92dvh] flex-col rounded-t-[2rem] shadow-2xl xl:inset-x-auto xl:bottom-auto xl:z-auto"
                : "hidden"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-4 md:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <ShoppingCart className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-lg font-black leading-tight text-slate-950">
                    Panier
                  </h2>

                  <p className="text-xs font-semibold text-slate-500">
                    {totalItems} article(s) · {cart.length} produit(s)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                  >
                    Vider
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  aria-label="Fermer le panier"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 xl:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 md:px-5">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
                  Panier vide. Touchez un produit pour l’ajouter.
                </div>
              ) : (
                cart.map((item) => (
                  <CartLine
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

              {cart.some((item) => item.requiresPrescription) && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
                  Ce panier contient un médicament sous ordonnance. Vérifiez
                  l’ordonnance avant d’encaisser.
                </div>
              )}

              <FormField label="Mode de paiement">
                <select
                  value={
                    customMethodId ? `custom:${customMethodId}` : paymentMethod
                  }
                  onChange={(event) =>
                    handlePaymentMethodChange(event.target.value)
                  }
                  className="form-input min-h-12"
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                  {customMethods.length > 0 && (
                    <optgroup label="Sociétés et autres modes">
                      {customMethods.map((method) => (
                        <option key={method.id} value={`custom:${method.id}`}>
                          {method.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </FormField>

              <details className="group rounded-2xl border border-slate-200">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-slate-700">
                      Client, remise, note
                    </span>

                    {(customerName || discountValue > 0 || notes) && (
                      <span className="block truncate text-xs font-semibold text-blue-700">
                        {[
                          customerName,
                          discountValue > 0
                            ? `Remise ${formatMoney(discountValue, currency)}`
                            : "",
                          notes ? "Note ajoutée" : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>

                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>

                <div className="space-y-3 border-t border-slate-100 p-4">
                  <FormField label="Client optionnel">
                    <input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      className="form-input"
                      placeholder="Nom du client"
                    />
                  </FormField>

                  <FormField label="Remise (CDF)">
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
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
                </div>
              </details>
            </div>

            <div className="shrink-0 space-y-3 border-t border-slate-100 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-5 xl:rounded-b-[2rem] xl:pb-5">
              {discountValue > 0 && (
                <div className="space-y-1 text-sm font-semibold text-slate-500">
                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span>{formatMoney(subtotal, currency)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Remise</span>
                    <span>- {formatMoney(discountValue, currency)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-end justify-between gap-3">
                <span className="pb-1 text-sm font-black uppercase tracking-wide text-slate-500">
                  Total
                </span>

                <div className="text-right">
                  <p className="text-3xl font-black leading-none text-slate-950">
                    {formatMoney(total, "CDF")}
                  </p>

                  {paymentMethod === "cash_usd" && (
                    <p className="mt-1.5 text-xs font-bold text-blue-700">
                      ≈{" "}
                      {totalUsd.toLocaleString("fr-CD", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      USD · 1 USD = {exchangeRate.toLocaleString("fr-CD")} CDF
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={isSelling || cart.length === 0}
                onClick={handleValidateSale}
                className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
                  isOfflineMode
                    ? "bg-amber-700 shadow-amber-100 hover:bg-amber-800"
                    : "bg-blue-700 shadow-blue-100 hover:bg-blue-800"
                }`}
              >
                <Receipt className="h-5 w-5" />
                {isSelling
                  ? "Validation..."
                  : isOfflineMode
                    ? "Enregistrer hors-ligne"
                    : "Encaisser"}
              </button>
            </div>
          </aside>
        </section>

        {!cartOpen && cart.length > 0 && (
          <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] px-3 xl:hidden">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-blue-700 px-4 py-3 text-white shadow-xl shadow-blue-900/20"
            >
              <span className="flex items-center gap-3">
                <span className="relative">
                  <ShoppingCart className="h-6 w-6" />

                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-blue-800">
                    {totalItems}
                  </span>
                </span>

                <span className="text-sm font-black">Voir le panier</span>
              </span>

              <span className="text-lg font-black">
                {formatMoney(total, currency)}
              </span>
            </button>
          </div>
        )}

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
                      {(sale.payment_method_label || formatPaymentMethod(sale.payment_method))}
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
                          {(sale.payment_method_label || formatPaymentMethod(sale.payment_method))}
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

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-black ${
        active
          ? "border-blue-700 bg-blue-700 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function ProductTile({
  product,
  inCartQuantity,
  onAdd,
}: {
  product: SellableProduct;
  inCartQuantity: number;
  onAdd: () => void;
}) {
  const stock = Number(product.total_quantity || 0);
  const isOut = stock <= 0;
  const isLow = stock > 0 && stock <= LOW_STOCK_THRESHOLD;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={isOut}
      className={`relative flex min-h-36 flex-col justify-between rounded-2xl border-2 p-3 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
        inCartQuantity > 0
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200 bg-white hover:border-blue-300"
      }`}
    >
      {inCartQuantity > 0 && (
        <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-700 px-2 text-xs font-black text-white shadow">
          {inCartQuantity}
        </span>
      )}

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950">
          {product.name}
        </h3>

        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
          {[product.dosage, product.form].filter(Boolean).join(" / ") ||
            product.generic_name ||
            "Produit"}
        </p>

        {productRequiresPrescription(product) && (
          <div className="mt-2">
            <PrescriptionBadge />
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-lg font-black leading-none text-blue-800">
          {formatMoney(Number(product.selling_price || 0), "CDF")}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-black">
          <span
            className={`whitespace-nowrap ${
              isOut
                ? "text-red-700"
                : isLow
                  ? "text-amber-700"
                  : "text-slate-500"
            }`}
          >
            {isOut ? "Rupture" : `Stock ${stock}`}
          </span>

          {product.nearest_expiry_date && (
            <span className="whitespace-nowrap text-orange-700">
              Exp {formatExpiryShort(product.nearest_expiry_date)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function CartLine({
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
    <div className="rounded-2xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-black text-slate-950">
            {item.name}
          </p>

          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {[item.dosage, item.form].filter(Boolean).join(" / ")}
            {[item.dosage, item.form].some(Boolean) ? " · " : ""}
            {formatMoney(item.unitPrice, currency)}
          </p>

          {item.requiresPrescription && (
            <div className="mt-1.5">
              <PrescriptionBadge />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Retirer ${item.name}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDecrease}
            aria-label="Diminuer la quantité"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <Minus className="h-4 w-4" />
          </button>

          <input
            type="number"
            min="1"
            max={item.availableQuantity}
            inputMode="numeric"
            value={item.quantity}
            aria-label={`Quantité de ${item.name}`}
            onChange={(event) =>
              onChangeQuantity(Number(event.target.value || 1))
            }
            className="h-11 w-14 rounded-xl border border-slate-200 px-1 text-center text-base font-black outline-none focus:border-blue-600"
          />

          <button
            type="button"
            onClick={onIncrease}
            disabled={item.quantity >= item.availableQuantity}
            aria-label="Augmenter la quantité"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-base font-black text-slate-950">
          {formatMoney(item.quantity * item.unitPrice, currency)}
        </p>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-600">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="form-input bg-white"
      >
        <option value="all">Tous</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
  return formatDisplayMoney(value, currency);
}

// Péremption courte (MM/AA) pour tenir sur une tuile produit.
function formatExpiryShort(value: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fr-FR", {
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
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
