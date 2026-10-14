type LoadingVariant = "list" | "cards" | "detail" | "pos";

/** Bloc gris qui pulse ; l'animation s'arrête si l'utilisateur a demandé moins de mouvement. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-xl bg-slate-200 motion-safe:animate-pulse ${className}`}
    />
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
      {children}
    </div>
  );
}

function Rows({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="hidden h-8 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

/**
 * Corps de squelette qui garde la forme de la page en cours de chargement
 * (plutôt qu'un simple « Chargement… ») pour éviter les sauts de mise en page.
 */
export function LoadingBlocks({ variant = "list" }: { variant?: LoadingVariant }) {
  if (variant === "cards") {
    return (
      <>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Panel key={index}>
              <Skeleton className="h-10 w-10 rounded-2xl md:h-12 md:w-12" />
              <Skeleton className="mt-4 h-3 w-1/2" />
              <Skeleton className="mt-3 h-7 w-3/4" />
            </Panel>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel>
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-5 h-40 w-full" />
            </Panel>
          </div>

          <Panel>
            <Skeleton className="h-5 w-1/2" />
            <div className="mt-5">
              <Rows count={3} />
            </div>
          </Panel>
        </div>
      </>
    );
  }

  if (variant === "detail") {
    return (
      <Panel>
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="mt-3 h-3.5 w-1/2" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </Panel>
    );
  }

  if (variant === "pos") {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-6">
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-2xl" />

          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-24 shrink-0 rounded-full" />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="hidden xl:block">
          <Panel>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="mt-5 h-24 w-full" />
            <Skeleton className="mt-3 h-24 w-full" />
            <Skeleton className="mt-6 h-14 w-full rounded-2xl" />
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <Panel>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="mt-6">
        <Rows count={6} />
      </div>
    </Panel>
  );
}

/**
 * Écran de chargement d'une page : en-tête + squelette. Annoncé comme un état
 * « occupé » aux lecteurs d'écran, avec le libellé visible pour eux seuls.
 */
export default function PageLoading({
  label = "Chargement...",
  variant = "list",
}: {
  label?: string;
  variant?: LoadingVariant;
}) {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-screen bg-slate-50 p-3 md:p-6"
    >
      <span className="sr-only">{label}</span>

      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-56" />
        </div>

        <LoadingBlocks variant={variant} />
      </div>
    </main>
  );
}
