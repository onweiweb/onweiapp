import { DEFAULT_SITE_URL, escapeHtml, firstNameOf } from "./layout";
import type { RenderedEmail } from "./otpEmail";

// Pre-order emails: reserve paid, balance due (and reminders), and the
// reserve kept as credit. Transactional, so no unsubscribe link.

const NAVY = "#161845";
const BEIGE = "#eae8d6";
const GREEN = "#eded86";
const HEADING_FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY_FONT = "'IBM Plex Mono','Courier New',Courier,monospace";

export function rupeesText(paise: number): string {
  const whole = paise % 100 === 0;
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

interface Shell {
  subject: string;
  kicker: string;
  heading: string;
  paragraphs: string[];
  rows?: { label: string; value: string; bold?: boolean }[];
  button?: { label: string; url: string };
  siteUrl: string;
}

function shell(input: Shell): string {
  const cell = `font-family:${BODY_FONT};font-size:14px;color:${NAVY};padding:6px 0;`;
  const rows = input.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid ${NAVY};border-radius:18px;margin:0 0 20px;"><tr><td style="padding:16px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${input.rows
        .map(
          (r) =>
            `<tr><td style="${cell}${r.bold ? "font-weight:700;" : ""}">${escapeHtml(r.label)}</td><td align="right" style="${cell}${r.bold ? "font-weight:700;" : ""}">${escapeHtml(r.value)}</td></tr>`,
        )
        .join("")}</table></td></tr></table>`
    : "";
  const button = input.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;"><tr><td style="background:${NAVY};border-radius:30px;"><a href="${escapeHtml(input.button.url)}" style="display:inline-block;padding:14px 28px;font-family:${HEADING_FONT};font-size:15px;font-weight:700;text-transform:uppercase;color:${BEIGE};text-decoration:none;">${escapeHtml(input.button.label)}</a></td></tr></table>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.subject)}</title></head>
<body style="margin:0;padding:0;background:${BEIGE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BEIGE};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${GREEN};border-radius:28px;">
<tr><td style="padding:32px 28px 8px;"><img src="${input.siteUrl}/images/email/onwei-logo.png" width="110" alt="Onwei" style="display:block;border:0;height:auto;"></td></tr>
<tr><td style="padding:16px 28px 0;">
<p style="margin:0 0 8px;font-family:${BODY_FONT};font-size:13px;color:${NAVY};">${escapeHtml(input.kicker)}</p>
<h1 style="margin:0 0 14px;font-family:${HEADING_FONT};font-size:30px;line-height:1.05;font-weight:800;text-transform:uppercase;color:${NAVY};">${input.heading}</h1>
${input.paragraphs.map((p) => `<p style="margin:0 0 16px;font-family:${BODY_FONT};font-size:14px;line-height:1.6;color:${NAVY};">${escapeHtml(p)}</p>`).join("")}
${rows}${button}
<p style="margin:0 0 28px;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${NAVY};">Questions? Just reply to this email. Prices include GST.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function textOf(input: Shell): string {
  return [
    input.heading.replace(/<br>/g, " "),
    input.kicker,
    "",
    ...input.paragraphs,
    "",
    ...(input.rows ?? []).map((r) => `${r.label}: ${r.value}`),
    ...(input.button ? ["", `${input.button.label}: ${input.button.url}`] : []),
    "",
    "Questions? Just reply to this email.",
  ].join("\n");
}

export interface PreorderEmailInput {
  name: string | null;
  orderNumber: string;
  product: string;
  quantity: number;
  tierLabel: string | null;
  gifts: string[];
  /** Paise. */
  total: number;
  paidNow: number;
  balance: number;
  expectedShipDate: string | null;
  siteUrl?: string;
}

export function renderPreorderReservedEmail(
  input: PreorderEmailInput,
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.name);
  const subject = `Your Onwei pre-order #${input.orderNumber} is reserved`;
  const parts: Shell = {
    subject,
    siteUrl,
    kicker: `Pre-order #${input.orderNumber}`,
    heading: `${first ? `Thanks, ${escapeHtml(first)}!` : "Thank you!"}<br>It's reserved.`,
    paragraphs: [
      `Your price${input.tierLabel ? ` (${input.tierLabel})` : ""} is locked in. We'll message you as soon as it's ready to ship, and you pay the balance then.`,
      ...(input.expectedShipDate
        ? [`Expected to ship around ${input.expectedShipDate}.`]
        : []),
    ],
    rows: [
      {
        label: `${input.product} × ${input.quantity}`,
        value: rupeesText(input.total),
      },
      ...input.gifts.map((g) => ({ label: g, value: "Free" })),
      { label: "Paid now", value: rupeesText(input.paidNow), bold: true },
      { label: "Balance when it's ready", value: rupeesText(input.balance) },
    ],
    button: {
      label: "See your pre-order",
      url: `${siteUrl}/account/orders/${input.orderNumber}`,
    },
  };
  return { subject, html: shell(parts), text: textOf(parts) };
}

export function renderPreorderBalanceEmail(
  input: PreorderEmailInput & { reminder: number },
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.name);
  const subject =
    input.reminder > 0
      ? `Reminder: pay the balance for pre-order #${input.orderNumber}`
      : `Your Onwei pre-order #${input.orderNumber} is ready`;
  const parts: Shell = {
    subject,
    siteUrl,
    kicker: `Pre-order #${input.orderNumber}`,
    heading: `${first ? `${escapeHtml(first)}, ` : ""}it's ready<br>to ship.`,
    paragraphs: [
      `Pay the balance of ${rupeesText(input.balance)} and we'll send it out straight away.`,
      "If it isn't paid within 14 days of this first message, the amount you already paid stays with you as credit for a year.",
    ],
    rows: [
      {
        label: `${input.product} × ${input.quantity}`,
        value: rupeesText(input.total),
      },
      { label: "Already paid", value: `−${rupeesText(input.paidNow)}` },
      { label: "Balance to pay", value: rupeesText(input.balance), bold: true },
    ],
    button: {
      label: "Pay the balance",
      url: `${siteUrl}/account/orders/${input.orderNumber}`,
    },
  };
  return { subject, html: shell(parts), text: textOf(parts) };
}

export interface PreorderCreditEmailInput {
  name: string | null;
  orderNumber: string;
  amount: number;
  creditCode: string;
  validUntil: string;
  siteUrl?: string;
}

export function renderPreorderCreditEmail(
  input: PreorderCreditEmailInput,
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.name);
  const subject = `Your ${rupeesText(input.amount)} Onwei credit`;
  const parts: Shell = {
    subject,
    siteUrl,
    kicker: `Pre-order #${input.orderNumber} cancelled`,
    heading: `${first ? `${escapeHtml(first)}, ` : ""}your money<br>is safe.`,
    paragraphs: [
      `The ${rupeesText(input.amount)} you paid is now credit on your account. Use code ${input.creditCode} at checkout, on any order or pre-order, until ${input.validUntil}.`,
      "If an order costs less than your credit, the rest stays for next time. It only works when you're signed in with this email or phone.",
    ],
    rows: [
      { label: "Credit code", value: input.creditCode, bold: true },
      { label: "Amount", value: rupeesText(input.amount) },
      { label: "Valid until", value: input.validUntil },
    ],
    button: { label: "Shop Onwei", url: siteUrl },
  };
  return { subject, html: shell(parts), text: textOf(parts) };
}
