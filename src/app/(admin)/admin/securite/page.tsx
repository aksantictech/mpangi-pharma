import Link from "next/link";
import { DatabaseBackup, History, KeyRound, ShieldCheck, UserCog } from "lucide-react";

const actions = [
  {
    href: "/admin/audit",
    title: "Journal d’audit",
    description: "Consulter les opérations sensibles et les modifications.",
    icon: History,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    href: "/admin/sauvegardes",
    title: "Sauvegardes",
    description: "Exporter une copie applicative des données d’une pharmacie.",
    icon: DatabaseBackup,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    href: "/admin/pharmacies",
    title: "Gestion des accès",
    description:
      "Ouvrez « Utilisateurs » sur une pharmacie pour gérer ses rôles, statuts et mots de passe temporaires.",
    icon: UserCog,
    tone: "bg-purple-50 text-purple-700",
  },
  {
    href: "/compte",
    title: "Sécurité du compte",
    description: "Modifier le mot de passe du compte actuellement connecté.",
    icon: KeyRound,
    tone: "bg-amber-50 text-amber-700",
  },
];

export default function AdminSecurityPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 md:h-14 md:w-14">
            <ShieldCheck className="h-6 w-6 md:h-7 md:w-7" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Super Admin
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
              Sécurité & audit
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Centralisez les contrôles d’accès, la traçabilité et la
              continuité des données de la plateforme.
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:rounded-[2rem] md:p-6"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${action.tone}`}
            >
              <action.icon className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-lg font-black text-slate-950">
              {action.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {action.description}
            </p>

            <span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-blue-700 group-hover:text-blue-800">
              Ouvrir →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
