import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact — Parlons de votre projet de pharmacie",
  description:
    "Contactez Aksantic Technology pour équiper votre pharmacie avec Mpangi_Pharma : question, devis ou installation à Kinshasa et partout en RDC.",
  path: "/contact",
});

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
