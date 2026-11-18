"use client";

import type { AddressView } from "@onwei/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductImage } from "@/_components/ProductImage";
import { AddressForm } from "@/_components/commerce/AddressForm";
import { useCart } from "@/_components/commerce/CartProvider";
import {
  failedPageUrl,
  goAfterRazorpay,
  openRazorpay,
} from "@/_components/commerce/razorpay";
import { SignInPanel } from "@/_components/commerce/SignInPanel";
import { track } from "../../../lib/analytics/track";
import {
  PREORDER_ERRORS,
  codeMessage,
  rupees,
} from "../../../lib/messages/commerce";
import type { PreorderQuoteView } from "../../api/preorder/_shared";
import { Card } from "../../checkout/_components/parts";

const PRIMARY =
  "flex h-12 w-full items-center justify-center rounded-full bg-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-beige disabled:opacity-60";
const ROW =
  "flex justify-between gap-3 font-grotesk text-[length:max(0.8125rem,11px)]";

interface Account {
  name: string | null;
  email: string | null;
  phone: string | null;
}

function dateText(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  });
}

function Summary({
  quote,
  quantity,
  setQuantity,
  codes,
  setCodes,
}: {
  quote: PreorderQuoteView;
  quantity: number;
  setQuantity: (n: number) => void;
  codes: string[];
  setCodes: (codes: string[]) => void;
}) {
  const [codeInput, setCodeInput] = useState("");
  const ship = dateText(quote.expectedShipDate);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[length:max(1.125rem,14px)] font-bold">
          Your pre-order
        </h2>
        <span className="rounded-full bg-onwei-green px-3 py-0.5 font-grotesk text-[length:max(0.6875rem,10px)] uppercase">
          {quote.tier.label} · {quote.tier.percent}% off
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-[0.75rem] bg-onwei-green">
          <ProductImage
            src={quote.product.imageUrl ?? undefined}
            alt={quote.product.name}
            fill
            sizes="56px"
            className="object-cover"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[length:max(0.875rem,12px)] font-semibold">
            {quote.product.name}
          </span>
          <span className="block font-grotesk text-[length:max(0.6875rem,10px)] text-onwei-blue/80">
            {quote.product.variantLabel}
          </span>
        </span>
        <span className="flex items-center gap-2 rounded-full border border-onwei-blue px-2 py-1 font-grotesk">
          <button
            type="button"
            aria-label="One less"
            disabled={quantity <= 1}
            onClick={() => setQuantity(quantity - 1)}
            className="size-6 disabled:opacity-40"
          >
            −
          </button>
          <span aria-live="polite">{quantity}</span>
          <button
            type="button"
            aria-label="One more"
            disabled={quantity >= 10}
            onClick={() => setQuantity(quantity + 1)}
            className="size-6 disabled:opacity-40"
          >
            +
          </button>
        </span>
      </div>
      {quote.gifts.length ? (
        <ul className="flex flex-col gap-1.5 rounded-[0.75rem] bg-onwei-green px-3 py-2">
          {quote.gifts.map((g) => (
            <li
              key={g.reason + g.itemLabel}
              className="flex justify-between gap-3 font-grotesk text-[length:max(0.75rem,11px)]"
            >
              <span>
                {g.reason}
                {g.quantity > 1 ? ` × ${g.quantity}` : ""}
              </span>
              <span>Free</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-onwei-blue pt-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const code = codeInput.trim().toUpperCase();
            if (code && !codes.includes(code)) setCodes([...codes, code]);
            setCodeInput("");
          }}
        >
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Discount or credit code"
            aria-label="Discount or credit code"
            className="h-10 min-w-0 flex-1 rounded-full border border-onwei-blue bg-onwei-white px-4 font-grotesk text-[length:max(0.8125rem,11px)] uppercase"
          />
          <button
            type="submit"
            className="rounded-full border border-onwei-blue px-4 font-grotesk text-[length:max(0.75rem,11px)] uppercase"
          >
            Apply
          </button>
        </form>
        {quote.codes.map((c) => (
          <p
            key={c.code}
            className="flex items-center justify-between gap-2 font-grotesk text-[length:max(0.75rem,11px)]"
          >
            <span>
              <strong>{c.code}</strong>{" "}
              {c.applied ? "applied" : codeMessage({ problem: c.problem })}
            </span>
            <button
              type="button"
              onClick={() => setCodes(codes.filter((x) => x !== c.code))}
              className="underline"
            >
              Remove
            </button>
          </p>
        ))}
      </div>

      <dl className="flex flex-col gap-1.5 border-t border-onwei-blue pt-3">
        <div className={ROW}>
          <dt>Price</dt>
          <dd>{rupees(quote.subtotal)}</dd>
        </div>
        {quote.discounts.map((d) => (
          <div key={d.label} className={ROW}>
            <dt>{d.label}</dt>
            <dd>−{rupees(d.amount)}</dd>
          </div>
        ))}
        <div className={ROW}>
          <dt>Shipping</dt>
          <dd>
            {quote.shippingFee === 0 ? "Free" : rupees(quote.shippingFee)}
          </dd>
        </div>
        <div className={ROW}>
          <dt>Taxes</dt>
          <dd>Included</dd>
        </div>
        <div className={`${ROW} border-t border-onwei-blue/30 pt-2 font-bold`}>
          <dt>Total</dt>
          <dd>{rupees(quote.total)}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-2 rounded-[1rem] border border-onwei-blue p-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-[length:max(1rem,13px)] font-bold">
            Pay now
          </span>
          <span className="font-display text-[length:max(1.375rem,18px)] font-bold">
            {rupees(quote.reserveTotal)}
          </span>
        </div>
        <div className={ROW}>
          <span>When it&apos;s ready to ship</span>
          <span>{rupees(quote.balanceDue)}</span>
        </div>
        <p className="font-grotesk text-[length:max(0.6875rem,10px)] leading-[1.5]">
          {rupees(quote.reservePerItem)} per item holds your order and your{" "}
          {quote.tier.percent}% price.
          {ship ? ` Expected to ship around ${ship}.` : ""} We&apos;ll message
          you when it&apos;s ready.
        </p>
      </div>
      {quote.insider && !quote.insiderApplied ? (
        <p className="font-grotesk text-[length:max(0.6875rem,10px)]">
          Your Insider {quote.insider.percent}% is smaller than the pre-order
          discount, so we used the bigger one.
        </p>
      ) : null}
    </Card>
  );
}

export function PreorderFlow({
  variantId,
  initialQuantity,
  signedIn,
  account,
  initialAddresses,
  states,
}: {
  variantId: string;
  initialQuantity: number;
  signedIn: boolean;
  account: Account | null;
  initialAddresses: AddressView[];
  states: readonly string[];
}) {
  const router = useRouter();
  const { refreshSession } = useCart();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [codes, setCodes] = useState<string[]>([]);
  const [quote, setQuote] = useState<PreorderQuoteView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState<string | null>(
    initialAddresses.find((a) => a.isDefault)?.id ??
      initialAddresses[0]?.id ??
      null,
  );
  const [adding, setAdding] = useState(initialAddresses.length === 0);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/preorder/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, quantity, codes }),
    })
      .then(
        (r) =>
          r.json() as Promise<{
            ok: boolean;
            reason?: string;
            quote?: PreorderQuoteView;
          }>,
      )
      .then((data) => {
        if (!alive) return;
        if (data.ok && data.quote) {
          setQuote(data.quote);
          setProblem(null);
        } else setProblem(data.reason ?? "NETWORK");
      })
      .catch(() => alive && setProblem("NETWORK"));
    return () => {
      alive = false;
    };
  }, [variantId, quantity, codes, signedIn]);

  if (problem && !quote) {
    return (
      <div className="mx-auto flex max-w-[30rem] flex-col items-start gap-4">
        <h1 className="font-display text-[length:max(2.5rem,30px)] font-bold uppercase leading-none">
          Can&apos;t reserve this
        </h1>
        <p className="font-grotesk">
          {PREORDER_ERRORS[problem] ?? PREORDER_ERRORS.NETWORK}
        </p>
        <Link
          href="/collection/all"
          className="rounded-full bg-onwei-blue px-6 py-3 font-grotesk text-[length:max(0.8125rem,11px)] uppercase text-onwei-beige"
        >
          Shop all
        </Link>
      </div>
    );
  }

  const address = addresses.find((a) => a.id === addressId) ?? null;

  async function reserve() {
    if (!quote || !address) return;
    setPlacing(true);
    setError(null);
    const response = await fetch("/api/preorder/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressId: address.id,
        variantId,
        quantity,
        codes,
        expectedReserve: quote.reserveTotal,
        expectedTotal: quote.total,
      }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      reason?: string;
      quote?: PreorderQuoteView | null;
      orderNumber?: string;
      reserveTotal?: number;
      razorpay?: { keyId: string; orderId: string; amount: number };
    } | null;
    if (!data?.ok || !data.razorpay || !data.orderNumber) {
      setPlacing(false);
      if (data?.quote) setQuote(data.quote);
      setError(
        PREORDER_ERRORS[data?.reason ?? "NETWORK"] ?? PREORDER_ERRORS.NETWORK!,
      );
      return;
    }
    track("preorder_reserved", {
      tier: quote.tier.label,
      reserve: quote.reserveTotal,
      total: quote.total,
    });
    const orderNumber = data.orderNumber;
    const opened = await openRazorpay({
      keyId: data.razorpay.keyId,
      orderId: data.razorpay.orderId,
      amount: data.razorpay.amount,
      orderNumber,
      prefill: {
        name: address.fullName || account?.name,
        email: account?.email,
        contact: address.phone || account?.phone,
      },
      onSuccess: async (payment) => {
        const verify = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payment),
        }).catch(() => null);
        const result = (await verify?.json().catch(() => null)) as {
          ok: boolean;
        } | null;
        goAfterRazorpay(
          result?.ok
            ? `/checkout/success?order=${orderNumber}`
            : `/checkout/failed?order=${orderNumber}`,
        );
      },
      onFailure: (reason) => {
        track("payment_failed", { reason: reason.slice(0, 60) });
        goAfterRazorpay(failedPageUrl(orderNumber, reason));
      },
      onDismiss: () =>
        goAfterRazorpay(`/checkout/abandoned?order=${orderNumber}`),
    });
    if (!opened) {
      setPlacing(false);
      setError(PREORDER_ERRORS.PAYMENT_UNAVAILABLE!);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 desk:grid-cols-[1fr_27.5rem] desk:gap-14">
      <div className="flex flex-col gap-6">
        <p className="w-fit rounded-full bg-onwei-blue px-3 py-1 font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em] text-onwei-white">
          Pre-order
        </p>
        <h1 className="font-display text-[length:max(2.5rem,30px)] font-bold uppercase leading-[0.95]">
          {signedIn ? "Reserve yours" : "Sign in to reserve"}
        </h1>

        {error ? (
          <p
            role="alert"
            className="flex items-center gap-3 rounded-full bg-onwei-blue px-5 py-3 font-grotesk text-[length:max(0.8125rem,11px)] text-onwei-beige"
          >
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-onwei-green font-bold text-onwei-blue"
            >
              !
            </span>
            {error}
          </p>
        ) : null}

        {!signedIn ? (
          <Card>
            <SignInPanel
              heading="Sign in to reserve"
              intro="We'll send a one-time code. We need it to message you when your order is ready."
              onDone={async () => {
                await refreshSession();
                router.refresh();
              }}
            />
          </Card>
        ) : (
          <>
            <Card className="flex flex-col gap-4">
              <p className="font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em]">
                Delivery address
              </p>
              {addresses.length > 0 && !adding ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">Choose an address</legend>
                  {addresses.map((a) => (
                    <label
                      key={a.id}
                      className={`flex cursor-pointer gap-3 rounded-[1rem] border p-4 ${a.id === addressId ? "border-onwei-blue bg-onwei-green/40" : "border-onwei-blue/30"}`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={a.id === addressId}
                        onChange={() => setAddressId(a.id)}
                        className="mt-1 accent-onwei-blue"
                      />
                      <span className="font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.5]">
                        <span className="font-bold">{a.fullName}</span>
                        <br />
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state}{" "}
                        {a.postalCode}
                        <br />
                        {a.phone}
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : null}
              {adding ? (
                <AddressForm
                  states={states}
                  defaultName={account?.name}
                  defaultPhone={account?.phone}
                  submitLabel="Use this address"
                  onCancel={
                    addresses.length ? () => setAdding(false) : undefined
                  }
                  onSaved={(saved) => {
                    setAddresses((list) => [
                      saved,
                      ...list.filter((a) => a.id !== saved.id),
                    ]);
                    setAddressId(saved.id);
                    setAdding(false);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="w-fit font-grotesk text-[length:max(0.8125rem,11px)] underline underline-offset-2"
                >
                  + Add a new address
                </button>
              )}
            </Card>
            <Card className="flex flex-col gap-2">
              <p className="font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em]">
                How it works
              </p>
              <ol className="list-decimal pl-5 font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.6]">
                <li>
                  Pay {quote ? rupees(quote.reserveTotal) : "the reserve"} now,
                  online. Your price and gifts are locked in.
                </li>
                <li>
                  When it&apos;s ready to ship, we email and WhatsApp you a link
                  to pay the rest.
                </li>
                <li>
                  Changed your mind before then? Cancel from your account and
                  keep what you paid as credit for a year.
                </li>
              </ol>
            </Card>
            <button
              type="button"
              disabled={placing || !quote || !address || adding}
              onClick={reserve}
              className={PRIMARY}
            >
              {placing
                ? "Opening payment..."
                : quote
                  ? `Pay ${rupees(quote.reserveTotal)} and reserve`
                  : "Loading..."}
            </button>
            <p className="font-grotesk text-[length:max(0.6875rem,10px)]">
              Online payment only. By reserving you agree to our{" "}
              <Link href="/terms" className="underline">
                Terms
              </Link>
              . Prices include GST.
            </p>
          </>
        )}
      </div>

      <div className="desk:sticky desk:top-6 desk:self-start">
        {quote ? (
          <Summary
            quote={quote}
            quantity={quantity}
            setQuantity={setQuantity}
            codes={codes}
            setCodes={setCodes}
          />
        ) : (
          <Card>
            <p className="font-grotesk">Loading your pre-order...</p>
          </Card>
        )}
      </div>
    </div>
  );
}
