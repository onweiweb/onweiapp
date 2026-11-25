import { DEFAULT_SITE_URL, escapeHtml, firstNameOf } from "./layout";
import type { RenderedEmail } from "./otpEmail";
import { shell, textOf, type Shell } from "./preorderEmails";

// Invite-only Insiders: the "we got your application" email, and the invite
// reward an Insider earns for letting people in. Same look as the pre-order
// emails.

export function renderInsiderApplicationEmail(input: {
  name: string | null;
  siteUrl?: string;
}): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.name);
  const subject = "We got your Onwei Insiders application";
  const parts: Shell = {
    subject,
    siteUrl,
    kicker: "Onwei Insiders",
    heading: `${first ? `${escapeHtml(first)}, g` : "G"}reat,<br>you're interested.`,
    paragraphs: [
      "We'll get back to you about your Insider status.",
      "Insiders get a personal discount, first access to drops and events. Watch your email and WhatsApp.",
    ],
    button: { label: "Visit Onwei", url: siteUrl },
  };
  return { subject, html: shell(parts), text: textOf(parts) };
}

export function renderInviteRewardEmail(input: {
  name: string | null;
  invites: number;
  /** "₹500 off", "10% off" or "A free Onwei Cap". */
  reward: string;
  code: string;
  validUntil: string;
  siteUrl?: string;
}): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.name);
  const subject = `You let ${input.invites} people into Onwei Insiders`;
  const parts: Shell = {
    subject,
    siteUrl,
    kicker: "Onwei Insiders",
    heading: `${first ? `${escapeHtml(first)}, ` : ""}thank you<br>for the invites.`,
    paragraphs: [
      `${input.invites} people joined Insiders with your number. Here's your reward: ${input.reward}.`,
      `Use code ${input.code} at checkout until ${input.validUntil}. It only works when you're signed in with this email or phone.`,
    ],
    rows: [
      { label: "Your code", value: input.code, bold: true },
      { label: "Reward", value: input.reward },
      { label: "Valid until", value: input.validUntil },
    ],
    button: { label: "Shop Onwei", url: siteUrl },
  };
  return { subject, html: shell(parts), text: textOf(parts) };
}
