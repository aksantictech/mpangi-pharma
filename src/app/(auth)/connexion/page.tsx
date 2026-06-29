"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Boxes,
  FileText,
  LineChart,
  Lock,
  Mail,
  ShieldCheck,
  Store,
} from "lucide-react";

import AppLogo from "@/components/branding/AppLogo";
import AksanticFooter from "@/components/branding/AksanticFooter";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage("Email ou mot de passe incorrect.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <section className="grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden px-12 py-10 lg:flex lg:flex-col lg:justify-center">
          <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-blue-100 blur-3xl" />
          <div className="absolute bottom-10 right-20 h-80 w-80 rounded-full bg-emerald-100 blur-3xl" />

          <div className="relative z-10 max-w-2xl">
            <AppLogo />

            <div className="mt-10">
              <h1 className="max-w-xl text-4xl font-black leading-tight text-slate-950">
                Gestion moderne, simple et sécurisée pour les pharmacies.
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                Mpangi_Pharma accompagne les pharmacies dans la gestion des
                stocks, lots, expirations, ventes, factures et finances.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <FeatureCard
                icon={<Boxes className="h-6 w-6" />}
                title="Stock & lots"
                description="Suivi des produits, lots et quantités."
              />

              <FeatureCard
                icon={<FileText className="h-6 w-6" />}
                title="Factures"
                description="Factures simples avec logo pharmacie."
              />

              <FeatureCard
                icon={<Bell className="h-6 w-6" />}
                title="Expirations"
                description="Alertes produits proches de l’expiration."
              />

              <FeatureCard
                icon={<LineChart className="h-6 w-6" />}
                title="Finances"
                description="Recettes, dépenses et marges."
              />
            </div>

            <div className="mt-10 rounded-3xl border border-emerald-100 bg-emerald-50/80 p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Adapté au contexte RDC
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Gestion CDF/USD, multi-pharmacie, mode PWA et préparation au
                    fonctionnement hors-ligne.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-blue-100 backdrop-blur">
            <div className="mb-8 flex justify-center lg:hidden">
              <AppLogo />
            </div>

            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-700 shadow-inner">
              <Lock className="h-8 w-8" />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-950">
                Bienvenue
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Connectez-vous à votre espace Mpangi_Pharma.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Email
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-blue-500">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="exemple@pharmacie.cd"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Mot de passe
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-blue-500">
                  <Lock className="h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-500">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Se souvenir de moi
                </label>

                <Link
                  href="/mot-de-passe-oublie"
                  className="font-semibold text-blue-700 hover:text-blue-800"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Lock className="h-5 w-5" />
                {isLoading ? "Connexion..." : "Se connecter"}
              </button>

              <Link
                href="/"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-black text-blue-700 transition hover:bg-blue-50"
              >
                <Store className="h-5 w-5" />
                Accéder à la page publique
              </Link>
            </form>
          </div>
        </div>
      </section>

      <AksanticFooter />
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <h3 className="font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}