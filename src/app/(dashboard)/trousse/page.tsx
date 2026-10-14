"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  BriefcaseMedical,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { KIT_MODULE_LABEL } from "@/lib/constants";
import {
  cancelKitRequisition,
  createKitRequisition,
  getKitRequisitions,
} from "@/services/kit.service";
import { getCurrentPharmacy } from "@/services/pharmacies.service";
import { getSellableProducts } from "@/services/sales.service";

import type { KitRequisition } from "@/types/kit";
import type { PharmacyWithRole } from "@/types/pharmacy";
import type { SellableProduct } from "@/types/sale";

const PERIODS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
  { days: 365, label: "12 mois" },
];

const DEPARTMENT_SUGGESTIONS = [
  "Urgences",
  "Maternité",
  "Pédiatrie",
  "Bloc opératoire",
  "Hospitalisation",
  "Garde de nuit",
];

const DAY_MS = 86_400_000;

type DraftLine = {
  productId: string;
  name: string;
  available: number;
  quantity: number;
};

function money(value: number) {
  return `${Math.round(value).toLocaleString("fr-CD")} CDF`;
}

function num(value: number) {
  return Number(value || 0).toLocaleString("fr-CD");
}

export default function KitPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyWithRole | null>(null);
  const [products, setProducts] = useState<SellableProduct[]>([]);
  const [requisitions, setRequisitions] = useState<KitRequisition[]>([]);
  const [days, setDays] = useState(30);
  // Instant de référence des calculs (fixé au chargement : le rendu reste pur).
  const [referenceTime, setReferenceTime] = useState(() => Date.now());

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      const current = await getCurrentPharmacy();

      setPharmacy(current);

      if (!current) return;

      // On charge 2 périodes pour comparer avec la période précédente.
      const since = new Date(Date.now() - 2 * days * DAY_MS).toISOString();

      const [requisitionData, productData] = await Promise.all([
        getKitRequisitions(current.id, since),
        getSellableProducts(current.id).catch(() => [] as SellableProduct[]),
      ]);

      setRequisitions(requisitionData);
      setProducts(productData);
      setReferenceTime(Date.now());
      setErrorMessage("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Chargement impossible.";

      setErrorMessage(
        /kit_requisition/.test(message)
          ? "Le module doit être activé : exécutez la migration 0004_pricing_payments_first_aid.sql dans Supabase."
          : message
      );
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const canCancel =
    pharmacy?.role === "owner" ||
    pharmacy?.role === "manager" ||
    pharmacy?.role === "pharmacist";

  const analysis = useMemo(() => {
    const now = referenceTime;
    const currentStart = now - days * DAY_MS;
    const previousStart = now - 2 * days * DAY_MS;

    const completed = requisitions.filter((item) => item.status === "completed");
    const current = completed.filter(
      (item) => new Date(item.created_at).getTime() >= currentStart
    );
    const previous = completed.filter((item) => {
      const time = new Date(item.created_at).getTime();

      return time >= previousStart && time < currentStart;
    });

    const sum = (rows: KitRequisition[], key: "total_cost" | "total_quantity") =>
      rows.reduce((total, row) => total + Number(row[key] || 0), 0);

    const totalCost = sum(current, "total_cost");
    const previousCost = sum(previous, "total_cost");

    const group = (
      keyOf: (row: KitRequisition) => string,
      valueOf: (row: KitRequisition) => number
    ) => {
      const map = new Map<string, { label: string; count: number; value: number }>();

      for (const row of current) {
        const label = keyOf(row);
        const entry = map.get(label) ?? { label, count: 0, value: 0 };

        entry.count += 1;
        entry.value += valueOf(row);
        map.set(label, entry);
      }

      return Array.from(map.values()).sort((a, b) => b.value - a.value);
    };

    const productMap = new Map<string, { label: string; qty: number; cost: number }>();

    for (const requisition of current) {
      for (const item of requisition.kit_requisition_items ?? []) {
        const entry = productMap.get(item.product_name) ?? {
          label: item.product_name,
          qty: 0,
          cost: 0,
        };

        entry.qty += Number(item.quantity || 0);
        entry.cost += Number(item.total_cost || 0);
        productMap.set(item.product_name, entry);
      }
    }

    // Évolution : un point par jour (≤ 31 j) ou par semaine (au-delà).
    const bucketDays = days <= 31 ? 1 : 7;
    const bucketCount = Math.ceil(days / bucketDays);
    const buckets = Array.from({ length: bucketCount }, (_, index) => ({
      key: index,
      cost: 0,
      start: now - (bucketCount - index) * bucketDays * DAY_MS,
    }));

    for (const row of current) {
      const time = new Date(row.created_at).getTime();
      const index = Math.min(
        bucketCount - 1,
        Math.max(0, bucketCount - 1 - Math.floor((now - time) / (bucketDays * DAY_MS)))
      );

      buckets[index].cost += Number(row.total_cost || 0);
    }

    return {
      count: current.length,
      qty: sum(current, "total_quantity"),
      totalCost,
      averageCost: current.length > 0 ? totalCost / current.length : 0,
      deltaPercent:
        previousCost > 0
          ? Math.round(((totalCost - previousCost) / previousCost) * 100)
          : null,
      topProducts: Array.from(productMap.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5),
      byRequester: group((row) => row.requester_name, (row) => Number(row.total_cost || 0)).slice(0, 5),
      byDepartment: group((row) => row.department || "Non précisé", (row) => Number(row.total_cost || 0)).slice(0, 5),
      buckets,
      maxBucket: Math.max(1, ...buckets.map((bucket) => bucket.cost)),
      cancelledCount: requisitions.filter(
        (item) =>
          item.status === "cancelled" &&
          new Date(item.created_at).getTime() >= currentStart
      ).length,
    };
  }, [requisitions, days, referenceTime]);

  const visibleRequisitions = useMemo(
    () =>
      requisitions.filter(
        (item) =>
          new Date(item.created_at).getTime() >= referenceTime - days * DAY_MS
      ),
    [requisitions, days, referenceTime]
  );

  async function handleCancel(requisition: KitRequisition) {
    const reason = window.prompt(
      `Annuler ${requisition.reference} ? Les produits seront remis en stock.\n\nMotif (facultatif) :`
    );

    if (reason === null) return;

    setBusyId(requisition.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await cancelKitRequisition(requisition.id, reason);
      setSuccessMessage(`${requisition.reference} annulé : stock rétabli.`);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Annulation impossible."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <BriefcaseMedical className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                  Gardes et urgences
                </p>
                <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                  {KIT_MODULE_LABEL}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Enregistrez les produits prélevés par les médecins pendant les
                  gardes. Chaque prélèvement sort du stock, est valorisé au prix
                  d’achat et comptabilisé séparément des ventes.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-slate-700 hover:bg-slate-50"
                aria-label="Actualiser"
              >
                <RefreshCcw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                disabled={!pharmacy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Plus className="h-5 w-5" />
                Nouveau prélèvement
              </button>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* KPI */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((period) => (
              <button
                key={period.days}
                type="button"
                onClick={() => setDays(period.days)}
                className={`rounded-full border px-4 py-2 text-xs font-black ${
                  days === period.days
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Prélèvements" value={num(analysis.count)} hint={analysis.cancelledCount > 0 ? `${analysis.cancelledCount} annulé(s)` : undefined} />
            <Kpi label="Quantité sortie" value={num(analysis.qty)} hint="unités" />
            <Kpi
              label="Coût total"
              value={money(analysis.totalCost)}
              hint={
                analysis.deltaPercent === null
                  ? "pas de période précédente"
                  : `${analysis.deltaPercent >= 0 ? "+" : ""}${analysis.deltaPercent} % vs période précédente`
              }
              tone={analysis.deltaPercent !== null && analysis.deltaPercent > 0 ? "warn" : "default"}
            />
            <Kpi label="Coût moyen" value={money(analysis.averageCost)} hint="par prélèvement" />
          </div>
        </section>

        {/* Analyse */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Évolution du coût">
            {analysis.count === 0 ? (
              <Empty text="Aucun prélèvement sur cette période." />
            ) : (
              <div className="flex h-32 items-end gap-1">
                {analysis.buckets.map((bucket) => (
                  <div
                    key={bucket.key}
                    className="flex-1 rounded-t bg-red-400/80"
                    style={{ height: `${Math.max(3, (bucket.cost / analysis.maxBucket) * 100)}%`, opacity: bucket.cost > 0 ? 1 : 0.2 }}
                    title={`${new Date(bucket.start).toLocaleDateString("fr-FR")} : ${money(bucket.cost)}`}
                  />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Produits les plus prélevés">
            {analysis.topProducts.length === 0 ? (
              <Empty text="Aucune donnée." />
            ) : (
              <Bars
                rows={analysis.topProducts.map((row) => ({
                  label: row.label,
                  value: row.qty,
                  text: `${num(row.qty)} · ${money(row.cost)}`,
                }))}
              />
            )}
          </Panel>

          <Panel title="Par médecin / demandeur (coût)">
            {analysis.byRequester.length === 0 ? (
              <Empty text="Aucune donnée." />
            ) : (
              <Bars
                rows={analysis.byRequester.map((row) => ({
                  label: row.label,
                  value: row.value,
                  text: `${money(row.value)} · ${row.count} prél.`,
                }))}
              />
            )}
          </Panel>

          <Panel title="Par service / garde (coût)">
            {analysis.byDepartment.length === 0 ? (
              <Empty text="Aucune donnée." />
            ) : (
              <Bars
                rows={analysis.byDepartment.map((row) => ({
                  label: row.label,
                  value: row.value,
                  text: `${money(row.value)} · ${row.count} prél.`,
                }))}
              />
            )}
          </Panel>
        </section>

        {/* Historique */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <h2 className="text-lg font-black text-slate-950">Historique des prélèvements</h2>

          {visibleRequisitions.length === 0 ? (
            <div className="mt-3">
              <Empty text="Aucun prélèvement enregistré sur cette période." />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {visibleRequisitions.map((requisition) => {
                const expanded = expandedId === requisition.id;
                const cancelled = requisition.status === "cancelled";

                return (
                  <li
                    key={requisition.id}
                    className={`rounded-2xl border ${cancelled ? "border-slate-100 bg-slate-50" : "border-slate-200"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : requisition.id)}
                      className="flex w-full items-center justify-between gap-3 p-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-black ${cancelled ? "text-slate-400 line-through" : "text-slate-950"}`}>
                          {requisition.requester_name}
                          {requisition.department ? ` · ${requisition.department}` : ""}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {requisition.reference} ·{" "}
                          {new Date(requisition.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-950">{money(requisition.total_cost)}</p>
                          <p className="text-xs text-slate-500">{num(requisition.total_quantity)} unité(s)</p>
                        </div>
                        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="space-y-3 border-t border-slate-100 p-3">
                        {requisition.reason && (
                          <p className="text-sm text-slate-600"><strong>Motif :</strong> {requisition.reason}</p>
                        )}
                        <ul className="space-y-1 text-sm">
                          {(requisition.kit_requisition_items ?? []).map((item) => (
                            <li key={item.id} className="flex justify-between gap-3">
                              <span className="min-w-0 truncate text-slate-700">
                                {num(item.quantity)} × {item.product_name}
                                {item.batch_number ? ` (lot ${item.batch_number})` : ""}
                              </span>
                              <span className="shrink-0 text-slate-500">{money(item.total_cost)}</span>
                            </li>
                          ))}
                        </ul>
                        {cancelled ? (
                          <p className="text-xs font-bold text-slate-500">
                            Annulé{requisition.cancel_reason ? ` : ${requisition.cancel_reason}` : ""} — stock rétabli.
                          </p>
                        ) : (
                          canCancel && (
                            <button
                              type="button"
                              disabled={busyId === requisition.id}
                              onClick={() => void handleCancel(requisition)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              <Undo2 className="h-4 w-4" />
                              Annuler et remettre en stock
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {isFormOpen && pharmacy && (
        <RequisitionDialog
          pharmacyId={pharmacy.id}
          products={products}
          knownDepartments={Array.from(
            new Set([
              ...DEPARTMENT_SUGGESTIONS,
              ...requisitions.map((item) => item.department).filter(Boolean),
            ])
          ) as string[]}
          onClose={() => setIsFormOpen(false)}
          onCreated={async (message) => {
            setIsFormOpen(false);
            setSuccessMessage(message);
            await load();
          }}
        />
      )}
    </main>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-slate-950 md:text-3xl">{value}</p>
      {hint && (
        <p className={`mt-1 text-xs font-semibold ${tone === "warn" ? "text-amber-700" : "text-slate-400"}`}>{hint}</p>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <h3 className="mb-3 text-sm font-black text-slate-950">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">{text}</p>;
}

function Bars({ rows }: { rows: { label: string; value: number; text: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-bold text-slate-700">{row.label}</span>
            <span className="shrink-0 text-slate-500">{row.text}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-red-500" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RequisitionDialog({
  pharmacyId,
  products,
  knownDepartments,
  onClose,
  onCreated,
}: {
  pharmacyId: string;
  products: SellableProduct[];
  knownDepartments: string[];
  onClose: () => void;
  onCreated: (message: string) => Promise<void>;
}) {
  const [requester, setRequester] = useState("");
  const [department, setDepartment] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return [];

    return products
      .filter(
        (product) =>
          !lines.some((line) => line.productId === product.product_id) &&
          [product.name, product.generic_name, product.dosage]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term)
      )
      .slice(0, 8);
  }, [search, products, lines]);

  function addLine(product: SellableProduct) {
    setLines((current) => [
      ...current,
      {
        productId: product.product_id,
        name: [product.name, product.dosage].filter(Boolean).join(" "),
        available: Number(product.total_quantity || 0),
        quantity: 1,
      },
    ]);
    setSearch("");
  }

  function setQuantity(productId: string, quantity: number) {
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? { ...line, quantity: Math.max(1, Math.min(line.available, quantity || 1)) }
          : line
      )
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!requester.trim()) {
      setErrorMessage("Indiquez le nom du médecin demandeur.");
      return;
    }

    if (lines.length === 0) {
      setErrorMessage("Ajoutez au moins un produit.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await createKitRequisition({
        pharmacyId,
        requesterName: requester,
        department,
        reason,
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      });

      await onCreated(
        `Prélèvement ${result.reference} enregistré : ${num(result.total_quantity)} unité(s), ${money(result.total_cost)}.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Enregistrement impossible.");
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm md:items-center md:p-8">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-white p-5 text-slate-950 shadow-2xl md:rounded-[2rem] md:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />

        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">{KIT_MODULE_LABEL}</p>
            <h2 className="mt-1 text-2xl font-black">Nouveau prélèvement</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{errorMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Médecin demandeur *</span>
              <input value={requester} onChange={(event) => setRequester(event.target.value)} placeholder="Dr …" className="form-input" maxLength={120} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Service / garde</span>
              <input value={department} onChange={(event) => setDepartment(event.target.value)} list="kit-departments" placeholder="Ex. Urgences" className="form-input" maxLength={80} />
              <datalist id="kit-departments">
                {knownDepartments.map((name) => (<option key={name} value={name} />))}
              </datalist>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Motif / patient (optionnel)</span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex. urgence respiratoire, réf. dossier…" className="form-input" maxLength={200} />
          </label>

          <div>
            <span className="mb-2 block text-sm font-bold text-slate-700">Produits prélevés *</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit en stock…" className="form-input pl-10" />
            </div>

            {matches.length > 0 && (
              <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                {matches.map((product) => (
                  <li key={product.product_id}>
                    <button type="button" onClick={() => addLine(product)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                      <span className="min-w-0 truncate text-sm font-bold text-slate-800">
                        {[product.name, product.dosage].filter(Boolean).join(" ")}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">Stock : {num(Number(product.total_quantity || 0))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {search.trim() && matches.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">Aucun produit en stock ne correspond.</p>
            )}

            {lines.length > 0 && (
              <ul className="mt-3 space-y-2">
                {lines.map((line) => (
                  <li key={line.productId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{line.name}</p>
                      <p className="text-xs text-slate-500">Disponible : {num(line.available)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => setQuantity(line.productId, line.quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200" aria-label="Moins"><Minus className="h-4 w-4" /></button>
                      <input value={line.quantity} onChange={(event) => setQuantity(line.productId, Number(event.target.value))} inputMode="numeric" className="h-9 w-14 rounded-xl border border-slate-200 text-center text-sm font-black" />
                      <button type="button" onClick={() => setQuantity(line.productId, line.quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200" aria-label="Plus"><Plus className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))} className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 text-red-600" aria-label="Retirer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            Les lots les plus proches de l’expiration sont prélevés en premier ; les lots expirés sont toujours exclus. Le coût est enregistré au prix d’achat.
          </p>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">Annuler</button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60">
              <BriefcaseMedical className="h-5 w-5" />
              {isSaving ? "Enregistrement..." : "Enregistrer le prélèvement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
