import PageLoading from "@/components/ui/PageLoading";

// Affiché pendant le chargement d'une page de l'espace pharmacie, dans le cadre
// du menu, pour que la navigation reste fluide.
export default function Loading() {
  return <PageLoading label="Chargement de la page..." variant="list" />;
}
