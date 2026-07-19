"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  Home,
  MessageCircle,
  Pill,
  Presentation,
} from "lucide-react";

const items = [
  {
    href: "/",
    label: "Accueil",
    icon: Home,
  },
  {
    href: "/pharmacies-ouvertes",
    label: "Pharmacies",
    icon: Pill,
  },
  {
    href: "/forfaits",
    label: "Forfaits",
    icon: BadgeDollarSign,
  },
  {
    href: "/devis-demo",
    label: "Démo",
    icon: Presentation,
  },
  {
    href: "/contact",
    label: "Contact",
    icon: MessageCircle,
  },
];

export default function PublicMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black ${
                isActive
                  ? "bg-blue-700 text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-blue-700"
              }`}
            >
              <Icon className="h-5 w-5" />

              <span className="max-w-full truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}