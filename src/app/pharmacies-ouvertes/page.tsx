"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

import PublicMobileNav from "@/components/public/PublicMobileNav";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import PublicSiteHeader from "@/components/public/PublicSiteHeader";
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
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch (error) {
      setResults([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de rechercher les pharmacies."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 pb-24 lg:pb-0">
      <PublicSiteHeader />

      <section className="bg-gradient-to-br from-blue-950 via-blue-800 to-emerald-700 px-4 pb-20 pt-12 text-white md:px-6 md:pb-28 md:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em]">
            <Store className="h-4 w-4" />
            Service public
          </div>

          <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight md:text-5xl">
            Trouver rapidement une pharmacie ouverte
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-50 md:text-lg">
            Recherchez par ville, commune ou quartier, puis appelez, écrivez sur
            WhatsApp ou lancez directement l’itinéraire.
          </p>
        </div>
      </section>

      <section className="-mt-12 px-3 pb-12 md:-mt-16 md:px-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl md:p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Produit recherché, ville ou pharmacie..."
                  className="w-full bg-transparent text-sm outline-none"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleSearch();
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={isLoading}
                className="rounded-2xl bg-blue-700 px-6 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {isLoading ? "Recherche..." : "Rechercher"}
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((value) => !value)}
                className="inline-flex items-center gap-2 text-sm font-black text-slate-700"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtres avancés
              </button>

              <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                <input
                  type="checkbox"
                  checked={openNowOnly}
                  onChange={(event) => setOpenNowOnly(event.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Ouvertes maintenant uniquement
              </label>
            </div>

            {showAdvancedFilters && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ville" className="form-input" />
                <input value={commune} onChange={(event) => setCommune(event.target.value)} placeholder="Commune" className="form-input" />
                <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Quartier / district" className="form-input" />
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              {errorMessage}
            </div>
          )}

          <section ref={resultsRef} className="scroll-mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950 md:text-2xl">
                  Pharmacies disponibles
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Vérifiez les coordonnées avant de vous déplacer.
                </p>
              </div>

              <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                {results.length}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-72 animate-pulse rounded-[2rem] bg-white" />
                ))
              ) : results.length > 0 ? (
                results.map((pharmacy) => (
                  <PublicPharmacyCard
                    key={pharmacy.pharmacy_id}
                    pharmacy={pharmacy}
                    productSearch={productSearch}
                  />
                ))
              ) : (
                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center md:col-span-2 xl:col-span-3">
                  <Store className="mx-auto h-10 w-10 text-blue-700" />
                  <h3 className="mt-4 text-lg font-black text-slate-950">
                    {hasSearched ? "Aucune pharmacie trouvée" : "Lancez une recherche"}
                  </h3>
                </div>
              )}
            </div>
          </section>
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
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start gap-4 border-b border-slate-100 p-5">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-50">
          {pharmacy.logo_url ? (
            <Image src={pharmacy.logo_url} alt={pharmacy.pharmacy_name} fill className="object-contain p-2" unoptimized />
          ) : (
            <Store className="h-7 w-7 text-blue-700" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-black text-slate-950">
              {pharmacy.pharmacy_name}
            </h3>

            <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${pharmacy.is_open_now ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {pharmacy.is_open_now ? "Ouverte" : "Fermée"}
            </span>
          </div>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {[pharmacy.district, pharmacy.commune, pharmacy.city]
              .filter(Boolean)
              .join(" · ") || "Localisation non renseignée"}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
          <Clock className="h-4 w-4 text-blue-700" />
          {pharmacy.is_24h ? "Ouverte 24 h/24" : "Horaires selon la pharmacie"}
        </div>

        {productSearch.trim() && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {productSearch} : {pharmacy.product_availability}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>{pharmacy.address || "Adresse non renseignée"}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {phoneHref && pharmacy.accepts_public_calls ? (
            <a href={phoneHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-50 px-3 py-3 text-sm font-black text-blue-700">
              <Phone className="h-4 w-4" />
              Appeler
            </a>
          ) : (
            <button disabled className="rounded-2xl bg-slate-100 px-3 py-3 text-sm font-black text-slate-400">Appel indisponible</button>
          )}

          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-black text-emerald-700">
              WhatsApp
            </a>
          ) : (
            <button disabled className="rounded-2xl bg-slate-100 px-3 py-3 text-sm font-black text-slate-400">Pas WhatsApp</button>
          )}
        </div>

        {mapsHref && (
          <a href={mapsHref} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">
            <Navigation className="h-4 w-4" />
            Voir l’itinéraire
          </a>
        )}
      </div>
    </article>
  );
}

function buildMapsHref(pharmacy: PublicOpenPharmacy) {
  const row = pharmacy as PublicOpenPharmacy & {
    latitude?: number | null;
    longitude?: number | null;
  };

  if (row.latitude != null && row.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${row.latitude},${row.longitude}`;
  }

  const location = [
    pharmacy.address,
    pharmacy.district,
    pharmacy.commune,
    pharmacy.city,
  ]
    .filter(Boolean)
    .join(", ");

  return location
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`
    : "";
}
