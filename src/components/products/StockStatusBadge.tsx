import type { StockStatus } from "@/types/product";

type StockStatusBadgeProps = {
  status: StockStatus;
};

const statusConfig: Record<StockStatus, { label: string; className: string }> = {
  available: {
    label: "Disponible",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  low_stock: {
    label: "Stock faible",
    className: "border-amber-100 bg-amber-50 text-amber-700",
  },
  out_of_stock: {
    label: "Rupture",
    className: "border-red-100 bg-red-50 text-red-700",
  },
};

export default function StockStatusBadge({ status }: StockStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${config.className}`}
    >
      {config.label}
    </span>
  );
}