export type NetworkOwnerAccount = {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  lastSignInAt: string | null;
  pharmacyIds: string[];
};

export type CreateNetworkOwnerPayload = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  pharmacyIds: string[];
};

export type UpdateNetworkOwnerPayload = {
  userId: string;
  fullName?: string;
  phone?: string;
  pharmacyIds?: string[];
  temporaryPassword?: string;
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getNetworkOwners(): Promise<NetworkOwnerAccount[]> {
  const response = await fetch("/api/admin/network-owners", {
    method: "GET",
    cache: "no-store",
  });

  const result = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(result?.message || "Erreur chargement des comptes réseau.");
  }

  return (result?.owners ?? []) as NetworkOwnerAccount[];
}

export async function createNetworkOwner(payload: CreateNetworkOwnerPayload) {
  const response = await fetch("/api/admin/network-owners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(result?.message || "Erreur création du compte réseau.");
  }

  return result;
}

export async function updateNetworkOwner(payload: UpdateNetworkOwnerPayload) {
  const response = await fetch("/api/admin/network-owners", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(result?.message || "Erreur modification du compte réseau.");
  }

  return result;
}
