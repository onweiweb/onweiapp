import type { Metadata } from "next";
import { verifyInsiderLinkToken } from "@onwei/core";
import { InsiderShell } from "../_components/InsiderShell";
import { UnsubscribeButton } from "../_components/UnsubscribeButton";
import { INSIDER_ERRORS } from "../../../lib/messages/insider";

export const metadata: Metadata = {
  title: "Unsubscribe | Onwei Insiders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// The footer link in the Insider email. Opening the page changes nothing
// (link scanners open every URL); the member confirms with the button.
export default async function InsiderUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: token = "" } = await searchParams;
  const link = verifyInsiderLinkToken(
    "unsubscribe",
    token,
    process.env.INSIDER_LINK_SECRET,
  );

  return (
    <InsiderShell>
      <h1 className="font-display text-[length:max(2.25rem,28px)] font-bold uppercase leading-[0.95]">
        {link.ok ? "Stop Insider emails?" : "We couldn't open this link."}
      </h1>
      {link.ok ? (
        <>
          <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.5]">
            We&apos;ll stop sending you Insider news and surprises by email. You
            can still shop with us, and your Insider code keeps working.
          </p>
          <UnsubscribeButton token={token} />
        </>
      ) : (
        <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.5]">
          {INSIDER_ERRORS.LINK_INVALID}
        </p>
      )}
    </InsiderShell>
  );
}
