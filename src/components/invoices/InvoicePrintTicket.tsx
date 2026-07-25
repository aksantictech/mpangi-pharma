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
    width: 76mm;
    max-width: 76mm;
    margin: 0;
    padding: 2mm;

    color: #000;
    background: #fff;

    font-family:
      "Courier New",
      Courier,
      monospace;

    font-size: 12px;
    font-weight: 700;
    line-height: 1.3;

    letter-spacing: 0;
    word-spacing: 0;

    text-rendering: optimizeSpeed;
    -webkit-font-smoothing: none;
    -moz-osx-font-smoothing: grayscale;

    transform: none;
    zoom: 1;
    filter: none;
    text-shadow: none;

    box-sizing: border-box;
  }

  .print-ticket * {
    box-sizing: border-box;

    letter-spacing: 0;
    text-shadow: none;
    filter: none;
    transform: none;

    -webkit-font-smoothing: none;
  }

  .ticket-pharmacy-name {
    font-size: 15px;
    font-weight: 900;
    line-height: 1.15;
  }

  .ticket-title {
    font-size: 14px;
    font-weight: 900;
  }

  .ticket-product-name {
    font-size: 12px;
    font-weight: 900;
  }

  .ticket-line,
  .ticket-value,
  .ticket-total {
    font-size: 12px;
    font-weight: 800;
  }

  .ticket-total {
    font-size: 15px;
    font-weight: 900;
  }

  .ticket-muted {
    color: #000;
    font-weight: 700;
  }

  .ticket-separator {
    border-top: 1px dashed #000;
  }

  img {
    image-rendering: auto;
    filter: none;
    opacity: 1;
  }

  @media print {
    .print-ticket {
      display: block !important;
      width: 76mm !important;
      max-width: 76mm !important;
      margin: 0 !important;
      padding: 2mm !important;

      color: #000 !important;
      background: #fff !important;

      font-family:
        "Courier New",
        Courier,
        monospace !important;

      font-size: 12px !important;
      font-weight: 700 !important;
      line-height: 1.3 !important;

      transform: none !important;
      zoom: 1 !important;
      filter: none !important;
      text-shadow: none !important;

      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-ticket * {
      color: #000 !important;
      text-shadow: none !important;
      filter: none !important;
      transform: none !important;
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
