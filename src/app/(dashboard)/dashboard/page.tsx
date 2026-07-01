"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  FileText,
  LineChart,
  Package,
  ShoppingCart,
  Store,
  UploadCloud,
  Users,
} from "lucide-react";

import { canAccessModule, type AppModule } from "@/lib/permissions";
import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  getExpirationAlerts,
  getProductStock,
} from "@/services/products.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { ExpirationAlert, ProductStockSummary } from "@/types/product";

type DashboardModule = {
  href: string;
  module: AppModule;
  icon: ReactNode;
  title: string;
  description: string;
  priority?: boolean;
};

export default function DashboardPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [expirationAlerts, setExpirationAlerts] = useState<ExpirationAlert[]>(
    []
  );

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

  const totalProducts = products.length;

  const totalQuantity = products.reduce(
    (sum, product) => sum + Number(product.total_quantity || 0),
    0
  );

  const lowStockCount = products.filter(
    (product) => product.stock_status === "low_stock"
  ).length;

  const outOfStockCount = products.filter(
    (product) => product.stock_status === "out_of_stock"
  ).length;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
            <p className="font-semibold text-slate-500">
              Chargement du tableau de bord...
            </p>
          </div>
        </div>
      </main>
    );
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

  const dashboardModules: DashboardModule[] = [
    {
      href: "/ventes",
      module: "ventes",
      icon: <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />,
      title: "Ventes",
      description: "Caisse, panier, paiement et sortie stock.",
      priority: true,
    },
    {
      href: "/produits",
      module: "produits",
      icon: <Package className="h-5 w-5 md:h-6 md:w-6" />,
      title: "Produits",
      description: "Médicaments, lots, expirations et seuils.",
      priority: true,
    },
    {
      href: "/stock",
      module: "stock",
      icon: <Boxes className="h-5 w-5 md:h-6 md:w-6" />,
      title: "Stock",
      description: "Lots, mouvements, entrées et inventaires.",
      priority: true,
    },
    {
      href: "/factures",
      module: "factures",
      icon: <FileText className="h-5 w-5 md:h-6 md:w-6" />,
      title: "Factures",
      description: "Factures simples avec logo pharmacie.",
      priority: true,
    },
    {
      href: "/synchronisation",
      module: "synchronisation",
      icon: <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />,
      title: "Sync",
      description: "Ventes offline et synchronisation du terminal.",
    },
    {
      href: "/expirations",
      module: "expirations",
      icon: <CalendarClock className="h-5 w-5 md:h-6 md:w-6" />,
      title: "Expirations",
      description: "Lots proches de l’expiration.",
    },
    {
      href: "/pharmacies",
      module: "pharmacies",
      icon: <Building2 className="h-5 w-5 md:h-6 md:w-6" />,
      title: "Pharmacies",
      description: "Paramètres, identité et multi-pharmacie.",
    },
    {
      href: "/finances",
      module: "finances",
      icon: <LineChart className="h-5 w-5 md:h-6 md:w-6" />,
      title: "Finances",
      description: "Recettes, dépenses, marges et rapports.",
    },
    {
      href: "/parametres",
      module: "parametres",
      icon: <Users className="h-5 w-5 md:h-6 md:w-6" />,
      title: "Paramètres",
      description: "Rôles, accès et sécurité.",
    },
  ];

  const visibleDashboardModules = dashboardModules.filter((item) =>
    canAccessModule(pharmacy.role, item.module)
  );

  const priorityModules = visibleDashboardModules.filter((item) => item.priority);
  const otherModules = visibleDashboardModules.filter((item) => !item.priority);

  const canViewProducts = canAccessModule(pharmacy.role, "produits");
  const canViewStock = canAccessModule(pharmacy.role, "stock");
  const canViewSales = canAccessModule(pharmacy.role, "ventes");
  const canViewExpirations = canAccessModule(pharmacy.role, "expirations");

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm md:tracking-[0.2em]">
                Mpangi_Pharma
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
                Tableau de bord
              </h1>

              <p className="mt-1 text-xs font-semibold text-slate-500 md:mt-2 md:text-sm">
                {pharmacy.name} · {pharmacy.city || "Ville non renseignée"}
              </p>

              <p className="mt-1 text-[11px] font-bold text-slate-400 md:text-xs">
                1 USD ={" "}
                {Number(pharmacy.exchange_rate || 0).toLocaleString("fr-CD")}{" "}
                CDF
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
              {canViewProducts && (
                <Link
                  href="/produits"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Produits
                </Link>
              )}

              {canViewSales && (
                <Link
                  href="/ventes"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
                >
                  Nouvelle vente
                </Link>
              )}
            </div>
          </div>
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

        {(canViewProducts || canViewStock || canViewExpirations) && (
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {canViewProducts && (
              <MetricCard
                title="Produits"
                value={totalProducts.toString()}
                icon={<Package className="h-5 w-5 md:h-6 md:w-6" />}
                tone="blue"
              />
            )}

            {canViewStock && (
              <MetricCard
                title="Quantité"
                value={totalQuantity.toString()}
                icon={<Boxes className="h-5 w-5 md:h-6 md:w-6" />}
                tone="green"
              />
            )}

            {canViewStock && (
              <MetricCard
                title="Stock faible"
                value={lowStockCount.toString()}
                icon={<AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />}
                tone="orange"
              />
            )}

            {canViewStock && (
              <MetricCard
                title="Ruptures"
                value={outOfStockCount.toString()}
                icon={<CalendarClock className="h-5 w-5 md:h-6 md:w-6" />}
                tone="red"
              />
            )}
          </section>
        )}

        {priorityModules.length > 0 && (
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 md:text-xl">
                  Actions rapides
                </h2>

                <p className="mt-1 text-xs text-slate-500 md:text-sm">
                  Les fonctions les plus utilisées sur le terminal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {priorityModules.map((item) => (
                <QuickActionLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  title={item.title}
                />
              ))}
            </div>
          </section>
        )}

        <section
          className={
            canViewExpirations
              ? "grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-5"
              : "grid grid-cols-1 gap-4 md:gap-5"
          }
        >
          <div
            className={
              canViewExpirations
                ? "rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6 lg:col-span-2"
                : "rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
            }
          >
            <h2 className="text-lg font-black text-slate-950 md:text-xl">
              Modules principaux
            </h2>

            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Accédez rapidement aux zones autorisées pour votre rôle.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 md:mt-5 md:grid-cols-2 md:gap-4">
              {visibleDashboardModules.map((item) => (
                <ModuleLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </div>

          {canViewExpirations && (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950 md:text-xl">
                    Alertes expiration
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 md:text-sm">
                    Lots proches de l’expiration.
                  </p>
                </div>

                {expirationAlerts.length > 0 && (
                  <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">
                    {expirationAlerts.length}
                  </span>
                )}
              </div>

              <div className="mt-4 md:mt-5">
                {expirationAlerts.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:rounded-3xl md:p-5">
                    <p className="font-black text-emerald-800">
                      Aucun lot critique
                    </p>

                    <p className="mt-1 text-sm text-emerald-700">
                      Aucun produit proche de l’expiration pour le moment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {expirationAlerts.slice(0, 5).map((alert) => (
                      <ExpirationAlertCard key={alert.batch_id} alert={alert} />
                    ))}

                    <Link
                      href="/expirations"
                      className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 md:w-auto md:text-sm"
                    >
                      Voir toutes les alertes
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ExpirationAlertCard({ alert }: { alert: ExpirationAlert }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3 md:rounded-3xl md:p-4">
      <p className="line-clamp-2 text-sm font-black text-orange-900">
        {alert.product_name}
      </p>

      <p className="mt-1 text-xs font-semibold text-orange-700 md:text-sm">
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
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "blue" | "green" | "orange" | "red";
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

      <p className="mt-1 break-words text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
        {value}
      </p>
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
      className="flex min-h-24 flex-col justify-between rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-700 transition hover:bg-blue-100 md:min-h-28 md:rounded-3xl md:p-4"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white md:h-11 md:w-11">
        {icon}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="line-clamp-1 text-sm font-black">{title}</span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </div>
    </Link>
  );
}

function ModuleLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50 hover:shadow-md md:rounded-3xl md:p-5"
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 md:mb-4 md:h-12 md:w-12 md:rounded-2xl">
        {icon}
      </div>

      <h3 className="line-clamp-1 text-sm font-black text-slate-950 md:text-base">
        {title}
      </h3>

      <p className="mt-1 hidden text-sm leading-6 text-slate-500 md:mt-2 md:block">
        {description}
      </p>
    </Link>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}
