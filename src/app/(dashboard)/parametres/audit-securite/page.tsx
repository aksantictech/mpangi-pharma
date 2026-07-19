import Link from "next/link";
import {
  ArrowLeft,
  DatabaseBackup,
  History,
  KeyRound,
  ShieldCheck,
  UserCog,
} from "lucide-react";

const actions = [
  {
    href: "/audit",
    title: "Journal d’audit",
    description: "Consulter les opérations sensibles et les modifications.",
    icon: History,
  },
  {
    href: "/sauvegardes",
    title: "Sauvegardes",
    description: "Exporter une copie applicative des données de la pharmacie.",
    icon: DatabaseBackup,
  },
  {
    href: "/parametres/utilisateurs",
    title: "Gestion des accès",
    description: "Contrôler les rôles, statuts et mots de passe temporaires.",
    icon: UserCog,
  },
  {
    href: "/compte",
    title: "Sécurité du compte",
    description: "Modifier le mot de passe du compte actuellement connecté.",
    icon: KeyRound,
  },
];

export default function AuditSecurityPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <Link
            href="/parametres"
            className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux paramètres
          </Link>

          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-950 md:text-3xl">
                Audit & sécurité
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Centralisez les contrôles d’accès, la traçabilité et la continuité
                des données.
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg md:rounded-[2rem] md:p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-xl font-black text-slate-950">
                  {action.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
