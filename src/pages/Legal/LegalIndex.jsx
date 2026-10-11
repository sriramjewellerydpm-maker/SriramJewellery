import React from "react";
import { Link } from "react-router-dom";
import CustomHelmet from "../../components/CustomHelmet/CustomHelmet";
import { LEGAL_PAGES, LEGAL_NAV } from "../../content/legalContent";

/**
 * Index of every policy, with each one's draft status visible.
 *
 * The outstanding count is derived from the content model rather than tracked
 * separately, so it cannot drift: fill in a section and the badge updates
 * itself. This doubles as the launch checklist for whoever is chasing the
 * client for copy.
 */
const LegalIndex = () => (
  <main className="w-full bg-surface text-on-surface min-h-screen">
    <CustomHelmet title="Policies" />

    <div className="max-w-[760px] mx-auto px-margin-mobile md:px-margin-desktop pt-32 pb-16 md:pb-24">
      <header className="mb-12">
        <p className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary mb-4">
          Legal
        </p>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-5">
          Policies
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          How we handle your data, your payments, your deliveries and your
          returns.
        </p>
      </header>

      <ul className="border-t border-outline-gold/30">
        {LEGAL_NAV.map(({ slug, label }) => {
          const page = LEGAL_PAGES[slug];
          const outstanding = page.sections.filter((s) => s.needsInput).length;

          return (
            <li key={slug} className="border-b border-outline-gold/30">
              <Link
                to={`/legal/${slug}`}
                className="flex items-baseline justify-between gap-5 py-5 group"
              >
                <span className="min-w-0">
                  <span className="font-body-base text-[16px] text-on-surface group-hover:text-primary transition-colors block">
                    {label}
                  </span>
                  <span className="font-body-base text-[13px] text-on-surface-variant block mt-1">
                    {page.summary}
                  </span>
                </span>

                {outstanding > 0 && (
                  <span className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-error border border-error/40 bg-error/5 rounded-sm px-2 py-1 flex-none">
                    {outstanding} to write
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="font-body-base text-[13px] text-on-surface-variant mt-8">
        Cookie policy: we set no advertising or analytics cookies, so none is
        required. Browser storage we do use is described in the Privacy Policy.
      </p>
    </div>
  </main>
);

export default LegalIndex;
