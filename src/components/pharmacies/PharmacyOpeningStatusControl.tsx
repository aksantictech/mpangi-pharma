"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LockKeyhole,
  RefreshCcw,
  Store,
  XCircle,
} from "lucide-react";

import {
  getPharmacyOpeningStatus,
  setPharmacyOpeningMode,
  type PharmacyOpeningMode,
  type PharmacyOpeningStatus,
} from "@/services/pharmacy-opening-status.service";

type PharmacyOpeningStatusControlProps = {
  pharmacyId: string;
  canManage?: boolean;
  compact?: boolean;
  /** Empile les 3 boutons Auto/Ouverte/Fermée en colonne au lieu d'une
   * grille à 3 colonnes (utile dans une sidebar étroite). */
  stackButtons?: boolean;
};

export default function PharmacyOpeningStatusControl({
  pharmacyId,
  canManage = true,
  compact = false,
  stackButtons = false,
}: PharmacyOpeningStatusControlProps) {
  const [status, setStatus] =
    useState<PharmacyOpeningStatus | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result =
          await getPharmacyOpeningStatus(pharmacyId);

        if (isMounted) {
          setStatus(result);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Impossible de charger le statut."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, [pharmacyId]);

  async function handleModeChange(
    mode: PharmacyOpeningMode
  ) {
    if (!canManage || isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      const result =
        await setPharmacyOpeningMode(
          pharmacyId,
          mode
        );

      setStatus(result);

      window.dispatchEvent(
        new CustomEvent(
          "mpangi-pharmacy-opening-status-updated",
          {
            detail: result,
          }
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="h-4 w-32 rounded bg-slate-200" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-700">
        {errorMessage || "Statut indisponible."}
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border p-3 ${
        status.is_open_now
          ? "border-emerald-100 bg-emerald-50"
          : "border-red-100 bg-red-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white ${
              status.is_open_now
                ? "text-emerald-600"
                : "text-red-600"
            }`}
          >
            {status.is_open_now ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <p
              className={`text-sm font-black ${
                status.is_open_now
                  ? "text-emerald-800"
                  : "text-red-800"
              }`}
            >
              Pharmacie{" "}
              {status.is_open_now
                ? "ouverte"
                : "fermée"}
            </p>

            {!compact && (
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {formatOpeningMode(
                  status.opening_mode
                )}
              </p>
            )}
          </div>
        </div>

        {isSaving && (
          <RefreshCcw className="h-4 w-4 animate-spin text-slate-500" />
        )}
      </div>

      {canManage ? (
        <div
          className={
            stackButtons
              ? "mt-3 flex flex-col gap-2"
              : "mt-3 grid grid-cols-3 gap-2"
          }
        >
          <StatusButton
            label="Auto"
            icon={<Clock3 className="h-4 w-4" />}
            active={
              status.opening_mode === "automatic"
            }
            disabled={isSaving}
            stacked={stackButtons}
            onClick={() =>
              handleModeChange("automatic")
            }
          />

          <StatusButton
            label="Ouverte"
            icon={<Store className="h-4 w-4" />}
            active={
              status.opening_mode === "forced_open"
            }
            disabled={isSaving}
            tone="success"
            stacked={stackButtons}
            onClick={() =>
              handleModeChange("forced_open")
            }
          />

          <StatusButton
            label="Fermée"
            icon={<LockKeyhole className="h-4 w-4" />}
            active={
              status.opening_mode === "forced_closed"
            }
            disabled={isSaving}
            tone="danger"
            stacked={stackButtons}
            onClick={() =>
              handleModeChange("forced_closed")
            }
          />
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Seuls le propriétaire, le gérant ou le
          pharmacien peuvent modifier ce statut.
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 text-xs font-bold text-red-700">
          {errorMessage}
        </p>
      )}
    </section>
  );
}

function StatusButton({
  label,
  icon,
  active,
  disabled,
  tone = "default",
  stacked = false,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  disabled: boolean;
  tone?: "default" | "success" | "danger";
  stacked?: boolean;
  onClick: () => void;
}) {
  const activeClass = {
    default:
      "border-blue-700 bg-blue-700 text-white",
    success:
      "border-emerald-600 bg-emerald-600 text-white",
    danger:
      "border-red-600 bg-red-600 text-white",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center rounded-xl border text-[10px] font-black ${
        stacked
          ? "w-full justify-start gap-2 px-3 py-2.5 text-xs"
          : "flex-col justify-center gap-1 px-2 py-2"
      } ${
        active
          ? activeClass
          : "border-slate-200 bg-white text-slate-600"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatOpeningMode(
  mode: PharmacyOpeningMode
) {
  const labels: Record<
    PharmacyOpeningMode,
    string
  > = {
    automatic: "Selon les horaires configurés",
    forced_open: "Ouverture forcée manuellement",
    forced_closed: "Fermeture forcée manuellement",
  };

  return labels[mode];
}