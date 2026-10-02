import type { RenderedEmail } from "./otpEmail";

// Brand tokens, same values as apps/web/app/globals.css.
const BLUE = "#161845";
const BEIGE = "#eae8d6";
const GREEN = "#eded86";
const PURPLE = "#8e94ca";

const HEADING_FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
// The storefront body font is a monospace grotesk, mono keeps the feel in
// clients that block web fonts.
const BODY_FONT = "'IBM Plex Mono','Courier New',Courier,monospace";

export const DEFAULT_SITE_URL = "https://www.onwei.in";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "Asha Rao" becomes "Asha". Empty or missing becomes null. */
export function firstNameOf(
  fullName: string | null | undefined,
): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

export interface WelcomeLayoutInput {
  siteUrl: string;
  preheader: string;
  headline: string;
  subline: string;
  /** Plain paragraphs, already HTML-escaped by the caller. */
  paragraphsHtml: string[];
  cta?: { label: string; url: string };
  /**
   * Waitlist popup look (envelope with the card): replaces the purple banner,
   * hero photo and paragraphs. `headline` and `paragraphsHtml` render in the
   * purple box under the envelope image.
   */
  popup?: { greetingHtml: string; instagramUrl: string | null };
  footerNote: string;
}

export function renderWelcomeLayout(input: WelcomeLayoutInput): string {
  const { siteUrl } = input;
  const img = (name: string) => `${siteUrl}/images/email/${name}`;
  const paragraphs = input.paragraphsHtml
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:${BODY_FONT};font-size:15px;line-height:1.55;color:${BLUE};">${p}</p>`,
    )
    .join("");
  const cta = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;"><tr><td style="background:${BLUE};border-radius:30px;"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;padding:14px 28px;font-family:${HEADING_FONT};font-size:16px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${GREEN};text-decoration:none;">${escapeHtml(input.cta.label)}</a></td></tr></table>`
    : "";

  const popup = input.popup
    ? `<tr><td style="padding:0 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PURPLE};border-radius:28px;">
<tr><td align="center" style="padding:32px 24px 8px;">
<img src="${img("envelope.png")}" width="352" alt="Onwei Insider card: let's get moving" style="display:block;width:100%;max-width:352px;height:auto;border:0;">
</td></tr>
<tr><td align="center" style="padding:16px 28px 0;">
<p style="margin:0 0 12px;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${BLUE};">${input.popup.greetingHtml}</p>
<h1 style="margin:0 0 12px;font-family:${HEADING_FONT};font-size:28px;line-height:1.1;font-weight:800;text-transform:uppercase;color:${BLUE};">${escapeHtml(input.headline)}</h1>
${input.paragraphsHtml.map((p, i) => `<p style="margin:0 0 ${i === input.paragraphsHtml.length - 1 ? 0 : 12}px;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${BLUE};${i === input.paragraphsHtml.length - 1 ? "font-weight:700;" : ""}">${p}</p>`).join("")}
</td></tr>
<tr><td align="center" style="padding:24px 24px 36px;">
${
  input.popup.instagramUrl
    ? `<a href="${escapeHtml(input.popup.instagramUrl)}" style="text-decoration:none;"><img src="${img("instagram.png")}" width="24" height="24" alt="" style="vertical-align:middle;border:0;"> <span style="font-family:${HEADING_FONT};font-size:22px;font-weight:800;text-transform:uppercase;color:${BEIGE};vertical-align:middle;padding-left:8px;">Let's be friends</span></a>`
    : `<span style="font-family:${HEADING_FONT};font-size:22px;font-weight:800;text-transform:uppercase;color:${BEIGE};">Let's be friends</span>`
}
</td></tr>
</table>
</td></tr>
<tr><td style="height:28px;line-height:28px;font-size:0;">&nbsp;</td></tr>`
    : "";
  const body = input.popup
    ? popup
    : `<tr><td style="background:${PURPLE};border-radius:28px;padding:36px 28px;text-align:center;">
<img src="${img("onwei-mark.png")}" width="66" alt="" style="display:inline-block;border:0;height:auto;">
<h1 style="margin:16px 0 10px;font-family:${HEADING_FONT};font-size:30px;line-height:1.05;font-weight:800;text-transform:uppercase;color:${GREEN};">${escapeHtml(input.headline)}</h1>
<p style="margin:0;font-family:${BODY_FONT};font-size:14px;line-height:1.4;color:${BEIGE};">${escapeHtml(input.subline)}</p>
</td></tr>
<tr><td style="padding:16px 0 0;">
<img src="${img("hero.jpg")}" width="600" alt="" style="display:block;width:100%;height:auto;border:0;border-radius:28px;">
</td></tr>
<tr><td style="padding:28px 8px 8px;">
${paragraphs}
${cta}
</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Onwei</title>
</head>
<body style="margin:0;padding:0;background:${BEIGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BEIGE};">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BEIGE};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:0 4px 20px;">
<a href="${escapeHtml(siteUrl)}"><img src="${img("onwei-logo.png")}" width="140" alt="Onwei" style="display:block;border:0;height:auto;"></a>
</td></tr>
${body}
<tr><td style="padding:24px 8px 0;border-top:1px solid ${PURPLE};">
<p style="margin:16px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${BLUE};">${escapeHtml(input.footerNote)}</p>
<p style="margin:8px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${BLUE};">Onwei, seriously good gear for everyday movers. <a href="${escapeHtml(siteUrl)}" style="color:${BLUE};">onwei.in</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export type { RenderedEmail };
