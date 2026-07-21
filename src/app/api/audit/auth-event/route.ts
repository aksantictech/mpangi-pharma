import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type Payload = {
  eventType:
    | "login_success"
    | "login_failed"
    | "logout"
    | "password_changed"
    | "password_reset_requested"
    | "password_reset_completed";
  email?: string;
  success?: boolean;
  failureReason?: string;
  pharmacyId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Payload;
    const supabase = await createSupabaseServerClient();

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const userAgent = request.headers.get("user-agent");

    const { error } = await supabase.rpc("log_auth_event", {
      p_event_type: payload.eventType,
      p_email: payload.email ?? null,
      p_success: payload.success ?? true,
      p_failure_reason: payload.failureReason ?? null,
      p_pharmacy_id: payload.pharmacyId ?? null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_device_type: detectDevice(userAgent),
      p_browser_name: detectBrowser(userAgent),
      p_operating_system: detectOs(userAgent),
      p_metadata: payload.metadata ?? {},
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer l’événement.",
      },
      { status: 500 }
    );
  }
}

function detectDevice(userAgent: string | null) {
  const value = (userAgent ?? "").toLowerCase();
  if (/tablet|ipad/.test(value)) return "tablet";
  if (/mobile|android|iphone/.test(value)) return "mobile";
  return "desktop";
}

function detectBrowser(userAgent: string | null) {
  const value = userAgent ?? "";
  if (/Edg\//.test(value)) return "Edge";
  if (/OPR\//.test(value)) return "Opera";
  if (/Chrome\//.test(value)) return "Chrome";
  if (/Firefox\//.test(value)) return "Firefox";
  if (/Safari\//.test(value)) return "Safari";
  return "Autre";
}

function detectOs(userAgent: string | null) {
  const value = userAgent ?? "";
  if (/Windows/.test(value)) return "Windows";
  if (/Android/.test(value)) return "Android";
  if (/iPhone|iPad|iOS/.test(value)) return "iOS";
  if (/Mac OS/.test(value)) return "macOS";
  if (/Linux/.test(value)) return "Linux";
  return "Autre";
}
