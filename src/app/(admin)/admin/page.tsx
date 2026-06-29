import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";

export default function AdminHomePage() {
  return (
    <section className="mx-auto max-w-7xl p-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <h2 className="mt-6 text-3xl font-black">
          Espace Super Admin Aksantic
        </h2>

        <p className="mt-3 max-w-2xl text-white/60">
          Cet espace permet de gérer les pharmacies clientes de Mpangi_Pharma,
          de créer leurs premiers responsables et de préparer leur environnement
          de travail.
        </p>

        <div className="mt-8">
          <Link
            href="/admin/pharmacies"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            <Building2 className="h-5 w-5" />
            Gérer les pharmacies
          </Link>
        </div>
      </div>
    </section>
  );
}