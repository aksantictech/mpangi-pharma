"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Boxes,
  Download,
  FileText,
  LineChart,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";

import AppLogo from "@/components/branding/AppLogo";
import AksanticFooter from "@/components/branding/AksanticFooter";
import { createSupabaseClient } from "@/lib/supabase/client";

const APK_DOWNLOAD_HREF = "/downloads/Mpangi-Pharma.apk";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
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
                    Gestion CDF/USD, multi-pharmacie, mode PWA, APK Android et
                    préparation au fonctionnement hors-ligne.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-blue-100 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Smartphone className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Application Android disponible
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Installez l’APK sur un terminal Android ou un appareil POS
                    compatible pour faciliter l’utilisation en pharmacie.
                  </p>

                  <a
                    href={APK_DOWNLOAD_HREF}
                    download="Mpangi-Pharma.apk"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
                  >
                    <Download className="h-5 w-5" />
                    Télécharger l’APK Android
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-2xl shadow-blue-100 backdrop-blur sm:rounded-[2rem] sm:p-8">
            <div className="mb-6 flex justify-center lg:hidden">
              <AppLogo />
            </div>

            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700 shadow-inner sm:mb-6 sm:h-16 sm:w-16">
              <Lock className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-950">
                Bienvenue
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Connectez-vous à votre espace Mpangi_Pharma.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-7 space-y-4 sm:mt-8 sm:space-y-5">
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
                    autoComplete="email"
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
                    autoComplete="current-password"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 text-slate-500">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-xs sm:text-sm">Se souvenir</span>
                </label>

                <Link
                  href="/mot-de-passe-oublie"
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 sm:text-sm"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Lock className="h-5 w-5" />
                {isLoading ? "Connexion..." : "Se connecter"}
              </button>

              <a
                href={APK_DOWNLOAD_HREF}
                download="Mpangi-Pharma.apk"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
              >
                <Download className="h-5 w-5" />
                Télécharger l’application Android
              </a>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold leading-5 text-slate-500">
                  Sur Android, après téléchargement de l’APK, autorisez
                  l’installation depuis le navigateur si le téléphone le demande.
                </p>
              </div>

              <Link
                href="/"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-black text-blue-700 transition hover:bg-blue-50"
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
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <h3 className="font-black text-slate-900">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}