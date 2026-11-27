import sanitizeHtml from "sanitize-html";
import {
  BEIGE,
  BLUE,
  BODY_FONT,
  DEFAULT_SITE_URL,
  GREEN,
  HEADING_FONT,
  escapeHtml,
} from "./layout";
import type { RenderedEmail } from "./otpEmail";

/**
 * What a newsletter body may contain: simple formatting, links and images
 * (https only). Everything else, scripts, styles, event handlers, iframes,
 * is removed. Used when staff save a newsletter and again when it is sent.
 */
export function sanitizeNewsletterHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "strong",
      "b",
      "em",
      "i",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "br",
    ],
    allowedAttributes: { a: ["href"], img: ["src", "alt"] },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    // An image whose link was removed (not https) is dropped entirely.
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  }).trim();
}

const P = `margin:0 0 16px;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${BLUE};`;
const STYLES: Record<string, string> = {
  p: P,
  li: `margin:0 0 6px;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${BLUE};`,
  ul: "margin:0 0 16px;padding-left:20px;",
  ol: "margin:0 0 16px;padding-left:20px;",
  h2: `margin:24px 0 12px;font-family:${HEADING_FONT};font-size:24px;line-height:1.15;font-weight:800;text-transform:uppercase;color:${BLUE};`,
  h3: `margin:20px 0 10px;font-family:${HEADING_FONT};font-size:18px;line-height:1.2;font-weight:700;color:${BLUE};`,
  a: `color:${BLUE};text-decoration:underline;`,
  img: "display:block;width:100%;max-width:536px;height:auto;border:0;margin:0 0 16px;border-radius:16px;",
};

/** The sanitized body with the email's inline styles on each tag. */
function styled(bodyHtml: string): string {
  return sanitizeHtml(sanitizeNewsletterHtml(bodyHtml), {
    allowedTags: false,
    allowedAttributes: false,
    transformTags: Object.fromEntries(
      Object.entries(STYLES).map(([tag, style]) => [
        tag,
        (tagName: string, attribs: Record<string, string>) => ({
          tagName,
          attribs: { ...attribs, style },
        }),
      ]),
    ),
  });
}

function textOf(html: string): string {
  return sanitizeHtml(
    html
      .replace(/<\/(p|h2|h3|li)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)"),
    { allowedTags: [], allowedAttributes: {} },
  )
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface NewsletterEmailInput {
  subject: string;
  preheader: string;
  bodyHtml: string;
  /** The reader's own unsubscribe page and one-click link. */
  unsubscribeUrl: string;
  oneClickUnsubscribeUrl: string;
  siteUrl?: string;
}

export function renderNewsletterEmail(
  input: NewsletterEmailInput,
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.subject)}</title></head>
<body style="margin:0;padding:0;background:${BEIGE};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BEIGE};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${GREEN};border-radius:28px;">
<tr><td style="padding:32px 32px 8px;">
<a href="${escapeHtml(siteUrl)}"><img src="${siteUrl}/images/email/onwei-logo.png" width="110" alt="Onwei" style="display:block;border:0;height:auto;"></a>
</td></tr>
<tr><td style="padding:16px 32px 24px;">
${styled(input.bodyHtml)}
</td></tr></table>
<p style="margin:16px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${BLUE};">You get this because you signed up for Onwei news. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${BLUE};">Unsubscribe</a></p>
</td></tr></table></body></html>`;
  const text = [
    textOf(sanitizeNewsletterHtml(input.bodyHtml)),
    "",
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");
  return {
    subject: input.subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${input.oneClickUnsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
