"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, Lock, Mail, ShieldCheck, Store } from "lucide-react";

import AksanticFooter from "@/components/branding/AksanticFooter";
import { createSupabaseClient } from "@/lib/supabase/client";

const APK_DOWNLOAD_HREF = "/download/Mpangi-Pharma.apk";
const LOGIN_HERO_IMAGE = "/branding/login-hero.jpg";

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
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Photo pleine page, commune aux deux colonnes */}
      <div
        className="fixed inset-0 -z-10 bg-slate-900 bg-cover bg-center"
        style={{ backgroundImage: `url(${LOGIN_HERO_IMAGE})` }}
      />
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-slate-950/10" />
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-950/35 via-transparent to-emerald-900/25" />

      <div className="relative flex min-h-screen flex-col">
        <section className="grid flex-1 grid-cols-1 lg:grid-cols-[1.1fr_460px]">
          <div className="relative hidden flex-col items-center justify-center px-12 py-10 lg:flex">
            <div className="flex max-w-xl flex-col items-center text-center">
              <div className="mp-login-logo-stage relative flex h-40 w-40 items-center justify-center">
                <div className="mp-login-logo-glow absolute left-1/2 top-1/2 h-64 w-64 rounded-full bg-gradient-to-br from-blue-400 via-emerald-300 to-blue-500 blur-3xl" />

                <div className="mp-login-logo-float relative flex h-32 w-32 items-center justify-center rounded-[2rem] bg-white/95 p-5 shadow-2xl shadow-black/50 ring-1 ring-white/40 backdrop-blur">
                  <Image
                    src="/icons/m-pharma.svg"
                    alt="Mpangi Pharma"
                    width={96}
                    height={96}
                    priority
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              <h1 className="mt-10 text-4xl font-black leading-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] xl:text-5xl">
                Gestion moderne, simple et sécurisée{" "}
                <span className="bg-gradient-to-r from-emerald-300 to-blue-300 bg-clip-text text-transparent">
                  pour les pharmacies.
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10 lg:justify-end lg:px-12">
            <div className="w-full max-w-md rounded-[1.75rem] border border-white/50 bg-white/95 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:rounded-[2rem] sm:p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-blue-100 ring-1 ring-slate-100">
                  <Image
                    src="/icons/m-pharma.svg"
                    alt="Mpangi Pharma"
                    width={40}
                    height={40}
                    priority
                    className="h-10 w-10 object-contain"
                  />
                </div>

                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-blue-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Espace sécurisé
                </span>
              </div>

              <div className="mt-5 text-center">
                <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
                  Bienvenue sur Mpangi_Pharma
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Connectez-vous à votre espace pharmacie.
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
      </div>
    </main>
  );
}
