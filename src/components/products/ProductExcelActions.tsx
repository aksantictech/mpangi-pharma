"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import {
  downloadProductExcelTemplate,
  exportProductsToExcel,
  parseProductExcelFile,
} from "@/lib/product-excel";

type ImportResponse = {
  message?: string;
  createdCount?: number;
  errorCount?: number;
  errors?: string[];
};

export default function ProductExcelActions({
  pharmacyId,
  onCompleted,
}: {
  pharmacyId: string;
  onCompleted: () => Promise<void> | void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function handleImportFile(file: File) {
    setIsImporting(true);

    try {
      const parsed = await parseProductExcelFile(file);

      if (parsed.rows.length === 0) {
        alert("Aucune ligne produit trouvée dans le fichier Excel.");
        return;
      }

      if (parsed.errors.length > 0) {
        alert(
          [
            "Le fichier contient des erreurs :",
            "",
            ...parsed.errors.slice(0, 20),
            parsed.errors.length > 20
              ? `... et ${parsed.errors.length - 20} erreur(s) supplémentaire(s).`
              : "",
          ]
            .filter(Boolean)
            .join("\n")
        );

        return;
      }

      const response = await fetch("/api/pharmacy/products/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pharmacyId,
          rows: parsed.rows,
        }),
      });

      const result = (await response.json()) as ImportResponse;

      if (!response.ok) {
        throw new Error(result.message || "Impossible d’importer les produits.");
      }

      const importErrors = result.errors ?? [];

      alert(
        [
          `Import terminé.`,
          `Produits créés : ${result.createdCount ?? 0}`,
          `Erreurs : ${result.errorCount ?? 0}`,
          importErrors.length > 0 ? "" : "",
          ...importErrors.slice(0, 10),
        ]
          .filter(Boolean)
          .join("\n")
      );

      await onCompleted();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Impossible d’importer les produits."
      );
    } finally {
      setIsImporting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleExportProducts() {
    setIsExporting(true);

    try {
      const response = await fetch(
        `/api/pharmacy/products/export?pharmacyId=${pharmacyId}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Impossible d’exporter les produits.");
      }

      exportProductsToExcel(result.products ?? [], result.fileName);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Impossible d’exporter les produits."
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={downloadProductExcelTemplate}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
      >
        <FileSpreadsheet className="h-5 w-5" />
        Modèle Excel
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Upload className="h-5 w-5" />
        {isImporting ? "Import..." : "Importer Excel"}
      </button>

      <button
        type="button"
        onClick={handleExportProducts}
        disabled={isExporting}
        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="h-5 w-5" />
        {isExporting ? "Export..." : "Exporter Excel"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            handleImportFile(file);
          }
        }}
      />
    </div>
  );
}