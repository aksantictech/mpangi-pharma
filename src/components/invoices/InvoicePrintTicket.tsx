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
  return (
    <section className="print-ticket hidden print:block">
      <div className="ticket-center">
        <h1 className="ticket-title">{pharmacy.name}</h1>

        {pharmacy.address && <p>{pharmacy.address}</p>}
        {pharmacy.city && <p>{pharmacy.city}</p>}
        {pharmacy.phone && <p>Tél : {pharmacy.phone}</p>}

        <p className="ticket-small">Mpangi_Pharma</p>
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
        {invoice.items.map((item) => (
          <div key={getItemKey(item)} className="ticket-item">
            <p className="ticket-product">{getItemName(item)}</p>

            <p className="ticket-detail">{getItemDetails(item)}</p>

            <div className="ticket-row">
              <span>
                {getItemQuantity(item)} x{" "}
                {formatMoney(getItemUnitPrice(item), invoice.currency)}
              </span>

              <strong>
                {formatMoney(getItemTotal(item), invoice.currency)}
              </strong>
            </div>
          </div>
        ))}
      </div>

      <div className="ticket-separator" />

      <div className="ticket-row">
        <span>Sous-total</span>
        <span>{formatMoney(subtotal, invoice.currency)}</span>
      </div>

      <div className="ticket-row">
        <span>Remise</span>
        <span>{formatMoney(getInvoiceDiscount(invoice), invoice.currency)}</span>
      </div>

      <div className="ticket-row ticket-total">
        <span>Total</span>
        <strong>
          {formatMoney(Number(invoice.total_amount || 0), invoice.currency)}
        </strong>
      </div>

      <div className="ticket-separator" />

      <div className="ticket-center ticket-footer">
        <p>Merci pour votre achat.</p>
        <p>Gardez ce ticket pour toute réclamation.</p>
        <p className="ticket-small">Aksantic Technology © 2026</p>
      </div>
    </section>
  );
}

function getItemRecord(item: SaleItem) {
  return item as unknown as Record<string, any>;
}

function getItemKey(item: SaleItem) {
  const row = getItemRecord(item);

  return String(row.id ?? row.product_id ?? row.productId ?? crypto.randomUUID());
}

function getItemName(item: SaleItem) {
  const row = getItemRecord(item);

  return String(row.product_name ?? row.name ?? row.product?.name ?? "Produit");
}

function getItemDetails(item: SaleItem) {
  const row = getItemRecord(item);

  return [
    row.generic_name,
    row.dosage,
    row.form,
    row.unit,
    row.batch_number ? `Lot ${row.batch_number}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "-";
}

function getItemQuantity(item: SaleItem) {
  const row = getItemRecord(item);

  return Number(row.quantity ?? 0);
}

function getItemUnitPrice(item: SaleItem) {
  const row = getItemRecord(item);

  return Number(row.unit_price ?? row.selling_price ?? row.price ?? 0);
}

function getItemTotal(item: SaleItem) {
  const row = getItemRecord(item);

  const savedTotal = Number(row.total_price ?? row.line_total ?? 0);

  if (savedTotal > 0) return savedTotal;

  return getItemQuantity(item) * getItemUnitPrice(item);
}

function getInvoiceDiscount(invoice: SaleWithItems) {
  const row = invoice as unknown as Record<string, any>;

  return Number(
    row.discount_amount ??
      row.discount ??
      row.discount_value ??
      row.discountAmount ??
      0
  );
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

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString("fr-CD")} ${currency}`;
}