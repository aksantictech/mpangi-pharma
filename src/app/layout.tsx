import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import PwaRegister from "@/components/pwa/PwaRegister";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Logiciel de gestion de pharmacie en RDC | Mpangi_Pharma",
    template: "%s | Mpangi_Pharma",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Mpangi_Pharma",
  authors: [{ name: "Aksantic Technology", url: "https://aksantictech.com" }],
  creator: "Aksantic Technology",
  keywords: [
    "logiciel de gestion de pharmacie",
    "logiciel pharmacie RDC",
    "gestion de stock pharmacie Kinshasa",
    "application pharmacie Android",
    "facturation pharmacie",
    "pharmacie ouverte Kinshasa",
  ],
  alternates: { canonical: "/" },
  // Vérification de propriété Google Search Console (balise HTML).
  verification: { google: "LYUWMedsM-Nx_4vfvtuFSAkoBkFmkxI4cms49UxwFQo" },
  openGraph: {
    type: "website",
    locale: "fr_CD",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "Logiciel de gestion de pharmacie en RDC | Mpangi_Pharma",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Logiciel de gestion de pharmacie en RDC | Mpangi_Pharma",
    description: SITE_DESCRIPTION,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/m-pharma.svg",
    shortcut: "/icons/m-pharma.svg",
    apple: "/icons/m-pharma.svg",
  },
  appleWebApp: {
    capable: true,
    title: "M Pharma",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b3b8f",
  width: "device-width",
  initialScale: 1,
  // Pas de maximumScale : bloquer le zoom est un défaut d'accessibilité
  // (Lighthouse) et empêche les personnes malvoyantes d'agrandir la page.
};

// Applique le thème mémorisé avant le premier affichage pour éviter un éclair
// de page claire. Sans effet hors de l'espace pharmacie (voir theme-dark.css).
const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("mpangi_theme")==="dark"){document.documentElement.dataset.theme="dark"}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Les variables de police doivent être sur <html> : globals.css les lit sur
    // html { font-family: var(--font-geist-sans) }. Posées sur <body>, elles
    // n'existaient pas à ce niveau et le navigateur retombait sur sa police
    // par défaut à empattements.
    // suppressHydrationWarning : le script ci-dessous pose data-theme avant
    // l'hydratation (choix clair/sombre mémorisé), ce que React verrait sinon
    // comme une différence avec le HTML serveur.
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
