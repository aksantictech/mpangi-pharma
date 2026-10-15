export type PharmacyRole =
  | "network_owner"
  | "owner"
  | "manager"
  | "pharmacist"
  | "cashier"
  | "stock_manager"
  | "accountant";

export type AppModule =
  | "dashboard"
  | "pharmacies"
  | "produits"
  | "stock"
  | "ventes"
  | "factures"
  | "expirations"
  | "finances"
  | "parametres"
  | "audit"
  | "sauvegardes"
  | "synchronisation"
  | "compte"
  | "abonnement"
  | "trousse"
  | "inventaire"
  | "aide"
  | "reseau";

const allRoles: PharmacyRole[] = [
  "owner",
  "manager",
  "pharmacist",
  "cashier",
  "stock_manager",
  "accountant",
];

// Propriétaire réseau (voir lib/account-type.ts) : supervision en consultation.
const withNetworkOwner: PharmacyRole[] = [...allRoles, "network_owner"];

const modulePermissions: Record<AppModule, PharmacyRole[]> = {
  dashboard: withNetworkOwner,

  pharmacies: ["owner", "manager"],

  // Vue d'ensemble de plusieurs pharmacies (l'entrée de menu n'apparaît que
  // si la personne en a au moins deux).
  reseau: ["owner", "manager", "network_owner"],

  produits: ["owner", "manager", "pharmacist", "stock_manager", "network_owner"],

  stock: ["owner", "manager", "pharmacist", "stock_manager"],

  ventes: ["owner", "manager", "pharmacist", "cashier"],

  factures: ["owner", "manager", "pharmacist", "cashier", "accountant"],

  synchronisation: [
    "owner",
    "manager",
    "pharmacist",
    "cashier",
    "stock_manager",
  ],

  expirations: ["owner", "manager", "pharmacist", "stock_manager", "network_owner"],

  finances: ["owner", "manager", "accountant", "network_owner"],

  // Les paramètres de la pharmacie sont réservés au propriétaire
  // et au gérant. Le super administrateur passe par le bypass
  // isPlatformAdmin dans canAccessModule.
  parametres: ["owner", "manager"],

  // Audit et sauvegardes sont désormais réservés au super admin.
  audit: [],

  sauvegardes: [],

  compte: withNetworkOwner,

  // Tout le monde doit pouvoir voir l'état de l'abonnement (jours
  // restants, blocage) ; seuls owner/manager peuvent déclarer un paiement
  // (imposé côté RLS, voir subscription_payments_insert_by_owners_managers).
  abonnement: withNetworkOwner,

  // Trousse de secours (réquisitions pendant les gardes) : ouverte à tous les
  // rôles, car chaque membre de l'équipe de garde peut avoir à enregistrer un
  // prélèvement. L'annulation reste réservée côté base de données.
  trousse: allRoles,

  // Inventaire (situation du stock, valorisation, impression) : réservé à la
  // direction et au pharmacien, qui engagent la responsabilité du stock.
  inventaire: ["owner", "manager", "pharmacist", "network_owner"],

  // Guides pratiques : utiles à tous les rôles.
  aide: withNetworkOwner,
};

export function normalizeRole(role?: string | null): PharmacyRole | null {
  if (!role) return null;

  if (
    role === "network_owner" ||
    role === "owner" ||
    role === "manager" ||
    role === "pharmacist" ||
    role === "cashier" ||
    role === "stock_manager" ||
    role === "accountant"
  ) {
    return role;
  }

  return null;
}

export function canAccessModule(
  role: string | null | undefined,
  module: AppModule,
  isPlatformAdmin = false
) {
  if (isPlatformAdmin) return true;

  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return module === "dashboard";
  }

  return modulePermissions[module].includes(normalizedRole);
}

export function getModuleFromPath(pathname: string): AppModule | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "dashboard";
  }

  if (pathname.startsWith("/synchronisation")) {
    return "synchronisation";
  }

  if (pathname === "/pharmacies" || pathname.startsWith("/pharmacies/")) {
    return "pharmacies";
  }

  if (pathname === "/produits" || pathname.startsWith("/produits/")) {
    return "produits";
  }

  if (
    pathname === "/stock" ||
    pathname.startsWith("/stock/") ||
    pathname === "/stock-voisin" ||
    pathname.startsWith("/stock-voisin/")
  ) {
    return "stock";
  }

  if (pathname === "/ventes" || pathname.startsWith("/ventes/")) {
    return "ventes";
  }

  if (pathname === "/factures" || pathname.startsWith("/factures/")) {
    return "factures";
  }

  if (pathname === "/expirations" || pathname.startsWith("/expirations/")) {
    return "expirations";
  }

  if (pathname === "/finances" || pathname.startsWith("/finances/")) {
    return "finances";
  }

  if (pathname === "/parametres" || pathname.startsWith("/parametres/")) {
    return "parametres";
  }

  if (pathname === "/compte" || pathname.startsWith("/compte/")) {
    return "compte";
  }

  if (pathname === "/abonnement" || pathname.startsWith("/abonnement/")) {
    return "abonnement";
  }

  if (pathname === "/trousse" || pathname.startsWith("/trousse/")) {
    return "trousse";
  }

  if (pathname === "/inventaire" || pathname.startsWith("/inventaire/")) {
    return "inventaire";
  }

  if (pathname === "/aide" || pathname.startsWith("/aide/")) {
    return "aide";
  }

  if (pathname === "/reseau" || pathname.startsWith("/reseau/")) {
    return "reseau";
  }

  return null;
}

// "audit" et "sauvegardes" vivent désormais sous /admin/audit et
// /admin/sauvegardes, protégés par requirePlatformAdmin() côté serveur
// ((admin)/admin/layout.tsx) — plus besoin de garde spécifique ici.
export function canAccessPath(
  role: string | null | undefined,
  pathname: string,
  isPlatformAdmin = false
) {
  const appModule = getModuleFromPath(pathname);

  if (!appModule) return true;

  return canAccessModule(role, appModule, isPlatformAdmin);
}

export function canManageUsers(
  role: string | null | undefined,
  isPlatformAdmin = false
) {
  if (isPlatformAdmin) return true;

  const normalizedRole = normalizeRole(role);

  return normalizedRole === "owner" || normalizedRole === "manager";
}

export function canEditPharmacySettings(
  role: string | null | undefined,
  isPlatformAdmin = false
) {
  if (isPlatformAdmin) return true;

  const normalizedRole = normalizeRole(role);

  return normalizedRole === "owner" || normalizedRole === "manager";
}

export function canSell(
  role: string | null | undefined,
  isPlatformAdmin = false
) {
  return canAccessModule(role, "ventes", isPlatformAdmin);
}

export function canManageStock(
  role: string | null | undefined,
  isPlatformAdmin = false
) {
  return canAccessModule(role, "stock", isPlatformAdmin);
}

export function canViewFinances(
  role: string | null | undefined,
  isPlatformAdmin = false
) {
  return canAccessModule(role, "finances", isPlatformAdmin);
}

export function canViewAudit(
  role: string | null | undefined,
  isPlatformAdmin = false
) {
  return isPlatformAdmin;
}

export function canManageBackups(
  role: string | null | undefined,
  isPlatformAdmin = false
) {
  return isPlatformAdmin;
}
