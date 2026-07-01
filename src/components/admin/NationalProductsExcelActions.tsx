"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import {
  downloadNationalProductTemplate,
  exportNationalProductsToExcel,
  parseNationalProductsExcelFile,
} from "@/lib/national-products-excel";

import type { NationalProduct } from "@/types/national-product";

type NationalProductsExcelActionsProps = {
  products: NationalProduct[];
  onCompleted: () => void | Promise<void>;
};

type ImportResponse = {
  importedCount?: number;
  duplicateCount?: number;
  errorCount?: number;
  errors?: string[];
  validCount?: number;
  expiredCount?: number;
  totalRowsReceived?: number;
  message?: string;
};

export default function NationalProductsExcelActions({
  products,
  onCompleted,
}: NationalProductsExcelActionsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isImporting, setIsImporting] = useState(false);

  function handleTemplateDownload() {
    downloadNationalProductTemplate();
  }

  function handleImportClick() {
    if (isImporting) return;

    fileInputRef.current?.click();
  }

  function handleExport() {
    if (!Array.isArray(products) || products.length === 0) {
      alert(
        "Aucun produit affiché à exporter. Importez le catalogue ou modifiez les filtres."
      );
      return;
    }

    exportNationalProductsToExcel(products, "catalogue-acorep-2026.xlsx");
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setIsImporting(true);

    try {
      const rows = await parseNationalProductsExcelFile(file);

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("Aucune ligne valide trouvée dans le fichier Excel.");
      }

      const confirmed = window.confirm(
        [
          "Importer le catalogue ACOREP 2026 ?",
          "",
          `Lignes détectées : ${rows.length}`,
          "",
          "Cette action va remplacer entièrement l’ancien catalogue national.",
          "Les produits déjà créés dans les pharmacies seront conservés, mais ils ne seront plus liés à l’ancien catalogue.",
        ].join("\n")
      );

      if (!confirmed) {
        return;
      }

      const response = await fetch("/api/admin/national-products/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows,
          replaceExisting: true,
        }),
      });

      let result: ImportResponse = {};

      try {
        result = (await response.json()) as ImportResponse;
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Impossible d’importer le catalogue ACOREP 2026."
        );
      }

      const errors = Array.isArray(result.errors) ? result.errors : [];

      const message = [
        result.message || "Import catalogue ACOREP 2026 terminé.",
        "",
        `Lignes reçues : ${result.totalRowsReceived ?? rows.length}`,
        `Produits importés : ${result.importedCount ?? 0}`,
        `Doublons ignorés : ${result.duplicateCount ?? 0}`,
        `AMM valides : ${result.validCount ?? 0}`,
        `AMM expirées : ${result.expiredCount ?? 0}`,
        `Erreurs : ${result.errorCount ?? errors.length}`,
        errors.length > 0 ? "" : null,
        errors.length > 0
          ? `Premières erreurs :\n${errors.slice(0, 5).join("\n")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      alert(message);

      await onCompleted();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erreur pendant l’import du catalogue ACOREP 2026."
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleTemplateDownload}
        disabled={isImporting}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FileSpreadsheet className="h-5 w-5" />
        Modèle ACOREP
      </button>

      <button
        type="button"
        onClick={handleImportClick}
        disabled={isImporting}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Upload className="h-5 w-5" />
        {isImporting ? "Import en cours..." : "Importer ACOREP 2026"}
      </button>

      <button
        type="button"
        onClick={handleExport}
        disabled={isImporting}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="h-5 w-5" />
        Exporter Excel
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}