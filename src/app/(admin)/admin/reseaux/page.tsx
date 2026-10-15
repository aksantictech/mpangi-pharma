"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Network, Pencil, Plus, RefreshCcw, Save, X } from "lucide-react";

import { getAdminPharmacies } from "@/services/admin-pharmacies.service";
import {
  createNetworkOwner,
  getNetworkOwners,
  updateNetworkOwner,
  type NetworkOwnerAccount,
} from "@/services/network-owners.service";

import type { AdminPharmacy } from "@/types/admin";

type FormState = {
  userId: string | null;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  pharmacyIds: string[];
};

const emptyForm: FormState = {
  userId: null,
  fullName: "",
  email: "",
  phone: "",
  password: "",
  pharmacyIds: [],
};

export default function AdminNetworkOwnersPage() {
  const [owners, setOwners] = useState<NetworkOwnerAccount[]>([]);
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [ownersResult, pharmaciesResult] = await Promise.all([
        getNetworkOwners(),
        getAdminPharmacies(),
      ]);

      setOwners(ownersResult);
      setPharmacies(pharmaciesResult.filter((pharmacy) => !pharmacy.archived_at));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les comptes réseau."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  function pharmacyName(id: string) {
    return pharmacies.find((pharmacy) => pharmacy.id === id)?.name ?? "Pharmacie";
  }

  function openCreate() {
    setFormError("");
    setForm({ ...emptyForm });
  }

  function openEdit(owner: NetworkOwnerAccount) {
    setFormError("");
    setForm({
      userId: owner.userId,
      fullName: owner.fullName,
      email: owner.email,
      phone: owner.phone ?? "",
      password: "",
      pharmacyIds: owner.pharmacyIds,
    });
  }

  function togglePharmacy(id: string) {
    setForm((current) =>
      current
        ? {
            ...current,
            pharmacyIds: current.pharmacyIds.includes(id)
              ? current.pharmacyIds.filter((item) => item !== id)
              : [...current.pharmacyIds, id],
          }
        : current
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) return;

    if (!form.fullName.trim()) {
      setFormError("Le nom complet est obligatoire.");
      return;
    }

    if (form.pharmacyIds.length === 0) {
      setFormError("Choisissez au moins une pharmacie.");
      return;
    }

    if (!form.userId && form.password.length < 12) {
      setFormError("Le mot de passe temporaire doit contenir au moins 12 caractères.");
      return;
    }

    if (form.userId && form.password && form.password.length < 12) {
      setFormError("Le nouveau mot de passe doit contenir au moins 12 caractères.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      if (form.userId) {
        await updateNetworkOwner({
          userId: form.userId,
          fullName: form.fullName,
          phone: form.phone,
          pharmacyIds: form.pharmacyIds,
          temporaryPassword: form.password || undefined,
        });
      } else {
        await createNetworkOwner({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          pharmacyIds: form.pharmacyIds,
        });
      }

      setSuccessMessage(
        form.userId
          ? "Compte réseau mis à jour."
          : "Compte réseau créé. Communiquez-lui son email et le mot de passe temporaire : il devra le changer à la première connexion."
      );
      setForm(null);
      await loadData();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Impossible d’enregistrer."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-5xl space-y-5 md:space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:rounded-[2rem] md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Network className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-950">
                Comptes propriétaire réseau
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Un propriétaire de plusieurs pharmacies supervise son réseau :
                tableau de bord, produits et alertes, expirations, finances,
                TVA et inventaire. Il n’a ni la caisse, ni les factures.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              aria-label="Actualiser"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCcw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800"
            >
              <Plus className="h-5 w-5" />
              Nouveau compte
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {successMessage}
          </div>
        )}

        <section className="space-y-3">
          {!isLoading && owners.length === 0 && !errorMessage && (
            <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              Aucun compte réseau pour le moment.
            </p>
          )}

          {owners.map((owner) => (
            <article
              key={owner.userId}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-slate-950">
                    {owner.fullName || "Sans nom"}
                  </h2>
                  <p className="truncate text-sm text-slate-500">{owner.email}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {owner.lastSignInAt
                      ? `Dernière connexion : ${new Date(owner.lastSignInAt).toLocaleString("fr-CD")}`
                      : "Jamais connecté"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(owner)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Modifier
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {owner.pharmacyIds.length === 0 ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    Aucune pharmacie
                  </span>
                ) : (
                  owner.pharmacyIds.map((id) => (
                    <span
                      key={id}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800"
                    >
                      {pharmacyName(id)}
                    </span>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>
      </div>

      {form && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm md:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={form.userId ? "Modifier le compte réseau" : "Nouveau compte réseau"}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl md:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-black text-slate-950">
                {form.userId ? "Modifier le compte réseau" : "Nouveau compte réseau"}
              </h2>

              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label="Fermer"
                className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Nom complet *
                </span>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  className="form-input"
                  maxLength={120}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Email *
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="form-input"
                  maxLength={254}
                  disabled={Boolean(form.userId)}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Téléphone
                </span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="form-input"
                  maxLength={40}
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <KeyRound className="h-4 w-4" />
                  {form.userId
                    ? "Nouveau mot de passe temporaire (laisser vide pour ne pas changer)"
                    : "Mot de passe temporaire * (12 caractères minimum)"}
                </span>
                <input
                  type="text"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="form-input"
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-bold text-slate-700">
                  Pharmacies accessibles * ({form.pharmacyIds.length} choisie
                  {form.pharmacyIds.length > 1 ? "s" : ""})
                </legend>

                <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 sm:grid-cols-2">
                  {pharmacies.map((pharmacy) => (
                    <label
                      key={pharmacy.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.pharmacyIds.includes(pharmacy.id)}
                        onChange={() => togglePharmacy(pharmacy.id)}
                        className="h-5 w-5"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-900">
                          {pharmacy.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {pharmacy.city || "—"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
                Cette personne est enregistrée comme propriétaire de chaque
                pharmacie choisie, avec une interface de supervision (sans
                caisse ni factures). Retirer une pharmacie désactive son accès à
                celle-ci sans rien supprimer.
              </p>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setForm(null)}
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
      )}
    </main>
  );
}
