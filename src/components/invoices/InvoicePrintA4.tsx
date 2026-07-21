"use client";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PaymentMethod, SaleItem, SaleWithItems } from "@/types/sale";

type InvoicePrintA4Props = {
  pharmacy: PharmacyWithRole;
  invoice: SaleWithItems;
  subtotal: number;
};

export default function InvoicePrintA4({
  pharmacy,
  invoice,
  subtotal,
}: InvoicePrintA4Props) {
  const totals = getInvoiceVatTotals(invoice);
  const logoUrl = getPharmacyLogoUrl(pharmacy);

  return (
    <section className="print-invoice-a4 hidden print:block">
      <div className="a4-document">
        <header className="a4-header">
          <div className="a4-company">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo ${pharmacy.name}`}
                className="a4-logo"
              />
            ) : null}

            <div className="a4-company-text">
              <h1>{pharmacy.name}</h1>

              <p>
                {[
                  pharmacy.address,
                  pharmacy.commune,
                  pharmacy.city,
                  pharmacy.province,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>

              {pharmacy.phone ? <p>Tél. : {pharmacy.phone}</p> : null}
              {pharmacy.email ? <p>Email : {pharmacy.email}</p> : null}
            </div>
          </div>

          <div className="a4-invoice-box">
            <p className="a4-label">FACTURE</p>
            <h2>{invoice.invoice_number}</h2>
            <p>{new Date(invoice.created_at).toLocaleString("fr-CD")}</p>
          </div>
        </header>

        <section className="a4-information-grid">
          <InfoBox
            label="Client"
            value={invoice.customer_name || "Client comptoir"}
          />

          <InfoBox
            label="Paiement"
            value={formatPaymentMethod(invoice.payment_method)}
          />

          <InfoBox
            label="Devise"
            value={invoice.currency || "CDF"}
          />

          <InfoBox
            label="Statut"
            value="Validée"
          />
        </section>

        <table className="a4-items-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Détails</th>
              <th className="number">Qté</th>
              <th className="number">Prix unitaire TTC</th>
              <th className="number">TVA</th>
              <th className="number">Total TTC</th>
            </tr>
          </thead>

          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={`${getItemKey(item)}-${index}`}>
                <td className="product-cell">{getItemName(item)}</td>
                <td>{getItemDetails(item)}</td>
                <td className="number">{getItemQuantity(item)}</td>
                <td className="number">
                  {formatMoney(
                    getItemUnitPriceTtc(item),
                    invoice.currency
                  )}
                </td>
                <td className="number">
                  {getItemVatRate(item)} %
                </td>
                <td className="number total-cell">
                  {formatMoney(
                    getItemLineTotalTtc(item),
                    invoice.currency
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="a4-bottom-grid">
          <div className="a4-notes">
            <h3>Observations</h3>
            <p>{invoice.notes || "Aucune observation."}</p>
          </div>

          <div className="a4-summary">
            <SummaryLine
              label="Sous-total TTC"
              value={formatMoney(subtotal, invoice.currency)}
            />

            <SummaryLine
              label="Remise"
              value={formatMoney(
                getInvoiceDiscount(invoice),
                invoice.currency
              )}
            />

            <SummaryLine
              label="Sous-total HT"
              value={formatMoney(
                totals.subtotalHt,
                invoice.currency
              )}
            />

            {totals.vat5 > 0 ? (
              <SummaryLine
                label="TVA 5 %"
                value={formatMoney(
                  totals.vat5,
                  invoice.currency
                )}
              />
            ) : null}

            {totals.vat16 > 0 ? (
              <SummaryLine
                label="TVA 16 %"
                value={formatMoney(
                  totals.vat16,
                  invoice.currency
                )}
              />
            ) : null}

            <SummaryLine
              label="Total TVA"
              value={formatMoney(
                totals.vatTotal,
                invoice.currency
              )}
            />

            <SummaryLine
              label="Total TTC"
              value={formatMoney(
                totals.totalTtc,
                invoice.currency
              )}
              total
            />
          </div>
        </section>

        <footer className="a4-footer">
          <p>
            {pharmacy.invoice_footer ||
              "Merci pour votre confiance."}
          </p>
          <p>
            Document généré par Mpangi Pharma — AKSANTIC Technology © 2026
          </p>
        </footer>
      </div>

      <style jsx>{`
        .print-invoice-a4 {
          width: 100%;
          background: #fff;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        .a4-document {
          width: 100%;
          box-sizing: border-box;
          background: #fff;
          font-size: 10pt;
          line-height: 1.35;
        }

        .a4-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 235px;
          align-items: start;
          gap: 18px;
          border-bottom: 3px solid #1d4ed8;
          padding-bottom: 16px;
        }

        .a4-company {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          min-width: 0;
        }

        .a4-logo {
          display: block;
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          object-fit: contain;
        }

        .a4-company-text {
          min-width: 0;
        }

        .a4-company h1,
        .a4-invoice-box h2,
        .a4-notes h3 {
          margin: 0;
        }

        .a4-company h1 {
          color: #0f3f91;
          font-size: 17pt;
          line-height: 1.05;
        }

        .a4-company p,
        .a4-invoice-box p,
        .a4-notes p,
        .a4-footer p {
          margin: 3px 0 0;
        }

        .a4-invoice-box {
          min-width: 0;
          text-align: right;
        }

        .a4-label {
          color: #0f766e;
          font-size: 12pt;
          font-weight: 800;
          letter-spacing: 0.2em;
        }

        .a4-invoice-box h2 {
          margin-top: 5px;
          font-size: 11.5pt;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .a4-information-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .a4-items-table {
          width: 100%;
          margin-top: 16px;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .a4-items-table th,
        .a4-items-table td {
          border: 1px solid #b8c5d6;
          padding: 6px 7px;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .a4-items-table th {
          background: #eaf2ff;
          color: #163b7a;
          font-size: 8.5pt;
          font-weight: 800;
          text-transform: uppercase;
        }

        .a4-items-table th:nth-child(1) {
          width: 22%;
        }

        .a4-items-table th:nth-child(2) {
          width: 28%;
        }

        .a4-items-table th:nth-child(3) {
          width: 7%;
        }

        .a4-items-table th:nth-child(4) {
          width: 17%;
        }

        .a4-items-table th:nth-child(5) {
          width: 9%;
        }

        .a4-items-table th:nth-child(6) {
          width: 17%;
        }

        .number {
          text-align: right;
          white-space: nowrap;
        }

        .product-cell,
        .total-cell {
          font-weight: 800;
        }

        .a4-bottom-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 245px;
          gap: 16px;
          margin-top: 18px;
          break-inside: avoid;
        }

        .a4-notes {
          min-height: 120px;
          border: 1px solid #b8c5d6;
          padding: 12px;
        }

        .a4-summary {
          border: 1px solid #b8c5d6;
          padding: 12px;
        }

        .a4-footer {
          margin-top: 24px;
          border-top: 1px solid #94a3b8;
          padding-top: 10px;
          color: #475569;
          text-align: center;
          font-size: 8.5pt;
        }

        @media print {
          .a4-document {
            width: 100% !important;
            max-width: none !important;
          }

          .a4-header,
          .a4-bottom-grid,
          .a4-items-table tr {
            break-inside: avoid;
          }

          .a4-items-table thead {
            display: table-header-group;
          }
        }
      `}</style>
    </section>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="info-box">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .info-box {
          min-width: 0;
          border: 1px solid #b8c5d6;
          padding: 10px 12px;
        }

        .info-box span {
          display: block;
          margin-bottom: 4px;
          color: #64748b;
          font-size: 8pt;
          font-weight: 800;
          text-transform: uppercase;
        }

        .info-box strong {
          display: block;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  total = false,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <div className={total ? "summary-line summary-total" : "summary-line"}>
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .summary-line {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 5px 0;
        }

        .summary-line strong {
          white-space: nowrap;
        }

        .summary-total {
          margin-top: 6px;
          border-top: 2px solid #0f172a;
          padding-top: 10px;
          font-size: 13pt;
        }
      `}</style>
    </div>
  );
}

function asRecord(value: unknown) {
  return value as Record<string, any>;
}

function getPharmacyLogoUrl(pharmacy: PharmacyWithRole) {
  const row = asRecord(pharmacy);

  return String(
    row.logo_url ??
      row.logoUrl ??
      row.logo ??
      row.pharmacy_logo_url ??
      ""
  ).trim();
}

function getItemKey(item: SaleItem) {
  const row = asRecord(item);

  return String(
    row.id ??
      row.product_id ??
      row.product_name ??
      "item"
  );
}

function getItemName(item: SaleItem) {
  const row = asRecord(item);

  return String(
    row.product_name ??
      row.name ??
      row.product?.name ??
      "Produit"
  );
}

function getItemDetails(item: SaleItem) {
  const row = asRecord(item);

  return (
    [
      row.generic_name,
      row.dosage,
      row.form,
      row.unit,
      row.batch_number
        ? `Lot ${row.batch_number}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "-"
  );
}

function getItemQuantity(item: SaleItem) {
  return Number(asRecord(item).quantity ?? 0);
}

function getItemVatRate(item: SaleItem) {
  return Number(asRecord(item).vat_rate ?? 0);
}

function getItemUnitPriceHt(item: SaleItem) {
  const row = asRecord(item);

  return Number(
    row.unit_price_ht ??
      row.unit_price ??
      row.selling_price ??
      row.price ??
      0
  );
}

function getItemUnitPriceTtc(item: SaleItem) {
  const row = asRecord(item);

  return Number(
    row.unit_price_ttc ??
      row.unit_price ??
      row.selling_price ??
      row.price ??
      0
  );
}

function getItemLineTotalHt(item: SaleItem) {
  const row = asRecord(item);
  const saved = Number(row.line_total_ht ?? 0);

  return saved > 0
    ? saved
    : getItemQuantity(item) *
        getItemUnitPriceHt(item);
}

function getItemLineTotalTtc(item: SaleItem) {
  const row = asRecord(item);

  const saved = Number(
    row.line_total_ttc ??
      row.total_price ??
      row.line_total ??
      0
  );

  return saved > 0
    ? saved
    : getItemQuantity(item) *
        getItemUnitPriceTtc(item);
}

function getItemLineVat(item: SaleItem) {
  const row = asRecord(item);

  const saved = Number(
    row.line_total_vat ??
      row.vat_amount ??
      0
  );

  return saved > 0
    ? saved
    : Math.max(
        getItemLineTotalTtc(item) -
          getItemLineTotalHt(item),
        0
      );
}

function getInvoiceDiscount(invoice: SaleWithItems) {
  const row = asRecord(invoice);

  return Number(
    row.discount_amount ??
      row.discount ??
      row.discount_value ??
      row.discountAmount ??
      0
  );
}

function getInvoiceVatTotals(invoice: SaleWithItems) {
  const row = asRecord(invoice);

  const vat5 = invoice.items
    .filter((item) => getItemVatRate(item) === 5)
    .reduce(
      (sum, item) =>
        sum + getItemLineVat(item),
      0
    );

  const vat16 = invoice.items
    .filter((item) => getItemVatRate(item) === 16)
    .reduce(
      (sum, item) =>
        sum + getItemLineVat(item),
      0
    );

  const subtotalHt =
    Number(row.subtotal_ht ?? 0) ||
    invoice.items.reduce(
      (sum, item) =>
        sum + getItemLineTotalHt(item),
      0
    );

  const vatTotal =
    Number(row.vat_total ?? 0) ||
    invoice.items.reduce(
      (sum, item) =>
        sum + getItemLineVat(item),
      0
    );

  const totalTtc =
    Number(
      row.total_ttc ??
        row.total_amount ??
        0
    ) || subtotalHt + vatTotal;

  return {
    subtotalHt,
    vat5,
    vat16,
    vatTotal,
    totalTtc,
  };
}

function formatPaymentMethod(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    cash_cdf: "Cash CDF",
    cash_usd: "Cash USD",
    mobile_money: "Mobile Money",
    card: "Carte",
    credit: "Crédit",
    mixed: "Mixte",
  };

  return labels[method] ?? method;
}

function formatMoney(
  value: number,
  currency: string
) {
  return `${Number(value || 0).toLocaleString(
    "fr-CD",
    {
      maximumFractionDigits: 2,
    }
  )} ${currency}`;
}
