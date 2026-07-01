/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  ImagePlus,
  RefreshCcw,
  Save,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { canEditPharmacySettings, canManageUsers } from "@/lib/permissions";
import {
  createPharmacyMember,
  getCurrentPharmacy,
  getPharmacyMembers,
  getPharmacySettings,
  resetPharmacyMemberPassword,
  updatePharmacy,
  updatePharmacyMember,
  updatePharmacySettings,
  uploadPharmacyLogo,
} from "@/services/pharmacies.service";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PharmacyMember, PharmacySettings } from "@/types/settings";

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

type PharmacyUserRole =
  | "manager"
  | "pharmacist"
  | "cashier"
  | "stock_manager"
  | "accountant";

type UserFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: PharmacyUserRole;
};

type EditMemberFormState = {
  fullName: string;
  phone: string;
  role: PharmacyUserRole;
  isActive: boolean;
};

const initialUserForm: UserFormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "ChangeMe@2026!",
  role: "cashier",
};

const editableRoles: PharmacyUserRole[] = [
  "manager",
  "pharmacist",
  "cashier",
  "stock_manager",
  "accountant",
];

export default function SettingsPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [members, setMembers] = useState<PharmacyMember[]>([]);

  const [memberToEdit, setMemberToEdit] = useState<PharmacyMember | null>(null);
  const [editMemberForm, setEditMemberForm] = useState<EditMemberFormState>({
    fullName: "",
    phone: "",
    role: "cashier",
    isActive: true,
  });

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

  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm);
  const [memberToReset, setMemberToReset] = useState<PharmacyMember | null>(
    null
  );
  const [temporaryPassword, setTemporaryPassword] = useState("ChangeMe@2026!");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPharmacy, setIsSavingPharmacy] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [memberStatusChangingId, setMemberStatusChangingId] = useState<
    string | null
  >(null);

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
        setMembers([]);
        return;
      }

      setPharmacy(currentPharmacy);

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

      const [settingsData, membersData] = await Promise.all([
        getPharmacySettings(currentPharmacy.id),
        getPharmacyMembers(currentPharmacy.id),
      ]);

      setSettings(settingsData);
      setMembers(membersData);

      setSettingsForm({
        allowNegativeStock: settingsData.allow_negative_stock,
        blockExpiredSales: settingsData.block_expired_sales,
        expirationAlertDays: String(settingsData.expiration_alert_days),
        lowStockAlertEnabled: settingsData.low_stock_alert_enabled,
        invoicePrefix: settingsData.invoice_prefix,
        receiptFormat: settingsData.receipt_format,
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
    loadData();
  }, []);

  function updatePharmacyField<K extends keyof PharmacyFormState>(
    field: K,
    value: PharmacyFormState[K]
  ) {
    setPharmacyForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateSettingsField<K extends keyof SettingsFormState>(
    field: K,
    value: SettingsFormState[K]
  ) {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateUserField<K extends keyof UserFormState>(
    field: K,
    value: UserFormState[K]
  ) {
    setUserForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEditMemberField<K extends keyof EditMemberFormState>(
    field: K,
    value: EditMemberFormState[K]
  ) {
    setEditMemberForm((current) => ({
      ...current,
      [field]: value,
    }));
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

      setPharmacyForm((current) => ({
        ...current,
        logoUrl,
      }));

      setSuccessMessage("Logo chargé. Cliquez sur Enregistrer pour l’appliquer.");
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
      const exchangeRate = Number(pharmacyForm.exchangeRate || 0);

      if (!pharmacyForm.name.trim()) {
        throw new Error("Le nom de la pharmacie est obligatoire.");
      }

      if (exchangeRate <= 0) {
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

      setSuccessMessage("Informations pharmacie enregistrées.");
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
      const expirationAlertDays = Number(settingsForm.expirationAlertDays || 0);

      if (expirationAlertDays <= 0) {
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

      setSuccessMessage("Paramètres enregistrés.");
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

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pharmacy) {
      setErrorMessage("Aucune pharmacie active trouvée.");
      return;
    }

    setIsSavingUser(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!userForm.fullName.trim()) {
        throw new Error("Le nom complet est obligatoire.");
      }

      if (!userForm.email.trim()) {
        throw new Error("L’email est obligatoire.");
      }

      if (userForm.password.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
      }

      await createPharmacyMember({
        pharmacyId: pharmacy.id,
        fullName: userForm.fullName,
        email: userForm.email,
        phone: userForm.phone,
        password: userForm.password,
        role: userForm.role,
      });

      setUserForm(initialUserForm);
      setIsUserDialogOpen(false);
      setSuccessMessage("Utilisateur ajouté avec succès.");

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’ajouter l’utilisateur."
      );
    } finally {
      setIsSavingUser(false);
    }
  }

  function openResetPasswordDialog(member: PharmacyMember) {
    setMemberToReset(member);
    setTemporaryPassword("ChangeMe@2026!");
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pharmacy || !memberToReset) return;

    setIsResettingPassword(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (temporaryPassword.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
      }

      await resetPharmacyMemberPassword({
        pharmacyId: pharmacy.id,
        memberId: memberToReset.id,
        temporaryPassword,
      });

      setMemberToReset(null);
      setTemporaryPassword("ChangeMe@2026!");

      setSuccessMessage(
        "Mot de passe réinitialisé. L’utilisateur devra le changer à la prochaine connexion."
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de réinitialiser le mot de passe."
      );
    } finally {
      setIsResettingPassword(false);
    }
  }

  function openEditMemberDialog(member: PharmacyMember) {
    if (!isEditableUserRole(member.role)) {
      setErrorMessage("Ce rôle ne peut pas être modifié depuis cette interface.");
      return;
    }

    setMemberToEdit(member);
    setEditMemberForm({
      fullName: member.profile?.full_name || "",
      phone: member.profile?.phone || "",
      role: member.role,
      isActive: member.is_active,
    });
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSaveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pharmacy || !memberToEdit) {
      setErrorMessage("Pharmacie ou utilisateur introuvable.");
      return;
    }

    setIsSavingMember(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!editMemberForm.fullName.trim()) {
        throw new Error("Le nom complet est obligatoire.");
      }

      await updatePharmacyMember({
        pharmacyId: pharmacy.id,
        memberId: memberToEdit.id,
        fullName: editMemberForm.fullName,
        phone: editMemberForm.phone,
        role: editMemberForm.role,
        isActive: editMemberForm.isActive,
      });

      setMemberToEdit(null);
      setSuccessMessage("Utilisateur modifié avec succès.");

      await loadData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de modifier l’utilisateur.";

      setErrorMessage(message);
    } finally {
      setIsSavingMember(false);
    }
  }

  async function handleToggleMemberStatus(member: PharmacyMember) {
    if (!pharmacy) return;

    if (!isEditableUserRole(member.role)) {
      setErrorMessage("Ce rôle ne peut pas être modifié depuis cette interface.");
      return;
    }

    const nextStatus = !member.is_active;

    const confirmed = window.confirm(
      nextStatus
        ? "Voulez-vous réactiver cet utilisateur ?"
        : "Voulez-vous désactiver cet utilisateur ? Il ne pourra plus accéder à cette pharmacie."
    );

    if (!confirmed) return;

    setMemberStatusChangingId(member.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updatePharmacyMember({
        pharmacyId: pharmacy.id,
        memberId: member.id,
        fullName: member.profile?.full_name || "Utilisateur",
        phone: member.profile?.phone || "",
        role: member.role,
        isActive: nextStatus,
      });

      setSuccessMessage(
        nextStatus
          ? "Utilisateur réactivé avec succès."
          : "Utilisateur désactivé avec succès."
      );

      await loadData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut de l’utilisateur.";

      setErrorMessage(message);
    } finally {
      setMemberStatusChangingId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <p className="font-semibold text-slate-500">
            Chargement des paramètres...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy || !settings) {
    return (
      <main className="min-h-screen bg-slate-50 p-3 md:p-6">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 md:rounded-[2rem] md:p-8">
          <h1 className="text-xl font-black text-amber-800 md:text-2xl">
            Aucune pharmacie trouvée
          </h1>

          <p className="mt-2 text-sm font-medium text-amber-700">
            Créez une pharmacie avant d’accéder aux paramètres.
          </p>
        </div>
      </main>
    );
  }

  const canEdit = canEditPharmacySettings(pharmacy.role);
  const canManageUsersAccess = canManageUsers(pharmacy.role);

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 md:text-sm md:tracking-[0.2em]">
                Mpangi_Pharma
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 md:mt-2 md:text-3xl">
                Paramètres
              </h1>

              <p className="mt-1 text-xs text-slate-500 md:mt-2 md:text-sm">
                Identité pharmacie, règles, factures et utilisateurs.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        {!canEdit && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            Votre rôle permet la consultation, mais pas la modification des
            paramètres.
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px] xl:gap-6">
          <form
            onSubmit={handleSavePharmacy}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
          >
            <SectionTitle
              icon={<Building2 className="h-5 w-5 md:h-6 md:w-6" />}
              tone="blue"
              title="Identité de la pharmacie"
              description="Ces données apparaissent dans les factures."
            />

            <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:mb-6 md:flex-row md:items-center md:rounded-3xl md:p-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white md:h-24 md:w-24 md:rounded-3xl">
                {pharmacyForm.logoUrl ? (
                  <img
                    src={pharmacyForm.logoUrl}
                    alt={pharmacyForm.name || "Logo pharmacie"}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImagePlus className="h-9 w-9 text-slate-400 md:h-10 md:w-10" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-black text-slate-950">Logo pharmacie</p>

                <p className="mt-1 text-xs text-slate-500 md:text-sm">
                  PNG, JPG ou WEBP. Taille maximale : 2 Mo.
                </p>

                <label className="mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 md:w-auto">
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <FormField label="Nom pharmacie">
                <input
                  value={pharmacyForm.name}
                  onChange={(event) =>
                    updatePharmacyField("name", event.target.value)
                  }
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
                  placeholder="Nom du pharmacien"
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
                  onChange={(event) =>
                    updatePharmacyField("city", event.target.value)
                  }
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
                  onChange={(event) =>
                    updatePharmacyField("phone", event.target.value)
                  }
                  className="form-input"
                  disabled={!canEdit}
                />
              </FormField>

              <FormField label="Email">
                <input
                  type="email"
                  value={pharmacyForm.email}
                  onChange={(event) =>
                    updatePharmacyField("email", event.target.value)
                  }
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

            <div className="mt-3 md:mt-4">
              <FormField label="Pied de facture">
                <textarea
                  value={pharmacyForm.invoiceFooter}
                  onChange={(event) =>
                    updatePharmacyField("invoiceFooter", event.target.value)
                  }
                  className="form-input min-h-20 resize-none md:min-h-24"
                  disabled={!canEdit}
                  placeholder="Merci pour votre confiance."
                />
              </FormField>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4 md:mt-6 md:pt-5">
              <button
                type="submit"
                disabled={!canEdit || isSavingPharmacy}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                <Save className="h-5 w-5" />
                {isSavingPharmacy ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>

          <aside className="space-y-4 md:space-y-6">
            <form
              onSubmit={handleSaveSettings}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
            >
              <SectionTitle
                icon={<Settings className="h-5 w-5 md:h-6 md:w-6" />}
                tone="emerald"
                title="Règles de gestion"
                description="Stock, expiration et facture."
              />

              <div className="space-y-3 md:space-y-4">
                <ToggleField
                  label="Bloquer ventes expirées"
                  description="Empêche la vente des lots déjà expirés."
                  checked={settingsForm.blockExpiredSales}
                  disabled={!canEdit}
                  onChange={(value) =>
                    updateSettingsField("blockExpiredSales", value)
                  }
                />

                <ToggleField
                  label="Autoriser stock négatif"
                  description="À éviter en pharmacie."
                  checked={settingsForm.allowNegativeStock}
                  disabled={!canEdit}
                  onChange={(value) =>
                    updateSettingsField("allowNegativeStock", value)
                  }
                />

                <ToggleField
                  label="Alerte stock faible"
                  description="Affiche les produits sous le seuil minimum."
                  checked={settingsForm.lowStockAlertEnabled}
                  disabled={!canEdit}
                  onChange={(value) =>
                    updateSettingsField("lowStockAlertEnabled", value)
                  }
                />

                <FormField label="Jours alerte expiration">
                  <input
                    type="number"
                    min="1"
                    value={settingsForm.expirationAlertDays}
                    onChange={(event) =>
                      updateSettingsField(
                        "expirationAlertDays",
                        event.target.value
                      )
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

                <FormField label="Format reçu">
                  <select
                    value={settingsForm.receiptFormat}
                    onChange={(event) =>
                      updateSettingsField("receiptFormat", event.target.value)
                    }
                    className="form-input"
                    disabled={!canEdit}
                  >
                    <option value="A4">A4</option>
                    <option value="THERMAL_80">Thermique 80mm</option>
                    <option value="THERMAL_58">Thermique 58mm</option>
                  </select>
                </FormField>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 md:mt-6 md:pt-5">
                <button
                  type="submit"
                  disabled={!canEdit || isSavingSettings}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck className="h-5 w-5" />
                  {isSavingSettings ? "Enregistrement..." : "Sauvegarder"}
                </button>
              </div>
            </form>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
              <div className="mb-5 flex items-start justify-between gap-3 md:mb-6">
                <SectionTitle
                  icon={<Users className="h-5 w-5 md:h-6 md:w-6" />}
                  tone="purple"
                  title="Utilisateurs"
                  description="Membres liés à cette pharmacie."
                  compact
                />

                {canManageUsersAccess && (
                  <button
                    type="button"
                    onClick={() => setIsUserDialogOpen(true)}
                    className="shrink-0 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800"
                  >
                    Ajouter
                  </button>
                )}
              </div>

              <div className="space-y-2 md:space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500">
                    Aucun membre trouvé.
                  </p>
                ) : (
                  members.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      canManage={canManageUsersAccess}
                      isChangingStatus={memberStatusChangingId === member.id}
                      onEdit={() => openEditMemberDialog(member)}
                      onResetPassword={() => openResetPasswordDialog(member)}
                      onToggleStatus={() => handleToggleMemberStatus(member)}
                    />
                  ))
                )}
              </div>

              {!canManageUsersAccess && (
                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 md:rounded-3xl">
                  <p className="text-sm font-bold text-amber-800">
                    Gestion utilisateurs limitée
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Seuls le propriétaire et le gérant peuvent ajouter des
                    utilisateurs.
                  </p>
                </div>
              )}
            </section>
          </aside>
        </section>

        {isUserDialogOpen && (
          <UserDialog
            userForm={userForm}
            isSavingUser={isSavingUser}
            onClose={() => setIsUserDialogOpen(false)}
            onSubmit={handleCreateUser}
            onUpdateField={updateUserField}
          />
        )}

        {memberToReset && (
          <ResetPasswordDialog
            member={memberToReset}
            temporaryPassword={temporaryPassword}
            isResettingPassword={isResettingPassword}
            onClose={() => setMemberToReset(null)}
            onSubmit={handleResetPassword}
            onChangeTemporaryPassword={setTemporaryPassword}
          />
        )}

        {memberToEdit && (
          <EditMemberDialog
            member={memberToEdit}
            form={editMemberForm}
            isSaving={isSavingMember}
            onClose={() => setMemberToEdit(null)}
            onSubmit={handleSaveMember}
            onUpdateField={updateEditMemberField}
          />
        )}
      </div>
    </main>
  );
}

function MemberCard({
  member,
  canManage,
  isChangingStatus,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: {
  member: PharmacyMember;
  canManage: boolean;
  isChangingStatus: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
}) {
  const canEditMember = canManage && member.role !== "owner";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:rounded-3xl md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-black text-slate-950 md:text-base">
            {member.profile?.full_name || "Utilisateur"}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {formatRole(member.role)}
          </p>

          <p className="mt-1 line-clamp-1 text-[11px] text-slate-400 md:text-xs">
            {member.profile?.email || "Email non renseigné"}
          </p>

          <p className="mt-1 line-clamp-1 text-[11px] text-slate-400 md:text-xs">
            {member.profile?.phone || "Téléphone non renseigné"}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black md:px-3 md:text-xs ${
            member.is_active
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {member.is_active ? "Actif" : "Inactif"}
        </span>
      </div>

      {canEditMember && (
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            Modifier
          </button>

          <button
            type="button"
            onClick={onResetPassword}
            disabled={!member.is_active}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Réinitialiser
          </button>

          <button
            type="button"
            onClick={onToggleStatus}
            disabled={isChangingStatus}
            className={`rounded-xl px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${
              member.is_active
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {isChangingStatus
              ? "Traitement..."
              : member.is_active
                ? "Désactiver"
                : "Réactiver"}
          </button>
        </div>
      )}
    </div>
  );
}

function UserDialog({
  userForm,
  isSavingUser,
  onClose,
  onSubmit,
  onUpdateField,
}: {
  userForm: UserFormState;
  isSavingUser: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: <K extends keyof UserFormState>(
    field: K,
    value: UserFormState[K]
  ) => void;
}) {
  return (
    <Modal title="Ajouter un utilisateur" onClose={onClose}>
      <p className="-mt-2 mb-5 text-xs text-slate-500 md:text-sm">
        L’utilisateur pourra se connecter avec son email et son mot de passe.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <FormField label="Nom complet">
            <input
              value={userForm.fullName}
              onChange={(event) => onUpdateField("fullName", event.target.value)}
              className="form-input"
              placeholder="Ex : Jean MBUYI"
              required
            />
          </FormField>

          <FormField label="Email">
            <input
              type="email"
              value={userForm.email}
              onChange={(event) => onUpdateField("email", event.target.value)}
              className="form-input"
              placeholder="utilisateur@pharmacie.cd"
              required
            />
          </FormField>

          <FormField label="Téléphone">
            <input
              value={userForm.phone}
              onChange={(event) => onUpdateField("phone", event.target.value)}
              className="form-input"
              placeholder="+243 ..."
            />
          </FormField>

          <FormField label="Mot de passe initial">
            <input
              value={userForm.password}
              onChange={(event) =>
                onUpdateField("password", event.target.value)
              }
              className="form-input"
              required
            />
          </FormField>

          <FormField label="Rôle">
            <select
              value={userForm.role}
              onChange={(event) =>
                onUpdateField("role", event.target.value as PharmacyUserRole)
              }
              className="form-input"
            >
              <RoleOptions />
            </select>
          </FormField>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 md:rounded-3xl">
          <p className="text-sm font-bold text-blue-800">Conseil sécurité</p>
          <p className="mt-1 text-xs leading-5 text-blue-700">
            Donnez un mot de passe temporaire, puis demandez à l’utilisateur de
            le changer après sa première connexion.
          </p>
        </div>

        <ModalActions
          cancelLabel="Annuler"
          submitLabel={isSavingUser ? "Création..." : "Créer l’utilisateur"}
          isSaving={isSavingUser}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({
  member,
  temporaryPassword,
  isResettingPassword,
  onClose,
  onSubmit,
  onChangeTemporaryPassword,
}: {
  member: PharmacyMember;
  temporaryPassword: string;
  isResettingPassword: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChangeTemporaryPassword: (value: string) => void;
}) {
  return (
    <Modal title="Réinitialiser le mot de passe" onClose={onClose}>
      <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 md:rounded-3xl">
        <p className="text-sm font-black text-amber-800">
          Utilisateur concerné
        </p>
        <p className="mt-1 text-sm font-semibold text-amber-700">
          {member.profile?.full_name || "Utilisateur"} · {formatRole(member.role)}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <FormField label="Nouveau mot de passe temporaire">
          <input
            value={temporaryPassword}
            onChange={(event) => onChangeTemporaryPassword(event.target.value)}
            className="form-input"
            minLength={8}
            required
          />
        </FormField>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 md:rounded-3xl">
          <p className="text-sm font-bold text-blue-800">
            À communiquer à l’utilisateur
          </p>
          <p className="mt-1 text-xs leading-5 text-blue-700">
            Après connexion avec ce mot de passe temporaire, l’utilisateur sera
            redirigé vers la page Mon compte pour définir son mot de passe
            personnel.
          </p>
        </div>

        <ModalActions
          cancelLabel="Annuler"
          submitLabel={isResettingPassword ? "Réinitialisation..." : "Réinitialiser"}
          isSaving={isResettingPassword}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}

function EditMemberDialog({
  member,
  form,
  isSaving,
  onClose,
  onSubmit,
  onUpdateField,
}: {
  member: PharmacyMember;
  form: EditMemberFormState;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: <K extends keyof EditMemberFormState>(
    field: K,
    value: EditMemberFormState[K]
  ) => void;
}) {
  return (
    <Modal title="Modifier l’utilisateur" onClose={onClose}>
      <p className="-mt-2 mb-5 text-xs text-slate-500 md:text-sm">
        Modifiez les informations, le rôle et le statut de l’utilisateur.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <FormField label="Email">
          <input
            value={member.profile?.email || "Email non renseigné"}
            className="form-input bg-slate-50"
            disabled
          />
        </FormField>

        <FormField label="Nom complet">
          <input
            value={form.fullName}
            onChange={(event) => onUpdateField("fullName", event.target.value)}
            className="form-input"
            required
          />
        </FormField>

        <FormField label="Téléphone">
          <input
            value={form.phone}
            onChange={(event) => onUpdateField("phone", event.target.value)}
            className="form-input"
            placeholder="+243 ..."
          />
        </FormField>

        <FormField label="Rôle">
          <select
            value={form.role}
            onChange={(event) =>
              onUpdateField("role", event.target.value as PharmacyUserRole)
            }
            className="form-input"
          >
            <RoleOptions />
          </select>
        </FormField>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:rounded-3xl">
          <span>
            <span className="block font-black text-slate-950">Compte actif</span>
            <span className="mt-1 block text-sm leading-5 text-slate-500">
              Si désactivé, l’utilisateur ne pourra plus accéder à cette
              pharmacie.
            </span>
          </span>

          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onUpdateField("isActive", event.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300"
          />
        </label>

        <ModalActions
          cancelLabel="Annuler"
          submitLabel={isSaving ? "Enregistrement..." : "Enregistrer"}
          isSaving={isSaving}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 px-3 py-3 backdrop-blur-sm md:items-center md:px-4 md:py-8">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl md:rounded-[2rem] md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-black text-slate-950 md:text-2xl">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ModalActions({
  cancelLabel,
  submitLabel,
  isSaving,
  onCancel,
}: {
  cancelLabel: string;
  submitLabel: string;
  isSaving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2 md:flex md:justify-end md:gap-3 md:pt-5">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cancelLabel}
      </button>

      <button
        type="submit"
        disabled={isSaving}
        className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function SectionTitle({
  icon,
  tone,
  title,
  description,
  compact = false,
}: {
  icon: ReactNode;
  tone: "blue" | "emerald" | "purple";
  title: string;
  description: string;
  compact?: boolean;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
  }[tone];

  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "mb-5 md:mb-6"}`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl md:h-12 md:w-12 ${toneClass}`}
      >
        {icon}
      </div>

      <div>
        <h2 className="text-lg font-black text-slate-950 md:text-xl">{title}</h2>
        <p className="text-xs text-slate-500 md:text-sm">{description}</p>
      </div>
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
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:rounded-3xl md:p-4">
      <span>
        <span className="block text-sm font-black text-slate-950 md:text-base">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500 md:text-sm">
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

function RoleOptions() {
  return (
    <>
      <option value="manager">Gérant</option>
      <option value="pharmacist">Pharmacien</option>
      <option value="cashier">Caissier</option>
      <option value="stock_manager">Gestionnaire stock</option>
      <option value="accountant">Comptable</option>
    </>
  );
}

function isEditableUserRole(role: string): role is PharmacyUserRole {
  return editableRoles.includes(role as PharmacyUserRole);
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
