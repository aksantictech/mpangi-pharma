"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  Building2,
  Check,
  Layers3,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  archiveProductCategory,
  archiveSupplier,
  createProductCategory,
  createSupplier,
  deleteProductCategory,
  deleteSupplier,
  getProductCategories,
  getSuppliers,
  updateProductCategory,
  updateSupplier,
  type ProductCategory,
  type Supplier,
} from "@/services/products.service";

type ProductSetupPanelProps = {
  pharmacyId: string;
  onChanged?: () => void;
};

const categoryColors = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#ea580c",
  "#9333ea",
  "#0891b2",
  "#475569",
  "#db2777",
];

type CategoryEditState = {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
};

type SupplierEditState = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  isActive: boolean;
};

export default function ProductSetupPanel({
  pharmacyId,
  onChanged,
}: ProductSetupPanelProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState("#2563eb");

  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

  const [editingCategory, setEditingCategory] =
    useState<CategoryEditState | null>(null);
  const [editingSupplier, setEditingSupplier] =
    useState<SupplierEditState | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isUpdatingSupplier, setIsUpdatingSupplier] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [categoriesData, suppliersData] = await Promise.all([
        getProductCategories(pharmacyId, false),
        getSuppliers(pharmacyId, false),
      ]);

      setCategories(categoriesData);
      setSuppliers(suppliersData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les catégories et fournisseurs."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [pharmacyId]);

  async function refreshAfterChange(message: string) {
    setSuccessMessage(message);
    await loadData();
    onChanged?.();
  }

  async function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingCategory(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!categoryName.trim()) {
        throw new Error("Le nom de la catégorie est obligatoire.");
      }

      await createProductCategory({
        pharmacyId,
        name: categoryName,
        description: categoryDescription,
        color: categoryColor,
      });

      setCategoryName("");
      setCategoryDescription("");
      setCategoryColor("#2563eb");

      await refreshAfterChange("Catégorie ajoutée avec succès.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de créer la catégorie."
      );
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleCreateSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSupplier(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supplierName.trim()) {
        throw new Error("Le nom du fournisseur est obligatoire.");
      }

      await createSupplier({
        pharmacyId,
        name: supplierName,
        phone: supplierPhone,
        email: supplierEmail,
        address: supplierAddress,
      });

      setSupplierName("");
      setSupplierPhone("");
      setSupplierEmail("");
      setSupplierAddress("");

      await refreshAfterChange("Fournisseur ajouté avec succès.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de créer le fournisseur."
      );
    } finally {
      setIsSavingSupplier(false);
    }
  }

  function startEditCategory(category: ProductCategory) {
    setEditingCategory({
      id: category.id,
      name: category.name,
      description: category.description || "",
      color: category.color || "#2563eb",
      isActive: category.is_active,
    });
  }

  function startEditSupplier(supplier: Supplier) {
    setEditingSupplier({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      contactPerson: supplier.contact_person || "",
      isActive: supplier.is_active,
    });
  }

  async function saveEditedCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCategory) return;

    setIsUpdatingCategory(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateProductCategory({
        pharmacyId,
        categoryId: editingCategory.id,
        name: editingCategory.name,
        description: editingCategory.description,
        color: editingCategory.color,
        isActive: editingCategory.isActive,
      });

      setEditingCategory(null);
      await refreshAfterChange("Catégorie modifiée avec succès.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier la catégorie."
      );
    } finally {
      setIsUpdatingCategory(false);
    }
  }

  async function saveEditedSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSupplier) return;

    setIsUpdatingSupplier(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateSupplier({
        pharmacyId,
        supplierId: editingSupplier.id,
        name: editingSupplier.name,
        phone: editingSupplier.phone,
        email: editingSupplier.email,
        address: editingSupplier.address,
        contactPerson: editingSupplier.contactPerson,
        isActive: editingSupplier.isActive,
      });

      setEditingSupplier(null);
      await refreshAfterChange("Fournisseur modifié avec succès.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le fournisseur."
      );
    } finally {
      setIsUpdatingSupplier(false);
    }
  }

  async function toggleCategory(category: ProductCategory) {
    setChangingId(category.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateProductCategory({
        pharmacyId,
        categoryId: category.id,
        name: category.name,
        description: category.description || "",
        color: category.color || "#2563eb",
        isActive: !category.is_active,
      });

      await refreshAfterChange(
        category.is_active ? "Catégorie désactivée." : "Catégorie réactivée."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut de la catégorie."
      );
    } finally {
      setChangingId(null);
    }
  }

  async function toggleSupplier(supplier: Supplier) {
    setChangingId(supplier.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateSupplier({
        pharmacyId,
        supplierId: supplier.id,
        name: supplier.name,
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        contactPerson: supplier.contact_person || "",
        isActive: !supplier.is_active,
      });

      await refreshAfterChange(
        supplier.is_active
          ? "Fournisseur désactivé."
          : "Fournisseur réactivé."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut du fournisseur."
      );
    } finally {
      setChangingId(null);
    }
  }

  async function handleArchiveCategory(category: ProductCategory) {
    const confirmed = window.confirm(
      `Archiver la catégorie « ${category.name} » ? Elle ne sera plus proposée lors de la création d’un produit.`
    );

    if (!confirmed) return;

    setChangingId(category.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await archiveProductCategory({
        pharmacyId,
        categoryId: category.id,
      });

      await refreshAfterChange("Catégorie archivée.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’archiver la catégorie."
      );
    } finally {
      setChangingId(null);
    }
  }

  async function handleDeleteCategory(category: ProductCategory) {
    const confirmed = window.confirm(
      `Supprimer définitivement la catégorie « ${category.name} » ? Cette action est irréversible.`
    );

    if (!confirmed) return;

    setChangingId(category.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteProductCategory({
        pharmacyId,
        categoryId: category.id,
      });

      await refreshAfterChange("Catégorie supprimée.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer la catégorie."
      );
    } finally {
      setChangingId(null);
    }
  }

  async function handleArchiveSupplier(supplier: Supplier) {
    const confirmed = window.confirm(
      `Archiver le fournisseur « ${supplier.name} » ?`
    );

    if (!confirmed) return;

    setChangingId(supplier.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await archiveSupplier({
        pharmacyId,
        supplierId: supplier.id,
      });

      await refreshAfterChange("Fournisseur archivé.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’archiver le fournisseur."
      );
    } finally {
      setChangingId(null);
    }
  }

  async function handleDeleteSupplier(supplier: Supplier) {
    const confirmed = window.confirm(
      `Supprimer définitivement le fournisseur « ${supplier.name} » ? Cette action est irréversible.`
    );

    if (!confirmed) return;

    setChangingId(supplier.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteSupplier({
        pharmacyId,
        supplierId: supplier.id,
      });

      await refreshAfterChange("Fournisseur supprimé.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le fournisseur."
      );
    } finally {
      setChangingId(null);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Paramètres produits
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ajoutez, modifiez ou désactivez les catégories et fournisseurs de la
            pharmacie active.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw className="h-5 w-5" />
          Actualiser
        </button>
      </div>

      {errorMessage && (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <Check className="h-5 w-5" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Layers3 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-black text-slate-950">Catégories</h3>
              <p className="text-sm text-slate-500">
                {isLoading ? "Chargement..." : `${categories.length} catégorie(s)`}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                className="form-input"
                placeholder="Ex : Antipaludiques"
              />

              <input
                value={categoryDescription}
                onChange={(event) =>
                  setCategoryDescription(event.target.value)
                }
                className="form-input"
                placeholder="Description optionnelle"
              />
            </div>

            <ColorPicker value={categoryColor} onChange={setCategoryColor} />

            <button
              type="submit"
              disabled={isSavingCategory}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <Plus className="h-5 w-5" />
              {isSavingCategory ? "Ajout..." : "Ajouter catégorie"}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">
                Aucune catégorie créée.
              </p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor: category.color || "#2563eb",
                          }}
                        />
                        <p className="truncate font-black text-slate-900">
                          {category.name}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {category.description || "Sans description"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black ${
                        category.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {category.archived_at
                        ? "Archivée"
                        : category.is_active
                          ? "Active"
                          : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <IconActionButton
                      title="Modifier"
                      onClick={() => startEditCategory(category)}
                      icon={<Pencil className="h-4 w-4" />}
                    />

                    {!category.archived_at && (
                      <IconActionButton
                        title={category.is_active ? "Désactiver" : "Réactiver"}
                        onClick={() => void toggleCategory(category)}
                        disabled={changingId === category.id}
                        icon={
                          category.is_active ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )
                        }
                      />
                    )}

                    {!category.archived_at && (
                      <IconActionButton
                        title="Archiver"
                        onClick={() => void handleArchiveCategory(category)}
                        disabled={changingId === category.id}
                        icon={<Archive className="h-4 w-4" />}
                      />
                    )}

                    <IconActionButton
                      title="Supprimer"
                      tone="danger"
                      onClick={() => void handleDeleteCategory(category)}
                      disabled={changingId === category.id}
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-black text-slate-950">Fournisseurs</h3>
              <p className="text-sm text-slate-500">
                {isLoading ? "Chargement..." : `${suppliers.length} fournisseur(s)`}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                className="form-input"
                placeholder="Nom fournisseur"
              />

              <input
                value={supplierPhone}
                onChange={(event) => setSupplierPhone(event.target.value)}
                className="form-input"
                placeholder="Téléphone"
              />

              <input
                type="email"
                value={supplierEmail}
                onChange={(event) => setSupplierEmail(event.target.value)}
                className="form-input"
                placeholder="Email"
              />

              <input
                value={supplierAddress}
                onChange={(event) => setSupplierAddress(event.target.value)}
                className="form-input"
                placeholder="Adresse"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSupplier}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {isSavingSupplier ? "Ajout..." : "Ajouter fournisseur"}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {suppliers.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">
                Aucun fournisseur créé.
              </p>
            ) : (
              suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-900">
                        {supplier.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {supplier.phone || "Téléphone non renseigné"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {supplier.email || "Email non renseigné"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {supplier.address || "Adresse non renseignée"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black ${
                        supplier.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {supplier.archived_at
                        ? "Archivé"
                        : supplier.is_active
                          ? "Actif"
                          : "Inactif"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <IconActionButton
                      title="Modifier"
                      onClick={() => startEditSupplier(supplier)}
                      icon={<Pencil className="h-4 w-4" />}
                    />

                    {!supplier.archived_at && (
                      <IconActionButton
                        title={supplier.is_active ? "Désactiver" : "Réactiver"}
                        onClick={() => void toggleSupplier(supplier)}
                        disabled={changingId === supplier.id}
                        icon={
                          supplier.is_active ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )
                        }
                      />
                    )}

                    {!supplier.archived_at && (
                      <IconActionButton
                        title="Archiver"
                        onClick={() => void handleArchiveSupplier(supplier)}
                        disabled={changingId === supplier.id}
                        icon={<Archive className="h-4 w-4" />}
                      />
                    )}

                    <IconActionButton
                      title="Supprimer"
                      tone="danger"
                      onClick={() => void handleDeleteSupplier(supplier)}
                      disabled={changingId === supplier.id}
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {editingCategory && (
        <Modal title="Modifier la catégorie" onClose={() => setEditingCategory(null)}>
          <form onSubmit={saveEditedCategory} className="space-y-4">
            <input
              value={editingCategory.name}
              onChange={(event) =>
                setEditingCategory((current) =>
                  current ? { ...current, name: event.target.value } : current
                )
              }
              className="form-input"
              placeholder="Nom"
            />

            <input
              value={editingCategory.description}
              onChange={(event) =>
                setEditingCategory((current) =>
                  current
                    ? { ...current, description: event.target.value }
                    : current
                )
              }
              className="form-input"
              placeholder="Description"
            />

            <ColorPicker
              value={editingCategory.color}
              onChange={(color) =>
                setEditingCategory((current) =>
                  current ? { ...current, color } : current
                )
              }
            />

            <ModalActions
              isSaving={isUpdatingCategory}
              onCancel={() => setEditingCategory(null)}
            />
          </form>
        </Modal>
      )}

      {editingSupplier && (
        <Modal title="Modifier le fournisseur" onClose={() => setEditingSupplier(null)}>
          <form onSubmit={saveEditedSupplier} className="space-y-4">
            <input
              value={editingSupplier.name}
              onChange={(event) =>
                setEditingSupplier((current) =>
                  current ? { ...current, name: event.target.value } : current
                )
              }
              className="form-input"
              placeholder="Nom fournisseur"
            />

            <input
              value={editingSupplier.phone}
              onChange={(event) =>
                setEditingSupplier((current) =>
                  current ? { ...current, phone: event.target.value } : current
                )
              }
              className="form-input"
              placeholder="Téléphone"
            />

            <input
              type="email"
              value={editingSupplier.email}
              onChange={(event) =>
                setEditingSupplier((current) =>
                  current ? { ...current, email: event.target.value } : current
                )
              }
              className="form-input"
              placeholder="Email"
            />

            <input
              value={editingSupplier.address}
              onChange={(event) =>
                setEditingSupplier((current) =>
                  current ? { ...current, address: event.target.value } : current
                )
              }
              className="form-input"
              placeholder="Adresse"
            />

            <input
              value={editingSupplier.contactPerson}
              onChange={(event) =>
                setEditingSupplier((current) =>
                  current
                    ? { ...current, contactPerson: event.target.value }
                    : current
                )
              }
              className="form-input"
              placeholder="Personne de contact"
            />

            <ModalActions
              isSaving={isUpdatingSupplier}
              onCancel={() => setEditingSupplier(null)}
            />
          </form>
        </Modal>
      )}
    </section>
  );
}

function IconActionButton({
  title,
  icon,
  onClick,
  disabled = false,
  tone = "default",
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border disabled:opacity-50 ${
        tone === "danger"
          ? "border-red-100 bg-red-50 text-red-700"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {icon}
    </button>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {categoryColors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`h-8 w-8 rounded-full border-2 ${
            value === color ? "border-slate-950" : "border-white"
          }`}
          style={{ backgroundColor: color }}
          aria-label={`Couleur ${color}`}
        />
      ))}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm md:items-center">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl md:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500"
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
  isSaving,
  onCancel,
}: {
  isSaving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onCancel}
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
        {isSaving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </div>
  );
}
