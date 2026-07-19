 "use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCcw,
  UserPlus,
  Users,
} from "lucide-react";

import { canManageUsers } from "@/lib/permissions";
import {
  createPharmacyMember,
  getCurrentPharmacy,
  getPharmacyMembers,
  resetPharmacyMemberPassword,
  updatePharmacyMember,
} from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
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
  password: "ChangeMe@2026!",
  role: "cashier",
};

export default function UsersSettingsPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [members, setMembers] = useState<PharmacyMember[]>([]);
  const [form, setForm] = useState<UserForm>(initialForm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const current = await getCurrentPharmacy();

      if (!current) {
        setPharmacy(null);
        setMembers([]);
        return;
      }

      const memberData = await getPharmacyMembers(current.id);
      setPharmacy(current);
      setMembers(memberData);
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
    void loadData();
  }, []);

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

      if (form.password.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
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
      setIsDialogOpen(false);
      setSuccessMessage("Utilisateur ajouté avec succès.");
      await loadData();
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

    const nextStatus = !member.is_active;
    const confirmed = window.confirm(
      nextStatus
        ? "Réactiver cet utilisateur ?"
        : "Désactiver cet utilisateur ?"
    );

    if (!confirmed) return;

    setChangingId(member.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updatePharmacyMember({
        pharmacyId: pharmacy.id,
        memberId: member.id,
        fullName: member.profile?.full_name || "Utilisateur",
        phone: member.profile?.phone || "",
        role: member.role as PharmacyUserRole,
        isActive: nextStatus,
      });

      setSuccessMessage(
        nextStatus ? "Utilisateur réactivé." : "Utilisateur désactivé."
      );
      await loadData();
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
      "Nouveau mot de passe temporaire (minimum 8 caractères) :",
      "ChangeMe@2026!"
    );

    if (!password) return;

    if (password.length < 8) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement des utilisateurs...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-800">
            Aucune pharmacie active
          </h1>
        </div>
      </main>
    );
  }

  const canManage = canManageUsers(pharmacy.role);

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <Link
                href="/parametres"
                className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour aux paramètres
              </Link>

              <h1 className="mt-3 text-2xl font-black text-slate-950 md:text-3xl">
                Utilisateurs
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Gestion des comptes liés à {pharmacy.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void loadData()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
              >
                <RefreshCcw className="h-5 w-5" />
                Actualiser
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
                >
                  <UserPlus className="h-5 w-5" />
                  Ajouter
                </button>
              )}
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Membres de la pharmacie
              </h2>
              <p className="text-sm text-slate-500">
                {members.length} compte(s) trouvé(s).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {members.map((member) => {
              const editable = canManage && member.role !== "owner";

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
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {member.profile?.phone || "Téléphone non renseigné"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
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
                        disabled={changingId === member.id}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 disabled:opacity-50"
                      >
                        Réinitialiser
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggle(member)}
                        disabled={changingId === member.id}
                        className={`rounded-2xl px-3 py-3 text-xs font-black disabled:opacity-50 ${
                          member.is_active
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {changingId === member.id
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
          </div>
        </section>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm md:items-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl md:p-6">
            <h2 className="text-2xl font-black text-slate-950">
              Ajouter un utilisateur
            </h2>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <input
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                className="form-input"
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
                className="form-input"
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
                className="form-input"
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
                className="form-input"
                placeholder="Mot de passe temporaire"
                minLength={8}
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
                className="form-input"
              >
                <option value="manager">Gérant</option>
                <option value="pharmacist">Pharmacien</option>
                <option value="cashier">Caissier</option>
                <option value="stock_manager">Gestionnaire stock</option>
                <option value="accountant">Comptable</option>
              </select>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700"
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
          </div>
        </div>
      )}
    </main>
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
