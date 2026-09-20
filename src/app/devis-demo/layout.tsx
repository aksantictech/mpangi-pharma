import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Demander une démo ou un devis gratuit",
  description:
    "Demandez une démonstration gratuite de Mpangi_Pharma, le logiciel de gestion de pharmacie : stock, ventes, factures et impression Android. Réponse rapide.",
  path: "/devis-demo",
});

export default function DevisDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
