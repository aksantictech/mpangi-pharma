import Link from "next/link";
import { Globe, Mail, MessageCircle, PhoneCall } from "lucide-react";

import AppLogo from "@/components/branding/AppLogo";

export default function PublicSiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div>
            <AppLogo />
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Mpangi_Pharma est une solution de gestion multi-pharmacie pensée
              pour le contexte africain, simple, moderne et accessible.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
              Navigation
            </h3>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link href="/" className="text-slate-600 hover:text-blue-700">
                Accueil
              </Link>
              <Link
                href="/pharmacies-ouvertes"
                className="text-slate-600 hover:text-blue-700"
              >
                Pharmacies ouvertes
              </Link>
              <Link href="/forfaits" className="text-slate-600 hover:text-blue-700">
                Forfaits
              </Link>
              <Link href="/devis-demo" className="text-slate-600 hover:text-blue-700">
                Démo / Devis
              </Link>
              <Link href="/contact" className="text-slate-600 hover:text-blue-700">
                Nous contacter
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
              Contact
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <a
                href="https://aksantictech.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-blue-700"
              >
                <Globe className="h-4 w-4" />
                https://aksantictech.com
              </a>

              <a
                href="mailto:aksantictech@gmail.com"
                className="flex items-center gap-2 hover:text-blue-700"
              >
                <Mail className="h-4 w-4" />
                aksantictech@gmail.com
              </a>

              <a
                href="https://wa.me/243801655726"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-blue-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp : +243 801 655 726
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
              Besoin d’une démonstration ?
            </h3>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Contactez-nous pour une démonstration, un devis ou une installation
              dans votre pharmacie.
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/devis-demo"
                className="rounded-2xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white hover:bg-blue-800"
              >
                Demander une démo
              </Link>

              <a
                href="https://wa.me/243801655726"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
              >
                <PhoneCall className="h-4 w-4" />
                Nous écrire sur WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          Propulsé par Aksantic Technology © 2026
        </div>
      </div>
    </footer>
  );
}