"use client";

import { useState, type FormEvent } from "react";
import { Check, Lock, Save, X } from "lucide-react";

import { canAccessModule, type AppModule } from "@/lib/permissions";
import {
  updatePharmacyMember,
  type UpdatePharmacyMemberPayload,
} from "@/services/pharmacies.service";

import type { PharmacyMember } from "@/types/settings";

type MemberRole = UpdatePharmacyMemberPayload["role"];

const roleOptions: { value: MemberRole; label: string }[] = [
  { value: "manager", label: "Gérant" },
  { value: "pharmacist", label: "Pharmacien" },
  { value: "cashier", label: "Caissier" },
  { value: "stock_manager", label: "Gestionnaire stock" },
  { value: "accountant", label: "Comptable" },
];

// Modules affichés dans le récapitulatif des droits, dans l'ordre du menu.
const moduleLabels: { module: AppModule; label: string }[] = [
  { module: "dashboard", label: "Tableau de bord" },
  { module: "ventes", label: "Caisse / Ventes" },
  { module: "produits", label: "Produits" },
  { module: "stock", label: "Stock et Stock voisin" },
  { module: "inventaire", label: "Inventaire" },
  { module: "expirations", label: "Expirations" },
  { module: "trousse", label: "Trousse de secours" },
  { module: "factures", label: "Factures" },
  { module: "finances", label: "Finances et rapport TVA" },
  { module: "synchronisation", label: "Synchronisation" },
  { module: "parametres", label: "Paramètres (utilisateurs, prix, modes de paiement…)" },
  { module: "pharmacies", label: "Pharmacies" },
];

/**
 * Modification d'un membre : nom, téléphone et rôle. Les droits ne sont pas
 * réglés personne par personne : ils découlent du rôle (et sont appliqués par
 * la base de données). Le récapitulatif montre ce que le rôle choisi permet.
 */
export default function EditMemberDialog({
  member,
  pharmacyId,
  canAssignManager,
  onClose,
  onSaved,
}: {
  member: PharmacyMember;
  pharmacyId: string;
  /** Seul le propriétaire (ou le Super Admin) peut attribuer le rôle de gérant. */
  canAssignManager: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [fullName, setFullName] = useState(member.profile?.full_name ?? "");
  const [phone, setPhone] = useState(member.profile?.phone ?? "");
  const [role, setRole] = useState<MemberRole>(member.role as MemberRole);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const roleChanged = role !== member.role;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fullName.trim()) {
      setErrorMessage("Le nom complet est obligatoire.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      await updatePharmacyMember({
        pharmacyId,
        memberId: member.id,
        fullName,
        phone,
        role,
        // Le statut Actif / Inactif se change avec son propre bouton.
        isActive: member.is_active,
      });

      onSaved(
        roleChanged
          ? "Utilisateur modifié. Son nouveau rôle s’applique dans la minute, ou à sa prochaine connexion."
          : "Utilisateur modifié."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier l’utilisateur."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Modifier l’utilisateur"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Modifier l’utilisateur
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {member.profile?.email || "Email non renseigné"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Nom complet *
            </span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="form-input"
              maxLength={120}
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Téléphone
            </span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="form-input"
              maxLength={40}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Rôle
            </span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as MemberRole)}
              className="form-input"
            >
              {roleOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.value === "manager" && !canAssignManager}
                >
                  {option.label}
                  {option.value === "manager" && !canAssignManager
                    ? " (réservé au propriétaire)"
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <section
            aria-label="Droits du rôle"
            className="rounded-3xl border border-blue-100 bg-blue-50 p-4"
          >
            <p className="text-sm font-black text-blue-950">
              Ce rôle donne accès à :
            </p>

            <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {moduleLabels.map(({ module, label }) => {
                const allowed = canAccessModule(role, module);

                return (
                  <li
                    key={module}
                    className={`flex items-center gap-2 text-sm ${
                      allowed
                        ? "font-bold text-blue-950"
                        : "text-slate-500 line-through decoration-slate-300"
                    }`}
                  >
                    {allowed ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    {label}
                  </li>
                );
              })}
            </ul>

            <p className="mt-3 text-xs leading-5 text-blue-800">
              Les droits dépendent uniquement du rôle : ils ne se règlent pas
              personne par personne. Seul le propriétaire peut nommer un gérant.
            </p>
          </section>

          {roleChanged && (
            <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Le rôle passe de{" "}
              <strong>{labelOf(member.role)}</strong> à{" "}
              <strong>{labelOf(role)}</strong>. Les accès changent pour cette
              personne dès l’enregistrement.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function labelOf(role: string) {
  return (
    roleOptions.find((option) => option.value === role)?.label ??
    (role === "owner" ? "Propriétaire" : role)
  );
}
