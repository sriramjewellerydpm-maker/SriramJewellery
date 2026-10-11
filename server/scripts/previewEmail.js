/**
 * Render every transactional email to disk so it can be opened in a browser.
 *
 *   node server/scripts/previewEmail.js
 *
 * Writes to tmp/email-preview/ (gitignored). Nothing is sent.
 *
 * It also checks the constraints a mail client actually enforces, because
 * these are the mistakes that are invisible until a customer reports a broken
 * email: a CSS variable no client resolves, a relative URL that resolves
 * against the client rather than the shop, a missing plain-text alternative,
 * an unclosed tag, or a document past the ~102KB where Gmail clips and hides
 * the end behind "[Message clipped]".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { signInCodeEmail } from "../emails/signInCode.js";
import { passwordResetEmail } from "../emails/passwordReset.js";
import { orderConfirmationEmail } from "../emails/orderConfirmation.js";

dotenv.config();

const OUT = path.join(fileURLToPath(new URL("../..", import.meta.url)), "tmp/email-preview");
const GMAIL_CLIP_BYTES = 102 * 1024;

const SITE = (process.env.PUBLIC_SITE_URL || "https://sriramjewellery.in").replace(/\/+$/, "");

/** Shaped exactly as server/models/Order.js stores an order. */
const order = (orderId, items, totalAmount, gstAmount) => ({
  orderId,
  items,
  totalAmount,
  gstAmount,
  paymentMethod: "razorpay",
  paymentStatus: "paid",
  approvalStatus: "PENDING",
  shippingAddress: {
    firstName: "Asha", lastName: "Raman",
    streetAddress: "14 Anna Salai", city: "Coimbatore", state: "Tamil Nadu",
    postalCode: "641001", country: "India", number: "+91 9876543210",
  },
});

const samples = [
  ["sign-in-code", signInCodeEmail({ code: "538788", expiryMinutes: 5 })],
  [
    "password-reset",
    passwordResetEmail({
      resetUrl: `${(process.env.PUBLIC_SITE_URL || "https://sriramjewellery.in").replace(/\/+$/, "")}/reset-password?token=${"a".repeat(64)}`,
      expiryMinutes: 30,
    }),
  ],
  [
    "order-confirmation-multi",
    orderConfirmationEmail({
      siteUrl: SITE,
      order: order("SRJ-20261011-0042", [
        { name: "Heritage Gold Jhumkas", quantity: 1, unitPrice: 104545, weight: 12.5, metalType: "gold" },
        { name: "Artisanal Textured Silver Bracelet", quantity: 2, unitPrice: 2368, weight: 22, metalType: "silver" },
      ], 109281, 3183),
    }),
  ],
  [
    // Defensive: the payment route refuses quote-only items (payment.js:94),
    // so this cannot arise from checkout today. Rendered anyway, because a
    // line with no price must never show as Rs0 or NaN if one ever appears.
    "order-confirmation-mixed",
    orderConfirmationEmail({
      siteUrl: SITE,
      order: order("SRJ-20261011-0043", [
        { name: "Vintage Gold Pendant", quantity: 1, unitPrice: 50002, weight: 6.2, metalType: "gold" },
        { name: "Imperial Diamond Necklace", quantity: 1, unitPrice: null, metalType: "gold" },
      ], 50002, 1456),
    }),
  ],
  [
    "order-confirmation-single",
    orderConfirmationEmail({
      siteUrl: SITE,
      order: order("SRJ-20261011-0044", [
        { name: "Royal Diamond Rings Set", quantity: 1, unitPrice: 78400 },
      ], 78400, 2283),
    }),
  ],
];

/** Every <tag> opened is closed, ignoring void elements. */
const unclosedTags = (html) => {
  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "!doctype"]);
  const stack = [];
  for (const m of html.matchAll(/<\/?([a-zA-Z!][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g)) {
    const [raw, name, selfClose] = m;
    const tag = name.toLowerCase();
    if (VOID.has(tag) || selfClose === "/") continue;
    if (raw.startsWith("</")) {
      if (stack[stack.length - 1] === tag) stack.pop();
      else return `</${tag}> closes ${stack[stack.length - 1] ? `<${stack[stack.length - 1]}>` : "nothing"}`;
    } else stack.push(tag);
  }
  return stack.length ? `never closed: <${stack.join(">, <")}>` : null;
};

fs.mkdirSync(OUT, { recursive: true });
let failed = 0;

for (const [name, mail] of samples) {
  const file = path.join(OUT, `${name}.html`);
  fs.writeFileSync(file, mail.html);
  fs.writeFileSync(path.join(OUT, `${name}.txt`), mail.text);

  const bytes = Buffer.byteLength(mail.html);
  const problems = [];

  const bad = unclosedTags(mail.html);
  if (bad) problems.push(`unbalanced tags — ${bad}`);
  if (/var\(--/.test(mail.html)) problems.push("CSS variable: no mail client resolves one");
  if (/<script/i.test(mail.html)) problems.push("<script>: stripped, and a spam signal");
  if (/\bdisplay:\s*(flex|grid)/i.test(mail.html)) problems.push("flex/grid: Outlook renders through Word");
  if (/fonts\.googleapis|@font-face/i.test(mail.html)) problems.push("webfont: will not load");
  if (/background-image|\.svg\b/i.test(mail.html)) problems.push("background-image or SVG");
  if (bytes > GMAIL_CLIP_BYTES) problems.push(`${(bytes / 1024).toFixed(0)}KB — past Gmail's clipping point`);
  if (!mail.text?.trim()) problems.push("no plain-text alternative");

  // Every href must be absolute https (mailto excepted).
  for (const m of mail.html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (!/^(https:\/\/|mailto:)/.test(href)) problems.push(`relative or insecure link: ${href.slice(0, 48)}`);
  }

  if (problems.length) failed += problems.length;
  console.log(`\n${name}  —  ${(bytes / 1024).toFixed(1)}KB`);
  console.log(`  ${file}`);
  console.log(problems.length ? problems.map((p) => `  ✗ ${p}`).join("\n") : "  ✓ passes every constraint");
}

// The code must survive into the text part: a client showing text-only must
// still let the customer sign in.
const otp = samples[0][1];
console.log(
  otp.text.includes("538788")
    ? "\n✓ the sign-in code is present in the plain-text alternative"
    : "\n✗ the sign-in code is MISSING from the plain-text alternative"
);
if (!otp.text.includes("538788")) failed += 1;

console.log(`\n${failed ? `${failed} problem(s)` : "All checks passed"}. Open the .html files in a browser.`);
process.exit(failed ? 1 : 0);
