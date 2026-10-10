import React, { useState } from "react";
import { Link } from "react-router-dom";
import CustomHelmet from "../../components/CustomHelmet/CustomHelmet";
import { LEGAL_NAV } from "../../content/legalContent";
import ContactAddress from "../../components/ContactAddress/ContactAddress";

/**
 * Help Center — FAQ plus routes to a human.
 *
 * The contact form was previously the only support surface, which forces a
 * customer to wait for a reply to a question we could have answered on the
 * page. Answers below are limited to what is verifiably true of this system
 * today (how pricing works, how sign-in works, what we store). Anything that
 * depends on business policy links to the relevant policy page instead of
 * asserting a second, possibly contradictory, version of it here.
 */

const FAQS = [
  {
    q: "Why does the price of a piece change between visits?",
    a: "Gold and silver pieces are priced live. We calculate metal value from the piece's weight and the current rate, add wastage and GST, and show the result. As the metal rate moves, so does the price. The figure that binds your order is the one calculated when you place it.",
  },
  {
    q: "What does “Price on Request” mean?",
    a: "Some pieces — typically diamond and bespoke work — are quoted individually rather than computed from a metal rate. Send a quote request and we'll come back to you with a price for that specific piece.",
  },
  {
    q: "How do I sign in? I don't have a password.",
    a: "You don't need one. Enter your email address and we send a six-digit code to it. That code signs you in and, if it's your first visit, creates your account at the same time.",
  },
  {
    q: "I'm not receiving my code.",
    a: "Check the address you entered, and look in your spam or promotions folder. Codes expire after five minutes, so request a fresh one rather than using an older message. If it still doesn't arrive, contact us and we'll help you order directly.",
  },
  {
    q: "I was signed out unexpectedly.",
    a: "Sessions expire after a period of inactivity, and signing in again restores everything — your cart and wishlist are saved to your account, not to the device. You can stay signed in on several devices at once, so browsing on your phone won't sign you out on a laptop.",
  },
  {
    q: "Do you store my card details?",
    a: "No. Card numbers, CVV and UPI PINs are entered inside Razorpay's checkout and never reach our servers. We only receive confirmation that a payment succeeded. See our Security policy for detail.",
    link: { to: "/legal/security-policy", label: "Read our Security policy" },
  },
  {
    q: "Do you offer cash on delivery?",
    a: "No. Every order is paid in full online at checkout, through Razorpay. An order left unpaid for 30 minutes is released automatically and the piece goes back on sale.",
  },
  {
    q: "Can I cancel an order?",
    a: "No — once an order is placed and paid for it cannot be cancelled, so please check your selection and delivery address carefully before you pay. A piece that arrives damaged or defective is a separate matter and is covered by the Return & Exchange policy.",
    link: { to: "/legal/cancellation-policy", label: "Read the Cancellation policy" },
  },
  {
    q: "My payment failed but money left my account.",
    a: "Banks sometimes authorise an amount before a payment fails. The hold is released automatically, usually within 5–7 working days. If it hasn't returned by then, contact us with your order reference.",
  },
  {
    q: "How do I return or exchange a piece?",
    a: "Returns are accepted only for a piece that arrives damaged or defective — not for a change of mind. A continuous unboxing video is required for every return, so please record yourself opening the parcel before you break the outer packaging, whether or not you expect a problem. Without it a claim cannot be raised.",
    link: { to: "/legal/return-policy", label: "Read the Return & Exchange policy" },
  },
  {
    q: "How is my order shipped?",
    a: "Orders are dispatched through India Post, and you'll get the tracking number once your parcel has been handed over.",
    link: { to: "/legal/shipping-policy", label: "Read the Shipping policy" },
  },
  {
    q: "Where is my order?",
    a: "Order status is under My Orders in your account. You'll find the current stage of each order and its reference number there.",
    link: { to: "/dashboard/myOrders", label: "Go to My Orders" },
  },
];

const HelpCenter = () => {
  const [open, setOpen] = useState(0);

  return (
    <main className="w-full bg-surface text-on-surface min-h-screen">
      <CustomHelmet title="Help Centre" />

      <div className="max-w-[860px] mx-auto px-margin-mobile md:px-margin-desktop py-16 md:py-24">
        <header className="mb-14 text-center">
          <p className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary mb-4">
            Here to help
          </p>
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-5">
            Help Centre
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Answers to what customers ask us most. If yours isn't here, we'd
            rather you asked than guessed.
          </p>
        </header>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="mb-16">
          <h2
            id="faq-heading"
            className="font-display-lg text-headline-sm mb-6"
          >
            Common questions
          </h2>

          <div className="border-t border-outline-gold/30">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="border-b border-outline-gold/30">
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      id={`faq-trigger-${i}`}
                      className="w-full flex items-start justify-between gap-5 text-left py-5 group"
                    >
                      <span className="font-body-base text-[16px] text-on-surface group-hover:text-primary transition-colors">
                        {item.q}
                      </span>
                      <span
                        className={`material-symbols-outlined text-[20px] text-primary flex-none transition-transform duration-200 ease-out ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      >
                        expand_more
                      </span>
                    </button>
                  </h3>

                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${i}`}
                    hidden={!isOpen}
                    className="pb-6 pr-10"
                  >
                    <p className="font-body-base text-body-base text-on-surface-variant leading-relaxed">
                      {item.a}
                    </p>
                    {item.link && (
                      <Link
                        to={item.link.to}
                        className="inline-block mt-3 font-body-base text-[14px] text-primary underline underline-offset-4"
                      >
                        {item.link.label}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact routes */}
        <section aria-labelledby="contact-heading" className="mb-16">
          <h2 id="contact-heading" className="font-display-lg text-headline-sm mb-6">
            Still need us
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              to="/contact"
              className="border border-outline-gold/30 rounded-sm p-6 hover:border-primary transition-colors block"
            >
              <span
                className="material-symbols-outlined text-[24px] text-primary mb-3 block"
                aria-hidden="true"
              >
                mail
              </span>
              <h3 className="font-body-base text-[16px] mb-1.5">Send us a message</h3>
              <p className="font-body-base text-[14px] text-on-surface-variant">
                Questions about a piece, an order, or a custom commission.
              </p>
            </Link>

            {/* Not an <a> until there is a real mailbox behind it. A support
                card that opens a mail client addressed to nowhere sends the
                customer's question into a void they never learn about. */}
            <div className="border border-outline-gold/30 rounded-sm p-6">
              <span
                className="material-symbols-outlined text-[24px] text-primary mb-3 block"
                aria-hidden="true"
              >
                alternate_email
              </span>
              <h3 className="font-body-base text-[16px] mb-1.5">Email support</h3>
              <ContactAddress channel="support" variant="block" className="mt-2" />
            </div>
          </div>

          {/* TODO(client): add a published phone number and staffed hours here.
              Deliberately omitted rather than invented — a support number that
              nobody answers is worse than none. */}
        </section>

        {/* Policies */}
        <section aria-labelledby="policies-heading">
          <h2 id="policies-heading" className="font-display-lg text-headline-sm mb-5">
            Policies
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {LEGAL_NAV.map((l) => (
              <Link
                key={l.slug}
                to={`/legal/${l.slug}`}
                className="font-body-base text-[14px] text-primary hover:underline underline-offset-4"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default HelpCenter;
