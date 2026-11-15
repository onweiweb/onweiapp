import {
  claimInsiderEmailFor,
  insiderEmailLinks,
  markInsiderEmailSent,
  releaseInsiderEmailClaim,
} from "@onwei/core";
import {
  createInsiderEmailSender,
  renderInsiderCodeEmail,
  type EmailSender,
} from "@onwei/emails";

const DEFAULT_SITE_URL = "https://www.onwei.in";

/**
 * Sends a new Insider their code email (from Sakshi) right after they join.
 * Skipped, not failed, when the Insider sender or link secret isn't set:
 * the member then stays on the admin Insiders "Email" list for a manual
 * send. A failed send releases the claim for the same reason. Never throws.
 */
export async function sendInsiderCodeEmailNow(
  entryId: string,
  sender: EmailSender | null = createInsiderEmailSender(),
): Promise<"sent" | "skipped" | "failed"> {
  const secret = process.env.INSIDER_LINK_SECRET;
  if (!sender || !secret) {
    console.warn(
      "[insiders] code email not sent at signup: INSIDER_EMAIL_FROM, RESEND_API_KEY or INSIDER_LINK_SECRET is missing",
    );
    return "skipped";
  }
  let claimedId: string | null = null;
  try {
    const recipient = await claimInsiderEmailFor(entryId);
    if (!recipient) return "skipped";
    claimedId = recipient.id;
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL
    ).replace(/\/$/, "");
    await sender.send(
      recipient.email,
      renderInsiderCodeEmail({
        fullName: recipient.fullName,
        code: recipient.insiderCode,
        siteUrl,
        ...insiderEmailLinks(recipient.id, siteUrl, secret),
      }),
    );
    await markInsiderEmailSent(recipient.id);
    return "sent";
  } catch (error) {
    console.error("[insiders] code email at signup failed", error);
    if (claimedId) {
      await releaseInsiderEmailClaim(claimedId).catch(() => undefined);
    }
    return "failed";
  }
}
