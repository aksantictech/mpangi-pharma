"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "mpangi_theme";
const THEME_EVENT = "mpangi-theme-change";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);

  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Stockage indisponible : le choix vaut pour cette session seulement.
  }

  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Bouton clair / sombre. Le thème vit sur <html data-theme> (voir layout.tsx).
 * `row` : ligne pleine largeur avec libellé (menu mobile) ; `icon` : bouton
 * rond d'en-tête.
 */
export default function ThemeToggle({
  variant = "icon",
  className = "",
}: {
  variant?: "icon" | "row";
  className?: string;
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";
  const label = isDark ? "Passer en mode clair" : "Passer en mode sombre";
  const Icon = isDark ? Sun : Moon;

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={() => applyTheme(isDark ? "light" : "dark")}
        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 ${className}`}
      >
        <Icon className="h-5 w-5" />
        {isDark ? "Mode clair" : "Mode sombre"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={isDark ? "Mode clair" : "Mode sombre"}
      className={`h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ${
        className || "inline-flex"
      }`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
