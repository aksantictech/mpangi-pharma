"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  Network,
  Package,
  Receipt,
  RefreshCcw,
} from "lucide-react";

import PageLoading from "@/components/ui/PageLoading";
import { formatDisplayMoney, useDisplayCurrency } from "@/lib/currency";
import {
  getMyPharmacies,
  setActivePharmacy,
} from "@/services/pharmacies.service";
import {
  getNetworkStats,
  type NetworkPharmacyStats,
} from "@/services/network.service";

export default function NetworkPage() {
  // Re-rendu quand la devise d'affichage (CDF/USD/EUR) change.
  useDisplayCurrency();

  const [stats, setStats] = useState<NetworkPharmacyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function load() {
    try {
      const pharmacies = await getMyPharmacies();

      setStats(await getNetworkStats(pharmacies));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger la vue réseau."
      );
    }
  }

  useEffect(() => {
    let isMounted = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const totals = useMemo(
    () =>
      stats.reduce(
        (sum, item) => ({
          salesToday: sum.salesToday + item.salesToday,
          sales7Days: sum.sales7Days + item.sales7Days,
          products: sum.products + item.products,
          quantity: sum.quantity + item.quantity,
          alerts:
            sum.alerts + item.outOfStock + item.lowStock,
          expiry: sum.expiry + item.expiredLots + item.expiringSoonLots,
          stockValue: sum.stockValue + item.stockValuePurchase,
        }),
        {
          salesToday: 0,
          sales7Days: 0,
          products: 0,
          quantity: 0,
          alerts: 0,
          expiry: 0,
          stockValue: 0,
        }
      ),
    [stats]
  );

  async function refresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  async function openPharmacy(pharmacyId: string) {
    setOpeningId(pharmacyId);

    try {
      await setActivePharmacy(pharmacyId);
      // Rechargement complet : toute l'application doit relire la pharmacie active.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d’ouvrir la pharmacie."
      );
      setOpeningId(null);
    }
  }

  if (isLoading) {
    return <PageLoading label="Chargement de la vue réseau..." variant="cards" />;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Network className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                {stats.length} pharmacie(s)
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                Vue réseau
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Ventes, stock et alertes de toutes vos pharmacies, côte à côte.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {stats.length < 2 && (
          <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            Un seul compte pharmacie est rattaché à votre accès. Contactez
            l’administrateur pour ajouter les autres pharmacies de votre réseau.
          </p>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Total label="Ventes du jour" value={formatDisplayMoney(totals.salesToday)} />
          <Total label="Ventes 7 jours" value={formatDisplayMoney(totals.sales7Days)} />
          <Total label="Valeur du stock (achat)" value={formatDisplayMoney(totals.stockValue)} />
          <Total label="Produits disponibles" value={totals.products.toLocaleString("fr-CD")} />
          <Total label="Quantité en stock" value={totals.quantity.toLocaleString("fr-CD")} />
          <Total
            label="Alertes stock / expiration"
            value={`${totals.alerts} / ${totals.expiry}`}
            danger={totals.alerts + totals.expiry > 0}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {stats.map((item) => (
            <article
              key={item.pharmacy.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-slate-950">
                    {item.pharmacy.name}
                  </h2>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {item.pharmacy.city || "Ville non renseignée"}
                  </p>
                </div>

                {item.subscriptionBlocked && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-black text-red-700">
                    Abonnement expiré
                  </span>
                )}
              </div>

              {item.stockUnavailable && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Données de stock indisponibles
                  {item.subscriptionBlocked
                    ? " (abonnement expiré)."
                    : " pour le moment."}
                </p>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-2">
                <Metric
                  icon={<Receipt className="h-4 w-4" />}
                  label="Ventes du jour"
                  value={
                    item.salesUnavailable
                      ? "—"
                      : formatDisplayMoney(item.salesToday)
                  }
                  hint={
                    item.salesUnavailable
                      ? undefined
                      : `${item.salesCountToday} vente(s)`
                  }
                />
                <Metric
                  icon={<Receipt className="h-4 w-4" />}
                  label="7 derniers jours"
                  value={
                    item.salesUnavailable
                      ? "—"
                      : formatDisplayMoney(item.sales7Days)
                  }
                />
                <Metric
                  icon={<Package className="h-4 w-4" />}
                  label="Produits disponibles"
                  value={item.products.toLocaleString("fr-CD")}
                  hint={`dont ${item.productsInStock} en stock`}
                />
                <Metric
                  icon={<Boxes className="h-4 w-4" />}
                  label="Quantité totale"
                  value={item.quantity.toLocaleString("fr-CD")}
                  hint={`valeur ${formatDisplayMoney(item.stockValuePurchase)}`}
                />
                <Metric
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Ruptures / faibles"
                  value={`${item.outOfStock} / ${item.lowStock}`}
                  danger={item.outOfStock > 0}
                />
                <Metric
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Lots expirés / proches"
                  value={`${item.expiredLots} / ${item.expiringSoonLots}`}
                  danger={item.expiredLots > 0}
                />
              </dl>

              <button
                type="button"
                onClick={() => openPharmacy(item.pharmacy.id)}
                disabled={openingId === item.pharmacy.id}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {openingId === item.pharmacy.id
                  ? "Ouverture..."
                  : "Ouvrir cette pharmacie"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Total({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={`mt-1 break-words text-xl font-black md:text-2xl ${
          danger ? "text-red-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
        {icon}
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-base font-black ${
          danger ? "text-red-700" : "text-slate-950"
        }`}
      >
        {value}
      </dd>
      {hint && (
        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
