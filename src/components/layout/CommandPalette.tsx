"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CornerDownLeft,
  FileText,
  Package,
  Search,
  type LucideIcon,
} from "lucide-react";

import {
  quickSearch,
  type QuickSearchResults,
} from "@/services/quick-search.service";

export type PaletteLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type PaletteEntry = PaletteLink & {
  key: string;
  group: "Pages" | "Produits" | "Factures";
  hint?: string;
};

type RemoteState = { term: string; results: QuickSearchResults };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Palette de recherche globale (Ctrl/Cmd + K) : pages, produits et factures
 * en quelques lettres. Montée seulement quand elle est ouverte, ce qui remet la
 * saisie à zéro à chaque ouverture sans effet de nettoyage.
 */
export default function CommandPalette({
  pages,
  pharmacyId,
  canSearchProducts,
  canSearchInvoices,
  onClose,
}: {
  pages: PaletteLink[];
  pharmacyId: string | null;
  canSearchProducts: boolean;
  canSearchInvoices: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [remote, setRemote] = useState<RemoteState | null>(null);

  const term = query.trim();
  const canSearchRemote =
    Boolean(pharmacyId) && (canSearchProducts || canSearchInvoices);
  const wantsRemote = canSearchRemote && term.length >= 2;
  const isSearching = wantsRemote && remote?.term !== term;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!wantsRemote || !pharmacyId) return;

    let isCurrent = true;

    // Petite temporisation : on n'interroge la base qu'une fois la frappe posée.
    const timer = window.setTimeout(() => {
      quickSearch({
        pharmacyId,
        term,
        products: canSearchProducts,
        invoices: canSearchInvoices,
      })
        .then((results) => {
          if (isCurrent) setRemote({ term, results });
        })
        .catch(() => {
          if (isCurrent) {
            setRemote({ term, results: { products: [], invoices: [] } });
          }
        });
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [wantsRemote, term, pharmacyId, canSearchProducts, canSearchInvoices]);

  const entries = useMemo(() => {
    const normalizedTerm = normalize(term);
    const list: PaletteEntry[] = [];

    for (const page of pages) {
      if (!normalizedTerm || normalize(page.label).includes(normalizedTerm)) {
        list.push({ ...page, key: `page-${page.href}`, group: "Pages" });
      }
    }

    if (remote && remote.term === term) {
      for (const product of remote.results.products) {
        list.push({
          key: `product-${product.id}`,
          group: "Produits",
          label: product.name,
          hint: [product.generic_name, product.dosage, product.form]
            .filter(Boolean)
            .join(" · "),
          href: `/produits?q=${encodeURIComponent(product.name)}`,
          icon: Package,
        });
      }

      for (const invoice of remote.results.invoices) {
        list.push({
          key: `invoice-${invoice.id}`,
          group: "Factures",
          label: invoice.invoice_number,
          hint: `${invoice.customer_name || "Client comptoir"} · ${Number(
            invoice.total_amount || 0
          ).toLocaleString("fr-CD")} ${invoice.currency || "CDF"}`,
          href: `/factures/${invoice.id}`,
          icon: FileText,
        });
      }
    }

    return list;
  }, [pages, remote, term]);

  const safeIndex = Math.min(activeIndex, Math.max(entries.length - 1, 0));

  function go(entry: PaletteEntry | undefined) {
    if (!entry) return;

    onClose();
    router.push(entry.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(Math.min(safeIndex + 1, entries.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(Math.max(safeIndex - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(entries[safeIndex]);
    }
  }

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/50 px-3 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche rapide"
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-label="Rechercher"
            autoComplete="off"
            placeholder="Page, produit ou facture…"
            className="min-h-14 min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-400"
          />

          <kbd className="hidden rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-black text-slate-400 sm:block">
            Échap
          </kbd>
        </div>

        <ul
          id="palette-results"
          role="listbox"
          className="max-h-[55vh] overflow-y-auto p-2"
        >
          {entries.map((entry, index) => {
            const Icon = entry.icon;
            const showGroup = entry.group !== lastGroup;
            lastGroup = entry.group;

            return (
              <li key={entry.key} role="presentation">
                {showGroup && (
                  <p className="px-3 pb-1 pt-3 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                    {entry.group}
                  </p>
                )}

                <button
                  type="button"
                  role="option"
                  aria-selected={index === safeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(entry)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                    index === safeIndex
                      ? "bg-blue-50 text-blue-800"
                      : "text-slate-700"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">
                      {entry.label}
                    </span>

                    {entry.hint && (
                      <span className="block truncate text-xs font-medium text-slate-500">
                        {entry.hint}
                      </span>
                    )}
                  </span>

                  {index === safeIndex && (
                    <CornerDownLeft className="h-4 w-4 shrink-0 text-blue-600" />
                  )}
                </button>
              </li>
            );
          })}

          {entries.length === 0 && !isSearching && (
            <li className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
              Aucun résultat pour « {term} ».
            </li>
          )}

          {isSearching && (
            <li className="px-4 py-3 text-center text-xs font-semibold text-slate-400">
              Recherche en cours…
            </li>
          )}
        </ul>

        <p className="hidden border-t border-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-400 sm:block">
          ↑ ↓ pour naviguer · Entrée pour ouvrir · Ctrl K pour rouvrir
        </p>
      </div>
    </div>
  );
}
