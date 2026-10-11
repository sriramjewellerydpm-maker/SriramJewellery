import { C, F } from "./tokens.js";

/**
 * The one layout every transactional email uses.
 *
 * Written to the rules mail clients actually enforce, which are not the web's:
 *
 *   - Tables for layout. Outlook renders through Word, which has no flexbox,
 *     no grid and no position.
 *   - Every declaration inline on the element. The <style> block carries only
 *     @media rules, which cannot be inlined — Gmail discards it entirely, so
 *     nothing the email needs may live there.
 *   - Literal hex everywhere. No client resolves a CSS variable.
 *   - No webfont. EB Garamond and Montserrat do not load; Georgia is the
 *     nearest installed face to the first and a system stack serves the second.
 *   - 600px, centred, on a full-bleed background table.
 *   - No background-image, no SVG, no script. Many clients block images by
 *     default, so the wordmark is also rendered as text and the layout must
 *     read with every image off.
 */

/** Absolute https URL for the logo, or null when one cannot be formed. */
export const logoUrl = () => {
  const base = (process.env.PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  // A relative path resolves against the mail client, not us, and http is
  // stripped or warned about. Better no image than a broken one.
  if (!base.startsWith("https://")) return null;
  // The 512px file, not the 2186px one: 820KB in an email is indefensible.
  return `${base}/images/logo.png`;
};

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * @param {object} o
 * @param {string} o.preheader  the line the inbox list shows beside the subject
 * @param {string} o.heading
 * @param {string} o.bodyHtml   already-escaped HTML for the body
 * @param {string} [o.ctaText]
 * @param {string} [o.ctaUrl]   absolute https
 * @param {string} [o.footerNote]
 */
export const baseTemplate = ({ preheader, heading, bodyHtml, ctaText, ctaUrl, footerNote }) => {
  const logo = logoUrl();

  const cta =
    ctaText && ctaUrl
      ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
                <tr>
                  <td align="center" bgcolor="${C.brand}" style="border-radius:2px;">
                    <a href="${esc(ctaUrl)}" style="display:inline-block;padding:14px 32px;font-family:${F.body};font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${C.onBrand};text-decoration:none;">${esc(ctaText)}</a>
                  </td>
                </tr>
              </table>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(heading)}</title>
<style>
  /* Only @media lives here — it cannot be inlined. Gmail strips this block
     wholesale, which is why nothing essential depends on it. */
  @media (prefers-color-scheme: dark) {
    .srj-page { background-color: ${C.darkPage} !important; }
    .srj-card { background-color: ${C.darkCard} !important; }
    .srj-panel { background-color: ${C.darkPanel} !important; }
    .srj-ink, .srj-ink a { color: ${C.darkInk} !important; }
    .srj-muted { color: ${C.darkMuted} !important; }
  }
  @media only screen and (max-width: 620px) {
    .srj-shell { width: 100% !important; }
    .srj-pad { padding-left: 24px !important; padding-right: 24px !important; }
  }
</style>
</head>
<body class="srj-page" style="margin:0;padding:0;background-color:${C.page};">
  <!-- Preheader: shown in the inbox list next to the subject, never on the page.
       The trailing entities stop the client pulling body copy in after it. -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};opacity:0;">
    ${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="srj-page" style="background-color:${C.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="srj-shell" style="width:600px;max-width:600px;">

          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              ${
                logo
                  ? `<img src="${esc(logo)}" width="56" height="56" alt="Sri Ram Jewellery" style="display:block;width:56px;height:56px;border:0;outline:none;margin:0 auto 10px;">`
                  : ""
              }
              <div class="srj-ink" style="font-family:${F.display};font-size:22px;letter-spacing:0.02em;color:${C.ink};">Sri Ram Jewellery</div>
            </td>
          </tr>

          <!-- The gold rule that frames the card -->
          <tr><td style="background-color:${C.gold};height:2px;line-height:2px;font-size:2px;">&nbsp;</td></tr>

          <tr>
            <td class="srj-card srj-pad" bgcolor="${C.card}" style="background-color:${C.card};border-left:1px solid ${C.rule};border-right:1px solid ${C.rule};border-bottom:1px solid ${C.rule};padding:40px;">

              <h1 class="srj-ink" style="margin:0 0 18px;font-family:${F.display};font-size:26px;line-height:1.25;font-weight:600;color:${C.ink};">${esc(heading)}</h1>

              ${bodyHtml}

              ${cta}
            </td>
          </tr>

          ${
            footerNote
              ? `<tr>
            <td class="srj-pad" style="padding:20px 40px 0;">
              <p class="srj-muted" style="margin:0;font-family:${F.body};font-size:13px;line-height:1.6;color:${C.faint};">${footerNote}</p>
            </td>
          </tr>`
              : ""
          }

          <!-- Footer -->
          <tr>
            <td class="srj-pad" align="center" style="padding:28px 40px 0;">
              <div style="font-family:${F.body};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${C.faint};">Sri Ram Jewellery</div>
              <p class="srj-muted" style="margin:10px 0 0;font-family:${F.body};font-size:12px;line-height:1.7;color:${C.faint};">
                We will never ask you for a sign-in code, a password or your card details — not by email, phone or message.
              </p>
              <p class="srj-muted" style="margin:8px 0 0;font-family:${F.body};font-size:12px;line-height:1.7;color:${C.faint};">
                <a href="mailto:sriramjewellerydpm@gmail.com" style="color:${C.faint};text-decoration:underline;">sriramjewellerydpm@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export { esc };
export default baseTemplate;
