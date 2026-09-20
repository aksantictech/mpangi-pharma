import type { Metadata } from "next";

// Page de connexion : utile aux utilisateurs, sans valeur SEO. noindex (et
// pas de Disallow dans robots.txt, sinon Google ne verrait jamais le noindex).
export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: true },
  alternates: { canonical: "/connexion" },
};

export default function ConnexionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
