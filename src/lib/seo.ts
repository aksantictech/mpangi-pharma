export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://mpangi-pharma.app"
).replace(/\/$/, "");

export const SITE_NAME = "Mpangi_Pharma";

export const SITE_DESCRIPTION =
  "Mpangi_Pharma est le logiciel de gestion de pharmacie pensé pour la RDC : stock et lots, expirations, ventes, factures, finances et impression de tickets sur terminal Android. Développé par Aksantic Technology.";

/** Pages publiques indexables (sitemap + liens canoniques). */
export const PUBLIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/forfaits", priority: 0.9, changeFrequency: "monthly" as const },
  {
    path: "/pharmacies-ouvertes",
    priority: 0.8,
    changeFrequency: "daily" as const,
  },
  { path: "/devis-demo", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" as const },
];

export const CONTACT = {
  email: "aksantictech@gmail.com",
  website: "https://aksantictech.com",
  whatsapp: "+243801655726",
};

const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Mpangi_Pharma — logiciel de gestion de pharmacie",
};

/**
 * Métadonnées d'une page publique. Next remplace (et ne fusionne pas)
 * l'objet openGraph du layout parent : sans ce helper, chaque page qui
 * définit son propre openGraph perdrait l'image de partage.
 */
export function pageMetadata({
  title,
  description,
  path,
  ogTitle,
}: {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
}): import("next").Metadata {
  const fullTitle = ogTitle ?? `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "fr_CD",
      siteName: SITE_NAME,
      url: `${SITE_URL}${path}`,
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
