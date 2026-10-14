"use client";

import { useSyncExternalStore } from "react";

/*
 * Devise d'affichage de l'application.
 *
 * Tous les montants restent ENREGISTRÉS en CDF (prix, ventes, factures). Ce
 * module ne fait que les CONVERTIR À L'AFFICHAGE en USD ou EUR avec les taux de
 * la pharmacie (Paramètres > Ma pharmacie). Le choix est mémorisé sur
 * l'appareil. Les pages continuent d'appeler leur fonction formatMoney : elle
 * délègue ici, et s'abonne au changement via useDisplayCurrency().
 */

export type DisplayCurrency = "CDF" | "USD" | "EUR";

export const DISPLAY_CURRENCIES: DisplayCurrency[] = ["CDF", "USD", "EUR"];

type CurrencyState = {
  currency: DisplayCurrency;
  /** Nombre de CDF pour 1 USD (0 = inconnu). */
  usdRate: number;
  /** Nombre de CDF pour 1 EUR (0 = inconnu). */
  eurRate: number;
};

const CURRENCY_KEY = "mpangi_display_currency";
const RATES_KEY = "mpangi_display_rates";

const SERVER_STATE: CurrencyState = { currency: "CDF", usdRate: 0, eurRate: 0 };

let state: CurrencyState = SERVER_STATE;
let isInitialized = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function ensureInitialized() {
  if (isInitialized || typeof window === "undefined") return;

  isInitialized = true;

  try {
    const storedCurrency = window.localStorage.getItem(CURRENCY_KEY);
    const storedRates = JSON.parse(
      window.localStorage.getItem(RATES_KEY) || "{}"
    ) as { usd?: number; eur?: number };

    state = {
      currency: DISPLAY_CURRENCIES.includes(storedCurrency as DisplayCurrency)
        ? (storedCurrency as DisplayCurrency)
        : "CDF",
      usdRate: Number(storedRates.usd) > 0 ? Number(storedRates.usd) : 0,
      eurRate: Number(storedRates.eur) > 0 ? Number(storedRates.eur) : 0,
    };
  } catch {
    // Stockage indisponible : valeurs par défaut (CDF).
  }
}

function persist() {
  try {
    window.localStorage.setItem(CURRENCY_KEY, state.currency);
    window.localStorage.setItem(
      RATES_KEY,
      JSON.stringify({ usd: state.usdRate, eur: state.eurRate })
    );
  } catch {
    // Le choix vaut pour la session seulement.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureInitialized();

  return state;
}

function getServerSnapshot() {
  return SERVER_STATE;
}

/** Taux de la pharmacie active (appelé par DashboardShell une fois chargée). */
export function setExchangeRates(usdRate: number, eurRate?: number | null) {
  ensureInitialized();

  const usd = Number(usdRate) > 0 ? Number(usdRate) : 0;
  const eur = Number(eurRate) > 0 ? Number(eurRate) : 0;

  if (usd === state.usdRate && eur === state.eurRate) return;

  state = { ...state, usdRate: usd, eurRate: eur };

  // Une devise sans taux ne peut pas être affichée : retour au CDF.
  if (
    (state.currency === "USD" && !usd) ||
    (state.currency === "EUR" && !eur)
  ) {
    state = { ...state, currency: "CDF" };
  }

  persist();
  emit();
}

export function setDisplayCurrency(currency: DisplayCurrency) {
  ensureInitialized();

  if (currency === state.currency) return;
  if (currency === "USD" && !state.usdRate) return;
  if (currency === "EUR" && !state.eurRate) return;

  state = { ...state, currency };
  persist();
  emit();
}

/** Devise d'affichage + taux ; à appeler dans une page pour qu'elle se rafraîchisse au changement. */
export function useDisplayCurrency() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    currency: snapshot.currency,
    usdRate: snapshot.usdRate,
    eurRate: snapshot.eurRate,
  };
}

/** Convertit un montant CDF dans la devise d'affichage courante. */
export function convertFromCdf(amountCdf: number) {
  const current = getSnapshot();
  const amount = Number(amountCdf || 0);

  if (current.currency === "USD" && current.usdRate > 0) {
    return amount / current.usdRate;
  }

  if (current.currency === "EUR" && current.eurRate > 0) {
    return amount / current.eurRate;
  }

  return amount;
}

/** Devise réellement appliquée (CDF si le taux manque). */
export function getEffectiveCurrency(): DisplayCurrency {
  const current = getSnapshot();

  if (current.currency === "USD" && current.usdRate > 0) return "USD";
  if (current.currency === "EUR" && current.eurRate > 0) return "EUR";

  return "CDF";
}

/**
 * Formate un montant pour l'écran. `storedCurrency` est la devise dans laquelle
 * le montant est enregistré : seule une valeur en CDF est convertie, toute
 * autre devise est affichée telle quelle.
 */
export function formatDisplayMoney(
  amount: number,
  storedCurrency: string = "CDF",
  options: { maximumFractionDigits?: number } = {}
) {
  const value = Number(amount || 0);

  if (storedCurrency !== "CDF") {
    return `${value.toLocaleString("fr-CD", {
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
    })} ${storedCurrency}`;
  }

  const currency = getEffectiveCurrency();

  if (currency === "CDF") {
    return `${value.toLocaleString("fr-CD", {
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
    })} CDF`;
  }

  return `${convertFromCdf(value).toLocaleString("fr-CD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/** Phrase de rappel du taux utilisé, pour les documents imprimés. */
export function describeConversion() {
  const current = getSnapshot();
  const currency = getEffectiveCurrency();

  if (currency === "USD") {
    return `Montants convertis en USD au taux de 1 USD = ${current.usdRate.toLocaleString("fr-CD")} CDF.`;
  }

  if (currency === "EUR") {
    return `Montants convertis en EUR au taux de 1 EUR = ${current.eurRate.toLocaleString("fr-CD")} CDF.`;
  }

  return "";
}
