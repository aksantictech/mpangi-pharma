export type InvoicePrintTarget = "thermal" | "a4";

type PrintElementOptions = {
  selector: string;
  target: InvoicePrintTarget;
  documentTitle?: string;
};

const THERMAL_PAGE_WIDTH_MM = 58;
const THERMAL_CONTENT_WIDTH_MM = 54;

export async function printElementInIsolatedFrame({
  selector,
  target,
  documentTitle = "Facture",
}: PrintElementOptions): Promise<void> {
  const sourceElement =
    document.querySelector<HTMLElement>(selector);

  if (!sourceElement) {
    throw new Error(
      `Le modèle d’impression ${selector} est introuvable.`
    );
  }

  await waitForImages(sourceElement);

  const iframe = document.createElement("iframe");

  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const printDocument =
    iframe.contentDocument ?? frameWindow?.document;

  if (!printDocument || !frameWindow) {
    iframe.remove();
    throw new Error(
      "Impossible de préparer la fenêtre d’impression."
    );
  }

  const copiedStyles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((node) => node.outerHTML)
    .join("\n");

  const pageCss =
    target === "a4"
      ? getA4PrintCss()
      : getThermalPrintCss();

  printDocument.open();
  printDocument.write(`
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>${escapeHtml(documentTitle)}</title>

        ${copiedStyles}

        <style>
          *,
          *::before,
          *::after {
            box-sizing: border-box !important;
          }

          html,
          body {
            min-height: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .hidden {
            display: none !important;
          }

          ${pageCss}
        </style>
      </head>

      <body>
        ${sourceElement.outerHTML}
      </body>
    </html>
  `);
  printDocument.close();

  await waitForFrameReady(printDocument);

  frameWindow.focus();

  window.setTimeout(() => {
    frameWindow.print();
  }, target === "thermal" ? 250 : 150);

  window.setTimeout(() => {
    iframe.remove();
  }, 2500);
}

function getA4PrintCss() {
  return `
    @page {
      size: A4 portrait;
      margin: 12mm;
    }

    html,
    body {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .print-invoice-a4 {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .print-ticket {
      display: none !important;
    }
  `;
}

function getThermalPrintCss() {
  return `
    @page {
      size: ${THERMAL_PAGE_WIDTH_MM}mm auto;
      margin: 0;
    }

    html,
    body {
      width: ${THERMAL_PAGE_WIDTH_MM}mm !important;
      min-width: ${THERMAL_PAGE_WIDTH_MM}mm !important;
      max-width: ${THERMAL_PAGE_WIDTH_MM}mm !important;
      margin: 0 !important;
      padding: 0 !important;
      color: #000000 !important;
      background: #ffffff !important;
      font-family: "Courier New", Courier, monospace !important;
      font-size: 11.5pt !important;
      font-weight: 400 !important;
      line-height: 1.35 !important;
      letter-spacing: 0 !important;
      word-spacing: 0 !important;
      transform: none !important;
      zoom: 1 !important;
      filter: none !important;
      text-shadow: none !important;
      text-rendering: optimizeSpeed !important;
      -webkit-font-smoothing: none !important;
    }

    body {
      display: block !important;
    }

    .print-ticket {
      display: block !important;
      width: ${THERMAL_CONTENT_WIDTH_MM}mm !important;
      min-width: ${THERMAL_CONTENT_WIDTH_MM}mm !important;
      max-width: ${THERMAL_CONTENT_WIDTH_MM}mm !important;
      margin: 0 !important;
      padding: 2mm !important;
      color: #000000 !important;
      background: #ffffff !important;
      font-family: "Courier New", Courier, monospace !important;
      font-size: 11.5pt !important;
      font-weight: 400 !important;
      line-height: 1.35 !important;
      letter-spacing: 0 !important;
      word-spacing: 0 !important;
      transform: none !important;
      zoom: 1 !important;
      filter: none !important;
      text-shadow: none !important;
      text-rendering: optimizeSpeed !important;
      -webkit-font-smoothing: none !important;
    }

    .print-ticket,
    .print-ticket * {
      font-family: "Courier New", Courier, monospace !important;
      font-weight: 400 !important;
      color: #000000 !important;
      opacity: 1 !important;
      transform: none !important;
      zoom: 1 !important;
      filter: none !important;
      text-shadow: none !important;
    }

    .print-ticket .ticket-title {
      font-size: 15pt !important;
      font-weight: 400 !important;
      line-height: 1.2 !important;
    }

    .print-ticket .ticket-product {
      font-size: 12pt !important;
      font-weight: 400 !important;
      line-height: 1.3 !important;
    }

    .print-ticket .ticket-detail,
    .print-ticket .ticket-tax-line,
    .print-ticket .ticket-footer {
      font-size: 10.5pt !important;
      font-weight: 400 !important;
    }

    .print-ticket .ticket-total {
      font-size: 14pt !important;
      font-weight: 400 !important;
    }

    .print-ticket img {
      display: block !important;
      width: auto !important;
      max-width: 22mm !important;
      max-height: 13mm !important;
      object-fit: contain !important;
      opacity: 1 !important;
      filter: none !important;
      transform: none !important;
    }

    .print-invoice-a4 {
      display: none !important;
    }
  `;
}

async function waitForFrameReady(
  frameDocument: Document
): Promise<void> {
  await waitForFrameImages(frameDocument);
  await waitForFonts(frameDocument);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

async function waitForImages(
  container: ParentNode
): Promise<void> {
  const images = Array.from(
    container.querySelectorAll("img")
  );

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), {
            once: true,
          });

          image.addEventListener("error", () => resolve(), {
            once: true,
          });
        })
    )
  );
}

async function waitForFrameImages(
  frameDocument: Document
): Promise<void> {
  await waitForImages(frameDocument);
}

async function waitForFonts(
  frameDocument: Document
): Promise<void> {
  const fonts = frameDocument.fonts;

  if (!fonts) return;

  try {
    await fonts.ready;
  } catch {
    // L’impression continue avec les polices disponibles.
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
