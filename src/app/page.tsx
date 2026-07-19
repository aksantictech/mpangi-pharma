import Link from "next/link";
import type { ReactNode } from "react";
import PublicMobileNav from "@/components/public/PublicMobileNav";
import {
  ArrowRight,
  Bell,
  Boxes,
  FileText,
  LineChart,
  ShieldCheck,
  Smartphone,
  Pill,
  PhoneCall,
  BadgeDollarSign,
} from "lucide-react";

import PublicSiteHeader from "@/components/public/PublicSiteHeader";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 pb-24 lg:pb-0">
      <PublicSiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Solution de gestion multi-pharmacie
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-950 md:text-5xl">
              Gérez votre pharmacie avec une solution moderne, simple et
              professionnelle.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Mpangi_Pharma permet de gérer les produits, stocks, lots,
              expirations, ventes, factures, finances et utilisateurs, tout en
              facilitant aussi la recherche des pharmacies ouvertes pour le
              public.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pharmacies-ouvertes"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-800"
              >
                Trouver une pharmacie ouverte
                <ArrowRight className="h-5 w-5" />
              </Link>

              <Link
                href="/forfaits"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Voir les forfaits
              </Link>

              <Link
                href="/devis-demo"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-black text-emerald-700 hover:bg-emerald-100"
              >
                Demander une démo
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-2xl shadow-blue-100 backdrop-blur">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ModuleCard
                icon={<Boxes className="h-6 w-6" />}
                title="Stock & lots"
                description="Gestion des entrées, sorties, lots et seuils."
              />
              <ModuleCard
                icon={<Bell className="h-6 w-6" />}
                title="Expirations"
                description="Alertes 30, 60 et 90 jours."
              />
              <ModuleCard
                icon={<FileText className="h-6 w-6" />}
                title="Factures"
                description="Factures avec logo et impression thermique."
              />
              <ModuleCard
                icon={<LineChart className="h-6 w-6" />}
                title="Finances"
                description="Recettes, dépenses, marges et rapports."
              />
              <ModuleCard
                icon={<Smartphone className="h-6 w-6" />}
                title="PWA / Mobile"
                description="Installation Android et usage terrain."
              />
              <ModuleCard
                icon={<ShieldCheck className="h-6 w-6" />}
                title="Sécurité"
                description="Accès par rôle et séparation des pharmacies."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ServiceCard
            icon={<Pill className="h-6 w-6" />}
            title="Pharmacies ouvertes"
            description="Le public peut rechercher les pharmacies ouvertes dans sa zone et les contacter directement."
            href="/pharmacies-ouvertes"
            cta="Rechercher maintenant"
          />
          <ServiceCard
            icon={<BadgeDollarSign className="h-6 w-6" />}
            title="Forfaits adaptés"
            description="Découvrez nos 3 formules adaptées aux petites, moyennes et grandes pharmacies."
            href="/forfaits"
            cta="Voir les forfaits"
          />
          <ServiceCard
            icon={<PhoneCall className="h-6 w-6" />}
            title="Démo & contact"
            description="Demandez une démonstration, un devis ou contactez-nous pour lancer votre pharmacie."
            href="/devis-demo"
            cta="Demander une démo"
          />
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
              Tarification
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Des forfaits clairs et accessibles
            </h2>
            <p className="mt-3 text-slate-500">
              Installation + abonnement mensuel tout compris.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <PricingPreviewCard
              name="Petite pharmacie"
              install="250 $"
              monthly="50 $ / mois"
              items={[
                "Installation et configuration",
                "Gestion stock, ventes, factures",
                "Support de base",
                "Matériel et connexion inclus",
              ]}
            />

            <PricingPreviewCard
              name="Pharmacie moyenne"
              install="350 $"
              monthly="100 $ / mois"
              items={[
                "Installation et configuration",
                "Modules étendus + rapports",
                "Meilleur suivi opérationnel",
                "Matériel et connexion inclus",
              ]}
              featured
            />

            <PricingPreviewCard
              name="Grande pharmacie"
              install="500 $"
              monthly="150 $ / mois"
              items={[
                "Installation complète",
                "Organisation plus avancée",
                "Pilotage multi-utilisateurs",
                "Matériel et connexion inclus",
              ]}
            />
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/forfaits"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-6 py-4 text-sm font-black text-white hover:bg-blue-800"
            >
              Voir tous les détails
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
      <PublicMobileNav />
    </main>
  );
}

function ModuleCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <h3 className="font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ServiceCard({
  icon,
  title,
  description,
  href,
  cta,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>

      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700"
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function PricingPreviewCard({
  name,
  install,
  monthly,
  items,
  featured = false,
}: {
  name: string;
  install: string;
  monthly: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] border p-6 shadow-sm ${
        featured
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <h3 className="text-xl font-black text-slate-950">{name}</h3>

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold text-slate-500">Installation</p>
        <p className="text-2xl font-black text-slate-950">{install}</p>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-slate-500">Abonnement</p>
        <p className="text-xl font-black text-blue-700">{monthly}</p>
      </div>

      <ul className="mt-5 space-y-2 text-sm text-slate-600">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}