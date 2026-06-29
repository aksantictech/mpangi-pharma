import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
              Aksantic Super Admin
            </p>
            <h1 className="mt-1 text-2xl font-black">Mpangi_Pharma Admin</h1>
          </div>

          <nav className="flex flex-wrap gap-3 text-sm font-black">
            <Link
              href="/admin"
              className="rounded-2xl border border-white/10 px-4 py-2 text-white/80 hover:bg-white/10"
            >
              Accueil
            </Link>

            <Link
              href="/admin/pharmacies"
              className="rounded-2xl border border-white/10 px-4 py-2 text-white/80 hover:bg-white/10"
            >
              Pharmacies
            </Link>

            <Link
              href="/dashboard"
              className="rounded-2xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Espace pharmacie
            </Link>
          </nav>
        </div>
      </header>

      {children}
    </main>
  );
}