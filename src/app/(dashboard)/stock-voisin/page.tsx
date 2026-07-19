"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  MessageSquareText,
  Minus,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Store,
  Warehouse,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  buildPhoneHref,
  buildWhatsappHref,
  createNeighborStockRequest,
  findNeighborPharmacyStock,
  searchMyProductsForNetwork,
  type NeighborPharmacyStock,
  type ProductForNetworkSearch,
} from "@/services/pharmacy-network.service";

import type { PharmacyWithRole } from "@/types/pharmacy";

const QUICK_MESSAGES = [
  "Rupture urgente",
  "Besoin pour un patient",
  "Demande de transfert",
  "Disponibilité à confirmer",
];

export default function NeighborStockPage() {
  const resultsRef = useRef<HTMLElement | null>(null);

  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<ProductForNetworkSearch[]>([]);
  const [results, setResults] = useState<NeighborPharmacyStock[]>([]);

  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [requestQuantity, setRequestQuantity] = useState("1");
  const [requestMessage, setRequestMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [hasSearchedStock, setHasSearchedStock] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [isSearchingStock, setIsSearchingStock] = useState(false);
  const [requestingId, setRequestingId] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const currentPharmacy = await getCurrentPharmacy();
        setPharmacy(currentPharmacy);

        if (currentPharmacy) {
          const productsData = await searchMyProductsForNetwork(
            currentPharmacy.id,
            ""
          );
          setProducts(productsData);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le module Stock voisin."
        );
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  async function handleSearchProducts() {
    if (!pharmacy) return;

    setIsSearchingProducts(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const productsData = await searchMyProductsForNetwork(
        pharmacy.id,
        productSearch
      );

      setProducts(productsData);
      setResults([]);
      setHasSearchedStock(false);

      if (productsData.length === 1) {
        setSelectedProductId(productsData[0].id);
      } else {
        setSelectedProductId("");
      }

      if (productsData.length === 0) {
        setErrorMessage("Aucun produit ne correspond à cette recherche.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de rechercher les produits."
      );
    } finally {
      setIsSearchingProducts(false);
    }
  }

  async function handleFindStock() {
    if (!pharmacy || !selectedProductId) {
      setErrorMessage("Sélectionnez d’abord un produit.");
      return;
    }

    setIsSearchingStock(true);
    setErrorMessage("");
    setSuccessMessage("");
    setResults([]);
    setHasSearchedStock(true);

    try {
      const data = await findNeighborPharmacyStock(
        pharmacy.id,
        selectedProductId
      );

      setResults(data);

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de rechercher les pharmacies voisines."
      );
    } finally {
      setIsSearchingStock(false);
    }
  }

  async function handleCreateRequest(result: NeighborPharmacyStock) {
    if (!pharmacy) return;

    setRequestingId(result.pharmacy_id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createNeighborStockRequest({
        requestingPharmacyId: pharmacy.id,
        supplierPharmacyId: result.pharmacy_id,
        productId: result.product_id,
        requestedQuantity: Math.max(1, Number(requestQuantity || 1)),
        message:
          requestMessage.trim() ||
          `Demande de stock pour ${result.product_name} depuis ${pharmacy.name}.`,
      });

      setSuccessMessage(
        `Demande envoyée à ${result.pharmacy_name}. Elle est maintenant en attente de réponse.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’envoyer la demande."
      );
    } finally {
      setRequestingId("");
    }
  }

  function decreaseQuantity() {
    setRequestQuantity((current) =>
      String(Math.max(1, Number(current || 1) - 1))
    );
  }

  function increaseQuantity() {
    setRequestQuantity((current) =>
      String(Math.max(1, Number(current || 1) + 1))
    );
  }

  if (isLoading) {
    return <PageLoading />;
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 md:rounded-[2rem] md:p-8">
          <h1 className="text-xl font-black text-amber-800 md:text-2xl">
            Aucune pharmacie active
          </h1>
          <p className="mt-2 text-sm font-medium text-amber-700">
            Sélectionnez ou créez une pharmacie avant d’utiliser la recherche de
            stock voisin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 pb-28 pt-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700 md:text-sm">
            {pharmacy.name}
          </p>

          <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
            Stock voisin
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Trouvez rapidement une pharmacie proche ayant le produit recherché,
            puis appelez, écrivez sur WhatsApp ou envoyez une demande.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Même quartier", "Même commune", "Même ville"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700 md:text-xs"
              >
                {item}
              </span>
            ))}
          </div>
        </header>

        {errorMessage && (
          <Notice tone="error" icon={<AlertTriangle className="h-5 w-5" />}>
            {errorMessage}
          </Notice>
        )}

        {successMessage && (
          <Notice tone="success" icon={<CheckCircle2 className="h-5 w-5" />}>
            {successMessage}
          </Notice>
        )}

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Étape 1
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950 md:text-xl">
              Choisir le produit
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
            <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-blue-500">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearchProducts();
                  }
                }}
                placeholder="Nom, DCI ou code-barres..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={handleSearchProducts}
              disabled={isSearchingProducts}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                className={`h-5 w-5 ${
                  isSearchingProducts ? "animate-spin" : ""
                }`}
              />
              {isSearchingProducts ? "Recherche..." : "Chercher le produit"}
            </button>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Produit sélectionné
            </label>

            <select
              value={selectedProductId}
              onChange={(event) => {
                setSelectedProductId(event.target.value);
                setResults([]);
                setHasSearchedStock(false);
                setSuccessMessage("");
                setErrorMessage("");
              }}
              className="form-input"
            >
              <option value="">Choisir un produit</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {[product.name, product.generic_name, product.dosage, product.form]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Étape 2
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950 md:text-xl">
              Préparer la demande
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Quantité demandée
                </label>

                <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={requestQuantity}
                    onChange={(event) =>
                      setRequestQuantity(
                        String(Math.max(1, Number(event.target.value || 1)))
                      )
                    }
                    className="form-input text-center font-black"
                  />

                  <button
                    type="button"
                    onClick={increaseQuantity}
                    className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowMessage((current) => !current)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <MessageSquareText className="h-5 w-5 text-blue-700" />
                    Ajouter un message optionnel
                  </span>
                  {showMessage ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {showMessage && (
              <div className="mt-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {QUICK_MESSAGES.map((message) => (
                    <button
                      key={message}
                      type="button"
                      onClick={() => setRequestMessage(message)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                    >
                      {message}
                    </button>
                  ))}
                </div>

                <textarea
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  className="form-input min-h-24 resize-none"
                  placeholder="Ajoutez un détail utile à la pharmacie sollicitée..."
                />
              </div>
            )}

            {selectedProduct && (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                  Produit ciblé
                </p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {selectedProduct.name}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleFindStock}
              disabled={!selectedProductId || isSearchingStock}
              className="mt-4 hidden min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex"
            >
              <Warehouse className="h-5 w-5" />
              {isSearchingStock
                ? "Recherche des pharmacies..."
                : "Voir les pharmacies proches"}
            </button>
          </div>
        </section>

        <section
          ref={resultsRef}
          className="scroll-mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950 md:text-xl">
                Pharmacies trouvées
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Le stock exact est affiché uniquement si la pharmacie
                l’autorise.
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
              {results.length}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {isSearchingStock ? (
              <>
                <ResultSkeleton />
                <ResultSkeleton />
              </>
            ) : results.length > 0 ? (
              results.map((result) => (
                <NeighborStockCard
                  key={`${result.pharmacy_id}-${result.product_id}`}
                  result={result}
                  selectedProductName={selectedProduct?.name || ""}
                  isRequesting={requestingId === result.pharmacy_id}
                  onCreateRequest={() => handleCreateRequest(result)}
                />
              ))
            ) : (
              <EmptyState hasSearched={hasSearchedStock} />
            )}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto max-w-lg">
          {selectedProduct && (
            <p className="mb-2 truncate text-xs font-black text-slate-700">
              {selectedProduct.name} · {requestQuantity} unité(s)
            </p>
          )}

          <button
            type="button"
            onClick={handleFindStock}
            disabled={!selectedProductId || isSearchingStock}
            className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Warehouse className="h-5 w-5" />
            {isSearchingStock ? "Recherche..." : "Voir les pharmacies proches"}
          </button>
        </div>
      </div>
    </main>
  );
}

function NeighborStockCard({
  result,
  selectedProductName,
  isRequesting,
  onCreateRequest,
}: {
  result: NeighborPharmacyStock;
  selectedProductName: string;
  isRequesting: boolean;
  onCreateRequest: () => void;
}) {
  const whatsappHref = buildWhatsappHref(
    result.whatsapp || result.phone,
    `Bonjour, je vous contacte depuis Mpangi_Pharma. Avez-vous encore ${
      selectedProductName || result.product_name
    } disponible ?`
  );

  const phoneHref = buildPhoneHref(result.phone);
  const isLowStock = result.availability_label
    .toLowerCase()
    .includes("faible");

  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-3xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-700 md:text-xs">
            {result.distance_group}
          </p>
          <h3 className="mt-1 text-base font-black text-slate-950 md:text-lg">
            {result.pharmacy_name}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500 md:text-sm">
            {[result.district, result.commune, result.city]
              .filter(Boolean)
              .join(" · ") || "Zone non renseignée"}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black md:text-xs ${
            result.is_open_now
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {result.is_open_now ? "Ouverte" : "Fermée"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoBox
          label="Disponibilité"
          value={result.availability_label}
          tone={isLowStock ? "amber" : "emerald"}
        />
        <InfoBox
          label="Stock"
          value={
            result.total_quantity === null
              ? "Masqué"
              : `${Number(result.total_quantity).toLocaleString("fr-CD")} ${
                  result.unit || ""
                }`
          }
          tone="blue"
        />
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          Produit
        </p>
        <p className="mt-1 text-sm font-black text-slate-900">
          {[result.product_name, result.generic_name, result.dosage, result.form]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-600">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>{result.address || "Adresse non renseignée"}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {phoneHref ? (
          <a
            href={phoneHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm font-black text-blue-700"
          >
            <Phone className="h-4 w-4" />
            Appeler
          </a>
        ) : (
          <DisabledAction label="Pas de téléphone" />
        )}

        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-black text-emerald-700"
          >
            WhatsApp
          </a>
        ) : (
          <DisabledAction label="Pas WhatsApp" />
        )}
      </div>

      <button
        type="button"
        onClick={onCreateRequest}
        disabled={isRequesting}
        className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {isRequesting ? "Envoi..." : "Envoyer une demande"}
      </button>
    </article>
  );
}

function EmptyState({ hasSearched }: { hasSearched: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center lg:col-span-2">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-blue-700 shadow-sm">
        {hasSearched ? (
          <Store className="h-7 w-7" />
        ) : (
          <Search className="h-7 w-7" />
        )}
      </div>

      <h3 className="mt-4 font-black text-slate-950">
        {hasSearched
          ? "Aucune pharmacie trouvée"
          : "Aucune recherche effectuée"}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasSearched
          ? "Aucune pharmacie partenaire n’a partagé un stock disponible pour ce produit. Essayez un autre dosage ou contactez une pharmacie proche."
          : "Sélectionnez un produit puis lancez la recherche pour voir les pharmacies proches."}
      </p>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-4">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-6 w-2/3 rounded bg-slate-200" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-16 rounded-2xl bg-slate-100" />
        <div className="h-16 rounded-2xl bg-slate-100" />
      </div>
      <div className="mt-4 h-12 rounded-2xl bg-slate-100" />
    </div>
  );
}

function InfoBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald" | "amber";
}) {
  const toneClass = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function DisabledAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-black text-slate-400"
    >
      {label}
    </button>
  );
}

function Notice({
  tone,
  icon,
  children,
}: {
  tone: "error" | "success";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "error"
      ? "border-red-100 bg-red-50 text-red-700"
      : "border-emerald-100 bg-emerald-50 text-emerald-700";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${toneClass}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

function PageLoading() {
  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-36 animate-pulse rounded-[1.5rem] border border-slate-200 bg-white" />
        <div className="h-80 animate-pulse rounded-[1.5rem] border border-slate-200 bg-white" />
      </div>
    </main>
  );
}
