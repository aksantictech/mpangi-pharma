"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
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

type PharmacyOpeningStatusBadgeProps = {
  pharmacyId: string;
  canManage?: boolean;
};

/**
 * Version compacte de PharmacyOpeningStatusControl : une petite pastille
 * (état actuel) qui ouvre un menu déroulant avec les 3 modes
 * Auto/Ouverte/Fermée. Pensée pour vivre dans une topbar, à côté du titre
 * de page, plutôt que d'occuper tout un bloc dans la sidebar.
 */
export default function PharmacyOpeningStatusBadge({
  pharmacyId,
  canManage = true,
}: PharmacyOpeningStatusBadgeProps) {
  const [status, setStatus] = useState<PharmacyOpeningStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const result = await getPharmacyOpeningStatus(pharmacyId);
        if (isMounted) setStatus(result);
      } catch {
        // Silencieux : pas de pastille plutôt que de bloquer la topbar.
      }
    }

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, [pharmacyId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleModeChange(mode: PharmacyOpeningMode) {
    if (!canManage || isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      const result = await setPharmacyOpeningMode(pharmacyId, mode);
      setStatus(result);

      window.dispatchEvent(
        new CustomEvent("mpangi-pharmacy-opening-status-updated", {
          detail: result,
        })
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible de modifier le statut."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!status) return null;

  const isOpenNow = status.is_open_now;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${
          isOpenNow
            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
            : "border-red-100 bg-red-50 text-red-700"
        }`}
      >
        {isOpenNow ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        {isOpenNow ? "Ouverte" : "Fermée"}
        {canManage && <ChevronDown className="h-3 w-3" />}
      </button>

      {isOpen && canManage && (
        <div className="absolute left-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Statut d’ouverture
            </p>
            {isSaving && (
              <RefreshCcw className="h-3.5 w-3.5 animate-spin text-slate-400" />
            )}
          </div>

          <div className="space-y-1.5">
            <BadgeOption
              label="Automatique"
              description="Selon les horaires configurés"
              icon={<Clock3 className="h-4 w-4" />}
              active={status.opening_mode === "automatic"}
              disabled={isSaving}
              onClick={() => handleModeChange("automatic")}
            />
            <BadgeOption
              label="Forcer ouverte"
              description="Ouverture forcée manuellement"
              icon={<Store className="h-4 w-4" />}
              active={status.opening_mode === "forced_open"}
              disabled={isSaving}
              tone="success"
              onClick={() => handleModeChange("forced_open")}
            />
            <BadgeOption
              label="Forcer fermée"
              description="Fermeture forcée manuellement"
              icon={<LockKeyhole className="h-4 w-4" />}
              active={status.opening_mode === "forced_closed"}
              disabled={isSaving}
              tone="danger"
              onClick={() => handleModeChange("forced_closed")}
            />
          </div>

          {errorMessage && (
            <p className="mt-2 px-1 text-xs font-bold text-red-700">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BadgeOption({
  label,
  description,
  icon,
  active,
  disabled,
  tone = "default",
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
  disabled: boolean;
  tone?: "default" | "success" | "danger";
  onClick: () => void;
}) {
  const activeClass = {
    default: "border-blue-700 bg-blue-50 text-blue-700",
    success: "border-emerald-600 bg-emerald-50 text-emerald-700",
    danger: "border-red-600 bg-red-50 text-red-700",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left ${
        active ? activeClass : "border-transparent text-slate-600 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {icon}
      <span>
        <span className="block text-xs font-black">{label}</span>
        <span className="block text-[11px] font-medium text-slate-400">
          {description}
        </span>
      </span>
    </button>
  );
}
