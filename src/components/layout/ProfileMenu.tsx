"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, KeyRound, LogOut, UserCircle } from "lucide-react";

export function initialsFromName(name: string, fallback: string) {
  const source = name.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "MP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type ProfileMenuProps = {
  displayName: string;
  email: string;
  greetingLabel: string;
  accountHref: string;
  isSigningOut: boolean;
  onSignOut: () => void;
  dark?: boolean;
};

/**
 * Menu profil partagé par SuperAdminShell et DashboardShell : avatar,
 * "Bienvenue, {rôle}", accès au profil et déconnexion. Un seul composant
 * pour garantir le même rendu partout ("tous les profils").
 */
export default function ProfileMenu({
  displayName,
  email,
  greetingLabel,
  accountHref,
  isSigningOut,
  onSignOut,
  dark = false,
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initials = initialsFromName(displayName, email);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex items-center gap-3 rounded-2xl border py-2 pl-2 pr-3 ${
          dark
            ? "border-white/10 hover:bg-white/10"
            : "border-slate-200 hover:bg-slate-50"
        }`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
          {initials}
        </div>

        <div className="hidden text-left sm:block">
          <p
            className={`text-xs font-medium ${
              dark ? "text-white/50" : "text-slate-400"
            }`}
          >
            {greetingLabel}
          </p>
          <p
            className={`max-w-[10rem] truncate text-sm font-black ${
              dark ? "text-white" : "text-slate-950"
            }`}
          >
            {displayName}
          </p>
        </div>

        <ChevronDown
          className={`hidden h-4 w-4 sm:block ${
            dark ? "text-white/50" : "text-slate-400"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-slate-950 shadow-2xl">
          <div className="px-3 py-2">
            <p className="text-sm font-black text-slate-950">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
          </div>

          <div className="my-1 border-t border-slate-100" />

          <Link
            href={accountHref}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <UserCircle className="h-4 w-4" />
            Modifier le profil
          </Link>

          <Link
            href={accountHref}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <KeyRound className="h-4 w-4" />
            Modifier le mot de passe
          </Link>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            disabled={isSigningOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? "Déconnexion..." : "Déconnexion"}
          </button>
        </div>
      )}
    </div>
  );
}
