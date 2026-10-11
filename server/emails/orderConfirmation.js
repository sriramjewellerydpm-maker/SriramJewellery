import { baseTemplate, esc } from "./baseTemplate.js";
import { C, F } from "./tokens.js";

/**
 * The order confirmation.
 *
 * Every figure is read off the SAVED order. Nothing is recomputed here: the
 * customer was charged what checkout calculated, and an email that runs the
 * pricing again would quietly disagree with their card statement the moment a
 * metal rate moved. `unitPrice` on each line and `totalAmount` on the order
 * are what they paid.
 *
 * It promises no delivery date. The 15-day window starts when the OWNER
 * APPROVES the order, and a freshly placed one is still PENDING — so the email
 * says the window begins on approval and names no date.
 */

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * A line's total, or null when the line carries no price.
 *
 * The absence check comes BEFORE the coercion on purpose: Number(null) is 0
 * and Number("") is 0, both of which Number.isFinite happily accepts, so
 * coercing first renders a quote-only line as "₹0" — a price the customer was
 * never quoted and never charged.
 */
const lineTotal = (item) => {
  const raw = item?.unitPrice;
  if (raw === null || raw === undefined || raw === "") return null;
  const unit = Number(raw);
  if (!Number.isFinite(unit)) return null;
  return unit * (Number(item?.quantity) || 1);
};

/** "22g gold" / "gold" / "" — only what the line actually stores. */
const spec = (item) => {
  const bits = [];
  if (Number.isFinite(Number(item?.weight)) && Number(item.weight) > 0) bits.push(`${item.weight}g`);
  if (item?.metalType) bits.push(item.metalType);
  return bits.join(" ");
};

const addressBlock = (a) => {
  if (!a || typeof a !== "object") return "";
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  const place = [a.city, a.state].filter(Boolean).join(", ");
  const tail = [place, a.postalCode].filter(Boolean).join(" - ");
  return [name, a.streetAddress, tail, a.country, a.number || a.mobileNumber]
    .filter(Boolean)
    .map((l) => esc(l))
    .join("<br>");
};

export const orderConfirmationEmail = ({ order, siteUrl }) => {
  const base = String(siteUrl || process.env.PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const ordersUrl = `${base}/dashboard/myOrders`;
  const items = Array.isArray(order?.items) ? order.items : [];

  const rows = items
    .map((item) => {
      const total = lineTotal(item);
      const s = spec(item);
      return `
                  <tr>
                    <td class="srj-ink" style="padding:12px 0;border-bottom:1px solid ${C.rule};font-family:${F.body};font-size:14px;line-height:1.5;color:${C.ink};">
                      ${esc(item?.name || "Item")}
                      ${s ? `<br><span style="font-size:12px;color:${C.faint};">${esc(s)}</span>` : ""}
                    </td>
                    <td class="srj-muted" align="center" style="padding:12px 8px;border-bottom:1px solid ${C.rule};font-family:${F.body};font-size:14px;color:${C.muted};white-space:nowrap;">${esc(item?.quantity || 1)}</td>
                    <td class="srj-ink" align="right" style="padding:12px 0;border-bottom:1px solid ${C.rule};font-family:${F.body};font-size:14px;color:${C.ink};white-space:nowrap;">${
                      // A line with no price is never ₹0 or NaN — it says so.
                      total === null ? `<span style="color:${C.faint};">Price on request</span>` : esc(money(total))
                    }</td>
                  </tr>`;
    })
    .join("");

  // Only what the order actually stores. The making charge is not copied onto
  // the line, so it is not invented here; the subtotal is the stored total
  // less the stored GST and the stored delivery.
  const gst = Number(order?.gstAmount) || 0;
  const grand = Number(order?.totalAmount) || 0;
  const delivery = Number(order?.deliveryAmount) || 0;
  const subtotal = grand - gst - delivery;

  const totalRow = (label, value, strong) => `
                  <tr>
                    <td class="${strong ? "srj-ink" : "srj-muted"}" style="padding:${strong ? "14px 0 0" : "6px 0"};font-family:${F.body};font-size:${strong ? "16px" : "14px"};${strong ? `font-weight:700;border-top:1px solid ${C.rule};` : ""}color:${strong ? C.ink : C.muted};">${label}</td>
                    <td class="${strong ? "srj-ink" : "srj-muted"}" align="right" style="padding:${strong ? "14px 0 0" : "6px 0"};font-family:${F.body};font-size:${strong ? "18px" : "14px"};${strong ? `font-weight:700;border-top:1px solid ${C.rule};` : ""}color:${strong ? C.ink : C.muted};white-space:nowrap;">${value}</td>
                  </tr>`;

  const address = addressBlock(order?.shippingAddress);

  const body = `
              <p class="srj-muted" style="margin:0 0 6px;font-family:${F.body};font-size:15px;line-height:1.6;color:${C.muted};">
                Thank you — we have your order. It is with the shop for approval, and we will write again once it is confirmed.
              </p>
              <p class="srj-muted" style="margin:0 0 24px;font-family:${F.body};font-size:13px;line-height:1.6;color:${C.faint};">
                Order <strong class="srj-ink" style="color:${C.ink};">${esc(order?.orderId || "")}</strong>
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                <tr>
                  <td style="padding:0 0 4px;font-family:${F.body};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${C.faint};">Your pieces</td>
                  <td></td><td></td>
                </tr>
                ${rows}
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin-top:14px;">
                ${totalRow("Subtotal", esc(money(subtotal)))}
                ${gst > 0 ? totalRow("GST", esc(money(gst))) : ""}
                ${totalRow("Delivery", delivery > 0 ? esc(money(delivery)) : "Free")}
                ${totalRow("Total paid", esc(money(grand)), true)}
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin-top:30px;">
                <tr>
                  <td class="srj-panel" bgcolor="${C.panel}" style="background-color:${C.panel};border:1px solid ${C.rule};padding:18px 20px;">
                    <div style="font-family:${F.body};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${C.faint};">Awaiting approval</div>
                    <p class="srj-muted" style="margin:8px 0 0;font-family:${F.body};font-size:14px;line-height:1.6;color:${C.muted};">
                      The shop checks each order by hand. Your 15-day delivery window begins once it is approved, not today — we will confirm it then.
                    </p>
                  </td>
                </tr>
              </table>

              ${
                address
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin-top:28px;">
                <tr>
                  <td style="padding:0 0 6px;font-family:${F.body};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${C.faint};">Delivering to</td>
                </tr>
                <tr>
                  <td class="srj-muted" style="font-family:${F.body};font-size:14px;line-height:1.7;color:${C.muted};">${address}</td>
                </tr>
              </table>`
                  : ""
              }

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin-top:24px;margin-bottom:28px;">
                <tr>
                  <td style="padding:0 0 6px;font-family:${F.body};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${C.faint};">Payment</td>
                </tr>
                <tr>
                  <td class="srj-muted" style="font-family:${F.body};font-size:14px;line-height:1.7;color:${C.muted};">
                    ${esc(order?.paymentMethod || "—")}${order?.paymentStatus ? ` · ${esc(order.paymentStatus)}` : ""}
                  </td>
                </tr>
              </table>`;

  const textLines = items.map((item) => {
    const total = lineTotal(item);
    const s = spec(item);
    return `  ${item?.name || "Item"}${s ? ` (${s})` : ""} x${item?.quantity || 1} — ${total === null ? "Price on request" : money(total)}`;
  });

  return {
    subject: `Order confirmed — Sri Ram Jewellery #${order?.orderId || ""}`,
    html: baseTemplate({
      preheader: `Order ${order?.orderId || ""} — ${money(grand)}. Awaiting approval by the shop.`,
      heading: "Order confirmed",
      bodyHtml: body,
      ctaText: "View your orders",
      ctaUrl: ordersUrl,
      footerNote:
        "Keep this email for your records. If anything looks wrong, reply to it and we will sort it out.",
    }),
    text:
      `Order confirmed — Sri Ram Jewellery #${order?.orderId || ""}\n\n` +
      "Thank you — we have your order. It is with the shop for approval, and we will write again once it is confirmed.\n\n" +
      `${textLines.join("\n")}\n\n` +
      `  Subtotal: ${money(subtotal)}\n` +
      (gst > 0 ? `  GST: ${money(gst)}\n` : "") +
      `  Delivery: ${delivery > 0 ? money(delivery) : "Free"}\n` +
      `  Total paid: ${money(grand)}\n\n` +
      "Your 15-day delivery window begins once the shop approves the order, not today.\n\n" +
      `View your orders: ${ordersUrl}\n\n` +
      "— Sri Ram Jewellery",
  };
};

export default orderConfirmationEmail;
