/**
 * Content model for the legal pages.
 *
 * Every policy is data, not markup, so all ten render through one reviewed
 * template (`components/LegalPage`). Adding a policy means adding an entry
 * here and a route — not another near-identical component.
 *
 * ── On placeholders ───────────────────────────────────────────────────────
 * A section carrying `needsInput` renders as a visibly marked block instead of
 * prose. Policy language that depends on how the business actually operates —
 * refund windows, the registered address, GSTIN, courier partners — is NOT
 * invented here. Inventing it produces a document that reads as authoritative
 * and is wrong, which is worse than an obvious gap: customers rely on it and
 * it is quoted back to you in disputes.
 *
 * `from: "client"`  → Sri Ram Jewellery must confirm the wording.
 * `from: "legal"`   → needs a lawyer's review before launch.
 * `from: "dev"`     → we can fill it once a technical detail is settled.
 *
 * Statements of fact about how the software works (we never see card numbers,
 * passwords are bcrypt-hashed) ARE written out, because those are verifiable
 * from this codebase rather than being business policy.
 */

/**
 * Contact channels — single source of truth, and deliberately unset.
 *
 * These were previously plausible-looking strings ("support@sriramjewellery.in")
 * rendered as working mailto: links. None of those mailboxes exists. A customer
 * whose payment just failed, or a researcher reporting a vulnerability, would
 * have written to an address that silently goes nowhere — and on a legal page,
 * an unreachable grievance address is worse than an obviously missing one,
 * because it looks like a commitment has been met when it has not.
 *
 * `address: null` renders the same dashed-red "needs content" treatment the
 * legal placeholder sections use. Fill one in and it becomes a live link
 * everywhere at once, with no other change.
 *
 * All four now point at the shop's one real, monitored mailbox, confirmed by
 * the client on 11 October 2026. They stay separate keys rather than being
 * collapsed into one so that a dedicated privacy or security address can be
 * added later by changing a single line.
 */
export const CONTACT = {
  support: {
    address: "sriramjewellerydpm@gmail.com",
    purpose: "Customer support — orders, returns, payment problems",
  },
  privacy: {
    address: "sriramjewellerydpm@gmail.com",
    purpose: "Data protection requests (access, correction, deletion)",
  },
  security: {
    address: "sriramjewellerydpm@gmail.com",
    purpose: "Security and vulnerability reports",
  },
  grievance: {
    // The same mailbox, because it is the one the shop actually reads. The
    // officer's NAME is published in the Privacy Policy; the response window
    // the shop commits to is still outstanding.
    address: "sriramjewellerydpm@gmail.com",
    purpose: "Grievance Officer — required to be published by Indian e-commerce rules",
  },
  phone: {
    // The number the client confirmed for customer contact, and the one the
    // WhatsApp button uses. Staffed hours have not been given.
    address: "++91 82484 56747",
    purpose: "Published support telephone number and staffed hours",
  },
};

/** True when a channel has a confirmed, real address. */
export const hasContact = (key) => Boolean(CONTACT[key]?.address);

/**
 * When these pages were last changed — not a claim that a lawyer has read
 * them. The three sections marked TODO(legal) in this file still want that
 * before launch; the date says when the words last moved, which is what a
 * customer quoting a policy back at us needs to know.
 */
const LAST_UPDATED = "11 October 2026";

export const LEGAL_PAGES = {
  // ─── Privacy ────────────────────────────────────────────────────────────
  "privacy-policy": {
    title: "Privacy Policy",
    eyebrow: "Your data",
    summary:
      "What we collect when you shop with us, why we hold it, and how you ask us to change or delete it.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Who we are",
        body: [
          "This site is operated by SRI RAM JEWELLERY, a sole proprietorship of Radhakrishnan, trading from 280/212, Sriram Jewellery, Vasantha Road, Dharapuram 638656, Tamil Nadu, India.",
          "Our GSTIN is 33AJSPR7785A1ZQ. A proprietorship has no company registration number; the GSTIN is our registration of record.",
          "Radhakrishnan, the proprietor, is accountable for data protection requests and acts as our Grievance Officer. Use the address at the end of this policy to reach him.",
        ],
      },
      {
        heading: "What we collect",
        body: [
          "We collect only what an order needs to exist. Specifically:",
        ],
        list: [
          "Your email address — this is your account identity, since you sign in with a one-time code sent to it rather than a password.",
          "Your mobile number, which we use to reach you about a delivery. It is not how you sign in.",
          "Your name, once you provide it after your first sign-in.",
          "Delivery addresses you save.",
          "Your order, cart and wishlist history.",
          "Messages you send us through the contact or quote-request forms.",
        ],
      },
      {
        heading: "What we never collect",
        body: [
          "We do not receive or store your card number, CVV, UPI PIN or net-banking credentials. Payment details are entered inside Razorpay's own checkout and never reach our servers. See the Security Policy for detail.",
        ],
      },
      {
        heading: "Storage in your browser",
        body: [
          "We set no advertising or analytics cookies, and we run no third-party tracking scripts.",
          "We do use two pieces of browser storage, both strictly functional: your sign-in tokens are kept in local storage so you are not asked to re-authenticate on every page, and a short-lived session identifier is kept in session storage so that one person refreshing a product page is not counted as several viewers. The session identifier describes nothing about you and is discarded when you close the tab.",
          "Razorpay may set its own cookies within its checkout window. That processing is governed by Razorpay's privacy policy, not this one.",
        ],
      },
      {
        heading: "Who else sees your data",
        body: [
          "Razorpay, to take payment. Cloudinary, which stores product imagery only and receives no customer data. Our hosting and database providers, which hold the data at rest on our behalf.",
          "India Post, which receives your name, delivery address and phone number so that it can deliver your parcel. It is the only courier we use.",
        ],
      },
      {
        // Eight years is the conservative reading of the GST and income-tax
        // retention rules together. TODO(auditor): confirm the exact figure.
        heading: "How long we keep it",
        body: [
          "Orders, invoices and payment records are kept for eight years from the end of the financial year they fall in. That is not a choice — GST and income-tax rules require it of us, and we cannot delete them sooner even if you ask.",
          "Your account, the addresses saved in it, your cart and your wishlist are kept while the account is open. Ask us to close it and those go within 30 days. The order records above stay, for the reason given.",
          "We do not delete an unused account automatically. If you want yours closed, tell us and we will close it.",
        ],
      },
      {
        // Written out because these are the statute's words, not the shop's
        // choices: the Digital Personal Data Protection Act 2023, which is
        // what applies to customers in India. We deliver only within India
        // (India Post, see the Shipping Policy), so no GDPR wording is added
        // here — if the shop ever ships to or markets in the EU or UK, this
        // section needs a lawyer before that begins.
        heading: "Your rights",
        body: [
          "Under India's Digital Personal Data Protection Act 2023 you may ask us to do the following, and we will not charge you for it:",
        ],
        list: [
          "Tell you what personal data of yours we hold and what we have done with it.",
          "Correct anything that is wrong, complete anything that is missing, or update anything that has changed.",
          "Erase what we hold, except where we are required by law to keep it — invoices in particular, which tax and GST rules oblige us to retain.",
          "Withdraw a consent you previously gave. That does not undo anything done while the consent was in force.",
          "Nominate someone to exercise these rights for you if you die or become incapable of exercising them yourself.",
          "Raise a grievance with us, and take it to the Data Protection Board of India if our answer does not satisfy you.",
        ],
      },
      {
        heading: "Contacting us about your data",
        // The two windows below are what the Consumer Protection (E-Commerce)
        // Rules 2020 already require of the shop, so publishing them adds no
        // obligation that does not already exist — and those same rules
        // require them to be published.
        body: [
          "Write to our data protection address and we will respond to access, correction and deletion requests.",
          "Radhakrishnan, the proprietor, is our Grievance Officer. We will acknowledge a grievance within 48 hours of receiving it and resolve it within one month.",
          "If our answer does not satisfy you, you may take the matter to the Data Protection Board of India.",
        ],
        contact: "privacy",
      },
    ],
  },

  // ─── Terms ──────────────────────────────────────────────────────────────
  "terms-of-service": {
    title: "Terms of Service",
    eyebrow: "The agreement",
    summary:
      "The terms you accept when you browse, order or hold an account with Sri Ram Jewellery.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        // TODO(legal): reviewed wording before launch. Written plainly here
        // so the page is usable in the meantime; the substance is ordinary.
        heading: "Accepting these terms",
        body: [
          "Browsing this site, holding an account with us, or placing an order means you accept these terms as they stand on the day you do it.",
          "We may change them. The version published here when you place an order is the one that governs that order — a later change never applies backwards.",
          "If any part of these terms turns out to be unenforceable, the rest of them continue to apply.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "Your account is tied to your email address and is secured by a one-time code sent to it. Anyone able to read mail at that address can reach your account, so keep control of the mailbox and tell us promptly if you lose access to it.",
          "You may hold one active session at a time. Signing in on a new device ends the session on the previous one.",
        ],
      },
      {
        heading: "How our prices work",
        body: [
          "Prices for gold and silver pieces are not fixed. They are calculated live from the metal rate we publish, the weight of the piece, its wastage percentage and applicable GST. The price you see can therefore change between visits as the metal rate moves.",
          "The price that binds an order is the one calculated by us at the moment your order is placed. We recalculate every line on the server when you check out; a price displayed earlier in your session is indicative.",
          "Some pieces are marked Price on Request. These are quoted individually and cannot be purchased directly.",
        ],
      },
      {
        heading: "Payment is online and in advance",
        body: [
          "Orders are paid for in full at checkout, through Razorpay. We do not offer cash on delivery.",
          "An order that is not paid for within 30 minutes is released automatically and marked expired, and the stock it was holding returns to sale.",
          "Once an order is paid it cannot be cancelled — please see the Cancellation Policy before you pay.",
        ],
      },
      {
        heading: "Orders and acceptance",
        body: [
          "Paying for an order does not by itself conclude a contract with us. Every paid order is reviewed by us first, and the contract is formed when we approve it. Your 15-day delivery window runs from that approval, not from payment.",
          "Until we approve it, we may decline an order — because the piece is out of stock, because the price shown was wrong, because your pincode is not served by India Post, or because of a problem with the payment on our side. Where we decline an order that has been paid for, the full amount is returned to you; the Cancellation Policy sets out how and when.",
        ],
      },
      // TODO(client/auditor): hallmarking is deliberately absent. The client
      // instructed on 11 Oct 2026 that the site say nothing about it. BIS
      // hallmarking is mandatory for gold jewellery sold in notified districts
      // and silence on the website does not change whether the obligation
      // applies to the shop — it only removes the claim from the page. This
      // needs the shop's auditor to confirm before launch. It is NOT written
      // as a needsInput block, because those render publicly and a visible
      // "needs client confirmation" note about hallmarking would breach the
      // same instruction it was recording.
      {
        heading: "Product accuracy and weight",
        body: [
          "Jewellery is finished by hand and cannot be made to an exact weight. The gross and net weights shown for a piece are accurate to within ±2%, and the piece you receive may differ from its stated weight by up to that margin either way.",
          "Where a piece is priced from its weight, the price you pay is calculated from the weight stated on the listing. We do not re-price it against the weight of the finished piece.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "The photography, product descriptions and design of this site belong to Sri Ram Jewellery and may not be reproduced without written permission.",
        ],
      },
      {
        // TODO(legal): the cap and the forum are commercial decisions and
        // should be confirmed. Dharapuram sits in Tiruppur district.
        heading: "Liability and governing law",
        body: [
          "We are responsible for delivering the piece you ordered, as described, and for putting it right under the Return & Exchange Policy if it reaches you damaged or defective.",
          "We are not responsible for losses beyond that which we could not reasonably have foreseen — a missed occasion, for instance. Where we are liable, our liability is limited to what you paid for the order.",
          "None of this limits your rights under the Consumer Protection Act 2019, or our liability for anything the law does not allow us to limit.",
          "These terms are governed by the law of India, and the courts at Tiruppur, Tamil Nadu have jurisdiction over any dispute arising from them.",
        ],
      },
    ],
  },

  // ─── Shipping ───────────────────────────────────────────────────────────
  "shipping-policy": {
    title: "Shipping Policy",
    eyebrow: "Getting it to you",
    summary: "Orders travel by India Post. Where we deliver, how long it takes, and who carries the risk.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "How your order travels",
        body: [
          "Every order is dispatched through India Post. You will be given the tracking number for your consignment once it has been handed over.",
          "Which India Post service carries a parcel depends on the value of the piece and where it is going. We choose the one appropriate to the consignment; the risk while it is in transit is ours either way.",
          "We deliver within India only. If your pincode cannot be served we will tell you and cancel the order rather than take your money — see the Cancellation Policy.",
        ],
      },
      {
        // The client asked on 11 Oct 2026 that no dispatch timeline be stated.
        // The 15-day window is therefore written as one end-to-end commitment
        // covering both preparation and transit, rather than as two figures.
        heading: "Delivery time",
        body: [
          "Your order reaches you within 15 days of our approving it. Approval happens after payment — the Terms of Service explain why — and the expected delivery date appears against your order under My Orders as soon as it is approved.",
          "That 15 days covers preparing the piece and its journey with India Post together. We do not quote a separate dispatch date.",
        ],
      },
      {
        heading: "Delivery charges",
        body: [
          "Jewellery is delivered free.",
          "Coins carry a delivery charge, set by weight — typically ₹50 for a coin of 1 gram or less and ₹100 for a heavier one. The exact charge is shown against your order at checkout, before you pay.",
          "Any order containing a piece costing more than ₹5,000 is delivered free, whatever else is in it. A coin ordered alongside such a piece travels free with it.",
          "You will never be charged for delivery without seeing the amount first.",
        ],
      },
      {
        heading: "Transit risk",
        body: [
          "We carry the risk while your parcel is with India Post. If it is lost in transit, or reaches you damaged, we replace the piece — you are not out of pocket for a failure of the carrier.",
          "A parcel that arrives damaged, opened or tampered with must be reported to us within 48 hours of delivery, with the unboxing video described in the Return & Exchange Policy. Without that recording a claim cannot be raised against the carrier, and the replacement cannot be made.",
          "Whatever cover a consignment carries is a matter between us and India Post. Your remedy is with us, and it does not depend on what we are able to recover from them.",
        ],
      },
      {
        heading: "Tracking your order",
        body: [
          "Once dispatched, your order status is visible under My Orders in your account.",
        ],
      },
    ],
  },

  // ─── Returns ────────────────────────────────────────────────────────────
  "return-policy": {
    title: "Return & Exchange Policy",
    eyebrow: "If it isn't right",
    summary: "Returns are accepted for damaged or defective pieces only, and an unboxing video is required.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Only a damaged or defective piece can be returned",
        body: [
          "A piece can be returned only if it reaches you damaged or defective. We do not accept returns or exchanges for a change of mind, for fit, or because a piece looks different in person from its photographs.",
          "Pieces bought against a live metal rate, made-to-order and customised work are covered on the same basis: a manufacturing fault or transit damage, and nothing else.",
          "A fault must be reported to us within 48 hours of delivery. After that we cannot tell a manufacturing fault from ordinary wear, and no claim can be raised with India Post or our insurer.",
        ],
      },
      {
        heading: "An unboxing video is required",
        body: [
          "A continuous, unedited video of the parcel being opened is mandatory for every return. Start recording before the outer packaging is broken, keep the shipping label visible at the start, and keep recording until the piece is fully unwrapped.",
          "Without that video a claim cannot be raised with the carrier or our insurer, and the return cannot be accepted. This is the single most important step — please record it for every order, whether or not you expect a problem.",
        ],
      },
      {
        heading: "How to raise a return",
        body: [
          "Message us on WhatsApp at +91 93637 50806, or write to sriramjewellerydpm@gmail.com, within 48 hours of delivery. Send your order number and the unboxing video. Returns are handled by our team; there is no self-serve returns option on the site.",
          "We arrange the return shipment and we pay for it. Please do not send a piece back before we have confirmed the return with you, or we cannot track it.",
        ],
      },
      {
        heading: "We replace a faulty piece, we do not refund it",
        body: [
          "An accepted damaged or defective piece is replaced. We do not refund the purchase price for a fault, so no question arises of re-pricing the piece against the metal rate on the day it comes back.",
          "You are not charged again for the replacement, and you pay neither the return nor the re-delivery cost.",
        ],
      },
      {
        heading: "If the piece cannot be replaced",
        body: [
          "Replacement is our normal remedy, and in most cases it is the one we will offer. Occasionally it is not possible — a one-off design, or a piece we can no longer obtain.",
          "In that situation we will agree the outcome with you case by case. Depending on the circumstances that may be a comparable piece, or, where nothing suitable can be offered, a refund. We will tell you what we can do when you report the fault, and we will not leave you without a remedy.",
        ],
      },
      {
        heading: "When a refund does happen",
        body: [
          "A fault is put right by replacement, as above, so a return does not produce a refund. Money comes back to you only where we cancel an order ourselves — the Cancellation Policy sets out the grounds and the timing.",
          "Any refund we do make goes to the original payment method through Razorpay. We cannot send it anywhere else.",
        ],
      },
    ],
  },

  // ─── Cancellation ───────────────────────────────────────────────────────
  "cancellation-policy": {
    title: "Cancellation Policy",
    eyebrow: "Before you pay",
    summary: "Orders cannot be cancelled once placed. Please check everything before you pay.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Orders cannot be cancelled",
        body: [
          "Once an order is placed and paid for, it cannot be cancelled and the amount paid is not refundable on a change of mind. Please check your selection, the weight and specification of the piece, and your delivery address carefully before completing payment.",
          "This applies to every piece in the catalogue, whether it is held in stock or made to order.",
        ],
      },
      {
        heading: "This does not affect a faulty piece",
        body: [
          "Cancellation and returns are separate. A piece that reaches you damaged or defective is covered by the Return & Exchange Policy, and nothing in this policy limits that.",
        ],
      },
      {
        heading: "Cancellation by us",
        body: [
          "An order that is not paid for within 30 minutes of being placed is released automatically and marked expired, so the stock it was holding goes back on sale. No payment is taken, and nothing is charged.",
          "We may also cancel an order that has already been paid for, on these grounds and no others: the piece turns out to be out of stock, the price shown to you was wrong, your pincode is not served by India Post, or there was a problem with the payment on our side.",
          "Where that happens we tell you why, and we will offer you a comparable piece if we have one. If you would rather not take it, or we have nothing suitable, the amount you paid is returned in full.",
        ],
      },
      {
        heading: "Refunds where we cancel",
        body: [
          "Where we cancel an order that has already been paid for, the payment is returned in full to the original payment method through Razorpay. We cannot send it anywhere else.",
          "We start the refund within 2 banking days of cancelling your order. How long it then takes to appear in your account is set by Razorpay and by your own bank, and is usually a further 5 to 7 working days. We will tell you the date we initiated it.",
        ],
      },
    ],
  },

  // ─── Security ───────────────────────────────────────────────────────────
  "security-policy": {
    title: "Security Policy",
    eyebrow: "How we protect you",
    summary: "How payment data is handled, and what we do and do not store.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "We never see your card details",
        body: [
          "Card numbers, CVV codes, UPI PINs and net-banking credentials are entered inside Razorpay's own hosted checkout. They are never transmitted to our servers and are never stored by us, in any form.",
          "Razorpay is a PCI-DSS compliant payment provider. Card data handling is theirs, under that certification. We receive only a payment identifier and a status, which is what lets us mark your order paid.",
        ],
      },
      {
        heading: "Every order is priced on the server",
        body: [
          "Prices are never trusted from the browser. When you place an order or begin payment, every line is recalculated on our servers from the live metal rate, the piece's weight and applicable GST. A tampered price in the browser cannot change what you are charged.",
        ],
      },
      {
        heading: "How your account is protected",
        body: [
          "Customers sign in with a one-time code, so there is no customer password for an attacker to steal or reuse.",
          "Administrator passwords are stored only as bcrypt hashes at cost factor 12 — never in plain text, and not reversible.",
          "One-time codes are themselves stored hashed, expire after five minutes, can be used once, and are rate-limited per email address. A code is destroyed after a small number of wrong guesses, so it cannot be worked through.",
          "Sessions use short-lived access tokens with longer-lived refresh tokens, and refresh tokens are stored hashed rather than in the clear.",
        ],
      },
      {
        heading: "Data in transit",
        body: [
          "The site is served over HTTPS, and all traffic between your browser, our API and our payment provider is encrypted in transit.",
        ],
      },
      {
        heading: "Reporting a problem",
        body: [
          "If you believe you have found a security weakness, please see our Responsible Disclosure page rather than reporting it publicly.",
        ],
      },
    ],
  },

  // ─── Responsible disclosure ─────────────────────────────────────────────
  "responsible-disclosure": {
    title: "Responsible Disclosure",
    eyebrow: "Security researchers",
    summary: "How to report a vulnerability to us, and what you can expect in return.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Reporting a vulnerability",
        body: [
          "Email our security address with enough detail to reproduce the issue — the affected URL or endpoint, the steps taken, and what you were able to achieve.",
          "Please report privately and give us a reasonable opportunity to fix the issue before disclosing it publicly.",
        ],
        contact: "security",
      },
      {
        heading: "What we ask",
        list: [
          "Do not access, modify or delete data belonging to anyone other than yourself.",
          "Do not run automated scanning that degrades the service for customers.",
          "Do not attempt social engineering against our staff or customers.",
          "Use a test account of your own where a proof of concept requires one.",
        ],
      },
      {
        heading: "What we commit to",
        body: [
          "We will acknowledge your report within 3 working days, and tell you within 10 what we intend to do about it.",
          "We will keep you informed while we fix it, and we will not pursue you for a report made in good faith under this policy.",
          "We do not run a paid bug bounty. If you would like public credit once the issue is fixed, ask and we will give it.",
        ],
      },
      {
        heading: "Out of scope",
        body: [
          "Findings in Razorpay's or Cloudinary's own systems should be reported to those providers directly under their disclosure programmes.",
        ],
      },
    ],
  },

  // ─── Disclaimer ─────────────────────────────────────────────────────────
  disclaimer: {
    title: "Disclaimer",
    eyebrow: "Limits of what's shown",
    summary: "How to read our prices, imagery and product information.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Metal rates are indicative",
        body: [
          "The gold and silver rates shown on this site are the rates we use to price our own pieces. They are published for transparency, not as financial advice or as a market quotation, and should not be relied on for any purpose other than understanding our pricing.",
          "Rates are updated periodically. Where a rate has become stale, we decline to price against it rather than quote you a confident but outdated figure.",
        ],
      },
      {
        heading: "Product imagery",
        body: [
          "Photographs are taken under studio lighting and magnification. Colour, finish and apparent scale vary between screens, and handmade pieces vary slightly from one to the next.",
          "Stones shown are representative rather than exact. Natural stones differ in colour, clarity and placement, and no two pieces are identical.",
          "Weights and dimensions are as listed, within the ±2% tolerance set out in the Terms of Service. A piece that differs only in the ways described here is not a defect and is not returnable; one that is not the piece you ordered, or that arrives damaged, is — see the Return & Exchange Policy.",
        ],
      },
      {
        heading: "Weights and specifications",
        body: [
          "Stated gross and net weights are accurate to within ±2%. A handmade piece cannot be produced to an exact weight, and the piece you receive may be up to 2% lighter or heavier than its listing says.",
          "The price you pay is worked out from the weight shown on the listing, not from the weight of the finished piece. The Terms of Service say the same thing, and the two are meant to agree.",
        ],
      },
      {
        heading: "External links",
        body: [
          "Where we link to another site, we are not responsible for its content or its handling of your data.",
        ],
      },
    ],
  },

  // ─── Accessibility ──────────────────────────────────────────────────────
  "accessibility-statement": {
    title: "Accessibility Statement",
    eyebrow: "Everyone welcome",
    summary: "What we have done to make this site usable, and how to tell us where it falls short.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "What we have implemented",
        body: ["The following are in place across the site today:"],
        list: [
          "Motion is reduced automatically when your device requests it, with movement removed and comprehension-aiding fades kept.",
          "Hover effects are gated to devices with a real pointer, so a tap on a touchscreen does not leave elements stuck in a hovered state.",
          "Interactive controls have a visible keyboard focus state.",
          "Form fields carry associated labels, and dialogs can be dismissed with the Escape key.",
          "Text scales with your browser's font-size setting, and input fields avoid the forced zoom iOS applies to small text.",
        ],
      },
      {
        // Deliberately NOT a conformance claim: no independent audit has been
        // run, and asserting AA without one is the thing this avoids.
        heading: "Conformance target",
        body: [
          "We build to WCAG 2.2 Level AA. We have not had an independent audit, so we do not claim to conform to it — it is the standard we work to, not a certificate we hold.",
          "What is already in place: every control can be reached and operated with a keyboard, form fields carry real labels rather than placeholder text, changes of state are announced to screen readers rather than shown by colour alone, and touch targets are at least 44 pixels.",
        ],
      },
      {
        // Only faults confirmed in this codebase. Nothing is listed here that
        // has not actually been checked, and nothing checked is left out.
        heading: "Known limitations",
        body: [
          "These are the gaps we know about. They are what we have found ourselves, not the findings of an audit:",
        ],
        list: [
          "There is no skip-to-content link, so someone navigating by keyboard passes through the whole menu on every page.",
          "Colour contrast has not been measured across the site, so we cannot promise every combination meets the AA ratio.",
          "No independent audit has been carried out, so this list is almost certainly shorter than a real one would be.",
        ],
      },
      {
        heading: "Tell us about a barrier",
        body: [
          "If any part of this site prevents you from doing what you came to do, write to us and tell us what happened. We will help you complete your purchase directly and fix the underlying problem.",
        ],
        contact: "support",
      },
    ],
  },

  // ─── Acceptable use ─────────────────────────────────────────────────────
  "acceptable-use": {
    title: "Acceptable Use Policy",
    eyebrow: "Using the site",
    summary: "What we ask you not to do with this site and its content.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Please do not",
        list: [
          "Attempt to access another customer's account, order history or saved addresses.",
          "Probe, scan or test the security of the site except as permitted under our Responsible Disclosure policy.",
          "Scrape product data, imagery or metal rates in bulk, or place automated orders.",
          "Submit false orders, fraudulent payment instruments, or another person's details without their permission.",
          "Post abusive, misleading or unlawful content in reviews or messages.",
          "Reproduce our photography or product descriptions commercially without written permission.",
        ],
      },
      {
        // Describes what routes/reviews.js actually enforces: a delivered
        // order containing the piece, one review per customer per piece, and
        // the display name taken from the account rather than the request.
        heading: "Reviews",
        body: [
          "Only a customer who has received a piece can review it. We check that an order of yours containing it has been delivered — paying for it is not enough, because you have not seen it yet. One review per piece, per customer.",
          "Your review is published under the name on your account. You cannot post under another name, and nobody can post as us.",
          "Reviews are not read before they appear. We remove ones that are abusive, that identify another person, that carry contact details or advertising, or that are plainly not about the piece. We do not remove a review for being critical of us.",
        ],
      },
      {
        // TODO(legal): confirm before launch. Disclosed in advance, which is
        // what makes acting on it defensible at all.
        heading: "If you breach this policy",
        body: [
          "Depending on what has happened we may remove the content, suspend or close your account, and cancel any order of yours that has not yet been dispatched — refunding it in full.",
          "Where something looks like a criminal matter — payment fraud, or an attack on this site — we may report it to the police or to our payment provider, and give them what they ask for.",
          "We will tell you what we have done and why, unless telling you would get in the way of an investigation.",
        ],
      },
    ],
  },
};

/** Ordered for the footer and the index page. */
export const LEGAL_NAV = [
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "terms-of-service", label: "Terms of Service" },
  { slug: "shipping-policy", label: "Shipping Policy" },
  { slug: "return-policy", label: "Returns & Exchange" },
  { slug: "cancellation-policy", label: "Cancellation Policy" },
  { slug: "security-policy", label: "Security" },
  { slug: "responsible-disclosure", label: "Responsible Disclosure" },
  { slug: "disclaimer", label: "Disclaimer" },
  { slug: "accessibility-statement", label: "Accessibility" },
  { slug: "acceptable-use", label: "Acceptable Use" },
];
