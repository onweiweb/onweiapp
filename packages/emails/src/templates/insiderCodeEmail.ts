import { DEFAULT_SITE_URL, escapeHtml, firstNameOf } from "./layout";
import type { RenderedEmail } from "./otpEmail";

/**
 * "A little thank you from us": the Insider code email, letter version
 * (client PDFs "Onwei_InsiderEmail_letter" desktop and mobile, 2026-11-16).
 * Made to read like a note from Sakshi and Sabhya rather than a newsletter,
 * so Gmail is less likely to file it under Promotions: one short banner, a
 * plain text link instead of a big button, few images. Copy is the client's,
 * word for word. Do not edit it here without them.
 *
 * Images live in apps/web/public/images/email/: insider-letter-header.png,
 * insider-gift.png, insider-signature.png (Summer Mood, which mail apps
 * can't load as a font) and insider-stamp.png. All rendered at 2x.
 */

const NAVY = "#161845";
const CREAM = "#f4f2e8";
const PURPLE = "#8e94ca";
const MUTED = "#4a4c6e";

const HEADING_FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY_FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO_FONT = "'Space Mono','Courier New',Courier,monospace";

export interface InsiderCodeEmailInput {
  fullName: string;
  code: string;
  /** Private "Share your address" link for this member. */
  addressUrl: string;
  /** Private unsubscribe page for this member (the footer link). */
  unsubscribeUrl: string;
  /** Endpoint mail apps POST to for one-click unsubscribe (RFC 8058). */
  oneClickUnsubscribeUrl: string;
  siteUrl?: string;
}

export function renderInsiderCodeEmail(
  input: InsiderCodeEmailInput,
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const img = (name: string) => `${siteUrl}/images/email/${name}`;
  const first = firstNameOf(input.fullName);
  const greeting = first ? `Hi ${first},` : "Hi there,";
  const code = input.code.toUpperCase();
  const address = escapeHtml(input.addressUrl);

  const subject = "A little thank you from us";
  const preheader = `${greeting} thank you for being on the Wei with us from the start.`;

  const p = (html: string, extra = "") =>
    `<p style="margin:0 0 20px;font-family:${BODY_FONT};font-size:17px;line-height:1.55;color:${NAVY};${extra}">${html}</p>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CREAM};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CREAM}" style="background:${CREAM};">
<tr><td align="center" style="padding:0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${CREAM}" style="width:100%;max-width:600px;background:${CREAM};">
<tr><td style="padding:0;background:${PURPLE};">
<a href="${escapeHtml(siteUrl)}"><img src="${img("insider-letter-header.png")}" width="600" alt="Onwei, own your effort." style="display:block;width:100%;max-width:600px;height:auto;border:0;color:${NAVY};font-family:${HEADING_FONT};font-size:20px;font-weight:800;"></a>
</td></tr>
<tr><td align="center" style="padding:36px 24px 0;text-align:center;">
<h1 style="margin:0 0 20px;font-family:${HEADING_FONT};font-size:34px;line-height:1.1;font-weight:800;text-transform:uppercase;color:${NAVY};">A little thank<br>you from us.</h1>
${p(`${escapeHtml(greeting)} thank you for being on the Wei with us from the start.`, "margin-bottom:26px;")}
<p style="margin:0 0 12px;font-family:${MONO_FONT};font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${NAVY};">Your Insider code</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 18px;">
<tr><td style="background:${NAVY};border-radius:60px;padding:0 7px 7px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:${PURPLE};border:3px solid ${NAVY};border-radius:60px;padding:16px 44px;font-family:${MONO_FONT};font-size:32px;font-weight:700;letter-spacing:4px;color:${NAVY};white-space:nowrap;">${escapeHtml(code)}</td>
</tr></table>
</td></tr>
</table>
${p("Redeemable on the website for special<br>offers, first dibs and some surprises :P", "margin-bottom:28px;")}
${p("We'd also like to send you a little something.", "margin-bottom:14px;")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 18px;">
<tr>
<td style="padding:0 10px 0 0;vertical-align:middle;"><a href="${address}"><img src="${img("insider-gift.png")}" width="28" height="28" alt="" style="display:block;border:0;"></a></td>
<td style="vertical-align:middle;"><a href="${address}" style="font-family:${BODY_FONT};font-size:18px;font-weight:700;color:${NAVY};text-decoration:none;border-bottom:4px solid ${PURPLE};padding-bottom:1px;">Share your delivery address here</a></td>
</tr>
</table>
<p style="margin:0 0 26px;font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:${MUTED};">Already sent it on WhatsApp? You're all set.</p>
<img src="${img("insider-signature.png")}" width="220" alt="Sakshi &amp; Sabhya" style="display:inline-block;width:220px;max-width:70%;height:auto;border:0;color:${NAVY};font-family:${HEADING_FONT};font-size:22px;">
<p style="margin:6px 0 28px;font-family:${MONO_FONT};font-size:16px;font-weight:700;color:${NAVY};">We're on the Wei.</p>
<p style="margin:0;font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:${MUTED};">P.S. If this landed in Promotions, please drag it to Primary.</p>
</td></tr>
<tr><td align="right" style="padding:12px 28px 0;">
<img src="${img("insider-stamp.png")}" width="96" height="96" alt="" style="display:block;border:0;">
</td></tr>
<tr><td align="center" style="padding:20px 28px 24px;">
<p style="margin:0;font-family:${BODY_FONT};font-size:11px;line-height:1.5;color:${MUTED};">You got this email because you joined Onwei Insiders at onwei.in. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${MUTED};">Unsubscribe</a></p>
</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:${NAVY};">&nbsp;</td></tr>
<tr><td style="height:22px;line-height:22px;font-size:0;background:${PURPLE};">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "A LITTLE THANK YOU FROM US.",
    "",
    `${greeting} thank you for being on the Wei with us from the start.`,
    "",
    "Your Insider code:",
    code,
    "",
    "Redeemable on the website for special offers, first dibs and some surprises :P",
    "",
    "We'd also like to send you a little something. Share your delivery address here:",
    input.addressUrl,
    "",
    "Already sent it on WhatsApp? You're all set.",
    "",
    "Sakshi & Sabhya",
    "We're on the Wei.",
    "",
    "P.S. If this landed in Promotions, please drag it to Primary.",
    "",
    `You got this email because you joined Onwei Insiders at onwei.in. Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  return {
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${input.oneClickUnsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
