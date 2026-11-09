"use client";

import type { AddressView, CartView } from "@onwei/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductImage } from "@/_components/ProductImage";
import { AddressForm } from "@/_components/commerce/AddressForm";
import { CodeBox } from "@/_components/commerce/CartDrawer";
import { useCart } from "@/_components/commerce/CartProvider";
import { goAfterRazorpay, openRazorpay } from "@/_components/commerce/razorpay";
import { SignInPanel } from "@/_components/commerce/SignInPanel";
import { track } from "../../../lib/analytics/track";
import { CHECKOUT_ERRORS, rupees } from "../../../lib/messages/commerce";
import { Card, CheckoutSteps } from "./parts";

type Method = "RAZORPAY" | "COD";

export interface CheckoutAccount {
  name: string | null;
  email: string | null;
  phone: string | null;
}

const PRIMARY =
  "flex h-12 w-full items-center justify-center rounded-full bg-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-beige disabled:opacity-60";

function Summary({ view, method }: { view: CartView; method: Method }) {
  const p = view.pricing;
  const row =
    "flex justify-between gap-3 font-grotesk text-[length:max(0.8125rem,11px)]";
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[length:max(1.125rem,14px)] font-bold">
          Order summary
        </h2>
        <span className="rounded-full bg-onwei-green px-3 py-0.5 font-grotesk text-[length:max(0.6875rem,10px)] uppercase">
          In your bag
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {view.lines.map((line) => (
          <li key={line.variantId} className="flex items-center gap-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-[0.75rem] bg-onwei-green">
              <ProductImage
                src={line.imageUrl ?? undefined}
                alt={line.productName}
                fill
                sizes="56px"
                className="object-cover"
              />
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-onwei-blue font-grotesk text-[0.625rem] text-onwei-beige">
                {line.quantity}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[length:max(0.875rem,12px)] font-semibold">
                {line.productName}
              </span>
              <span className="block font-grotesk text-[length:max(0.6875rem,10px)] text-onwei-blue/80">
                {line.variantLabel}
              </span>
              {line.issue ? (
                <span className="block font-grotesk text-[length:max(0.6875rem,10px)] text-[#b91c1c]">
                  Sold out. Remove it from your bag.
                </span>
              ) : null}
            </span>
            <span className="font-grotesk text-[length:max(0.8125rem,11px)]">
              {rupees(line.subtotal)}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-onwei-blue pt-3">
        <CodeBox />
      </div>
      <dl className="flex flex-col gap-1.5 border-t border-onwei-blue pt-3">
        <div className={row}>
          <dt>Subtotal</dt>
          <dd>{rupees(p.subtotal)}</dd>
        </div>
        {p.discounts
          .filter((d) => d.amount > 0)
          .map((d) => (
            <div key={d.label} className={row}>
              <dt>{d.label}</dt>
              <dd>−{rupees(d.amount)}</dd>
            </div>
          ))}
        <div className={row}>
          <dt>Shipping</dt>
          <dd>{p.shippingFee === 0 ? "Free" : rupees(p.shippingFee)}</dd>
        </div>
        {method === "COD" && p.codFee > 0 ? (
          <div className={row}>
            <dt>Cash on delivery fee</dt>
            <dd>{rupees(p.codFee)}</dd>
          </div>
        ) : null}
        <div className={row}>
          <dt>Taxes</dt>
          <dd>Included</dd>
        </div>
      </dl>
      <div className="flex items-center justify-between border-t border-onwei-blue pt-3">
        <span className="font-display text-[length:max(1rem,13px)] font-bold">
          Total
        </span>
        <span className="font-display text-[length:max(1.375rem,18px)] font-bold">
          {rupees(p.total)}
        </span>
      </div>
      {p.discountTotal + p.shippingSaved > 0 ? (
        <p className="rounded-[0.75rem] bg-onwei-green px-3 py-2 text-center font-grotesk text-[length:max(0.75rem,11px)]">
          You&apos;re saving {rupees(p.discountTotal + p.shippingSaved)} on this
          order.
        </p>
      ) : null}
    </Card>
  );
}

export function CheckoutFlow({
  signedIn,
  account,
  initialAddresses,
  states,
  cod,
}: {
  signedIn: boolean;
  account: CheckoutAccount | null;
  initialAddresses: AddressView[];
  states: readonly string[];
  cod: {
    enabled: boolean;
    fee: number;
    min: number | null;
    max: number | null;
  };
}) {
  const router = useRouter();
  const { cart: providerCart, refresh, refreshSession } = useCart();
  const [step, setStep] = useState<"details" | "payment">("details");
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState<string | null>(
    initialAddresses.find((a) => a.isDefault)?.id ??
      initialAddresses[0]?.id ??
      null,
  );
  const [adding, setAdding] = useState(initialAddresses.length === 0);
  const [method, setMethod] = useState<Method>("RAZORPAY");
  const [view, setView] = useState<CartView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload when the bag changes (codes, quantities) or the method changes.
  useEffect(() => {
    let alive = true;
    fetch(`/api/cart?payment=${method}`)
      .then(
        (response) =>
          response.json() as Promise<{
            ok: boolean;
            cart: CartView & { empty?: boolean };
          }>,
      )
      .catch(() => null)
      .then((data) => {
        if (!alive) return;
        setView(data?.ok && !data.cart.empty ? data.cart : null);
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [method, providerCart]);

  useEffect(() => {
    if (view)
      track("checkout_started", {
        item_count: view.itemCount,
        total: view.pricing.total,
      });
    // Only once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(view)]);

  if (!signedIn) {
    return (
      <div className="mx-auto flex max-w-[30rem] flex-col gap-6">
        <CheckoutSteps current={1} />
        <Card>
          <SignInPanel
            heading="Sign in to check out"
            intro="We'll send a code to your email or phone. No password needed, and your bag comes with you."
            onDone={async () => {
              await Promise.all([refresh(), refreshSession()]);
              router.refresh();
            }}
          />
        </Card>
      </div>
    );
  }

  if (loaded && !view) {
    return (
      <div className="mx-auto flex max-w-[30rem] flex-col items-start gap-4">
        <h1 className="font-display text-[length:max(2.5rem,30px)] font-bold uppercase leading-none">
          Your bag is empty.
        </h1>
        <p className="font-grotesk">
          Find something you&apos;ll move in, then come back here.
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
  const total = view?.pricing.total ?? 0;
  const codBlocked = !cod.enabled
    ? "Cash on delivery isn't offered right now."
    : cod.max !== null && total > cod.max
      ? `Cash on delivery is available for orders up to ${rupees(cod.max)}.`
      : cod.min !== null && total < cod.min
        ? `Cash on delivery is available for orders from ${rupees(cod.min)}.`
        : null;

  async function place() {
    if (!view || !address) return;
    setPlacing(true);
    setError(null);
    const response = await fetch("/api/checkout/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressId: address.id,
        paymentMethod: method,
        expectedTotal: view.pricing.total,
      }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      reason?: string;
      cart?: CartView | null;
      orderNumber?: string;
      total?: number;
      razorpay?: { keyId: string; orderId: string; amount: number };
    } | null;
    if (!data?.ok) {
      setPlacing(false);
      if (data?.cart) setView(data.cart);
      setError(
        CHECKOUT_ERRORS[data?.reason ?? "NETWORK"] ?? CHECKOUT_ERRORS.NETWORK!,
      );
      void refresh();
      return;
    }
    track("order_placed", { payment_method: method, total: data.total ?? 0 });
    if (method === "COD" || !data.razorpay) {
      void refresh();
      router.push(`/checkout/success?order=${data.orderNumber}`);
      return;
    }
    const orderNumber = data.orderNumber!;
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
        void refresh();
        goAfterRazorpay(
          result?.ok
            ? `/checkout/success?order=${orderNumber}`
            : `/checkout/failed?order=${orderNumber}`,
        );
      },
      onFailure: (reason) => {
        track("payment_failed", { reason: reason.slice(0, 60) });
        goAfterRazorpay(`/checkout/failed?order=${orderNumber}`);
      },
      onDismiss: () =>
        goAfterRazorpay(`/checkout/abandoned?order=${orderNumber}`),
    });
    if (!opened) {
      setPlacing(false);
      setError(CHECKOUT_ERRORS.PAYMENT_UNAVAILABLE!);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 desk:grid-cols-[1fr_27.5rem] desk:gap-14">
      <div className="flex flex-col gap-6">
        <CheckoutSteps current={step === "details" ? 1 : 2} />
        <h1 className="font-display text-[length:max(2.5rem,30px)] font-bold uppercase leading-[0.95]">
          {step === "details"
            ? "Where should we send it?"
            : "How would you like to pay?"}
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

        {step === "details" ? (
          <>
            <Card className="flex flex-col gap-1">
              <p className="font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em]">
                Contact
              </p>
              <p className="font-grotesk text-[length:max(0.875rem,12px)]">
                {account?.email ?? account?.phone}
              </p>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" }).catch(
                    () => null,
                  );
                  await Promise.all([refresh(), refreshSession()]);
                  router.refresh();
                }}
                className="w-fit font-grotesk text-[length:max(0.75rem,11px)] underline underline-offset-2"
              >
                Not you? Sign out
              </button>
            </Card>

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
            <p className="font-grotesk text-[length:max(0.75rem,11px)]">
              Standard delivery, usually 3 to 5 working days.
            </p>
            <button
              type="button"
              disabled={!address || adding || !view?.canCheckout}
              onClick={() => setStep("payment")}
              className={PRIMARY}
            >
              Continue to payment
            </button>
          </>
        ) : (
          <>
            <Card className="flex items-start justify-between gap-4">
              <div className="font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.5]">
                <p className="text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em]">
                  Delivering to
                </p>
                {address ? (
                  <p>
                    {address.fullName}, {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                    {address.state} {address.postalCode}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="shrink-0 font-grotesk text-[length:max(0.75rem,11px)] underline underline-offset-2"
              >
                Change
              </button>
            </Card>

            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Payment method</legend>
              <label
                className={`flex cursor-pointer gap-3 rounded-[1.25rem] border bg-onwei-white p-5 ${method === "RAZORPAY" ? "border-onwei-blue ring-1 ring-onwei-blue" : "border-onwei-blue/30"}`}
              >
                <input
                  type="radio"
                  name="method"
                  checked={method === "RAZORPAY"}
                  onChange={() => setMethod("RAZORPAY")}
                  className="mt-1 accent-onwei-blue"
                />
                <span>
                  <span className="block font-display text-[length:max(1rem,13px)] font-bold">
                    Pay online
                  </span>
                  <span className="block font-grotesk text-[length:max(0.75rem,11px)]">
                    UPI, cards, net banking and wallets. Secured by Razorpay.
                  </span>
                </span>
              </label>
              <label
                className={`flex gap-3 rounded-[1.25rem] border bg-onwei-white p-5 ${codBlocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${method === "COD" ? "border-onwei-blue ring-1 ring-onwei-blue" : "border-onwei-blue/30"}`}
              >
                <input
                  type="radio"
                  name="method"
                  disabled={Boolean(codBlocked)}
                  checked={method === "COD"}
                  onChange={() => setMethod("COD")}
                  className="mt-1 accent-onwei-blue"
                />
                <span>
                  <span className="block font-display text-[length:max(1rem,13px)] font-bold">
                    Cash on delivery
                  </span>
                  <span className="block font-grotesk text-[length:max(0.75rem,11px)]">
                    {codBlocked ??
                      `Pay in cash or UPI when it arrives.${cod.fee > 0 ? ` Adds ${rupees(cod.fee)}.` : ""}`}
                  </span>
                </span>
              </label>
            </fieldset>

            <button
              type="button"
              disabled={placing || !view?.canCheckout || !address}
              onClick={place}
              className={PRIMARY}
            >
              {placing
                ? method === "COD"
                  ? "Placing your order..."
                  : "Opening payment..."
                : method === "COD"
                  ? `Place order (cash on delivery) - ${rupees(total)}`
                  : `Pay ${rupees(total)}`}
            </button>
            <p className="font-grotesk text-[length:max(0.6875rem,10px)]">
              By placing your order you agree to our{" "}
              <Link href="/terms" className="underline">
                Terms
              </Link>
              . Prices include GST.
            </p>
          </>
        )}
      </div>

      <div className="desk:sticky desk:top-6 desk:self-start">
        {view ? (
          <Summary
            view={view}
            method={step === "payment" ? method : "RAZORPAY"}
          />
        ) : (
          <Card>
            <p className="font-grotesk">Loading your bag...</p>
          </Card>
        )}
      </div>
    </div>
  );
}
