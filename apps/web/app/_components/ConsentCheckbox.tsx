"use client";

import { useId } from "react";

// Unticked-by-default consent box for every public form (DPDP / GDPR need an
// explicit, affirmative action, a "by submitting you agree" line is not
// enough). `tone` matches the surface it sits on. The legal links open in a
// new tab so the visitor does not lose what they typed.
// Deliberately minimal, not a Figma-matched design: flagged for design
// sign-off, see CLAUDE.md ground rule 8.
export function ConsentCheckbox({
  checked,
  onChange,
  tone = "blue",
  links,
  lead,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: "blue" | "beige";
  /** Which policies the text links to. */
  links: ("privacy" | "terms")[];
  /** Text before the links, e.g. "I agree to the". */
  lead: string;
}) {
  const id = useId();
  const color = tone === "beige" ? "text-onwei-beige" : "text-onwei-blue";
  const box =
    tone === "beige"
      ? "border-onwei-beige checked:bg-onwei-beige focus-visible:outline-onwei-beige"
      : "border-onwei-blue checked:bg-onwei-blue focus-visible:outline-onwei-blue";
  const tick = tone === "beige" ? "text-onwei-purple" : "text-onwei-green";
  const linkClass = "underline underline-offset-2";

  return (
    <div
      className={`flex items-start gap-3 font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.4] ${color}`}
    >
      {/* Custom box: the native one cannot be restyled to match the pill
          inputs. The input stays a real checkbox (keyboard, screen readers,
          native required validation), the tick is a sibling svg shown by
          the peer-checked state. */}
      <span className="relative mt-[0.0625rem] size-[1.25rem] shrink-0">
        <input
          id={id}
          type="checkbox"
          required
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className={`peer size-full cursor-pointer appearance-none rounded-[0.375rem] border-[1.5px] bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${box}`}
        />
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`pointer-events-none absolute inset-0 m-auto size-[0.75rem] scale-50 opacity-0 transition-all peer-checked:scale-100 peer-checked:opacity-100 ${tick}`}
        >
          <path
            d="M3 8.5l3.2 3.2L13 4.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <label htmlFor={id} className="cursor-pointer">
        {lead}{" "}
        {links.includes("privacy") && (
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Privacy Policy
          </a>
        )}
        {links.length === 2 && " and "}
        {links.includes("terms") && (
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Terms
          </a>
        )}
        .
      </label>
    </div>
  );
}
