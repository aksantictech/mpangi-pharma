"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  CircleHelp,
  Clock,
  Database,
  MemoryStick,
  Package,
  Plug,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Users,
  XCircle,
  Zap,
  Activity,
  type LucideIcon,
} from "lucide-react";

import { getSystemHealth } from "@/services/admin-health.service";

import type {
  HealthCategory,
  HealthGauge,
  HealthStatus,
  SystemHealth,
} from "@/types/health";

const REFRESH_MS = 2 * 60 * 1000;

const statusStyles: Record<
  HealthStatus,
  { text: string; bg: string; bar: string; label: string }
> = {
  ok: { text: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500", label: "Normal" },
  warning: { text: "text-amber-700", bg: "bg-amber-50", bar: "bg-amber-500", label: "À surveiller" },
  error: { text: "text-red-700", bg: "bg-red-50", bar: "bg-red-500", label: "Critique" },
  unknown: { text: "text-slate-500", bg: "bg-slate-100", bar: "bg-slate-300", label: "Indisponible" },
};

function StatusIcon({ status, className = "h-5 w-5" }: { status: HealthStatus; className?: string }) {
  if (status === "ok") return <CheckCircle2 className={`${className} text-emerald-600`} />;
  if (status === "warning") return <AlertTriangle className={`${className} text-amber-600`} />;
  if (status === "error") return <XCircle className={`${className} text-red-600`} />;

  return <CircleHelp className={`${className} text-slate-400`} />;
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">{children}</h2>
      {aside && <p className="text-xs text-slate-400">{aside}</p>}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "light",
  iconClass = "bg-slate-100 text-slate-600",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: "light" | "dark" | "danger";
  iconClass?: string;
}) {
  const dark = tone === "dark";

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        dark
          ? "border-slate-800 bg-gradient-to-br from-slate-950 to-blue-950 text-white"
          : tone === "danger"
            ? "border-red-100 bg-white"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-semibold ${dark ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            dark ? "bg-white/10 text-white" : iconClass
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className={`mt-4 text-4xl font-black ${dark ? "text-white" : "text-slate-950"}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${dark ? "text-slate-300" : "text-slate-400"}`}>{hint}</p>}
    </div>
  );
}

function formatDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return undefined;
  if (previous === 0) return current === 0 ? "stable" : `vs 0 avant`;

  const delta = Math.round(((current - previous) / previous) * 100);

  return `${delta >= 0 ? "+" : ""}${delta} % vs période précédente`;
}

function num(value: number | null) {
  return value === null ? "—" : value.toLocaleString("fr-FR");
}

function GaugeCard({ gauge, icon: Icon }: { gauge: HealthGauge; icon: LucideIcon }) {
  const style = statusStyles[gauge.status];
  const critical = gauge.available && gauge.status === "error";
  const percent = gauge.percent ?? 0;

  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-sm ${
        critical ? "animate-pulse border-red-300" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-black text-slate-950">
          <Icon className="h-4 w-4 text-slate-400" />
          {gauge.label}
        </p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      <p className="mt-4 text-3xl font-black text-slate-950">
        {gauge.available && gauge.percent !== null ? `${gauge.percent.toFixed(1)} %` : "—"}
      </p>
      <p className="mt-1 text-xs text-slate-500">{gauge.detail}</p>

      <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${style.bar}`}
          style={{ width: `${gauge.available ? Math.min(100, percent) : 0}%` }}
        />
        <div className="absolute inset-y-0 left-[85%] w-0.5 bg-red-500" aria-hidden />
      </div>
    </div>
  );
}

function ScoreRing({ score, level }: { score: number; level: SystemHealth["level"] }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const color = level === "ok" ? "#059669" : level === "watch" ? "#d97706" : "#dc2626";

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-slate-950">{score}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function CategoryCard({ category, icon: Icon }: { category: HealthCategory; icon: LucideIcon }) {
  const style = statusStyles[category.status];
  const label =
    category.status === "ok" ? "OK" : category.status === "unknown" ? "—" : style.label;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-black text-slate-950">{category.title}</p>
            <p className="text-xs text-slate-400">{category.subtitle}</p>
          </div>
        </div>
        <span className={`flex items-center gap-1 text-xs font-black ${style.text}`}>
          <StatusIcon status={category.status} className="h-4 w-4" />
          {label}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {category.checks.map((check) => (
          <li key={check.key} className="flex items-start gap-3">
            <StatusIcon status={check.status} className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-900">{check.title}</p>
              <p className="text-xs leading-5 text-slate-500">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const categoryIcons: Record<HealthCategory["key"], LucideIcon> = {
  security: ShieldCheck,
  reliability: Database,
  integrity: CheckCircle2,
};

export default function SystemHealthPanel() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      setHealth(await getSystemHealth());
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Mesure indisponible.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    const id = window.setInterval(() => void load(), REFRESH_MS);

    return () => window.clearInterval(id);
  }, [load]);

  if (!health) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm md:rounded-[2rem]">
        {errorMessage ? (
          <span className="font-bold text-red-700">{errorMessage}</span>
        ) : (
          "Mesure de la santé de la plateforme..."
        )}
      </section>
    );
  }

  const { platform } = health;
  const scoreColor =
    health.level === "ok"
      ? "bg-emerald-50 text-emerald-800"
      : health.level === "watch"
        ? "bg-amber-50 text-amber-800"
        : "bg-red-50 text-red-800";

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {!health.databaseMetricsAvailable && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          Les mesures de la base (taille, connexions, cache, RLS, intégrité) demandent
          d’exécuter une fois <code className="font-black">supabase/migrations/0003_admin_health.sql</code> dans Supabase.
        </div>
      )}

      <section>
        <SectionTitle>Patrimoine de la plateforme</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard tone="dark" label="Pharmacies" value={num(platform.pharmacies)} icon={Building2} />
          <StatCard label="Utilisateurs" value={num(platform.users)} icon={Users} iconClass="bg-teal-50 text-teal-600" />
          <StatCard label="Produits" value={num(platform.products)} icon={Package} iconClass="bg-amber-50 text-amber-600" />
          <StatCard
            label="Ventes (30 j)"
            value={num(platform.salesLast30d)}
            hint={formatDelta(platform.salesLast30d, platform.salesPrev30d)}
            icon={ShoppingCart}
            iconClass="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Actions enregistrées (30 j)"
            value={num(platform.actionsLast30d)}
            icon={Activity}
            iconClass="bg-blue-50 text-blue-600"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Pharmacies par statut</SectionTitle>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <StatCard label="Actives" value={platform.byStatus.active} icon={CheckCircle2} iconClass="bg-emerald-50 text-emerald-600" />
          <StatCard label="En essai" value={platform.byStatus.trial} icon={Clock} iconClass="bg-amber-50 text-amber-600" />
          <StatCard label="Expirées" value={platform.byStatus.expired} icon={AlertTriangle} iconClass="bg-orange-50 text-orange-600" />
          <StatCard
            tone={platform.byStatus.blocked > 0 ? "danger" : "light"}
            label="Bloquées"
            value={platform.byStatus.blocked}
            hint={platform.byStatus.blocked === 0 ? "Aucune" : undefined}
            icon={ShieldAlert}
            iconClass="bg-red-50 text-red-600"
          />
          <StatCard label="Archivées" value={platform.byStatus.archived} icon={Archive} />
        </div>
      </section>

      <section>
        <SectionTitle aside="Une jauge devient rouge et clignote au-delà de 85 %.">
          Ressources en temps réel
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <GaugeCard gauge={health.gauges.database} icon={Database} />
          <GaugeCard gauge={health.gauges.connections} icon={Plug} />
          <GaugeCard gauge={health.gauges.serverMemory} icon={MemoryStick} />
          <GaugeCard gauge={health.gauges.cache} icon={Zap} />
        </div>
      </section>

      <section>
        <SectionTitle>Santé de l’application</SectionTitle>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ScoreRing score={health.score} level={health.level} />

            <div className="min-w-0 flex-1">
              <span className={`inline-flex rounded-full px-4 py-1.5 text-sm font-black ${scoreColor}`}>
                {health.levelLabel}
              </span>
              <p className="mt-2 text-xs text-slate-500">
                Mesures réelles effectuées le{" "}
                {new Date(health.measuredAt).toLocaleString("fr-FR")} · actualisées toutes les 2 minutes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Mesurer
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {health.categories.map((category) => (
              <CategoryCard key={category.key} category={category} icon={categoryIcons[category.key]} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
