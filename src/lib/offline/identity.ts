"use client";

import type { PharmacyWithRole } from "@/types/pharmacy";

/*
 * Dernière identité connue de l'utilisateur (pharmacies et rôle, droit
 * Super Admin, nom affiché). Sans internet, le serveur ne peut pas répondre
 * « qui est connecté ? » : on s'appuie sur la dernière réponse obtenue en
 * ligne, enregistrée sur cet appareil. L'accès aux données reste celui de la
 * session déjà ouverte sur l'appareil ; il est vidé à la déconnexion.
 */

const IDENTITY_KEY = "mpangi_pharma_identity_cache";

export type CachedAccount = {
  userId: string;
  email: string;
  fullName: string | null;
  mustChangePassword: boolean;
};

type CachedIdentity = {
  userId?: string;
  pharmacies?: PharmacyWithRole[];
  isPlatformAdmin?: boolean;
  account?: CachedAccount;
  cachedAt?: string;
};

function read(): CachedIdentity {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(IDENTITY_KEY) || "{}");
  } catch {
    return {};
  }
}

function write(patch: CachedIdentity) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({ ...read(), ...patch, cachedAt: new Date().toISOString() })
    );
  } catch {
    // Stockage plein ou indisponible : on reste simplement sans copie.
  }
}

export function cacheUserPharmacies(userId: string, pharmacies: PharmacyWithRole[]) {
  write({ userId, pharmacies });
}

export function getCachedPharmacies(): PharmacyWithRole[] | null {
  const { pharmacies } = read();

  return pharmacies && pharmacies.length > 0 ? pharmacies : null;
}

export function cachePlatformAdmin(isPlatformAdmin: boolean) {
  write({ isPlatformAdmin });
}

export function getCachedPlatformAdmin() {
  return read().isPlatformAdmin ?? false;
}

export function cacheAccount(account: CachedAccount) {
  write({ userId: account.userId, account });
}

export function getCachedAccount(): CachedAccount | null {
  return read().account ?? null;
}

export function clearCachedIdentity() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(IDENTITY_KEY);
}
