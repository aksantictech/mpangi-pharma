/*
 * Impression de rapports (inventaire, historique des mouvements…) : un document
 * A4 propre avec le logo et les coordonnées de la pharmacie, un tableau qui
 * répète son en-tête à chaque page, des totaux et des zones de signature.
 *
 * Le document est écrit dans un iframe isolé (aucune feuille de style de
 * l'application) puis imprimé, comme pour les tickets (voir print-invoice.ts).
 */

export type ReportPharmacy = {
  name: string;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  pharmacist_name?: string | null;
};

export type ReportColumn = {
  label: string;
  align?: "left" | "right" | "center";
  /** Largeur CSS facultative (ex. "18%"). */
  width?: string;
};

export type ReportOptions = {
  pharmacy: ReportPharmacy;
  title: string;
  /** Ligne sous le titre (période, filtres…). */
  subtitle?: string;
  /** Petites informations en tête (libellé / valeur). */
  meta?: Array<{ label: string; value: string }>;
  /** Cartes de synthèse au-dessus du tableau. */
  summary?: Array<{ label: string; value: string }>;
  columns: ReportColumn[];
  rows: string[][];
  /** Ligne de totaux (même nombre de cellules que `columns`). */
  totals?: string[];
  /** Remarque affichée sous le tableau (méthode de calcul, taux de conversion…). */
  note?: string;
  orientation?: "portrait" | "landscape";
  /** Nom de la personne qui imprime. */
  printedBy?: string;
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeLogoUrl(url?: string | null) {
  // Seules les images http(s) ou data: sont acceptées dans le document imprimé.
  if (!url) return "";

  return /^(https?:|data:image\/)/i.test(url) ? url : "";
}

export function buildReportHtml(options: ReportOptions) {
  const { pharmacy } = options;
  const logoUrl = safeLogoUrl(pharmacy.logo_url);
  const orientation = options.orientation ?? "portrait";

  const address = [pharmacy.address, pharmacy.city].filter(Boolean).join(", ");
  const contact = [pharmacy.phone, pharmacy.email].filter(Boolean).join(" · ");

  const head = options.columns
    .map(
      (column) =>
        `<th class="${column.align ?? "left"}"${
          column.width ? ` style="width:${escapeHtml(column.width)}"` : ""
        }>${escapeHtml(column.label)}</th>`
    )
    .join("");

  const body = options.rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, index) =>
              `<td class="${options.columns[index]?.align ?? "left"}">${escapeHtml(
                cell
              )}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  const totals = options.totals
    ? `<tr class="totals">${options.totals
        .map(
          (cell, index) =>
            `<td class="${options.columns[index]?.align ?? "left"}">${escapeHtml(
              cell
            )}</td>`
        )
        .join("")}</tr>`
    : "";

  const meta = (options.meta ?? [])
    .map(
      (item) =>
        `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(
          item.value
        )}</strong></div>`
    )
    .join("");

  const summary = (options.summary ?? [])
    .map(
      (item) =>
        `<div class="card"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(
          item.value
        )}</strong></div>`
    )
    .join("");

  const printedAt = new Date().toLocaleString("fr-FR");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(options.title)} - ${escapeHtml(pharmacy.name)}</title>
<style>
  @page { size: A4 ${orientation}; margin: 12mm 10mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #0f172a;
    font-size: 9.5pt;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 3px solid #1d4ed8;
  }
  .brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .logo { max-height: 64px; max-width: 120px; object-fit: contain; }
  .brand h1 { margin: 0; font-size: 15pt; font-weight: 800; }
  .brand p { margin: 2px 0 0; font-size: 8.5pt; color: #475569; }
  .doc { text-align: right; }
  .doc h2 { margin: 0; font-size: 14pt; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: .04em; }
  .doc p { margin: 3px 0 0; font-size: 8.5pt; color: #475569; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 22px; margin: 12px 0 0; font-size: 8.5pt; }
  .meta span { color: #64748b; margin-right: 5px; }
  .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 0; }
  .card { flex: 1 1 120px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; background: #f8fafc; }
  .card span { display: block; font-size: 7.5pt; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
  .card strong { display: block; margin-top: 2px; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th {
    background: #1e3a8a; color: #fff; font-size: 7.5pt; text-transform: uppercase;
    letter-spacing: .03em; padding: 6px 5px; border: 1px solid #1e3a8a;
  }
  td { padding: 4.5px 5px; border: 1px solid #cbd5e1; font-size: 8.5pt; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f1f5f9; }
  tr.totals td { background: #dbeafe !important; font-weight: 800; border-top: 2px solid #1e3a8a; }
  .left { text-align: left; } .right { text-align: right; } .center { text-align: center; }
  .note { margin-top: 10px; font-size: 8pt; color: #475569; }
  .signatures { display: flex; justify-content: space-between; gap: 30px; margin-top: 28px; break-inside: avoid; }
  .signatures div { flex: 1; border-top: 1px solid #0f172a; padding-top: 5px; font-size: 8.5pt; text-align: center; }
  .footer { margin-top: 14px; font-size: 7.5pt; color: #64748b; display: flex; justify-content: space-between; }
  .empty { padding: 26px; text-align: center; color: #64748b; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="" />` : ""}
      <div>
        <h1>${escapeHtml(pharmacy.name)}</h1>
        ${address ? `<p>${escapeHtml(address)}</p>` : ""}
        ${contact ? `<p>${escapeHtml(contact)}</p>` : ""}
      </div>
    </div>
    <div class="doc">
      <h2>${escapeHtml(options.title)}</h2>
      ${options.subtitle ? `<p>${escapeHtml(options.subtitle)}</p>` : ""}
      <p>Édité le ${escapeHtml(printedAt)}${
        options.printedBy ? ` par ${escapeHtml(options.printedBy)}` : ""
      }</p>
    </div>
  </div>

  ${meta ? `<div class="meta">${meta}</div>` : ""}
  ${summary ? `<div class="summary">${summary}</div>` : ""}

  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}${totals}</tbody>
  </table>
  ${options.rows.length === 0 ? `<p class="empty">Aucune ligne à imprimer.</p>` : ""}

  ${options.note ? `<p class="note">${escapeHtml(options.note)}</p>` : ""}

  <div class="signatures">
    <div>${
      pharmacy.pharmacist_name
        ? `Pharmacien responsable : ${escapeHtml(pharmacy.pharmacist_name)}`
        : "Pharmacien responsable"
    }</div>
    <div>Gérant / Contrôleur</div>
  </div>

  <div class="footer">
    <span>Document généré par Mpangi Pharma — AKSANTIC Technology</span>
    <span>${escapeHtml(pharmacy.name)}</span>
  </div>
</body>
</html>`;
}

function waitForImages(doc: Document, timeoutMs = 4000) {
  const images = Array.from(doc.images);

  if (images.length === 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let pending = images.filter((image) => !image.complete).length;

    if (pending === 0) {
      resolve();
      return;
    }

    const done = () => {
      pending -= 1;

      if (pending <= 0) resolve();
    };

    images.forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", done, { once: true });
        // Un logo introuvable ne doit pas empêcher d'imprimer le rapport.
        image.addEventListener("error", done, { once: true });
      }
    });

    window.setTimeout(resolve, timeoutMs);
  });
}

/** Ouvre la boîte d'impression du navigateur pour le rapport donné. */
export async function printReport(options: ReportOptions): Promise<void> {
  await printHtmlDocument(buildReportHtml(options));
}

/** Imprime un document HTML complet via un iframe isolé (sans les styles de l'application). */
export async function printHtmlDocument(html: string): Promise<void> {
  const iframe = document.createElement("iframe");

  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  const printDocument =
    iframe.contentDocument ?? iframe.contentWindow?.document;

  if (!printDocument || !iframe.contentWindow) {
    iframe.remove();
    throw new Error("Impossible de préparer la fenêtre d’impression.");
  }

  printDocument.open();
  printDocument.write(html);
  printDocument.close();

  await waitForImages(printDocument);

  const frameWindow = iframe.contentWindow;

  frameWindow.addEventListener("afterprint", () => iframe.remove(), {
    once: true,
  });

  frameWindow.focus();
  frameWindow.print();

  // afterprint n'est pas fiable partout (WebView Android) : filet de sécurité.
  window.setTimeout(() => iframe.remove(), 120_000);
}
