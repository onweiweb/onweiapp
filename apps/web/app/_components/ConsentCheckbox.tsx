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
  const border = tone === "beige" ? "border-onwei-beige" : "border-onwei-blue";
  const accent = tone === "beige" ? "accent-onwei-beige" : "accent-onwei-blue";
  const linkClass = "underline underline-offset-2";

  return (
    <div
      className={`flex items-start gap-3 font-grotesk text-[length:max(0.75rem,11px)] leading-[1.4] ${color}`}
    >
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={`mt-[0.15rem] size-4 shrink-0 cursor-pointer rounded-sm border ${border} ${accent}`}
      />
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
