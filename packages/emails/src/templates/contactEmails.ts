import { escapeHtml } from "./layout";
import type { RenderedEmail } from "./otpEmail";

const NAVY = "#161845";
const BODY_FONT = "'IBM Plex Mono','Courier New',Courier,monospace";

export interface ContactAlertInput {
  fullName: string;
  email: string;
  phone: string | null;
  message: string;
  /** Admin Messages page. */
  adminUrl: string;
}

/**
 * Staff alert for a Contact Us message. Sent with the customer's address as
 * reply-to, so hitting Reply answers them directly. Plain like the new-order
 * alert: it's an internal note, not a branded email.
 */
export function renderContactAlertEmail(
  input: ContactAlertInput,
): RenderedEmail {
  const subject = `New message from ${input.fullName}`;
  const text = [
    subject,
    "",
    `Email: ${input.email}`,
    `Phone: ${input.phone ?? "not given"}`,
    "",
    input.message,
    "",
    "Reply to this email to answer them. Mark it replied in admin:",
    input.adminUrl,
  ].join("\n");
  const html = `<pre style="font-family:${BODY_FONT};font-size:14px;color:${NAVY};white-space:pre-wrap;">${escapeHtml(text)}</pre>`;
  return { subject, html, text };
}
