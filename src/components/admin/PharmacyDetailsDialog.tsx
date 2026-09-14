"use client";

import { X } from "lucide-react";

import type { AdminPharmacy } from "@/types/admin";

type PharmacyDetailsDialogProps = {
  pharmacy: AdminPharmacy | null;
  onClose: () => void;
};

export default function PharmacyDetailsDialog({
  pharmacy,
  onClose,
}: PharmacyDetailsDialogProps) {
  if (!pharmacy) return null;

  const status = pharmacy.archived_at
    ? "Archivée"
    : pharmacy.is_active
      ? "Active"
      : "Désactivée";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm md:items-center md:p-8">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-white p-6 text-slate-950 shadow-2xl md:rounded-[2rem]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Fiche pharmacie
            </p>
            <h2 className="mt-1 text-2xl font-black">{pharmacy.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{pharmacy.slug}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
          <Metric label="Statut" value={status} />
          <Metric label="Membres actifs" value={pharmacy.health.activeMembers} />
          <Metric label="Produits" value={pharmacy.health.productsCount} />
          <Metric label="Ventes (30j)" value={pharmacy.health.salesLast30d} />
          <Metric
            label="Taux de change"
            value={`1 USD = ${Number(pharmacy.exchange_rate).toLocaleString("fr-CD")} CDF`}
          />
          <Metric
            label="Créée le"
            value={new Date(pharmacy.created_at).toLocaleDateString("fr-CD")}
          />
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Pharmacien responsable" value={pharmacy.pharmacist_name} />
          <Field label="Téléphone" value={pharmacy.phone} />
          <Field label="WhatsApp" value={pharmacy.whatsapp} />
          <Field label="Email" value={pharmacy.email} />
          <Field label="Adresse" value={pharmacy.address} />
          <Field label="Ville" value={pharmacy.city} />
          <Field label="Commune" value={pharmacy.commune} />
          <Field label="Quartier" value={pharmacy.district} />
          <Field label="Province" value={pharmacy.province} />
          <Field label="Pays" value={pharmacy.country} />
        </dl>

        {pharmacy.invoice_footer && (
          <div className="mt-6 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Pied de facture / ticket
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {pharmacy.invoice_footer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-800">
        {value?.trim() || "-"}
      </dd>
    </div>
  );
}
