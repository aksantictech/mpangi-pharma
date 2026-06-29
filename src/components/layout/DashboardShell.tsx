"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mustCurrentUserChangePassword } from "@/services/account.service";
import {
  canAccessModule,
  canAccessPath,
  type AppModule,
} from "@/lib/permissions";
import {
  Bell,
  Boxes,
  Building2,
  FileText,
  LayoutDashboard,
  LineChart,
  ShieldCheck,
  ScrollText,
  LogOut,
  Menu,
  Package,
  Settings,
  DatabaseBackup,
  ShoppingCart,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react";

import AppLogo from "@/components/branding/AppLogo";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  clearStoredActivePharmacyId,
  getCurrentPharmacy,
  getMyPharmacies,
  isCurrentUserPlatformAdmin,
  setActivePharmacy,
} from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";

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
  label: "Audit",
  href: "/audit",
  module: "audit",
  icon: ScrollText,
},
{
  label: "Sauvegardes",
  href: "/sauvegardes",
  module: "sauvegardes",
  icon: DatabaseBackup,
},
  {
    label: "Paramètres",
    href: "/parametres",
    module: "parametres",
    icon: Settings,
  },
  {
  label: "Mon compte",
  href: "/compte",
  module: "compte",
  icon: UserCircle,
},
];
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
export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
const [pharmacies, setPharmacies] = useState<PharmacyWithRole[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [accessWarning, setAccessWarning] = useState("");
const visibleNavigationItems = navigationItems.filter((item) =>
  canAccessModule(pharmacy?.role, item.module, isPlatformAdmin)
);
useEffect(() => {
  let isMounted = true;

  async function verifyAccess() {
    try {
      const [myPharmacies, currentPharmacy, platformAdminStatus] =
        await Promise.all([
          getMyPharmacies(),
          getCurrentPharmacy(),
          isCurrentUserPlatformAdmin(),
        ]);

      if (!isMounted) return;

      setPharmacies(myPharmacies);
      setPharmacy(currentPharmacy);
      setIsPlatformAdmin(platformAdminStatus);

      if (!platformAdminStatus && myPharmacies.length === 0) {
        clearStoredActivePharmacyId();

        setAccessWarning(
          "Votre accès à cette pharmacie a été désactivé ou aucune pharmacie active n’est liée à votre compte."
        );

        if (!canStayWithoutActivePharmacy(pathname)) {
          router.replace("/dashboard?access=disabled");
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

      setPharmacies([]);
      setPharmacy(null);
      setIsPlatformAdmin(false);

      clearStoredActivePharmacyId();

      if (!canStayWithoutActivePharmacy(pathname)) {
        router.replace("/dashboard?access=disabled");
      }
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
  async function enforcePasswordChange() {
    if (pathname === "/compte") return;

    const mustChangePassword = await mustCurrentUserChangePassword();

    if (mustChangePassword) {
      router.replace("/compte?motDePasseTemporaire=1");
    }
  }

  enforcePasswordChange();
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

  await supabase.auth.signOut();

  router.push("/connexion");
  router.refresh();
}

  

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-100 p-6">
          <AppLogo />
        </div>

<div className="border-b border-slate-100 p-5">
  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
    Pharmacie active
  </p>

  {pharmacies.length > 1 ? (
    <select
      value={pharmacy?.id || ""}
      onChange={(event) => handlePharmacyChange(event.target.value)}
      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-950 outline-none focus:border-blue-500"
    >
      {pharmacies.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  ) : (
    <>
      <p className="mt-2 truncate text-sm font-black text-slate-950">
        {pharmacy?.name || "Aucune pharmacie"}
      </p>

<p className="mt-1 truncate text-xs font-medium text-slate-500">
  {pharmacy?.city || "Ville non renseignée"} · {formatRole(pharmacy?.role)}
</p>
    </>
  )}
</div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

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
  <Link
    href="/admin"
    className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100"
  >
    <ShieldCheck className="h-5 w-5" />
    Super Admin
  </Link>
)}

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" />
            {isSigningOut ? "Déconnexion..." : "Déconnexion"}
          </button>

          <p className="mt-4 text-center text-xs font-medium text-slate-400">
            Aksantic Technology © 2026
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <AppLogo compact />

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm lg:hidden">
          <div className="h-full w-80 max-w-[85vw] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <AppLogo compact />

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-2xl border border-slate-200 p-3 text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

<div className="border-b border-slate-100 p-5">
  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
    Pharmacie active
  </p>
{accessWarning && (
  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
    {accessWarning}
  </div>
)}
  {pharmacies.length > 1 ? (
    <select
      value={pharmacy?.id || ""}
      onChange={(event) => handlePharmacyChange(event.target.value)}
      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-950 outline-none focus:border-blue-500"
    >
{pharmacies.map((item) => (
  <option key={`pharmacy-${item.id}`} value={item.id}>
    {item.name}
  </option>
))}
    </select>
  ) : (
    <p className="mt-2 truncate text-sm font-black text-slate-950">
      {pharmacy?.name || "Aucune pharmacie"}
    </p>
  )}
</div>

            <nav className="space-y-1 p-4">
              {visibleNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black ${
                      isActive
                        ? "bg-blue-700 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4">

{isPlatformAdmin && (
  <Link
    href="/admin"
    onClick={() => setIsMobileMenuOpen(false)}
    className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700"
  >
    <ShieldCheck className="h-5 w-5" />
    Super Admin
  </Link>
)}

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
              >
                <LogOut className="h-5 w-5" />
                {isSigningOut ? "Déconnexion..." : "Déconnexion"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-72">{children}</div>
    </div>
  );
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