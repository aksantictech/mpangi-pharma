import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import PwaRegister from "@/components/pwa/PwaRegister";

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
  title: "M Pharma",
  description:
    "Application de gestion multi-pharmacie pour produits, stock, ventes et factures.",
  applicationName: "M Pharma",
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
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
