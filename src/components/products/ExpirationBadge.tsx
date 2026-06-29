type ExpirationBadgeProps = {
  expiryDate: string | null;
};

function getExpirationStatus(expiryDate: string | null) {
  if (!expiryDate) {
    return {
      label: "Aucun lot",
      className: "border-slate-100 bg-slate-50 text-slate-500",
    };
  }

  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      label: "Expiré",
      className: "border-red-100 bg-red-50 text-red-700",
    };
  }

  if (days <= 30) {
    return {
      label: `${days} j`,
      className: "border-red-100 bg-red-50 text-red-700",
    };
  }

  if (days <= 60) {
    return {
      label: `${days} j`,
      className: "border-orange-100 bg-orange-50 text-orange-700",
    };
  }

  if (days <= 90) {
    return {
      label: `${days} j`,
      className: "border-amber-100 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "OK",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };
}

export default function ExpirationBadge({ expiryDate }: ExpirationBadgeProps) {
  const config = getExpirationStatus(expiryDate);

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${config.className}`}
    >
      {config.label}
    </span>
  );
}