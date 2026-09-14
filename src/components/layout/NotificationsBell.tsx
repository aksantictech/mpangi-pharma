"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

type NotificationsBellProps = {
  alerts: string[];
  dark?: boolean;
};

/**
 * Cloche de notifications partagée. N'affiche que de vraies alertes
 * calculées par l'appelant (jamais de contenu inventé) : aucune alerte,
 * aucune pastille.
 */
export default function NotificationsBell({
  alerts,
  dark = false,
}: NotificationsBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
            <ul className="max-h-72 space-y-1 overflow-y-auto">
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
