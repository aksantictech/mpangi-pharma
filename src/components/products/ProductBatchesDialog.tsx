"use client";

import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  Eye,
  Pencil,
  RefreshCcw,
  Save,
  X,
} from "lucide-react";

import {
  correctBatchQuantity,
  getProductBatches,
  getSuppliers,
  removeBatchFromSale,
  type Supplier,
} from "@/services/products.service";

import type { ProductStockSummary } from "@/types/product";

type ProductBatchesDialogProps = {
  pharmacyId: string;
  product: ProductStockSummary;
  onChanged?: () => void;
};

type ProductBatchForDisplay = {
  id: string;
  pharmacy_id: string;
  product_id: string;
  supplier_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  purchase_price: number | null;
  selling_price: number | null;
  quantity_initial: number | null;
  quantity_available: number | null;
  received_at: string | null;
  is_active: boolean | null;
};

export default function ProductBatchesDialog({
  pharmacyId,
  product,
  onChanged,
}: ProductBatchesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [batches, setBatches] = useState<ProductBatchForDisplay[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [editingBatch, setEditingBatch] =
    useState<ProductBatchForDisplay | null>(null);

  const [newQuantity, setNewQuantity] = useState("");
  const [reason, setReason] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [batchesData, suppliersData] = await Promise.all([
        getProductBatches(product.product_id),
        getSuppliers(pharmacyId),
      ]);

      setBatches(batchesData as unknown as ProductBatchForDisplay[]);
      setSuppliers(suppliersData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les lots du produit."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function openDialog() {
    setIsOpen(true);
    loadData();
  }

  function closeDialog() {
    setIsOpen(false);
    setBatches([]);
    setSuppliers([]);
    setEditingBatch(null);
    setNewQuantity("");
    setReason("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openCorrection(batch: ProductBatchForDisplay) {
    setEditingBatch(batch);
    setNewQuantity(String(Number(batch.quantity_available || 0)));
    setReason("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeCorrection() {
    setEditingBatch(null);
    setNewQuantity("");
    setReason("");
  }

  function getSupplierName(supplierId: string | null) {
    if (!supplierId) return "Aucun fournisseur";

    const supplier = suppliers.find((item) => item.id === supplierId);

    return supplier?.name ?? "Fournisseur inconnu";
  }

  async function handleCorrectQuantity() {
    if (!editingBatch) return;

    setIsUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const quantity = Number(newQuantity || 0);

      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error("La quantité doit être un nombre positif ou zéro.");
      }

      await correctBatchQuantity({
        pharmacyId,
        batchId: editingBatch.id,
        newQuantity: quantity,
        reason,
      });

      setSuccessMessage("Quantité du lot corrigée avec succès.");

      closeCorrection();
      await loadData();
      onChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de corriger la quantité."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRemoveBatch(batch: ProductBatchForDisplay) {
    const confirmed = window.confirm(
      [
        "Retirer ce lot de la vente ?",
        "",
        `Lot : ${batch.batch_number || "Sans numéro"}`,
        `Quantité disponible : ${Number(batch.quantity_available || 0)}`,
        "",
        "Le lot ne sera plus proposé à la vente, mais l’historique reste conservé.",
      ].join("\n")
    );

    if (!confirmed) return;

    setIsUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await removeBatchFromSale({
        pharmacyId,
        batchId: batch.id,
        reason: "Retrait manuel du lot depuis la fiche produit",
      });

      setSuccessMessage("Lot retiré de la vente avec succès.");

      await loadData();
      onChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de retirer le lot de la vente."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  const activeBatches = batches.filter((batch) => batch.is_active);
  const inactiveBatches = batches.filter((batch) => !batch.is_active);

  const totalAvailable = activeBatches.reduce(
    (sum, batch) => sum + Number(batch.quantity_available || 0),
    0
  );

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
      >
        <Eye className="h-4 w-4" />
        Voir lots
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl md:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Lots du produit
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Produit :{" "}
                  <span className="font-black text-slate-800">
                    {product.name}
                  </span>
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {[product.generic_name, product.dosage, product.form]
                    .filter(Boolean)
                    .join(" · ") || "Détails non renseignés"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                {successMessage}
              </div>
            )}

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <SummaryCard
                label="Quantité disponible"
                value={totalAvailable.toString()}
              />

              <SummaryCard
                label="Lots actifs"
                value={activeBatches.length.toString()}
              />

              <SummaryCard
                label="Lots retirés"
                value={inactiveBatches.length.toString()}
              />
            </div>

            {editingBatch && (
              <div className="mb-5 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-700">
                      Correction de lot
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      {editingBatch.batch_number || "Sans numéro"}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Quantité actuelle :{" "}
                      <span className="font-black text-slate-800">
                        {Number(editingBatch.quantity_available || 0)}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeCorrection}
                    className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Nouvelle quantité
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newQuantity}
                      onChange={(event) => setNewQuantity(event.target.value)}
                      className="form-input bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Motif / observation
                    </span>

                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className="form-input bg-white"
                      placeholder="Ex : inventaire, casse, erreur de saisie..."
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleCorrectQuantity}
                    disabled={isUpdating}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Enregistrer
                  </button>
                </div>
              </div>
            )}

            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={loadData}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                Actualiser
              </button>
            </div>

            <div className="space-y-3 md:hidden">
              {isLoading ? (
                <EmptyState text="Chargement des lots..." />
              ) : batches.length === 0 ? (
                <EmptyState text="Aucun lot trouvé pour ce produit." />
              ) : (
                batches.map((batch) => (
                  <MobileBatchCard
                    key={batch.id}
                    batch={batch}
                    supplierName={getSupplierName(batch.supplier_id)}
                    isUpdating={isUpdating}
                    onCorrect={() => openCorrection(batch)}
                    onRemove={() => handleRemoveBatch(batch)}
                  />
                ))
              )}
            </div>

            <div className="hidden overflow-hidden rounded-3xl border border-slate-200 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Lot</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Qté initiale</TableHead>
                      <TableHead>Disponible</TableHead>
                      <TableHead>Prix achat</TableHead>
                      <TableHead>Prix vente</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          Chargement des lots...
                        </td>
                      </tr>
                    ) : batches.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          Aucun lot trouvé pour ce produit.
                        </td>
                      </tr>
                    ) : (
                      batches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-900">
                              {batch.batch_number || "Sans numéro"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Reçu le : {formatDate(batch.received_at)}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {getSupplierName(batch.supplier_id)}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {formatDate(batch.expiry_date)}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {Number(batch.quantity_initial || 0)}
                          </td>

                          <td className="px-5 py-4 font-black text-slate-950">
                            {Number(batch.quantity_available || 0)}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatMoney(batch.purchase_price)}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {formatMoney(batch.selling_price)}
                          </td>

                          <td className="px-5 py-4">
                            <BatchStatusBadge active={Boolean(batch.is_active)} />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openCorrection(batch)}
                                disabled={isUpdating}
                                className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                              >
                                <Pencil className="h-4 w-4" />
                                Corriger
                              </button>

                              {batch.is_active && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBatch(batch)}
                                  disabled={isUpdating}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                                >
                                  <Ban className="h-4 w-4" />
                                  Retirer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileBatchCard({
  batch,
  supplierName,
  isUpdating,
  onCorrect,
  onRemove,
}: {
  batch: ProductBatchForDisplay;
  supplierName: string;
  isUpdating: boolean;
  onCorrect: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-700">
            Lot
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            {batch.batch_number || "Sans numéro"}
          </h3>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            Reçu le : {formatDate(batch.received_at)}
          </p>
        </div>

        <BatchStatusBadge active={Boolean(batch.is_active)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MobileInfo label="Fournisseur" value={supplierName} />

        <MobileInfo label="Expiration" value={formatDate(batch.expiry_date)} />

        <MobileInfo
          label="Qté initiale"
          value={String(Number(batch.quantity_initial || 0))}
        />

        <MobileInfo
          label="Disponible"
          value={String(Number(batch.quantity_available || 0))}
          strong
        />

        <MobileInfo
          label="Prix achat"
          value={formatMoney(batch.purchase_price)}
        />

        <MobileInfo
          label="Prix vente"
          value={formatMoney(batch.selling_price)}
          strong
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCorrect}
          disabled={isUpdating}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" />
          Corriger quantité
        </button>

        {batch.is_active && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isUpdating}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <Ban className="h-4 w-4" />
            Retirer vente
          </button>
        )}
      </div>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function MobileInfo({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm ${
          strong ? "font-black text-slate-950" : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function BatchStatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
        Actif
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
      Retiré
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function formatMoney(value: number | null) {
  return `${Number(value || 0).toLocaleString("fr-FR")} CDF`;
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}