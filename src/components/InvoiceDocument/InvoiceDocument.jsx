import React from "react";

/**
 * Printable invoice.
 *
 * Rendered into the page but hidden on screen; the print stylesheet in
 * index.css hides everything else and reveals this, so the browser's own
 * "Save as PDF" produces the document. That keeps invoices working offline
 * and keeps customer names, addresses and order contents from being posted to
 * a third-party PDF service.
 *
 * GST note: the order stores a single gstAmount. Indian invoices split this
 * into CGST + SGST for an intra-state sale, which is what a Tamil Nadu shop
 * billing a Tamil Nadu customer has. Anything else (IGST, HSN codes, the
 * seller's GSTIN) needs data the business has not supplied yet.
 */
const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const InvoiceDocument = ({ order, seller = {} }) => {
  if (!order?.orderId) return null;

  const addr = order.shippingAddress || {};
  const buyerName =
    [addr.firstName, addr.lastName].filter(Boolean).join(" ") || order.name || "Customer";

  const gst = Number(order.gstAmount || 0);
  const total = Number(order.totalAmount || 0);
  // Delivery is not a taxable supply line here — it is shown separately so
  // the taxable value and the GST on it still reconcile.
  const delivery = Number(order.deliveryAmount || 0);
  const taxable = total - gst;
  const halfGst = gst / 2;

  const invoiceDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div id="invoice-print" className="invoice-print-root">
      <div className="ip-head">
        <div>
          <h1 className="ip-brand">{seller.name || "Sri Ram Jewellery"}</h1>
          <p className="ip-muted">{seller.address || "Tamil Nadu, India"}</p>
          {seller.phone && <p className="ip-muted">Phone: {seller.phone}</p>}
          {seller.email && <p className="ip-muted">Email: {seller.email}</p>}
          {/* Required on a GST invoice. Omitted rather than faked when unset. */}
          {seller.gstin && <p className="ip-muted">GSTIN: {seller.gstin}</p>}
        </div>
        <div className="ip-right">
          <h2 className="ip-title">{seller.gstin ? "TAX INVOICE" : "INVOICE"}</h2>
          <p className="ip-muted">Invoice No: {order.orderId}</p>
          <p className="ip-muted">Date: {invoiceDate}</p>
        </div>
      </div>

      <div className="ip-parties">
        <div>
          <span className="ip-label">Billed To</span>
          <p className="ip-strong">{buyerName}</p>
          {addr.streetAddress && <p className="ip-muted">{addr.streetAddress}</p>}
          <p className="ip-muted">
            {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}
          </p>
          {addr.country && <p className="ip-muted">{addr.country}</p>}
          {(addr.mobileNumber || addr.number) && (
            <p className="ip-muted">{addr.number || addr.mobileNumber}</p>
          )}
          {(addr.email || order.email) && <p className="ip-muted">{addr.email || order.email}</p>}
        </div>
        <div>
          <span className="ip-label">Payment</span>
          <p className="ip-muted">
            Method: {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online (Razorpay)"}
          </p>
          <p className="ip-muted">Status: {order.paymentStatus || "—"}</p>
          {order.razorpayPaymentId && (
            <p className="ip-muted">Ref: {order.razorpayPaymentId}</p>
          )}
        </div>
      </div>

      <table className="ip-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th className="ip-num">Qty</th>
            <th className="ip-num">Rate</th>
            <th className="ip-num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((item, i) => (
            <tr key={item._id || item.productId || i}>
              <td>{i + 1}</td>
              <td>
                {item.name}
                {item.weight ? (
                  <span className="ip-muted"> — {item.weight}g {item.metalType || ""}</span>
                ) : null}
              </td>
              <td className="ip-num">{item.quantity || 1}</td>
              <td className="ip-num">{money(item.unitPrice)}</td>
              <td className="ip-num">{money((item.unitPrice || 0) * (item.quantity || 1))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ip-totals">
        <div className="ip-row">
          <span>Taxable Value</span>
          <span>{money(taxable)}</span>
        </div>
        {gst > 0 && (
          <>
            <div className="ip-row">
              <span>CGST</span>
              <span>{money(halfGst)}</span>
            </div>
            <div className="ip-row">
              <span>SGST</span>
              <span>{money(halfGst)}</span>
            </div>
          </>
        )}
        {delivery > 0 && (
          <div className="ip-row">
            <span>Delivery</span>
            <span>{money(delivery)}</span>
          </div>
        )}
        <div className="ip-row ip-grand">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      </div>

      <p className="ip-footer">
        Thank you for shopping with {seller.name || "Sri Ram Jewellery"}.
        {!seller.gstin && (
          <span className="ip-muted"> This is a receipt, not a GST tax invoice.</span>
        )}
      </p>
    </div>
  );
};

export default InvoiceDocument;
