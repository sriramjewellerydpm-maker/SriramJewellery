import { baseTemplate, esc } from "./baseTemplate.js";
import { C, F } from "./tokens.js";

/**
 * The sign-in code. The one email every customer receives, and until now the
 * only one sent as bare text.
 *
 * The code is the hero and is real selectable text, never an image: a customer
 * must be able to copy it, a screen reader must be able to read it, and images
 * are blocked by default in much of the world's mail.
 */
export const signInCodeEmail = ({ code, expiryMinutes }) => {
  const body = `
              <p class="srj-muted" style="margin:0 0 22px;font-family:${F.body};font-size:15px;line-height:1.6;color:${C.muted};">
                Use this code to sign in. Nobody can sign in to your account without it.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="srj-panel" align="center" bgcolor="${C.panel}" style="background-color:${C.panel};border:1px solid ${C.rule};border-radius:2px;padding:26px 16px;">
                    <div style="font-family:${F.body};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${C.faint};">Your sign-in code</div>
                    <div class="srj-ink" style="margin-top:12px;font-family:${F.mono};font-size:38px;line-height:1.1;font-weight:700;letter-spacing:0.22em;color:${C.ink};">${esc(code)}</div>
                  </td>
                </tr>
              </table>

              <p class="srj-muted" style="margin:22px 0 0;font-family:${F.body};font-size:14px;line-height:1.6;color:${C.muted};">
                It expires in ${esc(expiryMinutes)} minutes and can be used once.
              </p>`;

  return {
    html: baseTemplate({
      preheader: `Your sign-in code is ${code} — it expires in ${expiryMinutes} minutes.`,
      heading: "Your sign-in code",
      bodyHtml: body,
      footerNote:
        "If you did not try to sign in, ignore this email — your account is unchanged and nobody can sign in without this code.",
    }),
    // Kept close to the previous plain-text mail, which customers have already
    // been receiving: the code on its own line, easy to copy from any client.
    text:
      `Your Sri Ram Jewellery sign-in code is ${code}.\n\n` +
      `It expires in ${expiryMinutes} minutes and can be used once.\n\n` +
      "If you did not try to sign in, ignore this email. Nobody can sign in without this code.\n\n" +
      "We will never ask you for this code — not by email, phone or message.\n\n" +
      "— Sri Ram Jewellery",
  };
};

export default signInCodeEmail;
