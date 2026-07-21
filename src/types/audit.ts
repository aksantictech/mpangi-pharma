export type AuditSeverity = "info" | "warning" | "critical";
export type AuditSource = "audit" | "auth";

export type AuditActivity = {
  id: string;
  pharmacy_id: string | null;
  pharmacy_name: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  event_type: string;
  module_name: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  description: string | null;
  severity: AuditSeverity;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: string;
  source: AuditSource;
  total_count?: number;
};

export type AuditFilters = {
  pharmacyId?: string;
  eventType?: string;
  moduleName?: string;
  source?: string;
  severity?: string;
  success?: "all" | "success" | "failed";
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AuditPageResult = {
  rows: AuditActivity[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AuditMetrics = {
  totalEvents: number;
  successfulLogins: number;
  failedLogins: number;
  activeUsers: number;
  activePharmacies: number;
};

export type AuditPharmacyOption = {
  id: string;
  name: string;
};
