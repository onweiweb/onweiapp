import type { Metadata } from "next";
import { verifyInsiderLinkToken } from "@onwei/core";
import { InsiderShell } from "../../insider/_components/InsiderShell";
import { UnsubscribeButton } from "../../insider/_components/UnsubscribeButton";
import { INSIDER_ERRORS } from "../../../lib/messages/insider";

export const metadata: Metadata = {
  title: "Unsubscribe | Onwei",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// The footer link in the newsletter. Same page as the Insider unsubscribe:
// opening it changes nothing (link scanners open every URL), the reader
// confirms with the button.
export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: token = "" } = await searchParams;
  const link = verifyInsiderLinkToken(
    "newsletter",
    token,
    process.env.INSIDER_LINK_SECRET,
  );

  return (
    <InsiderShell>
      <h1 className="font-display text-[length:max(2.25rem,28px)] font-bold uppercase leading-[0.95]">
        {link.ok ? "Stop Onwei newsletters?" : "We couldn't open this link."}
      </h1>
      {link.ok ? (
        <>
          <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.5]">
            We&apos;ll stop sending you our newsletter. Order emails, like
            delivery updates, still reach you.
          </p>
          <UnsubscribeButton
            token={token}
            endpoint="/api/newsletter/unsubscribe"
            doneMessage="Done. You won't get our newsletter anymore."
          />
        </>
      ) : (
        <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.5]">
          {INSIDER_ERRORS.LINK_INVALID}
        </p>
      )}
    </InsiderShell>
  );
}
