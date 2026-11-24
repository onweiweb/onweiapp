import { DEFAULT_SITE_URL, escapeHtml, firstNameOf } from "./layout";
import type { RenderedEmail } from "./otpEmail";

// Order confirmation (customer) and new-order alert (staff). Transactional,
// so no unsubscribe link; a real reply-to goes to the team.

const NAVY = "#161845";
const BEIGE = "#eae8d6";
const GREEN = "#eded86";
const HEADING_FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY_FONT = "'IBM Plex Mono','Courier New',Courier,monospace";

export interface OrderEmailInput {
  name: string | null;
  orderNumber: string;
  paymentMethod: "RAZORPAY" | "COD";
  items: { name: string; variant: string; quantity: number; total: number }[];
  subtotal: number;
  discounts: { label: string; amount: number }[];
  shippingFee: number;
  codFee: number;
  total: number;
  address: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  siteUrl?: string;
}

function rupees(paise: number): string {
  const hide = paise % 100 === 0;
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: hide ? 0 : 2, maximumFractionDigits: hide ? 0 : 2 })}`;
}

function rows(input: OrderEmailInput): string {
  const cell = `font-family:${BODY_FONT};font-size:14px;color:${NAVY};padding:6px 0;`;
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="${cell}${bold ? "font-weight:700;" : ""}">${escapeHtml(label)}</td><td align="right" style="${cell}${bold ? "font-weight:700;" : ""}">${escapeHtml(value)}</td></tr>`;
  return [
    ...input.items.map((item) =>
      line(
        `${item.name}${item.variant ? ` (${item.variant})` : ""} × ${item.quantity}`,
        rupees(item.total),
      ),
    ),
    line("Subtotal", rupees(input.subtotal)),
    ...input.discounts
      .filter((d) => d.amount > 0)
      .map((d) => line(d.label, `−${rupees(d.amount)}`)),
    line(
      "Shipping",
      input.shippingFee === 0 ? "Free" : rupees(input.shippingFee),
    ),
    ...(input.codFee > 0
      ? [line("Cash on delivery fee", rupees(input.codFee))]
      : []),
    line(
      input.paymentMethod === "COD" ? "To pay on delivery" : "Total paid",
      rupees(input.total),
      true,
    ),
  ].join("");
}

export function renderOrderConfirmationEmail(
  input: OrderEmailInput,
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.name ?? input.address?.fullName);
  const subject = `Your Onwei order #${input.orderNumber} is confirmed`;
  const trackUrl = `${siteUrl}/account/orders/${input.orderNumber}`;
  const a = input.address;
  const addressHtml = a
    ? `${escapeHtml(a.fullName)}<br>${escapeHtml(a.line1)}${a.line2 ? `, ${escapeHtml(a.line2)}` : ""}<br>${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.postalCode)}`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${BEIGE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BEIGE};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${GREEN};border-radius:28px;">
<tr><td style="padding:32px 28px 8px;">
<img src="${siteUrl}/images/email/onwei-logo.png" width="110" alt="Onwei" style="display:block;border:0;height:auto;">
</td></tr>
<tr><td style="padding:16px 28px 0;">
<p style="margin:0 0 8px;font-family:${BODY_FONT};font-size:13px;color:${NAVY};">Order #${escapeHtml(input.orderNumber)}</p>
<h1 style="margin:0 0 14px;font-family:${HEADING_FONT};font-size:30px;line-height:1.05;font-weight:800;text-transform:uppercase;color:${NAVY};">${first ? `Thanks, ${escapeHtml(first)}!` : "Thank you!"}<br>You're all set.</h1>
<p style="margin:0 0 20px;font-family:${BODY_FONT};font-size:14px;line-height:1.6;color:${NAVY};">We're packing your order now and you'll get tracking details as soon as it ships.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid ${NAVY};border-radius:18px;"><tr><td style="padding:16px 18px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows(input)}</table>
</td></tr></table>
${addressHtml ? `<p style="margin:20px 0 4px;font-family:${BODY_FONT};font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${NAVY};">Shipping to</p><p style="margin:0;font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:${NAVY};">${addressHtml}</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td style="background:${NAVY};border-radius:30px;"><a href="${escapeHtml(trackUrl)}" style="display:inline-block;padding:14px 28px;font-family:${HEADING_FONT};font-size:15px;font-weight:700;text-transform:uppercase;color:${BEIGE};text-decoration:none;">Track your order</a></td></tr></table>
<p style="margin:0 0 28px;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${NAVY};">Questions? Just reply to this email. Prices include GST.</p>
</td></tr></table>
</td></tr></table></body></html>`;
  const text = [
    first ? `Thanks, ${first}! You're all set.` : "Thank you! You're all set.",
    `Order #${input.orderNumber}`,
    "",
    ...input.items.map(
      (i) =>
        `${i.name}${i.variant ? ` (${i.variant})` : ""} x ${i.quantity}: ${rupees(i.total)}`,
    ),
    `Subtotal: ${rupees(input.subtotal)}`,
    ...input.discounts
      .filter((d) => d.amount > 0)
      .map((d) => `${d.label}: -${rupees(d.amount)}`),
    `Shipping: ${input.shippingFee === 0 ? "Free" : rupees(input.shippingFee)}`,
    ...(input.codFee > 0
      ? [`Cash on delivery fee: ${rupees(input.codFee)}`]
      : []),
    `${input.paymentMethod === "COD" ? "To pay on delivery" : "Total paid"}: ${rupees(input.total)}`,
    "",
    `Track your order: ${trackUrl}`,
    "Questions? Just reply to this email.",
  ].join("\n");
  return { subject, html, text };
}

export function renderNewOrderAlertEmail(
  input: OrderEmailInput & { adminUrl: string },
): RenderedEmail {
  const subject = `New order #${input.orderNumber}: ${rupees(input.total)} (${input.paymentMethod === "COD" ? "cash on delivery" : "paid online"})`;
  const text = [
    subject,
    "",
    ...input.items.map(
      (i) => `${i.name}${i.variant ? ` (${i.variant})` : ""} x ${i.quantity}`,
    ),
    "",
    `Open in admin: ${input.adminUrl}`,
  ].join("\n");
  const html = `<pre style="font-family:${BODY_FONT};font-size:14px;color:${NAVY};white-space:pre-wrap;">${escapeHtml(text)}</pre>`;
  return { subject, html, text };
}

export interface OrderDeliveryEmailInput {
  name: string | null;
  orderNumber: string;
  paymentMethod: "RAZORPAY" | "COD";
  /** Paise still to pay on delivery (cash on delivery). */
  amountDue: number;
  courierName: string | null;
  trackingNumber: string | null;
  /** The courier's tracking page, when there is one. */
  trackingUrl: string | null;
  /** Days to start a return, for the delivered email. */
  returnWindowDays?: number;
  siteUrl?: string;
}

/** Same frame as the order confirmation: logo, heading, body, button. */
function deliveryEmailHtml(input: {
  subject: string;
  siteUrl: string;
  orderNumber: string;
  heading: string;
  body: string;
  button: { label: string; url: string };
  footnote: string;
}): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.subject)}</title></head>
<body style="margin:0;padding:0;background:${BEIGE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BEIGE};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${GREEN};border-radius:28px;">
<tr><td style="padding:32px 28px 8px;">
<img src="${input.siteUrl}/images/email/onwei-logo.png" width="110" alt="Onwei" style="display:block;border:0;height:auto;">
</td></tr>
<tr><td style="padding:16px 28px 0;">
<p style="margin:0 0 8px;font-family:${BODY_FONT};font-size:13px;color:${NAVY};">Order #${escapeHtml(input.orderNumber)}</p>
<h1 style="margin:0 0 14px;font-family:${HEADING_FONT};font-size:30px;line-height:1.05;font-weight:800;text-transform:uppercase;color:${NAVY};">${input.heading}</h1>
${input.body}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td style="background:${NAVY};border-radius:30px;"><a href="${escapeHtml(input.button.url)}" style="display:inline-block;padding:14px 28px;font-family:${HEADING_FONT};font-size:15px;font-weight:700;text-transform:uppercase;color:${BEIGE};text-decoration:none;">${escapeHtml(input.button.label)}</a></td></tr></table>
<p style="margin:0 0 28px;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${NAVY};">${input.footnote}</p>
</td></tr></table>
</td></tr></table></body></html>`;
}

const para = (text: string) =>
  `<p style="margin:0 0 14px;font-family:${BODY_FONT};font-size:14px;line-height:1.6;color:${NAVY};">${text}</p>`;

export function renderOrderShippedEmail(
  input: OrderDeliveryEmailInput,
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.name);
  const subject = `Your Onwei order #${input.orderNumber} is on its way`;
  const orderUrl = `${siteUrl}/account/orders/${input.orderNumber}`;
  const trackUrl = input.trackingUrl ?? orderUrl;
  const courier =
    input.courierName && input.trackingNumber
      ? `It's with ${escapeHtml(input.courierName)}, tracking number <strong>${escapeHtml(input.trackingNumber)}</strong>.`
      : "It's with the courier now.";
  const cod =
    input.paymentMethod === "COD" && input.amountDue > 0
      ? `Please keep ${rupees(input.amountDue)} ready (cash or UPI) for the delivery.`
      : "";
  const html = deliveryEmailHtml({
    subject,
    siteUrl,
    orderNumber: input.orderNumber,
    heading: `${first ? `${escapeHtml(first)}, your` : "Your"} order<br>is on its way.`,
    body:
      para(`${courier} Most orders arrive in 3 to 5 working days.`) +
      (cod ? para(cod) : ""),
    button: { label: "Track your order", url: trackUrl },
    footnote: "Questions? Just reply to this email.",
  });
  const text = [
    `${first ? `${first}, your` : "Your"} Onwei order #${input.orderNumber} is on its way.`,
    input.courierName && input.trackingNumber
      ? `Courier: ${input.courierName}, tracking number ${input.trackingNumber}.`
      : "It's with the courier now.",
    "Most orders arrive in 3 to 5 working days.",
    ...(cod ? [cod] : []),
    "",
    `Track your order: ${trackUrl}`,
    "Questions? Just reply to this email.",
  ].join("\n");
  return { subject, html, text };
}

export function renderOrderDeliveredEmail(
  input: OrderDeliveryEmailInput,
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.name);
  const subject = `Your Onwei order #${input.orderNumber} has been delivered`;
  const orderUrl = `${siteUrl}/account/orders/${input.orderNumber}`;
  const days = input.returnWindowDays ?? 0;
  const returns =
    days > 0
      ? `Something not right? You can start a return from your order page within ${days} ${days === 1 ? "day" : "days"}.`
      : "";
  const html = deliveryEmailHtml({
    subject,
    siteUrl,
    orderNumber: input.orderNumber,
    heading: `${first ? `${escapeHtml(first)}, it's` : "It's"} here!`,
    body:
      para("Your order has been delivered. We hope you love it.") +
      (returns ? para(returns) : ""),
    button: { label: "View your order", url: orderUrl },
    footnote:
      "Didn't get it? Reply to this email straight away and we'll sort it out.",
  });
  const text = [
    `${first ? `${first}, your` : "Your"} Onwei order #${input.orderNumber} has been delivered.`,
    "We hope you love it.",
    ...(returns ? [returns] : []),
    "",
    `View your order: ${orderUrl}`,
    "Didn't get it? Reply to this email straight away and we'll sort it out.",
  ].join("\n");
  return { subject, html, text };
}
