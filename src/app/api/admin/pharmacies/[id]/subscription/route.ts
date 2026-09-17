import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  ApiRequestError,
  assertSameOriginRequest,
  assertStringLength,
  assertUuid,
  getApiErrorStatus,
  readProtectedJson,
} from "@/lib/http/request-security";

type SubscriptionAction = "grant" | "block" | "unblock";

type SubscriptionBody = {
  action: SubscriptionAction;
  /** 'grant' : durée en jours (préréglage 30/90/180/365 ou personnalisé). */
  durationDays?: number;
  /** 'grant' : libellé affiché à la pharmacie, ex. "3 mois". */
  planLabel?: string;
  /** 'block' : raison affichée à la pharmacie. */
  reason?: string;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const { user, supabaseAdmin } = await requirePlatformAdmin();

    const { id } = await params;

    assertUuid(id, "La pharmacie");

    const body = await readProtectedJson<SubscriptionBody>(request, {
      maxBytes: 8_192,
    });

    if (!["grant", "block", "unblock"].includes(body.action)) {
      throw new ApiRequestError("Action inconnue.");
    }

    assertStringLength(body.planLabel, "Le libellé du plan", 80);
    assertStringLength(body.reason, "La raison", 300);

    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from("pharmacies")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

    if (pharmacyError) {
      throw new Error(pharmacyError.message);
    }

    if (!pharmacy) {
      throw new ApiRequestError("Pharmacie introuvable.", 404);
    }

    const now = new Date();

    if (body.action === "grant") {
      if (
        !body.durationDays ||
        !Number.isFinite(body.durationDays) ||
        body.durationDays <= 0 ||
        body.durationDays > 3650
      ) {
        throw new ApiRequestError(
          "La durée de l’abonnement doit être un nombre de jours valide."
        );
      }

      const expiresAt = new Date(
        now.getTime() + body.durationDays * 24 * 60 * 60 * 1000
      );

      const { data: subscription, error: upsertError } = await supabaseAdmin
        .from("pharmacy_subscriptions")
        .upsert(
          {
            pharmacy_id: id,
            status: "active",
            plan_label: body.planLabel?.trim() || `${body.durationDays} jours`,
            expires_at: expiresAt.toISOString(),
            blocked_at: null,
            blocked_reason: null,
            updated_by: user.id,
            updated_at: now.toISOString(),
          },
          { onConflict: "pharmacy_id" }
        )
        .select("*")
        .single();

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      const { error: historyError } = await supabaseAdmin
        .from("subscription_payments")
        .insert({
          pharmacy_id: id,
          kind: "grant",
          status: "approved",
          period_days: body.durationDays,
          note: body.planLabel?.trim() || null,
          created_by: user.id,
          reviewed_by: user.id,
          reviewed_at: now.toISOString(),
        });

      if (historyError) {
        throw new Error(historyError.message);
      }

      return NextResponse.json({
        subscription,
        message: `Abonnement de « ${pharmacy.name} » activé jusqu’au ${expiresAt.toLocaleDateString("fr-CD")}.`,
      });
    }

    if (body.action === "block") {
      const { data: subscription, error: upsertError } = await supabaseAdmin
        .from("pharmacy_subscriptions")
        .upsert(
          {
            pharmacy_id: id,
            status: "blocked",
            blocked_at: now.toISOString(),
            blocked_reason: body.reason?.trim() || null,
            updated_by: user.id,
            updated_at: now.toISOString(),
          },
          { onConflict: "pharmacy_id" }
        )
        .select("*")
        .single();

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      return NextResponse.json({
        subscription,
        message: `Accès de « ${pharmacy.name} » bloqué.`,
      });
    }

    // unblock
    const { data: current, error: currentError } = await supabaseAdmin
      .from("pharmacy_subscriptions")
      .select("*")
      .eq("pharmacy_id", id)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    const stillValid =
      current?.expires_at && new Date(current.expires_at).getTime() > now.getTime();

    const { data: subscription, error: upsertError } = await supabaseAdmin
      .from("pharmacy_subscriptions")
      .upsert(
        {
          pharmacy_id: id,
          status: stillValid ? "active" : "expired",
          blocked_at: null,
          blocked_reason: null,
          updated_by: user.id,
          updated_at: now.toISOString(),
        },
        { onConflict: "pharmacy_id" }
      )
      .select("*")
      .single();

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    return NextResponse.json({
      subscription,
      message: `Accès de « ${pharmacy.name} » débloqué.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour l’abonnement.",
      },
      { status: getApiErrorStatus(error) }
    );
  }
}
