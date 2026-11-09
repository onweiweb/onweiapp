"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/_components/commerce/CartProvider";
import { NameStep } from "@/_components/commerce/NameStep";
import { SignInPanel } from "@/_components/commerce/SignInPanel";

export function LoginClient({ next }: { next: string }) {
  const router = useRouter();
  const { refresh, refreshSession } = useCart();
  const [askName, setAskName] = useState(false);
  const go = () => {
    router.push(next);
    router.refresh();
  };
  if (askName) return <NameStep onDone={go} />;
  return (
    <SignInPanel
      heading="Sign in"
      intro="Enter your email or mobile number and we'll send you a code. No password needed. On the waitlist? Use the same email or phone and your Insider discount comes with you."
      onDone={async ({ needsName }) => {
        await Promise.all([refresh(), refreshSession()]);
        if (needsName) setAskName(true);
        else go();
      }}
    />
  );
}
