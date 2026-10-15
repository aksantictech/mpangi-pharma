/*
 * Compte « propriétaire réseau » : une personne qui possède plusieurs
 * pharmacies et veut seulement les SUPERVISER (tableau de bord, produits et
 * alertes, expirations, finances, TVA, inventaire), sans la caisse ni les
 * factures.
 *
 * Conception :
 *  - en base, la personne est membre « owner » de chacune de ses pharmacies
 *    (les règles d'accès existantes s'appliquent telles quelles) ;
 *  - un marqueur posé sur le COMPTE par le Super Admin
 *    (app_metadata.account_type = "network_owner", non modifiable par
 *    l'utilisateur) fait afficher un rôle d'interface « network_owner » à la
 *    place de « owner » : menu réduit, écrans en consultation.
 * Ce rôle est donc une vue réduite de l'interface, pas une barrière de
 * sécurité supplémentaire : la personne reste propriétaire de ses pharmacies.
 */

export const NETWORK_OWNER_ROLE = "network_owner";
export const NETWORK_ACCOUNT_TYPE = "network_owner";

/** Rôle affiché dans l'application pour un membre, selon le type de compte. */
export function applyAccountType(
  membershipRole: string,
  accountType: unknown
): string {
  if (accountType === NETWORK_ACCOUNT_TYPE && membershipRole === "owner") {
    return NETWORK_OWNER_ROLE;
  }

  return membershipRole;
}

/** Vrai pour les rôles qui consultent sans modifier (produits, expirations, finances…). */
export function isReadOnlyRole(role: string | null | undefined) {
  return role === NETWORK_OWNER_ROLE;
}
