"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  Boxes,
  Building2,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  LineChart,
  Menu,
  UploadCloud,
  MoreHorizontal,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserCircle,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";

import AppLogo from "@/components/branding/AppLogo";
import PharmacyOpeningStatusControl from "@/components/pharmacies/PharmacyOpeningStatusControl";
import OfflineStatusBar from "@/components/offline/OfflineStatusBar";
import NotificationsBell from "@/components/layout/NotificationsBell";
import ProfileMenu from "@/components/layout/ProfileMenu";
import {
  canAccessModule,
  canAccessPath,
  type AppModule,
} from "@/lib/permissions";
import {
  bindOfflineDataToUser,
  clearOfflinePharmacyData,
} from "@/lib/offline/db";
import { getActiveHref } from "@/lib/nav-active";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  getCurrentUserAccount,
  mustCurrentUserChangePassword,
} from "@/services/account.service";
import { getExpirationAlertsList } from "@/services/expirations.service";
import {
  clearStoredActivePharmacyId,
  getCurrentPharmacy,
  getMyPharmacies,
  isCurrentUserPlatformAdmin,
  setActivePharmacy,
} from "@/services/pharmacies.service";
import { getPharmacySubscription } from "@/services/subscriptions.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import {
  getSubscriptionDaysRemaining,
  isSubscriptionBlocking,
  type PharmacySubscription,
} from "@/types/subscription";

type NavigationItem = {
  label: string;
  href: string;
  module: AppModule;
  icon: LucideIcon;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Tableau de bord",
    href: "/dashboard",
    module: "dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Pharmacies",
    href: "/pharmacies",
    module: "pharmacies",
    icon: Building2,
  },
  {
    label: "Produits",
    href: "/produits",
    module: "produits",
    icon: Package,
  },
  {
    label: "Stock",
    href: "/stock",
    module: "stock",
    icon: Boxes,
  },
  {
    label: "Ventes",
    href: "/ventes",
    module: "ventes",
    icon: ShoppingCart,
  },
  {
    label: "Factures",
    href: "/factures",
    module: "factures",
    icon: FileText,
  },
  {
    label: "Stock voisin",
    href: "/stock-voisin",
    module: "stock",
    icon: Warehouse,
  },

  {
    label: "Synchronisation",
    href: "/synchronisation",
    module: "synchronisation",
    icon: UploadCloud,
  },
  {
    label: "Expirations",
    href: "/expirations",
    module: "expirations",
    icon: Bell,
  },
  {
    label: "Finances",
    href: "/finances",
    module: "finances",
    icon: LineChart,
  },
  {
  label: "Rapport TVA",
  href: "/finances/tva",
  module: "finances",
  icon: ReceiptText,
},
  {
    label: "Paramètres",
    href: "/parametres",
    module: "parametres",
    icon: Settings,
  },
  {
    label: "Abonnement",
    href: "/abonnement",
    module: "abonnement",
    icon: CreditCard,
  },
  {
    label: "Mon compte",
    href: "/compte",
    module: "compte",
    icon: UserCircle,
  },
];

const mobileMainHrefs = ["/dashboard", "/produits", "/ventes", "/stock-voisin"];

function canStayWithoutActivePharmacy(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/compte" ||
    pathname.startsWith("/compte/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

// Une pharmacie bloquée/expirée ne doit plus pouvoir utiliser la
// plateforme, mais son propriétaire/gérant doit toujours pouvoir voir
// pourquoi et payer : seules /abonnement et /compte restent accessibles.
function canStayWhenSubscriptionBlocked(pathname: string) {
  return (
    pathname === "/abonnement" ||
    pathname.startsWith("/abonnement/") ||
    pathname === "/compte" ||
    pathname.startsWith("/compte/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

function isNetworkError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  );
}

function canManageOpeningStatus(role?: string | null) {
  return role === "owner" || role === "manager" || role === "pharmacist";
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [pharmacies, setPharmacies] = useState<PharmacyWithRole[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [accessWarning, setAccessWarning] = useState("");
  const [isCompactMode, setIsCompactMode] = useState(true);

  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [alerts, setAlerts] = useState<string[]>([]);

  const [subscription, setSubscription] = useState<PharmacySubscription | null>(
    null
  );
  const [isSubscriptionLoaded, setIsSubscriptionLoaded] = useState(false);

  const visibleNavigationItems = navigationItems.filter((item) =>
    canAccessModule(pharmacy?.role, item.module, isPlatformAdmin)
  );

  const mobileMainNavigationItems = visibleNavigationItems.filter((item) =>
    mobileMainHrefs.includes(item.href)
  );

  const mobileMoreNavigationItems = visibleNavigationItems.filter(
    (item) => !mobileMainHrefs.includes(item.href)
  );

  const activeHref = getActiveHref(
    pathname,
    visibleNavigationItems.map((item) => item.href)
  );

  const pageTitle =
    visibleNavigationItems.find((item) => item.href === activeHref)?.label ??
    "Mpangi_Pharma";

  const isOnDashboard = pathname === "/dashboard";

  const subscriptionBlocked =
    isSubscriptionLoaded && !isPlatformAdmin && isSubscriptionBlocking(subscription);

  const subscriptionDaysRemaining = getSubscriptionDaysRemaining(subscription);

  const subscriptionWarning = (() => {
    if (subscriptionBlocked) {
      if (subscription?.status === "blocked") {
        return "Abonnement bloqué : accès limité à la page Abonnement. Contactez Aksantic Technology.";
      }

      return "Abonnement expiré : accès limité à la page Abonnement pour régulariser.";
    }

    // Avertissement discret avant blocage, pour laisser le temps de payer.
    if (
      isSubscriptionLoaded &&
      subscriptionDaysRemaining !== null &&
      subscriptionDaysRemaining <= 7 &&
      subscriptionDaysRemaining >= 0
    ) {
      return `Abonnement : ${subscriptionDaysRemaining} jour${
        subscriptionDaysRemaining > 1 ? "s" : ""
      } restant${subscriptionDaysRemaining > 1 ? "s" : ""}. Pensez à renouveler.`;
    }

    return "";
  })();

  useEffect(() => {
    function updateCompactMode() {
      const isSmallScreen = window.matchMedia("(max-width: 1279px)").matches;
      const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

      setIsCompactMode(isSmallScreen || isTouchDevice);
    }

    updateCompactMode();

    window.addEventListener("resize", updateCompactMode);
    window.addEventListener("orientationchange", updateCompactMode);

    return () => {
      window.removeEventListener("resize", updateCompactMode);
      window.removeEventListener("orientationchange", updateCompactMode);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function verifyAccess() {
      try {
        const [pharmaciesResult, currentPharmacyResult, platformAdminResult] =
          await Promise.allSettled([
            getMyPharmacies(),
            getCurrentPharmacy(),
            isCurrentUserPlatformAdmin(),
          ]);

        if (!isMounted) return;

        // Le statut Super Admin est résolu indépendamment des pharmacies :
        // une erreur sur les pharmacies d'un compte ne doit jamais lui faire
        // perdre son accès à l'espace Super Admin.
        const platformAdminStatus =
          platformAdminResult.status === "fulfilled"
            ? platformAdminResult.value
            : false;

        setIsPlatformAdmin(platformAdminStatus);

        const hasNetworkError =
          (pharmaciesResult.status === "rejected" &&
            isNetworkError(pharmaciesResult.reason)) ||
          (currentPharmacyResult.status === "rejected" &&
            isNetworkError(currentPharmacyResult.reason)) ||
          (platformAdminResult.status === "rejected" &&
            isNetworkError(platformAdminResult.reason));

        if (hasNetworkError) {
          setAccessWarning(
            "Connexion instable avec le serveur. Vérifiez Internet puis actualisez."
          );
          return;
        }

        if (pharmaciesResult.status === "rejected") {
          setAccessWarning(
            platformAdminStatus
              ? "Impossible de charger vos pharmacies. Utilisez « Super Admin » pour gérer la plateforme."
              : getErrorMessage(pharmaciesResult.reason) ||
                  "Impossible de vérifier vos pharmacies."
          );
          return;
        }

        const myPharmacies = pharmaciesResult.value;

        const currentPharmacy =
          currentPharmacyResult.status === "fulfilled"
            ? currentPharmacyResult.value
            : myPharmacies[0] ?? null;

        setPharmacies(myPharmacies);
        setPharmacy(currentPharmacy);
        setIsPlatformAdmin(platformAdminStatus);

        if (!platformAdminStatus && myPharmacies.length === 0) {
          clearStoredActivePharmacyId();

          setAccessWarning(
            "Aucune pharmacie active n’est liée à votre compte. Contactez le propriétaire ou le gérant."
          );

          if (!canStayWithoutActivePharmacy(pathname)) {
            router.replace("/dashboard");
          }

          return;
        }

        setAccessWarning("");

        if (currentPharmacy) {
          const isAllowed = canAccessPath(
            currentPharmacy.role,
            pathname,
            platformAdminStatus
          );

          if (!isAllowed) {
            router.replace("/dashboard");
          }
        }
      } catch {
        if (!isMounted) return;

        setAccessWarning(
          "Connexion instable avec le serveur. Vérifiez Internet puis actualisez."
        );
      }
    }

    verifyAccess();

    const intervalId = window.setInterval(() => {
      verifyAccess();
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [pathname, router]);

  useEffect(() => {
    let isMounted = true;

    async function protectOfflineData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isMounted && user) {
        await bindOfflineDataToUser(user.id);
      }
    }

    void protectOfflineData();

    return () => {
      isMounted = false;
    };
    // Le client Supabase est recréé par le composant ; l'identité utilisateur
    // ne doit être vérifiée qu'au montage de la session du tableau de bord.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      try {
        const account = await getCurrentUserAccount();

        if (!isMounted) return;

        setAccountName(account.fullName || "");
        setAccountEmail(account.email);
      } catch {
        // L'en-tête reste sobre si le profil ne charge pas.
      }
    }

    void loadAccount();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAlerts() {
      if (!pharmacy) {
        if (isMounted) setAlerts([]);
        return;
      }

      try {
        const expirations = await getExpirationAlertsList(pharmacy.id);

        if (!isMounted) return;

        const critical = expirations.filter(
          (item) => item.expiration_status === "expired"
        ).length;
        const soon = expirations.length - critical;

        const nextAlerts: string[] = [];

        if (critical > 0) {
          nextAlerts.push(
            `${critical} lot${critical > 1 ? "s" : ""} expiré${critical > 1 ? "s" : ""}`
          );
        }

        if (soon > 0) {
          nextAlerts.push(
            `${soon} lot${soon > 1 ? "s" : ""} proche${soon > 1 ? "s" : ""} de l’expiration`
          );
        }

        setAlerts(nextAlerts);
      } catch {
        // Silencieux : la cloche reste vide plutôt que de bloquer l'affichage.
      }
    }

    void loadAlerts();

    return () => {
      isMounted = false;
    };
  }, [pharmacy]);

  useEffect(() => {
    let isMounted = true;

    async function loadSubscription() {
      if (!pharmacy) {
        if (isMounted) {
          setSubscription(null);
          setIsSubscriptionLoaded(false);
        }
        return;
      }

      try {
        const result = await getPharmacySubscription(pharmacy.id);

        if (!isMounted) return;

        setSubscription(result);
        // isSubscriptionLoaded ne passe à true qu'après une lecture
        // réussie : une erreur réseau ne doit jamais se traduire par un
        // blocage (isSubscriptionBlocking(null) vaut true par défaut).
        setIsSubscriptionLoaded(true);
      } catch {
        // Silencieux : on ne bloque pas l'interface sur une erreur réseau
        // transitoire.
      }
    }

    void loadSubscription();

    return () => {
      isMounted = false;
    };
  }, [pharmacy]);

  useEffect(() => {
    if (!subscriptionBlocked) return;
    if (canStayWhenSubscriptionBlocked(pathname)) return;

    router.replace("/abonnement");
  }, [subscriptionBlocked, pathname, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function enforcePasswordChange() {
      try {
        if (pathname === "/compte") return;

        const mustChangePassword = await mustCurrentUserChangePassword();

        if (isMounted && mustChangePassword) {
          router.replace("/compte?motDePasseTemporaire=1");
        }
      } catch {
        // Si Supabase est momentanément inaccessible, on ne bloque pas l’interface.
      }
    }

    enforcePasswordChange();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  async function handlePharmacyChange(pharmacyId: string) {
    try {
      await setActivePharmacy(pharmacyId);

      setIsMobileMenuOpen(false);

      window.location.href = pathname;
    } catch {
      // On garde l’ancienne pharmacie active en cas d’erreur.
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);

    clearStoredActivePharmacyId();

    try {
      await clearOfflinePharmacyData();
      await supabase.auth.signOut();
    } finally {
      router.push("/connexion");
      router.refresh();
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {!isCompactMode && (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white">
          {pharmacy && (
            <div className="border-b border-slate-100 px-4 py-4">
              <PharmacyOpeningStatusControl
                pharmacyId={pharmacy.id}
                canManage={canManageOpeningStatus(pharmacy.role)}
                stackButtons
              />
            </div>
          )}

          <div className="border-b border-slate-100 p-4">
            {pharmacies.length > 1 ? (
              <select
                value={pharmacy?.id || ""}
                onChange={(event) => handlePharmacyChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-950 outline-none focus:border-blue-500"
              >
                {pharmacies.map((item) => (
                  <option key={`desktop-pharmacy-${item.id}`} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {pharmacy?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pharmacy.logo_url}
                      alt={`Logo ${pharmacy.name}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-slate-300" />
                  )}
                </div>

                <p className="truncate text-sm font-black text-slate-950">
                  {pharmacy?.name || "Aucune pharmacie"}
                </p>
              </div>
            )}

            {accessWarning && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
                {accessWarning}
              </div>
            )}

            {subscriptionWarning && (
              <Link
                href="/abonnement"
                className="mt-4 block rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800"
              >
                {subscriptionWarning}
              </Link>
            )}
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {visibleNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    isActive
                      ? "bg-blue-700 text-white shadow-lg shadow-blue-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-4">
            {isPlatformAdmin && (
              <div className="mb-3 space-y-2">
                <Link
                  href="/admin"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Super Admin
                </Link>

                <Link
                  href="/admin/catalogue-produits"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
                >
                  <Database className="h-5 w-5" />
                  Catalogue RDC
                </Link>
              </div>
            )}

            <p className="text-center text-xs font-medium text-slate-400">
              Aksantic Technology © 2026
            </p>
          </div>
        </aside>
      )}

      {isCompactMode && (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {!isOnDashboard && (
                <Link
                  href="/dashboard"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                  aria-label="Retour au tableau de bord"
                  title="Retour au tableau de bord"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              )}

              <div className="min-w-0">
                <AppLogo compact />

                <div className="mt-2 max-w-[50vw] rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="truncate text-xs font-black uppercase tracking-[0.15em] text-blue-700">
                    {pharmacy?.name || "Aucune pharmacie"}
                  </p>

                  <p className="truncate text-[11px] font-semibold text-slate-500">
                    {formatRole(pharmacy?.role)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <NotificationsBell alerts={alerts} />

              <ProfileMenu
                displayName={accountName || accountEmail}
                email={accountEmail}
                greetingLabel={`Bienvenue, ${formatRole(pharmacy?.role)}`}
                accountHref="/compte"
                isSigningOut={isSigningOut}
                onSignOut={handleSignOut}
                pharmacyHref={pharmacy ? "/parametres/general" : undefined}
                pharmacyLabel="Infos & logo de la pharmacie"
              />

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700"
                aria-label="Ouvrir le menu"
                title="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>

          {accessWarning && (
            <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
              {accessWarning}
            </div>
          )}

          {subscriptionWarning && (
            <Link
              href="/abonnement"
              className="mt-3 block rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800"
            >
              {subscriptionWarning}
            </Link>
          )}
        </header>
      )}

      {isCompactMode && isMobileMenuOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-sm">
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  Menu
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Mpangi_Pharma
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-2xl border border-slate-200 p-3 text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-88px)] overflow-y-auto p-5">
              {pharmacy && (
                <PharmacyOpeningStatusControl
                  pharmacyId={pharmacy.id}
                  canManage={canManageOpeningStatus(pharmacy.role)}
                  stackButtons
                />
              )}

              <div className="mt-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
                {pharmacies.length > 1 ? (
                  <select
                    value={pharmacy?.id || ""}
                    onChange={(event) =>
                      handlePharmacyChange(event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-4 text-sm font-black text-slate-950 outline-none focus:border-blue-500"
                  >
                    {pharmacies.map((item) => (
                      <option
                        key={`mobile-pharmacy-${item.id}`}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      {pharmacy?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pharmacy.logo_url}
                          alt={`Logo ${pharmacy.name}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-slate-300" />
                      )}
                    </div>

                    <p className="truncate text-base font-black text-slate-950">
                      {pharmacy?.name || "Aucune pharmacie"}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Navigation
                </p>

                <nav className="grid grid-cols-2 gap-3">
                  {mobileMoreNavigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === activeHref;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex min-h-20 flex-col justify-center gap-2 rounded-3xl border px-4 py-4 text-sm font-black ${
                          isActive
                            ? "border-blue-700 bg-blue-700 text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {isPlatformAdmin && (
                <div className="mt-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Administration
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm font-black text-blue-700"
                    >
                      <ShieldCheck className="h-5 w-5" />
                      Super Admin
                    </Link>

                    <Link
                      href="/admin/catalogue-produits"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm font-black text-emerald-700"
                    >
                      <Database className="h-5 w-5" />
                      Catalogue RDC
                    </Link>
                  </div>
                </div>
              )}

              <p className="mt-5 pb-5 text-center text-xs font-medium text-slate-400">
                Aksantic Technology © 2026
              </p>
            </div>
          </div>
        </div>
      )}

      {isCompactMode && (
        <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid grid-cols-5 gap-1">
            {mobileMainNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;

              return (
                <Link
                  key={`mobile-bottom-${item.href}`}
                  href={item.href}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-black ${
                    isActive
                      ? "bg-blue-700 text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />

                  <span className="max-w-full truncate">
                    {shortMobileLabel(item.label)}
                  </span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-black ${
                isMobileMenuOpen
                  ? "bg-blue-700 text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <MoreHorizontal className="h-5 w-5" />
              Menu
            </button>
          </div>
        </nav>
      )}

      <div className={isCompactMode ? "pb-28" : "pl-72"}>
        {!isCompactMode && (
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center gap-4">
              {!isOnDashboard && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Tableau de bord
                </Link>
              )}

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Espace pharmacie
                </p>
                <h2 className="text-lg font-black text-slate-950">
                  {pageTitle}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationsBell alerts={alerts} />

              <ProfileMenu
                displayName={accountName || accountEmail}
                email={accountEmail}
                greetingLabel={`Bienvenue, ${formatRole(pharmacy?.role)}`}
                accountHref="/compte"
                isSigningOut={isSigningOut}
                onSignOut={handleSignOut}
                pharmacyHref={pharmacy ? "/parametres/general" : undefined}
                pharmacyLabel="Infos & logo de la pharmacie"
              />
            </div>
          </header>
        )}

        <OfflineStatusBar pharmacyId={pharmacy?.id ?? null} />
        {children}
      </div>
    </div>
  );
}

function shortMobileLabel(label: string) {
  const labels: Record<string, string> = {
    "Tableau de bord": "Accueil",
    Produits: "Produits",
    Ventes: "Ventes",
    Factures: "Factures",
    "Stock voisin": "Voisin",
  };

  return labels[label] ?? label;
}

function formatRole(role?: string | null) {
  const labels: Record<string, string> = {
    owner: "Propriétaire",
    manager: "Gérant",
    pharmacist: "Pharmacien",
    cashier: "Caissier",
    stock_manager: "Gestionnaire stock",
    accountant: "Comptable",
  };

  if (!role) return "Rôle inconnu";

  return labels[role] ?? role;
}
