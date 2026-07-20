import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "M Pharma",
    short_name: "M Pharma",
    description:
      "Application de gestion multi-pharmacie : produits, stock, ventes, factures et utilisateurs.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0b3b8f",
    categories: ["business", "medical", "productivity"],
    lang: "fr",
    icons: [
      {
        src: "/icons/m-pharma.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/m-pharma.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
