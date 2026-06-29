import { createSupabaseClient } from "@/lib/supabase/client";
import type { AuditLog } from "@/types/audit";

export async function getAuditLogs(pharmacyId: string, limit = 100) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AuditLog[];
}