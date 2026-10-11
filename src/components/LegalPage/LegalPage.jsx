import React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import CustomHelmet from "../CustomHelmet/CustomHelmet";
import { LEGAL_PAGES, LEGAL_NAV } from "../../content/legalContent";
import ContactAddress from "../ContactAddress/ContactAddress";

/**
 * Renders any policy from `content/legalContent.js`.
 *
 * Sections carrying `needsInput` render as a visibly unfinished block rather
 * than as prose. That is deliberate: an unfinished policy must look unfinished
 * to whoever opens the page, including the client reviewing it. A tastefully
 * blended placeholder is how draft language survives to launch.
 */

const SOURCE_LABEL = {
  client: "Needs client confirmation",
  legal: "Needs legal review",
  dev: "Needs technical input",
};

const PlaceholderBlock = ({ from, what, why }) => (
  <div className="my-4 border border-dashed border-error/50 bg-error/5 rounded-sm p-5">
    <p className="font-label-caps text-[11px] uppercase tracking-[0.15em] text-error mb-3 flex items-center gap-2">
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        edit_note
      </span>
      {SOURCE_LABEL[from] || "Needs input"}
    </p>
    <p className="font-body-base text-on-surface mb-2">{what}</p>
    <p className="font-body-base text-[13px] text-on-surface-variant italic">{why}</p>
  </div>
);

const LegalPage = () => {
  const { slug } = useParams();
  const page = LEGAL_PAGES[slug];

  // An unknown slug is a genuine 404, not an empty policy page.
  if (!page) return <Navigate to="/legal" replace />;

  const outstanding = page.sections.filter((s) => s.needsInput).length;

  return (
    <main className="w-full bg-surface text-on-surface min-h-screen">
      <CustomHelmet title={page.title} />

      <div className="max-w-[760px] mx-auto px-margin-mobile md:px-margin-desktop pt-32 pb-16 md:pb-24">
        {/* Header */}
        <header className="mb-12">
          <p className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary mb-4">
            {page.eyebrow}
          </p>
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-5">
            {page.title}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">{page.summary}</p>

          <div className="mt-8 pt-6 border-t border-outline-gold/30 flex flex-wrap gap-x-8 gap-y-2">
            <span className="font-body-base text-[13px] text-on-surface-variant">
              Last updated:{" "}
              <span className="text-on-surface">
                {page.lastUpdated || "Not yet published"}
              </span>
            </span>
            {outstanding > 0 && (
              <span className="font-body-base text-[13px] text-error">
                {outstanding} section{outstanding === 1 ? "" : "s"} awaiting content
              </span>
            )}
          </div>
        </header>

        {/* Draft banner — only while sections are outstanding */}
        {outstanding > 0 && (
          <div className="mb-12 border-l-2 border-error bg-error/5 px-5 py-4 rounded-sm">
            <p className="font-body-base text-[14px] text-on-surface">
              <strong className="font-semibold">This policy is a draft.</strong> The marked
              sections need real wording before launch. Nothing here should be treated as a
              published commitment to customers.
            </p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-10">
          {page.sections.map((section, i) => (
            <section key={i} aria-labelledby={`sec-${i}`}>
              <h2
                id={`sec-${i}`}
                className="font-display-lg text-headline-sm text-on-surface mb-4"
              >
                {section.heading}
              </h2>

              {section.body?.map((para, j) => (
                <p
                  key={j}
                  className="font-body-base text-body-base text-on-surface-variant mb-4 leading-relaxed"
                >
                  {para}
                </p>
              ))}

              {section.list && (
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  {section.list.map((item, j) => (
                    <li
                      key={j}
                      className="font-body-base text-body-base text-on-surface-variant leading-relaxed"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {/* A contact channel renders as a live link once the address is
                  confirmed, and as a marked placeholder until then — never as
                  a plausible mailto: that goes nowhere. */}
              {section.contact && (
                <div className="mb-4">
                  <ContactAddress channel={section.contact} variant="block" />
                </div>
              )}

              {section.needsInput && <PlaceholderBlock {...section.needsInput} />}
            </section>
          ))}
        </div>

        {/* Cross-links */}
        <nav className="mt-16 pt-8 border-t border-outline-gold/30" aria-label="Other policies">
          <p className="font-label-caps text-label-caps uppercase tracking-[0.15em] text-on-surface-variant mb-4">
            Other policies
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {LEGAL_NAV.filter((l) => l.slug !== slug).map((l) => (
              <Link
                key={l.slug}
                to={`/legal/${l.slug}`}
                className="font-body-base text-[14px] text-primary hover:underline underline-offset-4"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
};

export default LegalPage;
