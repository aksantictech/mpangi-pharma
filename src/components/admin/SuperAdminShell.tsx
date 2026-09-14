"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  Database,
  DatabaseBackup,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  UserCircle,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { createSupabaseClient } from "@/lib/supabase/client";
import { getCurrentUserAccount } from "@/services/account.service";
import { getAdminPharmacies } from "@/services/admin-pharmacies.service";
import {
  clearStoredActivePharmacyId,
} from "@/services/pharmacies.service";
import { clearOfflinePharmacyData } from "@/lib/offline/db";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/admin/pharmacies", label: "Pharmacies", icon: Building2 },
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

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFrom(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "SA";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function SuperAdminShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [alerts, setAlerts] = useState<string[]>([]);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const initials = initialsFrom(adminName, adminEmail);
  const displayName = adminName || adminEmail || "Super Admin";

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
            const active = isActivePath(pathname, item.href);

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
            href="/dashboard"
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
          <BellButton
            alerts={alerts}
            isOpen={isNotificationsOpen}
            onToggle={() => setIsNotificationsOpen((current) => !current)}
            dark
          />

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
                const active = isActivePath(pathname, item.href);

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
                href="/dashboard"
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
              {navItems.find((item) => isActivePath(pathname, item.href))
                ?.label ?? "Mpangi_Pharma"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <BellButton
              alerts={alerts}
              isOpen={isNotificationsOpen}
              onToggle={() => setIsNotificationsOpen((current) => !current)}
            />

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 py-2 pl-2 pr-3 hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                  {initials}
                </div>

                <div className="text-left">
                  <p className="text-xs font-medium text-slate-400">
                    Bienvenue, Super Admin
                  </p>
                  <p className="text-sm font-black text-slate-950">
                    {displayName}
                  </p>
                </div>

                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <div className="px-3 py-2">
                    <p className="text-sm font-black text-slate-950">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {adminEmail}
                    </p>
                  </div>

                  <div className="my-1 border-t border-slate-100" />

                  <Link
                    href="/admin/compte"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <UserCircle className="h-4 w-4" />
                    Modifier le profil
                  </Link>

                  <Link
                    href="/admin/compte"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <KeyRound className="h-4 w-4" />
                    Modifier le mot de passe
                  </Link>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    {isSigningOut ? "Déconnexion..." : "Déconnexion"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function BellButton({
  alerts,
  isOpen,
  onToggle,
  dark = false,
}: {
  alerts: string[];
  isOpen: boolean;
  onToggle: () => void;
  dark?: boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Notifications"
        className={`relative rounded-xl border p-2.5 ${
          dark
            ? "border-white/10 text-white/80 hover:bg-white/10"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Bell className="h-5 w-5" />

        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
            {alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 shadow-2xl">
          <p className="px-1 py-1 text-xs font-black uppercase tracking-wide text-slate-400">
            Notifications
          </p>

          {alerts.length === 0 ? (
            <p className="px-1 py-3 text-sm text-slate-500">
              Aucune alerte pour le moment.
            </p>
          ) : (
            <ul className="space-y-1">
              {alerts.map((alert) => (
                <li
                  key={alert}
                  className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
                >
                  {alert}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
