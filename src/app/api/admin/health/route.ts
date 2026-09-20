import os from "node:os";

import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { getApiErrorStatus } from "@/lib/http/request-security";

import type {
  HealthCategory,
  HealthCheck,
  HealthGauge,
  HealthStatus,
  PlatformStats,
  SystemHealth,
} from "@/types/health";

// Limite du plan Supabase gratuit ; surchargeable si le plan change.
const DB_LIMIT_BYTES =
  Number(process.env.DB_SIZE_LIMIT_MB || 500) * 1024 * 1024;

const WARN_PERCENT = 70;
const CRITICAL_PERCENT = 85; // seuil d'alerte rouge clignotante côté UI

type AdminClient = Awaited<ReturnType<typeof requirePlatformAdmin>>["supabaseAdmin"];

type DbHealth = {
  db_size_bytes?: number;
  connections_used?: number;
  connections_max?: number;
  cache_hit_ratio?: number | null;
  tables_without_rls?: string[];
  integrity_negative_batches?: number | null;
  integrity_sales_without_items?: number | null;
  integrity_orphan_sale_items?: number | null;
  integrity_pharmacies_without_manager?: number | null;
  integrity_pharmacies_without_settings?: number | null;
  integrity_pharmacies_without_subscription?: number | null;
};

function statusFromPercent(percent: number): HealthStatus {
  if (percent >= CRITICAL_PERCENT) return "error";
  if (percent >= WARN_PERCENT) return "warning";
  return "ok";
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} Go`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;

  return `${Math.round(bytes / 1024)} Ko`;
}

function unavailableGauge(label: string, detail: string): HealthGauge {
  return { available: false, percent: null, label, detail, status: "unknown" };
}

async function safeCount(
  query: PromiseLike<{ count: number | null; error: unknown }>
): Promise<number | null> {
  try {
    const { count, error } = await query;

    return error ? null : count;
  } catch {
    return null;
  }
}

async function loadPlatformStats(supabaseAdmin: AdminClient): Promise<PlatformStats> {
  const now = Date.now();
  const d30 = new Date(now - 30 * 86_400_000).toISOString();
  const d60 = new Date(now - 60 * 86_400_000).toISOString();

  const [
    pharmaciesResult,
    subscriptionsResult,
    users,
    products,
    salesLast30d,
    salesPrev30d,
    actionsLast30d,
  ] = await Promise.all([
    supabaseAdmin.from("pharmacies").select("id, is_active, archived_at"),
    supabaseAdmin.from("pharmacy_subscriptions").select("pharmacy_id, status, expires_at"),
    safeCount(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true })),
    safeCount(supabaseAdmin.from("products").select("id", { count: "exact", head: true })),
    safeCount(
      supabaseAdmin.from("sales").select("id", { count: "exact", head: true }).gte("created_at", d30)
    ),
    safeCount(
      supabaseAdmin
        .from("sales")
        .select("id", { count: "exact", head: true })
        .gte("created_at", d60)
        .lt("created_at", d30)
    ),
    safeCount(
      supabaseAdmin.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", d30)
    ),
  ]);

  const subscriptions = new Map(
    (subscriptionsResult.data ?? []).map((row) => [row.pharmacy_id as string, row])
  );

  const byStatus = { active: 0, trial: 0, expired: 0, blocked: 0, archived: 0 };

  for (const pharmacy of pharmaciesResult.data ?? []) {
    if (pharmacy.archived_at) {
      byStatus.archived += 1;
      continue;
    }

    const subscription = subscriptions.get(pharmacy.id as string);
    const expired =
      !subscription ||
      subscription.status === "expired" ||
      (subscription.expires_at && new Date(subscription.expires_at).getTime() <= now);

    if (subscription?.status === "blocked" || !pharmacy.is_active) byStatus.blocked += 1;
    else if (expired) byStatus.expired += 1;
    else if (subscription?.status === "trial") byStatus.trial += 1;
    else byStatus.active += 1;
  }

  return {
    pharmacies: pharmaciesResult.data?.length ?? null,
    users,
    products,
    salesLast30d,
    salesPrev30d,
    actionsLast30d,
    byStatus,
  };
}

function categoryStatus(checks: HealthCheck[]): HealthStatus {
  if (checks.some((check) => check.status === "error")) return "error";
  if (checks.some((check) => check.status === "warning")) return "warning";
  if (checks.every((check) => check.status === "unknown")) return "unknown";

  return "ok";
}

function integrityCheck(
  key: string,
  title: string,
  okDetail: string,
  badDetail: (n: number) => string,
  value: number | null | undefined,
  severity: "warning" | "error" = "warning"
): HealthCheck {
  if (value === null || value === undefined) {
    return {
      key,
      title,
      detail: "Non vérifiable pour le moment (mesure indisponible).",
      status: "unknown",
    };
  }

  return value === 0
    ? { key, title, detail: okDetail, status: "ok" }
    : { key, title, detail: badDetail(value), status: severity };
}

export async function GET() {
  try {
    const { supabaseAdmin } = await requirePlatformAdmin();

    // Latence réelle de la base : temps d'une requête simple.
    const started = performance.now();
    const ping = await supabaseAdmin
      .from("pharmacies")
      .select("id", { count: "exact", head: true });
    const latencyMs = Math.round(performance.now() - started);
    const dbReachable = !ping.error;

    const [rpcResult, platform] = await Promise.all([
      supabaseAdmin.rpc("admin_database_health"),
      loadPlatformStats(supabaseAdmin),
    ]);

    const db: DbHealth | null =
      rpcResult.error || !rpcResult.data ? null : (rpcResult.data as DbHealth);
    const databaseMetricsAvailable = db !== null;
    const missingMigration =
      "Mesure indisponible : exécutez supabase/migrations/0003_admin_health.sql.";

    // ---- Jauges de ressources -------------------------------------------
    let database: HealthGauge = unavailableGauge("Base de données", missingMigration);
    if (db && typeof db.db_size_bytes === "number") {
      const percent = Math.min(100, (db.db_size_bytes / DB_LIMIT_BYTES) * 100);

      database = {
        available: true,
        percent: Math.round(percent * 10) / 10,
        label: "Base de données",
        detail: `${formatBytes(db.db_size_bytes)} / ${formatBytes(DB_LIMIT_BYTES)}`,
        status: statusFromPercent(percent),
      };
    }

    let connections: HealthGauge = unavailableGauge("Connexions à la base", missingMigration);
    if (db && typeof db.connections_used === "number" && db.connections_max) {
      const percent = (db.connections_used / db.connections_max) * 100;

      connections = {
        available: true,
        percent: Math.round(percent * 10) / 10,
        label: "Connexions à la base",
        detail: `${db.connections_used} / ${db.connections_max}`,
        status: statusFromPercent(percent),
      };
    }

    // Mémoire de l'instance serveur qui répond (varie d'une instance à l'autre).
    const memoryLimitBytes = process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE
      ? Number(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE) * 1024 * 1024
      : os.totalmem();
    const rss = process.memoryUsage().rss;
    const memoryPercent = Math.min(100, (rss / memoryLimitBytes) * 100);
    const serverMemory: HealthGauge = {
      available: true,
      percent: Math.round(memoryPercent * 10) / 10,
      label: "Mémoire du serveur",
      detail: `${formatBytes(rss)} / ${formatBytes(memoryLimitBytes)}`,
      status: statusFromPercent(memoryPercent),
    };

    let cache: HealthGauge = unavailableGauge("Cache mémoire de la base", missingMigration);
    if (db && typeof db.cache_hit_ratio === "number") {
      const ratio = db.cache_hit_ratio;

      cache = {
        available: true,
        percent: ratio,
        label: "Cache mémoire de la base",
        detail: "Part des lectures servies depuis la mémoire (≥ 95 % = base bien dimensionnée).",
        status: ratio >= 95 ? "ok" : ratio >= 85 ? "warning" : "error",
      };
    }

    // ---- Contrôles par catégorie ----------------------------------------
    const since24h = new Date(Date.now() - 86_400_000).toISOString();
    const [failedLogins, adminCount] = await Promise.all([
      safeCount(
        supabaseAdmin
          .from("auth_events")
          .select("id", { count: "exact", head: true })
          .eq("success", false)
          .gte("created_at", since24h)
      ),
      safeCount(
        supabaseAdmin
          .from("platform_admins")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
      ),
    ]);

    const missingSecrets = ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter(
      (name) => !process.env[name]
    );

    const security: HealthCheck[] = [
      db?.tables_without_rls
        ? db.tables_without_rls.length === 0
          ? {
              key: "rls",
              title: "Accès public à la base fermé (RLS)",
              detail: "Toutes les tables sont protégées par row level security.",
              status: "ok",
            }
          : {
              key: "rls",
              title: "Tables sans protection RLS",
              detail: `${db.tables_without_rls.length} table(s) sans RLS : ${db.tables_without_rls.slice(0, 6).join(", ")}${db.tables_without_rls.length > 6 ? "…" : ""}`,
              status: "error",
            }
        : {
            key: "rls",
            title: "Accès public à la base fermé (RLS)",
            detail: missingMigration,
            status: "unknown",
          },
      failedLogins === null
        ? {
            key: "logins",
            title: "Tentatives de connexion suspectes",
            detail: "Journal des connexions non lisible.",
            status: "unknown",
          }
        : {
            key: "logins",
            title: "Tentatives de connexion suspectes",
            detail: `${failedLogins} échec(s) de connexion sur les dernières 24 h.`,
            status: failedLogins >= 25 ? "error" : failedLogins >= 10 ? "warning" : "ok",
          },
      {
        key: "secrets",
        title: "Secrets de sécurité configurés",
        detail:
          missingSecrets.length === 0
            ? "Clés Supabase présentes côté serveur."
            : `Variable(s) manquante(s) : ${missingSecrets.join(", ")}.`,
        status: missingSecrets.length === 0 ? "ok" : "error",
      },
      {
        key: "admins",
        title: "Comptes Super Admin",
        detail:
          adminCount === null
            ? "Nombre de comptes non lisible."
            : `${adminCount} compte(s) Super Admin actif(s). Gardez ce nombre minimal.`,
        status: adminCount === null ? "unknown" : adminCount === 0 ? "error" : adminCount > 3 ? "warning" : "ok",
      },
    ];

    const reliability: HealthCheck[] = [
      {
        key: "latency",
        title: "Temps de réponse de la base",
        detail: dbReachable ? `${latencyMs} ms` : "La base ne répond pas.",
        status: !dbReachable ? "error" : latencyMs > 1500 ? "error" : latencyMs > 500 ? "warning" : "ok",
      },
      {
        key: "disk",
        title: "Espace disque de la base",
        detail: database.available ? `${database.detail} (${database.percent} %)` : database.detail,
        status: database.status,
      },
      {
        key: "connections",
        title: "Connexions à la base",
        detail: connections.available
          ? `${connections.detail} ouvertes (${connections.percent} %)`
          : connections.detail,
        status: connections.status,
      },
      {
        key: "backups",
        title: "Sauvegardes de la base",
        detail:
          "Non vérifiable automatiquement : consultez Database > Backups dans le tableau de bord Supabase.",
        status: "unknown",
      },
    ];

    const integrity: HealthCheck[] = [
      integrityCheck(
        "negative-batches",
        "Lots à quantité négative",
        "Aucun lot avec une quantité disponible négative.",
        (n) => `${n} lot(s) avec une quantité disponible négative.`,
        db?.integrity_negative_batches,
        "error"
      ),
      integrityCheck(
        "sales-without-items",
        "Ventes sans lignes",
        "Toutes les ventes ont au moins une ligne.",
        (n) => `${n} vente(s) sans aucune ligne de produit.`,
        db?.integrity_sales_without_items
      ),
      integrityCheck(
        "orphan-items",
        "Lignes de vente orphelines",
        "Toutes les lignes sont rattachées à une vente.",
        (n) => `${n} ligne(s) de vente sans vente associée.`,
        db?.integrity_orphan_sale_items,
        "error"
      ),
      integrityCheck(
        "no-manager",
        "Pharmacies sans propriétaire/gérant actif",
        "Chaque pharmacie active a un propriétaire ou gérant actif.",
        (n) => `${n} pharmacie(s) active(s) sans propriétaire ni gérant actif.`,
        db?.integrity_pharmacies_without_manager
      ),
      integrityCheck(
        "no-settings",
        "Pharmacies sans configuration",
        "Chaque pharmacie a sa ligne de paramètres.",
        (n) => `${n} pharmacie(s) sans paramètres (corrigé à l'ouverture des Paramètres).`,
        db?.integrity_pharmacies_without_settings
      ),
      integrityCheck(
        "no-subscription",
        "Pharmacies sans abonnement",
        "Chaque pharmacie a un abonnement enregistré.",
        (n) => `${n} pharmacie(s) sans abonnement (considérées bloquées).`,
        db?.integrity_pharmacies_without_subscription,
        "error"
      ),
    ];

    const categories: HealthCategory[] = [
      {
        key: "security",
        title: "Sécurité",
        subtitle: "Accès, journal des connexions, secrets",
        status: categoryStatus(security),
        checks: security,
      },
      {
        key: "reliability",
        title: "Fiabilité",
        subtitle: "Base, ressources, sauvegardes",
        status: categoryStatus(reliability),
        checks: reliability,
      },
      {
        key: "integrity",
        title: "Intégrité des données",
        subtitle: "Cohérence des stocks, ventes et comptes",
        status: categoryStatus(integrity),
        checks: integrity,
      },
    ];

    // Score : 100 - 15 par erreur - 5 par avertissement ("unknown" ne pénalise pas).
    const all = categories.flatMap((category) => category.checks);
    const score = Math.max(
      0,
      100 -
        all.filter((c) => c.status === "error").length * 15 -
        all.filter((c) => c.status === "warning").length * 5
    );
    const level = score >= 95 ? "ok" : score >= 75 ? "watch" : "critical";

    const health: SystemHealth = {
      measuredAt: new Date().toISOString(),
      score,
      level,
      levelLabel:
        level === "ok"
          ? "Tout est en ordre"
          : level === "watch"
            ? "Quelques points à surveiller"
            : "Action requise",
      databaseMetricsAvailable,
      gauges: { database, connections, serverMemory, cache },
      categories,
      platform,
    };

    return NextResponse.json(health, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mesurer la santé de la plateforme.",
      },
      { status: getApiErrorStatus(error, 500) }
    );
  }
}
