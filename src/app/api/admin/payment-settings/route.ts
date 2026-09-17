import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  ApiRequestError,
  assertSameOriginRequest,
  assertStringLength,
  getApiErrorStatus,
  readProtectedJson,
} from "@/lib/http/request-security";

import type { BankOption, MobileMoneyOption } from "@/types/subscription";

type PaymentSettingsBody = {
  mobileMoneyOptions: MobileMoneyOption[];
  bankOptions: BankOption[];
  cardInstructions?: string;
};

const MAX_OPTIONS = 10;

function sanitizeMobileMoneyOptions(input: unknown): MobileMoneyOption[] {
  if (!Array.isArray(input)) return [];

  return input.slice(0, MAX_OPTIONS).map((raw) => {
    const item = raw as Partial<MobileMoneyOption>;

    assertStringLength(item.provider, "Le fournisseur mobile money", 60);
    assertStringLength(item.number, "Le numéro mobile money", 40);
    assertStringLength(item.holderName, "Le nom du titulaire", 120);

    if (!item.provider?.trim() || !item.number?.trim()) {
      throw new ApiRequestError(
        "Chaque moyen mobile money doit avoir un fournisseur et un numéro."
      );
    }

    return {
      provider: item.provider.trim(),
      number: item.number.trim(),
      holderName: item.holderName?.trim() || undefined,
    };
  });
}

function sanitizeBankOptions(input: unknown): BankOption[] {
  if (!Array.isArray(input)) return [];

  return input.slice(0, MAX_OPTIONS).map((raw) => {
    const item = raw as Partial<BankOption>;

    assertStringLength(item.bankName, "Le nom de la banque", 120);
    assertStringLength(item.accountNumber, "Le numéro de compte", 60);
    assertStringLength(item.accountName, "Le titulaire du compte", 120);
    assertStringLength(item.notes, "Les notes", 300);

    if (!item.bankName?.trim() || !item.accountNumber?.trim()) {
      throw new ApiRequestError(
        "Chaque compte bancaire doit avoir une banque et un numéro de compte."
      );
    }

    return {
      bankName: item.bankName.trim(),
      accountNumber: item.accountNumber.trim(),
      accountName: item.accountName?.trim() || "",
      notes: item.notes?.trim() || undefined,
    };
  });
}

export async function GET() {
  try {
    const { supabaseAdmin } = await requirePlatformAdmin();

    const { data, error } = await supabaseAdmin
      .from("platform_payment_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      { settings: data },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les moyens de paiement.",
      },
      { status: getApiErrorStatus(error, 400) }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOriginRequest(request);
    const { user, supabaseAdmin } = await requirePlatformAdmin();

    const body = await readProtectedJson<PaymentSettingsBody>(request, {
      maxBytes: 32_768,
    });

    assertStringLength(body.cardInstructions, "Les instructions carte", 1000);

    const mobileMoneyOptions = sanitizeMobileMoneyOptions(
      body.mobileMoneyOptions
    );
    const bankOptions = sanitizeBankOptions(body.bankOptions);

    const { data: settings, error } = await supabaseAdmin
      .from("platform_payment_settings")
      .upsert(
        {
          id: "default",
          mobile_money_options: mobileMoneyOptions,
          bank_options: bankOptions,
          card_instructions: body.cardInstructions?.trim() || null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      settings,
      message: "Moyens de paiement mis à jour.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour les moyens de paiement.",
      },
      { status: getApiErrorStatus(error) }
    );
  }
}
