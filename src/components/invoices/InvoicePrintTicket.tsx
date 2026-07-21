"use client";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type { PaymentMethod, SaleItem, SaleWithItems } from "@/types/sale";

type InvoicePrintTicketProps = {
  pharmacy: PharmacyWithRole;
  invoice: SaleWithItems;
  subtotal: number;
};

export default function InvoicePrintTicket({
  pharmacy,
  invoice,
  subtotal,
}: InvoicePrintTicketProps) {
  const logoUrl = getPharmacyLogoUrl(pharmacy);
  const totals = getInvoiceVatTotals(invoice);

  return (
    <section className="print-ticket hidden print:block">
      <div className="ticket-center">
        {logoUrl ? (
          <div className="ticket-logo-wrapper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={`Logo ${pharmacy.name}`}
              className="ticket-logo"
            />
          </div>
        ) : null}

        <h1 className="ticket-title">{pharmacy.name}</h1>

        {[pharmacy.address, pharmacy.commune, pharmacy.city]
          .filter(Boolean)
          .map((line) => (
            <p key={String(line)}>{line}</p>
          ))}

        {pharmacy.phone ? <p>Tél : {pharmacy.phone}</p> : null}
        <p className="ticket-small">Mpangi Pharma</p>
      </div>

      <div className="ticket-separator" />

      <div className="ticket-row">
        <span>Facture</span>
        <strong>{invoice.invoice_number}</strong>
      </div>

      <div className="ticket-row">
        <span>Date</span>
        <span>{new Date(invoice.created_at).toLocaleString("fr-CD")}</span>
      </div>

      <div className="ticket-row">
        <span>Client</span>
        <span>{invoice.customer_name || "Client comptoir"}</span>
      </div>

      <div className="ticket-row">
        <span>Paiement</span>
        <span>{formatPaymentMethod(invoice.payment_method)}</span>
      </div>

      <div className="ticket-separator" />

      <div className="ticket-items">
        {invoice.items.map((item, index) => (
          <div key={`${getItemKey(item)}-${index}`} className="ticket-item">
            <p className="ticket-product">{getItemName(item)}</p>
            <p className="ticket-detail">{getItemDetails(item)}</p>

            <div className="ticket-row">
              <span>
                {getItemQuantity(item)} x{" "}
                {formatMoney(
                  getItemUnitPriceTtc(item),
                  invoice.currency
                )}
              </span>

              <strong>
                {formatMoney(
                  getItemLineTotalTtc(item),
                  invoice.currency
                )}
              </strong>
            </div>

            {getItemVatRate(item) > 0 ? (
              <div className="ticket-row ticket-tax-line">
                <span>TVA {getItemVatRate(item)} %</span>
                <span>
                  {formatMoney(
                    getItemLineVat(item),
                    invoice.currency
                  )}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="ticket-separator" />

      <div className="ticket-row">
        <span>Sous-total TTC</span>
        <span>{formatMoney(subtotal, invoice.currency)}</span>
      </div>

      <div className="ticket-row">
        <span>Remise</span>
        <span>
          {formatMoney(
            getInvoiceDiscount(invoice),
            invoice.currency
          )}
        </span>
      </div>

      <div className="ticket-row">
        <span>Sous-total HT</span>
        <span>
          {formatMoney(totals.subtotalHt, invoice.currency)}
        </span>
      </div>

      {totals.vat5 > 0 ? (
        <div className="ticket-row">
          <span>TVA 5 %</span>
          <span>
            {formatMoney(totals.vat5, invoice.currency)}
          </span>
        </div>
      ) : null}

      {totals.vat16 > 0 ? (
        <div className="ticket-row">
          <span>TVA 16 %</span>
          <span>
            {formatMoney(totals.vat16, invoice.currency)}
          </span>
        </div>
      ) : null}

      <div className="ticket-row">
        <span>Total TVA</span>
        <span>
          {formatMoney(totals.vatTotal, invoice.currency)}
        </span>
      </div>

      <div className="ticket-row ticket-total">
        <span>Total TTC</span>
        <strong>
          {formatMoney(totals.totalTtc, invoice.currency)}
        </strong>
      </div>

      <div className="ticket-separator" />

      <div className="ticket-center ticket-footer">
        <p>
          {pharmacy.invoice_footer ||
            "Merci pour votre achat."}
        </p>
        <p>Gardez ce ticket pour toute réclamation.</p>
        <p className="ticket-small">
          Aksantic Technology © 2026
        </p>
      </div>

      <style jsx>{`
        .print-ticket {
          color: #000;
          background: #fff;
        }

        .ticket-center {
          text-align: center;
        }

        .ticket-logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 5px;
        }

        .ticket-logo {
          display: block;
          width: auto;
          max-width: 26mm;
          max-height: 16mm;
          object-fit: contain;
        }

        .ticket-title {
          margin: 0 0 3px;
          font-size: 13pt;
          font-weight: 800;
          line-height: 1.1;
        }

        .ticket-center p,
        .ticket-item p {
          margin: 2px 0;
        }

        .ticket-small {
          font-size: 8pt;
        }

        .ticket-separator {
          margin: 7px 0;
          border-top: 1px dashed #000;
        }

        .ticket-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
        }

        .ticket-row > :last-child {
          text-align: right;
        }

        .ticket-item {
          margin-bottom: 8px;
          break-inside: avoid;
        }

        .ticket-product {
          font-weight: 800;
        }

        .ticket-detail {
          font-size: 8.5pt;
        }

        .ticket-tax-line {
          font-size: 8.5pt;
        }

        .ticket-total {
          margin-top: 5px;
          border-top: 1px solid #000;
          padding-top: 6px;
          font-size: 12pt;
          font-weight: 800;
        }

        .ticket-footer {
          font-size: 8.5pt;
        }
      `}</style>
    </section>
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
