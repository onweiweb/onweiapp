import { DEFAULT_SITE_URL, escapeHtml, firstNameOf } from "./layout";
import type { RenderedEmail } from "./otpEmail";

/**
 * "A little thank you from us": the Insider code email, built from the
 * client's emailer PDFs ("Insider emailer desktop (640px)" and "mobile
 * (375px)"). One responsive layout: a 600px card that shrinks on phones.
 * Copy is the client's, word for word. Do not edit it here without them.
 *
 * Images live in apps/web/public/images/email/: insider-card.png (the
 * envelope with the Insider card) and onwei-logo.png.
 */

const NAVY = "#161845";
const BEIGE = "#eae8d6";
// The emailer's card green, a touch greener than the site's yellow-green.
const CARD_GREEN = "#d3e291";
const CODE_BG = "#eae8d6";

const HEADING_FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY_FONT = "'IBM Plex Mono','Courier New',Courier,monospace";
const SCRIPT_FONT = "'Segoe Print','Bradley Hand','Brush Script MT',cursive";

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

  const subject = "A little thank you from us";
  const preheader = "Your Onwei Insider code is inside.";

  const p = (html: string, extra = "") =>
    `<p style="margin:0 0 18px;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${NAVY};${extra}">${html}</p>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BEIGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BEIGE};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BEIGE};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${CARD_GREEN};border-radius:32px;">
<tr><td align="center" style="padding:40px 24px 8px;">
<img src="${img("insider-card.png")}" width="460" alt="Your Onwei Insider card: let's get moving" style="display:block;width:100%;max-width:460px;height:auto;border:0;">
</td></tr>
<tr><td align="center" style="padding:28px 28px 0;text-align:center;">
${p(escapeHtml(greeting))}
<h1 style="margin:0 0 20px;font-family:${HEADING_FONT};font-size:34px;line-height:1.05;font-weight:800;text-transform:uppercase;color:${NAVY};">A little thank you from us.</h1>
${p("Welcome to Onwei Insiders. You were one of the first to believe in us, and we want to send you something to say thank you.")}
${p("We're sending you a special Insider Access card with your own unique code:", "font-weight:700;")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 22px;">
<tr><td style="background:${CODE_BG};border:2px dashed ${NAVY};border-radius:14px;padding:14px 32px;font-family:${BODY_FONT};font-size:28px;font-weight:700;letter-spacing:6px;color:${NAVY};">${escapeHtml(code)}</td></tr>
</table>
${p("The coupon is only for our first Insiders, redeemable on the website for offers made only for you. Details will come by message.")}
${p("Share your address and we'll post it to you.", "margin-bottom:12px;")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 10px;">
<tr><td style="background:${NAVY};border-radius:40px;">
<a href="${escapeHtml(input.addressUrl)}" style="display:inline-block;padding:16px 36px;font-family:${HEADING_FONT};font-size:18px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${BEIGE};text-decoration:none;">&#9906;&nbsp; Share your address</a>
</td></tr>
</table>
<p style="margin:0 0 30px;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${NAVY};">Takes about 20 seconds.</p>
${p("When you joined, we promised you surprises from the two of us. Consider this the first of many :)")}
<p style="margin:6px 0 22px;font-family:${SCRIPT_FONT};font-size:28px;line-height:1.2;color:${NAVY};">Sakshi &amp; Sabhya</p>
<p style="margin:0 0 18px;font-family:${BODY_FONT};font-size:15px;font-weight:700;color:${NAVY};">We're on the Wei.</p>
<a href="${escapeHtml(siteUrl)}"><img src="${img("onwei-logo.png")}" width="110" alt="Onwei" style="display:inline-block;border:0;height:auto;"></a>
</td></tr>
<tr><td align="center" style="padding:28px 28px 32px;">
<p style="margin:0;font-family:${BODY_FONT};font-size:11px;line-height:1.5;color:${NAVY};">You got this email because you joined the Onwei Insiders list at onwei.in. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${NAVY};">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    greeting,
    "",
    "A LITTLE THANK YOU FROM US.",
    "",
    "Welcome to Onwei Insiders. You were one of the first to believe in us, and we want to send you something to say thank you.",
    "",
    "We're sending you a special Insider Access card with your own unique code:",
    "",
    code,
    "",
    "The coupon is only for our first Insiders, redeemable on the website for offers made only for you. Details will come by message.",
    "",
    "Share your address and we'll post it to you (takes about 20 seconds):",
    input.addressUrl,
    "",
    "When you joined, we promised you surprises from the two of us. Consider this the first of many :)",
    "",
    "Sakshi & Sabhya",
    "We're on the Wei.",
    "",
    `You got this email because you joined the Onwei Insiders list at onwei.in. Unsubscribe: ${input.unsubscribeUrl}`,
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
