"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Building2,
  CheckCircle2,
  Eye,
  PackageSearch,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCcw,
  Save,
  Trash2,
  Users,
} from "lucide-react";

import DeletePharmacyDialog from "@/components/admin/DeletePharmacyDialog";
import PharmacyDetailsDialog from "@/components/admin/PharmacyDetailsDialog";
import PharmacyEditDialog from "@/components/admin/PharmacyEditDialog";
import PharmacyMembersDialog from "@/components/admin/PharmacyMembersDialog";
import {
  createAdminPharmacy,
  getAdminPharmacies,
  updateAdminPharmacy,
} from "@/services/admin-pharmacies.service";

import type { AdminPharmacy } from "@/types/admin";

type FormState = {
  name: string;
  slug: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
};

const initialForm: FormState = {
  name: "",
  slug: "",
  address: "",
  city: "",
  province: "",
  phone: "",
  email: "",
};

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getPharmacyStatus(pharmacy: AdminPharmacy) {
  if (pharmacy.archived_at) return "archived" as const;
  if (!pharmacy.is_active) return "inactive" as const;
  return "active" as const;
}

export default function AdminPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [busyPharmacyId, setBusyPharmacyId] = useState<string | null>(null);

  const [viewingPharmacy, setViewingPharmacy] = useState<AdminPharmacy | null>(
    null
  );
  const [editingPharmacy, setEditingPharmacy] = useState<AdminPharmacy | null>(
    null
  );
  const [membersPharmacy, setMembersPharmacy] = useState<AdminPharmacy | null>(
    null
  );
  const [deletingPharmacy, setDeletingPharmacy] =
    useState<AdminPharmacy | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadPharmacies() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      setPharmacies(await getAdminPharmacies());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les pharmacies."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPharmacies();
  }, []);

  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let archived = 0;

    for (const pharmacy of pharmacies) {
      const status = getPharmacyStatus(pharmacy);

      if (status === "active") active += 1;
      else if (status === "inactive") inactive += 1;
      else archived += 1;
    }

    return { active, inactive, archived, total: pharmacies.length };
  }, [pharmacies]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => {
      if (field === "name") {
        return {
          ...current,
          name: value,
          slug: current.slug || generateSlug(value),
        };
      }

      return { ...current, [field]: value };
    });
  }

  async function handleCreatePharmacy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createAdminPharmacy(form);

      setSuccessMessage(
        "Pharmacie créée. Ajoutez son responsable depuis la fiche pharmacie."
      );
      setForm(initialForm);
      setIsFormOpen(false);

      await loadPharmacies();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de créer la pharmacie."
      );
    } finally {
      setIsCreating(false);
    }
  }

  function replacePharmacy(updated: AdminPharmacy) {
    setPharmacies((current) =>
      current.map((pharmacy) =>
        pharmacy.id === updated.id ? { ...pharmacy, ...updated } : pharmacy
      )
    );
  }

  async function handleToggleActive(pharmacy: AdminPharmacy) {
    const nextIsActive = !pharmacy.is_active;

    setBusyPharmacyId(pharmacy.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await updateAdminPharmacy(pharmacy.id, {
        isActive: nextIsActive,
      });

      replacePharmacy({ ...pharmacy, ...(result?.pharmacy ?? {}) });

      setSuccessMessage(
        nextIsActive
          ? `« ${pharmacy.name} » réactivée.`
          : `« ${pharmacy.name} » désactivée : ses équipes ne peuvent plus s’y connecter.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de changer le statut de la pharmacie."
      );
    } finally {
      setBusyPharmacyId(null);
    }
  }

  async function handleToggleArchived(pharmacy: AdminPharmacy) {
    const nextArchived = !pharmacy.archived_at;

    setBusyPharmacyId(pharmacy.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await updateAdminPharmacy(pharmacy.id, {
        archived: nextArchived,
      });

      replacePharmacy({ ...pharmacy, ...(result?.pharmacy ?? {}) });

      setSuccessMessage(
        nextArchived
          ? `« ${pharmacy.name} » archivée.`
          : `« ${pharmacy.name} » désarchivée et réactivée.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’archiver la pharmacie."
      );
    } finally {
      setBusyPharmacyId(null);
    }
  }

  function handleDeleted(pharmacyId: string) {
    setPharmacies((current) =>
      current.filter((pharmacy) => pharmacy.id !== pharmacyId)
    );
    setDeletingPharmacy(null);
    setSuccessMessage("Pharmacie et toutes ses données supprimées.");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Super Admin
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
              Pharmacies clientes
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {stats.total} pharmacie(s) · {stats.active} active(s) ·{" "}
              {stats.inactive} désactivée(s) · {stats.archived} archivée(s)
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadPharmacies}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>

            <button
              type="button"
              onClick={() => setIsFormOpen((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800"
            >
              <Plus className="h-5 w-5" />
              Nouvelle pharmacie
            </button>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {isFormOpen && (
        <form
          onSubmit={handleCreatePharmacy}
          className="rounded-[1.5rem] border border-slate-200 bg-white p-6 md:rounded-[2rem]"
        >
          <h3 className="text-2xl font-black text-slate-950">
            Créer une pharmacie
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Créez d’abord la fiche pharmacie, puis ajoutez son responsable
            owner depuis « Modifier » ou la gestion des utilisateurs.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Nom pharmacie *">
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="form-input"
                required
              />
            </FormField>

            <FormField label="Slug *">
              <input
                value={form.slug}
                onChange={(event) =>
                  updateField("slug", generateSlug(event.target.value))
                }
                className="form-input"
                required
              />
            </FormField>

            <FormField label="Adresse">
              <input
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Ville">
              <input
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Province">
              <input
                value={form.province}
                onChange={(event) => updateField("province", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Téléphone">
              <input
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField label="Email pharmacie">
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="form-input"
              />
            </FormField>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {isCreating ? "Création..." : "Créer la pharmacie"}
            </button>
          </div>
        </form>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-slate-400 md:rounded-[2rem]">
            Chargement...
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-slate-400 md:rounded-[2rem]">
            Aucune pharmacie trouvée.
          </div>
        ) : (
          pharmacies.map((pharmacy) => {
            const status = getPharmacyStatus(pharmacy);
            const isBusy = busyPharmacyId === pharmacy.id;

            return (
              <article
                key={pharmacy.id}
                className={`rounded-[1.5rem] border bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6 ${
                  status === "archived"
                    ? "border-slate-100 opacity-70"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                    <Building2 className="h-7 w-7" />
                  </div>

                  <StatusBadge status={status} />
                </div>

                <h3 className="mt-5 text-xl font-black text-slate-950">
                  {pharmacy.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400">{pharmacy.slug}</p>

                <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
                  <HealthTile
                    icon={Users}
                    value={pharmacy.health.activeMembers}
                    label="membres"
                  />
                  <HealthTile
                    icon={PackageSearch}
                    value={pharmacy.health.productsCount}
                    label="produits"
                  />
                  <HealthTile
                    icon={Activity}
                    value={pharmacy.health.salesLast30d}
                    label="ventes 30j"
                  />
                </div>

                <div className="mt-5 space-y-2 text-sm text-slate-500">
                  <p>
                    Ville :{" "}
                    <span className="font-bold text-slate-800">
                      {pharmacy.city || "-"}
                    </span>
                  </p>
                  <p>
                    Pharmacien :{" "}
                    <span className="font-bold text-slate-800">
                      {pharmacy.pharmacist_name || "-"}
                    </span>
                  </p>
                  <p>
                    Taux :{" "}
                    <span className="font-bold text-slate-800">
                      1 USD ={" "}
                      {Number(pharmacy.exchange_rate).toLocaleString("fr-CD")}{" "}
                      CDF
                    </span>
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 border-t border-slate-100 pt-5 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setViewingPharmacy(pharmacy)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" />
                    Voir
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingPharmacy(pharmacy)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={() => setMembersPharmacy(pharmacy)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-100"
                  >
                    <Users className="h-4 w-4" />
                    Utilisateurs
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(pharmacy)}
                    disabled={isBusy}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                      pharmacy.is_active
                        ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                        : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {pharmacy.is_active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                    {pharmacy.is_active ? "Désactiver" : "Réactiver"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleArchived(pharmacy)}
                    disabled={isBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pharmacy.archived_at ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    {pharmacy.archived_at ? "Désarchiver" : "Archiver"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingPharmacy(pharmacy)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-3 py-2.5 text-xs font-black text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      <PharmacyDetailsDialog
        pharmacy={viewingPharmacy}
        onClose={() => setViewingPharmacy(null)}
      />

      <PharmacyEditDialog
        pharmacy={editingPharmacy}
        onClose={() => setEditingPharmacy(null)}
        onUpdated={(updated) => {
          replacePharmacy(updated);
          setEditingPharmacy(null);
          setSuccessMessage(`« ${updated.name} » mise à jour.`);
        }}
      />

      <PharmacyMembersDialog
        pharmacy={membersPharmacy}
        onClose={() => setMembersPharmacy(null)}
      />

      <DeletePharmacyDialog
        pharmacy={deletingPharmacy}
        onClose={() => setDeletingPharmacy(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "active" | "inactive" | "archived";
}) {
  if (status === "archived") {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
        Archivée
      </span>
    );
  }

  if (status === "inactive") {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
        Désactivée
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
      Active
    </span>
  );
}

function HealthTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number;
  label: string;
}) {
  return (
    <div>
      <Icon className="mx-auto h-4 w-4 text-slate-400" />
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
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
