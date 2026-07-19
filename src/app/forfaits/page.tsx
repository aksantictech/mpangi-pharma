import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import PublicSiteHeader from "@/components/public/PublicSiteHeader";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import PublicMobileNav from "@/components/public/PublicMobileNav";

const plans = [
  {
    name: "Petite pharmacie",
    install: "250 $",
    monthly: "50 $ / mois",
    description:
      "Formule idéale pour une petite pharmacie qui veut démarrer rapidement avec un outil simple et fiable.",
    features: [
      "Installation et configuration de l’application",
      "Gestion des produits et du stock",
      "Ventes et factures",
      "Impression de tickets",
      "1 environnement de gestion",
      "Support de démarrage",
      "Matériel et connexion internet inclus",
    ],
  },
  {
    name: "Pharmacie moyenne",
    install: "350 $",
    monthly: "100 $ / mois",
    description:
      "Solution adaptée à une pharmacie avec plus d’activité, plus de produits et un besoin de suivi renforcé.",
    features: [
      "Installation et configuration avancée",
      "Gestion produits, stock, lots, expirations",
      "Ventes, factures et suivi journalier",
      "Finances et rapports",
      "Meilleure organisation des utilisateurs",
      "Support renforcé",
      "Matériel et connexion internet inclus",
    ],
    featured: true,
  },
  {
    name: "Grande pharmacie",
    install: "500 $",
    monthly: "150 $ / mois",
    description:
      "Formule premium pour une pharmacie importante ou une structure voulant un pilotage plus complet.",
    features: [
      "Installation complète et paramétrage étendu",
      "Gestion complète stock, ventes, factures et finances",
      "Organisation multi-utilisateurs",
      "Rapports plus avancés",
      "Meilleur accompagnement",
      "Support prioritaire",
      "Matériel et connexion internet inclus",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24 lg:pb-0">
      <PublicSiteHeader />

      <section className="bg-gradient-to-r from-blue-800 via-blue-700 to-emerald-600 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">
            Forfaits Mpangi_Pharma
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Des formules simples pour toutes les pharmacies
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-blue-50 md:text-lg">
            Choisissez la formule adaptée à la taille de votre pharmacie :
            petite, moyenne ou grande.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[2rem] border p-6 shadow-sm ${
                plan.featured
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              {plan.featured && (
                <div className="mb-4 inline-flex rounded-full bg-blue-700 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                  Recommandé
                </div>
              )}

              <h2 className="text-2xl font-black text-slate-950">{plan.name}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {plan.description}
              </p>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-500">Installation</p>
                <p className="mt-1 text-3xl font-black text-slate-950">
                  {plan.install}
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-500">
                  Abonnement mensuel
                </p>
                <p className="mt-1 text-2xl font-black text-blue-700">
                  {plan.monthly}
                </p>
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  Tout compris : matériel + connexion internet
                </p>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/devis-demo"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white hover:bg-blue-800"
              >
                Demander ce forfait
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}