import { baseTemplate, esc } from "./baseTemplate.js";
import { C, F } from "./tokens.js";

/**
 * The administrator password reset. Sent only to a staff address, never a
 * customer, so it says plainly that it concerns the dashboard.
 */
export const passwordResetEmail = ({ resetUrl, expiryMinutes }) => {
  const body = `
              <p class="srj-muted" style="margin:0 0 22px;font-family:${F.body};font-size:15px;line-height:1.6;color:${C.muted};">
                We received a request to reset the password for your administrator account.
                This link is valid for ${esc(expiryMinutes)} minutes and can be used once.
              </p>`;

  const afterCta = `
              <p class="srj-muted" style="margin:20px 0 0;font-family:${F.body};font-size:13px;line-height:1.6;color:${C.faint};word-break:break-all;">
                If the button does not work, paste this into your browser:<br>
                <a href="${esc(resetUrl)}" style="color:${C.brand};">${esc(resetUrl)}</a>
              </p>`;

  return {
    html: baseTemplate({
      preheader: `Reset your administrator password — the link is valid for ${expiryMinutes} minutes.`,
      heading: "Reset your password",
      bodyHtml: body,
      ctaText: "Choose a new password",
      ctaUrl: resetUrl,
      footerNote:
        "If you did not request this, you can ignore this email — your password has not changed. " +
        "If you receive these repeatedly, someone may know your email address; consider changing it." +
        afterCta,
    }),
    text:
      "Reset your Sri Ram Jewellery administrator password.\n\n" +
      `Open this link to choose a new one. It is valid for ${expiryMinutes} minutes and can be used once:\n` +
      `${resetUrl}\n\n` +
      "If you did not request this, ignore this email — your password has not changed.\n\n" +
      "— Sri Ram Jewellery",
  };
};

export default passwordResetEmail;
