import type { Pharmacy } from "@/types/pharmacy";
import type { PharmacySubscription } from "@/types/subscription";

export type PharmacyHealth = {
  activeMembers: number;
  totalMembers: number;
  productsCount: number;
  salesLast30d: number;
};

export type AdminPharmacy = Pharmacy & {
  health: PharmacyHealth;
  subscription: PharmacySubscription | null;
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
