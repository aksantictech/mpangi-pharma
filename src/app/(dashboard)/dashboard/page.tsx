"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  Building2,
  CalendarClock,
  FileText,
  LineChart,
  Package,
  ShoppingCart,
  Store,
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
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
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
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          {accessDisabled && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              Votre accès à cette pharmacie a été désactivé. Contactez le
              propriétaire ou le gérant pour réactiver votre compte.
            </div>
          )}

          <section className="rounded-[2rem] border border-blue-100 bg-blue-50 p-8">
            <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-blue-700 shadow-sm">
                <Store className="h-8 w-8" />
              </div>

              <div className="flex-1">
                <h1 className="text-2xl font-black text-blue-950">
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
      href: "/pharmacies",
      module: "pharmacies",
      icon: <Building2 className="h-6 w-6" />,
      title: "Pharmacies",
      description: "Paramètres, identité et multi-pharmacie.",
    },
    {
      href: "/produits",
      module: "produits",
      icon: <Package className="h-6 w-6" />,
      title: "Produits & stock",
      description: "Médicaments, lots, expirations et seuils.",
    },
    {
      href: "/stock",
      module: "stock",
      icon: <Boxes className="h-6 w-6" />,
      title: "Stock",
      description: "Lots, mouvements, entrées et inventaires.",
    },
    {
      href: "/ventes",
      module: "ventes",
      icon: <ShoppingCart className="h-6 w-6" />,
      title: "Ventes",
      description: "Caisse, panier, paiement et sortie stock.",
    },
    {
      href: "/factures",
      module: "factures",
      icon: <FileText className="h-6 w-6" />,
      title: "Factures",
      description: "Factures simples avec logo pharmacie.",
    },
    {
      href: "/finances",
      module: "finances",
      icon: <LineChart className="h-6 w-6" />,
      title: "Finances",
      description: "Recettes, dépenses, marges et rapports.",
    },
    {
      href: "/expirations",
      module: "expirations",
      icon: <CalendarClock className="h-6 w-6" />,
      title: "Expirations",
      description: "Lots proches de l’expiration.",
    },
    {
      href: "/parametres",
      module: "parametres",
      icon: <Users className="h-6 w-6" />,
      title: "Paramètres",
      description: "Rôles, accès et sécurité.",
    },
  ];

  const visibleDashboardModules = dashboardModules.filter((item) =>
    canAccessModule(pharmacy.role, item.module)
  );

  const canViewProducts = canAccessModule(pharmacy.role, "produits");
  const canViewStock = canAccessModule(pharmacy.role, "stock");
  const canViewSales = canAccessModule(pharmacy.role, "ventes");
  const canViewExpirations = canAccessModule(pharmacy.role, "expirations");

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                Mpangi_Pharma
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Tableau de bord
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {pharmacy.name} · {pharmacy.city || "Ville non renseignée"} · 1
                USD = {Number(pharmacy.exchange_rate || 0).toLocaleString(
                  "fr-CD"
                )}{" "}
                CDF
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {canViewProducts && (
                <Link
                  href="/produits"
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Produits
                </Link>
              )}

              {canViewSales && (
                <Link
                  href="/ventes"
                  className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
                >
                  Nouvelle vente
                </Link>
              )}
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {accessDisabled && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            Votre accès à cette pharmacie a été désactivé. Contactez le
            propriétaire ou le gérant pour réactiver votre compte.
          </div>
        )}

        {(canViewProducts || canViewStock || canViewExpirations) && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {canViewProducts && (
              <MetricCard
                title="Produits actifs"
                value={totalProducts.toString()}
                icon={<Package className="h-6 w-6" />}
                tone="blue"
              />
            )}

            {canViewStock && (
              <MetricCard
                title="Quantité totale"
                value={totalQuantity.toString()}
                icon={<Boxes className="h-6 w-6" />}
                tone="green"
              />
            )}

            {canViewStock && (
              <MetricCard
                title="Stock faible"
                value={lowStockCount.toString()}
                icon={<AlertTriangle className="h-6 w-6" />}
                tone="orange"
              />
            )}

            {canViewStock && (
              <MetricCard
                title="Ruptures"
                value={outOfStockCount.toString()}
                icon={<CalendarClock className="h-6 w-6" />}
                tone="red"
              />
            )}
          </section>
        )}

        <section
          className={
            canViewExpirations
              ? "grid grid-cols-1 gap-5 lg:grid-cols-3"
              : "grid grid-cols-1 gap-5"
          }
        >
          <div
            className={
              canViewExpirations
                ? "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"
                : "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
            }
          >
            <h2 className="text-xl font-black text-slate-950">
              Modules principaux
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Accédez rapidement aux zones autorisées pour votre rôle.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                Alertes expiration
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Lots proches de l’expiration ou déjà expirés.
              </p>

              <div className="mt-5">
                {expirationAlerts.length === 0 ? (
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                    <p className="font-black text-emerald-800">
                      Aucun lot critique
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Aucun produit proche de l’expiration pour le moment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expirationAlerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.batch_id}
                        className="rounded-3xl border border-orange-100 bg-orange-50 p-4"
                      >
                        <p className="font-black text-orange-900">
                          {alert.product_name}
                        </p>

                        <p className="mt-1 text-sm text-orange-700">
                          Expire le {alert.expiry_date} · Stock :{" "}
                          {Number(alert.quantity_available || 0)}
                        </p>
                      </div>
                    ))}

                    <Link
                      href="/expirations"
                      className="mt-4 inline-flex text-sm font-black text-blue-700 hover:text-blue-800"
                    >
                      Voir toutes les alertes
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
      className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}