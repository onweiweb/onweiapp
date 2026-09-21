export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Plain-function email template — no templating library chosen yet (flagged
 * as an open choice, not a default; see docs/PHASE_1_SCAFFOLD_PROGRESS.md).
 * Easy to swap for react-email/mjml/etc. later without touching callers.
 */
export function renderOtpEmail(code: string): RenderedEmail {
  return {
    subject: `Your Onwei verification code: ${code}`,
    text: `Your Onwei verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your Onwei verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  };
}
