export type HealthStatus = "ok" | "warning" | "error" | "unknown";

export type HealthCheck = {
  key: string;
  title: string;
  detail: string;
  status: HealthStatus;
};

export type HealthGauge = {
  /** false = mesure indisponible (ex. migration SQL pas encore appliquée). */
  available: boolean;
  /** Pourcentage 0-100 (utilisation ou taux). */
  percent: number | null;
  label: string;
  detail: string;
  status: HealthStatus;
};

export type HealthCategory = {
  key: "security" | "reliability" | "integrity";
  title: string;
  subtitle: string;
  status: HealthStatus;
  checks: HealthCheck[];
};

export type PlatformStats = {
  pharmacies: number | null;
  users: number | null;
  products: number | null;
  salesLast30d: number | null;
  salesPrev30d: number | null;
  actionsLast30d: number | null;
  byStatus: {
    active: number;
    trial: number;
    expired: number;
    blocked: number;
    archived: number;
  };
};

export type SystemHealth = {
  measuredAt: string;
  score: number;
  level: "ok" | "watch" | "critical";
  levelLabel: string;
  /** false = fonction SQL admin_database_health() absente (migration 0003). */
  databaseMetricsAvailable: boolean;
  gauges: {
    database: HealthGauge;
    connections: HealthGauge;
    serverMemory: HealthGauge;
    cache: HealthGauge;
  };
  categories: HealthCategory[];
  platform: PlatformStats;
};
