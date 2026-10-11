import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomHelmet from "../../components/CustomHelmet/CustomHelmet";
import useAuthContext from "../../hooks/useAuthContext";

/**
 * Shown once, immediately after a new customer sets their name.
 *
 * It explains the one thing about this shop that genuinely surprises people:
 * prices move with the metal rate. A customer who doesn't know that reads a
 * changed price as a bait-and-switch. That is the whole justification for the
 * screen — it is not a product tour, and it is skippable.
 *
 * Reached with state: { from } — the page they were heading to before signing
 * in, so onboarding never costs them their place.
 */

const STEPS = [
  {
    icon: "monitoring",
    title: "Prices follow the metal rate",
    body: "Gold and silver pieces are priced from today's rate, the weight of the piece, wastage and GST. That means a price can differ from the last time you looked. The price we calculate when you order is the one you pay.",
  },
  {
    icon: "diamond",
    title: "Some pieces are quoted",
    body: "Diamond and bespoke work is marked Price on Request. Send us a request and we'll come back with a price for that exact piece rather than an estimate.",
  },
  {
    icon: "favorite",
    title: "Your saves follow you",
    body: "Your cart and wishlist live with your account, not this device. Sign in anywhere with the same email address and they'll be waiting.",
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuthContext();
  const destination = state?.from || "/shop";

  const finish = () => navigate(destination, { replace: true });

  return (
    <main className="w-full bg-surface text-on-surface min-h-screen">
      <CustomHelmet title="Welcome" />

      <div className="max-w-[720px] mx-auto px-margin-mobile md:px-margin-desktop pt-32 pb-16 md:pb-24">
        <header className="mb-12 text-center">
          <p className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary mb-4">
            Welcome to the heritage
          </p>
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-5">
            {user?.name ? `Welcome, ${user.name}` : "Welcome"}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mx-auto">
            Three things worth knowing before you browse. It takes a moment.
          </p>
        </header>

        <ol className="space-y-8 mb-12">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-5 items-start">
              <span
                className="material-symbols-outlined text-[22px] text-primary flex-none mt-0.5 border border-outline-gold/40 rounded-full w-11 h-11 grid place-items-center"
                aria-hidden="true"
              >
                {step.icon}
              </span>
              <div className="min-w-0">
                <h2 className="font-display-lg text-headline-sm text-on-surface mb-2">
                  {step.title}
                </h2>
                <p className="font-body-base text-body-base text-on-surface-variant leading-relaxed">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-outline-gold/30">
          <button
            type="button"
            onClick={finish}
            className="px-8 py-3.5 bg-primary text-white hover:bg-primary-container active:scale-[0.97] transition-[background-color,transform] duration-200 ease-out font-button-text uppercase tracking-widest text-xs rounded-sm"
          >
            Start browsing
          </button>
          <button
            type="button"
            onClick={finish}
            className="font-body-base text-[14px] text-on-surface-variant hover:text-primary transition-colors underline underline-offset-4"
          >
            Skip
          </button>
        </div>
      </div>
    </main>
  );
};

export default Onboarding;
