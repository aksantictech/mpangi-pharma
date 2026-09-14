import type { Pharmacy } from "@/types/pharmacy";

export type PharmacyHealth = {
  activeMembers: number;
  totalMembers: number;
  productsCount: number;
  salesLast30d: number;
};

export type AdminPharmacy = Pharmacy & {
  health: PharmacyHealth;
};

export type AdminOverview = {
  totalPharmacies: number;
  activePharmacies: number;
  inactivePharmacies: number;
  archivedPharmacies: number;
  totalMembers: number;
  totalProducts: number;
  salesLast30d: number;
};
