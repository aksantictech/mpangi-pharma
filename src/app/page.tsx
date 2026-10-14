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
  ShoppingCart,
  CheckCircle2,
  ChevronDown,
  Pill,
  PhoneCall,
  BadgeDollarSign,
} from "lucide-react";

import { DashboardMock, PhoneMock } from "@/components/public/AppMockups";
import PublicSiteHeader from "@/components/public/PublicSiteHeader";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import { prefetchFor } from "@/lib/public-links";
import { CONTACT, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

// Tarifs alignés sur /forfaits. Volontairement AUCUN aggregateRating/review :
// des avis inventés violent les règles Google sur les données structurées.
const baseGraph = [
    {
      "@type": "Organization",
      "@id": `${CONTACT.website}/#organization`,
      name: "Aksantic Technology",
      url: CONTACT.website,
      email: CONTACT.email,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: CONTACT.whatsapp,
        contactType: "sales",
        availableLanguage: ["fr"],
        areaServed: "CD",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "fr",
      publisher: { "@id": `${CONTACT.website}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android",
      inLanguage: "fr",
      publisher: { "@id": `${CONTACT.website}/#organization` },
      offers: [
        { name: "Petite pharmacie", price: "50" },
        { name: "Pharmacie moyenne", price: "100" },
        { name: "Grande pharmacie", price: "150" },
      ].map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.price,
        priceCurrency: "USD",
        url: `${SITE_URL}/forfaits`,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: plan.price,
          priceCurrency: "USD",
          unitText: "MONTH",
        },
      })),
    },
  ];

const faqs = [
  {
    question: "Faut-il une connexion internet en permanence ?",
    answer:
      "Non. La caisse continue de fonctionner hors-ligne : les ventes sont enregistrées sur le terminal puis synchronisées automatiquement dès que la connexion revient.",
  },
  {
    question: "Sur quels appareils fonctionne Mpangi_Pharma ?",
    answer:
      "Sur ordinateur dans le navigateur, et sur Android grâce à une application installable, pensée pour les terminaux de caisse et les téléphones.",
  },
  {
    question: "Peut-on imprimer des factures et des tickets ?",
    answer:
      "Oui. Les factures portent le logo de votre pharmacie et s'impriment en format A4 ou en ticket thermique pour imprimante de caisse.",
  },
  {
    question: "Comment sont gérés les produits proches de la péremption ?",
    answer:
      "Chaque lot a sa date d'expiration. Le tableau de bord signale les lots à surveiller (alertes à 30, 60 et 90 jours) et la caisse peut refuser la vente d'un lot périmé.",
  },
  {
    question: "Mes données sont-elles protégées ?",
    answer:
      "Chaque utilisateur a un rôle (propriétaire, gérant, pharmacien, caissier, gestionnaire de stock, comptable) qui limite ce qu'il voit et ce qu'il peut faire. Les données d'une pharmacie sont strictement séparées de celles des autres.",
  },
  {
    question: "Combien coûte Mpangi_Pharma ?",
    answer:
      "Trois formules selon la taille de la pharmacie : de 50 à 150 $ par mois, avec des frais d'installation uniques de 250 à 500 $. Le matériel et la connexion internet sont inclus. Le détail est sur la page Forfaits.",
  },
  {
    question: "Comment démarrer ?",
    answer:
      "Demandez une démonstration : nous installons et configurons l'application avec vous, puis nous vous accompagnons au démarrage grâce au support inclus dans chaque forfait.",
  },
];

const steps = [
  {
    title: "Nous installons votre pharmacie",
    description:
      "Création de votre espace, logo, utilisateurs et rôles, avec le matériel et la connexion inclus.",
  },
  {
    title: "Vous chargez votre catalogue",
    description:
      "Import Excel ou catalogue national, indice de prix automatique, premiers lots avec leurs dates d'expiration.",
  },
  {
    title: "Vous vendez et vous pilotez",
    description:
      "Caisse rapide même hors-ligne, factures, alertes de stock et d'expiration, finances en un coup d'œil.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    ...baseGraph,
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};
const features = [
  {
    icon: <ShoppingCart className="h-6 w-6" />,
    title: "Caisse rapide",
    description:
      "Tuiles tactiles, scan code-barres, paiement cash, mobile money, carte ou société conventionnée. Fonctionne aussi hors-ligne.",
  },
  {
    icon: <Boxes className="h-6 w-6" />,
    title: "Stock & lots",
    description:
      "Entrées, sorties, lots, seuils minimum et réapprovisionnement signalé avant la rupture.",
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Expirations",
    description:
      "Alertes à 30, 60 et 90 jours et possibilité de bloquer la vente des lots périmés.",
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Factures",
    description:
      "Factures avec le logo de la pharmacie, en A4 ou en ticket thermique, avec la TVA si nécessaire.",
  },
  {
    icon: <LineChart className="h-6 w-6" />,
    title: "Finances",
    description:
      "Recettes, dépenses, marges et rapports pour savoir ce que rapporte réellement votre pharmacie.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: "Équipe & sécurité",
    description:
      "Un rôle par utilisateur et des données strictement séparées entre pharmacies.",
  },
];

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 pb-24 lg:pb-0">
      <JsonLd data={structuredData} />
      <PublicSiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              Conçu pour les pharmacies de la RDC
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-950 md:text-5xl">
              Gérez votre pharmacie avec une solution moderne, simple et
              professionnelle.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Une caisse rapide, un stock toujours à jour, des factures
              propres et des chiffres clairs : Mpangi_Pharma réunit produits,
              lots, expirations, ventes, finances et équipe, et aide aussi le
              public à trouver les pharmacies ouvertes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/devis-demo"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-800"
              >
                Demander une démo
                <ArrowRight className="h-5 w-5" />
              </Link>

              <Link
                href="/pharmacies-ouvertes"
                prefetch={false}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Trouver une pharmacie ouverte
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-700">
              {[
                "Fonctionne hors-ligne",
                "Application Android",
                "Ticket thermique",
                "Matériel inclus",
              ].map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <figure className="relative">
            <div className="hidden lg:mr-40 lg:block">
              <DashboardMock />
            </div>

            <div className="lg:absolute lg:-bottom-12 lg:-right-4 lg:w-[17.5rem]">
              <PhoneMock />
            </div>

            <figcaption className="mt-5 text-center text-xs font-semibold text-slate-600 lg:mr-44 lg:mt-6">
              Aperçu illustratif de l’application, avec des chiffres de
              démonstration.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-10 text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
              Fonctionnalités
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Tout ce qu’il faut pour tenir votre pharmacie
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <ModuleCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="mb-10 text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
            Comment ça marche
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Opérationnel en trois étapes
          </h2>
        </div>

        <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-xl font-black text-white">
                {index + 1}
              </span>

              <h3 className="mt-5 text-xl font-black text-slate-950">
                {step.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 md:px-6">
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
            <p className="mt-3 text-slate-600">
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
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-700 px-6 py-4 text-sm font-black text-white hover:bg-blue-800"
            >
              Voir tous les détails
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
            Questions fréquentes
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Vous vous demandez…
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-black text-slate-950">
                {faq.question}
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" />
              </summary>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="rounded-[2rem] bg-gradient-to-r from-blue-800 via-blue-700 to-emerald-600 px-6 py-12 text-center text-white md:px-12">
          <h2 className="text-3xl font-black">
            Prêt à simplifier la gestion de votre pharmacie ?
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-blue-50">
            Voyez l’application en action lors d’une démonstration, et
            choisissez la formule adaptée à votre pharmacie.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/devis-demo"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-blue-800 hover:bg-blue-50"
            >
              Demander une démo
              <ArrowRight className="h-5 w-5" />
            </Link>

            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/60 px-6 py-4 text-sm font-black text-white hover:bg-white/10"
            >
              Nous contacter
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
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
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
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>

      <Link
        href={href}
        prefetch={prefetchFor(href)}
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
        <p className="text-sm font-semibold text-slate-600">Installation</p>
        <p className="text-2xl font-black text-slate-950">{install}</p>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-slate-600">Abonnement</p>
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