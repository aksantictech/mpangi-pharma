"use client";

import { useSyncExternalStore } from "react";

const KEY = "mpangi.sidebar.hidden";
const EVENT = "mpangi:sidebar-hidden";

function read() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(EVENT, listener);
  };
}

/** Menu latéral masqué ou affiché (écran large), mémorisé sur l'appareil. */
export function useSidebarHidden() {
  const hidden = useSyncExternalStore(subscribe, read, () => false);

  function setHidden(value: boolean) {
    try {
      window.localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      // Stockage indisponible : le choix vaut pour cette session seulement.
    }

    window.dispatchEvent(new Event(EVENT));
  }

  return [hidden, setHidden] as const;
}
