export type InvoicePrintTarget = "thermal" | "a4";

type PrintElementOptions = {
  selector: string;
  target: InvoicePrintTarget;
  documentTitle?: string;
};

export async function printElementInIsolatedFrame({
  selector,
  target,
  documentTitle = "Facture",
}: PrintElementOptions): Promise<void> {
  const sourceElement = document.querySelector<HTMLElement>(selector);

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

  const printDocument =
    iframe.contentDocument ?? iframe.contentWindow?.document;

  if (!printDocument || !iframe.contentWindow) {
    iframe.remove();
    throw new Error(
      "Impossible de préparer la fenêtre d’impression."
    );
  }

  const copiedStyles = Array.from(
    document.querySelectorAll(
      'link[rel="stylesheet"], style'
    )
  )
    .map((node) => node.outerHTML)
    .join("\n");

  const pageCss =
    target === "a4"
      ? `
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        html,
        body {
          width: 100%;
          min-height: 0;
          margin: 0;
          padding: 0;
          background: #fff;
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
      `
      : `
        @page {
          size: 80mm auto;
          margin: 0;
        }

        html,
        body {
          width: 80mm !important;
          min-width: 80mm !important;
          max-width: 80mm !important;
          min-height: 0;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }

        .print-ticket {
          display: block !important;
          width: 76mm !important;
          max-width: 76mm !important;
          margin: 0 !important;
          padding: 2mm !important;
          color: #000 !important;
          background: #fff !important;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 10pt !important;
          font-weight: 600 !important;
          line-height: 1.25 !important;
          box-sizing: border-box !important;
          text-rendering: geometricPrecision !important;
          -webkit-font-smoothing: antialiased !important;
        }

        .print-ticket img {
          max-width: 26mm !important;
          max-height: 16mm !important;
          object-fit: contain !important;
          filter: none !important;
        }

        .print-invoice-a4 {
          display: none !important;
        }
      `;

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
            box-sizing: border-box;
          }

          html,
          body {
            overflow: visible !important;
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

  await waitForFrameImages(printDocument);
  await waitForFonts(printDocument);

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  window.setTimeout(() => {
    iframe.remove();
  }, 1500);
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
    // L’impression peut continuer avec les polices disponibles.
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
