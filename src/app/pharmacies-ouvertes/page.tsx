"use client";

import { useEffect, useRef, useState } from "react";
import AksanticFooter from "@/components/branding/AksanticFooter";
import Link from "next/link";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import PublicMobileNav from "@/components/public/PublicMobileNav";

import PublicSiteHeader from "@/components/public/PublicSiteHeader";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Search,
  SlidersHorizontal,
  Store,
} from "lucide-react";

import {
  buildPhoneHref,
  buildWhatsappHref,
  searchPublicOpenPharmacies,
  type PublicOpenPharmacy,
} from "@/services/pharmacy-network.service";

export default function PublicOpenPharmaciesPage() {
  const resultsRef = useRef<HTMLElement | null>(null);

  const [city, setCity] = useState("");
  const [commune, setCommune] = useState("");
  const [district, setDistrict] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [openNowOnly, setOpenNowOnly] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [results, setResults] = useState<PublicOpenPharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSearch() {
    setIsLoading(true);
    setErrorMessage("");
    setHasSearched(true);

    try {
      const data = await searchPublicOpenPharmacies({
        city,
        commune,
        district,
        productSearch,
        openNowOnly,
      });

      setResults(data);

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    } catch (error) {
      setResults([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de rechercher les pharmacies ouvertes."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
  <main className="min-h-screen bg-slate-50 pb-24 lg:pb-0">
      <PublicSiteFooter />
    <PublicSiteHeader />

    {/* Garde ici tout le contenu actuel de ta page */}
   

    <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
      <div className="rounded-[2rem] bg-gradient-to-r from-blue-800 via-blue-700 to-emerald-600 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">
              Besoin d’une solution complète ?
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Gérez votre pharmacie avec Mpangi_Pharma
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
              Découvrez nos forfaits, demandez une démonstration ou retournez à
              l’accueil pour en savoir plus.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-blue-700 hover:bg-blue-50"
            >
              Retour à l’accueil
            </Link>

            <Link
              href="/forfaits"
              className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-center text-sm font-black text-white hover:bg-white/20"
            >
              Voir les forfaits
            </Link>

            <Link
              href="/devis-demo"
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-center text-sm font-black text-white hover:bg-emerald-600"
            >
              Demander une démo
            </Link>
          </div>
        </div>
      </div>
    </section>

    <PublicSiteFooter />
    <PublicMobileNav />
  </main>
);
}

function PublicPharmacyCard({
  pharmacy,
  productSearch,
}: {
  pharmacy: PublicOpenPharmacy;
  productSearch: string;
}) {
  const whatsappHref = buildWhatsappHref(
    pharmacy.whatsapp || pharmacy.phone,
    productSearch
      ? `Bonjour, je voudrais confirmer la disponibilité de ${productSearch}.`
      : "Bonjour, je voudrais avoir une information sur votre pharmacie."
  );

  const phoneHref = buildPhoneHref(pharmacy.phone);
  const mapsHref = buildMapsHref(pharmacy);

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-slate-950">
            {pharmacy.pharmacy_name}
          </h3>

          <p className="mt-1 text-xs font-semibold text-slate-500 md:text-sm">
            {[pharmacy.district, pharmacy.commune, pharmacy.city]
              .filter(Boolean)
              .join(" · ") || "Zone non renseignée"}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black md:text-xs ${
            pharmacy.is_open_now
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {pharmacy.is_open_now ? "Ouverte" : "Fermée"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
        <Clock className="h-4 w-4 shrink-0 text-blue-700" />
        {pharmacy.is_24h ? "Ouverte 24h/24" : "Horaires selon pharmacie"}
      </div>

      {productSearch.trim() && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2 text-sm font-bold ${
            pharmacy.product_availability.includes("Disponible")
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-amber-100 bg-amber-50 text-amber-700"
          }`}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {productSearch} : {pharmacy.product_availability}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 text-sm font-semibold text-slate-600">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>{pharmacy.address || "Adresse non renseignée"}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {phoneHref && pharmacy.accepts_public_calls ? (
          <a
            href={phoneHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm font-black text-blue-700"
          >
            <Phone className="h-4 w-4" />
            Appeler
          </a>
        ) : (
          <DisabledAction label="Appel indisponible" />
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

      {mapsHref && (
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700"
        >
          <Navigation className="h-4 w-4" />
          Voir l’itinéraire
        </a>
      )}
    </article>
  );
}

function buildMapsHref(pharmacy: PublicOpenPharmacy) {
  const location = [
    pharmacy.address,
    pharmacy.district,
    pharmacy.commune,
    pharmacy.city,
  ]
    .filter(Boolean)
    .join(", ");

  if (!location) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location
  )}`;
}

function PublicEmptyState({ hasSearched }: { hasSearched: boolean }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center md:col-span-2 xl:col-span-3">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
        <Store className="h-7 w-7" />
      </div>

      <h3 className="mt-4 font-black text-slate-950">
        {hasSearched
          ? "Aucune pharmacie trouvée"
          : "Recherchez une pharmacie"}
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        {hasSearched
          ? "Essayez une autre commune, un autre quartier ou désactivez le filtre “Ouvertes maintenant”."
          : "Indiquez votre zone ou le produit recherché pour commencer."}
      </p>
    </div>
  );
}

function PublicCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[1.5rem] border border-slate-200 bg-white p-5">
      <div className="h-6 w-2/3 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
      <div className="mt-5 h-12 rounded-2xl bg-slate-100" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-11 rounded-2xl bg-slate-100" />
        <div className="h-11 rounded-2xl bg-slate-100" />
      </div>
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
