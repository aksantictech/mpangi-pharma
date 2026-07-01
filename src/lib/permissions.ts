export type PharmacyRole =
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
  | "compte";

const allRoles: PharmacyRole[] = [
  "owner",
  "manager",
  "pharmacist",
  "cashier",
  "stock_manager",
  "accountant",
];

const modulePermissions: Record<AppModule, PharmacyRole[]> = {
  dashboard: allRoles,

  pharmacies: ["owner", "manager"],

  produits: ["owner", "manager", "pharmacist", "stock_manager"],

  stock: ["owner", "manager", "pharmacist", "stock_manager"],

  ventes: ["owner", "manager", "pharmacist", "cashier"],

  factures: ["owner", "manager", "pharmacist", "cashier", "accountant"],
  synchronisation: ["owner", "manager", "pharmacist", "cashier", "stock_manager"],

  expirations: ["owner", "manager", "pharmacist", "stock_manager"],

  finances: ["owner", "manager", "accountant"],

  parametres: ["owner", "manager", "pharmacist"],

  audit: ["owner", "manager"],

  sauvegardes: ["owner", "manager"],

  compte: allRoles,
};

export function normalizeRole(role?: string | null): PharmacyRole | null {
  if (!role) return null;

  if (
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
  if (pathname.startsWith("/synchronisation")) return "synchronisation";

  if (pathname === "/pharmacies" || pathname.startsWith("/pharmacies/")) {
    return "pharmacies";
  }

  if (pathname === "/produits" || pathname.startsWith("/produits/")) {
    return "produits";
  }

  if (pathname === "/stock" || pathname.startsWith("/stock/")) {
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

  if (pathname === "/audit" || pathname.startsWith("/audit/")) {
    return "audit";
  }

  if (
    pathname === "/sauvegardes" ||
    pathname.startsWith("/sauvegardes/")
  ) {
    return "sauvegardes";
  }

  if (pathname === "/compte" || pathname.startsWith("/compte/")) {
    return "compte";
  }

  return null;
}

export function canAccessPath(
  role: string | null | undefined,
  pathname: string,
  isPlatformAdmin = false
) {
  const module = getModuleFromPath(pathname);

  if (!module) return true;

  return canAccessModule(role, module, isPlatformAdmin);
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
  return canAccessModule(role, "audit", isPlatformAdmin);
}

export function canManageBackups(
  role: string | null | undefined,
  isPlatformAdmin = false
) {
  return canAccessModule(role, "sauvegardes", isPlatformAdmin);
}