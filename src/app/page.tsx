import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Boxes,
  FileText,
  LineChart,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import AppLogo from "@/components/branding/AppLogo";
import AksanticFooter from "@/components/branding/AksanticFooter";

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50">
      <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <AppLogo />

          <Link
            href="/connexion"
            className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-800"
          >
            Connexion
          </Link>
        </header>

        <div className="grid flex-1 grid-cols-1 items-center gap-12 py-14 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Solution de gestion multi-pharmacie
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-tight text-slate-950">
              Une application professionnelle pour gérer vos pharmacies avec
              simplicité.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Mpangi_Pharma permet de gérer les produits, lots, stocks,
              expirations, ventes, factures, finances et utilisateurs de
              plusieurs pharmacies depuis une seule plateforme.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/connexion"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-800"
              >
                Accéder à la plateforme
                <ArrowRight className="h-5 w-5" />
              </Link>

              <Link
                href="#modules"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Voir les modules
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-2xl shadow-blue-100 backdrop-blur">
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
                description="Factures simples avec logo pharmacie."
              />
              <ModuleCard
                icon={<LineChart className="h-6 w-6" />}
                title="Finances"
                description="Recettes, dépenses, marges et rapports."
              />
              <ModuleCard
                icon={<Smartphone className="h-6 w-6" />}
                title="PWA"
                description="Installation possible sur Android et ordinateur."
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

      <AksanticFooter />
    </main>
  );
}

function ModuleCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      id="modules"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <h3 className="font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}