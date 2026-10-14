"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

type ToastKind = "success" | "error";

type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

// Durées d'affichage : une erreur reste plus longtemps, il faut le temps de la lire.
const DURATION: Record<ToastKind, number> = { success: 4500, error: 8000 };
const MAX_VISIBLE = 4;

/**
 * Notifications éphémères (succès / erreur) affichées en bas de l'écran, au
 * lieu de bandeaux qui s'insèrent en haut de page et décalent le contenu.
 * Chaque notification disparaît seule ou se ferme d'un geste.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const text = message.trim();

      if (!text) return;

      const id = nextId.current++;

      setToasts((current) => [...current, { id, kind, message: text }].slice(-MAX_VISIBLE));
      window.setTimeout(() => dismiss(id), DURATION[kind]);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[110] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-6 sm:w-96 xl:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white shadow-2xl motion-safe:animate-[toast-in_0.2s_ease-out]"
          >
            {toast.kind === "error" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            )}

            <p className="min-w-0 flex-1 text-sm font-semibold leading-5">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Fermer la notification"
              className="-mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Accès aux notifications. Hors ToastProvider (pages de la console admin), les
 * appels sont sans effet : les pages qui y vivent gardent leurs bandeaux.
 */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP_TOAST;
}

const NOOP_TOAST: ToastApi = { success: () => {}, error: () => {} };

/**
 * Remplace `const [successMessage, setSuccessMessage] = useState("")` : le
 * setter garde la même forme (chaîne vide = rien, sinon notification), ce qui
 * évite de réécrire chaque page.
 */
export function useSuccessToast() {
  const toast = useToast();

  return useCallback(
    (message: string) => {
      if (message) toast.success(message);
    },
    [toast]
  );
}
