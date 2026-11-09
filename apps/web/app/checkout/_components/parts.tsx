import Link from "next/link";
import type { ReactNode } from "react";

/** White rounded card with a navy border, as in the result frames. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-onwei-blue bg-onwei-white p-5 desk:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

/** Purple "Questions about your order?" card. */
export function HelpCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-[1.5rem] bg-onwei-purple p-5 text-onwei-beige desk:flex-row desk:items-center desk:p-6">
      <div>
        <p className="font-display text-[length:max(1rem,13px)] font-bold">
          {title}
        </p>
        <p className="font-grotesk text-[length:max(0.75rem,11px)] leading-[1.5]">
          {body}
        </p>
      </div>
      <Link
        href="/contact"
        className="shrink-0 rounded-full border border-onwei-beige px-5 py-2 font-grotesk text-[length:max(0.75rem,11px)] uppercase"
      >
        Contact us
      </Link>
    </div>
  );
}

const STEPS = ["Cart", "Details", "Payment"] as const;

/** "Cart, Details, Payment" from the abandoned-checkout frame. */
export function CheckoutSteps({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="flex w-full max-w-[28rem] items-start">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            className="relative flex flex-1 flex-col items-center gap-2"
          >
            {index > 0 ? (
              <span
                aria-hidden
                className="absolute right-1/2 top-3 h-px w-full bg-onwei-blue"
              />
            ) : null}
            <span
              className={`relative z-10 flex size-6 items-center justify-center rounded-full border border-onwei-blue ${done ? "bg-onwei-blue text-onwei-green" : "bg-onwei-white"}`}
            >
              {done ? (
                <svg
                  viewBox="0 0 16 16"
                  className="size-3 fill-current"
                  aria-hidden
                >
                  <path d="M6.2 11.6 2.6 8l1.1-1.1 2.5 2.5 6.1-6.1 1.1 1.1z" />
                </svg>
              ) : active ? (
                <span className="size-2.5 rounded-full bg-onwei-blue" />
              ) : null}
            </span>
            <span className="font-grotesk text-[length:max(0.6875rem,10px)] uppercase">
              {label}
              {active ? <span className="sr-only"> (current step)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
