"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Database,
  HardDrive,
  RefreshCcw,
  Smartphone,
  Wifi,
  XCircle,
} from "lucide-react";

import { createSupabaseClient } from "@/lib/supabase/client";

type CheckState = "checking" | "ok" | "warning" | "error";

type CheckItem = {
  key: string;
  title: string;
  detail: string;
  state: CheckState;
  icon: typeof Activity;
};

export default function StabilityPage() {
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  async function runChecks() {
    setIsChecking(true);

    const results: CheckItem[] = [];

    results.push({
      key: "network",
      title: "Connexion Internet",
      detail: navigator.onLine ? "Le navigateur est en ligne." : "Le navigateur est hors ligne.",
      state: navigator.onLine ? "ok" : "warning",
      icon: Wifi,
    });

    let storageState: CheckState = "ok";
    let storageDetail = "Le stockage local est accessible.";

    try {
      const key = "mpangi_stability_test";
      window.localStorage.setItem(key, "ok");
      window.localStorage.removeItem(key);
    } catch {
      storageState = "error";
      storageDetail = "Le stockage local est bloqué ou indisponible.";
    }

    results.push({
      key: "storage",
      title: "Stockage local",
      detail: storageDetail,
      state: storageState,
      icon: HardDrive,
    });

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    results.push({
      key: "pwa",
      title: "Mode PWA",
      detail: isStandalone
        ? "L’application est actuellement lancée en mode installé."
        : "L’application fonctionne dans le navigateur. L’installation reste possible.",
      state: isStandalone ? "ok" : "warning",
      icon: Smartphone,
    });

    const registration = await navigator.serviceWorker
      ?.getRegistration()
      .catch(() => undefined);

    results.push({
      key: "service-worker",
      title: "Service Worker",
      detail: registration
        ? "Le service worker est enregistré."
        : "Aucun service worker actif n’a été détecté.",
      state: registration ? "ok" : "warning",
      icon: Cloud,
    });

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from("pharmacies")
        .select("id", { count: "exact", head: true });

      results.push({
        key: "supabase",
        title: "Connexion Supabase",
        detail: error
          ? `Connexion établie mais contrôle refusé : ${error.message}`
          : "La base de données répond correctement.",
        state: error ? "warning" : "ok",
        icon: Database,
      });
    } catch (error) {
      results.push({
        key: "supabase",
        title: "Connexion Supabase",
        detail:
          error instanceof Error
            ? error.message
            : "Impossible de joindre la base de données.",
        state: "error",
        icon: Database,
      });
    }

    setChecks(results);
    setIsChecking(false);
  }

  useEffect(() => {
    void runChecks();
  }, []);

  const okCount = checks.filter((item) => item.state === "ok").length;

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <Link
                href="/parametres"
                className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour aux paramètres
              </Link>

              <h1 className="mt-3 text-2xl font-black text-slate-950 md:text-3xl">
                État de l’application
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Contrôle local de la connectivité, de la PWA et des services essentiels.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void runChecks()}
              disabled={isChecking}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              <RefreshCcw className={`h-5 w-5 ${isChecking ? "animate-spin" : ""}`} />
              {isChecking ? "Vérification..." : "Relancer"}
            </button>
          </div>
        </header>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">
                Contrôles satisfaisants
              </p>
              <p className="text-3xl font-black text-slate-950">
                {okCount}/{checks.length || 5}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {checks.map((item) => {
            const Icon = item.icon;
            const success = item.state === "ok";

            return (
              <article
                key={item.key}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                    <Icon className="h-6 w-6" />
                  </div>

                  {success ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <XCircle
                      className={`h-6 w-6 ${
                        item.state === "error"
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    />
                  )}
                </div>

                <h2 className="mt-4 text-lg font-black text-slate-950">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.detail}
                </p>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
