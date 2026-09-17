/**
 * Shared branded HTML wrapper for every outgoing email.
 *
 * Every email the platform sends (OTP, password reset, application
 * decisions, task assignments, hire requests, ...) used to hand-roll its
 * own `<div style="font-family: Arial, sans-serif; color: #333;">` block
 * independently, each one slightly different and none of them using the
 * app's own navy brand color (#002B56, matching tailwind.config.js's
 * npc.navy.DEFAULT on the frontend, and every other navy-branded surface
 * built this session) - they used a generic dark slate (#2c3e50) instead.
 * This wraps a template's actual content (heading, body, optional CTA
 * button) in one consistent, table-based layout (table layout, not
 * flexbox/grid - email clients like Outlook only reliably support the
 * former) so every email looks like it came from the same product.
 */

export interface BrandedEmailOptions {
  /** Shown in the recipient's inbox preview line; hidden in the body itself. */
  previewText?: string;
  /** Large heading at the top of the content card. */
  heading: string;
  /** Inner HTML for the message body - paragraphs, a details box, etc. Not escaped, caller-controlled. */
  bodyHtml: string;
  /** Optional single call-to-action button, rendered as a navy pill. */
  ctaText?: string;
  ctaLink?: string;
}

const NAVY = "#002B56";
const NAVY_LIGHT = "#003366";
const TEXT_BODY = "#334155";
const TEXT_MUTED = "#94a3b8";
const BORDER = "#e2e8f0";
const PAGE_BG = "#f4f7fc";

export function renderBrandedEmail({
  previewText,
  heading,
  bodyHtml,
  ctaText,
  ctaLink,
}: BrandedEmailOptions): string {
  const cta =
    ctaText && ctaLink
      ? `
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 4px;">
                  <tr>
                    <td style="border-radius: 8px; background-color: ${NAVY};">
                      <a href="${ctaLink}" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; font-family: Arial, Helvetica, sans-serif;">
                        ${ctaText}
                      </a>
                    </td>
                  </tr>
                </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${heading}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${PAGE_BG}; font-family: Arial, Helvetica, sans-serif;">
    ${
      previewText
        ? `<div style="display: none; max-height: 0; max-width: 0; overflow: hidden; opacity: 0; mso-hide: all;">${previewText}</div>`
        : ""
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${PAGE_BG};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="background-color: ${NAVY}; background-image: linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT}); padding: 22px 32px;">
                <span style="color: #ffffff; font-size: 18px; font-weight: bold; letter-spacing: 0.03em; font-family: Arial, Helvetica, sans-serif;">
                  NPC INNOVATION HUB
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 36px 32px 8px;">
                <h1 style="color: ${NAVY}; font-size: 21px; margin: 0 0 16px; font-weight: 700; font-family: Arial, Helvetica, sans-serif;">
                  ${heading}
                </h1>
                <div style="color: ${TEXT_BODY}; font-size: 15px; line-height: 1.65; font-family: Arial, Helvetica, sans-serif;">
                  ${bodyHtml}
                </div>
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px 28px;">
                <hr style="border: none; border-top: 1px solid ${BORDER}; margin: 0 0 20px;" />
                <p style="color: ${TEXT_MUTED}; font-size: 12px; line-height: 1.6; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                  NPC Innovation Hub &middot; This is an automated message, please don't reply directly to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
