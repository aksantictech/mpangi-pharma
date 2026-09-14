"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Power, PowerOff, UserPlus, Users, X } from "lucide-react";

import { getAdminPharmacyMembers } from "@/services/admin-pharmacies.service";
import {
  createPharmacyMember,
  resetPharmacyMemberPassword,
  updatePharmacyMemberStatus,
} from "@/services/pharmacies.service";

import type { AdminPharmacy } from "@/types/admin";
import type { PharmacyMember } from "@/types/settings";

type PharmacyUserRole =
  | "manager"
  | "pharmacist"
  | "cashier"
  | "stock_manager"
  | "accountant";

type UserForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: PharmacyUserRole;
};

const initialForm: UserForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "cashier",
};

type PharmacyMembersDialogProps = {
  pharmacy: AdminPharmacy | null;
  onClose: () => void;
};

export default function PharmacyMembersDialog({
  pharmacy,
  onClose,
}: PharmacyMembersDialogProps) {
  const [members, setMembers] = useState<PharmacyMember[]>([]);
  const [form, setForm] = useState<UserForm>(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadMembers(pharmacyId: string) {
    setIsLoading(true);
    setErrorMessage("");

    try {
      setMembers(await getAdminPharmacyMembers(pharmacyId));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les utilisateurs."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (pharmacy) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMembers(pharmacy.id);
      setForm(initialForm);
      setIsFormOpen(false);
      setSuccessMessage("");
    } else {
      setMembers([]);
    }
  }, [pharmacy]);

  if (!pharmacy) return null;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pharmacy) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!form.fullName.trim() || !form.email.trim()) {
        throw new Error("Le nom complet et l’email sont obligatoires.");
      }

      if (form.password.length < 12) {
        throw new Error("Le mot de passe doit contenir au moins 12 caractères.");
      }

      await createPharmacyMember({
        pharmacyId: pharmacy.id,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
      });

      setForm(initialForm);
      setIsFormOpen(false);
      setSuccessMessage("Utilisateur ajouté avec succès.");
      await loadMembers(pharmacy.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’ajouter l’utilisateur."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(member: PharmacyMember) {
    if (!pharmacy || member.role === "owner") return;

    setChangingId(member.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updatePharmacyMemberStatus({
        pharmacyId: pharmacy.id,
        memberId: member.id,
        isActive: !member.is_active,
      });

      setSuccessMessage(
        member.is_active ? "Utilisateur désactivé." : "Utilisateur réactivé."
      );
      await loadMembers(pharmacy.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut."
      );
    } finally {
      setChangingId(null);
    }
  }

  async function handleReset(member: PharmacyMember) {
    if (!pharmacy || member.role === "owner") return;

    const password = window.prompt(
      "Nouveau mot de passe temporaire (minimum 12 caractères) :"
    );

    if (!password) return;

    if (password.length < 12) {
      setErrorMessage("Le mot de passe doit contenir au moins 12 caractères.");
      return;
    }

    setChangingId(member.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await resetPharmacyMemberPassword({
        pharmacyId: pharmacy.id,
        memberId: member.id,
        temporaryPassword: password,
      });

      setSuccessMessage(
        "Mot de passe réinitialisé. L’utilisateur devra le modifier à la prochaine connexion."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de réinitialiser le mot de passe."
      );
    } finally {
      setChangingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm md:items-center md:p-8">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl md:rounded-[2rem] md:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />

        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Super Admin
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Utilisateurs — {pharmacy.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        {!isFormOpen && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="mb-5 inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800"
          >
            <UserPlus className="h-5 w-5" />
            Ajouter un utilisateur
          </button>
        )}

        {isFormOpen && (
          <form
            onSubmit={handleCreate}
            className="mb-6 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                className="form-input bg-white"
                placeholder="Nom complet"
                required
              />

              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="form-input bg-white"
                placeholder="Email"
                required
              />

              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className="form-input bg-white"
                placeholder="Téléphone"
              />

              <input
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="form-input bg-white"
                placeholder="Mot de passe temporaire"
                minLength={12}
                required
              />

              <select
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as PharmacyUserRole,
                  }))
                }
                className="form-input bg-white sm:col-span-2"
              >
                <option value="manager">Gérant</option>
                <option value="pharmacist">Pharmacien</option>
                <option value="cashier">Caissier</option>
                <option value="stock_manager">Gestionnaire stock</option>
                <option value="accountant">Comptable</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={isSaving}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {isSaving ? "Création..." : "Créer"}
              </button>
            </div>
          </form>
        )}

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-slate-500">
            {isLoading ? "Chargement..." : `${members.length} compte(s)`}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.map((member) => {
            const editable = member.role !== "owner";
            const isBusy = changingId === member.id;

            return (
              <article
                key={member.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-black text-slate-950">
                      {member.profile?.full_name || "Utilisateur"}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {formatRole(member.role)}
                    </p>
                    <p className="mt-2 truncate text-xs text-slate-500">
                      {member.profile?.email || "Email non renseigné"}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                      member.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {member.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>

                {editable && (
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => void handleReset(member)}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Réinitialiser
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleToggle(member)}
                      disabled={isBusy}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-black disabled:opacity-50 ${
                        member.is_active
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {member.is_active ? (
                        <PowerOff className="h-3.5 w-3.5" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {isBusy
                        ? "Traitement..."
                        : member.is_active
                          ? "Désactiver"
                          : "Réactiver"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {!isLoading && members.length === 0 && (
            <p className="text-sm text-slate-400">Aucun utilisateur.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRole(role: string) {
  const labels: Record<string, string> = {
    owner: "Propriétaire",
    manager: "Gérant",
    pharmacist: "Pharmacien",
    cashier: "Caissier",
    stock_manager: "Gestionnaire stock",
    accountant: "Comptable",
  };

  return labels[role] ?? role;
}
