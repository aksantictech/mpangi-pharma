"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  PackagePlus,
  PencilLine,
  RefreshCcw,
  Save,
  Search,
  X,
} from "lucide-react";

import { getCurrentPharmacy } from "@/services/pharmacies.service";
import {
  addStockBatch,
  correctBatchQuantity,
  getAllActiveBatches,
  getStockMovements,
} from "@/services/stock.service";
import {
  getProducts,
  getSuppliers,
  type Supplier,
} from "@/services/products.service";
import type { PharmacyWithRole } from "@/types/pharmacy";
import type { Product, ProductBatch } from "@/types/product";
import type { StockMovement, StockMovementType } from "@/types/stock";

type BatchWithProduct = ProductBatch & {
  product?: {
    id: string;
    name: string;
    generic_name: string | null;
    dosage: string | null;
    form: string | null;
    unit: string;
  };
};

type EntryFormState = {
  productId: string;
  supplierId: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: string;
  reason: string;
};

type CorrectionFormState = {
  batchId: string;
  currentQuantity: string;
  newQuantity: string;
  reason: string;
};

const initialEntryForm: EntryFormState = {
  productId: "",
  supplierId: "",
  batchNumber: "",
  expiryDate: "",
  purchasePrice: "0",
  sellingPrice: "0",
  quantity: "1",
  reason: "Entrée de stock",
};

const initialCorrectionForm: CorrectionFormState = {
  batchId: "",
  currentQuantity: "",
  newQuantity: "",
  reason: "Correction inventaire",
};

export default function StockPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batches, setBatches] = useState<BatchWithProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [search, setSearch] = useState("");
  const [movementSearch, setMovementSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  const [entryForm, setEntryForm] = useState<EntryFormState>(initialEntryForm);
  const [correctionForm, setCorrectionForm] =
    useState<CorrectionFormState>(initialCorrectionForm);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const currentPharmacy = await getCurrentPharmacy();

      if (!currentPharmacy) {
        setPharmacy(null);
        setProducts([]);
        setSuppliers([]);
        setBatches([]);
        setMovements([]);
        return;
      }

      setPharmacy(currentPharmacy);

      const [productsData, suppliersData, batchesData, movementsData] =
        await Promise.all([
          getProducts(currentPharmacy.id),
          getSuppliers(currentPharmacy.id),
          getAllActiveBatches(currentPharmacy.id),
          getStockMovements(currentPharmacy.id),
        ]);

      setProducts(productsData);
      setSuppliers(suppliersData);
      setBatches(batchesData);
      setMovements(movementsData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le stock."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredBatches = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) return batches;

    return batches.filter((batch) => {
      const product = batch.product;

      const value = [
        product?.name,
        product?.generic_name,
        product?.dosage,
        product?.form,
        batch.batch_number,
        batch.expiry_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return value.includes(normalized);
    });
  }, [batches, search]);

  const filteredMovements = useMemo(() => {
    const normalized = movementSearch.trim().toLowerCase();

    if (!normalized) return movements;

    return movements.filter((movement) => {
      const value = [
        movement.product_name,
        movement.generic_name,
        movement.batch_number,
        movement.movement_type,
        movement.reason,
        movement.user_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return value.includes(normalized);
    });
  }, [movements, movementSearch]);

  const totalBatches = batches.length;

  const totalQuantity = batches.reduce(
    (sum, batch) => sum + Number(batch.quantity_available || 0),
    0
  );

  const stockValuePurchase = batches.reduce(
    (sum, batch) =>
      sum +
      Number(batch.quantity_available || 0) * Number(batch.purchase_price || 0),
    0
  );

  const stockValueSale = batches.reduce(
    (sum, batch) =>
      sum +
      Number(batch.quantity_available || 0) * Number(batch.selling_price || 0),
    0
  );

  function updateEntryField<K extends keyof EntryFormState>(
    field: K,
    value: EntryFormState[K]
  ) {
    setEntryForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateCorrectionField<K extends keyof CorrectionFormState>(
    field: K,
    value: CorrectionFormState[K]
  ) {
    setCorrectionForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCorrection(batch: BatchWithProduct) {
    setCorrectionForm({
      batchId: batch.id,
      currentQuantity: String(Number(batch.quantity_available || 0)),
      newQuantity: String(Number(batch.quantity_available || 0)),
      reason: "Correction inventaire",
    });

    setIsCorrectionOpen(true);
  }

  async function handleAddEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSavingEntry(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!entryForm.productId) {
        throw new Error("Le produit est obligatoire.");
      }

      if (!entryForm.expiryDate) {
        throw new Error("La date d’expiration est obligatoire.");
      }

      const quantity = Number(entryForm.quantity || 0);

      if (quantity <= 0) {
        throw new Error("La quantité doit être supérieure à zéro.");
      }

      await addStockBatch({
        productId: entryForm.productId,
        supplierId: entryForm.supplierId,
        batchNumber: entryForm.batchNumber,
        expiryDate: entryForm.expiryDate,
        purchasePrice: Number(entryForm.purchasePrice || 0),
        sellingPrice: Number(entryForm.sellingPrice || 0),
        quantity,
        reason: entryForm.reason,
      });

      setEntryForm(initialEntryForm);
      setIsEntryOpen(false);
      setSuccessMessage("Entrée de stock enregistrée avec succès.");

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer l’entrée de stock."
      );
    } finally {
      setIsSavingEntry(false);
    }
  }

  async function handleCorrection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSavingCorrection(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!correctionForm.batchId) {
        throw new Error("Le lot est obligatoire.");
      }

      const newQuantity = Number(correctionForm.newQuantity || 0);

      if (newQuantity < 0) {
        throw new Error("La quantité ne peut pas être négative.");
      }

      await correctBatchQuantity({
        batchId: correctionForm.batchId,
        newQuantity,
        reason: correctionForm.reason,
      });

      setCorrectionForm(initialCorrectionForm);
      setIsCorrectionOpen(false);
      setSuccessMessage("Correction de stock enregistrée avec succès.");

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de corriger ce lot."
      );
    } finally {
      setIsSavingCorrection(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-500">
            Chargement du stock...
          </p>
        </div>
      </main>
    );
  }

  if (!pharmacy) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-800">
            Aucune pharmacie trouvée
          </h1>
          <p className="mt-2 text-sm font-medium text-amber-700">
            Créez une pharmacie avant de gérer le stock.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                {pharmacy.name}
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Stock
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Gestion des lots, entrées, corrections d’inventaire et mouvements.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RefreshCcw className="h-5 w-5" />
                Actualiser
              </button>

              <button
                type="button"
                onClick={() => setIsEntryOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
              >
                <PackagePlus className="h-5 w-5" />
                Entrée stock
              </button>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            {successMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Lots actifs"
            value={totalBatches.toString()}
            icon={<Boxes className="h-6 w-6" />}
            tone="blue"
          />

          <MetricCard
            title="Quantité disponible"
            value={totalQuantity.toString()}
            icon={<ClipboardList className="h-6 w-6" />}
            tone="green"
          />

          <MetricCard
            title="Valeur achat"
            value={`${stockValuePurchase.toLocaleString("fr-CD")} CDF`}
            icon={<PackagePlus className="h-6 w-6" />}
            tone="orange"
          />

          <MetricCard
            title="Valeur vente"
            value={`${stockValueSale.toLocaleString("fr-CD")} CDF`}
            icon={<CalendarClock className="h-6 w-6" />}
            tone="purple"
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Lots en stock
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Quantités disponibles par produit, lot et date d’expiration.
              </p>
            </div>

            <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:w-96">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Produit, DCI, lot, expiration..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Produit</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>Prix achat</TableHead>
                    <TableHead>Prix vente</TableHead>
                    <TableHead>Valeur achat</TableHead>
                    <TableHead>Action</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Aucun lot trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">
                            {batch.product?.name || "Produit"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[
                              batch.product?.generic_name,
                              batch.product?.dosage,
                              batch.product?.form,
                            ]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {batch.batch_number || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {batch.expiry_date}
                        </td>

                        <td className="px-5 py-4 font-black text-slate-950">
                          {Number(batch.quantity_available)}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {Number(batch.purchase_price).toLocaleString("fr-CD")} CDF
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {Number(batch.selling_price).toLocaleString("fr-CD")} CDF
                        </td>

                        <td className="px-5 py-4 font-black text-slate-950">
                          {(
                            Number(batch.quantity_available || 0) *
                            Number(batch.purchase_price || 0)
                          ).toLocaleString("fr-CD")}{" "}
                          CDF
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openCorrection(batch)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
                          >
                            <PencilLine className="h-4 w-4" />
                            Corriger
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Historique des mouvements
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Entrées, ventes, corrections, expirations et autres mouvements.
              </p>
            </div>

            <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:w-96">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={movementSearch}
                onChange={(event) => setMovementSearch(event.target.value)}
                placeholder="Rechercher un mouvement..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Date</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Utilisateur</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Aucun mouvement trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {new Date(movement.created_at).toLocaleString("fr-CD")}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">
                            {movement.product_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[movement.dosage, movement.form]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {movement.batch_number || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <MovementBadge type={movement.movement_type} />
                        </td>

                        <td className="px-5 py-4 font-black text-slate-950">
                          {Number(movement.quantity)}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {movement.reason || "-"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {movement.user_name || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {isEntryOpen && (
          <Modal title="Entrée de stock" onClose={() => setIsEntryOpen(false)}>
            <form onSubmit={handleAddEntry} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Produit">
                  <select
                    value={entryForm.productId}
                    onChange={(event) =>
                      updateEntryField("productId", event.target.value)
                    }
                    className="form-input"
                    required
                  >
                    <option value="">Sélectionner un produit</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.dosage ? ` - ${product.dosage}` : ""}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Fournisseur">
                  <select
                    value={entryForm.supplierId}
                    onChange={(event) =>
                      updateEntryField("supplierId", event.target.value)
                    }
                    className="form-input"
                  >
                    <option value="">Aucun fournisseur</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Numéro de lot">
                  <input
                    value={entryForm.batchNumber}
                    onChange={(event) =>
                      updateEntryField("batchNumber", event.target.value)
                    }
                    className="form-input"
                    placeholder="Ex : LOT-001"
                  />
                </FormField>

                <FormField label="Date d’expiration">
                  <input
                    type="date"
                    value={entryForm.expiryDate}
                    onChange={(event) =>
                      updateEntryField("expiryDate", event.target.value)
                    }
                    className="form-input"
                    required
                  />
                </FormField>

                <FormField label="Prix d’achat">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryForm.purchasePrice}
                    onChange={(event) =>
                      updateEntryField("purchasePrice", event.target.value)
                    }
                    className="form-input"
                  />
                </FormField>

                <FormField label="Prix de vente">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryForm.sellingPrice}
                    onChange={(event) =>
                      updateEntryField("sellingPrice", event.target.value)
                    }
                    className="form-input"
                  />
                </FormField>

                <FormField label="Quantité">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={entryForm.quantity}
                    onChange={(event) =>
                      updateEntryField("quantity", event.target.value)
                    }
                    className="form-input"
                    required
                  />
                </FormField>
              </div>

              <FormField label="Motif">
                <textarea
                  value={entryForm.reason}
                  onChange={(event) =>
                    updateEntryField("reason", event.target.value)
                  }
                  className="form-input min-h-20 resize-none"
                />
              </FormField>

              <ModalActions
                isSaving={isSavingEntry}
                savingLabel="Enregistrement..."
                submitLabel="Enregistrer l’entrée"
                onCancel={() => setIsEntryOpen(false)}
              />
            </form>
          </Modal>
        )}

        {isCorrectionOpen && (
          <Modal
            title="Correction d’inventaire"
            onClose={() => setIsCorrectionOpen(false)}
          >
            <form onSubmit={handleCorrection} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Quantité actuelle">
                  <input
                    value={correctionForm.currentQuantity}
                    className="form-input bg-slate-50"
                    disabled
                  />
                </FormField>

                <FormField label="Nouvelle quantité physique">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={correctionForm.newQuantity}
                    onChange={(event) =>
                      updateCorrectionField("newQuantity", event.target.value)
                    }
                    className="form-input"
                    required
                  />
                </FormField>
              </div>

              <FormField label="Motif de correction">
                <textarea
                  value={correctionForm.reason}
                  onChange={(event) =>
                    updateCorrectionField("reason", event.target.value)
                  }
                  className="form-input min-h-24 resize-none"
                  placeholder="Ex : inventaire physique, casse, erreur de saisie..."
                />
              </FormField>

              <ModalActions
                isSaving={isSavingCorrection}
                savingLabel="Correction..."
                submitLabel="Enregistrer la correction"
                onCancel={() => setIsCorrectionOpen(false)}
              />
            </form>
          </Modal>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: "blue" | "green" | "orange" | "purple";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
  }[tone];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
      >
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function MovementBadge({ type }: { type: StockMovementType }) {
  const labels: Record<StockMovementType, string> = {
    supplier_entry: "Entrée",
    sale: "Vente",
    customer_return: "Retour client",
    supplier_return: "Retour fournisseur",
    adjustment_in: "Ajustement +",
    adjustment_out: "Ajustement -",
    loss: "Perte",
    damage: "Casse",
    expired: "Expiré",
    transfer_in: "Transfert +",
    transfer_out: "Transfert -",
    inventory_correction: "Inventaire",
  };

  const positiveTypes: StockMovementType[] = [
    "supplier_entry",
    "customer_return",
    "adjustment_in",
    "transfer_in",
  ];

  const className = positiveTypes.includes(type)
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : "border-orange-100 bg-orange-50 text-orange-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {labels[type] ?? type}
    </span>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
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

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cette action sera enregistrée dans l’historique du stock.
            </p>
          </div>

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
  isSaving,
  savingLabel,
  submitLabel,
  onCancel,
}: {
  isSaving: boolean;
  savingLabel: string;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
      >
        Annuler
      </button>

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="h-5 w-5" />
        {isSaving ? savingLabel : submitLabel}
      </button>
    </div>
  );
}