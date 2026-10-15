import assert from "node:assert/strict";
import test from "node:test";

import { canAccessModule } from "./permissions";
import {
  applyAccountType,
  isReadOnlyRole,
  NETWORK_ACCOUNT_TYPE,
  NETWORK_OWNER_ROLE,
} from "./account-type";

test("un compte réseau voit son rôle « owner » remplacé par network_owner", () => {
  assert.equal(applyAccountType("owner", NETWORK_ACCOUNT_TYPE), NETWORK_OWNER_ROLE);
});

test("les autres rôles et les comptes ordinaires ne changent pas", () => {
  assert.equal(applyAccountType("owner", undefined), "owner");
  assert.equal(applyAccountType("owner", "autre"), "owner");
  assert.equal(applyAccountType("cashier", NETWORK_ACCOUNT_TYPE), "cashier");
  assert.equal(applyAccountType("manager", NETWORK_ACCOUNT_TYPE), "manager");
});

test("seul network_owner est en lecture seule", () => {
  assert.equal(isReadOnlyRole(NETWORK_OWNER_ROLE), true);
  assert.equal(isReadOnlyRole("owner"), false);
  assert.equal(isReadOnlyRole(null), false);
});

test("propriétaire réseau : supervision oui, caisse et factures non", () => {
  const allowed = ["dashboard", "produits", "expirations", "finances", "inventaire", "reseau", "aide", "compte"] as const;
  const denied = ["ventes", "factures", "stock", "parametres", "trousse", "synchronisation", "pharmacies"] as const;

  for (const module of allowed) {
    assert.equal(canAccessModule(NETWORK_OWNER_ROLE, module), true, `${module} devrait être autorisé`);
  }

  for (const module of denied) {
    assert.equal(canAccessModule(NETWORK_OWNER_ROLE, module), false, `${module} devrait être refusé`);
  }
});

test("le propriétaire ordinaire garde tous ses accès", () => {
  for (const module of ["ventes", "factures", "stock", "parametres", "finances", "inventaire"] as const) {
    assert.equal(canAccessModule("owner", module), true);
  }
});
