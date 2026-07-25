"use client";

import type { PharmacyWithRole } from "@/types/pharmacy";
import type {
  PaymentMethod,
  SaleItem,
  SaleWithItems,
} from "@/types/sale";

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
            <p key={String(line)}>{String(line)}</p>
          ))}

        {pharmacy.phone ? <p>Tél : {pharmacy.phone}</p> : null}
        <p className="ticket-small">Mpangi Pharma</p>
      </div>

      <div className="ticket-separator" />

      <div className="ticket-row">
        <span>Facture</span>
        <span className="ticket-value">{invoice.invoice_number}</span>
      </div>

      <div className="ticket-row">
        <span>Date</span>
        <span className="ticket-value">{formatDate(invoice.created_at)}</span>
      </div>

      <div className="ticket-row">
        <span>Client</span>
        <span className="ticket-value">
          {invoice.customer_name || "Client comptoir"}
        </span>
      </div>

      <div className="ticket-row">
        <span>Paiement</span>
        <span className="ticket-value">
          {formatPaymentMethod(invoice.payment_method)}
        </span>
      </div>

      <div className="ticket-separator" />

      <div className="ticket-items">
        {invoice.items.map((item, index) => (
          <div
            key={`${getItemKey(item)}-${index}`}
            className="ticket-item"
          >
            <p className="ticket-product">{getItemName(item)}</p>
            <p className="ticket-detail">{getItemDetails(item)}</p>

            <div className="ticket-row ticket-price-row">
              <span>
                {formatQuantity(getItemQuantity(item))} x{" "}
                {formatMoney(getItemUnitPriceTtc(item), invoice.currency)}
              </span>

              <span className="ticket-value">
                {formatMoney(getItemLineTotalTtc(item), invoice.currency)}
              </span>
            </div>

            {getItemVatRate(item) > 0 ? (
              <div className="ticket-row ticket-tax-line">
                <span>TVA {getItemVatRate(item)} %</span>
                <span className="ticket-value">
                  {formatMoney(getItemLineVat(item), invoice.currency)}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="ticket-separator" />

      <div className="ticket-row">
        <span>Sous-total TTC</span>
        <span className="ticket-value">
          {formatMoney(subtotal, invoice.currency)}
        </span>
      </div>

      <div className="ticket-row">
        <span>Remise</span>
        <span className="ticket-value">
          {formatMoney(getInvoiceDiscount(invoice), invoice.currency)}
        </span>
      </div>

      <div className="ticket-row">
        <span>Sous-total HT</span>
        <span className="ticket-value">
          {formatMoney(totals.subtotalHt, invoice.currency)}
        </span>
      </div>

      {totals.vat5 > 0 ? (
        <div className="ticket-row">
          <span>TVA 5 %</span>
          <span className="ticket-value">
            {formatMoney(totals.vat5, invoice.currency)}
          </span>
        </div>
      ) : null}

      {totals.vat16 > 0 ? (
        <div className="ticket-row">
          <span>TVA 16 %</span>
          <span className="ticket-value">
            {formatMoney(totals.vat16, invoice.currency)}
          </span>
        </div>
      ) : null}

      <div className="ticket-row">
        <span>Total TVA</span>
        <span className="ticket-value">
          {formatMoney(totals.vatTotal, invoice.currency)}
        </span>
      </div>

      <div className="ticket-row ticket-total">
        <span>Total TTC</span>
        <span className="ticket-value">
          {formatMoney(totals.totalTtc, invoice.currency)}
        </span>
      </div>

      <div className="ticket-separator" />

      <div className="ticket-center ticket-footer">
        <p>{pharmacy.invoice_footer || "Merci pour votre achat."}</p>
        <p>Gardez ce ticket pour toute réclamation.</p>
        <p className="ticket-small">Aksantic Technology © 2026</p>
      </div>

      <style jsx>{`
        .print-ticket {
          width: 54mm;
          max-width: 54mm;
          margin: 0;
          padding: 2mm;
          box-sizing: border-box;
          color: #000;
          background: #fff;
          font-family: "Courier New", Courier, monospace;
          font-size: 11.5pt;
          font-weight: 400;
          line-height: 1.35;
          letter-spacing: 0;
          word-spacing: 0;
          text-rendering: optimizeSpeed;
          -webkit-font-smoothing: none;
          transform: none;
          zoom: 1;
          filter: none;
          text-shadow: none;
        }

        .print-ticket,
        .print-ticket * {
          box-sizing: border-box;
          font-family: "Courier New", Courier, monospace;
          font-weight: 400;
          color: #000;
          text-shadow: none;
          filter: none;
          transform: none;
        }

        .ticket-center { text-align: center; }

        .ticket-logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 5px;
        }

        .ticket-logo {
          display: block;
          width: auto;
          max-width: 22mm;
          max-height: 13mm;
          object-fit: contain;
          opacity: 1;
          filter: none;
        }

        .ticket-title {
          margin: 0 0 4px;
          font-size: 15pt;
          font-weight: 400;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .ticket-center p,
        .ticket-item p { margin: 3px 0; }

        .ticket-small {
          font-size: 10pt;
          line-height: 1.3;
        }

        .ticket-separator {
          width: 100%;
          margin: 8px 0;
          border-top: 1px dashed #000;
        }

        .ticket-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 5px;
          width: 100%;
          margin: 3px 0;
        }

        .ticket-row > :first-child {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .ticket-value {
          flex-shrink: 0;
          max-width: 58%;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .ticket-item {
          margin-bottom: 10px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .ticket-product {
          font-size: 12pt;
          font-weight: 400;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .ticket-detail {
          font-size: 10.5pt;
          font-weight: 400;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .ticket-price-row {
          margin-top: 4px;
          font-size: 11.5pt;
        }

        .ticket-tax-line {
          margin-top: 2px;
          font-size: 10.5pt;
        }

        .ticket-total {
          margin-top: 7px;
          padding-top: 7px;
          border-top: 1px solid #000;
          font-size: 14pt;
          font-weight: 400;
          line-height: 1.25;
        }

        .ticket-footer {
          font-size: 10.5pt;
          line-height: 1.35;
        }

        @media print {
          .print-ticket {
            display: block !important;
            width: 54mm !important;
            max-width: 54mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            font-family: "Courier New", Courier, monospace !important;
            font-size: 11.5pt !important;
            font-weight: 400 !important;
            line-height: 1.35 !important;
            color: #000 !important;
            background: #fff !important;
            transform: none !important;
            zoom: 1 !important;
            filter: none !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-ticket,
          .print-ticket * {
            font-family: "Courier New", Courier, monospace !important;
            font-weight: 400 !important;
            color: #000 !important;
            transform: none !important;
            filter: none !important;
            text-shadow: none !important;
          }
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
    row.id ?? row.product_id ?? row.product_name ?? "item"
  );
}

function getItemName(item: SaleItem) {
  const row = asRecord(item);
  return String(
    row.product_name ?? row.name ?? row.product?.name ?? "Produit"
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
      row.batch_number ? `Lot ${row.batch_number}` : null,
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
    : getItemQuantity(item) * getItemUnitPriceHt(item);
}

function getItemLineTotalTtc(item: SaleItem) {
  const row = asRecord(item);
  const saved = Number(
    row.line_total_ttc ?? row.total_price ?? row.line_total ?? 0
  );
  return saved > 0
    ? saved
    : getItemQuantity(item) * getItemUnitPriceTtc(item);
}

function getItemLineVat(item: SaleItem) {
  const row = asRecord(item);
  const saved = Number(
    row.line_total_vat ?? row.vat_amount ?? 0
  );
  return saved > 0
    ? saved
    : Math.max(
        getItemLineTotalTtc(item) - getItemLineTotalHt(item),
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
    .reduce((sum, item) => sum + getItemLineVat(item), 0);

  const vat16 = invoice.items
    .filter((item) => getItemVatRate(item) === 16)
    .reduce((sum, item) => sum + getItemLineVat(item), 0);

  const subtotalHt =
    Number(row.subtotal_ht ?? 0) ||
    invoice.items.reduce(
      (sum, item) => sum + getItemLineTotalHt(item),
      0
    );

  const vatTotal =
    Number(row.vat_total ?? 0) ||
    invoice.items.reduce(
      (sum, item) => sum + getItemLineVat(item),
      0
    );

  const totalTtc =
    Number(row.total_ttc ?? row.total_amount ?? 0) ||
    subtotalHt + vatTotal;

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatQuantity(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("fr-CD", {
        maximumFractionDigits: 2,
      });
}

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString("fr-CD", {
    maximumFractionDigits: 2,
  })} ${currency}`;
}
