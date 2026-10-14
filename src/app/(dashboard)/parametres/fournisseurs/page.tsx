"use client";

import { Truck } from "lucide-react";

import ProductSetupPanel from "@/components/products/ProductSetupPanel";
import SettingsPageShell from "@/components/settings/SettingsPageShell";

export default function SuppliersSettingsPage() {
  return (
    <SettingsPageShell
      title="Fournisseurs"
      description="Gérez vos fournisseurs une seule fois ici : ils restent disponibles dans les fiches produits et les réceptions de stock."
      icon={Truck}
    >
      {(pharmacy) => (
        <ProductSetupPanel pharmacyId={pharmacy.id} mode="suppliers" />
      )}
    </SettingsPageShell>
  );
}
