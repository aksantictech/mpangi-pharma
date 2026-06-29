"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  RefreshCcw,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

import {
  changeCurrentUserPassword,
  getCurrentUserAccount,
} from "@/services/account.service";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);

  async function loadAccount() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
const account = await getCurrentUserAccount();

setEmail(account.email);
setMustChangePassword(account.mustChangePassword);

    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le compte."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();
  }, []);

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
setSuccessMessage("Mot de passe modifié avec succès.");
setMustChangePassword(false);
    setIsSavingPassword(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!currentPassword.trim()) {
        throw new Error("Le mot de passe actuel est obligatoire.");
      }

      if (newPassword.length < 8) {
        throw new Error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      }

      if (newPassword !== newPasswordConfirmation) {
        throw new Error("La confirmation ne correspond pas au nouveau mot de passe.");
      }

      if (currentPassword === newPassword) {
        throw new Error("Le nouveau mot de passe doit être différent de l’ancien.");
      }

      await changeCurrentUserPassword({
        email,
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");

      setSuccessMessage("Mot de passe modifié avec succès.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le mot de passe."
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement du compte...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                Sécurité utilisateur
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Mon compte
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Gérez vos informations de connexion.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAccount}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
{mustChangePassword && (
  <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
    <ShieldCheck className="mt-0.5 h-5 w-5" />
    <div>
      <p>Mot de passe temporaire détecté.</p>
      <p className="mt-1 text-xs leading-5 text-amber-700">
        Pour continuer à utiliser l’application, vous devez définir un nouveau
        mot de passe personnel.
      </p>
    </div>
  </div>
)}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            {successMessage}
          </div>
        )}

        {mustChangePassword && (
  <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
    <ShieldCheck className="mt-0.5 h-5 w-5" />
    <div>
      <p>Mot de passe temporaire détecté.</p>
      <p className="mt-1 text-xs leading-5 text-amber-700">
        Pour continuer à utiliser l’application, vous devez définir un nouveau
        mot de passe personnel.
      </p>
    </div>
  </div>
)}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <form
            onSubmit={handleChangePassword}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <KeyRound className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Changer le mot de passe
                </h2>
                <p className="text-sm text-slate-500">
                  Cette action nécessite votre mot de passe actuel.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <FormField label="Email">
                <input
                  value={email}
                  className="form-input bg-slate-50"
                  disabled
                />
              </FormField>

              <FormField label="Mot de passe actuel">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="form-input"
                  required
                />
              </FormField>

              <FormField label="Nouveau mot de passe">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="form-input"
                  minLength={8}
                  required
                />
              </FormField>

              <FormField label="Confirmer le nouveau mot de passe">
                <input
                  type="password"
                  value={newPasswordConfirmation}
                  onChange={(event) =>
                    setNewPasswordConfirmation(event.target.value)
                  }
                  className="form-input"
                  minLength={8}
                  required
                />
              </FormField>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={isSavingPassword}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldCheck className="h-5 w-5" />
                {isSavingPassword ? "Modification..." : "Modifier le mot de passe"}
              </button>
            </div>
          </form>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700">
              <UserCircle className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-950">
              Bonnes pratiques
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
              <p>• Utilisez au moins 8 caractères.</p>
              <p>• Évitez les mots de passe partagés.</p>
              <p>• Ne donnez pas votre compte à un autre utilisateur.</p>
              <p>• Chaque caissier, pharmacien ou comptable doit avoir son propre accès.</p>
            </div>

            <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-800">
                Recommandation production
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-700">
                Après la première connexion, chaque utilisateur doit changer son
                mot de passe temporaire.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}