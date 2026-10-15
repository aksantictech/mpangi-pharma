"use client";

import { useSuccessToast } from "@/components/ui/Toast";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BriefcaseMedical,
  Check,
  Moon,
  Pencil,
  Plus,
  Power,
  Save,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";

import SettingsPageShell from "@/components/settings/SettingsPageShell";
import {
  createKitService,
  DEFAULT_KIT_SERVICES,
  deleteKitService,
  getKitServices,
  kitServiceKindLabels,
  setKitServiceActive,
  updateKitService,
} from "@/services/kit-services.service";

import type { KitServiceKind, PharmacyKitService } from "@/types/kit";
import type { PharmacyWithRole } from "@/types/pharmacy";

export default function KitServicesSettingsPage() {
  return (
    <SettingsPageShell
      title="Services et gardes"
      description="Définissez les services (Urgences, Maternité…) et les gardes de votre établissement : ils forment la liste « Service / garde » de la Trousse de secours."
      icon={BriefcaseMedical}
    >
      {(pharmacy) => <KitServicesManager pharmacy={pharmacy} />}
    </SettingsPageShell>
  );
}

type FormState = {
  id: string | null;
  name: string;
  kind: KitServiceKind;
  notes: string;
};

const emptyForm: FormState = { id: null, name: "", kind: "service", notes: "" };

function KitServicesManager({ pharmacy }: { pharmacy: PharmacyWithRole }) {
  const [services, setServices] = useState<PharmacyKitService[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const setSuccessMessage = useSuccessToast();

  const load = useCallback(async () => {
    try {
      setServices(await getKitServices(pharmacy.id));
      setErrorMessage("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Chargement impossible.";

      setErrorMessage(
        /pharmacy_kit_services/.test(message)
          ? "La base de données doit être mise à jour : exécutez la migration 0007_kit_services.sql dans Supabase."
          : message
      );
    } finally {
      setIsLoading(false);
    }
  }, [pharmacy.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(action: () => Promise<void>, success: string, id?: string) {
    setBusyId(id ?? null);
    setErrorMessage("");

    try {
      await action();
      setSuccessMessage(success);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Action impossible."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrorMessage("Le nom est obligatoire.");
      return;
    }

    setIsSaving(true);

    await run(
      async () => {
        if (form.id) {
          await updateKitService(form.id, {
            name: form.name,
            kind: form.kind,
            notes: form.notes,
          });
        } else {
          await createKitService({
            pharmacyId: pharmacy.id,
            name: form.name,
            kind: form.kind,
            notes: form.notes,
          });
        }

        setForm(emptyForm);
      },
      form.id ? "Modification enregistrée." : "Ajouté à la liste."
    );

    setIsSaving(false);
  }

  function handleDelete(service: PharmacyKitService) {
    const confirmed = window.confirm(
      `Supprimer « ${service.name} » ?\n\nLes réquisitions déjà enregistrées gardent ce nom. Vous pouvez aussi simplement le désactiver.`
    );

    if (!confirmed) return;

    void run(
      () => deleteKitService(service.id),
      "Supprimé de la liste.",
      service.id
    );
  }

  const existingNames = new Set(
    services.map((service) => service.name.trim().toLowerCase())
  );
  const missingDefaults = DEFAULT_KIT_SERVICES.filter(
    (item) => !existingNames.has(item.name.toLowerCase())
  );

  return (
    <>
      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
        <h2 className="text-lg font-black text-slate-950">
          {form.id ? "Modifier" : "Ajouter un service ou une garde"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Nom *
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex. Réanimation, Garde de week-end…"
                className="form-input"
                maxLength={80}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Type
              </span>
              <select
                value={form.kind}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kind: event.target.value as KitServiceKind,
                  }))
                }
                className="form-input"
              >
                {(Object.keys(kitServiceKindLabels) as KitServiceKind[]).map(
                  (kind) => (
                    <option key={kind} value={kind}>
                      {kitServiceKindLabels[kind]}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Note (optionnel)
            </span>
            <input
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Ex. responsable, horaires…"
              className="form-input"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {form.id ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {isSaving ? "Enregistrement..." : form.id ? "Enregistrer" : "Ajouter"}
            </button>

            {form.id && (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
              >
                <X className="h-5 w-5" />
                Annuler
              </button>
            )}
          </div>
        </form>

        {missingDefaults.length > 0 && !form.id && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Ajout rapide
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missingDefaults.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  disabled={busyId !== null}
                  onClick={() =>
                    void run(
                      () =>
                        createKitService({
                          pharmacyId: pharmacy.id,
                          name: item.name,
                          kind: item.kind,
                        }),
                      `« ${item.name} » ajouté.`
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
        <h2 className="text-lg font-black text-slate-950">Votre liste</h2>

        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Chargement...</p>
        ) : services.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Aucun service défini : la Trousse de secours propose pour
            l’instant les services courants (Urgences, Maternité, Garde de
            nuit…). Ajoutez les vôtres ci-dessus pour les remplacer.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {services.map((service) => {
              const Icon = service.kind === "garde" ? Moon : Stethoscope;
              const busy = busyId === service.id;

              return (
                <li
                  key={service.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    service.is_active
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50 opacity-70"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {service.name}
                        {!service.is_active && (
                          <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                            Désactivé
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {kitServiceKindLabels[service.kind]}
                        {service.notes ? ` · ${service.notes}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      title="Modifier"
                      disabled={busy}
                      onClick={() =>
                        setForm({
                          id: service.id,
                          name: service.name,
                          kind: service.kind,
                          notes: service.notes ?? "",
                        })
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={service.is_active ? "Désactiver" : "Réactiver"}
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => setKitServiceActive(service.id, !service.is_active),
                          service.is_active
                            ? "Désactivé : il n’apparaît plus dans la Trousse de secours."
                            : "Réactivé.",
                          service.id
                        )
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {service.is_active ? (
                        <Power className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Supprimer"
                      disabled={busy}
                      onClick={() => handleDelete(service)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
