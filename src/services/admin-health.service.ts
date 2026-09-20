import type { SystemHealth } from "@/types/health";

export async function getSystemHealth(): Promise<SystemHealth> {
  const response = await fetch("/api/admin/health", {
    method: "GET",
    cache: "no-store",
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || "Erreur de mesure de la santé.");
  }

  return result as SystemHealth;
}
