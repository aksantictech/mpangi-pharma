"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  FileSpreadsheet,
  Printer,
  RefreshCcw,
  Search,
} from "lucide-react";

import CurrencySwitcher from "@/components/layout/CurrencySwitcher";
import PageLoading from "@/components/ui/PageLoading";
import { useToast } from "@/components/ui/Toast";
import {
  describeConversion,
  formatDisplayMoney,
  useDisplayCurrency,
} from "@/lib/currency";
import {
  buildInventoryLines,
  summarizeInventory,
  type InventoryLine,
  type InventoryMovementInput,
  type InventoryProductInput,
} from "@/lib/inventory";
import { canAccessModule } from "@/lib/permissions";
import { printReport } from "@/lib/print-report";
import {
  getInventoryProducts,
  getMovementsSince,
} from "@/services/inventory.service";
import { getCurrentPharmacy } from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";

const PAGE_SIZE = 50;

type PeriodPreset = "today" | "month" | "last_month" | "days30" | "quarter" | "custom";

const presetLabels: Record<PeriodPreset, string> = {
  today: "Situation actuelle",
  month: "Ce mois",
  last_month: "Mois dernier",
  days30: "30 derniers jours",
  quarter: "3 derniers mois",
  custom: "Personnalisée",
};

function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function periodFor(preset: Exclude<PeriodPreset, "custom">) {
  const now = new Date();
  const today = toDateKey(now);

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "month":
      return {
        from: toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: today,
      };
    case "last_month":
      return {
        from: toDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateKey(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "days30": {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);

      return { from: toDateKey(start), to: today };
    }
    case "quarter":
      return {
        from: toDateKey(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        to: today,
      };
  }
}

const statusLabels = { ok: "Normal", low: "Stock faible", out: "Rupture" } as const;

function formatQuantity(value: number) {
  return Number(value || 0).toLocaleString("fr-CD");
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function describeProduct(line: InventoryLine) {
  return [line.dosage, line.form].filter(Boolean).join(" / ");
}

export default function InventoryPage() {
  // Re-rendu quand la devise d'affichage (CDF/USD/EUR) change.
  useDisplayCurrency();

  const toast = useToast();

  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<InventoryProductInput[]>([]);
  const [movements, setMovements] = useState<InventoryMovementInput[]>([]);

  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [from, setFrom] = useState(() => toDateKey(new Date()));
  const [to, setTo] = useState(() => toDateKey(new Date()));

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formFilter, setFormFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [prescriptionFilter, setPrescriptionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [onlyMoved, setOnlyMoved] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Chargement initial : pharmacie + produits (stock actuel et lots).
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const currentPharmacy = await getCurrentPharmacy();

        if (!isMounted) return;

        setPharmacy(currentPharmacy);

        if (currentPharmacy) {
          setProducts(await getInventoryProducts(currentPharmacy.id));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Impossible de charger l’inventaire."
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
  }, []);

  const pharmacyId = pharmacy?.id;

  // Mouvements depuis le début de la période (pour remonter le stock dans le temps).
  useEffect(() => {
    if (!pharmacyId || !from) return;

    let isMounted = true;

    getMovementsSince(pharmacyId, from)
      .then((rows) => {
        if (isMounted) {
          setMovements(rows);
          setErrorMessage("");
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Impossible de charger les mouvements."
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pharmacyId, from]);

  const lines = useMemo(
    () =>
      buildInventoryLines({
        products,
        movements,
        from,
        to,
        today: toDateKey(new Date()),
      }),
    [products, movements, from, to]
  );

  const filterOptions = useMemo(() => {
    const unique = (values: Array<string | null>) =>
      Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b, "fr")
      );

    return {
      categories: unique(lines.map((line) => line.categoryName)),
      forms: unique(lines.map((line) => line.form)),
      suppliers: unique(lines.map((line) => line.supplierName)),
    };
  }, [lines]);

  const filteredLines = useMemo(() => {
    const term = search.trim().toLowerCase();

    const list = lines.filter((line) => {
      if (statusFilter !== "all" && line.status !== statusFilter) return false;
      if (categoryFilter !== "all" && line.categoryName !== categoryFilter) return false;
      if (formFilter !== "all" && line.form !== formFilter) return false;
      if (supplierFilter !== "all" && line.supplierName !== supplierFilter) return false;
      if (stockFilter !== "all" && line.stockStatus !== stockFilter) return false;

      if (expiryFilter === "expired" && line.expiredQuantity <= 0) return false;
      if (expiryFilter === "soon" && line.expiringSoonQuantity <= 0) return false;

      if (prescriptionFilter === "required" && !line.requiresPrescription) return false;
      if (prescriptionFilter === "free" && line.requiresPrescription) return false;

      if (onlyMoved && line.entries === 0 && line.exits === 0) return false;

      if (term) {
        const haystack = [line.name, line.genericName, line.dosage, line.form, line.categoryName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "value") return b.purchaseValue - a.purchaseValue;
      if (sortBy === "stock") return a.closing - b.closing;

      return a.name.localeCompare(b.name, "fr");
    });
  }, [
    lines,
    search,
    categoryFilter,
    formFilter,
    supplierFilter,
    stockFilter,
    expiryFilter,
    prescriptionFilter,
    statusFilter,
    onlyMoved,
    sortBy,
  ]);

  const totals = useMemo(() => summarizeInventory(filteredLines), [filteredLines]);

  const visibleLines = filteredLines.slice(0, visibleCount);

  function applyPreset(next: PeriodPreset) {
    setPreset(next);
    setVisibleCount(PAGE_SIZE);

    if (next !== "custom") {
      const period = periodFor(next);

      setFrom(period.from);
      setTo(period.to);
    }
  }

  function changeFilter(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setVisibleCount(PAGE_SIZE);
    };
  }

  const isPastPeriod = to < toDateKey(new Date());

  function filtersDescription() {
    const parts: string[] = [];

    if (categoryFilter !== "all") parts.push(`Catégorie : ${categoryFilter}`);
    if (formFilter !== "all") parts.push(`Type : ${formFilter}`);
    if (supplierFilter !== "all") parts.push(`Fournisseur : ${supplierFilter}`);
    if (stockFilter !== "all") parts.push(`Stock : ${statusLabels[stockFilter as keyof typeof statusLabels]}`);
    if (expiryFilter === "expired") parts.push("Avec lots périmés");
    if (expiryFilter === "soon") parts.push("Expiration sous 90 jours");
    if (prescriptionFilter === "required") parts.push("Sur ordonnance");
    if (prescriptionFilter === "free") parts.push("Sans ordonnance");
    if (onlyMoved) parts.push("Produits mouvementés");
    if (search.trim()) parts.push(`Recherche : « ${search.trim()} »`);

    return parts.length > 0 ? parts.join(" · ") : "Tous les produits";
  }

  async function handlePrint() {
    if (!pharmacy) return;

    try {
      await printReport({
        pharmacy,
        title: "Inventaire du stock",
        subtitle:
          from === to
            ? `Situation au ${formatDate(to)}`
            : `Période du ${formatDate(from)} au ${formatDate(to)}`,
        orientation: "landscape",
        meta: [
          { label: "Filtres", value: filtersDescription() },
          { label: "Produits", value: String(totals.products) },
        ],
        summary: [
          { label: "Produits", value: String(totals.products) },
          { label: "Quantité en stock", value: formatQuantity(totals.closing) },
          { label: "Valeur d’achat", value: formatDisplayMoney(totals.purchaseValue) },
          { label: "Valeur de vente", value: formatDisplayMoney(totals.sellingValue) },
          {
            label: "Marge potentielle",
            value: formatDisplayMoney(totals.sellingValue - totals.purchaseValue),
          },
          { label: "Ruptures / faibles", value: `${totals.outOfStock} / ${totals.lowStock}` },
        ],
        columns: [
          { label: "N°", align: "center", width: "3%" },
          { label: "Produit" },
          { label: "Catégorie" },
          { label: "Début", align: "right" },
          { label: "Entrées", align: "right" },
          { label: "Sorties", align: "right" },
          { label: "Stock fin", align: "right" },
          { label: "Prix achat moy.", align: "right" },
          { label: "Valeur achat", align: "right" },
          { label: "Valeur vente", align: "right" },
          { label: "Exp. proche", align: "center" },
          { label: "Statut", align: "center" },
        ],
        rows: filteredLines.map((line, index) => [
          String(index + 1),
          [line.name, describeProduct(line)].filter(Boolean).join(" — "),
          line.categoryName ?? "-",
          formatQuantity(line.opening),
          formatQuantity(line.entries),
          formatQuantity(line.exits),
          formatQuantity(line.closing),
          formatDisplayMoney(line.averagePurchasePrice),
          formatDisplayMoney(line.purchaseValue),
          formatDisplayMoney(line.sellingValue),
          formatDate(line.nearestExpiry),
          line.expiredQuantity > 0
            ? `${statusLabels[line.stockStatus]} · ${line.expiredQuantity} périmé(s)`
            : statusLabels[line.stockStatus],
        ]),
        totals: [
          "",
          `TOTAL (${totals.products} produits)`,
          "",
          formatQuantity(totals.opening),
          formatQuantity(totals.entries),
          formatQuantity(totals.exits),
          formatQuantity(totals.closing),
          "",
          formatDisplayMoney(totals.purchaseValue),
          formatDisplayMoney(totals.sellingValue),
          "",
          "",
        ],
        note: [
          "Valorisation au prix moyen pondéré des lots actuellement en stock.",
          isPastPeriod
            ? "Stock reconstitué à la date de fin à partir des mouvements enregistrés."
            : "",
          describeConversion(),
        ]
          .filter(Boolean)
          .join(" "),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impression impossible."
      );
    }
  }

  async function handleExport() {
    if (!pharmacy) return;

    setIsExporting(true);

    try {
      const XLSX = await import("xlsx");

      const rows = filteredLines.map((line) => ({
        Produit: line.name,
        "DCI": line.genericName ?? "",
        Dosage: line.dosage ?? "",
        Forme: line.form ?? "",
        Catégorie: line.categoryName ?? "",
        Fournisseur: line.supplierName ?? "",
        "Stock début": line.opening,
        Entrées: line.entries,
        Sorties: line.exits,
        "Stock fin": line.closing,
        "Seuil minimum": line.minStock,
        "Prix achat moyen (CDF)": Math.round(line.averagePurchasePrice * 100) / 100,
        "Valeur achat (CDF)": Math.round(line.purchaseValue),
        "Valeur vente (CDF)": Math.round(line.sellingValue),
        "Quantité périmée": line.expiredQuantity,
        "Expire sous 90 jours": line.expiringSoonQuantity,
        "Expiration la plus proche": line.nearestExpiry ?? "",
        Statut: statusLabels[line.stockStatus],
      }));

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(rows),
        "Inventaire"
      );

      XLSX.writeFile(workbook, `inventaire_${from}_${to}.xlsx`);
      toast.success("Inventaire exporté en Excel.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Export Excel impossible."
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleRefresh() {
    if (!pharmacy) return;

    setIsRefreshing(true);

    try {
      const [productRows, movementRows] = await Promise.all([
        getInventoryProducts(pharmacy.id),
        getMovementsSince(pharmacy.id, from),
      ]);

      setProducts(productRows);
      setMovements(movementRows);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Actualisation impossible."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  if (isLoading) {
    return <PageLoading label="Chargement de l’inventaire..." variant="cards" />;
  }

  if (!pharmacy || !canAccessModule(pharmacy.role, "inventaire")) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-amber-100 bg-amber-50 p-6 text-sm font-bold text-amber-800">
          L’inventaire est réservé au propriétaire, au gérant et au pharmacien.
        </div>
      </main>
    );
  }

  const margin = totals.sellingValue - totals.purchaseValue;
  const negativeOpeningCount = filteredLines.filter((line) => line.opening < 0).length;

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <ClipboardList className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                {pharmacy.name}
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                Inventaire
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Situation du stock, mouvements de la période et valorisation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CurrencySwitcher />

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Actualiser"
              title="Actualiser"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCcw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || filteredLines.length === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-5 w-5" />
              Excel
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={filteredLines.length === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800 disabled:opacity-50"
            >
              <Printer className="h-5 w-5" />
              Imprimer
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            {errorMessage}
          </div>
        )}

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(presetLabels) as PeriodPreset[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={preset === key}
                onClick={() => applyPreset(key)}
                className={`min-h-11 rounded-full border px-4 text-sm font-black ${
                  preset === key
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {presetLabels[key]}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Du">
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => {
                  setPreset("custom");
                  setFrom(event.target.value);
                }}
                className="form-input"
              />
            </Field>

            <Field label="Au">
              <input
                type="date"
                value={to}
                min={from}
                max={toDateKey(new Date())}
                onChange={(event) => {
                  setPreset("custom");
                  setTo(event.target.value);
                }}
                className="form-input"
              />
            </Field>

            <Field label="Recherche">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => changeFilter(setSearch)(event.target.value)}
                  placeholder="Nom, DCI, dosage…"
                  className="min-h-11 w-full bg-transparent text-sm outline-none"
                />
              </div>
            </Field>

            <Field label="Trier par">
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="form-input">
                <option value="name">Nom</option>
                <option value="value">Valeur d’achat (décroissante)</option>
                <option value="stock">Stock (croissant)</option>
              </select>
            </Field>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-6">
            <SelectField
              label="Catégorie"
              value={categoryFilter}
              onChange={changeFilter(setCategoryFilter)}
              options={filterOptions.categories}
            />
            <SelectField
              label="Type / forme"
              value={formFilter}
              onChange={changeFilter(setFormFilter)}
              options={filterOptions.forms}
            />
            <SelectField
              label="Fournisseur"
              value={supplierFilter}
              onChange={changeFilter(setSupplierFilter)}
              options={filterOptions.suppliers}
            />

            <Field label="Stock">
              <select value={stockFilter} onChange={(event) => changeFilter(setStockFilter)(event.target.value)} className="form-input">
                <option value="all">Tous</option>
                <option value="ok">Normal</option>
                <option value="low">Stock faible</option>
                <option value="out">Rupture</option>
              </select>
            </Field>

            <Field label="Expiration">
              <select value={expiryFilter} onChange={(event) => changeFilter(setExpiryFilter)(event.target.value)} className="form-input">
                <option value="all">Toutes</option>
                <option value="expired">Avec lots périmés</option>
                <option value="soon">Sous 90 jours</option>
              </select>
            </Field>

            <Field label="Ordonnance">
              <select value={prescriptionFilter} onChange={(event) => changeFilter(setPrescriptionFilter)(event.target.value)} className="form-input">
                <option value="all">Tous</option>
                <option value="required">Sur ordonnance</option>
                <option value="free">Sans ordonnance</option>
              </select>
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={onlyMoved}
                onChange={(event) => setOnlyMoved(event.target.checked)}
                className="h-5 w-5 accent-blue-700"
              />
              Seulement les produits mouvementés sur la période
            </label>

            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={statusFilter === "all"}
                onChange={(event) => setStatusFilter(event.target.checked ? "all" : "active")}
                className="h-5 w-5 accent-blue-700"
              />
              Inclure les produits inactifs ou archivés
            </label>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Produits" value={String(totals.products)} />
          <Kpi label="Quantité en stock" value={formatQuantity(totals.closing)} />
          <Kpi label="Valeur d’achat" value={formatDisplayMoney(totals.purchaseValue)} />
          <Kpi label="Valeur de vente" value={formatDisplayMoney(totals.sellingValue)} />
          <Kpi label="Marge potentielle" value={formatDisplayMoney(margin)} />
          <Kpi
            label="Ruptures / faibles"
            value={`${totals.outOfStock} / ${totals.lowStock}`}
            tone={totals.outOfStock > 0 ? "danger" : "default"}
          />
        </section>

        {negativeOpeningCount > 0 && (
          <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
            {negativeOpeningCount} produit(s) ont un stock de début négatif : des
            mouvements manquent pour cette période (stock modifié sans
            mouvement enregistré). Vérifiez ces lignes avant d’imprimer.
          </p>
        )}

        {isPastPeriod && (
          <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800">
            Stock reconstitué à la date de fin à partir des mouvements enregistrés
            (valorisation au prix moyen des lots actuels).
          </p>
        )}

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
          <div className="space-y-2 xl:hidden">
            {visibleLines.length === 0 ? (
              <p className="p-5 text-center text-sm font-semibold text-slate-500">
                Aucun produit ne correspond à ces filtres.
              </p>
            ) : (
              visibleLines.map((line) => (
                <article key={line.productId} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-black text-slate-950">{line.name}</h3>
                      <p className="text-xs text-slate-500">
                        {[describeProduct(line), line.categoryName].filter(Boolean).join(" · ") || "-"}
                      </p>
                    </div>
                    <StatusBadge status={line.stockStatus} />
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <MiniStat label="Début" value={formatQuantity(line.opening)} />
                    <MiniStat label="Entrées" value={`+${formatQuantity(line.entries)}`} />
                    <MiniStat label="Sorties" value={`-${formatQuantity(line.exits)}`} />
                    <MiniStat label="Fin" value={formatQuantity(line.closing)} strong />
                  </div>

                  <div className="mt-2 flex justify-between text-xs font-semibold text-slate-600">
                    <span>Achat : {formatDisplayMoney(line.purchaseValue)}</span>
                    <span>Vente : {formatDisplayMoney(line.sellingValue)}</span>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["Produit", "Catégorie", "Début", "Entrées", "Sorties", "Stock fin", "Valeur achat", "Valeur vente", "Exp. proche", "Statut"].map((label, index) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500 ${index >= 2 && index <= 7 ? "text-right" : ""}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleLines.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                      Aucun produit ne correspond à ces filtres.
                    </td>
                  </tr>
                ) : (
                  visibleLines.map((line) => (
                    <tr key={line.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-950">{line.name}</p>
                        <p className="text-xs text-slate-500">{describeProduct(line) || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{line.categoryName ?? "-"}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{formatQuantity(line.opening)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">+{formatQuantity(line.entries)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-orange-700">-{formatQuantity(line.exits)}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-950">{formatQuantity(line.closing)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatDisplayMoney(line.purchaseValue)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatDisplayMoney(line.sellingValue)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(line.nearestExpiry)}
                        {line.expiredQuantity > 0 && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">
                            {line.expiredQuantity} périmé(s)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={line.stockStatus} /></td>
                    </tr>
                  ))
                )}
              </tbody>

              {visibleLines.length > 0 && (
                <tfoot className="bg-slate-50 font-black text-slate-950">
                  <tr>
                    <td className="px-4 py-3" colSpan={2}>Total ({totals.products} produits)</td>
                    <td className="px-4 py-3 text-right">{formatQuantity(totals.opening)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">+{formatQuantity(totals.entries)}</td>
                    <td className="px-4 py-3 text-right text-orange-700">-{formatQuantity(totals.exits)}</td>
                    <td className="px-4 py-3 text-right">{formatQuantity(totals.closing)}</td>
                    <td className="px-4 py-3 text-right">{formatDisplayMoney(totals.purchaseValue)}</td>
                    <td className="px-4 py-3 text-right">{formatDisplayMoney(totals.sellingValue)}</td>
                    <td className="px-4 py-3" colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {filteredLines.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="mt-4 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Afficher plus ({filteredLines.length - visibleCount} restants) — l’impression
              contient tous les produits filtrés
            </button>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function SelectField({
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
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="form-input">
        <option value="all">Tous</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={`mt-1 break-words text-xl font-black md:text-2xl ${
          tone === "danger" ? "text-red-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm ${strong ? "font-black text-slate-950" : "font-bold text-slate-700"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: InventoryLine["stockStatus"] }) {
  const classes = {
    ok: "border-emerald-100 bg-emerald-50 text-emerald-700",
    low: "border-orange-100 bg-orange-50 text-orange-700",
    out: "border-red-100 bg-red-50 text-red-700",
  }[status];

  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${classes}`}>
      {statusLabels[status]}
    </span>
  );
}
