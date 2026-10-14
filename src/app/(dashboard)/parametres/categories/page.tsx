"use client";

import { Layers3 } from "lucide-react";

import ProductSetupPanel from "@/components/products/ProductSetupPanel";
import SettingsPageShell from "@/components/settings/SettingsPageShell";

export default function CategoriesSettingsPage() {
  return (
    <SettingsPageShell
      title="Catégories de produits"
      description="Organisez vos produits par catégorie (avec une couleur). Elles servent de filtres dans Produits, Stock et la caisse."
      icon={Layers3}
    >
      {(pharmacy) => (
        <ProductSetupPanel pharmacyId={pharmacy.id} mode="categories" />
      )}
    </SettingsPageShell>
  );
}
