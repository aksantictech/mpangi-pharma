import type { HelpGuide } from "@/lib/help-content";
import { escapeHtml, printHtmlDocument, type ReportPharmacy } from "@/lib/print-report";

// Les libellés d'écran sont écrits **comme ceci** dans help-content.ts.
function richToHtml(text: string) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function buildGuideHtml(params: {
  pharmacy: ReportPharmacy;
  guide: HelpGuide;
}) {
  const { pharmacy, guide } = params;
  const logoUrl = /^(https?:|data:image\/)/i.test(pharmacy.logo_url ?? "")
    ? (pharmacy.logo_url as string)
    : "";

  const tasks = guide.tasks
    .map(
      (task, index) => `
    <section class="task">
      <h2><span class="num">${index + 1}</span>${escapeHtml(task.title)}</h2>
      <p class="summary">${richToHtml(task.summary)}</p>
      <ol>${task.steps.map((step) => `<li>${richToHtml(step)}</li>`).join("")}</ol>
      ${
        task.tips && task.tips.length > 0
          ? `<div class="tips"><strong>À savoir</strong><ul>${task.tips
              .map((tip) => `<li>${richToHtml(tip)}</li>`)
              .join("")}</ul></div>`
          : ""
      }
    </section>`
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Guide - ${escapeHtml(guide.title)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10.5pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 3px solid #1d4ed8; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { max-height: 56px; max-width: 110px; object-fit: contain; }
  .brand strong { font-size: 13pt; }
  .kind { text-align: right; font-size: 8.5pt; color: #475569; }
  h1 { margin: 16px 0 2px; font-size: 20pt; color: #1d4ed8; }
  .subtitle { margin: 0 0 8px; color: #475569; }
  .task { margin-top: 16px; break-inside: avoid; page-break-inside: avoid; }
  h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12.5pt; }
  .num { display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center; border-radius: 50%; background: #1d4ed8; color: #fff; font-size: 10pt; flex: none; }
  .summary { margin: 3px 0 6px 30px; color: #475569; font-size: 9.5pt; }
  ol { margin: 0 0 0 30px; padding-left: 18px; }
  li { margin: 3px 0; }
  .tips { margin: 8px 0 0 30px; padding: 7px 10px; background: #eff6ff; border-left: 3px solid #1d4ed8; font-size: 9.5pt; }
  .tips ul { margin: 3px 0 0; padding-left: 16px; }
  .footer { margin-top: 22px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 8pt; color: #64748b; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">
      ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="" />` : ""}
      <strong>${escapeHtml(pharmacy.name)}</strong>
    </div>
    <div class="kind">Guide pratique d’utilisation<br />Mpangi Pharma</div>
  </div>

  <h1>${escapeHtml(guide.title)}</h1>
  <p class="subtitle">${escapeHtml(guide.subtitle)}</p>

  ${tasks}

  <div class="footer">
    <span>Mpangi Pharma — AKSANTIC Technology</span>
    <span>Édité le ${escapeHtml(new Date().toLocaleDateString("fr-FR"))}</span>
  </div>
</body>
</html>`;
}

export async function printGuide(params: {
  pharmacy: ReportPharmacy;
  guide: HelpGuide;
}) {
  await printHtmlDocument(buildGuideHtml(params));
}
