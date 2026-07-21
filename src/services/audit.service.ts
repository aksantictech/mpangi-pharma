"use client";

import { createSupabaseClient } from "@/lib/supabase/client";
import type {
  AuditActivity,
  AuditFilters,
  AuditMetrics,
  AuditPageResult,
  AuditPharmacyOption,
} from "@/types/audit";

export async function getAuditActivities(
  filters: AuditFilters
): Promise<AuditPageResult> {
  const supabase = createSupabaseClient();

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const { data, error } = await supabase.rpc("get_audit_activity", {
    p_pharmacy_id:
      filters.pharmacyId && filters.pharmacyId !== "all"
        ? filters.pharmacyId
        : null,
    p_event_type:
      filters.eventType && filters.eventType !== "all"
        ? filters.eventType
        : null,
    p_module_name:
      filters.moduleName && filters.moduleName !== "all"
        ? filters.moduleName
        : null,
    p_source:
      filters.source && filters.source !== "all"
        ? filters.source
        : null,
    p_severity:
      filters.severity && filters.severity !== "all"
        ? filters.severity
        : null,
    p_success:
      filters.success === "success"
        ? true
        : filters.success === "failed"
          ? false
          : null,
    p_start_date: filters.startDate
      ? `${filters.startDate}T00:00:00`
      : null,
    p_end_date: filters.endDate
      ? `${filters.endDate}T23:59:59.999`
      : null,
    p_search: filters.search?.trim() || null,
    p_limit: pageSize,
    p_offset: offset,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AuditActivity[];
  const count = Number(rows[0]?.total_count ?? 0);

  return {
    rows,
    count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

export async function getAuditPharmacies(): Promise<
  AuditPharmacyOption[]
> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pharmacies")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as AuditPharmacyOption[];
}

export function calculateAuditMetrics(
  rows: AuditActivity[]
): AuditMetrics {
  return {
    totalEvents: Number(rows[0]?.total_count ?? rows.length),
    successfulLogins: rows.filter(
      (row) => row.event_type === "login_success" && row.success
    ).length,
    failedLogins: rows.filter(
      (row) => row.event_type === "login_failed" || !row.success
    ).length,
    activeUsers: new Set(
      rows
        .map((row) => row.actor_user_id || row.actor_email)
        .filter(Boolean)
    ).size,
    activePharmacies: new Set(
      rows.map((row) => row.pharmacy_id).filter(Boolean)
    ).size,
  };
}

export function exportAuditCsv(rows: AuditActivity[]) {
  const headers = [
    "Date",
    "Pharmacie",
    "Utilisateur",
    "Événement",
    "Module",
    "Entité",
    "Description",
    "Gravité",
    "Succès",
    "Adresse IP",
    "Navigateur",
  ];

  const lines = rows.map((row) =>
    [
      row.created_at,
      row.pharmacy_name ?? "",
      row.actor_email ?? "",
      row.event_type,
      row.module_name,
      row.entity_label ?? row.entity_type,
      row.description ?? "",
      row.severity,
      row.success ? "Oui" : "Non",
      row.ip_address ?? "",
      row.user_agent ?? "",
    ]
      .map(csvCell)
      .join(";")
  );

  const blob = new Blob(
    ["\uFEFF", [headers.join(";"), ...lines].join("\n")],
    { type: "text/csv;charset=utf-8" }
  );

  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `audit-mpangi-pharma-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function getAuditLogs(
  pharmacyId?: string | null,
  limit = 100
): Promise<AuditActivity[]> {
  const result = await getAuditActivities({
    pharmacyId: pharmacyId || "all",
    page: 1,
    pageSize: Math.min(Math.max(limit, 1), 100),
  });

  return result.rows;
}