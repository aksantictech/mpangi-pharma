"use client";

import Link from "next/link";

import {
  DISPLAY_CURRENCIES,
  setDisplayCurrency,
  useDisplayCurrency,
  type DisplayCurrency,
} from "@/lib/currency";

/**
 * Bascule d'affichage CDF / USD / EUR. Les montants restent enregistrés en CDF ;
 * seul l'affichage est converti avec les taux de la pharmacie. Une devise dont
 * le taux n'est pas renseigné est grisée (le taux se règle dans Paramètres).
 */
export default function CurrencySwitcher({
  className = "",
  showHint = false,
}: {
  className?: string;
  /** Affiche une ligne d'aide quand un taux manque (menu mobile, caisse). */
  showHint?: boolean;
}) {
  const { currency, usdRate, eurRate } = useDisplayCurrency();

  const available: Record<DisplayCurrency, boolean> = {
    CDF: true,
    USD: usdRate > 0,
    EUR: eurRate > 0,
  };

  const missingRate = !available.USD || !available.EUR;

  return (
    <div className={className}>
      <div
        role="group"
        aria-label="Devise d’affichage"
        className="inline-flex rounded-2xl border border-slate-200 bg-white p-1"
      >
        {DISPLAY_CURRENCIES.map((item) => {
          const isActive = item === currency;

          return (
            <button
              key={item}
              type="button"
              disabled={!available[item]}
              aria-pressed={isActive}
              title={
                available[item]
                  ? `Afficher les montants en ${item}`
                  : `Taux ${item} non renseigné (Paramètres > Ma pharmacie)`
              }
              onClick={() => setDisplayCurrency(item)}
              className={`min-h-9 min-w-12 rounded-xl px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isActive
                  ? "bg-blue-700 text-white shadow"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {showHint && missingRate && (
        <p className="mt-1.5 text-xs text-slate-500">
          Renseignez les taux dans{" "}
          <Link
            href="/parametres/general"
            className="font-black text-blue-700 underline"
          >
            Paramètres
          </Link>{" "}
          pour activer USD et EUR.
        </p>
      )}
    </div>
  );
}
