import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "../../lib/session";
import { CheckoutShell } from "../checkout/_components/CheckoutShell";
import { Card } from "../checkout/_components/parts";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Only same-site paths, so a link can't bounce someone to another site. */
function safeNext(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/account";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await getSession()) redirect(target);
  return (
    <CheckoutShell wide={false}>
      <Card>
        <LoginClient next={target} />
      </Card>
    </CheckoutShell>
  );
}
