"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import { createScanDetector } from "@/lib/barcode";

const SETTING_KEY = "mpangi.sales.scanToCart";
const SETTING_EVENT = "mpangi:scan-to-cart";

function readSetting() {
  try {
    return window.localStorage.getItem(SETTING_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribeSetting(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(SETTING_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(SETTING_EVENT, listener);
  };
}

/**
 * Option « un scan ajoute directement au panier » (activée par défaut),
 * mémorisée sur cet appareil.
 */
export function useScanToCartSetting() {
  const enabled = useSyncExternalStore(subscribeSetting, readSetting, () => true);

  function setEnabled(value: boolean) {
    try {
      window.localStorage.setItem(SETTING_KEY, value ? "on" : "off");
    } catch {
      // Stockage indisponible : le réglage ne sera pas mémorisé.
    }

    window.dispatchEvent(new Event(SETTING_EVENT));
  }

  return [enabled, setEnabled] as const;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

/**
 * Écoute le lecteur de code-barres sur toute la page, même quand aucun champ
 * n'a le focus. Un champ de saisie qui a le focus garde ses touches (le champ
 * de recherche de la caisse traite lui-même l'Entrée du lecteur).
 */
export function useBarcodeScanner(
  onScan: (code: string) => void,
  enabled: boolean
) {
  const handlerRef = useRef(onScan);

  useEffect(() => {
    handlerRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const detector = createScanDetector();

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (isTypingTarget(event.target)) {
        detector.reset();
        return;
      }

      const code = detector.feed(event.key, event.timeStamp);

      if (code) {
        // Sans cela, l'Entrée du lecteur « cliquerait » le bouton qui a le
        // focus (par exemple Encaisser).
        event.preventDefault();
        event.stopPropagation();
        handlerRef.current(code);
      }
    }

    window.addEventListener("keydown", onKeyDown, true);

    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);
}
