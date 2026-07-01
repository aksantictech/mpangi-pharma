"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Store,
  UserRound,
  X,
} from "lucide-react";

import {
  createPharmacy,
  generateSlug,
  getMyPharmacies,
  isCurrentUserPlatformAdmin,
} from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";

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
};

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<PharmacyWithRole[]>([]);
  const [canCreatePharmacy, setCanCreatePharmacy] = useState(false);

  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [form, setForm] = useState<FormState>(initialForm);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadPharmacies() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [data, isPlatformAdmin] = await Promise.all([
        getMyPharmacies(),
        isCurrentUserPlatformAdmin(),
      ]);

      setPharmacies(data);
      setCanCreatePharmacy(isPlatformAdmin);
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

  const hasPharmacies = pharmacies.length > 0;

  const pageDescription = useMemo(() => {
    if (!hasPharmacies) {
      return "Créez votre première pharmacie pour commencer à gérer les produits, stocks, ventes et factures.";
    }

    return "Gérez les pharmacies associées à votre compte.";
  }, [hasPharmacies]);

  const filteredPharmacies = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) return pharmacies;

    return pharmacies.filter((pharmacy) => {
      const value = [
        pharmacy.name,
        pharmacy.slug,
        pharmacy.address,
        pharmacy.city,
        pharmacy.province,
        pharmacy.phone,
        pharmacy.email,
        pharmacy.pharmacist_name,
        pharmacy.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return value.includes(normalized);
    });
  }, [pharmacies, search]);

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

  function closeDialog() {
    if (isCreating) return;

    setIsDialogOpen(false);
    setForm(initialForm);
  }

  async function handleCreatePharmacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreating(true);
    setErrorMessage("");

    try {
      if (!form.name.trim()) {
        throw new Error("Le nom de la pharmacie est obligatoire.");
      }

      if (!form.slug.trim()) {
        throw new Error("Le slug de la pharmacie est obligatoire.");
      }

      const exchangeRate = Number(form.exchangeRate || 0);

      if (exchangeRate <= 0) {
        throw new Error("Le taux de change doit être supérieur à zéro.");
      }

      await createPharmacy({
        name: form.name,
        slug: form.slug,
        address: form.address,
        city: form.city,
        province: form.province,
        phone: form.phone,
        email: form.email,
        pharmacistName: form.pharmacistName,
        exchangeRate,
      });

      setForm(initialForm);
      setIsDialogOpen(false);
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
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm md:tracking-[0.2em]">
                Mpangi_Pharma
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
                Pharmacies
              </h1>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 md:mt-2 md:text-sm md:leading-6">
                {pageDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={loadPharmacies}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RefreshCcw className="h-5 w-5" />
                Actualiser
              </button>

              {canCreatePharmacy && (
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
                >
                  <Plus className="h-5 w-5" />
                  Créer
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

        {isLoading ? (
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
            <p className="font-semibold text-slate-500">
              Chargement des pharmacies...
            </p>
          </section>
        ) : !hasPharmacies ? (
          <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-5 md:rounded-[2rem] md:p-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm md:h-16 md:w-16 md:rounded-3xl">
                <Store className="h-6 w-6 md:h-8 md:w-8" />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-black text-blue-950 md:text-2xl">
                  Aucune pharmacie créée
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-700">
                  Pour utiliser les produits, stocks, ventes et factures, vous
                  devez d’abord créer une pharmacie. Elle aura son identité, son
                  responsable, son taux de change et ses paramètres.
                </p>
              </div>

              {canCreatePharmacy ? (
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(true)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 md:w-auto"
                >
                  <Plus className="h-5 w-5" />
                  Créer maintenant
                </button>
              ) : (
                <div className="rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-bold text-amber-700">
                  Contactez l’administrateur Aksantic pour créer ou activer
                  votre pharmacie.
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-lg font-black text-slate-950 md:text-xl">
                    Mes pharmacies
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 md:text-sm">
                    {filteredPharmacies.length} pharmacie(s) affichée(s) sur{" "}
                    {pharmacies.length}.
                  </p>
                </div>

                <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-96">
                  <Search className="h-5 w-5 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            </section>

            {filteredPharmacies.length === 0 ? (
              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm md:rounded-[2rem]">
                Aucune pharmacie ne correspond à la recherche.
              </section>
            ) : (
              <section className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
                {filteredPharmacies.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
                ))}
              </section>
            )}
          </>
        )}

        {isDialogOpen && canCreatePharmacy && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 px-3 py-3 backdrop-blur-sm md:items-center md:px-4 md:py-8">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl md:rounded-[2rem] md:p-6">
              <div className="mb-5 flex items-start justify-between gap-4 md:mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-950 md:text-2xl">
                    Créer une pharmacie
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 md:text-sm">
                    Ces informations seront utilisées dans les paramètres, les
                    factures et le tableau de bord.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isCreating}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePharmacy} className="space-y-5 md:space-y-8">
                <section>
                  <h3 className="mb-3 text-sm font-black text-slate-900 md:mb-4 md:text-base">
                    Informations principales
                  </h3>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <FormField label="Nom de la pharmacie *">
                      <input
                        value={form.name}
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
                        className="form-input"
                        placeholder="Ex : Pharmacie Mpangi"
                        required
                      />
                    </FormField>

                    <FormField label="Slug *">
                      <input
                        value={form.slug}
                        onChange={(event) =>
                          updateField(
                            "slug",
                            generateSlug(event.target.value)
                          )
                        }
                        className="form-input"
                        placeholder="Ex : pharmacie-mpangi"
                        required
                      />
                    </FormField>

                    <FormField label="Pharmacien responsable">
                      <input
                        value={form.pharmacistName}
                        onChange={(event) =>
                          updateField("pharmacistName", event.target.value)
                        }
                        className="form-input"
                        placeholder="Nom du pharmacien"
                      />
                    </FormField>

                    <FormField label="Taux de change USD → CDF">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={form.exchangeRate}
                        onChange={(event) =>
                          updateField("exchangeRate", event.target.value)
                        }
                        className="form-input"
                        placeholder="2800"
                      />
                    </FormField>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-black text-slate-900 md:mb-4 md:text-base">
                    Localisation & contact
                  </h3>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <FormField label="Adresse">
                      <input
                        value={form.address}
                        onChange={(event) =>
                          updateField("address", event.target.value)
                        }
                        className="form-input"
                        placeholder="Avenue, quartier, commune"
                      />
                    </FormField>

                    <FormField label="Ville">
                      <input
                        value={form.city}
                        onChange={(event) =>
                          updateField("city", event.target.value)
                        }
                        className="form-input"
                        placeholder="Ex : Kinshasa, Lubumbashi..."
                      />
                    </FormField>

                    <FormField label="Province">
                      <input
                        value={form.province}
                        onChange={(event) =>
                          updateField("province", event.target.value)
                        }
                        className="form-input"
                        placeholder="Ex : Kinshasa, Haut-Katanga..."
                      />
                    </FormField>

                    <FormField label="Téléphone">
                      <input
                        value={form.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                        className="form-input"
                        placeholder="+243 ..."
                      />
                    </FormField>

                    <FormField label="Email">
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        className="form-input"
                        placeholder="contact@pharmacie.cd"
                      />
                    </FormField>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2 md:flex md:justify-end md:gap-3 md:pt-5">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={isCreating}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-5 w-5" />
                    {isCreating ? "Création..." : "Créer la pharmacie"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PharmacyCard({ pharmacy }: { pharmacy: PharmacyWithRole }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:rounded-[2rem] md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 md:h-14 md:w-14 md:rounded-3xl">
          <Building2 className="h-5 w-5 md:h-7 md:w-7" />
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 md:gap-2 md:px-3 md:text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
          Active
        </span>
      </div>

      <div className="mt-4 md:mt-5">
        <h2 className="line-clamp-2 text-lg font-black text-slate-950 md:text-xl">
          {pharmacy.name}
        </h2>

        <p className="mt-1 text-xs font-semibold text-blue-700 md:text-sm">
          Rôle : {formatRole(pharmacy.role)}
        </p>
      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-600 md:mt-5 md:space-y-3 md:text-sm">
        <InfoLine
          icon={<UserRound className="h-4 w-4" />}
          value={pharmacy.pharmacist_name || "Pharmacien non renseigné"}
        />

        <InfoLine
          icon={<MapPin className="h-4 w-4" />}
          value={
            [pharmacy.address, pharmacy.city, pharmacy.province]
              .filter(Boolean)
              .join(", ") || "Adresse non renseignée"
          }
        />

        <InfoLine
          icon={<Phone className="h-4 w-4" />}
          value={pharmacy.phone || "Téléphone non renseigné"}
        />

        <InfoLine
          icon={<Mail className="h-4 w-4" />}
          value={pharmacy.email || "Email non renseigné"}
        />

        <InfoLine
          icon={<BadgeDollarSign className="h-4 w-4" />}
          value={`1 USD = ${Number(pharmacy.exchange_rate || 0).toLocaleString(
            "fr-CD"
          )} CDF`}
        />
      </div>
    </article>
  );
}

function InfoLine({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex items-start gap-2 md:gap-3">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>

      <span className="line-clamp-2 break-words">{value}</span>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-700 md:text-sm">
        {label}
      </span>

      {children}
    </label>
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
