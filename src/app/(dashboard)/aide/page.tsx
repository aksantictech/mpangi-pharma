"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Lightbulb,
  Printer,
  Search,
} from "lucide-react";

import PageLoading from "@/components/ui/PageLoading";
import { useToast } from "@/components/ui/Toast";
import {
  defaultGuideForRole,
  helpGuides,
  type HelpGuide,
  type HelpGuideId,
  type HelpTask,
} from "@/lib/help-content";
import { printGuide } from "@/lib/print-guide";
import { getCurrentPharmacy } from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";

// Met en gras les libellés d'écran écrits **comme ceci** dans le contenu.
function renderRich(text: string): ReactNode[] {
  return text.split(/(\*\*.+?\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-black text-slate-950">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

// Sans accents ni gras, en minuscules : « scanner » doit trouver « Scannez ».
function plain(text: string) {
  return text
    .replace(/\*\*/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Racine d'un mot de recherche : retire les 2 dernières lettres des mots longs
// (imprimer/imprimez, scanner/scannez, expiration/expirations).
function stem(word: string) {
  return word.length >= 6 ? word.slice(0, word.length - 2) : word;
}

function taskMatches(task: HelpTask, term: string) {
  const haystack = plain(
    [task.title, task.summary, ...task.steps, ...(task.tips ?? [])].join(" ")
  );

  return plain(term)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(stem(word)));
}

export default function HelpPage() {
  const toast = useToast();

  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<HelpGuideId | null>(null);
  const [search, setSearch] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getCurrentPharmacy()
      .then((result) => {
        if (isMounted) setPharmacy(result);
      })
      .catch(() => {
        // Les guides restent lisibles sans pharmacie (pas de logo à l'impression).
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeId = selected ?? defaultGuideForRole(pharmacy?.role);
  const activeGuide = helpGuides.find((guide) => guide.id === activeId) ?? helpGuides[0];
  const term = search.trim().toLowerCase();

  // Une recherche couvre tous les guides ; sans recherche, on affiche le guide choisi.
  const results = useMemo(() => {
    if (!term) return null;

    return helpGuides
      .map((guide) => ({
        guide,
        tasks: guide.tasks.filter((task) => taskMatches(task, term)),
      }))
      .filter((entry) => entry.tasks.length > 0);
  }, [term]);

  async function handlePrint(guide: HelpGuide) {
    try {
      await printGuide({
        pharmacy: pharmacy ?? { name: "Mpangi Pharma" },
        guide,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impression impossible."
      );
    }
  }

  if (isLoading) {
    return <PageLoading label="Chargement de l’aide..." variant="list" />;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <BookOpen className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                Centre d’aide
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                Guides pratiques pas à pas
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Choisissez votre métier, ouvrez une procédure et suivez les
                étapes. Les mots en gras sont ceux que vous voyez à l’écran.
              </p>
            </div>
          </div>

          <label className="mt-4 flex min-h-12 items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 focus-within:border-blue-600">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher : imprimer, scanner, expiration, utilisateur…"
              aria-label="Rechercher dans l’aide"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:font-medium placeholder:text-slate-400"
            />
          </label>
        </header>

        {results ? (
          <section className="space-y-4">
            {results.length === 0 ? (
              <p className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
                Aucune procédure ne correspond à « {search.trim()} ». Essayez un
                mot plus simple (ex. « stock », « facture », « caisse »).
              </p>
            ) : (
              results.map(({ guide, tasks }) => (
                <div key={guide.id} className="space-y-2">
                  <h2 className="px-1 text-sm font-black uppercase tracking-wide text-slate-500">
                    {guide.title}
                  </h2>

                  {tasks.map((task) => (
                    <TaskCard
                      key={`${guide.id}-${task.id}`}
                      task={task}
                      isOpen={openTaskId === `${guide.id}-${task.id}`}
                      onToggle={() =>
                        setOpenTaskId(
                          openTaskId === `${guide.id}-${task.id}`
                            ? null
                            : `${guide.id}-${task.id}`
                        )
                      }
                    />
                  ))}
                </div>
              ))
            )}
          </section>
        ) : (
          <>
            <nav
              aria-label="Guides par métier"
              className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {helpGuides.map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  aria-pressed={guide.id === activeGuide.id}
                  onClick={() => {
                    setSelected(guide.id);
                    setOpenTaskId(null);
                  }}
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-black ${
                    guide.id === activeGuide.id
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {guide.tab}
                </button>
              ))}
            </nav>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-950 md:text-2xl">
                    {activeGuide.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeGuide.subtitle}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {activeGuide.tasks.length} procédures
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handlePrint(activeGuide)}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="h-5 w-5" />
                  Imprimer ce guide
                </button>
              </div>
            </section>

            <section className="space-y-2">
              {activeGuide.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isOpen={openTaskId === `${activeGuide.id}-${task.id}`}
                  onToggle={() =>
                    setOpenTaskId(
                      openTaskId === `${activeGuide.id}-${task.id}`
                        ? null
                        : `${activeGuide.id}-${task.id}`
                    )
                  }
                />
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function TaskCard({
  task,
  isOpen,
  onToggle,
}: {
  task: HelpTask;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left md:px-5"
      >
        <span>
          <span className="block text-base font-black text-slate-950">
            {task.title}
          </span>
          <span className="mt-0.5 block text-sm text-slate-500">
            {renderRich(task.summary)}
          </span>
        </span>

        <span
          aria-hidden="true"
          className={`shrink-0 text-xl font-black text-slate-400 transition ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-4 pb-5 pt-4 md:px-5">
          <ol className="space-y-3">
            {task.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-black text-white">
                  {index + 1}
                </span>

                <p className="min-w-0 flex-1 pt-0.5 text-sm leading-6 text-slate-700">
                  {renderRich(step)}
                </p>
              </li>
            ))}
          </ol>

          {task.tips && task.tips.length > 0 && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-blue-900">
                <Lightbulb className="h-4 w-4" />
                À savoir
              </p>

              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-blue-900">
                {task.tips.map((tip, index) => (
                  <li key={index}>• {renderRich(tip)}</li>
                ))}
              </ul>
            </div>
          )}

          {task.link && (
            <Link
              href={task.link.href}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800"
            >
              {task.link.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
