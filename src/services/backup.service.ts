export async function exportPharmacyBackup(pharmacyId: string) {
  const response = await fetch("/api/pharmacy/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pharmacyId,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Impossible d’exporter les données.");
  }

  return result;
}

export function downloadJsonBackup(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}