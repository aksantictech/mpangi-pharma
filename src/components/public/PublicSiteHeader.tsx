"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Home, Pill, BadgeDollarSign, Phone, LogIn } from "lucide-react";

import AppLogo from "@/components/branding/AppLogo";

const navItems = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/pharmacies-ouvertes", label: "Pharmacies ouvertes", icon: Pill },
  { href: "/forfaits", label: "Forfaits", icon: BadgeDollarSign },
  { href: "/devis-demo", label: "Démo / Devis", icon: Phone },
  { href: "/contact", label: "Nous contacter", icon: Phone },
];

export default function PublicSiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="shrink-0">
          <AppLogo />
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/devis-demo"
            className="rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-50"
          >
            Demander une démo
          </Link>

          <Link
            href="/connexion"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800"
          >
            <LogIn className="h-4 w-4" />
            Connexion
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 lg:hidden"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 md:px-6">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href="/devis-demo"
                onClick={() => setIsOpen(false)}
                className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-black text-blue-700 hover:bg-blue-50"
              >
                Démo / Devis
              </Link>

              <Link
                href="/connexion"
                onClick={() => setIsOpen(false)}
                className="rounded-2xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white hover:bg-blue-800"
              >
                Connexion
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}