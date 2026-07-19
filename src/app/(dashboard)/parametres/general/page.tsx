/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ImagePlus,
  RefreshCcw,
  Save,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { canEditPharmacySettings } from "@/lib/permissions";
import {
  getCurrentPharmacy,
  getPharmacySettings,
  updatePharmacy,
  updatePharmacySettings,
  uploadPharmacyLogo,
} from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PharmacySettings } from "@/types/settings";

type PharmacyFormState = {
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  pharmacistName: string;
  exchangeRate: string;
  invoiceFooter: string;
  logoUrl: string;
};

type SettingsFormState = {
  allowNegativeStock: boolean;
  blockExpiredSales: boolean;
  expirationAlertDays: string;
  lowStockAlertEnabled: boolean;
  invoicePrefix: string;
  receiptFormat: string;
};

export default function GeneralSettingsPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [settings, setSettings] = useState<PharmacySettings | null>(null);

  const [pharmacyForm, setPharmacyForm] = useState<PharmacyFormState>({
    name: "",
    address: "",
    city: "",
    province: "",
    phone: "",
    email: "",
    pharmacistName: "",
    exchangeRate: "2800",
    invoiceFooter: "",
    logoUrl: "",
  });

  const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
    allowNegativeStock: false,
    blockExpiredSales: true,
    expirationAlertDays: "90",
    lowStockAlertEnabled: true,
    invoicePrefix: "FAC",
    receiptFormat: "A4",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPharmacy, setIsSavingPharmacy] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setSettings(null);
        return;
      }

      const currentSettings = await getPharmacySettings(currentPharmacy.id);

      setPharmacy(currentPharmacy);
      setSettings(currentSettings);

      setPharmacyForm({
        name: currentPharmacy.name || "",
        address: currentPharmacy.address || "",
        city: currentPharmacy.city || "",
        province: currentPharmacy.province || "",
        phone: currentPharmacy.phone || "",
        email: currentPharmacy.email || "",
        pharmacistName: currentPharmacy.pharmacist_name || "",
        exchangeRate: String(currentPharmacy.exchange_rate || 2800),
        invoiceFooter: currentPharmacy.invoice_footer || "",
        logoUrl: currentPharmacy.logo_url || "",
      });

      setSettingsForm({
        allowNegativeStock: currentSettings.allow_negative_stock,
        blockExpiredSales: currentSettings.block_expired_sales,
        expirationAlertDays: String(currentSettings.expiration_alert_days),
        lowStockAlertEnabled: currentSettings.low_stock_alert_enabled,
        invoicePrefix: currentSettings.invoice_prefix,
        receiptFormat: currentSettings.receipt_format,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les paramètres."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function updatePharmacyField<K extends keyof PharmacyFormState>(
    field: K,
    value: PharmacyFormState[K]
  ) {
    setPharmacyForm((current) => ({ ...current, [field]: value }));
  }

  function updateSettingsField<K extends keyof SettingsFormState>(
    field: K,
    value: SettingsFormState[K]
  ) {
    setSettingsForm((current) => ({ ...current, [field]: value }));
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!pharmacy) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const logoUrl = await uploadPharmacyLogo(pharmacy.id, file);
      setPharmacyForm((current) => ({ ...current, logoUrl }));
      setSuccessMessage("Logo chargé. Enregistrez les informations pour l’appliquer.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible de charger le logo."
      );
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  }

  async function handleSavePharmacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pharmacy) return;

    setIsSavingPharmacy(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const exchangeRate = Number(pharmacyForm.exchangeRate);

      if (!pharmacyForm.name.trim()) {
        throw new Error("Le nom de la pharmacie est obligatoire.");
      }

      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw new Error("Le taux de change doit être supérieur à zéro.");
      }

      await updatePharmacy({
        pharmacyId: pharmacy.id,
        name: pharmacyForm.name,
        address: pharmacyForm.address,
        city: pharmacyForm.city,
        province: pharmacyForm.province,
        phone: pharmacyForm.phone,
        email: pharmacyForm.email,
        pharmacistName: pharmacyForm.pharmacistName,
        exchangeRate,
        invoiceFooter: pharmacyForm.invoiceFooter,
        logoUrl: pharmacyForm.logoUrl || null,
      });

      setSuccessMessage("Informations de la pharmacie enregistrées.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer la pharmacie."
      );
    } finally {
      setIsSavingPharmacy(false);
    }
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pharmacy) return;

    setIsSavingSettings(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const expirationAlertDays = Number(settingsForm.expirationAlertDays);

      if (!Number.isFinite(expirationAlertDays) || expirationAlertDays <= 0) {
        throw new Error("Le nombre de jours d’alerte doit être supérieur à zéro.");
      }

      await updatePharmacySettings({
        pharmacyId: pharmacy.id,
        allowNegativeStock: settingsForm.allowNegativeStock,
        blockExpiredSales: settingsForm.blockExpiredSales,
        expirationAlertDays,
        lowStockAlertEnabled: settingsForm.lowStockAlertEnabled,
        invoicePrefix: settingsForm.invoicePrefix,
        receiptFormat: settingsForm.receiptFormat,
      });

      setSuccessMessage("Règles de gestion enregistrées.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer les paramètres."
      );
    } finally {
      setIsSavingSettings(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Chargement des paramètres..." />;
  }

  if (!pharmacy || !settings) {
    return <EmptyState />;
  }

  const canEdit = canEditPharmacySettings(pharmacy.role);

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <Link
                href="/parametres"
                className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour aux paramètres
              </Link>

              <h1 className="mt-3 text-2xl font-black text-slate-950 md:text-3xl">
                Paramètres généraux
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Identité, facturation et règles de gestion de {pharmacy.name}.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </header>

        {errorMessage && <Message tone="error">{errorMessage}</Message>}
        {successMessage && (
          <Message tone="success">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </Message>
        )}

        {!canEdit && (
          <Message tone="warning">
            Votre rôle permet la consultation, mais pas la modification.
          </Message>
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px] xl:gap-6">
          <form
            onSubmit={handleSavePharmacy}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
          >
            <SectionTitle
              icon={<Building2 className="h-6 w-6" />}
              title="Identité de la pharmacie"
              description="Ces informations apparaissent sur les factures."
            />

            <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
                {pharmacyForm.logoUrl ? (
                  <img
                    src={pharmacyForm.logoUrl}
                    alt={pharmacyForm.name || "Logo pharmacie"}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImagePlus className="h-10 w-10 text-slate-400" />
                )}
              </div>

              <div>
                <p className="font-black text-slate-950">Logo de la pharmacie</p>
                <p className="mt-1 text-sm text-slate-500">
                  PNG, JPG ou WEBP. Maximum 2 Mo.
                </p>

                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                  <ImagePlus className="h-5 w-5" />
                  {isUploadingLogo ? "Chargement..." : "Choisir un logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoUpload}
                    disabled={!canEdit || isUploadingLogo}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Nom pharmacie">
                <input
                  value={pharmacyForm.name}
                  onChange={(event) => updatePharmacyField("name", event.target.value)}
                  className="form-input"
                  disabled={!canEdit}
                  required
                />
              </FormField>

              <FormField label="Pharmacien responsable">
                <input
                  value={pharmacyForm.pharmacistName}
                  onChange={(event) =>
                    updatePharmacyField("pharmacistName", event.target.value)
                  }
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>

              <FormField label="Adresse">
                <input
                  value={pharmacyForm.address}
                  onChange={(event) =>
                    updatePharmacyField("address", event.target.value)
                  }
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>

              <FormField label="Ville">
                <input
                  value={pharmacyForm.city}
                  onChange={(event) => updatePharmacyField("city", event.target.value)}
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>

              <FormField label="Province">
                <input
                  value={pharmacyForm.province}
                  onChange={(event) =>
                    updatePharmacyField("province", event.target.value)
                  }
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>

              <FormField label="Téléphone">
                <input
                  value={pharmacyForm.phone}
                  onChange={(event) => updatePharmacyField("phone", event.target.value)}
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>

              <FormField label="Email">
                <input
                  type="email"
                  value={pharmacyForm.email}
                  onChange={(event) => updatePharmacyField("email", event.target.value)}
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>

              <FormField label="Taux USD → CDF">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={pharmacyForm.exchangeRate}
                  onChange={(event) =>
                    updatePharmacyField("exchangeRate", event.target.value)
                  }
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>
            </div>

            <div className="mt-4">
              <FormField label="Pied de facture">
                <textarea
                  value={pharmacyForm.invoiceFooter}
                  onChange={(event) =>
                    updatePharmacyField("invoiceFooter", event.target.value)
                  }
                  className="form-input min-h-24 resize-none"
                  disabled={!canEdit}
                />
              </FormField>
            </div>

            <button
              type="submit"
              disabled={!canEdit || isSavingPharmacy}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60 md:w-auto"
            >
              <Save className="h-5 w-5" />
              {isSavingPharmacy ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>

          <form
            onSubmit={handleSaveSettings}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
          >
            <SectionTitle
              icon={<Settings className="h-6 w-6" />}
              title="Règles de gestion"
              description="Stock, expiration et facturation."
            />

            <div className="space-y-4">
              <ToggleField
                label="Bloquer les ventes expirées"
                description="Empêche la vente des lots expirés."
                checked={settingsForm.blockExpiredSales}
                disabled={!canEdit}
                onChange={(value) =>
                  updateSettingsField("blockExpiredSales", value)
                }
              />

              <ToggleField
                label="Autoriser le stock négatif"
                description="Déconseillé pour une pharmacie."
                checked={settingsForm.allowNegativeStock}
                disabled={!canEdit}
                onChange={(value) =>
                  updateSettingsField("allowNegativeStock", value)
                }
              />

              <ToggleField
                label="Alerte de stock faible"
                description="Signale les produits sous le seuil minimum."
                checked={settingsForm.lowStockAlertEnabled}
                disabled={!canEdit}
                onChange={(value) =>
                  updateSettingsField("lowStockAlertEnabled", value)
                }
              />

              <FormField label="Jours d’alerte expiration">
                <input
                  type="number"
                  min="1"
                  value={settingsForm.expirationAlertDays}
                  onChange={(event) =>
                    updateSettingsField("expirationAlertDays", event.target.value)
                  }
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>

              <FormField label="Préfixe facture">
                <input
                  value={settingsForm.invoicePrefix}
                  onChange={(event) =>
                    updateSettingsField("invoicePrefix", event.target.value)
                  }
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>

              <FormField label="Format du reçu">
                <select
                  value={settingsForm.receiptFormat}
                  onChange={(event) =>
                    updateSettingsField("receiptFormat", event.target.value)
                  }
                  className="form-input"
                  disabled={!canEdit}
                >
                  <option value="A4">A4</option>
                  <option value="THERMAL_80">Thermique 80 mm</option>
                  <option value="THERMAL_58">Thermique 58 mm</option>
                </select>
              </FormField>
            </div>

            <button
              type="submit"
              disabled={!canEdit || isSavingSettings}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              <ShieldCheck className="h-5 w-5" />
              {isSavingSettings ? "Enregistrement..." : "Sauvegarder"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-semibold text-slate-500">{label}</p>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
        <h1 className="text-2xl font-black text-amber-800">
          Aucune pharmacie trouvée
        </h1>
      </div>
    </main>
  );
}

function Message({
  tone,
  children,
}: {
  tone: "error" | "success" | "warning";
  children: ReactNode;
}) {
  const classes = {
    error: "border-red-100 bg-red-50 text-red-700",
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    warning: "border-amber-100 bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${classes}`}>
      {children}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <span>
        <span className="block font-black text-slate-950">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-500">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border-slate-300"
      />
    </label>
  );
}
