import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pharmacies ouvertes maintenant à Kinshasa et en RDC",
  description:
    "Trouvez une pharmacie ouverte près de vous (quartier, commune, ville), vérifiez la disponibilité d'un produit et contactez la pharmacie directement.",
  path: "/pharmacies-ouvertes",
});

export default function PharmaciesOuvertesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
