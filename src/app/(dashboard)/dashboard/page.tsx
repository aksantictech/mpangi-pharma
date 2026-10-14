"use client";

import { formatDisplayMoney, useDisplayCurrency } from "@/lib/currency";
import PageLoading from "@/components/ui/PageLoading";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseMedical,
  Boxes,
  CalendarClock,
  Check,
  Circle,
  FileText,
  LifeBuoy,
  LineChart,
  Package,
  Receipt,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { KIT_MODULE_LABEL } from "@/lib/constants";
import { canAccessModule, type AppModule } from "@/lib/permissions";
import {
  getSalesTrend,
  getSetupProgress,
  type SalesTrend,
  type SetupProgress,
} from "@/services/dashboard.service";
import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  getExpirationAlerts,
  getProductStock,
} from "@/services/products.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { ExpirationAlert, ProductStockSummary } from "@/types/product";

type QuickAction = {
  href: string;
  module: AppModule;
  icon: ReactNode;
  title: string;
};

type SetupStep = {
  key: keyof SetupProgress;
  title: string;
  hint: string;
  href: string;
  cta: string;
};

const setupSteps: SetupStep[] = [
  {
    key: "pharmacyInfo",
    title: "Compléter les infos de la pharmacie",
    hint: "Adresse et téléphone, affichés sur vos factures.",
    href: "/parametres/general",
    cta: "Compléter",
  },
  {
    key: "supplier",
    title: "Ajouter un fournisseur",
    hint: "Pour rattacher vos produits et réceptions de stock.",
    href: "/parametres/fournisseurs",
    cta: "Ajouter",
  },
  {
    key: "pricing",
    title: "Définir l’indice de prix automatique",
    hint: "Prix de vente = prix d’achat × indice, calculé pour vous.",
    href: "/parametres/prix",
    cta: "Configurer",
  },
  {
    key: "product",
    title: "Créer votre premier produit",
    hint: "Ou importez votre catalogue depuis Excel.",
    href: "/produits",
    cta: "Créer",
  },
  {
    key: "stock",
    title: "Enregistrer du stock",
    hint: "Ajoutez un lot avec quantité, prix d’achat et péremption.",
    href: "/produits",
    cta: "Ajouter un lot",
  },
  {
    key: "firstSale",
    title: "Faire votre première vente",
    hint: "Ouvrez la caisse et encaissez un client.",
    href: "/ventes",
    cta: "Ouvrir la caisse",
  },
];

const ONBOARDING_DISMISS_PREFIX = "mpangi_pharma_onboarding_dismissed_";

function readDismissed(pharmacyId: string) {
  try {
    return (
      window.localStorage.getItem(ONBOARDING_DISMISS_PREFIX + pharmacyId) ===
      "1"
    );
  } catch {
    return false;
  }
}

function writeDismissed(pharmacyId: string) {
  try {
    window.localStorage.setItem(ONBOARDING_DISMISS_PREFIX + pharmacyId, "1");
  } catch {
    // Stockage indisponible : le rappel réapparaîtra, sans gravité.
  }
}

export default function DashboardPage() {
  // Re-rendu quand la devise d'affichage (CDF/USD/EUR) change.
  useDisplayCurrency();
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [expirationAlerts, setExpirationAlerts] = useState<ExpirationAlert[]>(
    []
  );
  const [trend, setTrend] = useState<SalesTrend | null>(null);
  const [setup, setSetup] = useState<SetupProgress | null>(null);
  const [setupDismissed, setSetupDismissed] = useState(false);

  const [accessDisabled, setAccessDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAccessDisabled(params.get("access") === "disabled");
  }, []);

  useEffect(() => {
    async function loadDashboard() {
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

        // Données secondaires : leur échec ne doit pas bloquer le tableau de
        // bord, la zone concernée reste simplement masquée.
        const canSeeSales =
          canAccessModule(currentPharmacy.role, "ventes") ||
          canAccessModule(currentPharmacy.role, "finances");
        const canSeeSetup = canAccessModule(currentPharmacy.role, "parametres");

        const [trendData, setupData] = await Promise.all([
          canSeeSales
            ? getSalesTrend(currentPharmacy.id).catch(() => null)
            : Promise.resolve(null),
          canSeeSetup
            ? getSetupProgress({
                pharmacyId: currentPharmacy.id,
                hasAddress: Boolean(
                  currentPharmacy.address && currentPharmacy.phone
                ),
                productCount: stockData.filter(
                  (product) => product.status !== "archived"
                ).length,
                totalQuantity: stockData
                  .filter((product) => product.status !== "archived")
                  .reduce(
                    (sum, product) => sum + Number(product.total_quantity || 0),
                    0
                  ),
              }).catch(() => null)
            : Promise.resolve(null),
        ]);

        setTrend(trendData);
        setSetup(setupData);
        setSetupDismissed(readDismissed(currentPharmacy.id));
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le tableau de bord."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // Les produits archivés sont retirés du catalogue : ils ne comptent ni dans
  // les indicateurs ni dans les alertes de rupture.
  const activeProducts = products.filter(
    (product) => product.status !== "archived"
  );

  const totalProducts = activeProducts.length;
  const productsInStock = activeProducts.filter(
    (product) => Number(product.total_quantity || 0) > 0
  ).length;

  const totalQuantity = activeProducts.reduce(
    (sum, product) => sum + Number(product.total_quantity || 0),
    0
  );

  const lowStockCount = activeProducts.filter(
    (product) => product.stock_status === "low_stock"
  ).length;

  const outOfStockCount = products.filter(
    (product) => product.stock_status === "out_of_stock"
  ).length;

  if (isLoading) {
    return <PageLoading label="Chargement du tableau de bord..." variant="cards" />;
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
          {accessDisabled && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              Votre accès à cette pharmacie a été désactivé. Contactez le
              propriétaire ou le gérant pour réactiver votre compte.
            </div>
          )}

          <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-5 md:rounded-[2rem] md:p-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm md:h-16 md:w-16 md:rounded-3xl">
                <Store className="h-6 w-6 md:h-8 md:w-8" />
              </div>

              <div className="flex-1">
                <h1 className="text-xl font-black text-blue-950 md:text-2xl">
                  Bienvenue sur Mpangi_Pharma
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-700">
                  Votre compte est connecté, mais aucune pharmacie active n’est
                  rattachée à votre compte. Contactez l’administrateur Aksantic
                  ou le propriétaire de la pharmacie.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const icon = "h-5 w-5 md:h-6 md:w-6";

  const allQuickActions: QuickAction[] = [
    { href: "/ventes", module: "ventes", icon: <ShoppingCart className={icon} />, title: "Caisse" },
    { href: "/produits", module: "produits", icon: <Package className={icon} />, title: "Produits" },
    { href: "/stock", module: "stock", icon: <Boxes className={icon} />, title: "Stock" },
    { href: "/factures", module: "factures", icon: <FileText className={icon} />, title: "Factures" },
    { href: "/expirations", module: "expirations", icon: <CalendarClock className={icon} />, title: "Expirations" },
    { href: "/trousse", module: "trousse", icon: <BriefcaseMedical className={icon} />, title: KIT_MODULE_LABEL },
    { href: "/finances", module: "finances", icon: <LineChart className={icon} />, title: "Finances" },
    { href: "/aide", module: "aide", icon: <LifeBuoy className={icon} />, title: "Aide" },
  ];

  const quickActions = allQuickActions.filter((item) =>
    canAccessModule(pharmacy.role, item.module)
  );

  const canViewProducts = canAccessModule(pharmacy.role, "produits");
  const canViewStock = canAccessModule(pharmacy.role, "stock");
  const canViewSales = canAccessModule(pharmacy.role, "ventes");
  const canViewExpirations = canAccessModule(pharmacy.role, "expirations");

  const doneSteps = setup
    ? setupSteps.filter((step) => setup[step.key]).length
    : 0;
  const showSetup =
    setup !== null && !setupDismissed && doneSteps < setupSteps.length;

  const restockProducts = activeProducts
    .filter(
      (product) =>
        product.stock_status === "out_of_stock" ||
        product.stock_status === "low_stock"
    )
    .sort(
      (a, b) => Number(a.total_quantity || 0) - Number(b.total_quantity || 0)
    )
    .slice(0, 6);

  const salesDelta =
    trend && trend.yesterday.total > 0
      ? ((trend.today.total - trend.yesterday.total) /
          trend.yesterday.total) *
        100
      : null;

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
        <header className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              {pharmacy.name}
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
              Tableau de bord
            </h1>

            <p className="mt-1 text-xs font-semibold text-slate-500 md:text-sm">
              {pharmacy.city || "Ville non renseignée"} · 1 USD ={" "}
              {Number(pharmacy.exchange_rate || 0).toLocaleString("fr-CD")} CDF
            </p>
          </div>

          {canViewSales && (
            <Link
              href="/ventes"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
            >
              <ShoppingCart className="h-5 w-5" />
              Nouvelle vente
            </Link>
          )}
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {accessDisabled && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            Votre accès à cette pharmacie a été désactivé. Contactez le
            propriétaire ou le gérant pour réactiver votre compte.
          </div>
        )}

        {showSetup && setup && (
          <section className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Sparkles className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950 md:text-xl">
                    Démarrez votre pharmacie
                  </h2>

                  <p className="mt-0.5 text-xs font-semibold text-slate-500 md:text-sm">
                    {doneSteps} étape(s) sur {setupSteps.length} terminée(s)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  writeDismissed(pharmacy.id);
                  setSetupDismissed(true);
                }}
                aria-label="Masquer ce guide"
                title="Masquer ce guide"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={setupSteps.length}
              aria-valuenow={doneSteps}
              aria-label="Progression de la mise en route"
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${(doneSteps / setupSteps.length) * 100}%` }}
              />
            </div>

            <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {setupSteps.map((step) => {
                const done = setup[step.key];

                return (
                  <li
                    key={step.key}
                    className={`items-center gap-3 rounded-2xl border p-3 ${
                      done
                        ? "hidden border-emerald-100 bg-emerald-50 md:flex"
                        : "flex border-slate-200 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        done
                          ? "bg-emerald-600 text-white"
                          : "border-2 border-slate-200 text-slate-300"
                      }`}
                    >
                      {done ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-black ${
                          done
                            ? "text-emerald-800 line-through decoration-emerald-300"
                            : "text-slate-950"
                        }`}
                      >
                        {step.title}
                      </p>

                      {!done && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {step.hint}
                        </p>
                      )}
                    </div>

                    {!done && (
                      <Link
                        href={step.href}
                        className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700 hover:bg-blue-100"
                      >
                        {step.cta}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {quickActions.length > 0 && (
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {quickActions.map((item) => (
              <QuickActionLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                title={item.title}
              />
            ))}
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {trend && (
            <>
              <MetricCard
                title="Ventes du jour"
                value={formatDisplayMoney(trend.today.total)}
                icon={<Receipt className="h-5 w-5 md:h-6 md:w-6" />}
                tone="blue"
                footer={
                  <DeltaBadge
                    delta={salesDelta}
                    fallback={
                      trend.yesterday.total === 0 ? "Hier : aucune vente" : ""
                    }
                  />
                }
              />

              <MetricCard
                title="Nombre de ventes"
                value={trend.today.count.toString()}
                icon={<ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />}
                tone="green"
                footer={
                  <span className="text-xs font-semibold text-slate-400">
                    Hier : {trend.yesterday.count}
                  </span>
                }
              />
            </>
          )}

          {canViewProducts && (
            <MetricCard
              title="Produits disponibles"
              value={totalProducts.toLocaleString("fr-CD")}
              icon={<Package className="h-5 w-5 md:h-6 md:w-6" />}
              tone="blue"
              footer={
                <span className="text-xs font-semibold text-slate-400">
                  dont {productsInStock.toLocaleString("fr-CD")} en stock ·
                  hors archivés
                </span>
              }
            />
          )}

          {canViewStock && (
            <MetricCard
              title="Quantité totale en stock"
              value={totalQuantity.toLocaleString("fr-CD")}
              icon={<Boxes className="h-5 w-5 md:h-6 md:w-6" />}
              tone="green"
              footer={
                <span className="text-xs font-semibold text-slate-400">
                  toutes unités confondues
                </span>
              }
            />
          )}

          {canViewStock && (
            <MetricCard
              title="À réapprovisionner"
              value={(lowStockCount + outOfStockCount).toString()}
              icon={<AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />}
              tone="orange"
              footer={
                <span className="text-xs font-semibold text-slate-400">
                  dont {outOfStockCount} en rupture
                </span>
              }
            />
          )}

          {canViewExpirations && (
            <MetricCard
              title="Lots à surveiller"
              value={expirationAlerts.length.toString()}
              icon={<CalendarClock className="h-5 w-5 md:h-6 md:w-6" />}
              tone="red"
              footer={
                <span className="text-xs font-semibold text-slate-400">
                  proches de l’expiration
                </span>
              }
            />
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-5">
          {trend && (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6 lg:col-span-2 lg:self-start">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950 md:text-xl">
                    Ventes des 7 derniers jours
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 md:text-sm">
                    Total :{" "}
                    <span className="font-black text-slate-800">
                      {formatDisplayMoney(
                        trend.days.reduce((sum, day) => sum + day.total, 0)
                      )}
                    </span>
                  </p>
                </div>
              </div>

              {trend.days.every((day) => day.count === 0) ? (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
                  Aucune vente sur les 7 derniers jours. Vos ventes
                  apparaîtront ici dès la première encaissée.
                </p>
              ) : (
                <SalesBars days={trend.days} />
              )}
            </div>
          )}

          <div
            className={`space-y-4 md:space-y-5 ${
              trend ? "" : "lg:col-span-3"
            }`}
          >
            {canViewStock && (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-black text-slate-950 md:text-xl">
                    À réapprovisionner
                  </h2>

                  {restockProducts.length > 0 && (
                    <Link
                      href="/stock"
                      className="inline-flex items-center gap-1 text-xs font-black text-blue-700"
                    >
                      Voir le stock
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>

                {restockProducts.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="font-black text-emerald-800">
                      Stock en bonne santé
                    </p>

                    <p className="mt-1 text-sm text-emerald-700">
                      Aucun produit en rupture ou sous son seuil.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {restockProducts.map((product) => {
                      const quantity = Number(product.total_quantity || 0);

                      return (
                        <li
                          key={product.product_id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                        >
                          <span className="line-clamp-1 text-sm font-black text-slate-900">
                            {product.name}
                          </span>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                              quantity <= 0
                                ? "bg-red-100 text-red-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {quantity <= 0 ? "Rupture" : `Reste ${quantity}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {canViewExpirations && (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-black text-slate-950 md:text-xl">
                    Alertes expiration
                  </h2>

                  {expirationAlerts.length > 0 && (
                    <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">
                      {expirationAlerts.length}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  {expirationAlerts.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="font-black text-emerald-800">
                        Aucun lot critique
                      </p>

                      <p className="mt-1 text-sm text-emerald-700">
                        Aucun produit proche de l’expiration pour le moment.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {expirationAlerts.slice(0, 4).map((alert) => (
                        <ExpirationAlertCard
                          key={alert.batch_id}
                          alert={alert}
                        />
                      ))}

                      <Link
                        href="/expirations"
                        className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                      >
                        Voir toutes les alertes
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SalesBars({ days }: { days: SalesTrendDay[] }) {
  const max = Math.max(...days.map((day) => day.total), 1);
  const todayKey = days[days.length - 1]?.date;

  return (
    <div className="mt-5 flex h-44 items-end gap-2 md:gap-3">
      {days.map((day) => {
        const height = day.total > 0 ? Math.max((day.total / max) * 100, 4) : 0;
        const isToday = day.date === todayKey;

        return (
          <div
            key={day.date}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
            title={`${formatDayLong(day.date)} : ${formatDisplayMoney(
              day.total
            )} · ${day.count} vente(s)`}
          >
            <span className="text-[10px] font-black text-slate-500 md:text-xs">
              {day.count > 0 ? day.count : ""}
            </span>

            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-xl ${
                  isToday ? "bg-blue-600" : "bg-blue-200"
                } ${day.total === 0 ? "border-b-2 border-slate-200" : ""}`}
                style={{ height: `${height}%` }}
              />
            </div>

            <span
              className={`text-[11px] font-bold md:text-xs ${
                isToday ? "text-blue-700" : "text-slate-400"
              }`}
            >
              {formatDayShort(day.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type SalesTrendDay = SalesTrend["days"][number];

function formatDayShort(key: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
    .format(new Date(`${key}T12:00:00`))
    .replace(".", "");
}

function formatDayLong(key: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${key}T12:00:00`));
}

function DeltaBadge({
  delta,
  fallback,
}: {
  delta: number | null;
  fallback: string;
}) {
  if (delta === null) {
    return (
      <span className="text-xs font-semibold text-slate-400">{fallback}</span>
    );
  }

  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-black ${
        up ? "text-emerald-700" : "text-red-700"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {up ? "+" : ""}
      {Math.round(delta)} % vs hier
    </span>
  );
}

function ExpirationAlertCard({ alert }: { alert: ExpirationAlert }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3">
      <p className="line-clamp-2 text-sm font-black text-orange-900">
        {alert.product_name}
      </p>

      <p className="mt-1 text-xs font-semibold text-orange-700">
        Expire le {formatDate(alert.expiry_date)} · Stock :{" "}
        {Number(alert.quantity_available || 0)}
      </p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone,
  footer,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "blue" | "green" | "orange" | "red";
  footer?: ReactNode;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm md:rounded-[2rem] md:p-5">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl md:mb-4 md:h-12 md:w-12 ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-500 md:text-sm">{title}</p>

      <p className="mt-1 break-words text-xl font-black text-slate-950 md:mt-2 md:text-3xl">
        {value}
      </p>

      {footer && <div className="mt-1.5">{footer}</div>}
    </div>
  );
}

function QuickActionLink({
  href,
  icon,
  title,
}: {
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-2.5 text-blue-700 transition hover:bg-blue-100 md:min-h-24 md:flex-col md:items-start md:justify-between md:p-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
        {icon}
      </div>

      <span className="line-clamp-1 text-sm font-black md:mt-2">{title}</span>
    </Link>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}
