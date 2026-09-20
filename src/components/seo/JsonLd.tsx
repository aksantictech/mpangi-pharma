/**
 * Injecte des données structurées schema.org. Le contenu est toujours
 * construit côté serveur à partir de constantes du dépôt (jamais de saisie
 * utilisateur) ; on échappe "<" pour qu'aucune chaîne ne puisse fermer la
 * balise <script>.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
