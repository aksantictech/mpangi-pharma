"use client";

import { useSyncExternalStore } from "react";

/*
 * État de la connexion AU SERVEUR (pas seulement au Wi-Fi).
 *
 * navigator.onLine dit si l'appareil est branché à un réseau, pas si internet
 * répond : à l'hôpital, la panne typique est « le Wi-Fi marche mais internet
 * est coupé ». On suit donc le résultat réel des requêtes vers Supabase
 * (voir network.ts) et, pendant une panne, on sonde le serveur régulièrement
 * pour détecter le retour de la connexion.
 */

export const RECONNECTED_EVENT = "mpangi-reconnected";
export const CONNECTIVITY_EVENT = "mpangi-connectivity-change";

type ConnectivityState = {
  /** Le serveur répond (ou on ne sait pas encore : on suppose que oui). */
  reachable: boolean;
};

const SERVER_STATE: ConnectivityState = { reachable: true };

let state: ConnectivityState = SERVER_STATE;
let heartbeatTimer: number | undefined;
const listeners = new Set<() => void>();

const HEARTBEAT_MS = 8000;
const HEARTBEAT_TIMEOUT_MS = 6000;

function emit() {
  listeners.forEach((listener) => listener());

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONNECTIVITY_EVENT));
  }
}

async function probeServer() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!baseUrl) return false;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);

  try {
    // fetch natif (pas le client Supabase) : une réponse HTTP, même 401,
    // prouve que le serveur est joignable.
    await fetch(`${baseUrl}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      cache: "no-store",
      signal: controller.signal,
    });

    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

function stopHeartbeat() {
  if (heartbeatTimer !== undefined) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }
}

async function heartbeat() {
  if (state.reachable) {
    stopHeartbeat();
    return;
  }

  if (await probeServer()) {
    reportReachable(true);
  }
}

function startHeartbeat() {
  if (typeof window === "undefined" || heartbeatTimer !== undefined) return;

  heartbeatTimer = window.setInterval(() => {
    void heartbeat();
  }, HEARTBEAT_MS);
}

/** Appelé avec le résultat de chaque requête vers le serveur. */
export function reportReachable(reachable: boolean) {
  if (state.reachable === reachable) return;

  const wasUnreachable = !state.reachable;

  state = { reachable };
  emit();

  if (!reachable) {
    startHeartbeat();
    return;
  }

  stopHeartbeat();

  if (wasUnreachable && typeof window !== "undefined") {
    window.dispatchEvent(new Event(RECONNECTED_EVENT));
  }
}

/** Sonde immédiatement le serveur (ex. quand le navigateur annonce le retour du réseau). */
export async function recheckConnection() {
  if (typeof window === "undefined") return state.reachable;

  const ok = await probeServer();

  reportReachable(ok);

  return ok;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void recheckConnection();
  });

  window.addEventListener("offline", () => {
    reportReachable(false);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return SERVER_STATE;
}

/** Vrai quand l'application peut joindre le serveur ; faux en panne internet. */
export function isServerReachable() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }

  return state.reachable;
}

export function useConnectivity() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return { online: snapshot.reachable };
}
