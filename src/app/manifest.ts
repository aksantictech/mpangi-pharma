import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mpangi_Pharma",
    short_name: "Mpangi",
    description:
      "Application de gestion multi-pharmacie : produits, stock, ventes, factures et utilisateurs.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#1d4ed8",
    categories: ["business", "medical", "productivity"],
    lang: "fr",
    icons: [
  {
    src: "/icons/icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icons/icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icons/maskable-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
],
  };
}