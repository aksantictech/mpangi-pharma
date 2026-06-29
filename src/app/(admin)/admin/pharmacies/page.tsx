"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Plus,
  RefreshCcw,
  Save,
} from "lucide-react";

type AdminPharmacy = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  pharmacist_name: string | null;
  exchange_rate: number;
  is_active: boolean;
  created_at: string;
  members?: {
    id: string;
    role: string;
    is_active: boolean;
    profile?: {
      id: string;
      full_name: string | null;
      phone: string | null;
    } | null;
  }[];
};

type FormState = {
  name: string;
  slug: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  pharmacistName: string;
  exchangeRate: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword: string;
};

const initialForm: FormState = {
  name: "",
  slug: "",
  address: "",
  city: "",
  province: "",
  phone: "",
  email: "",
  pharmacistName: "",
  exchangeRate: "2800",
  ownerFullName: "",
  ownerEmail: "",
  ownerPassword: "ChangeMe@2026!",
};

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function AdminPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadPharmacies() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/pharmacies", {
        method: "GET",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erreur chargement pharmacies.");
      }

      setPharmacies(result.pharmacies ?? []);
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
    loadPharmacies();
  }, []);

  const activeCount = useMemo(
    () => pharmacies.filter((pharmacy) => pharmacy.is_active).length,
    [pharmacies]
  );

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => {
      if (field === "name") {
        return {
          ...current,
          name: value,
          slug: current.slug || generateSlug(value),
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  async function handleCreatePharmacy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/pharmacies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          address: form.address,
          city: form.city,
          province: form.province,
          phone: form.phone,
          email: form.email,
          pharmacistName: form.pharmacistName,
          exchangeRate: Number(form.exchangeRate || 2800),
          ownerFullName: form.ownerFullName,
          ownerEmail: form.ownerEmail,
          ownerPassword: form.ownerPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erreur création pharmacie.");
      }

      setSuccessMessage("Pharmacie créée avec son responsable owner.");
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

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
              Super Admin
            </p>

            <h2 className="mt-2 text-3xl font-black">Pharmacies clientes</h2>

            <p className="mt-2 text-sm text-white/60">
              {pharmacies.length} pharmacie(s), dont {activeCount} active(s).
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadPharmacies}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white/80 hover:bg-white/10"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>

            <button
              type="button"
              onClick={() => setIsFormOpen((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Nouvelle pharmacie
            </button>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5" />
          {successMessage}
        </div>
      )}

      {isFormOpen && (
        <form
          onSubmit={handleCreatePharmacy}
          className="rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950"
        >
          <h3 className="text-2xl font-black">Créer une pharmacie</h3>

          <p className="mt-1 text-sm text-slate-500">
            La pharmacie sera créée avec un premier responsable owner.
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

            <FormField label="Pharmacien responsable">
              <input
                value={form.pharmacistName}
                onChange={(event) =>
                  updateField("pharmacistName", event.target.value)
                }
                className="form-input"
              />
            </FormField>

            <FormField label="Taux USD → CDF">
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.exchangeRate}
                onChange={(event) =>
                  updateField("exchangeRate", event.target.value)
                }
                className="form-input"
              />
            </FormField>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="font-black text-slate-950">
              Responsable owner de la pharmacie
            </h4>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="Nom responsable *">
                <input
                  value={form.ownerFullName}
                  onChange={(event) =>
                    updateField("ownerFullName", event.target.value)
                  }
                  className="form-input"
                  required
                />
              </FormField>

              <FormField label="Email responsable *">
                <input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(event) =>
                    updateField("ownerEmail", event.target.value)
                  }
                  className="form-input"
                  required
                />
              </FormField>

              <FormField label="Mot de passe initial *">
                <input
                  value={form.ownerPassword}
                  onChange={(event) =>
                    updateField("ownerPassword", event.target.value)
                  }
                  className="form-input"
                  required
                />
              </FormField>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {isCreating ? "Création..." : "Créer la pharmacie"}
            </button>
          </div>
        </form>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-white/60">
            Chargement...
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-white/60">
            Aucune pharmacie trouvée.
          </div>
        ) : (
          pharmacies.map((pharmacy) => (
            <article
              key={pharmacy.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-600">
                  <Building2 className="h-7 w-7" />
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    pharmacy.is_active
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-red-500/10 text-red-300"
                  }`}
                >
                  {pharmacy.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <h3 className="mt-5 text-xl font-black">{pharmacy.name}</h3>

              <p className="mt-1 text-sm text-white/50">{pharmacy.slug}</p>

              <div className="mt-5 space-y-2 text-sm text-white/70">
                <p>
                  Ville :{" "}
                  <span className="font-bold text-white">
                    {pharmacy.city || "-"}
                  </span>
                </p>

                <p>
                  Province :{" "}
                  <span className="font-bold text-white">
                    {pharmacy.province || "-"}
                  </span>
                </p>

                <p>
                  Pharmacien :{" "}
                  <span className="font-bold text-white">
                    {pharmacy.pharmacist_name || "-"}
                  </span>
                </p>

                <p>
                  Taux :{" "}
                  <span className="font-bold text-white">
                    1 USD ={" "}
                    {Number(pharmacy.exchange_rate).toLocaleString("fr-CD")} CDF
                  </span>
                </p>

                <p>
                  Membres :{" "}
                  <span className="font-bold text-white">
                    {pharmacy.members?.length || 0}
                  </span>
                </p>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
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