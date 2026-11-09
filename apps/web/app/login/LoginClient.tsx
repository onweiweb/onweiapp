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
      intro="We'll send a one-time code. Waitlist members, use the same email or phone."
      onDone={async ({ needsName }) => {
        await Promise.all([refresh(), refreshSession()]);
        if (needsName) setAskName(true);
        else go();
      }}
    />
  );
}
