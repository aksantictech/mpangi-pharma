"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Building2,
  CreditCard,
  Database,
  DatabaseBackup,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import NotificationsBell from "@/components/layout/NotificationsBell";
import ProfileMenu, {
  initialsFromName,
} from "@/components/layout/ProfileMenu";
import { getActiveHref } from "@/lib/nav-active";
import { createSupabaseClient } from "@/lib/supabase/client";
import { getCurrentUserAccount } from "@/services/account.service";
import { getAdminPharmacies } from "@/services/admin-pharmacies.service";
import { clearStoredActivePharmacyId } from "@/services/pharmacies.service";
import { clearOfflinePharmacyData } from "@/lib/offline/db";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/admin/pharmacies", label: "Pharmacies", icon: Building2 },
  { href: "/admin/abonnements", label: "Abonnements", icon: CreditCard },
  {
    href: "/admin/catalogue-produits",
    label: "Catalogue national",
    icon: Database,
  },
  {
    href: "/admin/securite",
    label: "Sécurité & audit",
    icon: ShieldCheck,
  },
  { href: "/admin/sauvegardes", label: "Sauvegardes", icon: DatabaseBackup },
  {
    href: "/admin/stabilite",
    label: "Paramètres système",
    icon: Activity,
  },
];

export default function SuperAdminShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      try {
        const account = await getCurrentUserAccount();

        if (!isMounted) return;

        setAdminName(account.fullName || "");
        setAdminEmail(account.email);
      } catch {
        // L'en-tête reste sobre si le profil ne charge pas ; le reste de
        // l'espace admin fonctionne indépendamment de ça.
      }
    }

    async function loadAlerts() {
      try {
        const pharmacies = await getAdminPharmacies();

        if (!isMounted) return;

        const nextAlerts: string[] = [];

        const archived = pharmacies.filter((p) => p.archived_at).length;
        const inactive = pharmacies.filter(
          (p) => !p.is_active && !p.archived_at
        ).length;
        const withoutMembers = pharmacies.filter(
          (p) => !p.archived_at && p.health.activeMembers === 0
        ).length;

        if (inactive > 0) {
          nextAlerts.push(
            `${inactive} pharmacie${inactive > 1 ? "s" : ""} désactivée${inactive > 1 ? "s" : ""}`
          );
        }

        if (withoutMembers > 0) {
          nextAlerts.push(
            `${withoutMembers} pharmacie${withoutMembers > 1 ? "s" : ""} sans membre actif`
          );
        }

        if (archived > 0) {
          nextAlerts.push(
            `${archived} pharmacie${archived > 1 ? "s" : ""} archivée${archived > 1 ? "s" : ""}`
          );
        }

        setAlerts(nextAlerts);
      } catch {
        // Silencieux : la cloche reste vide plutôt que de bloquer l'affichage.
      }
    }

    void loadAccount();
    void loadAlerts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileNavOpen(false);
  }, [pathname]);

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

  const initials = initialsFromName(adminName, adminEmail);
  const displayName = adminName || adminEmail || "Super Admin";
  const activeHref = getActiveHref(
    pathname,
    navItems.map((item) => item.href)
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-white/10 lg:bg-slate-950 lg:text-white">
        <div className="border-b border-white/10 p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
            Aksantic Super Admin
          </p>
          <h1 className="mt-1 text-xl font-black">Mpangi_Pharma</h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/admin/pharmacies"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/20"
          >
            <Store className="h-5 w-5" />
            Espace pharmacie
          </Link>

          <p className="mt-4 text-center text-xs font-medium text-white/30">
            Aksantic Technology © 2026
          </p>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-slate-950 px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="rounded-xl border border-white/10 p-2 text-white/80"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
              Super Admin
            </p>
            <p className="text-sm font-black">Mpangi_Pharma</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationsBell alerts={alerts} dark />

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-black">
            {initials}
          </div>
        </div>
      </header>

      {/* Volet coulissant mobile */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                  Super Admin
                </p>
                <p className="mt-1 text-lg font-black">Mpangi_Pharma</p>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="rounded-xl border border-white/10 p-2 text-white/80"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === activeHref;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-4">
              <Link
                href="/admin/pharmacies"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white"
              >
                <Store className="h-5 w-5" />
                Espace pharmacie
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 disabled:opacity-60"
              >
                <LogOut className="h-5 w-5" />
                {isSigningOut ? "Déconnexion..." : "Déconnexion"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Topbar desktop */}
        <header className="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:flex">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Centre d’administration
            </p>
            <h2 className="text-lg font-black text-slate-950">
              {navItems.find((item) => item.href === activeHref)?.label ??
                "Mpangi_Pharma"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsBell alerts={alerts} />

            <ProfileMenu
              displayName={displayName}
              email={adminEmail}
              greetingLabel="Bienvenue, Super Admin"
              accountHref="/admin/compte"
              isSigningOut={isSigningOut}
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
